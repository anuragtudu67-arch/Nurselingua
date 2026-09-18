package com.nurselingua.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

/**
 * Extracts the Bearer token and resolves the AppUser.
 * - Real mode: verifies the Clerk session JWT (RS256) — the `sub` claim is the identity.
 * - Dev mode (nurselingua.dev-auth=true): accepts `Bearer dev.<email>` so the frontend demo
 *   runs without Clerk keys. Identity is still derived server-side only; the client
 *   never sends a trusted user id.
 */
public class NurseLinguaJwtFilter extends OncePerRequestFilter {

  private static final Logger log = LoggerFactory.getLogger(NurseLinguaJwtFilter.class);
  private static final String DEV_PREFIX = "dev.";

  private final boolean devAuth;
  private final String clerkIssuer;
  private final String clerkPublicKey;
  private final SecurityUserService users;
  private volatile NurseLinguaJwtVerifier verifier; // lazy: JWKS fetch on first real token

  public NurseLinguaJwtFilter(boolean devAuth, String clerkIssuer, String clerkPublicKey,
                              SecurityUserService users) {
    this.devAuth = devAuth;
    this.clerkIssuer = clerkIssuer;
    this.clerkPublicKey = clerkPublicKey;
    this.users = users;
  }

  @Override
  protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
      throws ServletException, IOException {
    String auth = req.getHeader("Authorization");
    if (auth != null && auth.startsWith("Bearer ")) {
      String token = auth.substring(7).trim();
      try {
        AppUser user = resolve(token);
        var authentication = new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(authentication);
      } catch (Exception e) {
        log.warn("Auth failed: {}", e.getMessage());
        res.sendError(401, "Invalid or expired token");
        return;
      }
    }
    chain.doFilter(req, res);
  }

  private AppUser resolve(String token) throws Exception {
    if (token.startsWith(DEV_PREFIX)) {
      if (!devAuth) throw new IllegalArgumentException("Dev tokens disabled");
      String email = URLDecoder.decode(token.substring(DEV_PREFIX.length()), StandardCharsets.UTF_8);
      if (!email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
        throw new IllegalArgumentException("Invalid dev token");
      }
      return users.resolve("dev|" + email, email, email.split("@")[0]);
    }
    String sub = verifier().verify(token);
    return users.resolve(sub, null, null);
  }

  private NurseLinguaJwtVerifier verifier() throws Exception {
    NurseLinguaJwtVerifier v = verifier;
    if (v == null) {
      synchronized (this) {
        v = verifier;
        if (v == null) {
          if (clerkIssuer == null || clerkIssuer.isBlank()) {
            throw new IllegalStateException(
                "Clerk issuer not configured (set CLERK_JWT_ISSUER or enable dev tokens)");
          }
          v = new NurseLinguaJwtVerifier(clerkIssuer, clerkPublicKey);
          verifier = v;
        }
      }
    }
    return v;
  }
}
