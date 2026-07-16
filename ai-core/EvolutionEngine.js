"use strict";
/**
 * EvolutionEngine — 어떤 모델을 어떤 순서로 쓸지 결정.
 * 유료(PRO/GOLD) 사용자: Gemini → GPT → Claude 순서로 폴백 (기존 동작 그대로).
 * 무료/미가입 사용자(게스트 포함): Gemini만 호출 (GPT/Claude로 폴백하지 않음 — 비용 통제).
 *
 * v2 확장 지점 (여기만 수정하면 전체 시스템에 반영됨):
 *   - task별로 다른 모델 우선순위 부여 (TASK_MODEL_ORDER에 추가)
 *   - 비용/속도 기준 동적 정렬 (예: 짧은 질문은 gemini-flash, 복잡한 질문은 claude 우선)
 *   - 응답 시간/실패율을 기록해 자동으로 순서를 조정 (AGI/ASI 대응)
 *   - 새 모델이 출시되면 DEFAULT_MODEL_ORDER 배열에 한 줄만 추가
 */
const DEFAULT_MODEL_ORDER = [
  { name: "gemini-3.5-flash", type: "gemini" },
  { name: "gpt-4o-mini", type: "GPT" },
  { name: "claude-haiku-4-5-20251001", type: "Claude" },
];

// task별로 다른 우선순위를 주고 싶을 때 여기에만 추가하면 됨 (현재는 전부 기본 순서 사용)
const TASK_MODEL_ORDER = {
  // marketing: [...],
  // shopping:  [...],
};

/**
 * @param {string} task
 * @param {boolean} isPaid - PRO/GOLD 등 유료 플랜 여부. false면 무료/게스트로 간주해 Gemini만 반환.
 */
function selectModelOrder(task, isPaid = true) {
  if (!isPaid) return [DEFAULT_MODEL_ORDER[0]]; // 무료·게스트: Gemini만, GPT/Claude 폴백 없음
  return TASK_MODEL_ORDER[task] || DEFAULT_MODEL_ORDER;
}

module.exports = { selectModelOrder, DEFAULT_MODEL_ORDER };
