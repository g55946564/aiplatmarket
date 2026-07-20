# MASTER_CONTEXT.md
> AI플랫마켓 전체 구조를 한 화면에 압축한 문서. 새 대화창이 두 번째로 읽는 파일.
> 더 깊은 설명이 필요하면 `/docs/02_SYSTEM_ARCHITECTURE.md`를 보세요.

---

## 1. 정체성

- **이름**: AI플랫마켓 (AIplatMarket) · `aiplatmarket.com`
- **본질**: 소상공인+소비자 상생 플랫폼 → AI 기반 통합 비즈니스 플랫폼으로 확장 중
- **별도 연동 프로젝트**: ChatDoumi(`chatdoumi.com`) — 독자적인 Firebase 프로젝트(`chatdoumi-a4966`), AI플랫마켓의 ChatDoumi AI Core와는 이름만 같고 구현은 분리되어 있음 (혼동 주의)
- **개발자**: 김형식 (1인 개발). Claude=코드생성/버그수정, GPT=구조검토/전략 역할 분담 중

## 2. 저장소 폴더 구조 (실제 배포 기준)

```
AIplatMarket/  (Render에 배포되는 루트)
├── index.js                  ← Express 서버, 전체 라우팅 허브
├── package.json
├── ai-core/                  ← ChatDoumi AI Core (3번 참조)
│   ├── index.js
│   ├── adapters/{Base,GPT,Claude,Gemini,Rule}Adapter.js
│   └── config/engineMap.js
├── public/
│   ├── index.html  admin.html   ← 메인 사이트 (이 대화창이 계속 관리)
│   ├── platform/      ← AI 핵심 모듈 9개 (아래 4번)
│   ├── commerce/       ← 쇼핑/마켓 6개
│   ├── business/       ← 사업/경제 2개
│   ├── media/          ← 방송 3개
│   ├── community/      ← 커뮤니티
│   └── lifestyle/       ← 생활정보 3개
├── framework/
│   ├── assets/{css/common.css, js/core.js}  ← 공통 디자인 토큰·헤더·푸터
│   ├── memory/          ← 지금 읽고 있는 이 폴더 (AI 부트스트랩용)
│   └── version.json
└── docs/                ← 프로젝트 헌법 (비전/아키텍처/표준/로드맵)
```

## 3. ChatDoumi AI Core — 한 줄 요약

GPT·Claude·Gemini는 "여러 AI"가 아니라 **AI Core 아래의 Adapter(Engine)**.
모든 모듈은 `AICore.process({module, task, prompt, fallbackFn})` 하나만 호출한다.
엔진 우선순위는 `ai-core/config/engineMap.js`에 모듈별로 등록되어 있고, 실패 시 자동으로
다음 엔진으로 넘어가며 최종적으로 Rule(규칙 기반)이 항상 응답을 보장한다.
**상세 호출법은 `MODULE_DEV_GUIDE.md` 참조.**

## 4. 모듈 전체 목록 (6개 그룹, 23개 모듈)

| 그룹 | 모듈 |
|---|---|
| **platform** | aird, simul, itemzone, eduzone, culture, gamezone, metazone, lifemap, promotion |
| **commerce** | market(성장+마켓몰), localfood(지역특산품), goodstore(더착한가게), newproduct, recipe, promo |
| **business** | startup(사업창업), regionaleconomy(AI지역경제센터) |
| **media** | live, tv, music |
| **community** | community |
| **lifestyle** | sports, travel, news |

각 모듈 = `public/{그룹}/{모듈id}/index.html` + `module.json` 두 파일로 자기완결.
**module.json 정확한 스펙은 `MODULE_DEV_GUIDE.md` 참조.**

## 5. URL 라우팅

- 단축: `/aird` → `index.js`의 `MODULE_MAP`이 자동으로 `public/platform/aird/index.html`에 매핑
- 전체경로: `/platform/aird/` 도 동일 파일
- 서브도메인: `aird.aiplatmarket.com` → `req.hostname` 감지로 동일 파일 서빙 (코드 수정 불필요)

## 6. 지금 무엇이 메인 창에서 진행 중인가

메인 index.js/index.html/admin.html은 **이 대화창(메인 개발창)** 이 계속 관리합니다.
독립 모듈(aird, simul, eduzone, culture, gamezone, lifemap, itemzone 등)은 **각각 새 대화창**에서
`AI_BOOTSTRAP.md` + `MASTER_CONTEXT.md` + `MODULE_DEV_GUIDE.md` 3개를 첨부하고 시작합니다.
완성되면 모듈 폴더(`index.html`+`module.json`)만 메인 창에 전달 — **MODULE_MAP에 이미
라우트가 등록되어 있으므로 메인 index.js를 다시 건드릴 필요가 없습니다.**

## 7. 더 깊은 내용이 필요하면

| 궁금한 것 | 문서 |
|---|---|
| 왜 이렇게 설계했는지 (철학) | `SYSTEM_PHILOSOPHY.md`, `docs/01_VISION_PHILOSOPHY.md` |
| 모듈 개발 실전 방법 | `MODULE_DEV_GUIDE.md` |
| 공통 CSS/JS/Router/API 표준 | `docs/03_DEV_STANDARDS.md` |
| GPT/Claude/Gemini 공통 작업 규칙 | `docs/04_AI_DEV_STANDARDS.md` |
| 지금 진행 상황 | `PROJECT_STATUS.json`, `docs/05_PROJECT_STATUS.md` |
| 배포(GitHub/Render/서브도메인) | `docs/06_DEPLOYMENT.md` |
| 사업성/기여도/수익분배 시뮬레이션 | `docs/07_AI_SIMULATION.md` |
| LifeMap 연동 | `docs/08_LIFEMAP_INTEGRATION.md` |
| AGI/ASI 장기 방향 | `docs/09_AGI_ASI_ROADMAP.md` |
