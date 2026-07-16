"use strict";
/**
 * MemoryEngine — 대화/행동 기록 저장.
 * 기존 index.js의 logUserAction()을 그대로 이관 (Firestore, 영구 저장, 동작 동일).
 *
 * + 구 core/agiEngine.js의 in-memory Map 기반 memoryStore를 "단기 캐시"로 흡수.
 *   Firestore는 매번 네트워크 왕복이 필요해 느릴 수 있어서, 같은 요청 처리 중
 *   "방금 사용자가 뭐라고 했는지" 정도를 빠르게 참고할 때 이 단기 캐시를 씁니다.
 *   ⚠️ 서버 재시작하면 사라지는 휘발성 캐시입니다 — 영구 기록은 항상 logAction(Firestore)을 쓰세요.
 *
 * 확장 지점 (향후):
 *   - 사용자 Memory:       users/{id}/memory 컬렉션
 *   - 프로젝트 Memory:     projects/{projectId}/memory
 *   - Conversation Memory: 현재의 logs 컬렉션(단기) + 아래 shortTermCache(초단기)
 *   - 장기 Memory:         주기적 요약 후 별도 컬렉션에 압축 저장 (cron)
 */

/* ── 단기 캐시 (프로세스 메모리, 휘발성) ── */
const shortTermCache = new Map();
const SHORT_TERM_LIMIT = 20; // 유저당 최근 20개까지만 보관 (메모리 누수 방지)

function cacheShortTerm(userId, data) {
  if (!userId) return;
  if (!shortTermCache.has(userId)) shortTermCache.set(userId, []);
  const list = shortTermCache.get(userId);
  list.push({ ...data, timestamp: Date.now() });
  if (list.length > SHORT_TERM_LIMIT) list.shift();
}

function getShortTerm(userId) {
  return shortTermCache.get(userId) || [];
}

/* ── 영구 저장 (Firestore) ── */
async function logAction(db, userId, message, response, metadata = {}) {
  cacheShortTerm(userId, { message, response, ...metadata });
  try {
    if (!db) return;
    await db.collection("logs").add({
      userId,
      message: (message || "").slice(0, 200),
      response: (response || "").slice(0, 500),
      timestamp: new Date(),
      ...metadata,
    });
  } catch (e) {
    console.error("MemoryEngine 저장 오류:", e.message);
  }
}

module.exports = { logAction, cacheShortTerm, getShortTerm };
