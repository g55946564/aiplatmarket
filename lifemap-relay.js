/* ══════════════════════════════════════════════════════════════════════
   AI LifeMap 중계 라우터 — 브라우저 → AI플랫마켓 메인 서버 → 챗도우미(AI Core)
   ──────────────────────────────────────────────────────────────────────
   · 챗도우미 API 키(CHATDOUMI_API_KEY)는 이 서버의 환경변수에만 둡니다. 브라우저에는 절대 내려가지 않습니다.
   · AI 호출 여부(모드)는 서버 환경변수 LIFEMAP_MODE 가 결정합니다 (화면의 값은 믿지 않음).
       PREVIEW    → 챗도우미/AI 호출 0회 (이 서버에서 차단, 기본값)
       BETA       → 초대 코드(LIFEMAP_BETA_CODE)를 헤더 x-lifemap-beta 로 보낸 요청만 호출
       PRODUCTION → 호출 허용 (아래 제한 적용)
   · 입력 검증·정리(허용 학문 목록, 길이 제한), IP 별 호출 제한, 하루 총 호출 한도로 비용·남용을 막습니다.

   ── 설치 (메인 index.js, catch-all 라우트보다 위) ──
       require('./lifemap-relay')(app);          // POST /api/lifemap/analyze , GET /api/lifemap/status
   ── Render 환경변수 ──
       LIFEMAP_MODE            PREVIEW | BETA | PRODUCTION   (미설정 = PREVIEW)
       CHATDOUMI_API_URL       챗도우미 서버 주소 (기존 ai-core/index.js 와 같은 변수)
       CHATDOUMI_API_KEY       서버 간 인증 키          (기존 ai-core/index.js 와 같은 변수)
       LIFEMAP_UPSTREAM_PATH   (선택) 챗도우미 호출 경로, 기본 /api/life-analysis
       LIFEMAP_BETA_CODE       (BETA 용) 초대 코드
       LIFEMAP_DAILY_CAP       (선택) 하루 AI 호출 상한, 기본 300
       LIFEMAP_RATE_ANALYSIS   (선택) IP당 10분 내 분석 횟수, 기본 5
       LIFEMAP_RATE_QUESTION   (선택) IP당 10분 내 질문 횟수, 기본 20
       LIFEMAP_ALLOWED_ORIGINS (선택) 허용 도메인 추가(쉼표 구분) — aiplatmarket.com 과 하위 도메인은 기본 허용
   ※ Node 18 이상 (전역 fetch 사용 — 기존 ai-core/index.js 와 동일)
══════════════════════════════════════════════════════════════════════ */
'use strict';
const express = require('express');
const crypto = require('crypto');

const DISC = new Set([
  'mbti', 'big5', 'tci', 'disc', 'enneagram', 'via', 'mi', 'holland', 'mmpi', 'sct',
  'character', 'potential', 'creativity', 'interest', 'aptitude', 'values',
  'leadership', 'learning', 'jobOntology', 'startup', 'lifecycle',
  'saju', 'ohang', 'sasang', 'fengshui', 'name_study',
  'astrology', 'tarot', 'numerology', 'zodiac', 'physiognomy',
  'environment', 'genetics', 'biorhythm',
]);
const COURSES = new Set(['ai_recommended', 'psychology', 'selfexplore', 'career', 'startup', 'eastern', 'western', 'comprehensive']);
const MODES = ['PREVIEW', 'BETA', 'PRODUCTION'];

const getMode = () => { const m = String(process.env.LIFEMAP_MODE || 'PREVIEW').toUpperCase(); return MODES.includes(m) ? m : 'PREVIEW'; };
const num = (v, d) => { const n = parseInt(v, 10); return Number.isFinite(n) && n > 0 ? n : d; };
const clip = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n);

/* ── 입력 정리 ── */
function cleanUserInput(u) {
  u = u && typeof u === 'object' ? u : {};
  const bdate = clip(u.bdate, 10), btime = clip(u.btime, 5);
  const out = {
    name: clip(u.name, 20),
    bdate: /^\d{4}-\d{2}-\d{2}$/.test(bdate) ? bdate : '',
    btime: /^\d{2}:\d{2}$/.test(btime) ? btime : '',
    gender: u.gender === 'male' || u.gender === 'female' ? u.gender : '',
    birthplace: clip(u.birthplace, 20), location: clip(u.location, 20), status: clip(u.status, 20), blood: clip(u.blood, 6),
    mbti: /^[EI][NS][TF][JP]$/.test(String(u.mbti || '')) ? u.mbti : '',
    interests: Array.isArray(u.interests) ? u.interests.slice(0, 14).map(x => clip(x, 20)).filter(Boolean) : [],
    concern: clip(u.concern, 500),
    miniTests: {},
  };
  const mt = u.miniTests && typeof u.miniTests === 'object' ? u.miniTests : {};
  Object.keys(mt).forEach(id => {
    if (!DISC.has(id) || !mt[id] || typeof mt[id] !== 'object') return;
    if (Array.isArray(mt[id].answers)) {                                   // SCT 문장완성: 문장 12개 이하, 60자 이하
      const answers = mt[id].answers.slice(0, 12).map(a => clip(a, 60));
      out.miniTests[id] = { answers, filled: answers.filter(Boolean).length };
    } else if (Array.isArray(mt[id].scores)) {                            // 5점 척도 문항
      const scores = mt[id].scores.slice(0, 12).map(n => Math.min(5, Math.max(1, Math.round(Number(n) || 3))));
      out.miniTests[id] = { scores, avg: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0 };
    }
  });
  return out;
}
function cleanManseok(m) {
  if (!m || typeof m !== 'object') return null;
  const pillar = p => (p && typeof p === 'object') ? { stem: clip(p.stem, 2), branch: clip(p.branch, 2), element: clip(p.element, 2) } : null;
  const el = {}; ['木', '火', '土', '金', '水'].forEach(k => { el[k] = Math.min(8, Math.max(0, Number(m.elements && m.elements[k]) || 0)); });
  return { year: pillar(m.year), month: pillar(m.month), day: pillar(m.day), hour: pillar(m.hour),
    mainElement: clip(m.mainElement, 2), sixtyCycle: clip(m.sixtyCycle, 4), dayMaster: clip(m.dayMaster, 2), elements: el };
}
function validate(body) {
  const ld = body && typeof body.lifeData === 'object' && body.lifeData ? body.lifeData : null;
  if (!ld) return { error: 'lifeData 가 필요합니다' };
  const task = ld.task === 'freeQuestion' ? 'freeQuestion' : 'analysis';
  const userId = clip(body.userId, 40).replace(/[^\w-]/g, '');
  const userInput = cleanUserInput(ld.userInput), manseok = cleanManseok(ld.manseok);
  if (task === 'freeQuestion') {
    const question = clip(ld.question, 300);
    if (question.length < 2) return { error: '질문이 너무 짧습니다' };
    return { task, userId, lifeData: { module: 'lifeai', task, question, userInput, manseok } };
  }
  const course = COURSES.has(ld.course) ? ld.course : 'comprehensive';
  const disciplines = Array.isArray(ld.disciplines) ? [...new Set(ld.disciplines.filter(id => DISC.has(id)))].slice(0, 40) : [];
  if (!disciplines.length) return { error: '분석할 학문이 없습니다' };
  return { task, userId, lifeData: { module: 'lifeai', task, course, disciplines, userInput, manseok } };
}

/* ── 남용 방지 ── */
const hits = new Map();
function limited(key, max, windowMs) {
  const now = Date.now(), arr = (hits.get(key) || []).filter(t => now - t < windowMs);
  if (arr.length >= max) { hits.set(key, arr); return true; }
  arr.push(now); hits.set(key, arr); return false;
}
setInterval(() => { const now = Date.now(); hits.forEach((arr, k) => { const a = arr.filter(t => now - t < 600000); a.length ? hits.set(k, a) : hits.delete(k); }); }, 600000).unref();
let dayKey = '', dayCount = 0;
function overDailyCap() {
  const k = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);   // 한국 날짜 기준
  if (k !== dayKey) { dayKey = k; dayCount = 0; }
  if (dayCount >= num(process.env.LIFEMAP_DAILY_CAP, 300)) return true;
  dayCount++; return false;
}
function clientIp(req) {
  if (req.app.get('trust proxy')) return req.ip;
  const xff = String(req.headers['x-forwarded-for'] || '').split(',').map(s => s.trim()).filter(Boolean);
  return xff.length ? xff[xff.length - 1] : (req.ip || req.socket.remoteAddress || 'unknown');
}
function originOk(req) {
  const o = req.get('origin'); if (!o) return true;
  try {
    const h = new URL(o).hostname, extra = String(process.env.LIFEMAP_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    return h === 'aiplatmarket.com' || h.endsWith('.aiplatmarket.com') || h === 'localhost' || h === '127.0.0.1' || h === req.hostname || extra.includes(h);
  } catch (e) { return false; }
}
function betaOk(req) {
  const code = String(process.env.LIFEMAP_BETA_CODE || ''), got = String(req.get('x-lifemap-beta') || '');
  if (!code || code.length !== got.length) return false;
  return crypto.timingSafeEqual(Buffer.from(code), Buffer.from(got));
}

/* ── 라우터 ── */
const router = express.Router();
router.use(express.json({ limit: '64kb' }));
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

router.get('/status', (req, res) => res.json({ success: true, mode: getMode() }));

router.post('/analyze', async (req, res) => {
  const t0 = Date.now(), mode = getMode();
  // 1) 사전 체험(PREVIEW): 어떤 검증·외부 호출도 하지 않고 즉시 종료 → AI 호출 0회 보장
  if (mode === 'PREVIEW') return res.json({ success: false, mode, reason: 'PREVIEW_NO_AI' });
  if (!originOk(req)) return res.status(403).json({ success: false, reason: 'FORBIDDEN_ORIGIN' });
  if (mode === 'BETA' && !betaOk(req)) return res.json({ success: false, mode, reason: 'BETA_ONLY' });

  const v = validate(req.body);
  if (v.error) return res.status(400).json({ success: false, reason: 'BAD_REQUEST', detail: v.error });

  const ip = clientIp(req), isQ = v.task === 'freeQuestion';
  if (limited(ip + '|' + v.task, isQ ? num(process.env.LIFEMAP_RATE_QUESTION, 20) : num(process.env.LIFEMAP_RATE_ANALYSIS, 5), 600000)) {
    res.set('Retry-After', '600'); return res.status(429).json({ success: false, reason: 'RATE_LIMIT' });
  }
  const base = String(process.env.CHATDOUMI_API_URL || '').replace(/\/$/, '');
  if (!base) return res.status(503).json({ success: false, reason: 'UPSTREAM_NOT_CONFIGURED' });
  if (overDailyCap()) return res.status(429).json({ success: false, reason: 'DAILY_CAP' });

  // 2) 챗도우미(AI Core) 호출 — 키는 여기서만 붙임
  const key = String(process.env.CHATDOUMI_API_KEY || '');
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), isQ ? 20000 : 60000);
  try {
    const r = await fetch(base + (process.env.LIFEMAP_UPSTREAM_PATH || '/api/life-analysis'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(key ? { 'x-api-key': key, 'Authorization': 'Bearer ' + key } : {}) },
      body: JSON.stringify({ userId: v.userId, lifeData: { ...v.lifeData, mode, source: 'aiplatmarket-lifemap' } }),
      signal: ctl.signal,
    });
    const data = await r.json().catch(() => null);
    console.log('[lifemap-relay]', mode, v.task, 'upstream', r.status, (Date.now() - t0) + 'ms');
    if (!r.ok || !data || data.success === false) return res.status(502).json({ success: false, reason: 'UPSTREAM_ERROR' });
    return res.json({ success: true, mode, sessionId: data.sessionId || null, analysis: data.analysis != null ? data.analysis : (data.answer != null ? { answer: data.answer } : null) });
  } catch (e) {
    console.log('[lifemap-relay]', mode, v.task, 'upstream', e && e.name === 'AbortError' ? 'timeout' : 'error', (Date.now() - t0) + 'ms');
    return res.status(502).json({ success: false, reason: 'UPSTREAM_ERROR' });          // 내부 오류·키 정보는 응답에 넣지 않음
  } finally { clearTimeout(timer); }
});

// 본문 파싱 오류(깨진 JSON 등)도 상세 내용 없이 400 으로
router.use((err, req, res, next) => res.status(400).json({ success: false, reason: 'BAD_REQUEST' }));

module.exports = function mountLifemapRelay(app) { app.use('/api/lifemap', router); };
module.exports.router = router;
