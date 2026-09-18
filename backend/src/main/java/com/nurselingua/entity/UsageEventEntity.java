package com.nurselingua.entity;

import jakarta.persistence.*;
import java.time.Instant;

/** Analytics backbone: sessions, turns, language pairs, STT/MT/TTS latency + failures. */
@Entity
@Table(name = "usage_events")
public class UsageEventEntity {

  @Id
  @Column(length = 36)
  private String id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private UserEntity user;

  @Column(name = "event_type", nullable = false, length = 32)
  private String eventType;

  @Column(name = "language_pair", length = 24)
  private String languagePair;

  @Column(name = "phrase_id", length = 36)
  private String phraseId;

  /** SUCCESS | FAILURE */
  @Column(length = 16)
  private String outcome;

  @Column(name = "latency_ms")
  private Integer latencyMs;

  @Column(length = 255)
  private String detail;

  @Column(name = "created_at", insertable = false, updatable = false)
  private Instant createdAt;

  @PrePersist
  void prePersist() { if (id == null) id = java.util.UUID.randomUUID().toString(); }

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }
  public UserEntity getUser() { return user; }
  public void setUser(UserEntity u) { this.user = u; }
  public String getEventType() { return eventType; }
  public void setEventType(String v) { this.eventType = v; }
  public String getLanguagePair() { return languagePair; }
  public void setLanguagePair(String v) { this.languagePair = v; }
  public String getPhraseId() { return phraseId; }
  public void setPhraseId(String v) { this.phraseId = v; }
  public String getOutcome() { return outcome; }
  public void setOutcome(String v) { this.outcome = v; }
  public Integer getLatencyMs() { return latencyMs; }
  public void setLatencyMs(Integer v) { this.latencyMs = v; }
  public String getDetail() { return detail; }
  public void setDetail(String v) { this.detail = v; }
  public Instant getCreatedAt() { return createdAt; }
}
