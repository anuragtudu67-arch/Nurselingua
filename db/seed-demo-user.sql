-- One clean demo user WITH one conversation and 5 alternating turns.
-- Idempotent: re-running it resets that single demo account and nothing else.
--
-- The identity string matches the backend's dev auth shim, so
--   Authorization: Bearer dev.demo@nurselingua.app
-- resolves to this row instead of provisioning a second user.
--
-- Run against the compose database (host port 3307):
--   docker exec -i ningua-mysql mysql -unurselingua -pchangeme \
--     --default-character-set=utf8mb4 nurselingua < db/seed-demo-user.sql
--
-- API-only alternative (creates the same account through the normal provisioning path,
-- but keeps whatever history it already has):
--   curl -H "Authorization: Bearer dev.demo@nurselingua.app" http://localhost:8080/api/v1/users/me

-- Tables are utf8mb4_unicode_ci while the schema default is utf8mb4_0900_ai_ci,
-- so the literal must carry the column collation or MySQL raises "illegal mix of collations".
SET @email = 'demo@nurselingua.app' COLLATE utf8mb4_unicode_ci;
SET @uid := (SELECT id FROM users WHERE email = @email);

-- Wipe this demo account's history. conversation_turns go with their conversations (FK cascade).
DELETE FROM usage_events        WHERE user_id = @uid;
DELETE FROM recents             WHERE user_id = @uid;
DELETE FROM favorites           WHERE user_id = @uid;
DELETE FROM workflow_executions WHERE user_id = @uid;
DELETE FROM conversations       WHERE user_id = @uid;
DELETE FROM user_settings       WHERE user_id = @uid;

INSERT INTO users (id, clerk_user_id, email, name)
VALUES ('demo-nurse-0001', CONCAT('dev|', @email), @email, 'Demo Nurse') AS new
ON DUPLICATE KEY UPDATE clerk_user_id = new.clerk_user_id, name = new.name;

-- Re-read: on a fresh database @uid was NULL above.
SET @uid := (SELECT id FROM users WHERE email = @email);

INSERT INTO user_settings
  (user_id, nurse_language, patient_languages, speech_rate, retention, onboarding_complete)
VALUES (@uid, 'en', 'es,hi', 'slow', '24h', TRUE) AS new
ON DUPLICATE KEY UPDATE
  nurse_language = new.nurse_language,
  patient_languages = new.patient_languages,
  speech_rate = new.speech_rate,
  retention = new.retention,
  onboarding_complete = new.onboarding_complete;

-- ---------- one demo conversation (en -> es, 24h retention, not deleted) ----------

-- Same collation trap as @email: a bare literal arrives as utf8mb4_0900_ai_ci and
-- cannot be compared with these utf8mb4_unicode_ci columns.
SET @cid = 'demo-conv-0001' COLLATE utf8mb4_unicode_ci;
SET @started = NOW() - INTERVAL 12 MINUTE;

INSERT INTO conversations
  (id, user_id, nurse_language, patient_language, title,
   started_at, last_activity_at, expires_at, deleted)
VALUES
  (@cid, @uid, 'en', 'es', 'Consulta de demo: fiebre y dolor',
   @started, NOW(), DATE_ADD(NOW(), INTERVAL 24 HOUR), FALSE) AS new
ON DUPLICATE KEY UPDATE
  user_id = new.user_id,
  nurse_language = new.nurse_language,
  patient_language = new.patient_language,
  title = new.title,
  started_at = new.started_at,
  last_activity_at = new.last_activity_at,
  expires_at = new.expires_at,
  deleted = new.deleted;

-- ---------- 5 turns, alternating NURSE (en->es) and PATIENT (es->en) ----------
-- created_at steps one minute apart so transcript order is stable.

INSERT INTO conversation_turns
  (id, conversation_id, speaker, source_text, source_lang,
   target_text, target_lang, library_phrase_id, status, created_at)
VALUES
  ('demo-turn-01', @cid, 'NURSE',   'Do you have a fever?',
   'en', '¿Tiene fiebre?', 'es', NULL, 'READY', @started + INTERVAL 1 MINUTE),
  ('demo-turn-02', @cid, 'PATIENT', 'Me duele aquí desde esta mañana.',
   'es', 'It has hurt here since this morning.', 'en', NULL, 'READY', @started + INTERVAL 2 MINUTE),
  ('demo-turn-03', @cid, 'NURSE',   'How long have you had this pain?',
   'en', '¿Desde cuándo tiene este dolor?', 'es', NULL, 'READY', @started + INTERVAL 3 MINUTE),
  ('demo-turn-04', @cid, 'PATIENT', 'Tomo ibuprofeno cada ocho horas.',
   'es', 'I take ibuprofen every eight hours.', 'en', NULL, 'READY', @started + INTERVAL 4 MINUTE),
  ('demo-turn-05', @cid, 'NURSE',   'Are you allergic to penicillin?',
   'en', '¿Es alérgico a la penicilina?', 'es', NULL, 'READY', @started + INTERVAL 5 MINUTE)
AS new
ON DUPLICATE KEY UPDATE
  conversation_id = new.conversation_id,
  speaker = new.speaker,
  source_text = new.source_text,
  source_lang = new.source_lang,
  target_text = new.target_text,
  target_lang = new.target_lang,
  status = new.status,
  created_at = new.created_at;

-- ---------- verification ----------

SELECT u.id, u.email, u.name, s.patient_languages, s.retention,
       (SELECT COUNT(*) FROM conversations c WHERE c.user_id = u.id AND c.deleted = 0) AS live_conversations,
       (SELECT COUNT(*) FROM conversation_turns t
          JOIN conversations c ON c.id = t.conversation_id
        WHERE c.user_id = u.id) AS turns
FROM users u LEFT JOIN user_settings s ON s.user_id = u.id
WHERE u.email = @email;

SELECT id, nurse_language, patient_language, title, deleted,
       TIMESTAMPDIFF(HOUR, NOW(), expires_at) AS expires_in_hours
FROM conversations WHERE id = @cid;

SELECT speaker, source_lang, target_lang, source_text, target_text
FROM conversation_turns WHERE conversation_id = @cid ORDER BY created_at;
