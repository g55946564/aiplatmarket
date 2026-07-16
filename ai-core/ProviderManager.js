"use strict";
/**
 * ProviderManager — 실제 GPT/Claude/Gemini API 호출 + 순차 폴백.
 * 기존 index.js의 fetchAIModel()/getGeminiReply() 로직을 그대로 이관 (동작 동일).
 * + 모든 호출은 CostGuard를 거칩니다 (일일 호출 한도 / 비정상적으로 큰 프롬프트 차단).
 */
const { PROVIDERS } = require("./providers");
const CostGuard = require("./CostGuard");

async function callOne(model, prompt) {
  const guard = CostGuard.check(prompt);
  if (!guard.allowed) {
    const err = new Error(guard.reason);
    err.costGuardBlocked = true;
    throw err;
  }
  const provider = PROVIDERS[model.type];
  if (!provider) throw new Error(model.type + " Provider 없음");
  const text = await provider.call(model.name, prompt);
  CostGuard.recordCall();
  return text;
}

/* modelOrder를 순서대로 시도하고, 첫 성공 응답을 반환 (전부 실패 시 안내 문구)
   quotaCtx: { userId, plan } — 무료/미가입 사용자는 CostGuard.checkUser()로 일일 한도 적용 */
async function callWithFallback(prompt, modelOrder, quotaCtx = {}) {
  const { userId, plan } = quotaCtx;

  const userQuota = CostGuard.checkUser(userId, plan);
  if (!userQuota.allowed) {
    console.warn("🚦 사용자별 한도 차단:", userId || "anon", "-", userQuota.reason);
    return "🙏 " + userQuota.reason;
  }

  for (const model of modelOrder) {
    try {
      const text = await callOne(model, prompt);
      if (text) {
        console.log("✅ " + model.type + " (" + model.name + ") 응답 성공");
        CostGuard.recordUserCall(userId, plan);
        return text;
      }
    } catch (e) {
      if (e.costGuardBlocked) {
        console.warn("🚦 CostGuard 차단:", e.message);
        return "요청이 일시적으로 제한됐어요 (" + e.message + ") 잠시 후 다시 시도해주세요 🙏";
      }
      console.error("⚠️ " + model.type + " 계층 호출 오류:", e.message);
    }
  }
  return "AI 응답에 문제가 생겼어요. 잠시 후 다시 시도해주세요 🙏";
}

module.exports = { callOne, callWithFallback };
