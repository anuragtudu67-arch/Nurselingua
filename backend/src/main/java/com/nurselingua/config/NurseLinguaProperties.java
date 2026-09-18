package com.nurselingua.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "nurselingua")
public record NurseLinguaProperties(
    boolean devAuth,
    Clerk clerk,
    Cors cors,
    N8n n8n,
    Storage storage
) {
  public record Clerk(String issuer, String publicKey) {}
  public record Cors(String[] allowedOrigins) {}
  public record N8n(String baseUrl, String secret, boolean enabled, long callbackTimeoutMs) {}
  public record Storage(StorageR2 r2) {}
  public record StorageR2(boolean enabled, String accountId, String bucket, String accessKeyId,
                          String secretAccessKey, String publicBaseUrl, int presignTtlSeconds) {}
}
