package com.nurselingua.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nurselingua.config.NurseLinguaProperties;
import com.nurselingua.entity.LanguageEntity;
import com.nurselingua.entity.WorkflowExecutionEntity;
import com.nurselingua.repository.LanguageRepository;
import com.nurselingua.repository.WorkflowRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Owns the lifecycle of asynchronous STT/TTS workflows:
 * created → PROCESSING → (n8n fires; simulated pipeline when n8n is off) → COMPLETED/FAILED.
 * The frontend only ever talks to Spring's status endpoints (spec §4).
 */
@Service
public class WorkflowOrchestrator {

  private static final Logger log = LoggerFactory.getLogger(WorkflowOrchestrator.class);

  private final WorkflowRepository jobs;
  private final LanguageRepository languages;
  private final N8nClient n8n;
  private final UserResolver userResolver;
  private final ObjectMapper json = new ObjectMapper();
  private final NurseLinguaProperties props;

  public WorkflowOrchestrator(WorkflowRepository jobs, LanguageRepository languages,
                              N8nClient n8n, UserResolver userResolver,
                              NurseLinguaProperties props) {
    this.jobs = jobs;
    this.languages = languages;
    this.n8n = n8n;
    this.userResolver = userResolver;
    this.props = props;
  }

  // ---------- STT ----------

  public WorkflowExecutionEntity createSttJob(String userId, String storageRef, String languageHint) {
    LanguageEntity lang = languageHint == null ? null
        : languages.findByCode(languageHint).orElse(null);

    WorkflowExecutionEntity job = new WorkflowExecutionEntity();
    job.setId("stt_" + UUID.randomUUID());
    job.setUser(userRef(userId));
    job.setKind(WorkflowExecutionEntity.Kind.STT.name());
    job.setStatus("PROCESSING");
    job.setLanguageHint(languageHint);
    job.setStorageRef(storageRef);
    job = jobs.save(job);

    n8n.fireStt(job, lang == null ? "en-US" : lang.getTtsLocale());
    simulateSttCompletionIfNoN8n(job.getId(), lang);
    return job;
  }

  /** Local stand-in for the n8n round-trip when N8N_ENABLED=false. */
  private void simulateSttCompletionIfNoN8n(String jobId, LanguageEntity lang) {
    if (props.n8n().enabled()) return;
    new Thread(() -> {
      try {
        Thread.sleep(2500);
        WorkflowExecutionEntity j = jobs.findById(jobId).orElse(null);
        if (j != null && "PROCESSING".equals(j.getStatus())) {
          // Simulated transcript — a plausible phrase in the hinted language.
          String hint = j.getLanguageHint() == null ? "es" : j.getLanguageHint();
          String transcript = switch (hint) {
            case "es" -> "Me duele aquí desde esta mañana.";
            case "hi" -> "मुझे आज सुबह से यहाँ दर्द है";
            case "bn" -> "আজ সকাল থেকে এখানে ব্যথা করছে";
            case "fr" -> "J'ai mal ici depuis ce matin.";
            case "ar" -> "أشعر بألم هنا منذ صباح اليوم";
            case "ur" -> "مجھے آج صبح سے یہاں درد ہے";
            case "zh" -> "我从今天早上开始这里疼。";
            case "ta" -> "இன்று காலை முதல் இங்கே வலிக்கிறது";
            default -> "It hurts here since this morning.";
          };
          j.setResultJson(json.writeValueAsString(Map.of(
              "transcript", transcript,
              "confidence", 0.92)));
          j.setStatus("COMPLETED");
          j.setCompletedAt(Instant.now());
          jobs.save(j);
          log.info("Simulated STT completed job {}", jobId);
        }
      } catch (Exception e) {
        log.warn("Simulated STT failed for {}: {}", jobId, e.getMessage());
      }
    }, "sim-stt-" + jobId).start();
  }

  // ---------- TTS ----------

  public WorkflowExecutionEntity createTtsJob(String userId, String text, String language, String rate) {
    LanguageEntity lang = languages.findByCode(language).orElse(null);
    if (lang == null) {
      WorkflowExecutionEntity bad = new WorkflowExecutionEntity();
      bad.setId("tts_" + UUID.randomUUID());
      bad.setUser(userRef(userId));
      bad.setKind(WorkflowExecutionEntity.Kind.TTS.name());
      bad.setStatus("FAILED");
      bad.setError("Unknown language: " + language);
      return jobs.save(bad);
    }

    WorkflowExecutionEntity job = new WorkflowExecutionEntity();
    job.setId("tts_" + UUID.randomUUID());
    job.setUser(userRef(userId));
    job.setKind(WorkflowExecutionEntity.Kind.TTS.name());
    job.setStatus("PROCESSING");
    job.setLanguageHint(language);
    job = jobs.save(job);

    n8n.fireTts(job, text, lang.getTtsLocale(), rate == null ? "slow" : rate);
    simulateTtsCompletionIfNoN8n(job.getId(), text, language, lang, rate);
    return job;
  }

  private void simulateTtsCompletionIfNoN8n(String jobId, String text, String language,
                                            LanguageEntity lang, String rate) {
    if (props.n8n().enabled()) return;
    new Thread(() -> {
      try {
        Thread.sleep(1500);
        WorkflowExecutionEntity j = jobs.findById(jobId).orElse(null);
        if (j != null && "PROCESSING".equals(j.getStatus())) {
          j.setResultJson(json.writeValueAsString(Map.of(
              "audioRef", "demo-audio://" + language + "/" + jobId + ".mp3",
              "ttsLocale", lang.getTtsLocale(),
              "rate", rate == null ? "slow" : rate,
              "text", text)));
          j.setStatus("COMPLETED");
          j.setCompletedAt(Instant.now());
          jobs.save(j);
          log.info("Simulated TTS completed job {}", jobId);
        }
      } catch (Exception e) {
        log.warn("Simulated TTS failed for {}: {}", jobId, e.getMessage());
      }
    }, "sim-tts-" + jobId).start();
  }

  // ---------- n8n callback application ----------

  /** n8n callback target — applies the result if the job is still ours to change. */
  public void applyCallback(String jobId, String status, Map<String, Object> result, String error) {
    jobs.findById(jobId).ifPresent(j -> {
      if (!"PROCESSING".equals(j.getStatus())) return;
      j.setStatus("COMPLETED".equalsIgnoreCase(status) ? "COMPLETED" : "FAILED");
      if (result != null) {
        try { j.setResultJson(json.writeValueAsString(result)); } catch (Exception ignored) {}
      }
      if (error != null) j.setError(error);
      if ("COMPLETED".equals(j.getStatus())) j.setCompletedAt(Instant.now());
      jobs.save(j);
    });
  }

  private com.nurselingua.entity.UserEntity userRef(String userId) {
    // Managed entity from a REQUIRES_NEW tx; provisions the row on first use.
    return userResolver.managed(userId);
  }

  /** Parse the result payload for status endpoints. */
  public Object parseResult(WorkflowExecutionEntity job) {
    if (job.getResultJson() == null) return null;
    try {
      return json.readValue(job.getResultJson(), Object.class);
    } catch (Exception e) {
      return null;
    }
  }
}
