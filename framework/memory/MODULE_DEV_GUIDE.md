# MODULE_DEV_GUIDE.md
> 독립 모듈(AIR&D, AI시뮬레이션, LifeMap, 교육존, 문화예술, 게임존 등)을
> 새 대화창에서 개발할 때 펼쳐놓고 보는 실전 가이드입니다.

---

## 0. 시작 전 체크리스트

- [ ] `AI_BOOTSTRAP.md`, `MASTER_CONTEXT.md`를 먼저 읽었다
- [ ] 내가 만들 모듈의 `group`(platform/commerce/...)과 `id`를 알고 있다
- [ ] **framework/, ai-core/, 메인 index.html/index.js 는 절대 수정하지 않는다**

## 1. 내가 만들 결과물

```
public/{group}/{id}/
├── index.html      ← 필수
└── module.json     ← 필수
```
이 두 파일만 만들면 끝입니다. 라우팅(`/aird`, `aird.aiplatmarket.com` 등)은
메인 `index.js`의 `MODULE_MAP`에 **이미 등록되어 있어** 별도 설정이 필요 없습니다.

## 2. module.json 작성법

```json
{
  "id": "aird",
  "group": "platform",
  "title": "AIR&D",
  "icon": "🔬",
  "description": "AI 연구·개발 플랫폼 — 시장성 분석, 특허 검색, 논문 리뷰 자동화",
  "version": "0.1.0",
  "status": "dev",
  "routes": ["/aird", "/platform/aird/"],
  "subdomain": "aird.aiplatmarket.com",
  "framework_version": "1.0.0",
  "ai_core": {
    "enabled": true,
    "engines": ["claude", "gpt", "rule"]
  },
  "owner": "형식",
  "updated": "2026-06-19"
}
```
- `status`는 `planned`(설계만) → `dev`(개발중) → `live`(실서비스) 순서로 올립니다.
- `ai_core.engines`는 `ai-core/config/engineMap.js`에 실제 등록한 순서와 일치시킵니다.

## 3. index.html 작성 규칙

### 3-1. 공통 자산 불러오기 (필수)
```html
<link rel="stylesheet" href="/framework/assets/css/common.css">
...
<div id="fw-header"></div>   <!-- 공통 헤더가 자동으로 채워짐 -->
... 모듈 고유 콘텐츠 ...
<div id="fw-footer"></div>   <!-- 공통 푸터가 자동으로 채워짐 -->
<script src="/framework/assets/js/core.js"></script>
```

### 3-2. 공통 디자인 토큰 (그대로 사용, 새로 정의하지 않기)
```css
--navy:#0d1f35;  --gold:#c9a84c;  --red:#c0392b;  --grn:#2e7d32;
--g1:#f5f6f8; --g2:#e8eaed; --g3:#c4c8cd; --g4:#8a8f98;
--bd:1px solid var(--g2);  --r:10px;
```

### 3-3. 미완성 영역은 이렇게 표시
```html
<div style="text-align:center;padding:40px;color:var(--g4)">
  <div style="font-size:2rem">🔧</div>
  <div style="background:var(--navy);color:#fff;display:inline-block;
       padding:4px 14px;border-radius:20px;font-size:.7rem;margin-top:10px">
    업그레이드 중
  </div>
</div>
```
**절대 빈 화면이나 JS 오류를 그대로 노출하지 않습니다.**

## 4. AI 호출 — ChatDoumi AI Core 사용법 (가장 중요)

모듈 자신의 백엔드(있다면) 또는 메인 서버의 API 라우트에서 호출:

```js
const AICore = require('../../../ai-core'); // 모듈 위치 기준 상대경로

const res = await AICore.process({
  module: 'aird',                 // module.json의 id와 동일하게
  task: 'patent-search',          // 세부 기능 구분용 (자유롭게 명명)
  prompt: '완성된 프롬프트 텍스트',
  fallbackFn: async () => '모든 엔진 실패 시 보여줄 안내 텍스트',
});

// res.result   ← 실제 응답 텍스트
// res.engine   ← 어떤 엔진이 응답했는지 ('GPT'|'Claude'|'Gemini'|'Rule')
```

**절대 하지 말 것**: `fetch('https://api.openai.com/...')` 처럼 직접 외부 AI API를 호출하는 것.
새 엔진이 필요하면 `ai-core/adapters/`에 어댑터를 추가하고 `engineMap.js`에 한 줄 등록 — 이것조차
원칙적으로는 메인 개발창과 상의 후 진행합니다 (ai-core/ 도 framework에 준하는 공통 자산).

## 5. 만든 후 메인 창에 전달할 때

다음 한 줄과 함께 두 파일(`index.html`, `module.json`)을 전달하면 됩니다:

> "{모듈명} 모듈 완성했습니다. public/{group}/{id}/ 에 넣어주세요."

메인 창은 **파일을 해당 경로에 배치하는 것 외에 추가 작업이 필요 없습니다**
(라우팅이 이미 동작하도록 설계되어 있기 때문). 단, AI Core에 새 엔진/태스크를
추가했다면 그 변경분만 별도로 검토합니다.

## 6. 모듈별 참고 — 엔진 우선순위 기본값

`ai-core/config/engineMap.js`에 이미 등록되어 있습니다 (필요시 조정 요청):

| 모듈 | 우선순위 |
|---|---|
| aird | claude → gpt → rule |
| simul | gpt → claude → rule |
| lifemap(life) | claude → gpt → rule |
| edu | gpt → claude → rule |
| culture | claude → gpt → rule |
| itemzone | gpt → claude → gemini → rule |
