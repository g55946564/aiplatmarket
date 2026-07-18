Ai플랫마켓 요금제 체계 클로드 요청문

AI플랫마켓: AI API 직접 호출 없음
ChatDoumi: 독립 AI Core가 실제 AI 호출 및 원가 관리
AI플랫마켓 각 프로젝트: ChatDoumi AI Core 경유
사용자 표시 단위: AI Point
AI Point 환산: 1 AI Point = 1원
검사·AI 요청 가격: 원화와 AI Point가 1:1
결제 방식: 직접 원화 결제 또는 보유 AI Point 사용
AI 원가: 사용자에게 노출되는 AI Point와 별도로 ChatDoumi AI Core에서 관리
AP Point: 기존 플랫폼 멤버십·활동 포인트로 별도 유지
AI Point와 AP Point 간 교환·전환 없음
AI 호출 전 가격 확인 → 결제/포인트 승인 → AI 실행
AI 호출 실패 시 환불·포인트 복구
모든 가격은 ChatDoumi AI Core의 중앙 가격정책에서 관리
AI플랫마켓은 가격 조회 및 표시만 담당

② 클로드에게 보내는 「AI플랫마켓」 수정·보완 요청문
# AI플랫마켓 /price.md 참조 정책 기반 요금제·AI Point UI 및 ChatDoumi AI Core 연동 수정 요청

현재 AI플랫마켓 저장소 루트에 있는 `/price.md` 파일을 확인하고, 이 파일을 AI플랫마켓의 **요금제 및 AI Point 정책 참조 문서(Reference Policy)** 로 사용해 주세요.

중요한 점은 AI플랫마켓이 요금제와 AI 서비스 가격을 독자적으로 결정하거나 별도의 AI 가격정책을 운영하지 않는 것입니다.

AI플랫마켓의 실제 운영 가격과 AI Point 정책의 최종 기준은 **ChatDoumi AI Core의 중앙 가격정책**입니다.

AI플랫마켓은 사용자에게 요금제와 AI 서비스를 보여주고 이용하게 하는 **서비스 플랫폼 및 UI 역할**을 담당합니다.

---

## 1. 회원 요금제 UI

현재 요금제 페이지 또는 회원등급 구조를 다음 4단계로 수정·보완합니다.

FREE
→ 월 0원

FREE+
→ 월 9,900원

PRO
→ 월 29,000원

GOLD
→ 월 59,000원

기존에 `FREE + 9,900원 옵션`으로 되어 있다면 이를 정식 요금제인 `FREE+`로 변경합니다.

사용자 화면에서 4개 요금제를 명확하게 비교할 수 있도록 합니다.

표시 항목:

* 월 요금
* 월 기본 AI Point
* AI 이용 범위
* ChatDoumi 이용 범위
* AI플랫마켓 이용 범위
* 추가 AI Point 충전 가능 여부

단, 실제 가격과 AI Point 제공량은 ChatDoumi AI Core의 중앙 정책을 우선 적용합니다.

---

## 2. AI Point 명칭 통일

AI플랫마켓 전체 UI에서 다음 명칭은 모두 제거 또는 변경합니다.

* AP Point
* AP
* Credit
* AI Credit
* C

최종 명칭은:

**AI Point**

하나로 통일합니다.

기본 기준:

**1 AI Point = 1원**

입니다.

AI Point는 AI플랫마켓과 ChatDoumi 전체 생태계에서 사용하는 통합 포인트입니다.

AI 서비스 이용뿐 아니라 플랫폼 활동에 따른 적립 및 보상에도 사용할 수 있도록 확장성을 고려합니다.

단, 현금 환급·현금 교환·회원 간 양도는 지원하지 않습니다.

---

## 3. AI Point와 요금제 표시

요금제 페이지에서는 다음과 같이 표시합니다.

FREE
0원/월

FREE+
9,900원/월

PRO
29,000원/월

GOLD
59,000원/월

각 요금제별 월 기본 AI Point 제공량은 ChatDoumi AI Core의 중앙 가격정책 API에서 조회하여 표시합니다.

AI플랫마켓 코드에 요금제 가격이나 AI Point 제공량을 하드코딩하지 않습니다.

---

## 4. AI Point 잔액 및 사용내역

마이페이지 또는 사용자 계정 영역에서 다음을 표시합니다.

* 현재 AI Point 잔액
* AI Point 충전 내역
* AI Point 적립 내역
* AI Point 사용 내역

예:

AI LifeMap 프리미엄 검사
-9,900 AI Point

AI Culture 이미지 생성
-500 AI Point

AI Point 충전
+10,000 AI Point

---

## 5. AI 서비스 가격 표시

AI플랫마켓의 모든 AI 서비스는 실행 전에 ChatDoumi AI Core의 중앙 가격정책을 조회합니다.

예:

AI LifeMap 프리미엄 검사

가격:
9,900원

AI Point:
9,900점

내 AI Point:
12,000점

[9,900 AI Point 사용]

또는

[9,900원 결제]

사용자가 가격과 AI Point를 확인하고 최종 승인한 후에만 AI 실행을 요청합니다.

---

## 6. AI 서비스별 가격

AI LifeMap, AI Culture, AI ItemZone, AI EduZone, AI R&D 등 각 프로젝트의 가격은 AI플랫마켓 코드에 독립적으로 하드코딩하지 않습니다.

각 프로젝트는 다음 정보를 ChatDoumi AI Core에 요청합니다.

* projectId
* serviceType
* requestType
* userId

예:

lifemap
culture
itemzone
eduzone
airnd

ChatDoumi AI Core가 반환한 가격과 AI Point를 사용자에게 표시합니다.

---

## 7. 공통 AI Core Client

AI플랫마켓에는 공통 API Client 또는 Service Layer를 사용할 수 있습니다.

예:

`/services/aiCoreClient.js`

단, 이 파일에서는 Gemini / Claude / GPT 등의 AI API를 직접 호출하지 않습니다.

오직 ChatDoumi AI Core와 통신합니다.

---

## 8. AI 실행 순서

모든 유료 AI 서비스는 다음 순서를 준수합니다.

서비스 선택
→ ChatDoumi AI Core 가격 조회
→ 가격 및 AI Point 표시
→ 보유 AI Point 확인
→ 결제 또는 AI Point 사용 선택
→ 사용자 최종 승인
→ ChatDoumi AI Core 검증
→ 결제 또는 AI Point 차감
→ 실제 AI 실행
→ 결과 반환

결제 또는 AI Point 승인 전에 AI 실행을 요청하지 않습니다.

---

## 9. AI Point 부족 처리

예:

필요 AI Point:
9,900점

보유 AI Point:
3,000점

부족:
6,900점

다음과 같이 안내합니다.

[6,900 AI Point 충전]

[9,900원 결제하고 시작]

사용자가 쉽게 선택할 수 있도록 UI를 구성합니다.

---

## 10. AI플랫마켓의 역할

AI플랫마켓은 다음 기능을 담당합니다.

* 회원 요금제 화면
* 요금제 비교
* AI Point 잔액 표시
* AI 서비스 가격 표시
* AI Point 사용 UI
* AI Point 충전 UI
* 결제 요청
* AI 서비스 요청
* 결과 표시
* AI Point 사용내역 표시

다음 기능은 ChatDoumi AI Core에서 담당합니다.

* 실제 AI API 호출
* AI 모델 선택
* AI 원가 계산
* AI Cost Gate
* AI 서비스 가격정책
* AI Point 중앙 검증
* AI Point 중앙 차감
* AI Point 거래 원장

---

## 11. /price.md의 역할

현재 AI플랫마켓 저장소의 `/price.md`는 **참조 정책 문서**입니다.

공식 정책의 원본은 ChatDoumi 저장소의 `/price.md`입니다.

따라서 AI플랫마켓의 `/price.md`와 실제 ChatDoumi AI Core의 중앙 가격정책이 다를 경우, **ChatDoumi AI Core의 중앙 가격정책을 최종 기준**으로 적용합니다.

AI플랫마켓의 `/price.md`는 개발자와 운영자가 현재 정책을 이해하고 UI와 서비스 구조를 구현하기 위한 참조 문서로 활용합니다.

---

## 12. 기존 코드 유지

기존 AI플랫마켓의 다음 기능을 먼저 분석하고 가능한 한 재사용합니다.

* 회원가입
* 로그인
* 회원등급
* 결제
* 기존 AP Point 관련 코드
* 기존 AI 서비스 메뉴
* 프로젝트별 화면
* ChatDoumi 연동 구조

기존 `AP Point` 관련 기능이 있다면 최종적으로 `AI Point` 체계로 전환합니다.

기존 기능을 깨뜨리지 않도록 단계적으로 수정해 주세요.

---

## 최종 구조

AI플랫마켓

→ `/price.md` 정책 참조
→ ChatDoumi AI Core 가격 조회
→ 사용자에게 요금제·AI Point 표시
→ 결제 또는 AI Point 사용 요청
→ ChatDoumi AI Core 검증
→ AI 실행 요청
→ 결과 표시

ChatDoumi AI Core

→ 공식 가격정책 원본
→ 실제 운영 요금제
→ AI Point 정책
→ AI 서비스 가격
→ AI Point 검증 및 차감
→ AI API 호출
→ AI 원가 및 사용량 관리

AI플랫마켓은 자체적으로 요금이나 AI Point 정책을 결정하지 않고 **ChatDoumi AI Core의 중앙 정책을 참조하는 구조**로 수정해 주세요.

최종 포인트 체계
AI Point: AI플랫마켓 생태계 전체에서 사용하는 통합 포인트
AI 상담·분석·검사·콘텐츠 생성 등 AI 서비스 이용
구매·리뷰·추천·이벤트 등 플랫폼 활동 보상
필요하면 AI Point를 지급·적립·충전·사용
기본 기준: 1 AI Point = 1원
단, 현금 환급·현금 교환·회원 간 양도는 불가
AI Point의 실제 AI 서비스 차감 가격은 ChatDoumi AI Core에서 중앙 관리
AI플랫마켓은 AI Point 잔액·가격·사용 내역을 표시

즉, AP Point라는 명칭은 폐기하고 AI Point 하나로 통합합니다.

중요 수정사항: 기존 요청문에 사용된 AP Point라는 명칭은 모두 삭제하고, 플랫폼 포인트와 AI 이용
포인트를 구분하지 않습니다. AI플랫마켓과 ChatDoumi 전체 생태계의 포인트 명칭은 AI Point 하나로
통일합니다. AI Point는 AI 서비스 이용뿐 아니라 플랫폼 활동에 따른 적립·보상에도 사용할 수 있는
통합 플랫폼 포인트로 설계합니다. 기본 환산 기준은 1 AI Point = 1원으로 합니다. 단, AI Point는 현
금 환급·현금 교환·회원 간 양도를 지원하지 않습니다. 기존 코드 및 UI의 AP Point, AP, Credit, AI
Credit 등 관련 명칭은 모두 AI Point로 변경하고, 데이터베이스 필드명도 가능하면 aiPointBalance,
aiPointTransaction, aiPointCost 등으로 통일해 주세요.

그리고 가장 중요한 것은 두 /price.md가 서로 다른 가격을 갖게 되면 안 된다는 것입니다. 정책이 변경될 경우에는 ChatDoumi 원본 → AI플랫마켓 참조본 업데이트 → ChatDoumi AI Core 운영 데이터 업데이트 순서로 관리하는 것이 안전합니다.

다만 장기적으로는 두 저장소에 /price.md를 각각 수동 복사해 두는 방식보다, AI플랫마켓의 /price.md에 "ChatDoumi /price.md를 공식 원본으로 한다"고 명시하고, 실제 서비스 실행 시에는 항상 ChatDoumi
AI Core API의 최신 가격을 우선 적용하는 구조가 가장 안전합니다.