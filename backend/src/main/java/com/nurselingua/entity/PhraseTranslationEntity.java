package com.nurselingua.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "phrase_translations")
public class PhraseTranslationEntity {

  @Id
  @Column(length = 36)
  private String id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "phrase_id", nullable = false)
  private PhraseEntity phrase;

  @Column(name = "language_code", nullable = false, length = 12)
  private String languageCode;

  @Column(nullable = false, length = 500)
  private String text;

  @Column(length = 500)
  private String romanization;

  @Column(name = "audio_ref", length = 255)
  private String audioRef;

  @Column(name = "professionally_reviewed", nullable = false)
  private boolean professionallyReviewed;

  @PrePersist
  void prePersist() { if (id == null) id = java.util.UUID.randomUUID().toString(); }

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }
  public PhraseEntity getPhrase() { return phrase; }
  public void setPhrase(PhraseEntity p) { this.phrase = p; }
  public String getLanguageCode() { return languageCode; }
  public void setLanguageCode(String v) { this.languageCode = v; }
  public String getText() { return text; }
  public void setText(String v) { this.text = v; }
  public String getRomanization() { return romanization; }
  public void setRomanization(String v) { this.romanization = v; }
  public String getAudioRef() { return audioRef; }
  public void setAudioRef(String v) { this.audioRef = v; }
  public boolean isProfessionallyReviewed() { return professionallyReviewed; }
  public void setProfessionallyReviewed(boolean v) { this.professionallyReviewed = v; }
}
