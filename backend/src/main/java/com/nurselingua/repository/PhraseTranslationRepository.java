package com.nurselingua.repository;

import com.nurselingua.entity.PhraseTranslationEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PhraseTranslationRepository extends JpaRepository<PhraseTranslationEntity, String> {
  Optional<PhraseTranslationEntity> findByPhraseIdAndLanguageCode(String phraseId, String languageCode);
  List<PhraseTranslationEntity> findByPhraseId(String phraseId);
  List<PhraseTranslationEntity> findByLanguageCode(String languageCode);
}
