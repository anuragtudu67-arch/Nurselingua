package com.nurselingua.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "user_settings")
public class UserSettingsEntity {

  @Id
  @Column(name = "user_id", length = 36)
  private String userId;

  @Column(name = "nurse_language", nullable = false, length = 12)
  private String nurseLanguage = "en";

  /** CSV of commonly encountered patient languages. */
  @Column(name = "patient_languages", nullable = false, length = 255)
  private String patientLanguages = "es,hi";

  /** slow | normal */
  @Column(name = "speech_rate", nullable = false, length = 10)
  private String speechRate = "slow";

  /** 24h | 7days | off */
  @Column(name = "retention", nullable = false, length = 10)
  private String retention = "7days";

  @Column(name = "onboarding_complete", nullable = false)
  private boolean onboardingComplete;

  @Column(name = "updated_at", insertable = false, updatable = false)
  private Instant updatedAt;

  public String getUserId() { return userId; }
  public void setUserId(String v) { this.userId = v; }
  public String getNurseLanguage() { return nurseLanguage; }
  public void setNurseLanguage(String v) { this.nurseLanguage = v; }
  public String getPatientLanguages() { return patientLanguages; }
  public void setPatientLanguages(String v) { this.patientLanguages = v; }
  public String getSpeechRate() { return speechRate; }
  public void setSpeechRate(String v) { this.speechRate = v; }
  public String getRetention() { return retention; }
  public void setRetention(String v) { this.retention = v; }
  public boolean isOnboardingComplete() { return onboardingComplete; }
  public void setOnboardingComplete(boolean v) { this.onboardingComplete = v; }
  public Instant getUpdatedAt() { return updatedAt; }
}
