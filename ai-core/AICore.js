"use strict";
/**
 * AICore — ChatDoumi AI Core v1
 * ────────────────────────────────────────────────────────────
 * 흐름:
 *   사용자 → ChatDoumi Server → AICore
 *     → TaskRouter (analyzeTask)
 *     → ReasoningEngine (의도점수/업종/언어 분석 — 구 core/agiEngine.js 이관)
 *     → DecisionEngine (최종 task 확정 + 업셀 문구 결정 — 구 core/agiEngine.js 이관)
 *     → ContextEngine (사용자/매장 컨텍스트 + 요금제(plan) 조회)
 *     → PromptEngine (buildPrompt)
 *     → EvolutionEngine (selectModel — 유료: Gemini→GPT→Claude / 무료·게스트: Gemini만)
 *     → ProviderManager (callProvider) → CostGuard 사용자별 일일 한도 확인 → GPT/Claude/Gemini
 *     → FusionEngine (mergeResponse — v1은 통과만 함)
 *     → MemoryEngine (saveMemory — Firestore 영구 + 단기 캐시)
 *     → 결과 반환
 *
 * 요금제(plan)에 따른 제한:
 *   - PRO/GOLD 등 유료: Gemini→GPT→Claude 순차 폴백, 개인별 일일 한도 없음 (전역 CostGuard만 적용)
 *   - FREE/미가입(게스트 포함): Gemini만 호출, 하루 AI_CORE_FREE_USER_DAILY_LIMIT회(기본 5회) 제한
 *
 * v1 설계 원칙: 기존 기능 100% 유지가 최우선이므로,
 * 각 엔진은 기존 index.js/agiEngine.js의 로직을 그대로 옮긴 것이며 동작을 바꾸지 않는다.
 */
const TaskRouter      = require("./TaskRouter");
const PromptEngine    = require("./PromptEngine");
const ContextEngine   = require("./ContextEngine");
const MemoryEngine    = require("./MemoryEngine");
const FusionEngine    = require("./FusionEngine");
const EvolutionEngine = require("./EvolutionEngine");
const ProviderManager = require("./ProviderManager");
const ReasoningEngine = require("./ReasoningEngine");
const DecisionEngine  = require("./DecisionEngine");

class AICore {
  constructor(db) {
    this.db = db || null;
  }

  /** DB 참조 갱신 (index.js에서 Firebase가 앱 시작 후 비동기로 잡히는 경우 대비) */
  setDb(db) {
    this.db = db;
  }

  /* 1) 어떤 작업 영역인지 분석 */
  analyzeTask(message, options = {}) {
    return TaskRouter.route(message, options);
  }

  /* 1.5) 의도/업종/언어 분석 (구 agiEngine.js → ReasoningEngine) */
  reason(message) {
    return ReasoningEngine.analyze(message);
  }

  /* 1.7) 분석 결과로 최종 task/업셀 문구 결정 (구 agiEngine.js → DecisionEngine) */
  decide(task, intentScore) {
    return DecisionEngine.decide({ task, intentScore });
  }

  /* 2) Prompt 생성 — 모든 프롬프트는 PromptEngine을 거친다 */
  buildPrompt(message, context, options = {}) {
    return PromptEngine.build(message, context, options);
  }

  /* 3) 어떤 모델을 어떤 순서로 쓸지 결정 — isPaid=false면 Gemini만 반환 */
  selectModel(task, isPaid = true) {
    return EvolutionEngine.selectModelOrder(task, isPaid);
  }

  /* 4) Provider 호출 (순차 폴백) — quotaCtx로 사용자별 일일 한도 적용 */
  async callProvider(prompt, modelOrder, quotaCtx = {}) {
    return ProviderManager.callWithFallback(prompt, modelOrder, quotaCtx);
  }

  /* 5) 여러 응답 병합 — v1은 폴백 방식이라 응답이 1개뿐, 통과만 함 */
  mergeResponse(responses) {
    return FusionEngine.merge(responses);
  }

  /* 6) 대화/행동 기록 저장 */
  async saveMemory(userId, message, response, metadata = {}) {
    return MemoryEngine.logAction(this.db, userId, message, response, metadata);
  }

  /**
   * 메인 진입점 — 기존 callAI()/getGeminiReply()를 대체하는 통합 엔트리포인트.
   *
   * @param {object}  params
   * @param {object}  params.user         { id, name } — 없어도 동작
   * @param {string}  params.message      사용자 질문/요청
   * @param {string}  [params.businessType]
   * @param {string}  [params.pain]
   * @param {string}  [params.strategy]
   * @param {string}  [params.task]       명시적으로 task 지정 (예: 'lifemap'). 없으면 TaskRouter가 추론
   * @param {boolean} [params.raw]        true면 시스템 페르소나 없이 message를 프롬프트 그대로 사용
   *                                      (기존 callGeminiCore처럼 순수 호출이 필요한 경우)
   * @param {boolean} [params.skipMemory] true면 saveMemory 자동 호출 생략 (호출부에서 별도 처리 시)
   */
  async process({
    user = {}, message, businessType, pain, strategy,
    task, raw = false, skipMemory = false,
  } = {}) {
    const routed  = this.analyzeTask(message, { task });
    const reasoning = this.reason(message);
    const decision  = this.decide(routed.task, reasoning.intentScore);

    const finalTask = decision.task;
    const finalBusinessType = businessType || reasoning.businessType || undefined;

    const context  = await ContextEngine.build(this.db, user);
    const isPaid = !!(context.plan && context.plan !== "FREE");

    const prompt = raw
      ? message
      : this.buildPrompt(message, context, { businessType: finalBusinessType, pain, strategy, task: finalTask });

    const modelOrder = this.selectModel(finalTask, isPaid);
    const text = await this.callProvider(prompt, modelOrder, { userId: user?.id, plan: context.plan });

    if (!skipMemory) {
      this.saveMemory(user?.id || "anonymous", message, text, { task: finalTask }).catch(() => {});
    }

    return {
      text,
      task: finalTask,
      model: modelOrder[0]?.name,
      context,
      meta: {
        intentScore: reasoning.intentScore,
        businessType: finalBusinessType,
        lang: reasoning.lang,
        upsell: decision.upsell,
        isPaid,
        plan: context.plan,
      },
    };
  }
}

module.exports = { AICore };
