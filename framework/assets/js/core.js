/* ═══════════════════════════════════════════
   AI플랫마켓 Framework · core.js
   모든 독립 모듈에 공통 Header/Footer를 주입하고
   AI플랫마켓 메인과의 연동(로그인 세션, 뒤로가기)을 담당합니다.
   버전: 1.0.0
═══════════════════════════════════════════ */

(function () {
  const BASE_URL = window.location.hostname.includes('aiplatmarket.com')
    ? 'https://aiplatmarket.com'
    : '';

  function renderHeader() {
    const el = document.getElementById('fw-header');
    if (!el) return;
    el.innerHTML = `
      <div class="fw-header">
        <div class="brand">AI<em>PLAT</em>MARKET</div>
        <div class="back" onclick="window.location.href='${BASE_URL}/'">← AI플랫마켓 홈으로</div>
      </div>`;
  }

  function renderFooter() {
    const el = document.getElementById('fw-footer');
    if (!el) return;
    el.innerHTML = `
      <div class="fw-footer">
        © 2026 AI플랫마켓 · Framework v1.0.0 · 이 페이지는 공통 모듈 구조로 운영됩니다.
      </div>`;
  }

  // 모듈 상태(module.json) 가져오기 — 대시보드/디버깅용
  async function fetchModuleStatus(moduleId) {
    try {
      const res = await fetch(`${BASE_URL}/api/modules`);
      const data = await res.json();
      return data[moduleId] || null;
    } catch (e) {
      return null;
    }
  }

  // 전역에 노출 (각 모듈에서 필요 시 호출)
  window.AIPM = { BASE_URL, fetchModuleStatus };

  document.addEventListener('DOMContentLoaded', function () {
    renderHeader();
    renderFooter();
  });
})();
