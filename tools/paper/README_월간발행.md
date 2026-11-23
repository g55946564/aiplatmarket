# 월간 최신호 발행 (국민경제㊉ 지면보기) — Node 서버용

## 저장 위치 (중요)
`public/` 안의 파일은 브라우저에서 주소로 그대로 열립니다. 생성 도구와 이 문서는 **public 밖**에 둡니다.

```
메인/                              ← index.js 가 있는 프로젝트 루트
├─ tools/paper/                    ← 이 폴더 전체 (public 밖, 외부 비공개)
│   ├─ README_월간발행.md
│   ├─ edition-template.js
│   └─ build-edition-pdf.js
└─ public/newspaper/paper/         ← 공개 폴더
    ├─ index.html                  지면보기
    ├─ edition.json                월간 편집본 원본(편집·발행 대상)
    ├─ assets/  (최신호 PDF·JPG, 지난신문 썸네일)
    └─ archive/ (지난신문 PDF)
```

## 월간 구성 (16면)
표1(표지·헤드라인) · 표2(목차·주요 단신) · 1~12면(주제별 기사) · 표3(독자 안내) · 표4(신문사 안내)

## 매월 발행 순서
1. **초안**: `/paper?edit=1` → 최신호 열기 → **새 호 생성** (메인 카테고리 기사에서 발췌)
2. **편집**: **편집 모드**에서 제목·본문·안내문 수정, 기사 제외 → **JSON 저장**
3. **발행**: 저장된 파일을 `public/newspaper/paper/edition.json` 으로 교체 → HTML 지면 즉시 반영
4. **PDF 생성**: 프로젝트 루트에서 `node tools/paper/build-edition-pdf.js`
   → `public/newspaper/paper/assets/{YYYYMM}_국민경제㊉월간편집본A4(16p).pdf` + 같은 이름 `.jpg`
5. **연결**: `public/newspaper/paper/index.html` 의 `LATEST.volumes` 한 줄에서 파일명·pages 교체
6. **보관**: 지난달 PDF는 `archive/` 로 이동, `ISSUES` 에 한 줄 추가 (썸네일은 `assets/` 에 같은 이름 JPG)

표3·표4의 "(편집자 입력)" 문구(연락처·발행인·등록번호 등)는 편집 모드에서 직접 채우세요.

## 서버 준비 (1회)
```bash
npm i playwright
npx playwright install --with-deps chromium
sudo apt-get install -y fonts-nanum fonts-noto-cjk   # 나눔고딕(코렐·인디자인 재편집용, 필수) + 보조 한글 폰트
fc-cache -f
# 생성 후 확인:  pdffonts 파일.pdf  →  type 이 'CID TrueType' 이면 코렐에서 글자 편집 가능, 'Type 3' 이면 곡선으로 열림(폰트 미설치)
```

## 재편집 원칙
기준 원본은 항상 `edition.json` 입니다. 수정은 JSON(편집 화면)에서 하고 PDF를 다시 생성하세요. PDF는 실제 텍스트라 Acrobat 등으로 간단 수정은 가능하지만 JSON과 어긋나므로 권장하지 않습니다.

## AI 챗도우미 연동 설계 (차후, 서버 설계 창 승인 후 구현)
- 챗도우미 역할: ① 월 1회 `edition.json` 초안 작성(pages[]: kind/label/sec/items[]/notes[]) ② 편집자 검수 요청 ③ 발행 요청. **사람 승인 없이 자동 발행하지 않음**
- 발행 API(관리자 인증 필수): `POST /api/paper/edition`
  1. JSON 스키마 검증(pages 존재, 면 수, 필수 필드)
  2. 기존 `edition.json` 을 `edition-YYYY-MM.json` 으로 백업 후 덮어쓰기
  3. `child_process` 로 `node tools/paper/build-edition-pdf.js` 실행 (또는 `require` 로 직접 호출)
  4. 결과 PDF·JPG 파일명을 응답으로 반환 → `LATEST` 연결은 설정 JSON 으로 분리하는 것을 권장
- 신문 종류 확장: JSON 의 `paper` 키(kmk / 복지신문 / 내고장뉴스)별로 같은 흐름 재사용


## 코렐/인디자인 재편집
1. PDF 받기: 사이트 지면보기 → 최신호 PDF 카드 → 뷰어 상단 [PDF 열기·인쇄] → 새 탭에서 다운로드(⬇) 아이콘. 또는 서버 `public/newspaper/paper/assets/` 의 파일을 직접 복사.
2. 코렐: 파일 > 열기 > PDF 선택 > 가져오기 창에서 '텍스트를 텍스트로' 선택, 페이지 범위 전체. 인디자인: PDF를 일러스트레이터로 열어 편집하거나 텍스트를 복사해 배치.
3. 작업 PC에도 나눔고딕을 설치해야 글꼴이 바뀌지 않습니다.
