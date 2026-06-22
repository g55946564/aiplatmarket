# 05. 개발 진행 상황

> 이 문서는 **사람이 읽는 서사형 현황**입니다. 기계가 읽기 쉬운 스냅샷은
> `framework/memory/PROJECT_STATUS.json`을, 실시간 정확한 데이터는 `/api/ai-context`를 참고하세요.
> 이 문서는 주요 마일스톤마다 갱신하며, 매번 토씨 하나까지 정확할 필요는 없습니다.

---

## 5.1 현재 완료된 것

- **GNB 구조 개편**: 6개 카테고리(AI플랫폼/Commerce/Business/Community/Media/Lifestyle) 드롭다운으로
  메인 GNB 전면 재설계. 모바일 가로 스크롤 + 스크롤 힌트까지 포함.
- **ChatDoumi AI Core**: GPT/Claude/Gemini를 Adapter 패턴으로 통합, 모듈별 엔진 우선순위(`engineMap.js`)
  설정, 모든 엔진 실패 시 Rule(규칙 기반) 안전망까지 구현. `routeAI()`(LifeMap)와 `/api/itemzone/analyze`
  둘 다 AI Core 경유로 전환 완료.
- **독립 모듈 라우팅 시스템**: `MODULE_MAP` 기반으로 path(`/aird`)와 서브도메인(`aird.aiplatmarket.com`)
  동시 지원. `public/`과 `framework/` 둘 다 정적 서빙 확인·수정 완료.
- **AI아이템존**: 9단계 사업 코파일럿(등록→시장분석→특허→경쟁사→정부지원→공동개발→전문가→투자→판매)
  UI와 AI Core 연동 완료.
- **커뮤니티**: 글쓰기 박스가 실제로 동작하지 않던 문제(숨겨진 영역에 게시물이 들어가던 버그) 수정,
  탭별 실제 필터링 구현, "모임 만들기" 기능 신규 추가.
- **Sticky Footer 구조**: 짧은 페이지에서도 footer가 항상 화면 최하단에 고정되는 flex 구조로 전면 수정.
- **뉴스 신선도 보정**: API 실패 시 보여주던 폴백 뉴스의 하드코딩된 과거 날짜를 동적으로 보정.
- **Render 배포 안정화**: ENOENT, robots.txt, sitemap.xml 이슈 해결.
- **framework/memory + docs 체계**: 지금 이 문서 포함, 공식 프로젝트 헌법 구축 진행 중.

## 5.2 진행 중

- **AI인생·진로(LifeMap)**: 19개 학문 분야 중 핵심기능 60%, AI기능 40% — AI Core 연동은 됐으나
  학문별 프롬프트 정교화가 더 필요.
- **AI교육문화존**: 핵심기능 30% — 메뉴/기본 콘텐츠 단계.
- **AI홍보센터**: 핵심기능 40%, AI기능 20%.
- **뉴스 실시간성 근본 해결**: Naver API 키 설정 여부 점검 필요 (현재는 안전장치만 적용된 상태).

## 5.3 다음 개발 (단기)

- AIR&D, AI시뮬레이션, AI교육존, AI문화예술, AI게임존 — 각각 새 대화창에서 독립 개발 착수
  (`framework/memory/MODULE_DEV_GUIDE.md` 기준)
- module.json 기반 Platform Dashboard — 메인 페이지에 모듈 카드 노출 (현재는 GNB 드롭다운에만 존재)
- AGI 참여형 기능 1단계: 좋아요/댓글/포인트 — 01번 문서 철학("참여=일")의 첫 구현체
- 커뮤니티 "모임 만들기"의 Firestore 영속화 확인 및 모임 목록 별도 탭 뷰

## 5.4 장기 로드맵

| 마일스톤 | 목표 | 상태 |
|---|---|---|
| MVP | 구독자 200명 | 진행중 |
| Claude API 통합 + 공통모듈아키텍처 기반 | 구독자 500명 | 예정 |
| AI아이템존 풀런칭 + KT 믿:음 2.0 통합 | 구독자 1,000명 | 예정 |
| AI 통합 플랫폼 100개+ 모듈 | 장기 목표 | 예정 |

## 5.5 알려진 리스크 / 주의사항

- 메인 사이트(`public/index.html`)와 `framework/assets/css/common.css`의 디자인 토큰이 아직 완전히
  통일되지 않음 — 변수 이름은 같지만 값이 미세하게 다를 수 있어 점진적 통합 필요.
- ChatDoumi(`chatdoumi.com`)와 ChatDoumi AI Core는 이름이 같지만 별개 시스템 — 혼동 주의
  (`framework/memory/MASTER_CONTEXT.md` §1 참조).
- 독립 모듈이 늘어날수록 `MODULE_MAP`(index.js)과 각 module.json 간 정합성을 주기적으로 점검 필요.

---
*다음 문서: [06_DEPLOYMENT](./06_DEPLOYMENT.md) — GitHub/Render/서브도메인 배포 구조*
