# AI플랫마켓 (AIplatMarket)

AI 기반 소상공인·소비자 상생 플랫폼 — Global AI Innovation Ecosystem

## 폴더 구조

```
AIplatMarket/
├── index.js                 ← Express 서버 (라우팅 허브, 메인 개발창이 관리)
├── package.json
│
├── ai-core/                  ← ChatDoumi AI Core 클라이언트 (HTTP 방식)
│   └── index.js               챗도우미 서버에 API 요청만 보냄 (AI 로직 직접 미보유)
│
├── framework/
│   ├── assets/
│   │   ├── css/common.css     ← 공통 디자인 토큰
│   │   └── js/                popup-manager.js, feedback-manager.js 등 재사용 모듈
│   ├── standard-header-footer/
│   │   ├── AIPLATMARKET_HEADER_FOOTER.html   ← 실제 GNB/Footer 코드 그대로 추출한 참조 파일
│   │   └── 새창_요청_문구.md                  ← 각 독립 프로젝트 개발창에 전달할 안내문
│   ├── memory/                ← AI 부트스트랩 문서 (새 대화창이 가장 먼저 읽는 요약본)
│   └── version.json
│
├── docs/                      ← 프로젝트 헌법 (00_INDEX부터 순서대로)
│
└── public/
    ├── index.html             ← 메인 (그룹 GNB → 드롭다운 → 각 모듈 링크). 메인 개발창이 관리
    ├── admin.html
    │
    ├── platform/               ← AI 핵심 플랫폼 (독립 모듈)
    │   ├── aird/  simul/  itemzone/
    │   ├── eduzone/  culture/  gamezone/  lifemap/  promotion/
    │
    ├── commerce/
    │   ├── growthmall/  localfood/  goodstore/
    │   ├── newproduct/  recipe/  promo/  shop/
    │
    ├── business/
    │   ├── startup/  regionaleconomy/
    │
    ├── media/
    │   ├── live/  tv/  music/  paper/
    │
    ├── community/
    │
    └── lifestyle/
        ├── sports/  travel/  news/
```

각 모듈 폴더에는 `module.json`만 존재합니다(라우팅 메타정보). **`index.html`은 이 저장소가
만들지 않습니다** — 각 모듈의 실제 화면은 별도의 독립 개발창에서 설계·구현하고, 완성되면
해당 폴더에 `index.html`을 배치하는 방식으로 병합합니다.

## 모듈 표준

각 모듈 폴더는 `index.html`(개발창이 채움) + `module.json`(라우팅 메타정보)으로
자기완결 구조를 가집니다.

```json
{
  "id": "aird",
  "group": "platform",
  "title": "AIR&D",
  "version": "0.0.1",
  "status": "planned | dev | live",
  "routes": ["/aird", "/platform/aird/"],
  "subdomain": "aird.aiplatmarket.com"
}
```

## 독립 모듈이 표준 GNB/Footer를 적용하는 방법

`framework/standard-header-footer/AIPLATMARKET_HEADER_FOOTER.html`을 각 프로젝트
개발창에 전달하면, 그 창이 실제 메인 사이트와 동일한 GNB(카테고리 드롭다운 전체)와
Footer를 자기 `index.html`에 그대로 붙여넣습니다. 자동 주입 스크립트 방식이 아니라
"코드 그대로 복사"이므로 원본과 어긋날 일이 없습니다. 자세한 절차는 같은 폴더의
`새창_요청_문구.md`를 참고하세요.

> 메인 사이트의 GNB/Footer가 바뀌면 이 참조 파일도 다시 추출해서 각 개발창에
> 재전달해야 최신 상태로 유지됩니다.

## 독립 모듈 개발창에 함께 전달할 보안 문서

`framework/SECURITY.md` — DB 응답 화이트리스트, 인증 확인, "로그인 없이 접근 가능한가"
자가점검 3원칙을 담은 체크리스트입니다. 실제 취약점 2건(피드백 API 개인정보 노출,
승인대기 업체 전체 노출)을 고친 뒤 정리했습니다. `AIPLATMARKET_HEADER_FOOTER.html`,
`새창_요청_문구.md`와 함께 각 프로젝트 개발창에 전달하세요.

## URL 라우팅 규칙

| 방식 | 예시 | 처리 |
|---|---|---|
| 단축 경로 | `/aird` | `MODULE_MAP` 조회 → `public/platform/aird/index.html` |
| 전체 경로 | `/platform/aird/` | Express static 서빙 |
| 서브도메인 | `aird.aiplatmarket.com` | `req.hostname` 감지 → 동일 파일 서빙 |

코드 수정 없이 서브도메인 전환 가능 — DNS/Reverse Proxy 설정만 변경하면 됩니다.

## AI 호출 구조

AI플랫마켓은 GPT/Claude/Gemini를 직접 호출하지 않습니다. `ai-core/index.js`가
챗도우미 서버(`CHATDOUMI_API_URL`)에 HTTP로 요청을 보내고, 실제 AI 처리(TaskRouter,
ProviderManager 등)는 챗도우미 서버 안에서만 이루어집니다. 자세한 내용은
`docs/02_SYSTEM_ARCHITECTURE.md`, `docs/04_AI_DEV_STANDARDS.md` 참고.

## 개발 원칙

1. **메인은 메인, 모듈은 모듈** — `public/index.html`/`admin.html`/`index.js`는 메인
   개발창이 관리하고, 각 독립 모듈의 `index.html`은 해당 프로젝트 개발창이 관리합니다.
   메인 개발창은 모듈의 `index.html`을 만들거나 덮어쓰지 않습니다.
2. **폴더 = URL** — 폴더 구조와 라우팅 경로를 1:1로 매핑
3. **module.json은 계약서** — 모든 모듈 상태를 한 곳에서 추적
4. **미완성은 업그레이드 페이지로** — 빈 화면/오류 노출 금지 (각 모듈 개발창 책임)
5. **하나씩 100% 완성** — 새 기능보다 기존 기능 완성도 우선

## 담당 역할 분담

- **메인 개발창**: `index.js`, `public/index.html`, `admin.html`, `ai-core/`, `framework/`, `docs/` 관리
- **각 독립 모듈 개발창**: 해당 모듈의 `index.html` 설계·구현 (LifeMap, ItemZone, AI성장+마켓몰, 더착한쇼핑 등)
- **GPT**: 시스템 아키텍처, 모듈 연동 규칙, 버전 관리 전략, AI Core 설계 검토
