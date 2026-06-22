# 03. 개발 표준

> 모든 모듈(메인 사이트 포함)이 지켜야 하는 코드 작성 규칙입니다.
> 02번 문서가 "구조"를 정의했다면, 이 문서는 "그 구조 안에서 어떻게 코드를 쓰는가"를 정의합니다.

---

## 3.1 공통 CSS

위치: `framework/assets/css/common.css`

```css
:root{
  --navy:#0d1f35;  --navy2:#1a3556;
  --red:#c0392b;   --gold:#c9a84c;   --grn:#1a7a4a;
  --g1:#f5f6f8; --g2:#e8eaed; --g3:#c4c8cd; --g4:#8a8f98;
  --bd:1px solid var(--g2);  --r:10px;  --sh:0 4px 16px rgba(13,31,53,.1);
  --fs:'Pretendard','Noto Sans KR',sans-serif;
}
```

**규칙**:
- 새 모듈은 이 변수를 그대로 사용합니다. 새 브랜드 색을 임의로 추가하지 않습니다.
- 메인 사이트(`public/index.html`)는 자체 CSS 변수 세트를 갖고 있는데(`--navy`, `--gold` 등 이름은 같지만
  값이 다소 다를 수 있음), **모듈은 메인 사이트의 인라인 CSS를 참조하지 않고 항상 `framework/assets/css/common.css`만 따릅니다.**
  메인 사이트와 모듈의 디자인을 점차 한 세트로 통일하는 것이 중장기 과제입니다.
- 버튼/카드 등 반복 컴포넌트는 `.btn-primary`, `.card`, `.badge` 같은 공통 클래스를 우선 사용합니다.

## 3.2 공통 JS

위치: `framework/assets/js/core.js`

이 스크립트는 모듈 페이지에 다음을 자동으로 해줍니다:
- `#fw-header` / `#fw-footer` 요소에 공통 헤더·푸터 주입
- `window.AIPM.BASE_URL` — 메인 사이트 절대경로 (서브도메인/path 방식 모두 대응)
- `window.AIPM.fetchModuleStatus(moduleId)` — 해당 모듈의 module.json 상태를 가져오는 헬퍼

**규칙**: 모듈은 자체 헤더/푸터를 새로 만들지 않고 `<div id="fw-header"></div>` / `<div id="fw-footer"></div>`
를 비워두고 core.js가 채우게 합니다.

## 3.3 공통 Router (URL 처리)

- 메인 `index.js`가 모든 라우팅의 시작점입니다. 모듈은 자체 서버를 띄우지 않습니다 (정적 파일만 제공).
- 라우팅 3방식 동시 지원:
  1. 단축 경로 `/aird` → `MODULE_MAP` 조회 → `public/platform/aird/index.html`
  2. 전체 경로 `/platform/aird/` → Express `static` 미들웨어가 직접 서빙
  3. 서브도메인 `aird.aiplatmarket.com` → `req.hostname` 감지 → 동일 파일
- **모듈 내부 링크는 항상 절대경로(`/aird`, `/platform/aird/...`)를 사용합니다.** 상대경로(`../../`)는
  서브도메인 방식에서 깨지므로 사용하지 않습니다.

## 3.4 공통 API 설계 규칙

- 모듈이 자체 데이터가 필요하면 메인 `index.js`에 `/api/{module}/...` 형태의 라우트를 추가합니다
  (예: `/api/itemzone/analyze`). 모듈 폴더 안에 별도 서버 코드를 두지 않습니다.
- 응답 형식은 항상 `{ ok: boolean, ...data }` 또는 에러 시 `{ ok:false, error: string }`으로 통일합니다.
- Firestore 저장이 필요하면 메인 서버의 `db` 인스턴스를 사용합니다 (모듈이 별도 Firebase 프로젝트를
  쓰지 않습니다 — ChatDoumi처럼 완전히 분리된 서비스가 아니라면).

## 3.5 ChatDoumi AI Core 호출 규칙 (가장 중요, 반드시 준수)

```js
const AICore = require('../../../ai-core');

const res = await AICore.process({
  module: 'aird',
  task: 'patent-search',
  prompt: '완성된 프롬프트',
  fallbackFn: async () => '모든 엔진 실패 시 보여줄 텍스트',
});
```

**금지 사항**:
- `fetch('https://api.openai.com/...')` 등 외부 AI API를 모듈에서 직접 호출하는 것
- AI Core를 거치지 않고 새 fetch 로직을 모듈 안에 복사해 넣는 것 (중복 코드는 엔진 교체 시 누락의 원인)

**이유**: 엔진 우선순위, 장애 시 자동 폴백, 사용량 로깅을 전부 `ai-core/` 한 곳에서 관리해야
나중에 엔진을 바꾸거나 추가해도 모듈 코드를 건드릴 필요가 없습니다.

## 3.6 미완성 기능 처리 규칙

```html
<div style="text-align:center;padding:40px;color:var(--g4)">
  <div style="font-size:2rem">🔧</div>
  <div style="background:var(--navy);color:#fff;display:inline-block;
       padding:4px 14px;border-radius:20px;font-size:.7rem;margin-top:10px">업그레이드 중</div>
</div>
```
오류 메시지, 빈 화면, `console.error`만 남기고 끝나는 처리 — 전부 금지. 항상 사람이 다음에
무엇을 할 수 있는지 알 수 있는 안내를 보여줍니다 (01번 문서 철학 §1.7 안티패턴 참조).

## 3.7 코드 스타일

- 한글 주석을 충분히 남깁니다 (이 프로젝트는 1인 개발자 + 여러 AI가 교대로 작업하므로, 다음 작업자가
  맥락 없이도 이해할 수 있어야 합니다).
- 함수/변수명은 영어, 주석/문자열은 한글 — 기존 코드베이스 컨벤션을 따릅니다.
- 가능하면 외부 의존성을 늘리지 않습니다 (현재 의존성: express, firebase-admin, cors 정도로 최소화 유지).

---
*다음 문서: [04_AI_DEV_STANDARDS](./04_AI_DEV_STANDARDS.md) — ChatGPT/Claude/Gemini가 동일하게 따라야 하는 규칙*
