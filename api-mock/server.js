// Ningua API mock — implements the SAME /api/v1 contract as the Spring Boot
// backend (see backend/README.md) with an in-memory store, so the frontend
// runs end-to-end without Java/MySQL. Local demo only. Port 8080.
const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

const store = {
  profile: null, onboardingComplete: false, stage: 2,
  jobs: {}, notifs: [
    { id: 'n1', title: 'Speaking feedback is ready', body: '“Introducing yourself” — gentle corrections on two sounds.', time: '12 min ago', unread: true, kind: 'evaluation' },
    { id: 'n2', title: 'A gentler next step is available', body: 'Based on recent listening misses, Blend support is suggested for lesson 3.', time: '2 h ago', unread: true, kind: 'transition' },
  ],
  vocab: [
    { id: 'v1', word: 'おはよう', pronunciation: 'ohayō', translation: 'Good morning', due: true },
    { id: 'v2', word: 'ありがとう', pronunciation: 'arigatō', translation: 'Thank you', due: true },
    { id: 'v3', word: 'すみません', pronunciation: 'sumimasen', translation: 'Excuse me / sorry', due: true },
  ],
};

// Demo auth: any Bearer token accepted (Spring verifies Clerk JWT for real).
app.use('/api/v1', (req, res, next) => {
  if (req.path.startsWith('/webhooks/')) return next();
  if (req.path === '/languages' || req.path === '/languages/pairs') return next();
  if (!req.headers.authorization) return res.status(401).json({ error: 'Missing bearer token' });
  next();
});

const v1 = express.Router();
app.use('/api/v1', v1);

// users & onboarding
v1.get('/users/me', (req, res) => res.json({ profile: store.profile, onboardingComplete: store.onboardingComplete }));
v1.post('/onboarding', (req, res) => { store.profile = { id: 'lp-1', ...req.body }; res.json(store.profile); });
v1.post('/onboarding/complete', (req, res) => { store.onboardingComplete = true; res.json({ ok: true, profile: store.profile }); });

// languages
const LANGS = [{ code: 'en', name: 'English', native: 'English' }, { code: 'es', name: 'Spanish', native: 'Español' }, { code: 'fr', name: 'French', native: 'Français' }, { code: 'de', name: 'German', native: 'Deutsch' }, { code: 'it', name: 'Italian', native: 'Italiano' }, { code: 'pt', name: 'Portuguese', native: 'Português' }, { code: 'nl', name: 'Dutch', native: 'Nederlands' }, { code: 'pl', name: 'Polish', native: 'Polski' }, { code: 'ru', name: 'Russian', native: 'Русский' }, { code: 'tr', name: 'Turkish', native: 'Türkçe' }, { code: 'ar', name: 'Arabic', native: 'العربية' }, { code: 'fa', name: 'Persian', native: 'فارسی' }, { code: 'ur', name: 'Urdu', native: 'اردو' }, { code: 'hi', name: 'Hindi', native: 'हिन्दी' }, { code: 'bn', name: 'Bengali', native: 'বাংলা' }, { code: 'ta', name: 'Tamil', native: 'தமிழ்' }, { code: 'te', name: 'Telugu', native: 'తెలుగు' }, { code: 'mr', name: 'Marathi', native: 'मराठी' }, { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' }, { code: 'ja', name: 'Japanese', native: '日本語' }, { code: 'ko', name: 'Korean', native: '한국어' }, { code: 'zh', name: 'Chinese', native: '中文' }, { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt' }, { code: 'th', name: 'Thai', native: 'ไทย' }, { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia' }, { code: 'sw', name: 'Swahili', native: 'Kiswahili' }];
v1.get('/languages', (req, res) => res.json(LANGS));
v1.get('/languages/pairs', (req, res) => res.json([
  { from: 'en', to: 'ja', status: 'supported' }, { from: 'en', to: 'es', status: 'supported' },
  { from: 'en', to: 'ko', status: 'planned' }, { from: 'bn', to: 'en', status: 'waitlist' },
]));

// courses / lessons / exercises
v1.get('/courses', (req, res) => res.json([{ id: 'c-ja-found', pair: 'en-ja', title: 'Foundations', modules: 6, lessons: 48 }]));
v1.get('/courses/:id/path', (req, res) => res.json({ courseId: req.params.id, modules: [{ id: 'm1', title: 'Foundations', lessons: ['l1', 'l2', 'l3', 'l4'] }] }));
v1.get('/lessons/:id', (req, res) => res.json({ id: req.params.id, title: 'Introducing yourself', minutes: 10, skill: 'Speaking', exerciseIds: ['e1', 'e2', 'e3', 'e4', 'e5', 'e6'] }));
v1.post('/lessons/:id/complete', (req, res) => res.json({ ok: true, lessonId: req.params.id, goalDeltaMin: 4 }));
v1.get('/exercises', (req, res) => res.json({ lessonId: req.query.lessonId || 'l2', ids: ['e1', 'e2', 'e3', 'e4', 'e5', 'e6'] }));
v1.post('/exercises/:id/attempts', (req, res) => {
  const { answer, expected } = req.body || {};
  const ok = answer != null && expected != null ? String(answer).trim() === String(expected).trim() : true;
  res.json({ ok, score: ok ? 1 : 0, feedback: ok ? 'Correct.' : 'Compare with the expected answer and continue.' });
});

// progress / vocabulary / transition / recommendations
v1.get('/progress/overview', (req, res) => res.json({ weekActiveDays: 6, retention4w: 0.72, level: 'Basic phrases', strong: 'Vocabulary', next: 'Writing' }));
v1.get('/progress/skills', (req, res) => res.json([{ skill: 'Vocabulary', accuracy: 82 }, { skill: 'Listening', accuracy: 64 }, { skill: 'Speaking', accuracy: 71 }, { skill: 'Writing', accuracy: 58 }, { skill: 'Reading', accuracy: 76 }]));
v1.get('/vocabulary/due', (req, res) => res.json(store.vocab.filter((v) => v.due)));
v1.post('/vocabulary/review', (req, res) => {
  const { id, knew } = req.body || {};
  const item = store.vocab.find((v) => v.id === id);
  if (item && knew) item.due = false;
  res.json({ ok: true, remaining: store.vocab.filter((v) => v.due).length });
});
v1.get('/transition', (req, res) => res.json({ stage: store.stage, adjustable: true }));
v1.put('/transition', (req, res) => { store.stage = req.body.stage || store.stage; res.json({ stage: store.stage }); });
v1.get('/recommendations/next', (req, res) => res.json({ lessonId: 'l2', title: 'Introducing yourself', rationale: 'You paused mid-lesson; short introductions match your goal.' }));
v1.get('/assessments', (req, res) => res.json([]));

// async speech / writing (non-blocking job pattern, mirrors n8n flow)
function startJob(prefix) {
  const id = `${prefix}_${Date.now()}`;
  store.jobs[id] = { id, status: 'processing', createdAt: new Date().toISOString() };
  setTimeout(() => {
    store.jobs[id] = {
      id, status: 'completed', completedAt: new Date().toISOString(),
      feedback: { encouragement: 'Clear and brave — well done.', corrections: ['Lengthen the “o” in おはよう.'], score: 0.78 },
    };
    store.notifs.unshift({ id: `n${Date.now()}`, title: 'Evaluation complete', body: 'Your feedback is ready.', time: 'Just now', unread: true, kind: 'evaluation' });
  }, 6000);
  return store.jobs[id];
}
v1.post('/speech/submissions', (req, res) => res.status(202).json(startJob('sp')));
v1.get('/speech/:id/status', (req, res) => res.json(store.jobs[req.params.id] || { status: 'unknown' }));
v1.post('/writing/submissions', (req, res) => res.status(202).json(startJob('wr')));
v1.get('/writing/:id/status', (req, res) => res.json(store.jobs[req.params.id] || { status: 'unknown' }));

// notifications + uploads
v1.get('/notifications', (req, res) => res.json(store.notifs));
v1.post('/uploads/presign', (req, res) => res.json({ url: 'https://media.ningua.com/mock-upload', ref: `mock/${Date.now()}.webm`, expiresIn: 300 }));

// n8n callback (verifies shared secret, like Spring does)
v1.post('/webhooks/n8n', (req, res) => {
  if (req.headers['x-n8n-secret'] !== (process.env.N8N_WEBHOOK_SECRET || 'change-me-long-random'))
    return res.status(403).json({ error: 'Bad webhook secret' });
  const { jobId, status, feedback } = req.body || {};
  if (jobId && store.jobs[jobId]) store.jobs[jobId] = { ...store.jobs[jobId], status: status || 'completed', feedback };
  res.json({ ok: true });
});

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'ningua-api-mock' }));
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => console.log(`ningua api-mock on :${PORT}`));
