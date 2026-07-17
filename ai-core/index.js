/* ═══════════════════════════════════════════════════════
   AI플랫마켓 · ChatDoumi AI Core 클라이언트 (HTTP 방식)
   ─────────────────────────────────────────────────────
   AI플랫마켓 서버는 GPT/Claude/Gemini를 직접 호출하지 않고,
   AI 관련 로직(TaskRouter/PromptEngine/ProviderManager 등)도
   갖고 있지 않습니다. 실제 AI 호출/엔진 선택/폴백은 전부
   ChatDoumi 서버(단일 진실 공급원) 안에서만 일어납니다.

   AI플랫마켓은 이 파일을 통해 ChatDoumi 서버의 API에
   HTTP 요청만 보내고 결과를 받아옵니다 — 진짜 마이크로서비스 구조.

   ── 흐름 ──
   AI플랫마켓 index.js (lifemap, itemzone 등)
     → require('./ai-core')
     → AICore.process({ module, task, prompt, ... })
     → fetch(CHATDOUMI_API_URL + '/api/ai/process')  ← HTTP 요청
     → ChatDoumi 서버가 내부적으로 AICore.js/TaskRouter 등을 돌려 응답
     → 결과를 그대로 반환

   ── 환경변수 ──
   CHATDOUMI_API_URL   챗도우미 서버 주소 (예: https://chatdoumi.onrender.com)
   CHATDOUMI_API_KEY   (선택) 서버 간 인증 토큰 — 챗도우미 쪽에서 요구할 경우 사용

   ── 안전장치 ──
   챗도우미 서버가 응답하지 않거나(다운/타임아웃) CHATDOUMI_API_URL이
   설정되지 않은 경우에도 AI플랫마켓 사이트 자체는 죽지 않고,
   fallbackFn(모듈별 규칙 기반 안내문)으로 항상 응답을 보장합니다.
═══════════════════════════════════════════════════════ */

const CHATDOUMI_API_URL = process.env.CHATDOUMI_API_URL || '';
const CHATDOUMI_API_KEY = process.env.CHATDOUMI_API_KEY || '';
const REQUEST_TIMEOUT_MS = 15000; // 챗도우미 서버 응답 대기 최대 15초

// ⚠️ 주의: 내부 함수명을 'process'로 짓지 마세요. Node.js 전역 process 객체를
// 가려버려서(shadowing) 위 process.env 참조가 전부 깨지는 버그가 발생합니다.
// export 시 { process: processRequest, ... } 형태로 별칭만 외부에 노출합니다.

/**
 * AI플랫마켓 표준 진입점 — 기존 코드와 100% 호환되는 시그니처 유지.
 *
 * @param {object} params
 * @param {string} params.module      모듈 id (예: 'itemzone', 'lifemap', 'paper')
 * @param {string} [params.task]      세부 태스크 id
 * @param {string} params.prompt      완성된 프롬프트 텍스트
 * @param {function} [params.fallbackFn]  챗도우미 호출 실패 시 사용할 규칙 기반 폴백
 * @param {object} [params.user]      { id, name } — 없어도 동작 (비로그인 요청)
 * @param {object} [params.options]   { maxTokens, temperature } — 참고용, 챗도우미에 그대로 전달
 */
async function processRequest({ module: moduleId, task, prompt, fallbackFn, user = {}, options = {} }) {
  const startedAt = Date.now();

  if (!CHATDOUMI_API_URL) {
    console.warn('[AI Core Client] CHATDOUMI_API_URL 미설정 — 폴백으로 응답합니다.');
    return await buildFallback(moduleId, task, fallbackFn, startedAt, 'CHATDOUMI_API_URL 미설정');
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const res = await fetch(CHATDOUMI_API_URL.replace(/\/$/, '') + '/api/ai/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(CHATDOUMI_API_KEY ? { 'Authorization': 'Bearer ' + CHATDOUMI_API_KEY } : {}),
      },
      body: JSON.stringify({
        user,
        message: prompt,
        task: task || moduleId || 'general',
        source: 'aiplatmarket',   // 챗도우미 쪽에서 호출 출처를 구분할 수 있도록
        module: moduleId,
        options,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) throw new Error(`ChatDoumi 응답 오류: HTTP ${res.status}`);
    const data = await res.json();
    const text = data.text || data.result || data.message;
    if (!text) throw new Error('ChatDoumi 응답에 text 필드가 없습니다');

    return {
      ok: true,
      engine: data.model || 'ChatDoumi AI Core',
      module: moduleId,
      task: task || null,
      result: text,
      durationMs: Date.now() - startedAt,
    };
  } catch (e) {
    console.warn('[AI Core Client] ChatDoumi 서버 호출 실패:', e.message);
    return await buildFallback(moduleId, task, fallbackFn, startedAt, e.message);
  }
}

/** 챗도우미 서버 호출 실패/미설정 시 공통 폴백 처리 */
async function buildFallback(moduleId, task, fallbackFn, startedAt, reason) {
  const result = typeof fallbackFn === 'function'
    ? await fallbackFn()
    : '현재 AI 서비스에 일시적으로 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.';
  return {
    ok: true,
    engine: 'Rule(챗도우미 연결 실패 폴백: ' + reason + ')',
    module: moduleId,
    task: task || null,
    result,
    durationMs: Date.now() - startedAt,
  };
}

/** 챗도우미 서버 연결 상태 확인 (관리자 대시보드용) */
async function getEngineStatus() {
  if (!CHATDOUMI_API_URL) {
    return { chatdoumi: { name: 'ChatDoumi AI Core', available: false, reason: 'CHATDOUMI_API_URL 미설정' } };
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(CHATDOUMI_API_URL.replace(/\/$/, '') + '/api/ai-status', { signal: controller.signal });
    clearTimeout(timer);
    const data = await res.json().catch(() => ({}));
    return {
      chatdoumi: { name: 'ChatDoumi AI Core', available: res.ok, url: CHATDOUMI_API_URL, detail: data },
    };
  } catch (e) {
    return { chatdoumi: { name: 'ChatDoumi AI Core', available: false, reason: e.message, url: CHATDOUMI_API_URL } };
  }
}

/** 과거 Bridge 방식과의 호환용 — 이제 아무 동작도 하지 않음 (더 이상 로컬 db 필요 없음) */
function setDb() { /* no-op: 챗도우미 서버가 자체 DB를 사용하므로 AI플랫마켓 쪽에서 주입할 필요 없음 */ }

module.exports = { process: processRequest, getEngineStatus, setDb };
