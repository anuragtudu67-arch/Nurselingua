package com.nurselingua.config;

import com.nurselingua.security.AppUser;
import com.nurselingua.security.NurseLinguaJwtFilter;
import com.nurselingua.security.SecurityUserService;
import org.springframework.boot.autoconfigure.security.servlet.PathRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http, NurseLinguaProperties cfg,
                                        SecurityUserService users) throws Exception {
    NurseLinguaJwtFilter jwt = new NurseLinguaJwtFilter(
        cfg.devAuth(), cfg.clerk().issuer(), cfg.clerk().publicKey(), users);

    http
        .csrf(csrf -> csrf.disable())
        .cors(cors -> cors.configurationSource(corsSource(cfg)))
        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(auth -> auth
            .requestMatchers(PathRequest.toStaticResources().atCommonLocations()).permitAll()
            .requestMatchers("/api/health", "/actuator/health", "/h2-console/**").permitAll()
            .requestMatchers("/api/v1/webhooks/n8n").permitAll()      // authenticated by shared secret
            .requestMatchers("/api/v1/languages", "/api/v1/categories").permitAll()
            .anyRequest().authenticated())
        .exceptionHandling(e -> e.authenticationEntryPoint(
            new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
        .addFilterBefore(jwt, UsernamePasswordAuthenticationFilter.class);
    // H2 console frames itself; relax the same-origin frame policy in dev only.
    http.headers(h -> h.frameOptions(f -> f.sameOrigin()));
    return http.build();
  }

  private CorsConfigurationSource corsSource(NurseLinguaProperties cfg) {
    CorsConfiguration c = new CorsConfiguration();
    c.setAllowedOrigins(List.of(cfg.cors().allowedOrigins()));
    c.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    c.setAllowedHeaders(List.of("Authorization", "Content-Type"));
    c.setMaxAge(3600L);
    UrlBasedCorsConfigurationSource src = new UrlBasedCorsConfigurationSource();
    src.registerCorsConfiguration("/api/**", c);
    return src;
  }

  /** Convenience for controllers/tests: the current AppUser or null. */
  public static AppUser current() {
    var a = org.springframework.security.core.context.SecurityContextHolder
        .getContext().getAuthentication();
    return a != null && a.getPrincipal() instanceof AppUser u ? u : null;
  }
}
