"use strict";
/**
 * TaskRouter — 질문/요청 유형을 분석해 어떤 영역(Task)인지 결정.
 * v1: 키워드 기반 간단 분류만 구현. 분류 결과(task)는 EvolutionEngine/PromptEngine에서
 *     참고용으로만 쓰이고, 아직 task별 실제 분기 로직은 없음 (전부 동일하게 처리 — 호환성 우선).
 *
 * 확장 지점: LifeMap/ItemZone/Marketing/Shopping/Community/Admin 등
 *   프로젝트가 늘어나면 여기에 키워드/규칙만 추가하고,
 *   필요시 PromptEngine·EvolutionEngine의 TASK_* 매핑에 항목을 채워 넣으면 됨.
 */
const TASK_KEYWORDS = {
  lifemap:   ["라이프맵", "life map", "인생설계", "라이프플랜"],
  itemzone:  ["아이템존", "item zone", "상품추천"],
  marketing: ["마케팅", "홍보문구", "이벤트기획", "광고"],
  shopping:  ["쇼핑", "구매처", "가격비교", "도매"],
  community: ["커뮤니티", "게시글", "리뷰답변"],
  admin:     ["관리자", "역할부여", "마케팅승인", "배포"],
};

function route(message = "", options = {}) {
  // 호출부에서 명시적으로 task를 지정하면 그대로 사용 (예: /api/life-analysis → task:'lifemap')
  if (options.task) return { task: options.task };

  const msg = (message || "").toLowerCase();
  for (const [task, keywords] of Object.entries(TASK_KEYWORDS)) {
    if (keywords.some(k => msg.includes(k.toLowerCase()))) {
      return { task };
    }
  }
  return { task: "general" };
}

module.exports = { route };
