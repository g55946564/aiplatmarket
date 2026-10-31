/**
 * 더착한쇼핑 자체 로그인 라우터 — 카카오 · 휴대폰(SMS 인증) · 관리자
 *
 * [설치] 메인 index.js 에서 catch-all(app.get('*')) 라우트 '위'에 1줄만 추가하세요.
 *        app.use('/api/shop/auth', require('./routes/shop-auth'));
 *        (이 파일을 routes/shop-auth.js 로 저장. 기존 코드는 수정하지 않습니다)
 *
 * [환경변수] Render 에 등록된 이름 중 아래 E 의 이름 하나를 자동으로 읽습니다.
 *        이름이 다르면 E 의 env('...') 안 이름만 고치세요.
 *        GET /api/shop/auth/config 로 인식 여부(true/false)를 확인할 수 있습니다.
 *
 * [카카오 개발자 콘솔] 'Redirect URI'에 아래 주소를 1회 등록해야 합니다.
 *        https://도메인/api/shop/auth/kakao/callback   (예: https://aiplatmarket.com/...)
 */
const express = require('express');
const crypto = require('crypto');

const env = (...names) => { for (const k of names) if (process.env[k]) return process.env[k]; return ''; };
const E = {
  kakaoRest:   env('KAKAO_REST_API_KEY', 'KAKAO_REST_KEY', 'KAKAO_CLIENT_ID'),
  kakaoSecret: env('KAKAO_CLIENT_SECRET'),
  kakaoRedirect: env('SHOP_KAKAO_REDIRECT_URI'),          // 비우면 요청 도메인으로 자동 계산
  adminId:     env('ADMIN_ID', 'ADMIN_USER', 'ADMIN_USERNAME') || 'admin',
  adminPws:    ['ADMIN_PASSWORD', 'ADMIN_PW', 'ADMIN_PASS', 'ADMIN_TOKEN'].map(k => process.env[k]).filter(Boolean),
  secret:      env('SESSION_SECRET', 'JWT_SECRET', 'COOKIE_SECRET') || crypto.randomBytes(32).toString('hex'),
  baseUrl:     env('PUBLIC_BASE_URL', 'SITE_URL', 'BASE_URL'),
  solapiKey:   env('SOLAPI_API_KEY', 'COOLSMS_API_KEY'),
  solapiSecret: env('SOLAPI_API_SECRET', 'COOLSMS_API_SECRET'),
  smsFrom:     env('SMS_SENDER', 'SOLAPI_SENDER', 'SMS_FROM', 'COOLSMS_SENDER'),
  aligoKey:    env('ALIGO_API_KEY', 'ALIGO_KEY'),
  aligoUser:   env('ALIGO_USER_ID', 'ALIGO_USER'),
  devOtp:      process.env.SHOP_AUTH_DEV_OTP === '1'       // 테스트용: 문자 대신 화면에 인증번호 표시 (운영에서는 켜지 마세요)
};
const smsReady = () => E.devOtp || !!(E.smsFrom && ((E.solapiKey && E.solapiSecret) || (E.aligoKey && E.aligoUser)));
if (!process.env.SESSION_SECRET && !process.env.JWT_SECRET && !process.env.COOKIE_SECRET)
  console.warn('[shop-auth] SESSION_SECRET 이 없어 임시 키를 사용합니다 (서버 재시작 시 로그인 해제)');

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
const safeEq = (a, b) => crypto.timingSafeEqual(
  crypto.createHash('sha256').update(String(a)).digest(), crypto.createHash('sha256').update(String(b)).digest());
const cookies = req => Object.fromEntries((req.headers.cookie || '').split(';')
  .map(c => c.trim().split(/=(.*)/s).slice(0, 2)).filter(a => a[0]));
const setCk = (req, res, name, val, maxAge) => {
  const https = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.append('Set-Cookie', `${name}=${val}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${https ? '; Secure' : ''}`);
};
const ipOf = req => (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || 'x';
const hits = new Map();
const limited = (key, max, win = 600000) => {
  const now = Date.now(), h = (hits.get(key) || []).filter(t => now - t < win);
  h.push(now); hits.set(key, h); return h.length > max;
};
const origin = req => E.baseUrl ||
  `${req.headers['x-forwarded-proto'] || req.protocol}://${req.headers['x-forwarded-host'] || req.get('host')}`;
const redirectUri = req => E.kakaoRedirect || origin(req) + '/api/shop/auth/kakao/callback';
const login = (req, res, user, ttlSec = 14 * 86400) => {
  setCk(req, res, 'shop_sid', sign({ ...user, exp: Date.now() + ttlSec * 1000 }), ttlSec);
};
const publicUser = s => s && ({ id: s.id, name: s.name, role: s.role, provider: s.provider, email: s.email, phone: s.phone });

// 회원 저장(선택): firebase-admin 이 이미 초기화돼 있으면 shop_users 컬렉션에 기록
async function saveUser(u) {
  try {
    const fa = require('firebase-admin'); if (!fa.apps.length) return;
    await fa.firestore().collection('shop_users').doc(`${u.provider}_${u.id}`)
      .set({ ...u, lastLoginAt: new Date() }, { merge: true });
  } catch (e) { console.warn('[shop-auth] saveUser 건너뜀:', e.message); }
}

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

/* ── 라우터 ───────────────────────────────────── */
const router = express.Router();
router.use(express.json({ limit: '10kb' }));

router.get('/config', (req, res) =>
  res.json({ ok: true, kakao: !!E.kakaoRest, phone: smsReady(), admin: E.adminPws.length > 0 }));

router.get('/me', (req, res) => res.json({ ok: true, user: publicUser(verify(cookies(req).shop_sid)) }));

router.post('/logout', (req, res) => { setCk(req, res, 'shop_sid', '', 0); res.json({ ok: true }); });

/* 카카오 : 서버 OAuth (REST 키·시크릿은 서버에만 존재) */
router.get('/kakao/start', (req, res) => {
  if (!E.kakaoRest) return res.redirect('/shop/?login_error=' + encodeURIComponent('카카오 설정이 없습니다'));
  const state = crypto.randomBytes(16).toString('hex');
  const back = /^\/shop[\w\-\/]*$/.test(req.query.return || '') ? req.query.return : '/shop/';
  setCk(req, res, 'shop_ks', sign({ state, back, exp: Date.now() + 600000 }), 600);
  res.redirect('https://kauth.kakao.com/oauth/authorize?' + new URLSearchParams(
    { client_id: E.kakaoRest, redirect_uri: redirectUri(req), response_type: 'code', state }));
});

router.get('/kakao/callback', async (req, res) => {
  const ks = verify(cookies(req).shop_ks) || {}, back = ks.back || '/shop/';
  const fail = m => res.redirect(back + '?login_error=' + encodeURIComponent(m));
  try {
    if (req.query.error) return fail('카카오 로그인이 취소되었습니다');
    if (!ks.state || ks.state !== req.query.state) return fail('잘못된 요청입니다');
    const tk = await (await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
      body: new URLSearchParams({
        grant_type: 'authorization_code', client_id: E.kakaoRest, redirect_uri: redirectUri(req), code: req.query.code,
        ...(E.kakaoSecret ? { client_secret: E.kakaoSecret } : {})
      })
    })).json();
    if (!tk.access_token) return fail('카카오 인증에 실패했습니다');
    const me = await (await fetch('https://kapi.kakao.com/v2/user/me',
      { headers: { Authorization: 'Bearer ' + tk.access_token } })).json();
    if (!me.id) return fail('카카오 회원정보를 가져오지 못했습니다');
    const user = {
      id: String(me.id),   // 메인 사이트 kakao_user.id 와 같은 값
      name: me.kakao_account?.profile?.nickname || me.properties?.nickname || '카카오회원',
      email: me.kakao_account?.email || '', provider: 'kakao', role: 'user'
    };
    await saveUser(user); login(req, res, user); setCk(req, res, 'shop_ks', '', 0);
    res.redirect(back + '?login=ok');
  } catch (e) { console.error('[shop-auth] kakao:', e.message); fail('카카오 로그인 처리 중 오류가 발생했습니다'); }
});

/* 휴대폰 : 6자리 인증번호 (5분 유효 · 5회 시도 · 60초 재전송 제한) */
const otp = new Map();
router.post('/phone/send', async (req, res) => {
  const phone = String(req.body.phone || '').replace(/\D/g, '');
  if (!/^01[016789]\d{7,8}$/.test(phone)) return res.status(400).json({ ok: false, error: '휴대폰 번호 형식이 올바르지 않습니다' });
  if (!smsReady()) return res.status(503).json({ ok: false, error: '문자 발송 설정이 서버에 없습니다' });
  const prev = otp.get(phone);
  if ((prev && Date.now() - prev.last < 55000) || limited('send:' + ipOf(req), 8))
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
  const user = {
    id: 'ph_' + crypto.createHash('sha256').update(phone).digest('hex').slice(0, 16),
    name: String(req.body.name || '').trim().slice(0, 20) || '회원' + phone.slice(-4),
    phone: phone.replace(/^(\d{3})\d+(\d{4})$/, '$1-****-$2'),   // 화면용 마스킹
    provider: 'phone', role: 'user'
  };
  await saveUser({ ...user, phoneFull: phone }); login(req, res, user);
  res.json({ ok: true, user });
});

/* 관리자 : 환경변수의 관리자 아이디/비밀번호와 대조 (5회 실패 시 10분 잠금) */
router.post('/admin', (req, res) => {
  const key = 'admin:' + ipOf(req), now = Date.now();
  if ((hits.get(key) || []).filter(t => now - t < 600000).length >= 5)
    return res.status(429).json({ ok: false, error: '잠시 후 다시 시도해 주세요' });
  const id = String(req.body.id || ''), pw = String(req.body.pw || '');
  if (!(E.adminPws.length && safeEq(id, E.adminId) && E.adminPws.some(p => safeEq(pw, p)))) {
    limited(key, 99); return res.status(401).json({ ok: false, error: '관리자 정보가 올바르지 않습니다' });
  }
  hits.delete(key);
  const user = { id: 'admin', name: '관리자', provider: 'admin', role: 'admin' };
  login(req, res, user, 8 * 3600); res.json({ ok: true, user });
});

module.exports = router;
// 다른 API 보호용: app.get('/api/shop/admin/...', require('./routes/shop-auth').requireAdmin, handler)
module.exports.requireAdmin = (req, res, next) => {
  const s = verify(cookies(req).shop_sid);
  return s && s.role === 'admin' ? next() : res.status(401).json({ ok: false, error: '관리자 로그인이 필요합니다' });
};
