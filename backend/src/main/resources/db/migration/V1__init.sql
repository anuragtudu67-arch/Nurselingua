-- NurseLingua V1 — authoritative schema (Flyway owns it; Hibernate never alters).
-- Kept portable across MySQL and H2 (MODE=MySQL) so dev/tests boot with zero infra.
-- ids are VARCHAR(36) UUID strings (seeded phrase ids use stable readable slugs).
-- utf8mb4 defaults in production (Hindi, Bengali, Arabic, Tamil, Urdu scripts).

CREATE TABLE users (
  id            VARCHAR(36) PRIMARY KEY,
  clerk_user_id VARCHAR(191) NOT NULL UNIQUE,
  email         VARCHAR(255) NOT NULL UNIQUE,
  name          VARCHAR(120) NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE languages (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  code          VARCHAR(12) NOT NULL UNIQUE,
  name          VARCHAR(80) NOT NULL,
  native_name   VARCHAR(80) NOT NULL,
  tts_locale    VARCHAR(12) NOT NULL,          -- e.g. es-MX, hi-IN, bn-IN, ar-SA
  stt_supported BOOLEAN NOT NULL DEFAULT TRUE,
  script        VARCHAR(24) NOT NULL DEFAULT 'Latin',
  has_romanization BOOLEAN NOT NULL DEFAULT FALSE,
  ui_locale_support BOOLEAN NOT NULL DEFAULT FALSE,
  rtl           BOOLEAN NOT NULL DEFAULT FALSE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE phrase_categories (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  slug        VARCHAR(32) NOT NULL UNIQUE,
  name        VARCHAR(80) NOT NULL,
  description VARCHAR(255) NULL,
  position    INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE phrases (
  id          VARCHAR(36) PRIMARY KEY,
  category_id INT NOT NULL,
  base_text   VARCHAR(255) NOT NULL,       -- English base text
  is_question BOOLEAN NOT NULL DEFAULT FALSE,
  card_type   VARCHAR(24) NOT NULL DEFAULT 'STANDARD',  -- STANDARD | PAIN_SCALE
  tags        VARCHAR(255) NULL,
  priority    INT NOT NULL DEFAULT 50,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_phrase_cat FOREIGN KEY (category_id) REFERENCES phrase_categories(id),
  CONSTRAINT uq_phrase_base UNIQUE (base_text)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE phrase_translations (
  id            VARCHAR(36) PRIMARY KEY,
  phrase_id     VARCHAR(36) NOT NULL,
  language_code VARCHAR(12) NOT NULL,
  text          VARCHAR(500) NOT NULL,
  romanization  VARCHAR(500) NULL,
  audio_ref     VARCHAR(255) NULL,
  professionally_reviewed BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT fk_tr_phrase FOREIGN KEY (phrase_id) REFERENCES phrases(id) ON DELETE CASCADE,
  CONSTRAINT uq_tr UNIQUE (phrase_id, language_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE conversations (
  id              VARCHAR(36) PRIMARY KEY,
  user_id         VARCHAR(36) NOT NULL,
  nurse_language  VARCHAR(12) NOT NULL,
  patient_language VARCHAR(12) NOT NULL,
  title           VARCHAR(120) NULL,
  started_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_activity_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at      TIMESTAMP NULL,
  deleted         BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT fk_conv_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE conversation_turns (
  id                 VARCHAR(36) PRIMARY KEY,
  conversation_id    VARCHAR(36) NOT NULL,
  speaker            VARCHAR(10) NOT NULL,               -- NURSE | PATIENT
  source_text        VARCHAR(1000) NOT NULL,
  source_lang        VARCHAR(12) NOT NULL,
  target_text        VARCHAR(1000) NOT NULL,
  target_lang        VARCHAR(12) NOT NULL,
  target_romanization VARCHAR(500) NULL,
  library_phrase_id  VARCHAR(36) NULL,
  stt_confidence     DOUBLE NULL,
  audio_ref          VARCHAR(255) NULL,
  status             VARCHAR(16) NOT NULL DEFAULT 'READY',
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_turn_conv FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_turn_phrase FOREIGN KEY (library_phrase_id) REFERENCES phrases(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE favorites (
  id            VARCHAR(36) PRIMARY KEY,
  user_id       VARCHAR(36) NOT NULL,
  phrase_id     VARCHAR(36) NOT NULL,
  language_code VARCHAR(12) NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_fav_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_fav_phrase FOREIGN KEY (phrase_id) REFERENCES phrases(id) ON DELETE CASCADE,
  CONSTRAINT uq_fav UNIQUE (user_id, phrase_id, language_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE recents (
  id            VARCHAR(36) PRIMARY KEY,
  user_id       VARCHAR(36) NOT NULL,
  phrase_id     VARCHAR(36) NOT NULL,
  language_code VARCHAR(12) NOT NULL,
  used_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rec_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_rec_phrase FOREIGN KEY (phrase_id) REFERENCES phrases(id) ON DELETE CASCADE,
  CONSTRAINT uq_rec UNIQUE (user_id, phrase_id, language_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE usage_events (
  id            VARCHAR(36) PRIMARY KEY,
  user_id       VARCHAR(36) NOT NULL,
  event_type    VARCHAR(32) NOT NULL,   -- SESSION_START, TURN_CREATED, TTS_PLAY, STT_SUBMIT, TRANSLATION, ...
  language_pair VARCHAR(24) NULL,
  phrase_id     VARCHAR(36) NULL,
  outcome       VARCHAR(16) NULL,       -- SUCCESS | FAILURE
  latency_ms    INT NULL,
  detail        VARCHAR(255) NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_usage_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE workflow_executions (
  id            VARCHAR(80) PRIMARY KEY,          -- e.g. stt_… / tts_…
  user_id       VARCHAR(36) NOT NULL,
  kind          VARCHAR(16) NOT NULL,             -- STT | TTS
  status        VARCHAR(16) NOT NULL DEFAULT 'PROCESSING',  -- PROCESSING | COMPLETED | FAILED
  language_hint VARCHAR(12) NULL,
  storage_ref   VARCHAR(255) NULL,                -- R2 object key / inline ref (recording in, audio out)
  result_json   TEXT NULL,                        -- transcript/confidence or audioRef
  error         VARCHAR(500) NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at  TIMESTAMP NULL,
  CONSTRAINT fk_wf_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_settings (
  user_id                 VARCHAR(36) PRIMARY KEY,
  nurse_language          VARCHAR(12) NOT NULL DEFAULT 'en',
  patient_languages       VARCHAR(255) NOT NULL DEFAULT 'es,hi',  -- CSV
  speech_rate             VARCHAR(10) NOT NULL DEFAULT 'slow',    -- slow | normal
  retention               VARCHAR(10) NOT NULL DEFAULT '7days',   -- 24h | 7days | off
  onboarding_complete     BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_conv_user ON conversations (user_id, started_at);
CREATE INDEX idx_turn_conv ON conversation_turns (conversation_id, created_at);
CREATE INDEX idx_turn_phrase ON conversation_turns (library_phrase_id);
CREATE INDEX idx_usage_user ON usage_events (user_id, created_at);
CREATE INDEX idx_usage_type ON usage_events (event_type, created_at);
CREATE INDEX idx_wf_user ON workflow_executions (user_id, created_at);
