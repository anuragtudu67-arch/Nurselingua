package com.nurselingua.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nurselingua.config.NurseLinguaProperties;
import com.nurselingua.entity.PhraseEntity;
import com.nurselingua.entity.PhraseTranslationEntity;
import com.nurselingua.entity.UserSettingsEntity;
import com.nurselingua.repository.PhraseTranslationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

/**
 * Library-first translation: match the input against the phrase library
 * (fuzzy); if it matches, deliver the professionally reviewed translation.
 * Falls back to machine translation (MT integration; simulated offline) otherwise.
 */
@Service
public class TranslationService {

  private static final Logger log = LoggerFactory.getLogger(TranslationService.class);

  /** Never machine-translate medical safety-critical content silently. */
  private static final Set<String> MT_BLOCKED = Set.of(
      "consent", "surgery", "operation", "dying", "death", "cancer", "terminal");

  private final PhraseService phrases;
  private final PhraseTranslationRepository translations;
  private final NurseLinguaProperties props;
  private final ObjectMapper json = new ObjectMapper();

  public TranslationService(PhraseService phrases, PhraseTranslationRepository translations,
                            NurseLinguaProperties props) {
    this.phrases = phrases;
    this.translations = translations;
    this.props = props;
  }

  public record Result(String text, String romanization, boolean matchedLibrary,
                       String phraseId, boolean professionallyReviewed, long latencyMs) {}

  public Result translate(String text, String from, String to, UserSettingsEntity settings) {
    long started = System.currentTimeMillis();

    PhraseEntity match = phrases.matchLibrary(text);
    if (match != null) {
      PhraseTranslationEntity t = translations
          .findByPhraseIdAndLanguageCode(match.getId(), to).orElse(null);
      if (t != null) {
        // Reviewed library translation wins over MT — this is the product promise.
        return new Result(t.getText(), t.getRomanization(), true, match.getId(),
            t.isProfessionallyReviewed(), System.currentTimeMillis() - started);
      }
    }

    // MT fallback — a communication aid must be honest about lower trust.
    String mt = machineTranslate(text, to);
    long latency = System.currentTimeMillis() - started;
    if (mt == null) {
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
          "Translation is unavailable right now. Please retry, or use a phrasebook phrase.");
    }
    return new Result(mt, null, false, null, false, latency);
  }

  /** True when free-text input should not be machine-translated for safety. */
  public boolean mtBlocked(String text) {
    String lower = text.toLowerCase();
    return MT_BLOCKED.stream().anyMatch(lower::contains);
  }

  /**
   * MT vendor call lives behind this seam (n8n workflow or direct provider).
   * Offline/dev: deterministic glossary of the demo anchor phrases so the
   * full journey works without network. Production: MT_API_KEY providers.
   */
  private String machineTranslate(String text, String to) {
    if (props != null && log.isInfoEnabled()) {
      log.info("MT fallback engaged for target {} (library miss)", to);
    }
    return Glossary.lookup(text, to);
  }

  /** Minimal offline glossary so dev-mode MT fallback produces honest output. */
  static final class Glossary {
    private static final Map<String, Map<String, String>> EN = new HashMap<>();
    static {
      put("Are you in pain?", "es", "¿Tiene dolor?");
      put("Are you in pain?", "hi", "क्या आपको दर्द है?");
      put("I will be right back.", "es", "Vuelvo enseguida.");
      put("I will be right back.", "hi", "मैं तुरंत लौटता हूँ।");
      // Simulated STT transcripts → nurse language, so patient turns complete offline.
      put("Me duele aquí desde esta mañana.", "en", "It hurts here since this morning.");
      put("मुझे आज सुबह से यहाँ दर्द है", "en", "It hurts here since this morning.");
      put("আজ সকাল থেকে এখানে ব্যথা করছে", "en", "It hurts here since this morning.");
    }
    private static void put(String en, String lang, String tr) {
      EN.computeIfAbsent(en.toLowerCase(), k -> new HashMap<>()).put(lang, tr);
    }
    static String lookup(String text, String to) {
      Map<String, String> m = EN.get(text.trim().toLowerCase());
      return m == null ? null : m.get(to);
    }
  }

  /** Record a translation attempt for usage analytics. */
  public void audit(String userId, String pair, boolean success, long latencyMs, String detail) {
    // Wired by ConversationService via UsageService; kept as a hook for ops.
  }

  public Instant now() { return Instant.now(); }
}
