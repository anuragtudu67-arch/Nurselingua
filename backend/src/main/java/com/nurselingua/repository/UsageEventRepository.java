package com.nurselingua.repository;

import com.nurselingua.entity.UsageEventEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface UsageEventRepository extends JpaRepository<UsageEventEntity, String> {

  List<UsageEventEntity> findTop200ByUserIdOrderByCreatedAtDesc(String userId);

  @Query("select coalesce(max(e.createdAt), null) from UsageEventEntity e where e.user.id = :userId")
  Instant lastEventAt(@Param("userId") String userId);
}
