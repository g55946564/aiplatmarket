/* ═══════════════════════════════════════════
   ChatDoumi AI Core · GeminiAdapter
   Google Gemini를 AI Core의 Engine 중 하나로 연결합니다.
═══════════════════════════════════════════ */

const BaseAdapter = require('./BaseAdapter');

class GeminiAdapter extends BaseAdapter {
  constructor() {
    super('Gemini');
  }

  isAvailable() {
    return !!process.env.GEMINI_API_KEY;
  }

  async invoke(prompt, options = {}) {
    const model = options.model || 'gemini-pro';
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) throw new Error('Gemini 응답이 비어 있습니다: ' + JSON.stringify(data).slice(0, 200));
    return text;
  }
}

module.exports = GeminiAdapter;
