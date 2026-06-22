/* ═══════════════════════════════════════════
   ChatDoumi AI Core · engineMap
   모듈(module) · 세부 태스크(task) 별로 어떤 엔진을
   몇 번째 순서로 시도할지 정의합니다.
   새 모듈(AIR&D, AI시뮬레이션, LifeMap 등)을 추가할 때는
   여기에 한 줄만 추가하면 AI Core가 자동으로 적용합니다.
═══════════════════════════════════════════ */

const DEFAULT_CHAIN = ['gpt', 'claude', 'gemini', 'rule'];

const ENGINE_MAP = {
  // ── AI 인생·진로 (LifeMap) — 기존 19개 학문 분야 ──
  lifeai: {
    // 전통/명리 계열은 규칙 기반이 더 일관적 → rule 우선
    saju:          ['rule'],
    astrology:     ['rule'],
    zodiac:        ['rule'],
    name:          ['rule'],
    compatibility: ['rule'],
    fortune:       ['rule'],
    fengshui:      ['rule'],
    ancestral:     ['rule'],
    mudang:        ['rule'],
    // 심리/적성/시장 분석 계열은 LLM 우선, 실패 시 자동 폴백
    aptitude:      ['gpt', 'claude', 'rule'],
    mbti:          ['gpt', 'claude', 'rule'],
    psychology:    ['gpt', 'claude', 'rule'],
    career:        ['gemini', 'gpt', 'claude', 'rule'],
    market:        ['gemini', 'gpt', 'claude', 'rule'],
    tarot:         ['gpt', 'claude', 'rule'],
    face:          ['gpt', 'claude', 'rule'],
    genetics:      ['gemini', 'gpt', 'rule'],
    culture:       ['gemini', 'gpt', 'rule'],
    environment:   ['gemini', 'gpt', 'rule'],
    default:       DEFAULT_CHAIN,
  },

  // ── AI아이템존 (사업 코파일럿, 9단계) ──
  itemzone: { default: ['gpt', 'claude', 'gemini', 'rule'] },

  // ── 향후 모듈 (현재는 placeholder, 모듈 개발 시 그대로 사용) ──
  aird:      { default: ['claude', 'gpt', 'rule'] },   // 연구/분석 특성상 Claude 우선
  simul:     { default: ['gpt', 'claude', 'rule'] },
  lifemap:   { default: ['claude', 'gpt', 'rule'] },
  edu:       { default: ['gpt', 'claude', 'rule'] },
  culture:   { default: ['claude', 'gpt', 'rule'] },
  promotion: { default: ['gpt', 'claude', 'rule'] },

  // ── ChatDoumi 챗봇 본체 ──
  chatdoumi: { default: DEFAULT_CHAIN },
};

/** moduleId(+taskId)에 해당하는 엔진 우선순위 체인을 반환 */
function getChain(moduleId, taskId) {
  const mod = ENGINE_MAP[moduleId];
  if (!mod) return DEFAULT_CHAIN;
  if (taskId && mod[taskId]) return mod[taskId];
  return mod.default || DEFAULT_CHAIN;
}

module.exports = { ENGINE_MAP, DEFAULT_CHAIN, getChain };
