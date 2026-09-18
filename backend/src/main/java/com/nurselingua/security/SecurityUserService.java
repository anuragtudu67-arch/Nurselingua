package com.nurselingua.security;

import com.nurselingua.entity.UserEntity;
import com.nurselingua.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Resolves a verified identity (Clerk `sub`) to the local user row,
 * provisioning it on first sight. This is the ONLY place identity is mapped.
 */
@Service
public class SecurityUserService {

  private final UserRepository users;

  public SecurityUserService(UserRepository users) {
    this.users = users;
  }

  @Transactional
  public AppUser resolve(String clerkUserId, String emailOverride, String nameOverride) {
    UserEntity u = users.findByClerkUserId(clerkUserId).orElseGet(() -> {
      UserEntity nu = new UserEntity();
      nu.setId(java.util.UUID.randomUUID().toString());
      nu.setClerkUserId(clerkUserId);
      // Dev shim supplies the email; real Clerk tokens need it fetched/claimed.
      nu.setEmail(emailOverride != null ? emailOverride : clerkUserId + "@clerk.local");
      nu.setName(nameOverride);
      return users.save(nu);
    });
    String name = u.getName() != null ? u.getName()
        : (emailOverride != null ? nameOverride : null);
    return new AppUser(u.getId(), u.getClerkUserId(), u.getEmail(), name);
  }
}
