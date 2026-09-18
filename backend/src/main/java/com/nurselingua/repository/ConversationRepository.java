package com.nurselingua.repository;

import com.nurselingua.entity.ConversationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface ConversationRepository extends JpaRepository<ConversationEntity, String> {

  List<ConversationEntity> findByUserIdAndDeletedFalseOrderByLastActivityAtDesc(String userId);

  Optional<ConversationEntity> findByIdAndUserId(String id, String userId);

  /** Retention job: soft-deletes conversations past their expiry. */
  @Modifying(clearAutomatically = true, flushAutomatically = true)
  @Query("update ConversationEntity c set c.deleted = true " +
         "where c.deleted = false and c.expiresAt is not null and c.expiresAt < :now")
  int expireConversations(@Param("now") Instant now);
}
