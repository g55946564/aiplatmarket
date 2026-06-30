/* ═══════════════════════════════════════════════════════
   AI플랫마켓 Framework · Feedback Manager (feedback-manager.js)
   ─────────────────────────────────────────────────────
   목적: lifemap, itemzone, community, media, aird, simul 등
        플랫폼의 모든 모듈이 동일한 피드백 채널을 공유하도록 하는
        독립 재사용 모듈입니다. (popup-manager.js와 동일한 설계 패턴)

   사용법 (어느 모듈에서든 동일):
     <script src="/framework/assets/js/feedback-manager.js"></script>
     <button onclick="FeedbackManager.open('lifemap')">불편사항·개선 제안</button>

   설계 철학 (01_VISION_PHILOSOPHY.md 직결):
   - 로그인을 강제하지 않는다. 비회원도 즉시 제출 가능, 이름은 선택.
   - 로그인 사용자에게는 "더 많은 혜택"을 자연스럽게 안내한다
     (제출 이력 관리·처리 상태 확인·공정기여도 누적) — 강요가 아닌 안내.
   - module 값을 항상 함께 보내 관리자가 모듈별로 모아볼 수 있게 한다.
═══════════════════════════════════════════════════════ */

(function () {

  function getCurrentUser() {
    try {
      const u = JSON.parse(localStorage.getItem('kakao_user') || localStorage.getItem('apm_user') || 'null');
      if (u) return u;
    } catch (e) {}
    const isAdmin = (function(){ try { return localStorage.getItem('apm_admin_logged') === 'true'; } catch(e){ return false; } })();
    if (isAdmin) return { name: '관리자', uid: 'admin' };
    return null;
  }

  function injectStyleOnce() {
    if (document.getElementById('apmFeedbackStyle')) return;
    const style = document.createElement('style');
    style.id = 'apmFeedbackStyle';
    style.textContent = `
      .apm-fb-backdrop{position:fixed;inset:0;background:rgba(13,31,53,.55);z-index:7000;
        display:flex;align-items:center;justify-content:center;padding:18px;
        opacity:0;transition:opacity .2s ease;}
      .apm-fb-backdrop.show{opacity:1;}
      .apm-fb-card{background:#fff;border-radius:16px;max-width:420px;width:100%;
        max-height:90vh;overflow-y:auto;box-shadow:0 24px 60px rgba(0,0,0,.25);
        transform:scale(.95) translateY(8px);transition:transform .2s ease;}
      .apm-fb-backdrop.show .apm-fb-card{transform:scale(1) translateY(0);}
      .apm-fb-hd{background:#c9a84c;color:#1a1206;padding:14px 18px;border-radius:16px 16px 0 0;
        display:flex;justify-content:space-between;align-items:center;font-weight:900;font-size:.95rem;}
      .apm-fb-hd-x{background:rgba(0,0,0,.1);border:none;width:24px;height:24px;border-radius:50%;
        cursor:pointer;font-size:.78rem;line-height:1;color:#1a1206;}
      .apm-fb-body{padding:18px;}
      .apm-fb-intro{font-size:.76rem;color:#8a8f98;line-height:1.6;margin:0 0 14px;}
      .apm-fb-lbl{font-size:.74rem;font-weight:700;color:#8a8f98;display:block;margin-bottom:4px;}
      .apm-fb-select,.apm-fb-input,.apm-fb-textarea{width:100%;border:1px solid #e8eaed;border-radius:7px;
        padding:9px 11px;font-size:.84rem;font-family:inherit;margin-bottom:12px;box-sizing:border-box;}
      .apm-fb-textarea{min-height:100px;resize:vertical;}
      .apm-fb-rating{display:flex;gap:6px;margin-bottom:12px;}
      .apm-fb-star{font-size:1.4rem;cursor:pointer;opacity:.3;transition:opacity .12s;}
      .apm-fb-star.active{opacity:1;}
      .apm-fb-submit{width:100%;background:#c9a84c;color:#1a1206;border:none;border-radius:8px;
        padding:11px;font-size:.84rem;font-weight:900;cursor:pointer;font-family:inherit;}
      .apm-fb-submit:hover{opacity:.9;}
      .apm-fb-login-hint{margin-top:12px;background:#f5f6f8;border-radius:8px;padding:10px 12px;
        font-size:.72rem;color:#5d6470;line-height:1.6;display:flex;gap:8px;align-items:flex-start;}
      .apm-fb-login-hint button{flex-shrink:0;background:#0d1f35;color:#fff;border:none;border-radius:5px;
        padding:5px 10px;font-size:.7rem;font-weight:700;cursor:pointer;font-family:inherit;}
      .apm-fb-thanks{text-align:center;padding:10px 4px 4px;}
      .apm-fb-thanks-ico{font-size:2.2rem;margin-bottom:8px;}
      .apm-fb-thanks-msg{font-size:.88rem;font-weight:700;color:#0d1f35;margin-bottom:4px;}
      .apm-fb-thanks-sub{font-size:.76rem;color:#8a8f98;line-height:1.6;margin-bottom:14px;}
    `;
    document.head.appendChild(style);
  }

  function buildFormHTML(moduleId) {
    const user = getCurrentUser();
    return `
    <div class="apm-fb-backdrop" id="apmFbBackdrop">
      <div class="apm-fb-card">
        <div class="apm-fb-hd">
          <span>💡 불편사항·개선 제안</span>
          <button class="apm-fb-hd-x" onclick="FeedbackManager.close()">✕</button>
        </div>
        <div class="apm-fb-body" id="apmFbBody">
          <p class="apm-fb-intro">이용 중 불편했던 점이나 개선 아이디어를 자유롭게 남겨주세요.
            ${user ? '' : '로그인 없이도 바로 제출되며, 이름은 입력하지 않으셔도 됩니다.'}</p>

          <label class="apm-fb-lbl">유형</label>
          <select class="apm-fb-select" id="apmFbType">
            <option value="불편사항">🐛 불편사항</option>
            <option value="개선제안">💡 개선 제안</option>
            <option value="오류신고">⚠️ 오류 신고</option>
            <option value="만족도">⭐ 만족도 평가</option>
            <option value="기타">💬 기타 의견</option>
          </select>

          <div id="apmFbRatingWrap" style="display:none">
            <label class="apm-fb-lbl">만족도</label>
            <div class="apm-fb-rating" id="apmFbRating">
              ${[1,2,3,4,5].map(n => `<span class="apm-fb-star" data-v="${n}" onclick="FeedbackManager._setRating(${n})">★</span>`).join('')}
            </div>
          </div>

          ${user ? '' : `
          <label class="apm-fb-lbl">이름 (선택)</label>
          <input class="apm-fb-input" id="apmFbName" placeholder="입력하지 않으면 '익명'으로 등록됩니다">
          `}

          <label class="apm-fb-lbl">내용 *</label>
          <textarea class="apm-fb-textarea" id="apmFbContent" placeholder="어떤 부분이 불편하셨는지, 어떻게 개선하면 좋을지 적어주세요."></textarea>

          <label class="apm-fb-lbl">연락처 (선택, 답변 원할 경우)</label>
          <input class="apm-fb-input" id="apmFbContact" placeholder="이메일 또는 카카오톡 ID" style="margin-bottom:6px">

          <button class="apm-fb-submit" onclick="FeedbackManager._submit('${moduleId}')">제출하기</button>

          ${user ? `
          <div class="apm-fb-login-hint">
            <span>✅</span>
            <span><b>${user.name}</b>님으로 제출됩니다. 제출 이력은 마이페이지에서 확인할 수 있습니다.</span>
          </div>` : `
          <div class="apm-fb-login-hint">
            <span>💡</span>
            <span>로그인하면 지금까지의 피드백 이력 관리, 처리 결과 확인, AI플랫마켓 공정기여도 누적 등
            다양한 기능을 이용할 수 있습니다.
            <button onclick="FeedbackManager.close();if(typeof openLoginModal==='function')openLoginModal();">로그인하기</button></span>
          </div>`}
        </div>
      </div>
    </div>`;
  }

  function buildThanksHTML() {
    const user = getCurrentUser();
    return `
      <div class="apm-fb-thanks">
        <div class="apm-fb-thanks-ico">🙏</div>
        <div class="apm-fb-thanks-msg">감사합니다.</div>
        <div class="apm-fb-thanks-sub">소중한 의견이 AI플랫마켓 발전에 반영됩니다.</div>
        ${user ? '' : `
        <div class="apm-fb-login-hint" style="text-align:left">
          <span>💡</span>
          <span>로그인하면 제출 이력 관리, 처리 결과 확인, 공정기여도 누적 등 더 많은 기능을 이용할 수 있습니다.
          <button onclick="FeedbackManager.close();if(typeof openLoginModal==='function')openLoginModal();">로그인하기</button></span>
        </div>`}
        <button class="apm-fb-submit" style="margin-top:14px;background:#0d1f35;color:#fff" onclick="FeedbackManager.close()">닫기</button>
      </div>`;
  }

  const FeedbackManager = {
    _rating: 0,
    _moduleId: 'general',

    open(moduleId) {
      this._moduleId = moduleId || 'general';
      this._rating = 0;
      injectStyleOnce();
      if (document.getElementById('apmFbBackdrop')) return;
      const wrap = document.createElement('div');
      wrap.innerHTML = buildFormHTML(this._moduleId);
      document.body.appendChild(wrap.firstElementChild);
      requestAnimationFrame(() => {
        document.getElementById('apmFbBackdrop')?.classList.add('show');
      });
      // 만족도 선택 시에만 별점 영역 노출
      const typeSel = document.getElementById('apmFbType');
      if (typeSel) {
        typeSel.addEventListener('change', () => {
          document.getElementById('apmFbRatingWrap').style.display = (typeSel.value === '만족도') ? 'block' : 'none';
        });
      }
    },

    close() {
      const el = document.getElementById('apmFbBackdrop');
      if (!el) return;
      el.classList.remove('show');
      setTimeout(() => el.remove(), 200);
    },

    _setRating(n) {
      this._rating = n;
      document.querySelectorAll('#apmFbRating .apm-fb-star').forEach(s => {
        s.classList.toggle('active', parseInt(s.dataset.v) <= n);
      });
    },

    async _submit(moduleId) {
      const content = document.getElementById('apmFbContent')?.value.trim();
      if (!content) { if (typeof toast === 'function') toast('내용을 입력해 주세요'); return; }

      const type = document.getElementById('apmFbType')?.value || '기타';
      const contact = document.getElementById('apmFbContact')?.value.trim() || null;
      const nameInput = document.getElementById('apmFbName');
      const user = getCurrentUser();
      const userName = user?.name || (nameInput?.value.trim()) || '익명';

      const payload = {
        module: moduleId || this._moduleId || 'general',
        type,
        content,
        rating: (type === '만족도' && this._rating) ? this._rating : null,
        contact,
        userId: user?.uid || null,
        userName,
        page: window.location.pathname,
      };

      try {
        await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (e) { /* 네트워크 오류여도 사용자 경험상 감사 메시지는 보여준다 — 참여 장벽을 낮추는 철학 */ }

      const body = document.getElementById('apmFbBody');
      if (body) body.innerHTML = buildThanksHTML();
    },
  };

  window.FeedbackManager = FeedbackManager;
})();
