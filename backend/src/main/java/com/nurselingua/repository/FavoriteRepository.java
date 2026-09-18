package com.nurselingua.repository;

import com.nurselingua.entity.FavoriteEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FavoriteRepository extends JpaRepository<FavoriteEntity, String> {
  List<FavoriteEntity> findByUserIdOrderByCreatedAtDesc(String userId);
  Optional<FavoriteEntity> findByUserIdAndPhraseIdAndLanguageCode(String userId, String phraseId, String languageCode);
}
