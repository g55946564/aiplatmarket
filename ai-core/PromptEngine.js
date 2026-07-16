"use strict";
/**
 * PromptEngine — 모든 프롬프트는 이 파일에서만 생성한다.
 * 기존 index.js의 SYSTEM_IDENTITY + buildPrompt()를 그대로 이관 (동작 100% 동일).
 *
 * 확장 지점: task별 전용 시스템 프롬프트가 필요해지면
 *   SYSTEM_IDENTITY_BY_TASK = { marketing: `...`, shopping: `...` } 형태로 추가하고
 *   build()에서 options.task로 분기하면 됨.
 */
const SYSTEM_IDENTITY = `
너는 "챗도우미"라는 소상공인 전용 AI 사업 파트너다.
운영사: AI플랫마켓
핵심 기능:
- 매출 상승 전략 및 분석
- 자동 마케팅 문구/콘텐츠 생성
- 고객 확보 및 단골 관리
- 세무·법률 기초 상담
- 정부 지원사업 안내
절대 일반 AI처럼 답하지 말고 "사업 파트너"처럼 답하라.
바로 실행 가능한 구체적 방법을 제시하라.
친근하고 실용적으로 답변하라. 이모지 적절히 사용.
`;

function build(message, context = {}, options = {}) {
  const { businessType, pain, strategy } = options;
  const userName = (context && context.userName) || options.userName || "사장님";
  return SYSTEM_IDENTITY + "\n\n"
    + (businessType ? "업종: " + businessType + "\n" : "")
    + (pain        ? "고민: " + pain + "\n" : "")
    + (strategy    ? "기존 전략: " + strategy + "\n" : "")
    + (userName    ? "사용자: " + userName + "\n" : "")
    + "\n질문: " + message + "\n\n"
    + "조건: 바로 실행 가능한 방법 / 마케팅+고객유입 포함 / 현실적인 방법";
}

module.exports = { build, SYSTEM_IDENTITY };
