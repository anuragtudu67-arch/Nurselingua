package com.nurselingua.repository;

import com.nurselingua.entity.PhraseEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PhraseRepository extends JpaRepository<PhraseEntity, String> {
  List<PhraseEntity> findByCategoryIdOrderByPriorityAscBaseTextAsc(Integer categoryId);
  List<PhraseEntity> findAllByOrderByPriorityAscBaseTextAsc();
  List<PhraseEntity> findByBaseTextContainingIgnoreCaseOrderByPriorityAsc(String fragment);
}
