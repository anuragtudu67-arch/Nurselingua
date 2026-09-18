package com.nurselingua.entity;

import jakarta.persistence.*;
import java.time.Instant;

/** Backend-owned async workflow: STT (recording → transcript) or TTS (text → audio). */
@Entity
@Table(name = "workflow_executions")
public class WorkflowExecutionEntity {

  public enum Kind { STT, TTS }

  @Id
  @Column(length = 80)
  private String id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private UserEntity user;

  @Column(nullable = false, length = 16)
  private String kind;

  /** PROCESSING | COMPLETED | FAILED */
  @Column(nullable = false, length = 16)
  private String status = "PROCESSING";

  @Column(name = "language_hint", length = 12)
  private String languageHint;

  @Column(name = "storage_ref", length = 255)
  private String storageRef;

  @Column(name = "result_json", columnDefinition = "TEXT")
  private String resultJson;

  @Column(length = 500)
  private String error;

  @Column(name = "created_at", insertable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "completed_at")
  private Instant completedAt;

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }
  public UserEntity getUser() { return user; }
  public void setUser(UserEntity u) { this.user = u; }
  public String getKind() { return kind; }
  public void setKind(String v) { this.kind = v; }
  public String getStatus() { return status; }
  public void setStatus(String v) { this.status = v; }
  public String getLanguageHint() { return languageHint; }
  public void setLanguageHint(String v) { this.languageHint = v; }
  public String getStorageRef() { return storageRef; }
  public void setStorageRef(String v) { this.storageRef = v; }
  public String getResultJson() { return resultJson; }
  public void setResultJson(String v) { this.resultJson = v; }
  public String getError() { return error; }
  public void setError(String v) { this.error = v; }
  public Instant getCreatedAt() { return createdAt; }
  public Instant getCompletedAt() { return completedAt; }
  public void setCompletedAt(Instant v) { this.completedAt = v; }
}
