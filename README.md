# AI플랫마켓 (AIplatMarket)

AI 기반 소상공인·소비자 상생 플랫폼 — Global AI Innovation Ecosystem

## 폴더 구조

```
AIplatMarket/
├── index.js                ← Express 서버 (라우팅 허브)
├── package.json
│
├── framework/               ← 공통 엔진 (모든 모듈이 공유)
│   ├── assets/
│   │   ├── css/common.css   ← 공통 디자인 토큰
│   │   ├── js/core.js       ← 공통 Header/Footer 주입
│   │   ├── images/ icons/ fonts/ language/
│   ├── components/          ← 공통 UI 컴포넌트
│   ├── dashboard/           ← Platform Dashboard
│   ├── layout/              ← 공통 레이아웃 템플릿
│   ├── router/              ← 라우팅 유틸
│   ├── theme/                ← Light/Dark 테마
│   ├── core/                 ← AI Core 연동 로직
│   └── version.json
│
└── public/
    ├── index.html            ← 메인 (그룹 GNB → 드롭다운 → 모듈 링크)
    ├── admin.html
    │
    ├── platform/              ← AI 핵심 플랫폼 (독립 모듈)
    │   ├── aird/  simul/  itemzone/  edu/
    │   ├── culture/  game/  life/  promotion/
    │
    ├── commerce/
    │   ├── market/  localfood/  goodstore/
    │   ├── newproduct/  recipe/  promo/
    │
    ├── business/
    │   ├── startup/  regionaleconomy/
    │
    ├── media/
    │   ├── live/  tv/  music/
    │
    ├── community/
    │
    └── lifestyle/
        ├── sports/  travel/  news/
```

## 모듈 표준

각 모듈 폴더는 `index.html` + `module.json` 으로 자기완결 구조를 가집니다.

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

## URL 라우팅 규칙

| 방식 | 예시 | 처리 |
|---|---|---|
| 단축 경로 | `/aird` | `MODULE_MAP` 조회 → `public/platform/aird/index.html` |
| 전체 경로 | `/platform/aird/` | Express static 서빙 |
| 서브도메인 | `aird.aiplatmarket.com` | `req.hostname` 감지 → 동일 파일 서빙 |

코드 수정 없이 서브도메인 전환 가능 — DNS/Reverse Proxy 설정만 변경하면 됩니다.

## 개발 원칙

1. **Framework First** — 모듈보다 공통 엔진을 먼저 안정화
2. **폴더 = URL** — 폴더 구조와 라우팅 경로를 1:1로 매핑
3. **module.json은 계약서** — 모든 모듈 상태를 한 곳에서 추적
4. **미완성은 업그레이드 페이지로** — 빈 화면/오류 노출 금지
5. **하나씩 100% 완성** — 새 기능보다 기존 기능 완성도 우선

## 담당 역할 분담

- **Claude**: 대규모 코드 생성/수정, 버그 수정, 모듈 스캐폴딩
- **GPT**: 시스템 아키텍처, 모듈 연동 규칙, 버전 관리 전략, AI Core 설계 검토
