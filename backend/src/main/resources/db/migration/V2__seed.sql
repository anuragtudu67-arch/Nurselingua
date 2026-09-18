-- NurseLingua V2 — languages and phrase categories.
-- 8 patient languages (the spec's start set): es, hi, bn, fr, ar, zh, ta, ur.
-- tts_locale uses native-voice locales per spec §4 (es-MX, hi-IN, bn-IN, ar-SA …).

INSERT INTO languages (code, name, native_name, tts_locale, stt_supported, script, has_romanization, ui_locale_support, rtl) VALUES
  ('en', 'English',  'English',  'en-US', TRUE,  'Latin',    FALSE, TRUE,  FALSE),
  ('es', 'Spanish',  'Español',  'es-MX', TRUE,  'Latin',    FALSE, FALSE, FALSE),
  ('hi', 'Hindi',    'हिन्दी',     'hi-IN', TRUE,  'Devanagari', TRUE,  FALSE, FALSE),
  ('bn', 'Bengali',  'বাংলা',      'bn-IN', TRUE,  'Bengali',  TRUE,  FALSE, FALSE),
  ('fr', 'French',   'Français', 'fr-FR', TRUE,  'Latin',    FALSE, FALSE, FALSE),
  ('ar', 'Arabic',   'العربية',   'ar-SA', TRUE,  'Arabic',   TRUE,  FALSE, TRUE),
  ('zh', 'Chinese',  '中文',      'zh-CN', TRUE,  'Han',      TRUE,  FALSE, FALSE),
  ('ta', 'Tamil',    'தமிழ்',      'ta-IN', TRUE,  'Tamil',    TRUE,  FALSE, FALSE),
  ('ur', 'Urdu',     'اردو',      'ur-PK', TRUE,  'Arabic',   TRUE,  FALSE, TRUE);

INSERT INTO phrase_categories (slug, name, description, position) VALUES
  ('symptoms',    'Symptoms',          'Describe what the patient feels and where.', 1),
  ('medication',  'Medication',        'Doses, timing, and instructions.', 2),
  ('pain',        'Pain',              'Locate and rate pain, including the 0–10 scale.', 3),
  ('allergies',   'Allergies',         'Ask about drug, food, and other allergies.', 4),
  ('patient_care','Basic Patient Care','Everyday comfort, routines, and positions.', 5);
