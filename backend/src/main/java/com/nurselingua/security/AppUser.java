package com.nurselingua.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

/** The authenticated nurse, resolved from a verified Clerk JWT (or dev shim). */
public record AppUser(String userId, String clerkUserId, String email, String name)
    implements UserDetails {

  @Override public Collection<? extends GrantedAuthority> getAuthorities() {
    return List.of(new SimpleGrantedAuthority("ROLE_USER"));
  }
  @Override public String getPassword() { return null; }
  @Override public String getUsername() { return email; }
  @Override public boolean isAccountNonExpired() { return true; }
  @Override public boolean isAccountNonLocked() { return true; }
  @Override public boolean isCredentialsNonExpired() { return true; }
  @Override public boolean isEnabled() { return true; }
}
