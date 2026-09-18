package com.nurselingua.integration;

import com.nurselingua.config.NurseLinguaProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * Cloudflare R2 (S3-compatible) presigned PUT via SigV4 — hand-rolled so the
 * backend needs no AWS SDK. Produces short-lived upload URLs; the browser uploads
 * recordings directly to storage and reports the storageRef back (spec §4).
 * When R2 is disabled, callers fall back to inline reference storage (demo mode).
 */
@Service
public class R2Storage {

  private static final Logger log = LoggerFactory.getLogger(R2Storage.class);
  private static final DateTimeFormatter AMZ_DATE = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'");
  private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("yyyyMMdd");
  private static final String REGION = "auto"; // R2 uses 'auto'
  private static final String SERVICE = "s3";

  private final NurseLinguaProperties props;
  private final boolean enabled;
  private final String secretAccessKey;

  public R2Storage(NurseLinguaProperties props) {
    this.props = props;
    var r2 = props.storage().r2();
    this.enabled = r2.enabled() && !r2.accountId().isBlank() && !r2.accessKeyId().isBlank();
    this.secretAccessKey = r2.secretAccessKey();
  }

  public boolean isEnabled() { return enabled; }

  public record Presign(String url, String storageRef, int expiresIn) {}

  public Presign presignPut(String extensionHint) {
    if (!enabled) throw new IllegalStateException("R2 storage disabled");
    try {
      var r2 = props.storage().r2();
      String key = "recordings/%s/%s.%s".formatted(
          LocalDate.now(ZoneOffset.UTC), UUID.randomUUID(),
          sanitize(extensionHint != null ? extensionHint : "webm"));

      String host = "%s.r2.cloudflarestorage.com".formatted(r2.accountId());
      ZonedDateTime now = ZonedDateTime.now(ZoneOffset.UTC);
      String amzDate = now.format(AMZ_DATE);
      String dateStamp = now.format(DATE);
      String scope = "%s/%s/%s/aws4_request".formatted(dateStamp, REGION, SERVICE);

      String canonicalRequest = String.join("\n",
          "PUT",
          "/" + key,
          "",
          "host:" + host + "\n" +
          "x-amz-content-sha256:UNSIGNED-PAYLOAD\n" +
          "x-amz-date:" + amzDate,
          "host;x-amz-content-sha256;x-amz-date",
          "UNSIGNED-PAYLOAD");

      byte[] kSecret = ("AWS4" + secretAccessKey).getBytes(StandardCharsets.UTF_8);
      byte[] kDate = hmac(kSecret, dateStamp);
      byte[] kRegion = hmac(kDate, REGION);
      byte[] kService = hmac(kRegion, SERVICE);
      byte[] kSigning = hmac(kService, "aws4_request");
      String signature = hex(hmac(kSigning, stringToSign(canonicalRequest, amzDate, scope)));

      String url = "https://%s/%s?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=%s&X-Amz-Date=%s&X-Amz-Expires=%d&X-Amz-SignedHeaders=host&X-Amz-Signature=%s"
          .formatted(host, key, enc(r2.accessKeyId() + "/" + scope), amzDate, r2.presignTtlSeconds(), signature);

      return new Presign(url, "r2://" + r2.bucket() + "/" + key, r2.presignTtlSeconds());
    } catch (Exception e) {
      throw new IllegalStateException("R2 presign failed", e);
    }
  }

  private String stringToSign(String canonical, String amzDate, String scope) {
    String sha = hex(sha256(canonical.getBytes(StandardCharsets.UTF_8)));
    return "AWS4-HMAC-SHA256\n%s\n%s\n%s".formatted(amzDate, scope, sha);
  }

  private static byte[] hmac(byte[] key, String data) {
    return hmac(key, data.getBytes(StandardCharsets.UTF_8));
  }

  private static byte[] hmac(byte[] key, byte[] data) {
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(key, "HmacSHA256"));
      return mac.doFinal(data);
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }

  private static byte[] sha256(byte[] data) {
    try {
      return java.security.MessageDigest.getInstance("SHA-256").digest(data);
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }

  private static String hex(byte[] b) {
    StringBuilder sb = new StringBuilder(b.length * 2);
    for (byte x : b) sb.append(String.format("%02x", x));
    return sb.toString();
  }

  private static String enc(String s) {
    return java.net.URLEncoder.encode(s, StandardCharsets.UTF_8).replace("+", "%20");
  }

  private static String sanitize(String ext) {
    return ext.replaceAll("[^a-zA-Z0-9]", "").toLowerCase();
  }
}
