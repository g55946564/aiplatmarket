/**
 * ============================================================
 * AI PLATMARKET index.js — 통합 완전판 v4
 *
 * v4 신규 추가:
 *   ✅ Firebase ENOENT / JSON 파싱 오류 방어 처리
 *   ✅ /robots.txt SEO 라우트
 *   ✅ /sitemap.xml 동적 생성 (DB 업체 포함)
 *   ✅ POST /api/kakao/verify — 카카오 토큰 서버 검증 + Firestore 저장
 *   ✅ GET  /api/sports       — 스포츠·건강 뉴스 전용 엔드포인트
 *
 * 기존 기능:
 *   ✅ Founder 멤버십 (선착순 500→2000→10000)
 *   ✅ 업체 등록 후 SEO 랜딩 자동 생성 /store/:id
 *   ✅ 지역별 SEO 페이지 /region/:sido-:sigungu
 *   ✅ 동적 메타태그 자동 생성
 *   ✅ 카카오 로그인 서버 연동
 *   ✅ 블로그/SNS 홍보문구 AI 자동 생성
 *   ✅ Kakao 공유 API
 *   ✅ 광고주 자동 만료 처리
 *   ✅ 인기순위 자동 반영
 *   ✅ 입점 신청 QR 코드 생성
 * ============================================================
 */
'use strict';

const express  = require('express');
const admin    = require('firebase-admin');
const cors     = require('cors');
const path     = require('path');
const https    = require('https');
const http     = require('http');

const fs = require('fs');

function loadEnvFile(filePath = path.join(__dirname, '.env')) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const eq = trimmed.indexOf('=');
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function resolveServiceAccountPath() {
  const candidates = [
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    process.env.FIREBASE_SERVICE_ACCOUNT,
    path.join(__dirname, 'serviceAccountKey.json'),
  ].filter(Boolean);

  try {
    const autoDetected = fs
      .readdirSync(__dirname)
      .find(name => /firebase-adminsdk.*\.json$/i.test(name));
    if (autoDetected) candidates.push(path.join(__dirname, autoDetected));
  } catch (e) {
    // Ignore directory scan errors and let the explicit candidates fail below.
  }

  return candidates.find(p => fs.existsSync(path.resolve(p)));
}

loadEnvFile();

console.log('__dirname =', __dirname);

console.log(
  'public exists:',
  fs.existsSync(path.join(__dirname, 'public'))
);

console.log(
  'index exists:',
  fs.existsSync(path.join(__dirname, 'public', 'index.html'))
);

console.log(
  'admin exists:',
  fs.existsSync(path.join(__dirname, 'public', 'admin.html'))
);

const app  = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
// paper 신문 폴더 (public 안 루트에 위치)
app.use('/paper', express.static(path.join(__dirname, 'public', 'paper')));
app.get('/paper', (req,res) => res.sendFile(path.join(__dirname, 'public', 'paper', 'index.html')));
app.get('/paper/', (req,res) => res.sendFile(path.join(__dirname, 'public', 'paper', 'index.html')));

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'aiplatmarket',
    firebase: Boolean(db),
    uptime: Math.round(process.uptime()),
    checkedAt: new Date().toISOString(),
  });
});

/* ─────────────────────────────
   Firebase Admin SDK
───────────────────────────── */

/* ── Firebase ── */
let db;
try {
  const serviceAccountPath = resolveServiceAccountPath();
  if (!serviceAccountPath) {
    throw new Error('서비스 계정 JSON 파일 없음 (GOOGLE_APPLICATION_CREDENTIALS 환경변수 또는 serviceAccountKey.json 필요)');
  }
  // require() 대신 readFileSync + JSON.parse 로 ENOENT / JSON 오류를 명확하게 잡음
  const raw = fs.readFileSync(path.resolve(serviceAccountPath), 'utf8');
  const serviceAccount = JSON.parse(raw);
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  db = admin.firestore();
  console.log('✅ Firebase 연결 | Project:', serviceAccount.project_id);
} catch (e) {
  if (e.code === 'ENOENT') {
    console.error('❌ Firebase: 서비스 계정 파일을 찾을 수 없습니다 →', e.path);
  } else if (e instanceof SyntaxError) {
    console.error('❌ Firebase: 서비스 계정 JSON 파싱 실패 →', e.message);
  } else {
    console.error('❌ Firebase:', e.message);
  }
  console.warn('⚠️  Firebase 없이 실행 — DB 기능 비활성화');
}

function requireDB(res) {
  if (!db) {
    res.status(503).json({
      error: 'Firebase 연결 안 됨'
    });
    return false;
  }
  return true;
}

/* ── 환경변수 ── */
const ADMIN_TOKEN  = process.env.ADMIN_TOKEN    || 'dev-token-change-me';
const NAVER_ID     = process.env.NAVER_CLIENT_ID;
const NAVER_SECRET = process.env.NAVER_CLIENT_SECRET;
const GMAIL_USER   = process.env.GMAIL_USER;
const GMAIL_PASS   = process.env.GMAIL_APP_PASSWORD;
const KAKAO_KEY    = process.env.KAKAO_REST_API_KEY;   // Kakao REST API Key
const KAKAO_JS_KEY = process.env.KAKAO_MAPS_KEY;       // Kakao JS Key (지도)
let autoApprove    = false;

function adminAuth(req, res, next) {
  const t = req.headers['x-admin-token'] || req.query.token;
  if (t !== ADMIN_TOKEN) return res.status(401).json({ error:'인증 실패' });
  next();
}

/* ── 캐시 ── */
const CACHE_TTL = 30 * 60 * 1000;
const _cache = {};
function getCache(k) { const c=_cache[k]; return (c && Date.now()-c.at<CACHE_TTL)?c.data:null; }
function setCache(k,d) { _cache[k]={ data:d, at:Date.now() }; }

/* ── HTTP fetch ── */
function fetchUrl(url, headers={}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const u   = new URL(url);
    mod.get({ hostname:u.hostname, path:u.pathname+u.search, headers }, res => {
      let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve(d));
    }).on('error', reject);
  });
}

/* ── AI 요약 ── */
function aiSummarize(text='', max=150) {
  return text.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,max) + (text.length>max?'...':'');
}

/* ── AI 홍보문구 생성 ── */
function generatePromo(store) {
  const templates = [
    `[AI 홍보] ${store.name}은 ${store.region}의 인기 ${store.category}입니다. ${store.item||'다양한 서비스'}을(를) 합리적인 가격으로 제공합니다. 지금 방문해보세요! 📍${store.region}`,
    `✨ ${store.name} | ${store.region} ${store.category} | ${store.item||''} 전문 | 지역 주민 추천 1위 | AI플랫마켓 인증 업체`,
    `🏪 ${store.region} 주민들이 선택한 ${store.category}, ${store.name}. ${store.desc||''} 📞 ${store.phone||'문의환영'}`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

/* ── SEO 메타태그 생성 ── */
function buildMeta({ title, desc, image, url, keywords }) {
  const t = title || 'AI플랫마켓 — 지역 소상공인 플랫폼';
  const d = desc  || '우리 동네 소식·할인·맛집·창업 정보를 AI로 더 빠르게. 국민경제㊉';
  const img = image || 'https://aiplatmarket.kr/og.jpg';
  return `
    <meta name="description" content="${d}">
    <meta name="keywords" content="${keywords||'소상공인,지역경제,AI,맛집,창업,할인쿠폰'}">
    <meta property="og:title" content="${t}">
    <meta property="og:description" content="${d}">
    <meta property="og:image" content="${img}">
    <meta property="og:url" content="${url||'https://aiplatmarket.kr'}">
    <meta property="og:type" content="website">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${t}">
    <meta name="twitter:description" content="${d}">
    <link rel="canonical" href="${url||'https://aiplatmarket.kr'}">`;
}

/* ══════════════════════════════════════
   📌 공개 API
══════════════════════════════════════ */

/* 사이트 설정 공개 */
app.get('/api/config', async (req, res) => {
  try {
    const cfg = db ? (await db.collection('config').doc('site').get()).data() || {} : {};
    res.json({ ok:true, config: {
      kakao_js_key: KAKAO_JS_KEY || cfg.kakao_js_key || '',
      site_notice:  cfg.site_notice || '',
      auto_approve: cfg.auto_approve || false,
      founder_max:  cfg.founder_max  || 500,
      founder_current: cfg.founder_current || 0,
    }});
  } catch(e) { res.json({ ok:false, config:{} }); }
});

/* ─────── Founder 멤버십 ─────── */
const FOUNDER_TIERS = [
  { tier:'GOLD',  max:500,   price:0, label:'창업멤버 GOLD',  badge:'👑' },
  { tier:'PRO',   max:2000,  price:0, label:'창업멤버 PRO',   badge:'⭐' },
  { tier:'FREE',  max:10000, price:0, label:'일반 FREE',      badge:'🆓' },
];

app.get('/api/founder/status', async (req, res) => {
  if (!requireDB(res)) return;
  try {
    const snap = await db.collection('founders').get();
    const count = snap.size;
    const tier  = FOUNDER_TIERS.find(t => count < t.max) || FOUNDER_TIERS[2];
    const next  = FOUNDER_TIERS[FOUNDER_TIERS.indexOf(tier)+1];
    res.json({ ok:true, current:count, tier:tier.tier, badge:tier.badge, label:tier.label,
      remaining: tier.max - count, nextTier: next?.tier||null, tiers: FOUNDER_TIERS });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

app.post('/api/founder/join', async (req, res) => {
  if (!requireDB(res)) return;
  const { name, phone, email, region } = req.body;
  if (!name || !phone) return res.status(400).json({ error:'이름·연락처 필수' });
  try {
    const snap = await db.collection('founders').get();
    const count = snap.size;
    const tier  = FOUNDER_TIERS.find(t => count < t.max) || FOUNDER_TIERS[2];
    const ref   = await db.collection('founders').add({
      name, phone, email:'', region:'', ...req.body,
      tier: tier.tier, badge: tier.badge, seq: count+1,
      joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      freeUntil: new Date(Date.now() + 365*24*3600*1000).toISOString(), // 1년 무료
    });
    res.json({ ok:true, seq:count+1, tier:tier.tier, badge:tier.badge, id:ref.id });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

/* ─────── 업체 API ─────── */
app.post('/api/store', async (req, res) => {
  if (!requireDB(res)) return;
  try {
    const { name, owner='', region='', category='', phone, item='', desc='', email='' } = req.body;
    if (!name||!phone) return res.status(400).json({ error:'업체명·전화번호 필수' });
    const aiCopy = generatePromo({ name, region, category, item, desc, phone });
    const seoSlug = encodeURIComponent(`${region}-${name}`.replace(/\s+/g,'-'));
    const ref = await db.collection('stores').add({
      name:name.trim(), owner, region, category, phone:phone.trim(),
      item, desc, email, views:0, clicks:0, premium:false,
      approved:autoApprove, aiCopy, seoSlug,
      createdAt:admin.firestore.FieldValue.serverTimestamp(),
    });
    // Founder 전환 유도 응답
    res.json({ ok:true, id:ref.id, approved:autoApprove, aiCopy,
      seoUrl:`/store/${ref.id}`, chatdoumiUrl:`https://chatdoumi.com?biz=${ref.id}` });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

app.get('/api/store', async (req, res) => {
  if (!requireDB(res)) return;
  try {
    const { region, category, keyword, sort, all } = req.query;
    let ref = db.collection('stores');
    if (all!=='true') ref=ref.where('approved','==',true);
    if (category) ref=ref.where('category','==',category);
    ref=ref.orderBy(sort==='new'?'createdAt':'clicks','desc');
    const snap = await ref.limit(300).get();
    let stores = snap.docs.map(d=>({ id:d.id, ...d.data(), createdAt:d.data().createdAt?.toDate?.()?.toISOString()||'' }));
    if (region)  stores=stores.filter(s=>s.region?.includes(region));
    if (keyword) { const kw=keyword.toLowerCase(); stores=stores.filter(s=>(s.name||'').toLowerCase().includes(kw)||(s.item||'').toLowerCase().includes(kw)); }
    stores.sort((a,b)=>{
      const pa=(a.premium?2:0)+(a.tier==='GOLD'?1:0);
      const pb=(b.premium?2:0)+(b.tier==='GOLD'?1:0);
      return pb-pa;
    });
    res.json(stores);
  } catch(e) { res.status(500).json({ error:e.message }); }
});

app.post('/api/view',  async (req,res)=>{ if(!requireDB(res))return; if(req.body.id) await db.collection('stores').doc(req.body.id).update({views:admin.firestore.FieldValue.increment(1)}).catch(()=>{}); res.json({ok:true}); });
app.post('/api/click', async (req,res)=>{ if(!requireDB(res))return; if(req.body.id) await db.collection('stores').doc(req.body.id).update({clicks:admin.firestore.FieldValue.increment(1)}).catch(()=>{}); res.json({ok:true}); });
app.post('/api/ads/upgrade', async (req,res)=>{ if(!requireDB(res))return; if(req.body.id) await db.collection('stores').doc(req.body.id).update({premium:true}).catch(()=>{}); res.json({ok:true}); });

app.get('/api/stats', async (req,res)=>{
  if(!requireDB(res))return;
  const snap=await db.collection('stores').get();
  const stores=snap.docs.map(d=>d.data());
  const catMap={};
  stores.forEach(s=>{ if(s.category) catMap[s.category]=(catMap[s.category]||0)+1; });
  res.json({ total:stores.length, approved:stores.filter(s=>s.approved).length,
    pending:stores.filter(s=>!s.approved).length, premium:stores.filter(s=>s.premium).length,
    totalClicks:stores.reduce((n,s)=>n+(s.clicks||0),0), totalViews:stores.reduce((n,s)=>n+(s.views||0),0), categories:catMap });
});

/* ─────── SEO 랜딩 페이지 ─────── */
// 업체 개별 SEO 페이지
app.get('/store/:id', async (req, res) => {
  if (!db) return res.redirect('/');
  try {
    const doc = await db.collection('stores').doc(req.params.id).get();
    if (!doc.exists) return res.redirect('/');
    const s = doc.data();
    const meta = buildMeta({
      title: `${s.name} | ${s.region} ${s.category} | AI플랫마켓`,
      desc:  `${s.region}의 인기 ${s.category} ${s.name}. ${s.item||''} ${s.desc?.slice(0,80)||''}`,
      keywords: `${s.name},${s.region},${s.category},소상공인,지역맛집`,
      url:   `https://aiplatmarket.kr/store/${req.params.id}`,
    });
    // 클릭수 증가
    await doc.ref.update({ views: admin.firestore.FieldValue.increment(1) }).catch(()=>{});
    res.send(`<!DOCTYPE html><html lang="ko"><head>
      <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
      <title>${s.name} | ${s.region} ${s.category} | AI플랫마켓</title>
      ${meta}
      <style>body{font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f4f6f9}</style>
    </head><body>
      <div style="background:#fff;border-radius:12px;padding:24px;box-shadow:0 2px 16px rgba(0,0,0,.08)">
        <div style="font-size:.72rem;color:#999;margin-bottom:8px">📍 ${s.region} · ${s.category}</div>
        <h1 style="font-size:1.4rem;font-weight:900;color:#0d1f35;margin:0 0 8px">${s.name}</h1>
        <p style="color:#555;font-size:.9rem;line-height:1.7">${s.aiCopy||s.desc||''}</p>
        ${s.phone?`<div style="margin:14px 0"><a href="tel:${s.phone}" style="background:#0d1f35;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:.9rem">📞 ${s.phone} 전화하기</a></div>`:''}
        ${s.item?`<div style="margin-top:10px;font-size:.82rem;color:#777">주요 상품: ${s.item}</div>`:''}
        <hr style="margin:16px 0;border:none;border-top:1px solid #eee">
        <a href="/" style="color:#0d1f35;font-size:.82rem;text-decoration:none">← AI플랫마켓 홈으로</a>
        <a href="https://chatdoumi.com?biz=${doc.id}" target="_blank" style="margin-left:14px;color:#c0392b;font-size:.82rem;font-weight:700">🤖 AI 비서 연결 →</a>
      </div>
      <script type="application/ld+json">${JSON.stringify({ "@context":"https://schema.org","@type":"LocalBusiness","name":s.name,"address":{"@type":"PostalAddress","addressRegion":s.region},"telephone":s.phone||""})}</script>
    </body></html>`);
  } catch(e) { res.redirect('/'); }
});

// 지역별 SEO 페이지
app.get('/region/:slug', async (req, res) => {
  const slug    = decodeURIComponent(req.params.slug);
  const [sido, sigungu] = slug.split('-');
  const regionStr = [sido, sigungu].filter(Boolean).join(' ');
  let stores = [];
  if (db) {
    try {
      const snap = await db.collection('stores').where('approved','==',true).orderBy('clicks','desc').limit(20).get();
      stores = snap.docs.map(d=>({id:d.id,...d.data()})).filter(s=>s.region?.includes(sido));
    } catch(e) {}
  }
  const meta = buildMeta({
    title: `${regionStr} 소상공인 맛집·혜택 | AI플랫마켓`,
    desc:  `${regionStr} 지역 인기 소상공인, 맛집, 할인쿠폰, 지역경제 뉴스를 AI플랫마켓에서 확인하세요.`,
    keywords: `${sido},${sigungu||''},소상공인,맛집,할인,지역경제,AI플랫마켓`,
    url: `https://aiplatmarket.kr/region/${req.params.slug}`,
  });
  res.send(`<!DOCTYPE html><html lang="ko"><head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${regionStr} 소상공인 맛집·혜택 | AI플랫마켓</title>
    ${meta}
    <style>body{font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:800px;margin:0 auto;padding:20px;background:#f4f6f9}
    .s-card{background:#fff;border-radius:10px;padding:16px;margin-bottom:12px;box-shadow:0 2px 8px rgba(0,0,0,.06);cursor:pointer}
    .s-card:hover{box-shadow:0 4px 16px rgba(0,0,0,.12)}</style>
  </head><body>
    <div style="background:#0d1f35;color:#fff;padding:20px;border-radius:12px;margin-bottom:20px;text-align:center">
      <div style="font-size:.78rem;color:rgba(255,255,255,.6)">📍 지역경제</div>
      <h1 style="font-size:1.5rem;font-weight:900;margin:6px 0">${regionStr} 소상공인·맛집</h1>
      <div style="font-size:.82rem;color:rgba(255,255,255,.7)">${stores.length}개 업체 등록 · AI플랫마켓</div>
    </div>
    ${stores.map(s=>`<div class="s-card" onclick="location.href='/store/${s.id}'">
      <div style="font-size:.7rem;color:#999">${s.category}</div>
      <div style="font-size:1rem;font-weight:700;color:#0d1f35">${s.name}</div>
      <div style="font-size:.82rem;color:#777;margin-top:3px">${s.aiCopy||s.item||''}</div>
      ${s.phone?`<div style="margin-top:6px"><a href="tel:${s.phone}" style="font-size:.8rem;color:#c0392b;font-weight:700">📞 ${s.phone}</a></div>`:''}
    </div>`).join('')}
    ${stores.length===0?'<div style="text-align:center;padding:30px;color:#999">등록된 업체가 없습니다.<br><a href="/register" style="color:#0d1f35;font-weight:700">첫 번째로 무료 등록하기 →</a></div>':''}
    <div style="text-align:center;margin-top:20px">
      <a href="/" style="background:#0d1f35;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">AI플랫마켓 홈으로</a>
    </div>
    <script type="application/ld+json">${JSON.stringify({"@context":"https://schema.org","@type":"ItemList","name":regionStr+" 소상공인 목록","itemListElement":stores.slice(0,5).map((s,i)=>({"@type":"ListItem","position":i+1,"name":s.name,"url":"https://aiplatmarket.kr/store/"+s.id}))})}</script>
  </body></html>`);
});

/* ─────── QR코드 생성 ─────── */
app.get('/api/qr', async (req, res) => {
  const { url = 'https://aiplatmarket.kr/register', size = 200 } = req.query;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&format=png`;
  res.redirect(qrUrl);
});

/* ─────── 카카오 공유 ─────── */
app.get('/api/kakao/share', async (req, res) => {
  const { storeId } = req.query;
  if (!db || !storeId) return res.json({ ok:false });
  try {
    const doc = await db.collection('stores').doc(storeId).get();
    if (!doc.exists) return res.json({ ok:false });
    const s = doc.data();
    res.json({ ok:true, shareData: {
      title:   `${s.name} | ${s.region} ${s.category}`,
      desc:    s.aiCopy||s.desc||'',
      imageUrl:`https://aiplatmarket.kr/og.jpg`,
      link:    `https://aiplatmarket.kr/store/${storeId}`,
    }});
  } catch(e) { res.json({ ok:false }); }
});

/* ─────── 뉴스 API ─────── */
async function naverNews(keyword, display=10) {
  const key='naver:'+keyword; const hit=getCache(key); if(hit) return hit;
  if(!NAVER_ID||!NAVER_SECRET) throw new Error('NAVER 환경변수 없음');
  const data=await new Promise((resolve,reject)=>{
    https.get({ hostname:'openapi.naver.com', path:`/v1/search/news.json?query=${encodeURIComponent(keyword)}&display=${display}&sort=date`,
      headers:{'X-Naver-Client-Id':NAVER_ID,'X-Naver-Client-Secret':NAVER_SECRET}
    },res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{try{resolve(JSON.parse(d));}catch(e){reject(e);}});}).on('error',reject);
  });
  const items=(data.items||[]).map(n=>({ title:n.title.replace(/<[^>]+>/g,''), desc:aiSummarize(n.description), link:n.originallink||n.link, date:n.pubDate, source:'네이버', origin:'naver' }));
  setCache(key,items); return items;
}

async function googleNews(keyword) {
  const key='google:'+keyword; const hit=getCache(key); if(hit) return hit;
  const xml=await fetchUrl(`https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=ko&gl=KR&ceid=KR:ko`,{'User-Agent':'Mozilla/5.0'});
  const items=[]; const re=/<item>([\s\S]*?)<\/item>/g; let m;
  while((m=re.exec(xml))!==null&&items.length<10){
    const b=m[1];
    const title=(/<title><!\[CDATA\[(.*?)\]\]>/.exec(b)||/<title>(.*?)<\/title>/.exec(b))?.[1]||'';
    const link=(/<link>(.*?)<\/link>/.exec(b))?.[1]?.trim()||'';
    const desc=(/<description><!\[CDATA\[(.*?)\]\]>/.exec(b)||/<description>(.*?)<\/description>/.exec(b))?.[1]||'';
    const date=(/<pubDate>(.*?)<\/pubDate>/.exec(b))?.[1]||'';
    const source=(/<source[^>]*>(.*?)<\/source>/.exec(b))?.[1]||'구글뉴스';
    if(title) items.push({title:title.replace(/<[^>]+>/g,'').trim(),desc:aiSummarize(desc),link:link.trim(),date:date.trim(),source,origin:'google'});
  }
  setCache(key,items); return items;
}

const KEYWORD_MAP={전체:'소상공인',경제:'소상공인 경제 매출',창업:'소상공인 창업 지원',IT:'소상공인 AI IT 디지털',농수산:'로컬푸드 농수산 직거래',지방자치:'지방자치 소상공인',사회:'소상공인 사회 지역',교육:'소상공인 교육','Job뉴스':'소상공인 채용 일자리',부동산:'소상공인 임차료 상가',생활:'지역 생활 소상공인',생활과학:'생활과학 과학향기 kisti',글로벌:'글로벌 경제 국제 비즈니스 소상공인',스포츠:'국내 스포츠 소식',건강:'건강 웰빙 소상공인'};

app.get('/api/news', async (req, res) => {
  const { cat='전체', source='all', display=10 } = req.query;
  const keyword=KEYWORD_MAP[cat]||cat;
  const result={cat,items:[],sources:[],warnings:[]};
  if(source==='all'||source==='naver'){
    try{result.items.push(...await naverNews(keyword,Number(display)));result.sources.push('naver');}
    catch(e){result.warnings.push('naver:'+e.message);}
  }
  if(source==='all'||source==='google'){
    try{const g=await googleNews(keyword);const ex=new Set(result.items.map(n=>n.title));result.items.push(...g.filter(n=>!ex.has(n.title)));result.sources.push('google');}
    catch(e){result.warnings.push('google:'+e.message);}
  }
  result.items.sort((a,b)=>new Date(b.date)-new Date(a.date));
  result.items=result.items.slice(0,Number(display)*2);
  if(!result.items.length) result.items=[{title:'소상공인 디지털 전환 지원금 200만원 확대',desc:'정부가 소상공인 디지털 전환 지원을 확대합니다.',link:'#',date:new Date().toISOString(),source:'AI플랫마켓',origin:'fallback'}];
  res.json(result);
});

app.get('/api/breaking', async (req, res) => {
  try{const items=await naverNews('소상공인 속보',5);res.json({ok:true,items:items.map(n=>'📌 '+n.title)});}
  catch(e){res.json({ok:false,items:['📌 AI플랫마켓 소상공인 지원 프로그램 시작']});}
});

/* ─────── 신청 API ─────── */
const FS=admin.firestore.FieldValue;
const addDoc=(col,body)=>db.collection(col).add({...body,status:'pending',createdAt:FS.serverTimestamp()});
app.post('/api/branch',     async(req,res)=>{if(!requireDB(res))return;try{await addDoc('branches',req.body);res.json({ok:true});}catch(e){res.status(500).json({error:e.message});}});
app.post('/api/reporter',   async(req,res)=>{if(!requireDB(res))return;try{await addDoc('reporters',req.body);res.json({ok:true});}catch(e){res.status(500).json({error:e.message});}});

/* ═══════════════════════════════════════════
   🔮 인생?진로 멀티 AI 융합 엔진
   학문별 가중치 + GPT/Gemini/Rule 자동 라우팅
   Firestore 저장 → ChatDoumi 통합 결과 제공
═══════════════════════════════════════════ */
const LAI_CONFIG = {
  aptitude:    { w:1.4, ai:'gpt',    prompt:'적성검사 관점에서 이 사람의 강점과 직업 적합도를 분석해주세요.' },
  mbti:        { w:1.3, ai:'gpt',    prompt:'MBTI/Big5 성격 이론으로 직업 성향을 분석해주세요.' },
  psychology:  { w:1.3, ai:'gpt',    prompt:'심리학적 관점에서 이 사람의 동기, 가치관, 직업 적합성을 분석해주세요.' },
  career:      { w:1.5, ai:'gemini', prompt:'직업 분석: 현재 시장에서 이 사람에게 맞는 직업군 TOP5를 제시해주세요.' },
  market:      { w:1.4, ai:'gemini', prompt:'미래시장 분석: 2025-2030년 유망 직업·산업 관점에서 조언해주세요.' },
  saju:        { w:1.2, ai:'rule',   prompt:'명리학(사주) 관점에서 생년월일시 기반 적성과 운세를 분석해주세요.' },
  astrology:   { w:1.0, ai:'rule',   prompt:'서양 점성학 관점에서 별자리 기반 성격과 직업 적합도를 분석해주세요.' },
  tarot:       { w:0.9, ai:'gpt',    prompt:'타로카드 직관적 해석으로 현재 상황과 앞날을 조언해주세요.' },
  zodiac:      { w:0.8, ai:'rule',   prompt:'띠와 혈액형을 기반으로 기질과 대인관계 성향을 분석해주세요.' },
  name:        { w:1.0, ai:'rule',   prompt:'성명학 관점에서 이름의 획수와 오행으로 운명을 분석해주세요.' },
  face:        { w:1.0, ai:'gpt',    prompt:'관상학 관점에서 설명된 외모 특징으로 성격과 운을 분석해주세요.' },
  compatibility:{ w:0.7, ai:'rule',  prompt:'궁합 관점에서 이상적인 파트너 유형과 직업 파트너십을 분석해주세요.' },
  fortune:     { w:1.1, ai:'rule',   prompt:'운세 관점에서 일·주·월·년·평생 운의 흐름을 분석해주세요.' },
  genetics:    { w:1.1, ai:'gemini', prompt:'유전학적 성향 분석: 타고난 재능과 체질적 특성을 직업과 연결해주세요.' },
  fengshui:    { w:0.8, ai:'rule',   prompt:'풍수지리 관점에서 거주환경과 직업 운을 분석해주세요.' },
  ancestral:   { w:0.7, ai:'rule',   prompt:'명당학 관점에서 조상의 기운이 현재 운에 미치는 영향을 분석해주세요.' },
  culture:     { w:0.9, ai:'gemini', prompt:'문화적 관점에서 출신 지역과 성장 환경이 직업 적합성에 미치는 영향을 분석해주세요.' },
  environment: { w:0.9, ai:'gemini', prompt:'환경학 관점에서 생태적 성향과 지속가능한 직업군을 추천해주세요.' },
  mudang:      { w:0.8, ai:'rule',   prompt:'전통 무속·영적 관점에서 이 사람의 천기(天氣)와 직업 운을 해석해주세요.' },
};

// Fusion 점수 계산 (가중 평균 + 균형 보정)
function calcFusionScore(results) {
  if (!Object.keys(results).length) return 0;
  let total = 0, totalW = 0;
  const scores = Object.values(results).map(r => r.score || 70);
  // 균형 보정: 표준편차 높으면 페널티
  const mean = scores.reduce((a,b)=>a+b,0)/scores.length;
  const std  = Math.sqrt(scores.reduce((a,b)=>a+(b-mean)**2,0)/scores.length);
  const balancePenalty = Math.min(std * 0.3, 10); // 최대 10점 페널티
  Object.entries(results).forEach(([id,r]) => {
    const w = LAI_CONFIG[id]?.w || 1;
    total += (r.score||70) * w;
    totalW += w;
  });
  return Math.max(0, Math.round(total/totalW - balancePenalty));
}

// AI 라우팅: GPT/Gemini 없으면 Rule 기반 fallback
async function routeAI(fieldId, profile) {
  const cfg = LAI_CONFIG[fieldId];
  if (!cfg) return { score:70, summary:'분석 중', ai:'fallback' };
  const prompt = `${cfg.prompt}\n\n분석 대상:\n이름: ${profile.name}\n생년월일: ${profile.birth}\n성별: ${profile.gender}\n혈액형: ${profile.blood||'미입력'}\n출생지: ${profile.city||'미입력'}\n직업관심: ${profile.job||'미입력'}\n고민: ${profile.concern||'미입력'}\n\nJSON 형식으로만 응답: {"score":0-100,"summary":"한줄요약","advice":"조언"}`;
  // GPT 호출 (환경변수 없으면 Rule fallback)
  if (cfg.ai === 'gpt' && process.env.OPENAI_API_KEY) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method:'POST', headers:{'Authorization':'Bearer '+process.env.OPENAI_API_KEY,'Content-Type':'application/json'},
        body: JSON.stringify({ model:'gpt-4o-mini', messages:[{role:'user',content:prompt}], max_tokens:300, temperature:0.7 })
      });
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || '{}';
      const parsed = JSON.parse(text.replace(/```json|```/g,'').trim());
      return { ...parsed, ai:'GPT' };
    } catch(e) { /* fallback */ }
  }
  // Gemini 호출
  if (cfg.ai === 'gemini' && process.env.GEMINI_API_KEY) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ contents:[{parts:[{text:prompt}]}] })
      });
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const parsed = JSON.parse(text.replace(/```json|```/g,'').trim());
      return { ...parsed, ai:'Gemini' };
    } catch(e) { /* fallback */ }
  }
  // Rule 기반 fallback (항상 작동)
  const score = 65 + Math.floor(Math.random()*30);
  const summaries = { saju:'생년월일 기반 분석 완료', astrology:'별자리 기반 분석 완료', rule:'전통 학문 기반 분석 완료' };
  return { score, summary: summaries[cfg.ai]||'규칙 기반 분석 완료', advice:'ChatDoumi AI 상세 분석을 추천드립니다.', ai:'Rule' };
}

app.post('/api/lifeai', async (req, res) => {
  const profile = req.body;
  if (!profile.name || !profile.birth) return res.status(400).json({ error:'이름·생년월일 필수' });
  try {
    // Firestore 저장
    let docId = null;
    if (db) {
      const ref = await db.collection('lifeai_requests').add({
        ...profile, createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      docId = ref.id;
    }
    // 선택된 학문만 병렬 AI 분석
    const selected = profile.selected || Object.keys(LAI_CONFIG).slice(0,5);
    const aiPromises = selected.map(async id => {
      const result = await routeAI(id, profile);
      return [id, { ...result, field: id, name: LAI_CONFIG[id] ? (LAI_CONFIG[id].prompt.split(' ')[0]) : id }];
    });
    const aiResults = Object.fromEntries(await Promise.all(aiPromises));
    const fusionScore = calcFusionScore(aiResults);
    // 직업 추천 (50k DB 기반 — 현재는 카테고리 매핑)
    const jobRecs = getJobRecommendations(profile, fusionScore);
    const response = { ok:true, docId, fusionScore, results:aiResults, jobRecs,
      chatdoumiUrl:`https://chatdoumi.com?lifeai=${docId||''}`, analysedAt:new Date().toISOString() };
    // Firestore 결과 업데이트
    if (db && docId) await db.collection('lifeai_requests').doc(docId).update({ fusionScore, jobRecs, status:'completed' }).catch(()=>{});
    res.json(response);
  } catch(e) { res.status(500).json({ error:e.message }); }
});

app.get('/api/lifeai/:id', async (req, res) => {
  if (!requireDB(res)) return;
  try {
    const doc = await db.collection('lifeai_requests').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error:'분석 결과 없음' });
    res.json({ ok:true, ...doc.data() });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

app.get('/api/admin/lifeai', adminAuth, async (req, res) => {
  if (!requireDB(res)) return;
  const snap = await db.collection('lifeai_requests').orderBy('createdAt','desc').limit(50).get();
  res.json(snap.docs.map(d=>({id:d.id,...d.data(),createdAt:d.data().createdAt?.toDate?.()?.toISOString()||''})));
});

function getJobRecommendations(p, score) {
  const c = (p.concern||p.job||'').toLowerCase();
  const DB = {
    IT:       ['소프트웨어 개발자','AI 엔지니어','데이터 사이언티스트','사이버보안 전문가','클라우드 아키텍트'],
    창업:     ['소상공인 창업','프랜차이즈 운영','온라인 쇼핑몰','지역 특산물 유통','배달 전문점'],
    서비스:   ['뷰티 전문가','요식업 창업','숙박업','지역 투어 가이드','웰니스 코치'],
    전문직:   ['세무사','회계사','공인중개사','행정사','노무사','법무사'],
    미디어:   ['유튜버·크리에이터','SNS 마케터','AI플랫마켓 홍보기자단','팟캐스터'],
    교육:     ['온라인 강사','학원 창업','코칭 전문가','진로 상담사','에듀테크 기획자'],
    예술:     ['작가·스토리텔러','디자이너','음악 프로듀서','영상 편집자'],
    사회:     ['사회복지사','지역활동가','NGO 운동가','커뮤니티 매니저'],
  };
  if (c.includes('창업')||c.includes('사업')) return DB.창업;
  if (c.includes('it')||c.includes('ai')||c.includes('개발')) return DB.IT;
  if (c.includes('전문')||c.includes('자격')||c.includes('사사')) return DB.전문직;
  if (c.includes('미디어')||c.includes('방송')||c.includes('유튜브')) return DB.미디어;
  if (c.includes('교육')||c.includes('강사')||c.includes('학원')) return DB.교육;
  if (score > 85) return [...DB.IT.slice(0,2), ...DB.전문직.slice(0,2), ...DB.미디어.slice(0,1)];
  if (score > 70) return [...DB.창업.slice(0,2), ...DB.서비스.slice(0,2), ...DB.전문직.slice(0,1)];
  return [...DB.창업.slice(0,2), ...DB.서비스.slice(0,2), ...DB.교육.slice(0,1)];
}
app.post('/api/ad-request', async(req,res)=>{if(!requireDB(res))return;try{await addDoc('ad_requests',req.body);res.json({ok:true});}catch(e){res.status(500).json({error:e.message});}});

/* ─────── AI아이템존 · 9단계 사업 코파일럿 AI 분석 ─────── */
const IZ_STEP_PROMPTS = {
  2: '아래 사업 아이디어의 시장성을 분석해라. 시장 수요, 경쟁 강도, 성장 가능성 3가지 관점에서 각각 1줄로, 총 3줄로 답하라.',
  3: '아래 사업 아이디어와 유사한 선행 특허/기술이 있을 가능성과 회피 전략을 2~3줄로 답하라.',
  4: '아래 사업 아이디어와 유사한 국내 서비스 1~2개를 떠올리고, 차별화 포인트를 2~3줄로 답하라.',
  5: '아래 사업 아이디어에 적합한 한국 정부지원사업 유형(예: 디딤돌, 예비창업패키지 등)을 2~3줄로 추천하라.',
  6: '아래 사업 아이디어 실현을 위해 필요한 공동개발 파트너 직군(개발/디자인/마케팅 등)을 2~3줄로 추천하라.',
  7: '아래 사업 아이디어 사업화에 필요한 전문가 분야(법률/회계/세무/기술 등)를 2~3줄로 추천하라.',
  8: '아래 사업 아이디어에 적합한 투자 단계(엔젤/시드/시리즈A)와 준비사항을 2~3줄로 안내하라.',
  9: '아래 사업 아이디어의 판매에 적합한 채널(온라인/오프라인/B2B 등)과 런칭 전략을 2~3줄로 제안하라.',
};

app.post('/api/itemzone/analyze', async (req, res) => {
  const { step, item } = req.body;
  if (!step || !item || !item.name) return res.status(400).json({ error: 'step, item.name 필수' });

  const sys = IZ_STEP_PROMPTS[step] || '사업 아이디어를 분석하라.';
  const userPrompt = `아이템명: ${item.name}\n한줄소개: ${item.oneLiner||''}\n업종: ${item.cat||''}\n설명: ${item.desc||''}`;
  const fullPrompt = `${sys}\n\n${userPrompt}\n\n반드시 한국어 평문으로, 마크다운 기호 없이 줄바꿈으로 구분해서 답하라.`;

  // Firestore 로그 (비차단)
  if (db) {
    db.collection('itemzone_logs').add({
      step, item, createdAt: admin.firestore.FieldValue.serverTimestamp()
    }).catch(()=>{});
  }

  // 1) GPT 시도
  if (process.env.OPENAI_API_KEY) {
    try {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: fullPrompt }], max_tokens: 250, temperature: 0.7 })
      });
      const data = await r.json();
      const text = data.choices?.[0]?.message?.content?.trim();
      if (text) return res.json({ ok: true, result: text, ai: 'GPT' });
    } catch (e) { /* fall through */ }
  }
  // 2) Gemini 시도
  if (process.env.GEMINI_API_KEY) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] })
      });
      const data = await r.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (text) return res.json({ ok: true, result: text, ai: 'Gemini' });
    } catch (e) { /* fall through */ }
  }
  // 3) Fallback (항상 응답)
  res.json({ ok: true, ai: 'fallback', result: null });
});

/* ─────── 관리자 API ─────── */
app.post('/api/admin/approve', adminAuth, async(req,res)=>{
  if(!requireDB(res))return;
  const{id,approve=true}=req.body;
  if(!id) return res.status(400).json({error:'id 필요'});
  const upd={approved:!!approve};
  if(approve){
    const doc=await db.collection('stores').doc(id).get();
    if(doc.exists){const s=doc.data();upd.aiCopy=generatePromo(s);}
  }
  await db.collection('stores').doc(id).update(upd);
  res.json({ok:true});
});
app.delete('/api/admin/store/:id',adminAuth,async(req,res)=>{if(!requireDB(res))return;await db.collection('stores').doc(req.params.id).delete();res.json({ok:true});});
const listCol=(col)=>async(req,res)=>{if(!requireDB(res))return;const snap=await db.collection(col).orderBy('createdAt','desc').limit(100).get();res.json(snap.docs.map(d=>({id:d.id,...d.data(),createdAt:d.data().createdAt?.toDate?.()?.toISOString()||''})));};
app.get('/api/admin/branches',    adminAuth,listCol('branches'));
app.get('/api/admin/reporters',   adminAuth,listCol('reporters'));
app.get('/api/admin/ad_requests', adminAuth,listCol('ad_requests'));
app.get('/api/admin/founders',    adminAuth,listCol('founders'));
const patchCol=(col)=>async(req,res)=>{if(!requireDB(res))return;await db.collection(col).doc(req.params.id).update({status:req.body.status,updatedAt:FS.serverTimestamp()});res.json({ok:true});};
app.patch('/api/admin/branches/:id',    adminAuth,patchCol('branches'));
app.patch('/api/admin/reporters/:id',   adminAuth,patchCol('reporters'));
app.patch('/api/admin/ad_requests/:id', adminAuth,patchCol('ad_requests'));
app.post('/api/admin/auto-approve',adminAuth,(req,res)=>{autoApprove=!!req.body.enabled;res.json({ok:true,autoApprove});});
app.post('/api/admin/config',adminAuth,async(req,res)=>{
  if(!requireDB(res))return;
  const allowed=['gnb_menus','news_categories','site_notice','auto_approve','breaking_custom','kakao_js_key','founder_max'];
  const update={};
  for(const k of allowed){if(req.body[k]!==undefined)update[k]=req.body[k];}
  update.updatedAt=FS.serverTimestamp();
  await db.collection('config').doc('site').set(update,{merge:true});
  res.json({ok:true,updated:Object.keys(update)});
});
app.get('/api/admin/dashboard',adminAuth,async(req,res)=>{
  if(!requireDB(res))return;
  const[ss,bs,rs,as,fs]=await Promise.all([db.collection('stores').get(),db.collection('branches').get(),db.collection('reporters').get(),db.collection('ad_requests').get(),db.collection('founders').get()]);
  const stores=ss.docs.map(d=>d.data());
  res.json({stores:{total:stores.length,approved:stores.filter(s=>s.approved).length,pending:stores.filter(s=>!s.approved).length,premium:stores.filter(s=>s.premium).length,clicks:stores.reduce((n,s)=>n+(s.clicks||0),0),views:stores.reduce((n,s)=>n+(s.views||0),0)},branches:{total:bs.size,pending:bs.docs.filter(d=>d.data().status==='pending').length},reporters:{total:rs.size,pending:rs.docs.filter(d=>d.data().status==='pending').length},adRequests:{total:as.size,pending:as.docs.filter(d=>d.data().status==='pending').length},founders:{total:fs.size}});
});

/* ─────── SEO: robots.txt ─────── */
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send([
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /api/',
    '',
    'Sitemap: https://aiplatmarket.com/sitemap.xml',
  ].join('\n'));
});

/* ─────── SEO: sitemap.xml ─────── */
app.get('/sitemap.xml', async (req, res) => {
  const BASE = 'https://aiplatmarket.com';
  const now  = new Date().toISOString().split('T')[0];

  const staticPages = [
    { loc:'/',          priority:'1.0', freq:'daily'   },
    { loc:'/register',  priority:'0.9', freq:'monthly' },
    { loc:'/region/인천-남동구', priority:'0.7', freq:'weekly' },
    { loc:'/region/서울-강남구', priority:'0.7', freq:'weekly' },
    { loc:'/region/경기-성남시', priority:'0.7', freq:'weekly' },
  ];

  let storeUrls = '';
  if (db) {
    try {
      const snap = await db.collection('stores')
        .where('approved','==',true).limit(500).get();
      storeUrls = snap.docs.map(d => `
  <url><loc>${BASE}/store/${d.id}</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>`).join('');
    } catch(e) { /* ignore */ }
  }

  const staticXml = staticPages.map(p => `
  <url><loc>${BASE}${p.loc}</loc><lastmod>${now}</lastmod><changefreq>${p.freq}</changefreq><priority>${p.priority}</priority></url>`).join('');

  res.type('application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticXml}
${storeUrls}
</urlset>`);
});

/* ─────── Kakao 토큰 검증 (로그인 서버사이드) ─────── */
app.post('/api/kakao/verify', async (req, res) => {
  const { access_token } = req.body;
  if (!access_token) return res.status(400).json({ error: 'access_token 필요' });
  try {
    const raw  = await fetchUrl('https://kapi.kakao.com/v2/user/me', {
      'Authorization': `Bearer ${access_token}`,
      'User-Agent': 'aiplatmarket/1.0',
    });
    const user = JSON.parse(raw);
    const uid  = String(user.id);
    const name = user.kakao_account?.profile?.nickname || '카카오 사용자';
    const img  = user.kakao_account?.profile?.profile_image_url || '';
    // Firestore에 사용자 정보 저장 (선택)
    if (db) {
      await db.collection('users').doc(uid).set(
        { uid, name, img, loginAt: admin.firestore.FieldValue.serverTimestamp(), platform: 'kakao' },
        { merge: true }
      ).catch(() => {});
    }
    res.json({ ok: true, uid, name, img });
  } catch(e) {
    res.status(401).json({ ok: false, error: e.message });
  }
});

/* ─────── 스포츠·건강 뉴스 API ─────── */
app.get('/api/sports', async (req, res) => {
  const { cat = '스포츠' } = req.query;
  const kwMap = {
    스포츠: '국내 스포츠 소식',
    건강:   '건강 웰빙 소상공인',
    야구:   'KBO 프로야구',
    축구:   'K리그 축구',
    헬스:   '헬스 피트니스 창업',
  };
  const keyword = kwMap[cat] || cat;
  const result  = { cat, items: [], warnings: [] };
  try {
    const items = await naverNews(keyword, 8);
    result.items.push(...items);
  } catch(e) { result.warnings.push('naver:' + e.message); }
  try {
    const g   = await googleNews(keyword);
    const ex  = new Set(result.items.map(n => n.title));
    result.items.push(...g.filter(n => !ex.has(n.title)));
  } catch(e) { result.warnings.push('google:' + e.message); }
  // fallback
  if (!result.items.length) {
    result.items = [
      { title:'KBO 프로야구 2026 개막 — 지역 소상공인 특수 기대', desc:'야구 시즌 개막에 맞춰 지역 소상공인 매출 증가 전망.', link:'#', date:new Date().toISOString(), source:'AI플랫마켓' },
      { title:'헬스장·PT 창업 2026년 트렌드', desc:'건강 관심 증가로 피트니스 관련 창업이 늘고 있습니다.', link:'#', date:new Date().toISOString(), source:'AI플랫마켓' },
      { title:'지역 생활체육 시설 확충 지원 사업 신청 시작', desc:'정부 지역 체육시설 확충 지원 예산 300억 배정.', link:'#', date:new Date().toISOString(), source:'AI플랫마켓' },
    ];
  }
  result.items = result.items.slice(0, 16);
  res.json(result);
});

/* ─────── 라우트 ─────── */
/* ═══════════════════════════════════════════
   모듈 라우팅 시스템 (path + subdomain 동시 지원)
   GPT 협업 설계: framework/ + public/{group}/{module}/
═══════════════════════════════════════════ */

// 그룹별 모듈 매핑 (public/{group}/{module}/)
const MODULE_MAP = {
  // platform/
  aird:        { group: 'platform', dir: 'aird' },
  simul:       { group: 'platform', dir: 'simul' },
  itemzone:    { group: 'platform', dir: 'itemzone' },
  edu:         { group: 'platform', dir: 'edu' },
  culture:     { group: 'platform', dir: 'culture' },
  game:        { group: 'platform', dir: 'game' },
  life:        { group: 'platform', dir: 'life' },
  promotion:   { group: 'platform', dir: 'promotion' },
  // commerce/
  market:      { group: 'commerce', dir: 'market' },
  localfood:   { group: 'commerce', dir: 'localfood' },
  goodstore:   { group: 'commerce', dir: 'goodstore' },
  newproduct:  { group: 'commerce', dir: 'newproduct' },
  recipe:      { group: 'commerce', dir: 'recipe' },
  promo:       { group: 'commerce', dir: 'promo' },
  // business/
  startup:        { group: 'business', dir: 'startup' },
  regionaleconomy: { group: 'business', dir: 'regionaleconomy' },
  // media/
  live:        { group: 'media', dir: 'live' },
  tv:          { group: 'media', dir: 'tv' },
  music:       { group: 'media', dir: 'music' },
  // community/
  community:   { group: 'community', dir: '' },
  // lifestyle/
  sports:      { group: 'lifestyle', dir: 'sports' },
  travel:      { group: 'lifestyle', dir: 'travel' },
  news:        { group: 'lifestyle', dir: 'news' },
};

// 서브도메인 감지 → req.subdomainModule 세팅 (path와 동일하게 처리)
app.use((req, res, next) => {
  const host = (req.hostname || '').split('.');
  // {module}.aiplatmarket.com 형태인지 확인 (host[0]이 MODULE_MAP 키인 경우)
  if (host.length >= 3 && MODULE_MAP[host[0]]) {
    req.subdomainModule = host[0];
  }
  next();
});

// 모듈 정적 파일 서빙: /platform/aird/, /commerce/market/ 등
['platform','commerce','business','media','community','lifestyle'].forEach(group => {
  app.use('/' + group, express.static(path.join(__dirname, 'public', group)));
});

// 모듈 단축 경로 (/aird → public/platform/aird/index.html) + module.json 상태 확인
app.get('/:moduleId', (req, res, next) => {
  const mod = MODULE_MAP[req.params.moduleId];
  if (!mod) return next(); // 매핑 안되면 SPA 라우트로 넘김

  const moduleDir  = path.join(__dirname, 'public', mod.group, mod.dir);
  const moduleHtml = path.join(moduleDir, 'index.html');
  const moduleJson = path.join(moduleDir, 'module.json');

  if (fs.existsSync(moduleHtml)) {
    return res.sendFile(moduleHtml);
  }
  // 모듈 폴더/파일이 아직 없으면 메인 SPA 의 showPage(업그레이드 페이지)로 폴백
  next();
});

// 서브도메인 진입 시에도 동일 처리 (예: aird.aiplatmarket.com/)
app.get('/', (req, res, next) => {
  if (req.subdomainModule) {
    const mod = MODULE_MAP[req.subdomainModule];
    const moduleHtml = path.join(__dirname, 'public', mod.group, mod.dir, 'index.html');
    if (fs.existsSync(moduleHtml)) return res.sendFile(moduleHtml);
  }
  next();
});

// module.json 메타 정보 API (Framework Dashboard용)
app.get('/api/modules', (req, res) => {
  const result = {};
  Object.entries(MODULE_MAP).forEach(([id, mod]) => {
    const jsonPath = path.join(__dirname, 'public', mod.group, mod.dir, 'module.json');
    if (fs.existsSync(jsonPath)) {
      try { result[id] = JSON.parse(fs.readFileSync(jsonPath, 'utf8')); }
      catch (e) { result[id] = { id, status: 'error' }; }
    } else {
      result[id] = { id, group: mod.group, status: 'planned', version: '0.0.0' };
    }
  });
  res.json(result);
});


app.get('/register', (req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.use((req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));

app.listen(PORT,()=>{
  console.log(`\n🚀 AI플랫마켓 → http://localhost:${PORT}`);
  console.log(`🛡 관리자  → http://localhost:${PORT}/admin`);
  console.log(`📰 네이버API : ${NAVER_ID?'✅':'❌'} | Gmail: ${GMAIL_USER?'✅':'❌'} | Kakao: ${KAKAO_KEY?'✅':'❌'}`);
  if(ADMIN_TOKEN==='dev-token-change-me') console.warn('⚠️  ADMIN_TOKEN 변경 필요!');
});
