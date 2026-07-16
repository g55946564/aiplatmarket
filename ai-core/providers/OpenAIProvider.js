"use strict";
/**
 * OpenAIProvider — GPT 어댑터
 * 기존 index.js의 getOpenAI() 호출 로직을 그대로 이관 (동작 동일).
 */
function getOpenAI() {
  const { OpenAI } = require("openai");
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

async function call(modelName, prompt) {
  if (!process.env.OPENAI_API_KEY) throw new Error("GPT 키 없음");
  const r = await getOpenAI().chat.completions.create({
    model: modelName,
    max_tokens: 800,
    messages: [{ role: "user", content: prompt }],
  });
  return r.choices[0].message.content;
}

module.exports = { call };
