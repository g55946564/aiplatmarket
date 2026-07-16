"use strict";
/**
 * ContextEngine — 사용자/매장 컨텍스트 조회.
 * 기존 callAI() 안에 있던 Firebase users 컬렉션 조회 로직을 그대로 이관 (동작 동일).
 *
 * 확장 지점: 매장 매출 이력, 최근 대화 요약 등 추가 컨텍스트가 필요해지면 여기서만 조회하면 됨.
 */
async function build(db, user = {}) {
  let userData = {};
  try {
    if (db && user?.id) {
      const doc = await db.collection("users").doc(user.id).get();
      if (doc.exists) userData = doc.data();
    }
  } catch (e) {
    console.error("ContextEngine 조회 오류:", e.message);
  }
  return {
    userName: userData.storeName || user?.name || "사장님",
    plan: userData.plan || "FREE",
    raw: userData,
  };
}

module.exports = { build };
