package com.nurselingua.integration;

import com.nurselingua.config.NurseLinguaProperties;
import com.nurselingua.entity.WorkflowExecutionEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Map;

/**
 * Calls n8n webhook workflows. Spring is the only caller; n8n calls back
 * to /api/v1/webhooks/n8n with the shared secret. If n8n is not configured,
 * we log and continue — the job stays PROCESSING and the simulated pipeline
 * (WorkflowOrchestrator) completes it for local demos.
 */
@Service
public class N8nClient {

  private static final Logger log = LoggerFactory.getLogger(N8nClient.class);
  private final RestClient http;
  private final NurseLinguaProperties props;

  public N8nClient(RestClient.Builder builder, NurseLinguaProperties props) {
    this.http = builder.build();
    this.props = props;
  }

  public void fireStt(WorkflowExecutionEntity job, String ttsLocaleHint) {
    fire(job, Map.of(
        "jobId", job.getId(),
        "kind", "stt",
        "storageRef", job.getStorageRef() == null ? "" : job.getStorageRef(),
        "languageHint", job.getLanguageHint() == null ? "" : job.getLanguageHint(),
        "ttsLocale", ttsLocaleHint,
        "callbackUrl", "/api/v1/webhooks/n8n"));
  }

  public void fireTts(WorkflowExecutionEntity job, String text, String ttsLocale, String rate) {
    fire(job, Map.of(
        "jobId", job.getId(),
        "kind", "tts",
        "text", text,
        "ttsLocale", ttsLocale,
        "rate", rate,
        "callbackUrl", "/api/v1/webhooks/n8n"));
  }

  private void fire(WorkflowExecutionEntity job, Map<String, Object> body) {
    if (!props.n8n().enabled() || props.n8n().baseUrl() == null || props.n8n().baseUrl().isBlank()) {
      log.info("n8n disabled — job {} stays for simulated pipeline", job.getId());
      return;
    }
    try {
      http.post().uri(props.n8n().baseUrl())
          .header("X-N8N-Secret", props.n8n().secret())
          .contentType(MediaType.APPLICATION_JSON)
          .body(body)
          .retrieve().toBodilessEntity();
      log.info("n8n workflow fired for job {}", job.getId());
    } catch (Exception e) {
      log.error("n8n call failed for job {}: {}", job.getId(), e.getMessage());
      // Job remains PROCESSING; retries/timeouts handled by n8n side or ops.
    }
  }
}
