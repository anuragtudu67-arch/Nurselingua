package com.nurselingua.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
public class UserEntity {

  @Id
  @Column(length = 36)
  private String id;

  @Column(name = "clerk_user_id", nullable = false, unique = true, length = 191)
  private String clerkUserId;

  @Column(nullable = false, unique = true)
  private String email;

  @Column(length = 120)
  private String name;

  @Column(name = "created_at", insertable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", insertable = false, updatable = false)
  private Instant updatedAt;

  @PrePersist
  void prePersist() { if (id == null) id = UUID.randomUUID().toString(); }

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }
  public String getClerkUserId() { return clerkUserId; }
  public void setClerkUserId(String v) { this.clerkUserId = v; }
  public String getEmail() { return email; }
  public void setEmail(String v) { this.email = v; }
  public String getName() { return name; }
  public void setName(String v) { this.name = v; }
  public Instant getCreatedAt() { return createdAt; }
  public Instant getUpdatedAt() { return updatedAt; }
}
