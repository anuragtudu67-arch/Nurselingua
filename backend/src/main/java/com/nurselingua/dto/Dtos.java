package com.nurselingua.dto;

import java.time.Instant;
import java.util.List;

/** Contract DTOs — the shapes the frontend (and docs/API.md) depend on. */
public final class Dtos {
  private Dtos() {}

  // ---------- catalog ----------

  public record LanguageDto(String code, String name, String nativeName, String ttsLocale,
                            boolean sttSupported, String script, boolean hasRomanization,
                            boolean uiLocaleSupport, boolean rtl) {}

  public record CategoryDto(String slug, String name, String description, int position) {}

  public record PhraseTranslationDto(String languageCode, String text, String romanization,
                                     String audioRef, boolean professionallyReviewed) {}

  public record PhraseDto(String id, String categorySlug, String baseText, boolean isQuestion,
                          String cardType, List<String> tags, int priority,
                          List<PhraseTranslationDto> translations,
                          Boolean favorite) {}

  // ---------- users / settings / onboarding ----------

  public record SettingsDto(String nurseLanguage, List<String> patientLanguages,
                            String speechRate, String retention) {}

  public record UsersMeDto(String userId, String email, String name,
                           SettingsDto settings, boolean onboardingComplete) {}

  public record OnboardingRequest(String nurseLanguage, List<String> patientLanguages,
                                  String speechRate, String retention) {}

  public record SettingsUpdateRequest(String nurseLanguage, List<String> patientLanguages,
                                      String speechRate, String retention) {}

  // ---------- conversations ----------

  public record ConversationDto(String id, String nurseLanguage, String patientLanguage,
                                String title, Instant startedAt, Instant lastActivityAt,
                                Instant expiresAt, long turnCount) {}

  public record ConversationDetailDto(ConversationDto conversation, List<TurnDto> turns) {}

  public record TurnDto(String id, String speaker, String sourceText, String sourceLang,
                        String targetText, String targetLang, String targetRomanization,
                        String libraryPhraseId, Double sttConfidence, String audioRef,
                        String status, Instant createdAt) {}

  public record CreateConversationRequest(String patientLanguage, String nurseLanguage,
                                          String title) {}

  public record AddTurnRequest(String speaker, String text, String phraseId,
                               String workflowId, Double sttConfidence) {}

  // ---------- translation ----------

  public record TranslationRequest(String text, String from, String to) {}

  public record TranslationResponse(String sourceText, String sourceLang, String text,
                                    String targetLang, String romanization, boolean matchedLibrary,
                                    String phraseId, boolean professionallyReviewed) {}

  // ---------- async workflows (STT / TTS) ----------

  public record PresignDto(String url, String ref, int expiresIn, String mode) {}

  public record SttSubmitRequest(String storageRef, String languageHint) {}

  public record TtsSubmitRequest(String text, String language, String rate) {}

  public record WorkflowSubmissionDto(String id, String status) {}

  /** result is {transcript, confidence} for STT, {audioRef} for TTS. */
  public record WorkflowStatusDto(String id, String kind, String status, Object result,
                                  String error) {}

  // ---------- favorites / recents ----------

  public record FavoriteDto(String phraseId, String languageCode, Instant createdAt) {}

  public record RecentDto(String phraseId, String languageCode, Instant usedAt) {}

  public record AddFavoriteRequest(String phraseId, String languageCode) {}

  // ---------- usage ----------

  public record UsageEventRequest(String eventType, String languagePair, String phraseId,
                                  String outcome, Integer latencyMs, String detail) {}

  public record PairCountDto(String pair, long count) {}

  public record PhraseCountDto(String phraseId, String baseText, long count) {}

  public record PipelineStatDto(long total, long failures, double failureRate, Double avgLatencyMs) {}

  public record UsageDto(long sessions, long turns, List<PairCountDto> languagePairs,
                         List<PhraseCountDto> topPhrases,
                         PipelineStatDto stt, PipelineStatDto mt, PipelineStatDto tts) {}
}
