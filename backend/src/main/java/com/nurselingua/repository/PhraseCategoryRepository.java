package com.nurselingua.repository;

import com.nurselingua.entity.PhraseCategoryEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PhraseCategoryRepository extends JpaRepository<PhraseCategoryEntity, Integer> {
  List<PhraseCategoryEntity> findAllByOrderByPositionAsc();
  Optional<PhraseCategoryEntity> findBySlug(String slug);
}
