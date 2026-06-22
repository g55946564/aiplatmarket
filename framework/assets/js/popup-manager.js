/* ═══════════════════════════════════════════════════════
   AI플랫마켓 Framework · Popup Manager (popup-manager.js)
   ─────────────────────────────────────────────────────
   목적: "플랫폼 안내 팝업"을 시작으로, 향후 공지사항·업데이트·
        새 프로젝트·이벤트·새 기능 안내까지 동일한 구조로 재사용할
        수 있는 공통 팝업 매니저입니다.

   사용법 (메인 사이트/모듈 어디서든 동일):
     <script src="/framework/assets/js/popup-manager.js"></script>
     <script>
       window.addEventListener('load', () => PopupManager.show('intro'));
     </script>

   설계 원칙:
   - 기존 페이지의 어떤 함수/CSS도 건드리지 않는다 (완전히 독립된 모듈).
   - 서버 설정(/api/popup-config)이 없거나 실패해도, 내장 기본값으로
     항상 정상 동작한다 (Rule 기반 폴백 — AI Core의 설계 철학과 동일).
   - "오늘 하루 / 7일간 / 다음 업데이트까지 보지 않기"는 localStorage에
     저장하고, 단순 "닫기"는 저장하지 않아 다음 방문 때 다시 보여준다.
   - key("intro", "notice" 등)를 바꿔 호출하면 같은 매니저로 다른 팝업도
     띄울 수 있다 (재사용성 확보).
═══════════════════════════════════════════════════════ */

(function () {

  /* 서버 설정을 못 가져올 때 사용하는 내장 기본값 (intro 키 전용 안전망) */
  const BUILTIN_FALLBACK = {
    intro: {
      enabled: true,
      version: '2026.06.19',
      title: '🚀 AI플랫마켓 프리뷰 서비스',
      body: 'AI플랫마켓에 오신 것을 환영합니다.\n\n사람이 중심이고, AI는 사람의 발전을 돕습니다.\n\n현재는 프리뷰 서비스 단계이며, 기능들이 계속 추가되고 있습니다.',
      progress: [
        { name: 'AI Core', status: '완료' },
        { name: 'Framework', status: '완료' },
      ],
      buttons: { primary: 'AI플랫마켓 둘러보기', secondary: '새로운 기능 보기', close: '닫기' },
      slogan: '사람이 중심이고, AI는 사람의 발전을 돕습니다. 참여가 곧 일이며, 참여가 곧 사업이 되는 AI플랫폼.',
      sloganSub: 'AI플랫마켓은 사람과 AI가 함께 성장하는 진화형 플랫폼입니다.',
    },
  };

  const LS_PREFIX = 'apm_popup_';

  /* ── localStorage 기반 "다시 보지 않기" 상태 관리 ── */
  function readDismiss(key) {
    try { return JSON.parse(localStorage.getItem(LS_PREFIX + key) || 'null'); }
    catch (e) { return null; }
  }
  function writeDismiss(key, data) {
    try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(data)); } catch (e) {}
  }
  function shouldShow(key, version) {
    const d = readDismiss(key);
    if (!d) return true;
    if (d.untilVersion && d.untilVersion === version) return false; // 다음 업데이트까지 — 버전 그대로면 숨김
    if (d.until && Date.now() < d.until) return false;               // 오늘하루/7일 — 기간 안 지났으면 숨김
    return true;
  }
  function dismiss(key, mode, version) {
    if (mode === 'today') {
      const end = new Date(); end.setHours(23, 59, 59, 999);
      writeDismiss(key, { until: end.getTime() });
    } else if (mode === '7days') {
      writeDismiss(key, { until: Date.now() + 7 * 24 * 60 * 60 * 1000 });
    } else if (mode === 'untilUpdate') {
      writeDismiss(key, { untilVersion: version });
    }
    // mode === 'close' (체크박스 없이 닫기) → 저장하지 않음, 다음 방문 시 다시 표시
  }

  /* ── 진행률 배지 색상 ── */
  function statusBadge(status) {
    const map = {
      '완료':   { bg: '#e1f5ee', fg: '#0d5c36' },
      '진행중': { bg: '#fdf2dc', fg: '#8a6210' },
      '예정':   { bg: '#eceef1', fg: '#5d6470' },
    };
    const c = map[status] || map['예정'];
    return `<span style="background:${c.bg};color:${c.fg};font-size:.68rem;font-weight:700;padding:2px 9px;border-radius:20px;flex-shrink:0">${status}</span>`;
  }

  /* ── 팝업 HTML 빌드 ── */
  function buildHTML(key, cfg) {
    const progressRows = (cfg.progress || []).map(p =>
      `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.08)">
         <span style="font-size:.8rem;color:#dfe6ee">${p.name}</span>${statusBadge(p.status)}
       </div>`
    ).join('');

    const bodyHtml = (cfg.body || '').split('\n').map(line =>
      line.trim() ? `<p style="margin:4px 0">${line}</p>` : `<div style="height:6px"></div>`
    ).join('');

    return `
    <div class="apm-pop-backdrop" id="apmPopBackdrop-${key}">
      <div class="apm-pop-card">
        <button class="apm-pop-x" aria-label="닫기" onclick="PopupManager.close('${key}','close')">✕</button>

        <div class="apm-pop-hd">${cfg.title || ''}</div>

        <div class="apm-pop-body">${bodyHtml}</div>

        ${cfg.progress && cfg.progress.length ? `
        <div class="apm-pop-progress">
          <div style="font-size:.72rem;color:#9fb0c4;font-weight:700;margin-bottom:6px;letter-spacing:.04em">현재 개발 진행 현황</div>
          ${progressRows}
        </div>` : ''}

        <div class="apm-pop-btns">
          <button class="apm-pop-btn primary" onclick="PopupManager.close('${key}','today');PopupManager.afterPrimary && PopupManager.afterPrimary()">${cfg.buttons?.primary || '둘러보기'}</button>
          <button class="apm-pop-btn secondary" onclick="PopupManager.close('${key}','today');PopupManager.afterSecondary && PopupManager.afterSecondary()">${cfg.buttons?.secondary || '새로운 기능 보기'}</button>
        </div>

        <div class="apm-pop-checks">
          <label><input type="checkbox" onchange="PopupManager._toggleExclusive(this,'${key}','today')"> 오늘 하루 보지 않기</label>
          <label><input type="checkbox" onchange="PopupManager._toggleExclusive(this,'${key}','7days')"> 7일간 보지 않기</label>
          <label><input type="checkbox" onchange="PopupManager._toggleExclusive(this,'${key}','untilUpdate')"> 다음 업데이트까지 보지 않기</label>
        </div>

        <div class="apm-pop-close-row">
          <button class="apm-pop-textbtn" onclick="PopupManager.close('${key}','close')">${cfg.buttons?.close || '닫기'}</button>
        </div>

        ${cfg.slogan ? `
        <div class="apm-pop-slogan">
          <div class="apm-pop-slogan-main">${cfg.slogan}</div>
          ${cfg.sloganSub ? `<div class="apm-pop-slogan-sub">${cfg.sloganSub}</div>` : ''}
        </div>` : ''}
      </div>
    </div>`;
  }

  /* ── 1회만 주입되는 공통 스타일 ── */
  function injectStyleOnce() {
    if (document.getElementById('apmPopupStyle')) return;
    const style = document.createElement('style');
    style.id = 'apmPopupStyle';
    style.textContent = `
      .apm-pop-backdrop{position:fixed;inset:0;background:rgba(8,16,28,.6);z-index:8000;
        display:flex;align-items:center;justify-content:center;padding:18px;
        opacity:0;transition:opacity .25s ease;}
      .apm-pop-backdrop.show{opacity:1;}
      .apm-pop-card{background:linear-gradient(160deg,#0d1f35,#142b48);color:#fff;
        max-width:420px;width:100%;max-height:90vh;overflow-y:auto;border-radius:16px;
        padding:26px 22px 20px;position:relative;box-shadow:0 24px 60px rgba(0,0,0,.4);
        border:1px solid rgba(201,168,76,.25);
        transform:scale(.94) translateY(8px);transition:transform .25s ease;}
      .apm-pop-backdrop.show .apm-pop-card{transform:scale(1) translateY(0);}
      .apm-pop-x{position:absolute;top:14px;right:14px;background:rgba(255,255,255,.08);
        border:none;color:#cdd6e0;width:26px;height:26px;border-radius:50%;cursor:pointer;
        font-size:.8rem;line-height:1;}
      .apm-pop-x:hover{background:rgba(255,255,255,.18);}
      .apm-pop-hd{font-size:1.05rem;font-weight:900;margin-bottom:10px;color:#f4d98e;
        letter-spacing:.2px;}
      .apm-pop-body{font-size:.82rem;line-height:1.55;color:#e3e9f0;margin-bottom:14px;}
      .apm-pop-progress{background:rgba(255,255,255,.05);border-radius:10px;padding:12px 14px;
        margin-bottom:16px;}
      .apm-pop-btns{display:flex;gap:8px;margin-bottom:10px;}
      .apm-pop-btn{flex:1;border:none;border-radius:8px;padding:10px 8px;font-size:.78rem;
        font-weight:800;cursor:pointer;font-family:inherit;transition:opacity .15s;}
      .apm-pop-btn:hover{opacity:.88;}
      .apm-pop-btn.primary{background:#c9a84c;color:#1a1206;}
      .apm-pop-btn.secondary{background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.25);}
      .apm-pop-checks{display:flex;flex-direction:column;gap:6px;font-size:.72rem;color:#aab8cb;
        margin-bottom:8px;}
      .apm-pop-checks label{display:flex;align-items:center;gap:6px;cursor:pointer;}
      .apm-pop-close-row{text-align:center;margin-bottom:14px;}
      .apm-pop-textbtn{background:none;border:none;color:#8aa0bc;font-size:.74rem;
        text-decoration:underline;cursor:pointer;font-family:inherit;}
      .apm-pop-slogan{border-top:1px solid rgba(255,255,255,.12);padding-top:12px;text-align:center;}
      .apm-pop-slogan-main{font-size:.74rem;color:#f4d98e;font-weight:700;line-height:1.5;}
      .apm-pop-slogan-sub{font-size:.64rem;color:#8094ab;margin-top:4px;}
      @media(max-width:420px){.apm-pop-card{padding:22px 16px 16px;border-radius:12px;}}
    `;
    document.head.appendChild(style);
  }

  /* ── 체크박스 3개 중 하나만 선택되게 + 즉시 닫기 ── */
  function toggleExclusive(checkboxEl, key, mode) {
    if (!checkboxEl.checked) return;
    const container = checkboxEl.closest('.apm-pop-checks');
    container.querySelectorAll('input[type=checkbox]').forEach(cb => { if (cb !== checkboxEl) cb.checked = false; });
    PopupManager.close(key, mode);
  }

  /* ── 공개 API ── */
  const PopupManager = {
    _configCache: {},

    async show(key, opts) {
      opts = opts || {};
      injectStyleOnce();

      let cfg = this._configCache[key];
      if (!cfg) {
        try {
          const r = await fetch('/api/popup-config?key=' + encodeURIComponent(key));
          const d = await r.json();
          cfg = d.config || BUILTIN_FALLBACK[key];
        } catch (e) {
          cfg = BUILTIN_FALLBACK[key];
        }
        this._configCache[key] = cfg;
      }
      if (!cfg || cfg.enabled === false) return;
      if (!opts.force && !shouldShow(key, cfg.version)) return;

      // 이미 떠 있으면 중복 표시하지 않음
      if (document.getElementById('apmPopBackdrop-' + key)) return;

      const wrap = document.createElement('div');
      wrap.innerHTML = buildHTML(key, cfg);
      document.body.appendChild(wrap.firstElementChild);

      requestAnimationFrame(() => {
        const el = document.getElementById('apmPopBackdrop-' + key);
        if (el) el.classList.add('show');
      });

      if (typeof opts.afterPrimary === 'function') this.afterPrimary = opts.afterPrimary;
      if (typeof opts.afterSecondary === 'function') this.afterSecondary = opts.afterSecondary;
    },

    close(key, mode) {
      const cfg = this._configCache[key];
      if (mode && mode !== 'close') dismiss(key, mode, cfg ? cfg.version : null);
      const el = document.getElementById('apmPopBackdrop-' + key);
      if (!el) return;
      el.classList.remove('show');
      setTimeout(() => el.remove(), 250);
    },

    _toggleExclusive: toggleExclusive,

    /* 관리자 화면 등에서 캐시를 비우고 강제로 다시 띄워볼 때 사용 */
    reset(key) { delete this._configCache[key]; },
  };

  window.PopupManager = PopupManager;
})();
