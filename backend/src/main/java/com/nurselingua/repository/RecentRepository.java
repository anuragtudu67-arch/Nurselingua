package com.nurselingua.repository;

import com.nurselingua.entity.RecentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RecentRepository extends JpaRepository<RecentEntity, String> {
  List<RecentEntity> findTop12ByUserIdOrderByUsedAtDesc(String userId);
  Optional<RecentEntity> findByUserIdAndPhraseIdAndLanguageCode(String userId, String phraseId, String languageCode);
}
