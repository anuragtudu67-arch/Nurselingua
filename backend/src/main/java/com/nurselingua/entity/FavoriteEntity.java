package com.nurselingua.entity;

import jakarta.persistence.*;
import java.time.Instant;

/** A saved phrase (★ favorite). One row per (user, phrase, patient language). */
@Entity
@Table(name = "favorites")
public class FavoriteEntity {

  @Id
  @Column(length = 36)
  private String id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private UserEntity user;

  @Column(name = "phrase_id", nullable = false, length = 36)
  private String phraseId;

  @Column(name = "language_code", nullable = false, length = 12)
  private String languageCode;

  @Column(name = "created_at", insertable = false, updatable = false)
  private Instant createdAt;

  @PrePersist
  void prePersist() { if (id == null) id = java.util.UUID.randomUUID().toString(); }

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }
  public UserEntity getUser() { return user; }
  public void setUser(UserEntity u) { this.user = u; }
  public String getPhraseId() { return phraseId; }
  public void setPhraseId(String v) { this.phraseId = v; }
  public String getLanguageCode() { return languageCode; }
  public void setLanguageCode(String v) { this.languageCode = v; }
  public Instant getCreatedAt() { return createdAt; }
}
