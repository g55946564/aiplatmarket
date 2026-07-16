"use strict";
/**
 * AnthropicProvider — Claude 어댑터
 * 기존 index.js의 getClaude() 호출 로직을 그대로 이관 (동작 동일).
 */
function getClaude() {
  const { Anthropic } = require("@anthropic-ai/sdk");
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

async function call(modelName, prompt) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("Claude 키 없음");
  const r = await getClaude().messages.create({
    model: modelName,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });
  return r.content[0]?.text;
}

module.exports = { call };
