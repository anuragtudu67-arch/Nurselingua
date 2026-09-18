package com.nurselingua.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "conversations")
public class ConversationEntity {

  @Id
  @Column(length = 36)
  private String id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private UserEntity user;

  @Column(name = "nurse_language", nullable = false, length = 12)
  private String nurseLanguage;

  @Column(name = "patient_language", nullable = false, length = 12)
  private String patientLanguage;

  @Column(length = 120)
  private String title;

  @Column(name = "started_at", nullable = false)
  private Instant startedAt;

  @Column(name = "last_activity_at", nullable = false)
  private Instant lastActivityAt;

  @Column(name = "expires_at")
  private Instant expiresAt;

  @Column(nullable = false)
  private boolean deleted;

  @PrePersist
  void prePersist() {
    if (id == null) id = java.util.UUID.randomUUID().toString();
    if (startedAt == null) startedAt = Instant.now();
    if (lastActivityAt == null) lastActivityAt = Instant.now();
  }

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }
  public UserEntity getUser() { return user; }
  public void setUser(UserEntity u) { this.user = u; }
  public String getNurseLanguage() { return nurseLanguage; }
  public void setNurseLanguage(String v) { this.nurseLanguage = v; }
  public String getPatientLanguage() { return patientLanguage; }
  public void setPatientLanguage(String v) { this.patientLanguage = v; }
  public String getTitle() { return title; }
  public void setTitle(String v) { this.title = v; }
  public Instant getStartedAt() { return startedAt; }
  public void setStartedAt(Instant v) { this.startedAt = v; }
  public Instant getLastActivityAt() { return lastActivityAt; }
  public void setLastActivityAt(Instant v) { this.lastActivityAt = v; }
  public Instant getExpiresAt() { return expiresAt; }
  public void setExpiresAt(Instant v) { this.expiresAt = v; }
  public boolean isDeleted() { return deleted; }
  public void setDeleted(boolean v) { this.deleted = v; }
}
