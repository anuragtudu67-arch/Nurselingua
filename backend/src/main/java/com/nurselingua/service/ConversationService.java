package com.nurselingua.service;

import com.nurselingua.dto.Dtos.AddTurnRequest;
import com.nurselingua.dto.Dtos.ConversationDetailDto;
import com.nurselingua.dto.Dtos.ConversationDto;
import com.nurselingua.dto.Dtos.TurnDto;
import com.nurselingua.entity.ConversationEntity;
import com.nurselingua.entity.ConversationTurnEntity;
import com.nurselingua.entity.PhraseEntity;
import com.nurselingua.entity.PhraseTranslationEntity;
import com.nurselingua.entity.UserSettingsEntity;
import com.nurselingua.repository.ConversationRepository;
import com.nurselingua.repository.ConversationTurnRepository;
import com.nurselingua.repository.PhraseTranslationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

@Service
public class ConversationService {

  private static final Logger log = LoggerFactory.getLogger(ConversationService.class);

  private final ConversationRepository conversations;
  private final ConversationTurnRepository turns;
  private final PhraseService phraseService;
  private final PhraseTranslationRepository phraseTranslations;
  private final TranslationService translation;
  private final FavoriteService favoriteService;
  private final UsageService usage;
  private final UserService users;
  private final com.nurselingua.integration.UserResolver userResolver;

  public ConversationService(ConversationRepository conversations,
                             ConversationTurnRepository turns,
                             PhraseService phraseService,
                             PhraseTranslationRepository phraseTranslations,
                             TranslationService translation,
                             FavoriteService favoriteService,
                             UsageService usage,
                             UserService users,
                             com.nurselingua.integration.UserResolver userResolver) {
    this.conversations = conversations;
    this.turns = turns;
    this.phraseService = phraseService;
    this.phraseTranslations = phraseTranslations;
    this.translation = translation;
    this.favoriteService = favoriteService;
    this.usage = usage;
    this.users = users;
    this.userResolver = userResolver;
  }

  // ---------- conversations ----------

  @Transactional
  public ConversationDto create(String userId, com.nurselingua.dto.Dtos.CreateConversationRequest req) {
    UserSettingsEntity s = users.settingsFor(userId);
    String nurse = req.nurseLanguage() != null ? req.nurseLanguage() : s.getNurseLanguage();
    String patient = req.patientLanguage() != null ? req.patientLanguage()
        : firstPatientLanguage(s);
    ConversationEntity c = new ConversationEntity();
    c.setUser(userRef(userId));
    c.setNurseLanguage(nurse);
    c.setPatientLanguage(patient);
    c.setTitle(req.title());
    c.setExpiresAt(computeExpiry(s.getRetention()));
    conversations.save(c);
    usage.record(userId, new com.nurselingua.dto.Dtos.UsageEventRequest(
        "SESSION_START", nurse + "-" + patient, null, "SUCCESS", null, null));
    return toDto(c, 0);
  }

  public List<ConversationDto> history(String userId) {
    return conversations.findByUserIdAndDeletedFalseOrderByLastActivityAtDesc(userId)
        .stream().map(c -> toDto(c, turns.countByConversationId(c.getId()))).toList();
  }

  public ConversationDetailDto detail(String userId, String id) {
    ConversationEntity c = own(userId, id);
    List<TurnDto> turnDtos = turns.findByConversationIdOrderByCreatedAtAsc(id)
        .stream().map(ConversationService::toDto).toList();
    return new ConversationDetailDto(toDto(c, turnDtos.size()), turnDtos);
  }

  @Transactional
  public void delete(String userId, String id) {
    ConversationEntity c = own(userId, id);
    c.setDeleted(true);
    conversations.save(c);
  }

  // ---------- turns ----------

  /**
   * Adds a turn and produces its translation.
   * Library-first: a fuzzy library hit always wins over machine translation.
   * Nurse turns: source = nurse language, target = patient language.
   * Patient turns: source = patient language, target = nurse language.
   */
  @Transactional
  public TurnDto addTurn(String userId, String conversationId, AddTurnRequest req) {
    ConversationEntity c = own(userId, conversationId);

    boolean nurse = "NURSE".equalsIgnoreCase(req.speaker());
    if (!nurse && !"PATIENT".equalsIgnoreCase(req.speaker())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "speaker must be NURSE or PATIENT");
    }
    String sourceText = req.text();
    if ((sourceText == null || sourceText.isBlank()) && req.phraseId() != null) {
      sourceText = phraseService.phrase(req.phraseId(), userId, c.getPatientLanguage()).baseText();
    }
    if (sourceText == null || sourceText.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "text or phraseId required");
    }

    String sourceLang = nurse ? c.getNurseLanguage() : c.getPatientLanguage();
    String targetLang = nurse ? c.getPatientLanguage() : c.getNurseLanguage();

    String targetText;
    String romanization = null;
    String phraseId = req.phraseId();
    boolean reviewed = false;
    long started = System.currentTimeMillis();

    if (phraseId != null) {
      // Direct phrasebook use: the reviewed translation IS the content.
      PhraseTranslationEntity t = phraseTranslations
          .findByPhraseIdAndLanguageCode(phraseId, targetLang).orElse(null);
      if (t == null) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
            "No " + targetLang + " translation for phrase " + phraseId);
      }
      targetText = t.getText();
      romanization = t.getRomanization();
      reviewed = t.isProfessionallyReviewed();
    } else {
      TranslationService.Result r = translation.translate(sourceText, sourceLang, targetLang,
          users.settingsFor(userId));
      targetText = r.text();
      romanization = r.romanization();
      phraseId = r.phraseId();
      reviewed = r.professionallyReviewed();
      usage.record(userId, new com.nurselingua.dto.Dtos.UsageEventRequest(
          "MT", sourceLang + "-" + targetLang, null,
          r.matchedLibrary() ? "SUCCESS" : "SUCCESS",
          (int) (System.currentTimeMillis() - started), null));
    }

    ConversationTurnEntity t = new ConversationTurnEntity();
    t.setConversation(c);
    t.setSpeaker(nurse ? "NURSE" : "PATIENT");
    t.setSourceText(sourceText);
    t.setSourceLang(sourceLang);
    t.setTargetText(targetText);
    t.setTargetLang(targetLang);
    t.setTargetRomanization(romanization);
    t.setLibraryPhraseId(phraseId);
    t.setSttConfidence(req.sttConfidence());
    t.setStatus("READY");
    turns.save(t);

    c.setLastActivityAt(Instant.now());
    conversations.save(c);

    usage.record(userId, new com.nurselingua.dto.Dtos.UsageEventRequest(
        "TURN_CREATED", sourceLang + "-" + targetLang, phraseId, "SUCCESS", null, null));
    if (phraseId != null) favoriteService.touchRecent(userId, phraseId, targetLang);

    return toDto(t);
  }

  // ---------- retention ----------

  /** 24h / 7days / off → expiry timestamp for a new conversation. */
  private Instant computeExpiry(String retention) {
    return switch (retention == null ? "7days" : retention) {
      case "24h" -> Instant.now().plus(Duration.ofHours(24));
      case "7days" -> Instant.now().plus(Duration.ofDays(7));
      default -> null; // "off" — keep until manual delete
    };
  }

  /** Runs hourly; soft-deletes expired conversations (privacy-first retention). */
  @Scheduled(fixedDelay = 3_600_000, initialDelay = 60_000)
  @Transactional
  public void expireExpiredConversations() {
    int n = conversations.expireConversations(Instant.now());
    if (n > 0) log.info("Retention: expired {} conversation(s)", n);
  }

  // ---------- helpers ----------

  private ConversationEntity own(String userId, String id) {
    ConversationEntity c = conversations.findByIdAndUserId(id, userId).orElseThrow(() ->
        new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversation not found"));
    if (c.isDeleted()) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversation not found");
    }
    return c;
  }

  private com.nurselingua.entity.UserEntity userRef(String userId) {
    // Managed entity from a REQUIRES_NEW tx — never transient inside our writes.
    return userResolver.managed(userId);
  }

  private String firstPatientLanguage(UserSettingsEntity s) {
    String csv = s.getPatientLanguages();
    return (csv == null || csv.isBlank()) ? "es" : csv.split(",")[0];
  }

  private static ConversationDto toDto(ConversationEntity c, long turnCount) {
    return new ConversationDto(c.getId(), c.getNurseLanguage(), c.getPatientLanguage(),
        c.getTitle(), c.getStartedAt(), c.getLastActivityAt(), c.getExpiresAt(), turnCount);
  }

  public static TurnDto toDto(ConversationTurnEntity t) {
    return new TurnDto(t.getId(), t.getSpeaker(), t.getSourceText(), t.getSourceLang(),
        t.getTargetText(), t.getTargetLang(), t.getTargetRomanization(),
        t.getLibraryPhraseId(), t.getSttConfidence(), t.getAudioRef(), t.getStatus(),
        t.getCreatedAt());
  }
}
