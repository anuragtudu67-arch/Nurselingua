package com.nurselingua.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "phrases")
public class PhraseEntity {

  @Id
  @Column(length = 36)
  private String id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "category_id", nullable = false)
  private PhraseCategoryEntity category;

  @Column(name = "base_text", nullable = false, length = 255)
  private String baseText;

  @Column(name = "is_question", nullable = false)
  private boolean question;

  @Column(name = "card_type", nullable = false, length = 24)
  private String cardType = "STANDARD";   // STANDARD | PAIN_SCALE

  @Column(length = 255)
  private String tags;

  @Column(nullable = false)
  private int priority = 50;

  @PrePersist
  void prePersist() { if (id == null) id = java.util.UUID.randomUUID().toString(); }

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }
  public PhraseCategoryEntity getCategory() { return category; }
  public void setCategory(PhraseCategoryEntity c) { this.category = c; }
  public String getBaseText() { return baseText; }
  public void setBaseText(String v) { this.baseText = v; }
  public boolean isQuestion() { return question; }
  public void setQuestion(boolean v) { this.question = v; }
  public String getCardType() { return cardType; }
  public void setCardType(String v) { this.cardType = v; }
  public String getTags() { return tags; }
  public void setTags(String v) { this.tags = v; }
  public int getPriority() { return priority; }
  public void setPriority(int v) { this.priority = v; }
}
