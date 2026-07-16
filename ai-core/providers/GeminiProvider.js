"use strict";
/**
 * GeminiProvider — Google Gemini 어댑터
 * 기존 index.js의 getGeminiAI()/callGeminiCore() 로직을 그대로 이관 (동작 동일).
 */
function getGeminiAI() {
  const { GoogleGenAI } = require("@google/genai");
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

async function call(modelName, prompt) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY 환경변수가 누락되었습니다.");
  }
  const ai = getGeminiAI();
  const response = await ai.models.generateContent({
    model: modelName || "gemini-3.5-flash",
    contents: prompt,
    // ⚠️ 이전엔 출력 길이 제한이 없어서 답변이 길어질수록 비용이 무제한으로 커질 수 있었음.
    // GPT(max_tokens:800)/Claude(max_tokens:1024)와 동일하게 상한을 둠.
    config: { maxOutputTokens: 1024 },
  });

  if (response && response.text) return response.text;
  if (response?.candidates?.[0]?.content?.parts?.[0]?.text) {
    return response.candidates[0].content.parts[0].text;
  }
  throw new Error("Gemini 응답 구조가 올바르지 않습니다.");
}

module.exports = { call };
