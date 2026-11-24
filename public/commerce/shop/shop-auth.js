/**
 * 더착한쇼핑 자체 로그인 라우터 — 카카오 · 네이버 · 구글 · 휴대폰(SMS) · 아이디(이메일)+비밀번호
 *
 * [설치] 메인 index.js 에서 catch-all(app.get('*')) 라우트 '위'에 1줄만 추가 (이 파일은 routes/shop-auth.js 로 저장)
 *        app.use('/api/shop/auth', require('./routes/shop-auth'));
 *
 * [공통 프레임워크로 교체할 때] 화면(index.html)은 아래 '계약'만 사용합니다.
 *        메인 통합 서버가 같은 계약을 제공하면 ShopAuth.API(또는 window.SHOP_AUTH_API) 값만 바꾸면 됩니다.
 *          GET  /config  → { kakao, naver, google, phone, email, admin }   (방식별 사용 가능 여부)
 *          GET  /me      → { ok, user | null }          POST /logout
 *          GET  /{kakao|naver|google}/start · /callback  (팝업 지원)
 *          POST /phone/send · /phone/verify             POST /email/signup · /email/login
 *
 * [환경변수] 아래 이름 중 하나를 자동으로 읽습니다. 다르면 코드 상단 env('...') 안 이름만 고치세요.
 *   카카오 KAKAO_REST_API_KEY (+KAKAO_CLIENT_SECRET) · 네이버 NAVER_CLIENT_ID / NAVER_CLIENT_SECRET
 *   구글 GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET · 문자 SOLAPI_API_KEY/SECRET 또는 ALIGO_API_KEY/USER_ID + SMS_SENDER
 *   세션 SESSION_SECRET · 사용할 방식 제한(선택) SHOP_LOGIN_METHODS=kakao,naver,google,phone,email (비우면 설정된 방식 모두)
 *   확인: GET /api/shop/auth/config
 *
 * [Redirect URI 등록 — 각 개발자 콘솔에 1회] https://도메인/api/shop/auth/{kakao|naver|google}/callback
 *
 * [관리자] 별도 관리자 로그인은 없습니다. 아래 환경변수와 같은 계정으로 로그인하면 자동으로 관리자가 됩니다(쉼표로 여러 개 가능).
 *   ADMIN_PHONE=010xxxxxxxx (휴대폰 로그인) · ADMIN_KAKAO_ID=카카오 회원번호 또는 카카오 이메일 · ADMIN_NAVER_ID=네이버 고유 id
 *   ADMIN_EMAIL=메일주소 (이메일이 인증된 카카오/구글 로그인). 아이디·비밀번호 가입 계정은 관리자가 될 수 없습니다.
 *
 * [회원 저장] firebase-admin 이 이미 초기화돼 있으면 Firestore 'shop_users' 컬렉션을 사용합니다.
 *   (없으면 아이디/비밀번호 방식은 자동으로 꺼집니다. 테스트용 SHOP_AUTH_MEMORY_STORE=1)
 */
const express = require('express');
const crypto = require('crypto');
const scrypt = require('util').promisify(crypto.scrypt);

const env = (...n) => { for (const k of n) if (process.env[k]) return process.env[k]; return ''; };
const list = (...n) => n.flatMap(k => (process.env[k] || '').split(/[,;\n]+/)).map(x => x.trim()).filter(Boolean);
const normPhone = p => { let d = String(p).replace(/\D/g, ''); if (d.startsWith('82') && d.length >= 11) d = '0' + d.slice(2); return d; };

const E = {
  secret: env('SESSION_SECRET', 'JWT_SECRET', 'COOKIE_SECRET') || crypto.randomBytes(32).toString('hex'),
  baseUrl: env('PUBLIC_BASE_URL', 'SITE_URL', 'BASE_URL'),
  methods: list('SHOP_LOGIN_METHODS').map(x => x.toLowerCase()),
  memStore: process.env.SHOP_AUTH_MEMORY_STORE === '1',   // 테스트용 (재시작 시 사라짐)
  devOtp: process.env.SHOP_AUTH_DEV_OTP === '1',          // 테스트용: 문자 대신 화면에 인증번호 표시 (운영에서는 끄세요)
  smsFrom: env('SMS_SENDER', 'SOLAPI_SENDER', 'SMS_FROM', 'COOLSMS_SENDER'),
  solapiKey: env('SOLAPI_API_KEY', 'COOLSMS_API_KEY'), solapiSecret: env('SOLAPI_API_SECRET', 'COOLSMS_API_SECRET'),
  aligoKey: env('ALIGO_API_KEY', 'ALIGO_KEY'), aligoUser: env('ALIGO_USER_ID', 'ALIGO_USER'),
  adminPhones: list('ADMIN_PHONE', 'ADMIN_PHONES', 'ADMIN_PHONE_NUMBER', 'ADMIN_MOBILE', 'ADMIN_TEL', 'ADMIN_HP').map(normPhone),
  adminKakao: list('ADMIN_KAKAO_ID', 'ADMIN_KAKAO_IDS', 'ADMIN_KAKAO', 'ADMIN_KAKAO_ACCOUNT', 'KAKAO_ADMIN_ID'),
  adminNaver: list('ADMIN_NAVER_ID', 'ADMIN_NAVER'),
  adminEmails: list('ADMIN_EMAIL', 'ADMIN_EMAILS', 'ADMIN_MAIL')
};
E.adminEmails = [...E.adminEmails, ...E.adminKakao.filter(x => x.includes('@'))].map(x => x.toLowerCase());
E.adminKakao = E.adminKakao.filter(x => !x.includes('@'));            // 카카오 항목에 이메일을 적어도 인식
if (!process.env.SESSION_SECRET && !process.env.JWT_SECRET && !process.env.COOKIE_SECRET)
  console.warn('[shop-auth] SESSION_SECRET 이 없어 임시 키를 사용합니다 (서버 재시작 시 로그인 해제)');

/* ── 소셜 로그인 공급자 (OAuth2 인가코드 방식 · 키/시크릿은 서버에만 존재) ── */
const PV = {
  kakao: {
    label: '카카오', id: env('KAKAO_REST_API_KEY', 'KAKAO_REST_KEY', 'KAKAO_CLIENT_ID'), secret: env('KAKAO_CLIENT_SECRET'),
    auth: 'https://kauth.kakao.com/oauth/authorize', token: 'https://kauth.kakao.com/oauth/token', me: 'https://kapi.kakao.com/v2/user/me',
    parse: me => { const a = me.kakao_account || {};
      return { id: String(me.id || ''),   // 메인 사이트 kakao_user.id 와 같은 값
        name: a.profile?.nickname || me.properties?.nickname || '카카오회원', email: a.email || '',
        verified: a.is_email_valid === true && a.is_email_verified === true }; }
  },
  naver: {
    label: '네이버', need: true, tokenGet: true,
    id: env('NAVER_CLIENT_ID', 'NAVER_CLIENT_KEY', 'NAVER_API_CLIENT_ID'), secret: env('NAVER_CLIENT_SECRET', 'NAVER_API_CLIENT_SECRET'),
    auth: 'https://nid.naver.com/oauth2.0/authorize', token: 'https://nid.naver.com/oauth2.0/token', me: 'https://openapi.naver.com/v1/nid/me',
    body: (c, code, ru, state) => ({ grant_type: 'authorization_code', client_id: c.id, client_secret: c.secret, code, state }),
    parse: me => { const r = me.response || {};
      return { id: r.id ? 'naver_' + r.id : '', name: r.nickname || r.name || '네이버회원', email: r.email || '', verified: false }; }
  },
  google: {
    label: '구글', need: true,
    id: env('GOOGLE_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_ID'), secret: env('GOOGLE_CLIENT_SECRET', 'GOOGLE_OAUTH_CLIENT_SECRET'),
    auth: 'https://accounts.google.com/o/oauth2/v2/auth', token: 'https://oauth2.googleapis.com/token',
    me: 'https://openidconnect.googleapis.com/v1/userinfo', extra: { scope: 'openid email profile', prompt: 'select_account' },
    parse: me => ({ id: me.sub ? 'google_' + me.sub : '', name: me.name || me.given_name || '구글회원',
      email: me.email || '', verified: me.email_verified === true })
  }
};
const tokenBody = (c, code, ru) => ({ grant_type: 'authorization_code', client_id: c.id, redirect_uri: ru, code, ...(c.secret ? { client_secret: c.secret } : {}) });

/* ── 유틸 ─────────────────────────────────────── */
const b64 = b => Buffer.from(b).toString('base64url');
const hmac = p => crypto.createHmac('sha256', E.secret).update(p).digest('base64url');
const sign = o => { const p = b64(JSON.stringify(o)); return p + '.' + hmac(p); };
const verify = t => {
  try {
    const [p, s] = String(t).split('.'); const ok = hmac(p);
    if (!s || s.length !== ok.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(ok))) return null;
    const o = JSON.parse(Buffer.from(p, 'base64url')); return o.exp > Date.now() ? o : null;
  } catch (e) { return null; }
};
const cookies = req => Object.fromEntries((req.headers.cookie || '').split(';')
  .map(c => c.trim().split(/=(.*)/s).slice(0, 2)).filter(a => a[0]));
const setCk = (req, res, name, val, maxAge) => {
  const https = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.append('Set-Cookie', `${name}=${val}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${https ? '; Secure' : ''}`);
};
const ipOf = req => (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || 'x';
const hits = new Map();
const recent = (key, win = 600000) => (hits.get(key) || []).filter(t => Date.now() - t < win);
const limited = (key, max, win = 600000) => { const h = recent(key, win); h.push(Date.now()); hits.set(key, h); return h.length > max; };
const origin = req => E.baseUrl ||
  `${req.headers['x-forwarded-proto'] || req.protocol}://${req.headers['x-forwarded-host'] || req.get('host')}`;
const redirectUri = (req, k) => env('SHOP_' + k.toUpperCase() + '_REDIRECT_URI') || origin(req) + '/api/shop/auth/' + k + '/callback';
const login = (req, res, user, ttlSec = 14 * 86400) => {
  setCk(req, res, 'shop_sid', sign({ ...user, exp: Date.now() + ttlSec * 1000 }), ttlSec);
};
const publicUser = s => s && ({ id: s.id, name: s.name, role: s.role, provider: s.provider, email: s.email, phone: s.phone });
const j = o => JSON.stringify(o).replace(/</g, '\\u003c');

/* ── 관리자 자동 인식 ── */
const roleFor = (provider, u) => {
  const mail = String(u.email || '').toLowerCase();
  const admin = provider === 'phone' ? !E.devOtp && E.adminPhones.includes(normPhone(u.phone))   // 테스트 모드에서는 관리자 불가
    : provider === 'kakao' ? E.adminKakao.includes(String(u.id)) || (u.verified === true && E.adminEmails.includes(mail))
    : provider === 'naver' ? E.adminNaver.includes(String(u.id).replace(/^naver_/, ''))
    : provider === 'google' ? u.verified === true && E.adminEmails.includes(mail)
    : false;
  return admin ? 'admin' : 'user';
};
const adminConfigured = () => E.adminPhones.length + E.adminKakao.length + E.adminNaver.length + E.adminEmails.length > 0;

/* ── 회원 저장소 (Firestore → 없으면 테스트용 메모리) ── */
const fb = () => { try { const fa = require('firebase-admin'); return fa.apps.length ? fa : null; } catch (e) { return null; } };
const mem = new Map();
const col = fa => fa.firestore().collection('shop_users');
const store = {
  async get(key) { const fa = fb();
    if (fa) { const d = await col(fa).doc(key).get(); return d.exists ? d.data() : null; }
    if (E.memStore) return mem.get(key) || null; throw new Error('STORE'); },
  async set(key, obj) { const fa = fb();
    if (fa) { await col(fa).doc(key).set(obj, { merge: true }); return; }
    if (E.memStore) { mem.set(key, { ...(mem.get(key) || {}), ...obj }); return; } throw new Error('STORE'); },
  async create(key, obj) { const fa = fb();
    if (fa) { try { await col(fa).doc(key).create(obj); return; }
      catch (e) { throw (e.code === 6 || /ALREADY_EXISTS/.test(e.message)) ? new Error('EXISTS') : e; } }
    if (E.memStore) { if (mem.has(key)) throw new Error('EXISTS'); mem.set(key, obj); return; } throw new Error('STORE'); }
};
const saveUser = u => store.set(`${u.provider}_${u.id}`, { ...u, lastLoginAt: new Date() })
  .catch(e => { if (e.message !== 'STORE') console.warn('[shop-auth] saveUser 건너뜀:', e.message); });

/* ── 사용 가능한 로그인 방식 ── */
const on = m => !E.methods.length || E.methods.includes(m);
const ready = k => on(k) && !!PV[k].id && (!PV[k].need || !!PV[k].secret);
const smsReady = () => E.devOtp || !!(E.smsFrom && ((E.solapiKey && E.solapiSecret) || (E.aligoKey && E.aligoUser)));
const enabled = () => ({ kakao: ready('kakao'), naver: ready('naver'), google: ready('google'),
  phone: on('phone') && smsReady(), email: on('email') && !!(fb() || E.memStore) });

/* ── 비밀번호 (scrypt) ── */
const hashPw = async pw => { const salt = crypto.randomBytes(16); return 's1$' + salt.toString('base64') + '$' + (await scrypt(pw, salt, 64)).toString('base64'); };
const checkPw = async (pw, stored) => {
  try { const [v, s, h] = String(stored).split('$'); if (v !== 's1') return false;
    const d = await scrypt(pw, Buffer.from(s, 'base64'), 64), hb = Buffer.from(h, 'base64');
    return d.length === hb.length && crypto.timingSafeEqual(d, hb);
  } catch (e) { return false; }
};
const normId = v => String(v || '').trim().toLowerCase();
const validId = v => v.includes('@') ? v.length <= 100 && /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(v) : /^[a-z0-9_]{4,20}$/.test(v);
const emailKey = id => 'email_' + crypto.createHash('sha256').update(id).digest('hex').slice(0, 32);

/* ── SMS 발송 (Solapi → Aligo 순으로 설정된 것 사용) ── */
async function sendSms(to, text) {
  if (E.solapiKey && E.solapiSecret && E.smsFrom) {
    const date = new Date().toISOString(), salt = crypto.randomBytes(16).toString('hex');
    const sig = crypto.createHmac('sha256', E.solapiSecret).update(date + salt).digest('hex');
    const r = await fetch('https://api.solapi.com/messages/v4/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `HMAC-SHA256 apiKey=${E.solapiKey}, date=${date}, salt=${salt}, signature=${sig}` },
      body: JSON.stringify({ message: { to, from: E.smsFrom.replace(/\D/g, ''), text } })
    });
    if (!r.ok) throw new Error('문자 발송에 실패했습니다 (' + r.status + ')');
    return;
  }
  if (E.aligoKey && E.aligoUser && E.smsFrom) {
    const r = await fetch('https://apis.aligo.in/send/', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ key: E.aligoKey, user_id: E.aligoUser, sender: E.smsFrom.replace(/\D/g, ''), receiver: to, msg: text })
    });
    const d = await r.json();
    if (String(d.result_code) !== '1') throw new Error('문자 발송에 실패했습니다');
    return;
  }
  throw new Error('문자 발송 설정이 서버에 없습니다');
}

/* ── 팝업 결과 페이지 (opener 연결이 끊겨도 storage 이벤트로 알림) ── */
const popupPage = (ok, msg, back) => `<!doctype html><meta charset="utf-8"><title>로그인</title>
<p style="font:14px sans-serif;text-align:center;margin-top:30px">${ok ? '로그인되었습니다. 창이 자동으로 닫힙니다.' : '로그인에 실패했습니다.'}</p>
<script>(function(){var m=${j({ type: 'shop-login', ok, error: msg || '' })};
try{localStorage.setItem('shop_login_evt',JSON.stringify({type:m.type,ok:m.ok,error:m.error,t:Date.now()}));}catch(e){}
try{if(window.opener)window.opener.postMessage(m,location.origin);}catch(e){}
window.close();
setTimeout(function(){location.replace(${j(back + (ok ? '?login=ok' : '?login_error=' + encodeURIComponent(msg || '')))});},500);})();</script>`;

/* ── 라우터 ───────────────────────────────────── */
const router = express.Router();
router.use(express.json({ limit: '10kb' }));

router.get('/config', (req, res) => res.json({ ok: true, ...enabled(), admin: adminConfigured() }));
router.get('/me', (req, res) => res.json({ ok: true, user: publicUser(verify(cookies(req).shop_sid)) }));
router.post('/logout', (req, res) => { setCk(req, res, 'shop_sid', '', 0); res.json({ ok: true }); });

/* 소셜 : 카카오 · 네이버 · 구글 */
router.get('/:p/start', (req, res, next) => {
  const k = req.params.p, c = PV[k]; if (!c) return next();
  const back = /^\/shop[\w\-\/]*$/.test(req.query.return || '') ? req.query.return : '/shop/', popup = req.query.popup === '1';
  if (!ready(k)) {
    const m = c.label + ' 로그인이 설정되지 않았습니다';
    return popup ? res.type('html').send(popupPage(false, m, back)) : res.redirect(back + '?login_error=' + encodeURIComponent(m));
  }
  const state = crypto.randomBytes(16).toString('hex');
  setCk(req, res, 'shop_os', sign({ p: k, state, back, popup, exp: Date.now() + 600000 }), 600);
  res.redirect(c.auth + '?' + new URLSearchParams({ client_id: c.id, redirect_uri: redirectUri(req, k), response_type: 'code', state, ...(c.extra || {}) }));
});

router.get('/:p/callback', async (req, res, next) => {
  const k = req.params.p, c = PV[k]; if (!c) return next();
  const ks = verify(cookies(req).shop_os) || {}, back = ks.back || '/shop/', popup = !!ks.popup;
  const end = (ok, msg) => popup ? res.type('html').send(popupPage(ok, msg, back))
    : res.redirect(back + (ok ? '?login=ok' : '?login_error=' + encodeURIComponent(msg)));
  try {
    if (req.query.error) return end(false, c.label + ' 로그인이 취소되었습니다');
    if (ks.p !== k || !ks.state || ks.state !== req.query.state) return end(false, '잘못된 요청입니다. 다시 시도해 주세요');
    const body = (c.body || tokenBody)(c, req.query.code, redirectUri(req, k), ks.state);
    const tr = c.tokenGet ? await fetch(c.token + '?' + new URLSearchParams(body))
      : await fetch(c.token, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' }, body: new URLSearchParams(body) });
    const tk = await tr.json();
    if (!tk.access_token) return end(false, c.label + ' 인증에 실패했습니다');
    const info = c.parse(await (await fetch(c.me, { headers: { Authorization: 'Bearer ' + tk.access_token } })).json());
    if (!info.id) return end(false, c.label + ' 회원정보를 가져오지 못했습니다');
    const user = { id: info.id, name: info.name, email: info.email, provider: k, role: roleFor(k, info) };
    await saveUser(user); login(req, res, user, user.role === 'admin' ? 8 * 3600 : undefined); setCk(req, res, 'shop_os', '', 0);
    end(true);
  } catch (e) { console.error('[shop-auth]', k, e.message); end(false, c.label + ' 로그인 처리 중 오류가 발생했습니다'); }
});

/* 휴대폰 : 6자리 인증번호 (5분 유효 · 5회 시도 · 60초 재전송 제한) */
const otp = new Map();
router.post('/phone/send', async (req, res) => {
  const phone = String(req.body.phone || '').replace(/\D/g, '');
  if (!/^01[016789]\d{7,8}$/.test(phone)) return res.status(400).json({ ok: false, error: '휴대폰 번호 형식이 올바르지 않습니다' });
  if (!enabled().phone) return res.status(503).json({ ok: false, error: '휴대폰 로그인이 설정되지 않았습니다' });
  const prev = otp.get(phone);
  if ((prev && Date.now() - prev.last < 55000) || limited('send:' + ipOf(req), 8) || limited('sendp:' + phone, 5, 3600000))
    return res.status(429).json({ ok: false, error: '잠시 후 다시 요청해 주세요' });
  const code = String(crypto.randomInt(100000, 1000000));
  otp.set(phone, { code, exp: Date.now() + 300000, tries: 0, last: Date.now() });
  if (E.devOtp) return res.json({ ok: true, dev: code });
  try { await sendSms(phone, `[더착한쇼핑] 인증번호 ${code} (5분간 유효)`); res.json({ ok: true }); }
  catch (e) { otp.delete(phone); console.error('[shop-auth] sms:', e.message); res.status(502).json({ ok: false, error: e.message }); }
});

router.post('/phone/verify', async (req, res) => {
  const phone = String(req.body.phone || '').replace(/\D/g, ''), code = String(req.body.code || '').trim();
  const o = otp.get(phone);
  if (!o || o.exp < Date.now()) return res.status(400).json({ ok: false, error: '인증번호가 만료되었습니다. 다시 받아주세요' });
  if (++o.tries > 5) { otp.delete(phone); return res.status(429).json({ ok: false, error: '시도 횟수를 초과했습니다. 다시 받아주세요' }); }
  if (code.length !== o.code.length || !crypto.timingSafeEqual(Buffer.from(code), Buffer.from(o.code)))
    return res.status(400).json({ ok: false, error: '인증번호가 일치하지 않습니다' });
  otp.delete(phone);
  const admin = roleFor('phone', { phone }) === 'admin';
  const user = {
    id: 'ph_' + crypto.createHash('sha256').update(phone).digest('hex').slice(0, 16),
    name: String(req.body.name || '').trim().slice(0, 20) || (admin ? '관리자' : '회원' + phone.slice(-4)),
    phone: phone.replace(/^(\d{3})\d+(\d{4})$/, '$1-****-$2'),   // 화면용 마스킹
    provider: 'phone', role: admin ? 'admin' : 'user'
  };
  await saveUser({ ...user, phoneFull: phone }); login(req, res, user, admin ? 8 * 3600 : undefined);
  res.json({ ok: true, user });
});

/* 아이디(이메일) + 비밀번호 : 가입 → 로그인 (비밀번호는 scrypt 해시로만 저장, 6회 실패 시 10분 잠금) */
const storeDown = res => res.status(503).json({ ok: false, error: '아이디 로그인은 회원 저장소(Firestore) 연결 후 사용할 수 있습니다' });
router.post('/email/signup', async (req, res) => {
  try {
    const id = normId(req.body.id), pw = String(req.body.pw || '');
    if (!validId(id)) return res.status(400).json({ ok: false, error: '아이디는 영문·숫자·밑줄 4~20자 또는 이메일 형식이어야 합니다' });
    if (pw.length < 8 || pw.length > 100) return res.status(400).json({ ok: false, error: '비밀번호는 8자 이상이어야 합니다' });
    if (limited('signup:' + ipOf(req), 10, 3600000)) return res.status(429).json({ ok: false, error: '잠시 후 다시 시도해 주세요' });
    const key = emailKey(id);
    const user = { id: 'em_' + key.slice(6, 22), name: String(req.body.name || '').trim().slice(0, 20) || id.split('@')[0],
      email: id.includes('@') ? id : '', provider: 'email', role: 'user' };
    await store.create(key, { ...user, loginId: id, passHash: await hashPw(pw), createdAt: new Date() });
    login(req, res, user); res.json({ ok: true, user });
  } catch (e) {
    if (e.message === 'EXISTS') return res.status(409).json({ ok: false, error: '이미 사용 중인 아이디입니다' });
    if (e.message === 'STORE') return storeDown(res);
    console.error('[shop-auth] signup:', e.message); res.status(500).json({ ok: false, error: '회원가입 처리 중 오류가 발생했습니다' });
  }
});

router.post('/email/login', async (req, res) => {
  const id = normId(req.body.id), pw = String(req.body.pw || ''), lk = 'login:' + ipOf(req) + ':' + id;
  if (recent(lk).length >= 6) return res.status(429).json({ ok: false, error: '로그인 시도가 많습니다. 잠시 후 다시 시도해 주세요' });
  try {
    const rec = validId(id) ? await store.get(emailKey(id)) : null;
    if (!rec) await hashPw(pw);   // 존재 여부와 상관없이 처리 시간을 비슷하게
    if (!rec || !(await checkPw(pw, rec.passHash))) {
      limited(lk, 1e9); return res.status(401).json({ ok: false, error: '아이디 또는 비밀번호가 올바르지 않습니다' });
    }
    hits.delete(lk);
    const user = { id: rec.id, name: rec.name, email: rec.email || '', provider: 'email', role: 'user' };
    login(req, res, user); res.json({ ok: true, user });
  } catch (e) {
    if (e.message === 'STORE') return storeDown(res);
    console.error('[shop-auth] login:', e.message); res.status(500).json({ ok: false, error: '로그인 처리 중 오류가 발생했습니다' });
  }
});

module.exports = router;
// 다른 API 보호용: app.get('/api/shop/admin/...', require('./routes/shop-auth').requireAdmin, handler)
module.exports.requireAdmin = (req, res, next) => {
  const s = verify(cookies(req).shop_sid);
  return s && s.role === 'admin' ? next() : res.status(401).json({ ok: false, error: '관리자 로그인이 필요합니다' });
};
