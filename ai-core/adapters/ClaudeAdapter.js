/* ═══════════════════════════════════════════
   ChatDoumi AI Core · ClaudeAdapter
   Anthropic Claude를 AI Core의 Engine 중 하나로 연결합니다.
   Render 환경변수에 ANTHROPIC_API_KEY가 설정되어 있어야
   isAvailable()이 true가 되어 이 엔진이 사용됩니다.
   (설정 안 해도 서비스는 정상 동작 — 다른 엔진으로 자동 폴백)
═══════════════════════════════════════════ */

const BaseAdapter = require('./BaseAdapter');

class ClaudeAdapter extends BaseAdapter {
  constructor() {
    super('Claude');
  }

  isAvailable() {
    return !!process.env.ANTHROPIC_API_KEY;
  }

  async invoke(prompt, options = {}) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model || 'claude-sonnet-4-6',
        max_tokens: options.maxTokens || 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await res.json();
    const text = data.content?.find(b => b.type === 'text')?.text?.trim();
    if (!text) throw new Error('Claude 응답이 비어 있습니다: ' + JSON.stringify(data).slice(0, 200));
    return text;
  }
}

module.exports = ClaudeAdapter;
