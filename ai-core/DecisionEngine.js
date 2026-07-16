"use strict";
/**
 * DecisionEngine — 분석 결과를 바탕으로 "무엇을 할지" 결정하는 단계.
 * 기존 core/agiEngine.js의 roleAgent 분기 로직 + pricingFunnel(업셀 문구)을 이관.
 *
 * 확장 지점: intentScore 외에 plan(FREE/PRO/GOLD), 사용 이력 등을 반영한
 *   더 정교한 업셀/에이전트 결정 로직을 여기에 추가.
 */

/* intentScore가 높으면 마케팅 전용 에이전트로, 아니면 TaskRouter가 정한 task 유지 */
function decideTask(taskFromRouter, intentScore) {
  if (taskFromRouter === "general" && intentScore > 70) return "marketing";
  return taskFromRouter;
}

/* 업셀(요금제 유도) 문구 — intentScore가 높을 때만 노출 */
function decideUpsell(intentScore) {
  if (intentScore > 80) {
    return "🔥 지금 고객 유입 자동화 가능! PRO 추천 (월 29,000원)";
  }
  return "";
}

function decide({ task, intentScore }) {
  return {
    task: decideTask(task, intentScore),
    upsell: decideUpsell(intentScore),
  };
}

module.exports = { decide, decideTask, decideUpsell };
