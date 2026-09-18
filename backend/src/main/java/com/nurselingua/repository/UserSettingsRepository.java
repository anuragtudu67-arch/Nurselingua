package com.nurselingua.repository;

import com.nurselingua.entity.UserSettingsEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserSettingsRepository extends JpaRepository<UserSettingsEntity, String> {
  Optional<UserSettingsEntity> findByUserId(String userId);
}
