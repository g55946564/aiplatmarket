# 국민경제㊉ 디지털 신문 (paper.aiplatmarket.com)

소비자·소상공인 상생 플랫폼 **AI플랫마켓**의 독립 모듈로 만든 디지털 신문 아카이브입니다.

## 파일 구조

```
/
├─ index.html        메인 게이트웨이(지난 신문 목록) 페이지
├─ viewer.html        신문 뷰어 (페이지 넘김 + 모바일 반응형)
├─ CNAME              GitHub Pages 커스텀 도메인 설정 (paper.aiplatmarket.com)
├─ assets/            표지 썸네일 이미지
│   └─ thumb_201605.jpg
└─ archive/           호별 PDF 원본 (예: archive/202607.pdf)
```

## index.html (메인 화면)

- 상단 타이틀 + 검색창(돋보기 버튼, 실시간 필터)
- 좌측: 지역별 사이드바 (PC 고정 노출 / 모바일은 좌측 상단 ☰ 버튼으로 열림)
- 우측: ☰ 버튼으로 열리는 퀵메뉴 드로어 — 탭(AI플랫마켓 소식 / 소상공인 정보 / 오늘의 뉴스 / 상생 스토어 / 이벤트)을 누르면 해당 실시간 피드가 즉시 표시됩니다.
- 중앙: 지난 호 썸네일 그리드 (PC 5열 · 태블릿 3열 · 모바일 2열, 자동 반응형)
- 하단: 국민경제㊉ 신문사 안내 Footer

썸네일/피드 데이터는 `index.html` 안의 `ISSUES`, `FEEDS` 자바스크립트 배열에 있습니다. 실제 서비스에서는 이 부분을 백엔드 API(JSON) 응답으로 교체하시면 됩니다.

## viewer.html (신문 뷰어) — 모바일 반응형 버그 수정

**원인**: 기존 코드는 페이지 로드 "그 순간"의 화면 폭이 768px 이하일 때만 모바일용 PDF `iframe.src`를 설정했습니다. 팝업으로 열리거나 로드 이후 화면 폭이 바뀌는 경우 모바일 화면의 iframe에 `src`가 비어 있어 빈 화면처럼 보였습니다.

**수정 내용**
1. 모바일 `iframe.src`를 항상 초기화 시점에 세팅 (폭 조건 제거)
2. `resize`, `orientationchange` 이벤트에 리스너를 추가해 화면 폭이 바뀔 때마다 데스크톱/모바일 상태를 재동기화
3. 메인 화면의 썸네일은 **모달/iframe 내장이 아닌 일반 페이지 이동**(`<a href="viewer.html?...">`)으로 연결 — 뷰어 자체의 미디어쿼리가 실제 브라우저 뷰포트를 정확히 기준으로 작동하도록 함
4. 페이지 생성 로직을 `document.write` 대신 DOM API로 재작성 (안정성 향상)

## 호(issue) 연결 방식

썸네일을 클릭하면 다음과 같은 URL로 이동합니다.

```
viewer.html?id=202607&title=국민경제㊉나눔 2026년 7월호&pages=16
```

- `id` : PDF 파일명(확장자 제외). 기본적으로 `archive/{id}.pdf`를 불러옵니다.
- `title` : 뷰어 헤더/사이드바에 표시할 제목
- `pages` : 총 페이지 수 (기본 16)
- `file` : PDF 경로를 직접 지정하고 싶을 때 (예: `&file=archive/2026-07-특별호.pdf`)

새 호를 추가하려면:
1. `archive/{id}.pdf` 파일 업로드
2. 표지 이미지를 `assets/`에 추가
3. `index.html`의 `ISSUES` 배열에 항목 한 줄 추가

## GitHub 저장소 업로드 & 배포 방법

이 대화 환경은 외부 네트워크에 접근할 수 없어 GitHub에 직접 업로드(푸시)할 수 없습니다. 아래 순서대로 직접 업로드해 주세요.

### 1) 새 저장소 만들고 업로드
```bash
# 로컬 PC에서
git init
git add .
git commit -m "국민경제㊉ 디지털 신문 모듈 초기 배포"
git branch -M main
git remote add origin https://github.com/{계정명}/{저장소명}.git
git push -u origin main
```
또는 GitHub 웹사이트 → New repository → "Add file → Upload files"로 이 폴더를 통째로 드래그해도 됩니다.

### 2) GitHub Pages 활성화
저장소 → Settings → Pages → Source를 `main` 브랜치 `/ (root)`로 설정합니다.

### 3) 서브도메인: paper.aiplatmarket.com
1. 저장소에 이미 포함된 `CNAME` 파일(`paper.aiplatmarket.com`)이 자동 인식됩니다.
2. 도메인 관리 서비스(가비아, 후이즈, Cloudflare 등)에서 DNS 레코드 추가:
   ```
   타입: CNAME
   호스트: paper
   값: {계정명}.github.io
   ```
3. 반영까지 최대 몇 시간 소요될 수 있습니다. GitHub Pages 설정 화면에서 "Enforce HTTPS"도 켜 주세요.

### 4) 경로 방식: aiplatmarket.com/paper
GitHub Pages는 저장소 하나당 도메인/서브도메인 1개만 직접 연결할 수 있어, `aiplatmarket.com/paper` 처럼 **메인 도메인의 하위 경로**로 동일 콘텐츠를 노출하려면 메인 사이트(aiplatmarket.com)를 서비스하는 서버·CDN 쪽에서 다음 중 하나가 필요합니다.

- **리버스 프록시/리라이트**: `aiplatmarket.com/paper/*` 요청을 `paper.aiplatmarket.com/*`로 내부 전달 (Nginx, Cloudflare Workers, Vercel rewrites 등에서 설정)
- **간단 리다이렉트**: `aiplatmarket.com/paper` 접속 시 `paper.aiplatmarket.com`으로 301 리다이렉트

메인 도메인 서버 설정 권한이 있으시면 이 부분은 별도로 안내해 드릴 수 있습니다.

---
© 2026 국민경제㊉ & AI플랫마켓. All rights reserved.
