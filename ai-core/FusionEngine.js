"use strict";
/**
 * FusionEngine — 여러 Provider의 응답을 하나로 통합.
 * v1: 현재 ProviderManager는 "하나 성공하면 즉시 종료"하는 순차 폴백 방식이라
 *     실질적으로 병합 대상 응답이 1개뿐이므로 merge()는 첫 유효 응답을 그대로 반환한다.
 *
 * v2 확장 지점: GPT + Claude + Gemini를 동시 호출(Promise.allSettled)해서
 *   실제로 여러 응답을 종합/교차검증하는 로직을 여기에 구현하면 됨.
 *   (예: 세무/법률처럼 정확도가 중요한 task에서만 멀티 프로바이더 동시 호출)
 */
function merge(responses = []) {
  const valid = responses.filter(Boolean);
  return valid[0] || "";
}

module.exports = { merge };
