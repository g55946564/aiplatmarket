/* ═══════════════════════════════════════════
   ChatDoumi AI Core · BaseAdapter
   모든 AI 엔진(GPT/Claude/Gemini/Rule)이 구현해야 하는
   공통 인터페이스입니다. 새로운 엔진을 추가할 때는
   이 클래스를 상속받아 isAvailable() / invoke() 만 구현하면
   AI Core가 자동으로 인식합니다.
═══════════════════════════════════════════ */

class BaseAdapter {
  constructor(name) {
    this.name = name; // 로그·응답에 표시될 엔진 이름 (예: 'GPT', 'Claude')
  }

  /** 이 엔진을 호출할 수 있는 상태인지 (API 키 존재 여부 등) */
  isAvailable() {
    throw new Error(`[AI Core] ${this.name} adapter는 isAvailable()을 구현해야 합니다.`);
  }

  /**
   * 실제 AI 호출. 반드시 string(텍스트 응답)을 반환하거나 에러를 throw 해야 합니다.
   * AI Core가 에러를 잡아 다음 엔진으로 자동 전환합니다.
   */
  async invoke(/* prompt, options */) {
    throw new Error(`[AI Core] ${this.name} adapter는 invoke()를 구현해야 합니다.`);
  }
}

module.exports = BaseAdapter;
