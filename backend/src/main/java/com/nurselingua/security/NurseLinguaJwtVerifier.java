package com.nurselingua.security;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.jwk.source.JWKSourceBuilder;
import com.nimbusds.jose.proc.JWSKeySelector;
import com.nimbusds.jose.proc.JWSVerificationKeySelector;
import com.nimbusds.jose.proc.SecurityContext;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.proc.ConfigurableJWTProcessor;
import com.nimbusds.jwt.proc.DefaultJWTClaimsVerifier;
import com.nimbusds.jwt.proc.DefaultJWTProcessor;

import java.net.URL;
import java.util.List;
import java.util.Set;

/**
 * Verifies Clerk session JWTs (RS256). Fetches the JWKS from the Clerk issuer
 * unless a static public key (PEM) is configured.
 */
public class NurseLinguaJwtVerifier {

  private final ConfigurableJWTProcessor<SecurityContext> processor;

  public NurseLinguaJwtVerifier(String issuer, String publicKeyPem) throws Exception {
    processor = new DefaultJWTProcessor<>();

    JWSKeySelector<SecurityContext> keySelector;
    if (publicKeyPem != null && !publicKeyPem.isBlank()) {
      var key = com.nimbusds.jose.jwk.JWK.parseFromPEMEncodedObjects(publicKeyPem)
          .toRSAKey().toRSAPublicKey();
      keySelector = (header, context) -> List.of(key);
    } else {
      URL jwksUrl = new URL(issuer + "/.well-known/jwks.json");
      JWKSource<SecurityContext> jwks = JWKSourceBuilder.create(jwksUrl)
          .retrying(true).build();
      keySelector = new JWSVerificationKeySelector<>(JWSAlgorithm.RS256, jwks);
    }
    processor.setJWSKeySelector(keySelector);

    var claimsVerifier = new DefaultJWTClaimsVerifier<>(
        new JWTClaimsSet.Builder().issuer(issuer).build(),
        Set.of("sub"));
    processor.setJWTClaimsSetVerifier(claimsVerifier);
  }

  /** Returns the verified `sub` claim. */
  public String verify(String token) throws Exception {
    var claims = processor.process(token, null);
    return claims.getSubject();
  }
}
