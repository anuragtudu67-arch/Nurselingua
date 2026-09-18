package com.nurselingua.integration;

import com.nurselingua.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.concurrent.atomic.AtomicReference;

/**
 * Resolves user rows outside the caller's transaction (REQUIRES_NEW) so
 * associations always reference managed — never transient — entities.
 * Provisioning on first authenticated action happens here.
 */
@Service
public class UserResolver {

  private final UserRepository users;

  public UserResolver(UserRepository users) {
    this.users = users;
  }

  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public com.nurselingua.entity.UserEntity managed(String userId) {
    AtomicReference<com.nurselingua.entity.UserEntity> ref = new AtomicReference<>();
    users.findById(userId).ifPresentOrElse(ref::set, () -> {
      com.nurselingua.entity.UserEntity nu = new com.nurselingua.entity.UserEntity();
      nu.setId(userId);
      nu.setClerkUserId("provisioned|" + userId);
      nu.setEmail(userId + "@nurselingua.local");
      ref.set(users.save(nu));
    });
    return ref.get();
  }
}
