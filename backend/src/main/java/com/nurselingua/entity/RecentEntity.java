package com.nurselingua.entity;

import jakarta.persistence.*;
import java.time.Instant;

/** One-tap reuse trail — upserted on each phrase use, newest first on read. */
@Entity
@Table(name = "recents")
public class RecentEntity {

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

  @Column(name = "used_at", nullable = false)
  private Instant usedAt;

  @PrePersist
  void prePersist() {
    if (id == null) id = java.util.UUID.randomUUID().toString();
    if (usedAt == null) usedAt = Instant.now();
  }

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }
  public UserEntity getUser() { return user; }
  public void setUser(UserEntity u) { this.user = u; }
  public String getPhraseId() { return phraseId; }
  public void setPhraseId(String v) { this.phraseId = v; }
  public String getLanguageCode() { return languageCode; }
  public void setLanguageCode(String v) { this.languageCode = v; }
  public Instant getUsedAt() { return usedAt; }
  public void setUsedAt(Instant v) { this.usedAt = v; }
}
