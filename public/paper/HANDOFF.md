# paper 모듈 전달 노트 (메인 개발창용)

국민경제㊉ 신문 모듈 2차 수정본입니다. `public/paper/`에 넣어주세요 (`media/`가 아닙니다 — `media/`는 유튜브·라이브 홈쇼핑 방송·뮤직 전용으로 예약되어 있어 최상위 단독 폴더로 배치했습니다).

## 포함된 파일
```
public/paper/
├─ index.html       ← 신문 본체 (홈 1면 + 지난호 아카이브 + 종이신문 뷰어, 단일 파일 SPA)
├─ module.json       ← id/group 모두 "paper"로 표기 (최상위 단독 모듈)
└─ assets/
   └─ thumb_201605.jpg   ← 샘플 표지 썸네일 (실제 발행호 이미지로 교체 필요)
```

## 라우트 / 서브도메인
- `aiplatmarket.com/paper` + `paper.aiplatmarket.com` 로 확정
- `/news`는 기존 "오늘의 주요뉴스 국내/글로벌 2분할 패널"(아마도 lifestyle/news)과 겹칠 수 있어 제외
- `/newspaper`는 후보였으나 `/paper`가 module.json id와 일치하고 더 짧아 채택하지 않음

## 이번 수정 사항
1. **컬러 팔레트 그린 계통 전환** — 배경(`--paper` 계열 크림톤)은 유지하고, 타이틀·탭·버튼·스탬프 등 장식 요소를 그린으로 통일
   - `--acc:#2e7d32`, `--acc-deep:#1b4332`, `--stamp:#14532d` (신규 로컬 변수)
   - 플랫폼 공식 토큰 `--navy`/`--gold` 자체는 재정의하지 않고, 이 모듈 안에서만 새 변수로 대체 사용 (fw-header 등 공통 영역에 영향 없음)
2. **모바일 "지역별 보기" 햄버거 위치 변경** — 기존엔 지난호 목록 화면 검색창 옆에 있었는데, 이제 **마스트헤드(국민경제㊉ 타이틀) 맨 좌측**으로 이동. 홈 화면에서 눌러도 자동으로 지난호 화면으로 전환된 뒤 지역 드로어가 열림.

## module.json 요약
- id: `paper` / group: `paper` (최상위 단독) / subdomain: `paper.aiplatmarket.com`
- routes: `/paper`
- ai_core.enabled: true (engines: claude → gpt → gemini → rule)

## framework 반영 상태 (변경 없음, 이전과 동일)
- `common.css` 로드, 공식 디자인 토큰 재정의 없이 사용
- `#fw-header` / `#fw-footer` 배치, `core.js` 로드
- 뷰어 화면 진입 시 fw-header/fw-footer 및 자체 masthead/footer 모두 JS로 숨김 → 뷰어 종료 시 복원

## ⚠ 메인 개발창 검토/작업 필요 항목 (framework·ai-core 영역이라 직접 손대지 않았습니다)

1. **`ai-core/config/engineMap.js`에 `paper` 모듈 등록**
   ```js
   paper: ['claude', 'gpt', 'gemini', 'rule']
   ```
2. **`/api/paper/news-feed` 백엔드 라우트 구현/배포 확인** — 주소는 메인 개발창에서 이미 확정해주셨습니다 (`GET /api/paper/news-feed`). `index.html`의 `AI_CORE_ENDPOINT`, `module.json`의 `ai_core.endpoint`에도 반영 완료했습니다. 남은 건 **이 라우트가 실제로 구현·배포됐는지** 여부입니다.
   - 내부에서 RSS(뉴스와이어/네이버/구글) 수집 → `AICore.process({module:'paper', task:'news-curation', ...})` 호출 → JSON 스키마로 응답
   - 스키마는 `index.html` 하단 "AI Core(ai-core/) 연동 자리" 주석 참조
   - 라우트가 아직 없어도 화면은 깨지지 않고 조용히 목업 콘텐츠를 유지하다가, 라우트가 열리는 순간 자동으로 실시간 콘텐츠로 전환됩니다
3. **MODULE_MAP에 `/paper`, 서브도메인 `paper.aiplatmarket.com` 라우트 확인** — `paper`가 그룹 폴더 없이 최상위에 있는 첫 케이스라 라우팅 로직이 이 구조를 지원하는지 한 번 확인 권장.
4. **공식 `common.css` 클래스와 이 모듈 커스텀 클래스명 충돌 여부 최종 시각 QA** — 로컬에서는 `/framework/...` 경로가 404라 확인이 어려워, 실제 서버 배치 후 확인 필요.

## 상태
`module.json`의 `status`는 `dev`로 두었습니다. `/api/paper/news-feed` 라우트가 붙고 QA가 끝나면 `live`로 올려주세요.
