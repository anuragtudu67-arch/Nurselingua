package com.nurselingua.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "conversation_turns")
public class ConversationTurnEntity {

  @Id
  @Column(length = 36)
  private String id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "conversation_id", nullable = false)
  private ConversationEntity conversation;

  /** NURSE | PATIENT */
  @Column(nullable = false, length = 10)
  private String speaker;

  @Column(name = "source_text", nullable = false, length = 1000)
  private String sourceText;

  @Column(name = "source_lang", nullable = false, length = 12)
  private String sourceLang;

  @Column(name = "target_text", nullable = false, length = 1000)
  private String targetText;

  @Column(name = "target_lang", nullable = false, length = 12)
  private String targetLang;

  @Column(name = "target_romanization", length = 500)
  private String targetRomanization;

  @Column(name = "library_phrase_id", length = 36)
  private String libraryPhraseId;

  @Column(name = "stt_confidence")
  private Double sttConfidence;

  @Column(name = "audio_ref", length = 255)
  private String audioRef;

  /** READY | PROCESSING | FAILED */
  @Column(nullable = false, length = 16)
  private String status = "READY";

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @PrePersist
  void prePersist() {
    if (id == null) id = java.util.UUID.randomUUID().toString();
    if (createdAt == null) createdAt = Instant.now();
  }

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }
  public ConversationEntity getConversation() { return conversation; }
  public void setConversation(ConversationEntity c) { this.conversation = c; }
  public String getSpeaker() { return speaker; }
  public void setSpeaker(String v) { this.speaker = v; }
  public String getSourceText() { return sourceText; }
  public void setSourceText(String v) { this.sourceText = v; }
  public String getSourceLang() { return sourceLang; }
  public void setSourceLang(String v) { this.sourceLang = v; }
  public String getTargetText() { return targetText; }
  public void setTargetText(String v) { this.targetText = v; }
  public String getTargetLang() { return targetLang; }
  public void setTargetLang(String v) { this.targetLang = v; }
  public String getTargetRomanization() { return targetRomanization; }
  public void setTargetRomanization(String v) { this.targetRomanization = v; }
  public String getLibraryPhraseId() { return libraryPhraseId; }
  public void setLibraryPhraseId(String v) { this.libraryPhraseId = v; }
  public Double getSttConfidence() { return sttConfidence; }
  public void setSttConfidence(Double v) { this.sttConfidence = v; }
  public String getAudioRef() { return audioRef; }
  public void setAudioRef(String v) { this.audioRef = v; }
  public String getStatus() { return status; }
  public void setStatus(String v) { this.status = v; }
  public Instant getCreatedAt() { return createdAt; }
  public void setCreatedAt(Instant v) { this.createdAt = v; }
}
