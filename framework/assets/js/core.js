/* ═══════════════════════════════════════════
   AI플랫마켓 Framework · core.js  (v2.0.0)
   ─────────────────────────────────────────────
   모든 독립 모듈(lifemap, itemzone, eduzone, culture, gamezone, metazone,
   shop, paper, aird, simul 등)에 AI플랫마켓 표준 GNB(전체 카테고리
   드롭다운 포함)와 표준 Footer를 그대로 주입합니다.

   설계 원칙: 각 모듈 개발창은 <div id="fw-header"></div> /
   <div id="fw-footer"></div> 두 자리만 비워두면 되고, 본문
   (Main Content)만 프로젝트 특성에 맞게 구성하면 됩니다.
   GNB/Footer를 모듈마다 따로 만들 필요가 없습니다.

   독립 모듈은 SPA가 아니므로 메인의 showPage() 대신
   실제 URL(https://aiplatmarket.com/...)로 이동합니다.
═══════════════════════════════════════════ */

(function () {
  const BASE_URL = 'https://aiplatmarket.com';

  /* ── 공통 GNB — 메인 index.html의 gnb-cat-bar와 동일한 6+1개 카테고리 ── */
  function renderHeader() {
    const el = document.getElementById('fw-header');
    if (!el) return;
    el.innerHTML = `
      <div class="fw-topbar">
        <a class="fw-brand" href="${BASE_URL}/">AI<em>PLAT</em>MARKET</a>
        <a class="fw-home-link" href="${BASE_URL}/">← AI플랫마켓 홈으로</a>
      </div>
      <nav class="fw-gnb">
        <div class="fw-gcat">
          <button class="fw-gcbtn" onclick="AIPM.toggleCat(this)">🤖 AI 플랫폼 <span class="fw-caret">▾</span></button>
          <div class="fw-gcdrop">
            <a href="${BASE_URL}/aird" target="_blank" rel="noopener">🔬 AIR&amp;D</a>
            <a href="${BASE_URL}/simul" target="_blank" rel="noopener">🧪 AI시뮬레이션</a>
            <a href="${BASE_URL}/itemzone" target="_blank" rel="noopener">📦 AI아이템존</a>
            <a href="${BASE_URL}/#promo-center">🎯 AI통합홍보센터</a>
            <a href="${BASE_URL}/lifemap" target="_blank" rel="noopener">🔮 AI인생·진로 체험존</a>
            <a href="${BASE_URL}/eduzone" target="_blank" rel="noopener">📚 AI교육존</a>
            <a href="${BASE_URL}/culture" target="_blank" rel="noopener">🎨 AI문화예술</a>
            <a href="${BASE_URL}/#videocenter">🎬 AI영상생성</a>
            <a href="${BASE_URL}/gamezone" target="_blank" rel="noopener">🎮 AI게임존</a>
            <a href="${BASE_URL}/metazone" target="_blank" rel="noopener">🌐 AI메타존</a>
            <a href="${BASE_URL}/shop" target="_blank" rel="noopener">🛍️ AI더착한쇼핑(몰)</a>
          </div>
        </div>
        <div class="fw-gcat">
          <button class="fw-gcbtn" onclick="AIPM.toggleCat(this)">🛍 Commerce <span class="fw-caret">▾</span></button>
          <div class="fw-gcdrop">
            <a href="${BASE_URL}/#growthmall">📈 AI성장+마켓몰</a>
            <a href="${BASE_URL}/#local-products">🌾 지역특산품관</a>
            <a href="${BASE_URL}/#good">💚 더착한가게</a>
            <a href="${BASE_URL}/#newprod">🆕 더착한상품</a>
            <a href="${BASE_URL}/#recipe">👨‍🍳 뉴레시피</a>
          </div>
        </div>
        <div class="fw-gcat">
          <button class="fw-gcbtn" onclick="AIPM.toggleCat(this)">💼 Business <span class="fw-caret">▾</span></button>
          <div class="fw-gcdrop">
            <a href="${BASE_URL}/#startup">🚀 사업창업</a>
            <a href="${BASE_URL}/#localcenter">🏛 AI지역경제센터</a>
            <a href="https://www.semas.or.kr" target="_blank" rel="noopener">🏛 소상공인시장진흥공단</a>
          </div>
        </div>
        <div class="fw-gcat">
          <button class="fw-gcbtn" onclick="AIPM.toggleCat(this)">💬 Community <span class="fw-caret">▾</span></button>
          <div class="fw-gcdrop">
            <a href="${BASE_URL}/#community">💬 커뮤니티</a>
          </div>
        </div>
        <div class="fw-gcat">
          <button class="fw-gcbtn" onclick="AIPM.toggleCat(this)">📺 Media <span class="fw-caret">▾</span></button>
          <div class="fw-gcdrop">
            <a href="${BASE_URL}/#live">📺 LIVE 홈쇼핑</a>
          </div>
        </div>
        <div class="fw-gcat">
          <button class="fw-gcbtn" onclick="AIPM.toggleCat(this)">🌿 Lifestyle <span class="fw-caret">▾</span></button>
          <div class="fw-gcdrop">
            <a href="${BASE_URL}/#sports">⚽ 스포츠&amp;건강</a>
            <a href="${BASE_URL}/#travel">✈️ 여행</a>
            <a href="${BASE_URL}/#news">📰 지역경제뉴스</a>
            <a href="${BASE_URL}/#global">🌐 글로벌경제</a>
          </div>
        </div>
        <div class="fw-gcat">
          <button class="fw-gcbtn" onclick="AIPM.toggleCat(this)">📰 디지털신문 <span class="fw-caret">▾</span></button>
          <div class="fw-gcdrop">
            <a href="${BASE_URL}/paper" target="_blank" rel="noopener">🗞️ 국민경제㊉ 신문</a>
          </div>
        </div>
        <div class="fw-gnb-right">
          <a class="fw-btn-reg" href="${BASE_URL}/#register">✅ 입점신청</a>
          <a class="fw-btn-chat" href="https://chatdoumi.com" target="_blank" rel="noopener">🤖 챗도우미</a>
        </div>
      </nav>`;
  }

  /* ── 공통 Footer — 메인 index.html의 footer와 동일한 정보 구조 ── */
  function renderFooter() {
    const el = document.getElementById('fw-footer');
    if (!el) return;
    el.innerHTML = `
      <div class="fw-footer">
        <div class="fw-footer-inner">
          <div class="fw-footer-brand">
            <div class="fw-footer-logo">AI PLATMARKET · 월간 국민경제㊉</div>
            <div class="fw-footer-sub">소상공인+소비자 상생 플랫폼</div>
            <div class="fw-footer-info">
              © 2026 <strong>22세기대한</strong>. All rights reserved.<br>
              대표: 김형식 &nbsp;|&nbsp; 발행인 겸 편집인: 김형식 &nbsp;|&nbsp; 월간지 등록번호:부평, 라00025<br>
              사업자등록번호: 227-18-34338<br>
              주소: 인천광역시 부평구 항동로 33번길 36-11 1층 &nbsp;|&nbsp; TEL: 0505-505-9000
            </div>
          </div>
          <div class="fw-footer-links">
            <a href="${BASE_URL}/#about">서비스 소개</a>
            <a href="#" onclick="AIPM.showPreview();return false">🚀 프리뷰 보기</a>
            <a href="${BASE_URL}/#terms">이용약관</a>
            <a href="${BASE_URL}/#privacy">개인정보처리방침</a>
            <a href="${BASE_URL}/#community">커뮤니티</a>
            <a href="#" onclick="AIPM.openFeedback();return false">💡 불편사항·개선 제안</a>
          </div>
        </div>
      </div>`;
  }

  /* ── 스타일 주입 (모듈 자체 CSS와 충돌하지 않도록 fw- 접두사만 사용) ── */
  function injectStyle() {
    if (document.getElementById('apm-fw-style')) return;
    const style = document.createElement('style');
    style.id = 'apm-fw-style';
    style.textContent = `
      .fw-topbar{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:#0d1f35}
      .fw-brand{font-weight:900;font-size:1.05rem;color:#fff;text-decoration:none}
      .fw-brand em{color:#c9a84c;font-style:normal}
      .fw-home-link{font-size:.76rem;color:rgba(255,255,255,.7);text-decoration:none}
      .fw-home-link:hover{color:#c9a84c}
      .fw-gnb{display:flex;align-items:center;background:linear-gradient(135deg,#15603e,#0e4a30);
        overflow-x:auto;scrollbar-width:none;min-height:38px}
      .fw-gnb::-webkit-scrollbar{display:none}
      .fw-gcat{position:relative;flex-shrink:0}
      .fw-gcbtn{display:flex;align-items:center;gap:4px;padding:9px 13px;background:transparent;border:none;
        color:rgba(255,255,255,.85);font-size:.75rem;font-weight:700;cursor:pointer;white-space:nowrap;
        font-family:inherit}
      .fw-gcbtn:hover{background:rgba(255,255,255,.13);color:#fff}
      .fw-caret{font-size:.6rem;opacity:.7}
      .fw-gcdrop{display:none;position:absolute;top:100%;left:0;background:#fff;border:1px solid #d0d5dd;
        border-radius:0 0 10px 10px;box-shadow:0 12px 32px rgba(13,31,53,.14);z-index:9999;min-width:200px;
        padding:8px;flex-direction:column}
      .fw-gcat.open .fw-gcdrop{display:flex}
      .fw-gcdrop a{padding:8px 10px;border-radius:7px;font-size:.78rem;color:#0d1f35;text-decoration:none;
        white-space:nowrap}
      .fw-gcdrop a:hover{background:#f0f4ff}
      .fw-gnb-right{margin-left:auto;display:flex;gap:6px;padding:0 10px;flex-shrink:0}
      .fw-btn-reg,.fw-btn-chat{padding:5px 11px;border-radius:5px;font-size:.7rem;font-weight:700;
        text-decoration:none;white-space:nowrap}
      .fw-btn-reg{background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.4);color:#fff}
      .fw-btn-chat{background:rgba(201,168,76,.18);border:1px solid rgba(201,168,76,.45);color:#c9a84c}
      .fw-footer{background:#0d1f35;color:rgba(255,255,255,.65);margin-top:40px}
      .fw-footer-inner{max-width:1200px;margin:0 auto;padding:28px 24px;display:flex;justify-content:space-between;
        gap:24px;flex-wrap:wrap}
      .fw-footer-logo{font-weight:900;color:#fff;font-size:.95rem}
      .fw-footer-sub{color:rgba(255,255,255,.5);margin:2px 0 8px;font-size:.8rem}
      .fw-footer-info{font-size:.7rem;line-height:1.9;color:rgba(255,255,255,.45)}
      .fw-footer-info strong{color:rgba(255,255,255,.65)}
      .fw-footer-links{display:flex;gap:12px;flex-wrap:wrap;align-content:flex-start}
      .fw-footer-links a{font-size:.73rem;color:rgba(255,255,255,.65);text-decoration:none}
      .fw-footer-links a:hover{color:#c9a84c}
      @media(max-width:700px){.fw-gnb-right{display:none}}
    `;
    document.head.appendChild(style);
  }

  /* 드롭다운 토글 (모듈 페이지는 독립적이므로 전역 closeCats 없이 자체 구현) */
  function toggleCat(btn) {
    const cat = btn.closest('.fw-gcat');
    document.querySelectorAll('.fw-gcat.open').forEach(c => { if (c !== cat) c.classList.remove('open'); });
    cat.classList.toggle('open');
  }
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.fw-gcat')) document.querySelectorAll('.fw-gcat.open').forEach(c => c.classList.remove('open'));
  });

  function showPreview() {
    window.open(BASE_URL + '/', '_blank');
  }
  function openFeedback() {
    // 독립 모듈 페이지에도 feedback-manager.js가 로드돼 있으면 그대로 사용, 없으면 메인으로 이동
    if (typeof FeedbackManager !== 'undefined') {
      FeedbackManager.open(document.body.dataset.moduleId || 'general');
    } else {
      window.open(BASE_URL + '/', '_blank');
    }
  }

  // 모듈 상태(module.json) 조회 — 대시보드/디버깅용
  async function fetchModuleStatus(moduleId) {
    try {
      const res = await fetch(`${BASE_URL}/api/modules`);
      const data = await res.json();
      return data[moduleId] || null;
    } catch (e) { return null; }
  }

  window.AIPM = { BASE_URL, fetchModuleStatus, toggleCat, showPreview, openFeedback };

  document.addEventListener('DOMContentLoaded', function () {
    injectStyle();
    renderHeader();
    renderFooter();
  });
})();
