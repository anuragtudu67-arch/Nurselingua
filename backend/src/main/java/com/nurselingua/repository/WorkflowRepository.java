package com.nurselingua.repository;

import com.nurselingua.entity.WorkflowExecutionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface WorkflowRepository extends JpaRepository<WorkflowExecutionEntity, String> {
  Optional<WorkflowExecutionEntity> findByIdAndUserId(String id, String userId);
}
