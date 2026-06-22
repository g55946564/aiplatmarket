# 02. 전체 시스템 아키텍처

> 01번 문서(철학)가 "왜"를 답한다면, 이 문서는 "어떻게"를 답합니다.

---

## 2.1 5개 층위로 보는 전체 구조

```
┌─────────────────────────────────────────────┐
│ docs/                  ← 헌법 (이 문서들)         │
├─────────────────────────────────────────────┤
│ framework/memory/      ← AI 부트스트랩 (요약본)    │
├─────────────────────────────────────────────┤
│ framework/ (assets·core)  ← 공통 자산/규칙      │
│ ai-core/                  ← AI 호출 단일 진입점  │
├─────────────────────────────────────────────┤
│ public/{6개 그룹}/{모듈}/  ← 실제 기능 (독립 모듈)  │
├─────────────────────────────────────────────┤
│ index.js                  ← 라우팅 허브        │
└─────────────────────────────────────────────┘
```

위에서 아래로 갈수록 "변하지 않아야 하는 정도"가 낮아집니다. docs/와 철학은 거의 고정,
모듈은 계속 추가/변경됩니다.

## 2.2 Framework

`framework/`는 **모든 모듈이 공유하는 자산**이며, 모듈 개발자는 이를 "사용"만 하고
수정하지 않습니다 (수정이 필요하면 메인 개발창에서 논의 후 진행).

```
framework/
├── assets/
│   ├── css/common.css   ← 색상·폰트·버튼 등 디자인 토큰
│   └── js/core.js       ← 공통 헤더/푸터 주입, 메인 사이트와의 연동
├── memory/               ← AI 부트스트랩 문서 (이 docs/의 압축본)
└── version.json          ← Framework 버전 (모듈의 module.json과 호환성 체크용)
```

## 2.3 AI Core (ChatDoumi AI Core)

**핵심 원칙: GPT/Claude/Gemini는 "여러 개의 AI"가 아니라 AI Core 아래 연결된 Adapter다.**

```
ai-core/
├── index.js               ← process() 단일 진입점 + 엔진 레지스트리
├── adapters/
│   ├── BaseAdapter.js      ← 모든 엔진이 구현해야 하는 인터페이스
│   ├── GPTAdapter.js
│   ├── ClaudeAdapter.js
│   ├── GeminiAdapter.js
│   └── RuleAdapter.js      ← 항상 응답을 보장하는 최종 안전망
└── config/
    └── engineMap.js        ← 모듈·태스크별 엔진 우선순위
```

호출 인터페이스:
```js
AICore.process({ module, task, prompt, fallbackFn, options })
// → { ok, engine, module, task, result, triedBefore, durationMs }
```

새 엔진(예: 미래의 다른 AI 모델)을 추가하려면: (1) adapters/에 어댑터 추가
(2) ai-core/index.js의 ENGINES 레지스트리에 등록 (3) engineMap.js에서 필요한 모듈에 배정.
**모듈 코드 자체는 절대 수정하지 않습니다** — 이것이 Adapter 패턴의 핵심 효용입니다.

## 2.4 framework/memory — AI 부트스트랩 레이어

`docs/`가 깊고 상세한 헌법이라면, `framework/memory/`는 **새 대화창이 가장 먼저
읽는 압축 요약본**입니다. 5개 파일로 구성:

| 파일 | 역할 |
|---|---|
| `AI_BOOTSTRAP.md` | 최초 진입점, 60초 요약 |
| `MASTER_CONTEXT.md` | 전체 구조 압축 |
| `MODULE_DEV_GUIDE.md` | 모듈 개발 실전 가이드 |
| `SYSTEM_PHILOSOPHY.md` | 철학 압축본 |
| `PROJECT_STATUS.json` | 기계가 읽기 쉬운 현재 상태 스냅샷 |

이 레이어가 따로 존재하는 이유: docs/ 전체(9개 문서)를 매번 새 대화창에 다 첨부하면
비효율적입니다. memory/는 "빠른 부트스트랩"을, docs/는 "필요할 때 찾아보는 깊이"를 담당합니다.

## 2.5 docs — 프로젝트 헌법

지금 읽고 있는 이 폴더입니다. 9개 문서로 구성되며 (00_INDEX 포함 10개),
프로젝트의 가장 안정적인 층위입니다. `docs/00_INDEX.md`에 전체 목차가 있습니다.

## 2.6 6개 모듈 그룹과 독립 모듈 구조

| 그룹 | 성격 | 예시 모듈 |
|---|---|---|
| `platform` | AI 핵심 기능, 완전 독립 Platform | aird, simul, itemzone, edu, culture, game, life, promotion |
| `commerce` | 쇼핑/마켓, 준독립 | market, localfood, goodstore, newproduct, recipe, promo |
| `business` | 사업/경제 지원, 준독립 | startup, regionaleconomy |
| `media` | 방송/콘텐츠 | live, tv, music |
| `community` | 커뮤니티 (단일 모듈) | community |
| `lifestyle` | 생활정보, 일반 콘텐츠 | sports, travel, news |

**"독립"과 "준독립"의 실무적 차이**: 독립 모듈(platform 그룹 대부분)은 자체 AI 분석
파이프라인을 가지며 다른 모듈에 의존하지 않습니다. 준독립(commerce/business 일부)은
공통 회원/결제 시스템과 더 긴밀하게 연동됩니다. 그래도 폴더 구조와 module.json 규격은 동일합니다.

## 2.7 독립 모듈 폴더 구조 (모든 모듈 공통)

```
public/{group}/{id}/
├── index.html      ← 모듈 화면. framework/assets 를 불러와 헤더/푸터/디자인 일관성 유지
└── module.json     ← 메타데이터 (아래 2.8)
```

## 2.8 module.json 규격 (전체 필드)

```json
{
  "id": "aird",
  "group": "platform",
  "title": "AIR&D",
  "icon": "🔬",
  "description": "한 줄 설명",
  "version": "0.1.0",
  "status": "planned | dev | live",
  "routes": ["/aird", "/platform/aird/"],
  "subdomain": "aird.aiplatmarket.com",
  "framework_version": "1.0.0",
  "ai_core": { "enabled": true, "engines": ["claude", "gpt", "rule"] },
  "owner": "담당자",
  "updated": "YYYY-MM-DD"
}
```

`index.js`는 부팅 시(또는 요청 시) 각 모듈 폴더의 `module.json`을 읽어 `/api/modules`,
`/api/ai-context`로 노출합니다 — **이 파일이 모듈의 "신분증"**입니다.

## 2.9 라우팅 허브 (index.js)

```js
const MODULE_MAP = {
  aird: { group: 'platform', dir: 'aird' },
  // ... 23개 모듈 전부 등록됨
};
```
- `/aird` 요청 → `MODULE_MAP['aird']` 조회 → `public/platform/aird/index.html` 서빙
- `aird.aiplatmarket.com` 요청 → `req.hostname`으로 동일 모듈 감지 → 동일 파일 서빙
- 폴더/파일이 아직 없으면 메인 SPA의 "업그레이드 중" 페이지로 자연스럽게 폴백

**새 모듈을 추가해도 이 라우팅 코드는 이미 다 등록되어 있으므로 수정이 필요 없습니다**
(이미 23개 모듈이 사전 등록되어 있음 — 새 그룹/모듈이 추가될 때만 한 줄 추가).

---
*다음 문서: [03_DEV_STANDARDS](./03_DEV_STANDARDS.md) — 공통 CSS/JS/API 작성 규칙*
