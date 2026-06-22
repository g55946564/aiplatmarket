/* ═══════════════════════════════════════════
   ChatDoumi AI Core · RuleAdapter
   GPT/Claude/Gemini가 모두 키 미설정이거나 호출 실패할 때
   최종적으로 항상 응답을 보장하는 규칙 기반 폴백 엔진입니다.
   isAvailable()은 항상 true — AI Core의 마지막 안전망입니다.
═══════════════════════════════════════════ */

const BaseAdapter = require('./BaseAdapter');

class RuleAdapter extends BaseAdapter {
  constructor() {
    super('Rule');
  }

  isAvailable() {
    return true;
  }

  async invoke(prompt, options = {}) {
    // 호출부(index.js)가 모듈별 맞춤 폴백 텍스트를 fallbackFn으로 넘기면 그것을 사용
    if (typeof options.fallbackFn === 'function') {
      const text = await options.fallbackFn();
      if (text) return text;
    }
    return '현재 AI 엔진 응답을 받지 못해 기본 안내를 제공합니다. 잠시 후 다시 시도해 주세요.';
  }
}

module.exports = RuleAdapter;
