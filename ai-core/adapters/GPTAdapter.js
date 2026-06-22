/* ═══════════════════════════════════════════
   ChatDoumi AI Core · GPTAdapter
   OpenAI GPT를 AI Core의 Engine 중 하나로 연결합니다.
   index.js 등 상위 코드는 이 파일을 직접 호출하지 않고
   반드시 AICore.process() 를 통해서만 사용합니다.
═══════════════════════════════════════════ */

const BaseAdapter = require('./BaseAdapter');

class GPTAdapter extends BaseAdapter {
  constructor() {
    super('GPT');
  }

  isAvailable() {
    return !!process.env.OPENAI_API_KEY;
  }

  async invoke(prompt, options = {}) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options.maxTokens || 300,
        temperature: options.temperature ?? 0.7,
      }),
    });
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error('GPT 응답이 비어 있습니다: ' + JSON.stringify(data).slice(0, 200));
    return text;
  }
}

module.exports = GPTAdapter;
