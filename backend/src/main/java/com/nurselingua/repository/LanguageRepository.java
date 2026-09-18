package com.nurselingua.repository;

import com.nurselingua.entity.LanguageEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface LanguageRepository extends JpaRepository<LanguageEntity, Integer> {
  Optional<LanguageEntity> findByCode(String code);
}
