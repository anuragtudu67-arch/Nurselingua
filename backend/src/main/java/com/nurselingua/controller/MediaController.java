package com.nurselingua.controller;

import com.nurselingua.config.NurseLinguaProperties;
import com.nurselingua.config.SecurityConfig;
import com.nurselingua.dto.Dtos.PresignDto;
import com.nurselingua.dto.Dtos.SttSubmitRequest;
import com.nurselingua.dto.Dtos.TtsSubmitRequest;
import com.nurselingua.dto.Dtos.WorkflowStatusDto;
import com.nurselingua.dto.Dtos.WorkflowSubmissionDto;
import com.nurselingua.entity.WorkflowExecutionEntity;
import com.nurselingua.integration.R2Storage;
import com.nurselingua.integration.WorkflowOrchestrator;
import com.nurselingua.repository.WorkflowRepository;
import com.nurselingua.security.AppUser;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.UUID;

/**
 * Async media endpoints (spec §4): presign → browser uploads to R2 → submit ref →
 * poll status. The frontend never talks to n8n, storage credentials, or vendors.
 */
@RestController
@RequestMapping("/api/v1")
public class MediaController {

  private final WorkflowOrchestrator orchestrator;
  private final R2Storage r2;
  private final WorkflowRepository jobs;
  private final NurseLinguaProperties props;

  public MediaController(WorkflowOrchestrator orchestrator, R2Storage r2,
                         WorkflowRepository jobs, NurseLinguaProperties props) {
    this.orchestrator = orchestrator;
    this.r2 = r2;
    this.jobs = jobs;
    this.props = props;
  }

  private AppUser me() {
    AppUser u = SecurityConfig.current();
    if (u == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
    return u;
  }

  // ---------- uploads ----------

  @PostMapping("/uploads/presign")
  public PresignDto presign(@RequestBody(required = false) Map<String, Object> body) {
    me(); // auth required
    String ext = body != null && body.get("extension") instanceof String s ? s : "webm";
    if (r2.isEnabled()) {
      try {
        R2Storage.Presign p = r2.presignPut(ext);
        return new PresignDto(p.url(), p.storageRef(), p.expiresIn(), "r2");
      } catch (Exception e) {
        throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Storage presign failed");
      }
    }
    // Demo fallback: no R2 configured — the client "uploads" by referencing an
    // inline ref; no permanent credentials are ever involved.
    return new PresignDto(null, "inline/" + UUID.randomUUID(), 300, "inline");
  }

  // ---------- STT ----------

  @PostMapping("/speech/submissions")
  @ResponseStatus(HttpStatus.ACCEPTED)
  public WorkflowSubmissionDto stt(@RequestBody SttSubmitRequest req) {
    AppUser u = me();
    if (req.storageRef() == null || req.storageRef().isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "storageRef is required");
    }
    WorkflowExecutionEntity job = orchestrator.createSttJob(
        u.userId(), req.storageRef(), req.languageHint());
    return new WorkflowSubmissionDto(job.getId(), job.getStatus().toLowerCase());
  }

  @GetMapping("/speech/{id}/status")
  public WorkflowStatusDto sttStatus(@PathVariable String id) {
    return status(id);
  }

  // ---------- TTS ----------

  @PostMapping("/tts")
  @ResponseStatus(HttpStatus.ACCEPTED)
  public WorkflowSubmissionDto tts(@RequestBody TtsSubmitRequest req) {
    AppUser u = me();
    if (req.text() == null || req.text().isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "text is required");
    }
    WorkflowExecutionEntity job = orchestrator.createTtsJob(
        u.userId(), req.text(), req.language(), req.rate());
    return new WorkflowSubmissionDto(job.getId(), job.getStatus().toLowerCase());
  }

  @GetMapping("/tts/{id}/status")
  public WorkflowStatusDto ttsStatus(@PathVariable String id) {
    return status(id);
  }

  private WorkflowStatusDto status(String id) {
    AppUser u = me();
    WorkflowExecutionEntity job = jobs.findByIdAndUserId(id, u.userId())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown job"));
    return new WorkflowStatusDto(job.getId(), job.getKind().toLowerCase(),
        job.getStatus().toLowerCase(), orchestrator.parseResult(job), job.getError());
  }

  // ---------- n8n webhook (shared-secret authenticated) ----------

  @PostMapping("/webhooks/n8n")
  public Map<String, Object> n8nCallback(
      @RequestHeader(value = "X-N8N-Secret", required = false) String secret,
      @RequestBody Map<String, Object> body) {
    String expected = props.n8n().secret();
    if (secret == null || !secret.equals(expected)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bad webhook secret");
    }
    String jobId = body.get("jobId") instanceof String s ? s : null;
    if (jobId == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "jobId required");
    String status = body.get("status") instanceof String s ? s : "completed";
    String error = body.get("error") instanceof String s ? s : null;
    @SuppressWarnings("unchecked")
    Map<String, Object> result = body.get("result") instanceof Map<?, ?> m
        ? (Map<String, Object>) m : null;
    orchestrator.applyCallback(jobId, status, result, error);
    return Map.of("ok", true);
  }
}
