package com.nurselingua;

import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.concurrent.TimeUnit;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * The full nurse journey (spec §6.5): onboarding → phrasebook lookup →
 * conversation with a library-phrase turn + a patient STT turn → TTS →
 * history → favorites → usage — for English→Spanish AND English→Hindi.
 * Asserts the reviewed translation is preferred over MT, romanization is
 * present for Devanagari, and retention expiry works.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("h2")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class NurseJourneyIntegrationTest {

  private static final String NURSE = "Bearer dev.nurse.joy@hospital.example";
  private static final String NURSE2 = "Bearer dev.nurse.amit@hospital.example";

  @Autowired MockMvc mvc;

  private String body(String path, String json) throws Exception {
    return mvc.perform(post(path).header("Authorization", NURSE)
            .contentType("application/json").content(json))
        .andExpect(status().is2xxSuccessful())
        .andReturn().getResponse().getContentAsString();
  }

  private String apiGet(String path) throws Exception {
    return mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get(path)
            .header("Authorization", NURSE))
        .andExpect(status().is2xxSuccessful())
        .andReturn().getResponse().getContentAsString();
  }

  @Test @Order(1)
  void healthAndCatalogArePublic() throws Exception {
    mvc.perform(get("/api/health")).andExpect(status().isOk())
        .andExpect(jsonPath("$.service").value("nurselingua-api"));
    mvc.perform(get("/api/v1/languages")).andExpect(status().isOk())
        .andExpect(jsonPath("$[?(@.code=='es')].ttsLocale").value("es-MX"))
        .andExpect(jsonPath("$[?(@.code=='hi')].hasRomanization").value(true));
    mvc.perform(get("/api/v1/categories")).andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(5));
  }

  @Test @Order(2)
  void unauthorizedRequestsAreRejected() throws Exception {
    mvc.perform(get("/api/v1/users/me")).andExpect(status().isUnauthorized());
    mvc.perform(post("/api/v1/webhooks/n8n")
            .header("X-N8N-Secret", "wrong").contentType("application/json")
            .content("{\"jobId\":\"x\"}"))
        .andExpect(status().isForbidden());
  }

  @Test @Order(3)
  void onboarding_enToSpanish() throws Exception {
    String res = body("/api/v1/onboarding",
        "{\"nurseLanguage\":\"en\",\"patientLanguages\":[\"es\",\"hi\"],\"speechRate\":\"slow\",\"retention\":\"7days\"}");
    org.junit.jupiter.api.Assertions.assertTrue(res.contains("\"onboardingComplete\":true"));
  }

  @Test @Order(4)
  void phrasebookLookup_libraryTranslationPresent() throws Exception {
    // "Where is your pain?" must come back with the reviewed es-MX translation.
    String res = apiGet("/api/v1/phrases?category=pain&lang=es");
    org.junit.jupiter.api.Assertions.assertTrue(res.contains("¿Dónde le duele?"));
    org.junit.jupiter.api.Assertions.assertTrue(res.contains("PAIN_SCALE"));
  }

  @Test @Order(5)
  void conversation_es_nursePhraseTurn_thenPatientSttTurn() throws Exception {
    String conv = body("/api/v1/conversations", "{\"patientLanguage\":\"es\"}");
    String convId = conv.replaceAll(".*\"id\":\"([^\"]+)\".*", "$1");

    // Nurse turn via phrasebook — the reviewed translation must be used as-is.
    String turn1 = body("/api/v1/conversations/" + convId + "/turns",
        "{\"speaker\":\"NURSE\",\"phraseId\":\"ph-pain-01\"}");
    org.junit.jupiter.api.Assertions.assertTrue(turn1.contains("¿Dónde le duele?"));
    org.junit.jupiter.api.Assertions.assertTrue(turn1.contains("\"libraryPhraseId\":\"ph-pain-01\""));

    // STT workflow for the patient turn (async → poll).
    String presign = body("/api/v1/uploads/presign", "{\"extension\":\"webm\"}");
    org.junit.jupiter.api.Assertions.assertTrue(presign.contains("inline"));
    String stt = body("/api/v1/speech/submissions",
        "{\"storageRef\":\"inline/test-es\",\"languageHint\":\"es\"}");
    String sttId = stt.replaceAll(".*\"id\":\"([^\"]+)\".*", "$1");
    String transcript = pollStt(sttId);
    org.junit.jupiter.api.Assertions.assertTrue(transcript.contains("Me duele aquí"));

    // Patient turn from the transcript → nurse-language translation via MT glossary.
    String turn2 = body("/api/v1/conversations/" + convId + "/turns",
        "{\"speaker\":\"PATIENT\",\"text\":\"" + transcript.replace("\"", "\\\\\"") + "\"}");
    org.junit.jupiter.api.Assertions.assertTrue(turn2.contains("It hurts here since this morning."));

    // TTS for the nurse turn (async → poll).
    String tts = body("/api/v1/tts",
        "{\"text\":\"¿Dónde le duele?\",\"language\":\"es\",\"rate\":\"slow\"}");
    String ttsId = tts.replaceAll(".*\"id\":\"([^\"]+)\".*", "$1");
    awaitStatus("/api/v1/tts/" + ttsId + "/status", "completed", 10);
    String ttsStatus = apiGet("/api/v1/tts/" + ttsId + "/status");
    org.junit.jupiter.api.Assertions.assertTrue(ttsStatus.contains("audioRef"));

    // History + detail show both turns in order.
    String detail = apiGet("/api/v1/conversations/" + convId);
    org.junit.jupiter.api.Assertions.assertTrue(detail.contains("¿Dónde le duele?"));
    org.junit.jupiter.api.Assertions.assertTrue(detail.contains("It hurts here"));
    org.junit.jupiter.api.Assertions.assertTrue(detail.contains("\"turnCount\":2"));
  }

  @Test @Order(6)
  void conversation_hi_romanizationPresent() throws Exception {
    String conv = body("/api/v1/conversations", "{\"patientLanguage\":\"hi\"}");
    String convId = conv.replaceAll(".*\"id\":\"([^\"]+)\".*", "$1");

    String turn = body("/api/v1/conversations/" + convId + "/turns",
        "{\"speaker\":\"NURSE\",\"text\":\"Where is your pain?\"}");
    // Free text fuzzy-matches the library → reviewed Devanagari + romanization.
    org.junit.jupiter.api.Assertions.assertTrue(turn.contains("दर्द कहाँ है?"));
    org.junit.jupiter.api.Assertions.assertTrue(turn.contains("Dard kahan hai?"));
    org.junit.jupiter.api.Assertions.assertTrue(turn.contains("\"matchedLibrary\":true")
        || turn.contains("ph-pain-01"));
  }

  @Test @Order(7)
  void libraryBeatMt_forAnchorPhrase() throws Exception {
    String res = body("/api/v1/translations",
        "{\"text\":\"Take one tablet after meals.\",\"from\":\"en\",\"to\":\"hi\"}");
    org.junit.jupiter.api.Assertions.assertTrue(res.contains("खाने के बाद एक गोली लें।"));
    org.junit.jupiter.api.Assertions.assertTrue(res.contains("\"matchedLibrary\":true"));
    org.junit.jupiter.api.Assertions.assertTrue(res.contains("\"professionallyReviewed\":true"));
  }

  @Test @Order(8)
  void favoritesAndRecents() throws Exception {
    body("/api/v1/favorites", "{\"phraseId\":\"ph-care-03\",\"languageCode\":\"es\"}");
    String favs = apiGet("/api/v1/favorites");
    org.junit.jupiter.api.Assertions.assertTrue(favs.contains("ph-care-03"));
    String recents = apiGet("/api/v1/recents");
    org.junit.jupiter.api.Assertions.assertTrue(recents.contains("ph-pain-01"));
  }

  @Test @Order(9)
  void usageStatsAggregate() throws Exception {
    String usage = apiGet("/api/v1/usage");
    org.junit.jupiter.api.Assertions.assertTrue(usage.contains("\"sessions\":"));
    org.junit.jupiter.api.Assertions.assertTrue(usage.contains("\"turns\":3"));
    org.junit.jupiter.api.Assertions.assertTrue(usage.contains("en-es"));
  }

  @Test @Order(10)
  void deleteConversation() throws Exception {
    String conv = body("/api/v1/conversations", "{\"patientLanguage\":\"es\"}");
    String convId = conv.replaceAll(".*\"id\":\"([^\"]+)\".*", "$1");
    mvc.perform(delete("/api/v1/conversations/" + convId).header("Authorization", NURSE))
        .andExpect(status().is2xxSuccessful());
    mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/v1/conversations/" + convId)
            .header("Authorization", NURSE))
        .andExpect(status().isNotFound());
  }

  @Test @Order(11)
  void retentionSetting_setsExpiry() throws Exception {
    // A second user with 24h retention gets expiring conversations.
    body("/api/v1/onboarding",
        "{\"nurseLanguage\":\"en\",\"patientLanguages\":[\"bn\"],\"speechRate\":\"slow\",\"retention\":\"24h\"}");
    String conv = body("/api/v1/conversations", "{\"patientLanguage\":\"bn\"}");
    org.junit.jupiter.api.Assertions.assertTrue(conv.contains("\"expiresAt\""));
    // Repository-level expiry behaviour is covered in RetentionJobTest.
  }

  @Test @Order(12)
  void settingsUpdate_changesRetention() throws Exception {
    String res = mvc.perform(put("/api/v1/settings").header("Authorization", NURSE2)
            .contentType("application/json")
            .content("{\"retention\":\"off\",\"speechRate\":\"normal\"}"))
        .andExpect(status().is2xxSuccessful())
        .andReturn().getResponse().getContentAsString();
    org.junit.jupiter.api.Assertions.assertTrue(res.contains("\"retention\":\"off\""));
  }

  // ---------- helpers ----------

  private String pollStt(String jobId) throws Exception {
    awaitStatus("/api/v1/speech/" + jobId + "/status", "completed", 10);
    String status = apiGet("/api/v1/speech/" + jobId + "/status");
    var node = new com.fasterxml.jackson.databind.ObjectMapper().readTree(status);
    return node.at("/result/transcript").asText();
  }

  private void awaitStatus(String path, String expected, int seconds) throws Exception {
    long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(seconds);
    String last = "";
    while (System.nanoTime() < deadline) {
      last = apiGet(path);
      if (last.contains("\"status\":\"" + expected + "\"")) return;
      Thread.sleep(250);
    }
    throw new AssertionError("Job did not reach " + expected + " in " + seconds + "s: " + last);
  }
}
