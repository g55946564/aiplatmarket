"use strict";
/**
 * ReasoningEngine — 질문을 "분석"하는 단계.
 * 기존 core/agiEngine.js의 analyzeIntent / detectBusinessType / detectLanguage를 이관.
 * (구 agiEngine.js의 callAI/runAGI는 실제 AI를 호출하지 않는 목업이라 폐기하고,
 *  분석 로직만 살려서 AI Core 파이프라인의 정식 단계로 편입했습니다.)
 *
 * 확장 지점: 키워드 스코어링 대신 임베딩/분류 모델 기반으로 고도화 가능.
 */

/* 구매/관심 의도 점수 (0~100대) */
function analyzeIntent(message = "") {
  let score = 0;
  const buy  = ["매출", "고객", "홍보", "마케팅"];
  const info = ["방법", "어떻게", "추천"];

  buy.forEach(k => message.includes(k) && (score += 40));
  info.forEach(k => message.includes(k) && (score += 20));

  return score;
}

/* 업종 자동 분류 — 감지 실패 시 null (호출부에서 사용자가 넘긴 businessType을 덮어쓰지 않도록) */
function detectBusinessType(message = "") {
  if (message.includes("카페")) return "카페";
  if (message.includes("식당")) return "음식점";
  if (message.includes("미용")) return "미용실";
  return null;
}

/* 언어 자동 감지 */
function detectLanguage(message = "") {
  if (/^[A-Za-z]/.test(message)) return "en";
  if (/[ぁ-んァ-ン]/.test(message)) return "jp";
  return "ko";
}

/* AICore.process()에서 한 번에 호출하는 통합 분석 */
function analyze(message = "") {
  return {
    intentScore: analyzeIntent(message),
    businessType: detectBusinessType(message),
    lang: detectLanguage(message),
  };
}

module.exports = { analyze, analyzeIntent, detectBusinessType, detectLanguage };
