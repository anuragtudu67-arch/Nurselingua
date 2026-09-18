package com.nurselingua.repository;

import com.nurselingua.entity.ConversationTurnEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ConversationTurnRepository extends JpaRepository<ConversationTurnEntity, String> {
  List<ConversationTurnEntity> findByConversationIdOrderByCreatedAtAsc(String conversationId);
  long countByConversationId(String conversationId);
}
