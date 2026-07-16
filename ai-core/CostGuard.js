"use strict";
/**
 * CostGuard — AI Core를 쓰는 모든 프로젝트에 공통으로 적용되는 비용 안전장치.
 * ProviderManager가 실제 GPT/Claude/Gemini를 호출하기 "직전"에 항상 이 관문을 거칩니다.
 * → index.js뿐 아니라 LifeMap/ItemZone 등 AI Core를 가져다 쓰는 어떤 프로젝트든 자동 적용됩니다.
 *
 * 1) 일일 호출 횟수 제한 (기본 300회/일, 서버 재시작 시 초기화되는 메모리 카운터)
 *    → 환경변수 AI_CORE_DAILY_CALL_LIMIT 로 조절
 * 2) 비정상적으로 큰 프롬프트 차단 (기본 8,000자)
 *    → "파일 전체를 통째로 출력해줘" 같은 고비용 패턴을 프로젝트와 무관하게 원천 차단
 *    → 환경변수 AI_CORE_MAX_PROMPT_CHARS 로 조절
 *
 * ⚠️ 이 카운터는 프로세스 메모리 기반이라 서버 재시작하면 리셋됩니다.
 *    여러 인스턴스로 스케일아웃하면 인스턴스별로 따로 셉니다 (정확한 전역 한도가 필요하면
 *    Redis 등 외부 저장소로 교체 — 이 파일의 check()/recordCall()만 바꾸면 됨).
 *
 * 확장 지점: 사용자별/프로젝트별 쿼터, 토큰 기준 비용 추정(단순 글자수가 아니라 실제 토큰 수)
 */
const DAILY_LIMIT      = parseInt(process.env.AI_CORE_DAILY_CALL_LIMIT || "300", 10);
const MAX_PROMPT_CHARS = parseInt(process.env.AI_CORE_MAX_PROMPT_CHARS || "8000", 10);
const DAY_MS = 24 * 60 * 60 * 1000;

let callCount = 0;
let windowStart = Date.now();

function resetIfNewDay() {
  if (Date.now() - windowStart > DAY_MS) {
    callCount = 0;
    windowStart = Date.now();
  }
}

/* ============================================================
   👤 사용자별 일일 한도 (무료 이용자 전용)
   ────────────────────────────────────────────────
   - 요금제 미가입(FREE/미상)인 사용자는 게스트(랜덤)든 로그인 상태든
     하루 AI_CORE_FREE_USER_DAILY_LIMIT회(기본 5회)로 제한.
   - PRO/GOLD 등 유료 요금제 사용자는 이 제한을 받지 않음 (기존처럼 무제한).
   - userId가 없으면(완전 익명) 'anon' 버킷을 공유 — 프론트가 window._guestId를
     안정적으로 넘겨주면 게스트별로도 정확히 분리 집계됨.
   - 서버 재시작 시 초기화되는 메모리 카운터 (여러 인스턴스면 인스턴스별로 따로 셈).
============================================================ */
const FREE_USER_DAILY_LIMIT = parseInt(process.env.AI_CORE_FREE_USER_DAILY_LIMIT || "5", 10);
const userCallLog = new Map(); // userId -> { count, day }

function _todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC 기준)
}

function _isFreePlan(plan) {
  return !plan || plan === "FREE";
}

/* 실제 호출 전에 사용자별 한도 확인 (기록은 하지 않음 — recordUserCall에서) */
function checkUser(userId, plan) {
  if (!_isFreePlan(plan)) return { allowed: true, isFree: false };

  const key = userId || "anon";
  const today = _todayKey();
  const entry = userCallLog.get(key);
  const used = (entry && entry.day === today) ? entry.count : 0;

  if (used >= FREE_USER_DAILY_LIMIT) {
    return {
      allowed: false,
      isFree: true,
      reason: "무료 이용자 일일 상담 한도(" + FREE_USER_DAILY_LIMIT + "회)를 모두 사용했어요. PRO로 업그레이드하면 무제한 이용 가능해요.",
    };
  }
  return { allowed: true, isFree: true, remaining: FREE_USER_DAILY_LIMIT - used };
}

/* 실제 호출이 성공했을 때만 사용자별 카운트 증가 (유료 요금제는 집계하지 않음) */
function recordUserCall(userId, plan) {
  if (!_isFreePlan(plan)) return;
  const key = userId || "anon";
  const today = _todayKey();
  const entry = userCallLog.get(key);
  if (!entry || entry.day !== today) {
    userCallLog.set(key, { count: 1, day: today });
  } else {
    entry.count += 1;
  }
}

function getUserStatus(userId, plan) {
  const isFree = _isFreePlan(plan);
  const key = userId || "anon";
  const today = _todayKey();
  const entry = userCallLog.get(key);
  const used = (entry && entry.day === today) ? entry.count : 0;
  return {
    isFree,
    used,
    limit: isFree ? FREE_USER_DAILY_LIMIT : null,
    remaining: isFree ? Math.max(0, FREE_USER_DAILY_LIMIT - used) : null,
  };
}

/* Provider 호출 직전에 통과 여부만 확인 (실제로 카운트를 올리진 않음 — recordCall에서 올림) */
function check(prompt) {
  resetIfNewDay();

  if (callCount >= DAILY_LIMIT) {
    return { allowed: false, reason: "일일 AI 호출 한도(" + DAILY_LIMIT + "회) 초과 — 내일 자동 초기화됩니다." };
  }
  const len = (prompt || "").length;
  if (len > MAX_PROMPT_CHARS) {
    return { allowed: false, reason: "프롬프트가 너무 깁니다(" + len + "자 > " + MAX_PROMPT_CHARS + "자 제한) — 고비용 요청으로 판단해 차단." };
  }
  return { allowed: true };
}

/* 실제 호출이 성공했을 때만 카운트 증가 */
function recordCall() {
  resetIfNewDay();
  callCount += 1;
}

/* 관리자 대시보드/진단 API에서 현재 상태 확인용 */
function getStatus() {
  resetIfNewDay();
  return { callCount, dailyLimit: DAILY_LIMIT, remaining: Math.max(0, DAILY_LIMIT - callCount) };
}

module.exports = { check, recordCall, getStatus, checkUser, recordUserCall, getUserStatus };
