/* ═══════════════════════════════════════════
   ChatDoumi AI Core · index.js (오케스트레이터)

   AI플랫마켓의 모든 AI 호출은 이 모듈 하나를 통해서만 이루어집니다.
   GPT / Claude / Gemini는 더 이상 "여러 개의 AI"가 아니라
   AI Core 아래에 연결된 Adapter(Engine) 입니다.

   ── 사용법 (다른 모든 코드는 이렇게만 호출) ──
     const AICore = require('./ai-core');
     const res = await AICore.process({
       module: 'itemzone',        // 모듈 id (engineMap.js 기준)
       task: 'step2',             // (선택) 세부 태스크 id
       prompt: '...',             // 완성된 프롬프트 텍스트
       preferEngine: null,        // (선택) 강제로 특정 엔진 우선 시도
       fallbackFn: async () => '...', // 모든 엔진 실패 시 호출되는 폴백
       options: { maxTokens: 300 },
     });
     // res = { ok, engine, module, task, result, triedBefore, durationMs }

   새 모듈(AIR&D, AI시뮬레이션, LifeMap 등)을 개발할 때는
   절대 OpenAI/Gemini/Anthropic API를 직접 호출하지 말고
   반드시 AICore.process() 만 사용하세요.
═══════════════════════════════════════════ */

const GPTAdapter    = require('./adapters/GPTAdapter');
const ClaudeAdapter = require('./adapters/ClaudeAdapter');
const GeminiAdapter = require('./adapters/GeminiAdapter');
const RuleAdapter   = require('./adapters/RuleAdapter');
const { getChain }  = require('./config/engineMap');

// 엔진 레지스트리 — AI Core는 이 레지스트리에 등록된 Adapter만 인식합니다.
// 새 엔진을 추가하려면: 1) adapters/XxxAdapter.js 작성  2) 여기 한 줄 등록
const ENGINES = {
  gpt:    new GPTAdapter(),
  claude: new ClaudeAdapter(),
  gemini: new GeminiAdapter(),
  rule:   new RuleAdapter(),
};

/**
 * AI Core 단일 진입점.
 * engineMap에 정의된 순서대로 어댑터를 시도하고,
 * 실패하면 자동으로 다음 엔진으로 넘어가며,
 * 전부 실패해도 RuleAdapter가 항상 응답을 보장합니다.
 */
async function process({ module: moduleId, task, prompt, preferEngine, fallbackFn, options = {} }) {
  const startedAt = Date.now();
  const baseChain = getChain(moduleId, task);
  const chain = preferEngine
    ? [preferEngine, ...baseChain.filter(e => e !== preferEngine)]
    : baseChain;

  const tried = [];
  for (const engineKey of chain) {
    const adapter = ENGINES[engineKey];
    if (!adapter) continue;
    if (!adapter.isAvailable()) { tried.push(adapter.name + '(미설정)'); continue; }
    try {
      const result = await adapter.invoke(prompt, { ...options, fallbackFn });
      return {
        ok: true,
        engine: adapter.name,
        module: moduleId,
        task: task || null,
        result,
        triedBefore: tried,
        durationMs: Date.now() - startedAt,
      };
    } catch (e) {
      tried.push(adapter.name + '(실패: ' + e.message.slice(0, 60) + ')');
    }
  }

  // 체인의 모든 엔진이 실패/미설정인 경우 — Rule이 최종 안전망
  const ruleResult = await ENGINES.rule.invoke(prompt, { fallbackFn });
  return {
    ok: true,
    engine: 'Rule(최종폴백)',
    module: moduleId,
    task: task || null,
    result: ruleResult,
    triedBefore: tried,
    durationMs: Date.now() - startedAt,
  };
}

/** 각 엔진의 활성화 여부 — 관리자 대시보드/디버깅용 */
function getEngineStatus() {
  return Object.fromEntries(
    Object.entries(ENGINES).map(([key, adapter]) => [
      key,
      { name: adapter.name, available: adapter.isAvailable() },
    ])
  );
}

module.exports = { process, getEngineStatus, ENGINES };
