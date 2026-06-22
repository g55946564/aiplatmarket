# AI플랫마켓 공식 문서 (docs/) — 프로젝트 헌법

> 이 폴더는 AI플랫마켓의 **프로젝트 헌법(Project Constitution)**입니다.
> 단순 사용 설명서가 아니라, 사람 개발자와 AI(ChatGPT/Claude/Gemini/향후 추가될 모든 AI)가
> 수년에 걸쳐 프로젝트가 성장하더라도 **동일한 철학과 구조를 공유**하기 위한 공식 설계 문서입니다.
>
> 빠르게 시작하려면 `framework/memory/AI_BOOTSTRAP.md`부터 읽으세요.
> 이 docs/ 는 그 부트스트랩 문서들이 다 답하지 못하는 **깊이 있는 내용**을 담습니다.

## 목차

| 문서 | 내용 |
|---|---|
| [01_VISION_PHILOSOPHY](./01_VISION_PHILOSOPHY.md) | 프로젝트 비전과 철학 — 사람 중심, 참여=일, 기여도·수익분배, 공진화 |
| [02_SYSTEM_ARCHITECTURE](./02_SYSTEM_ARCHITECTURE.md) | Framework·AI Core·memory·docs·6개 그룹·독립모듈·module.json |
| [03_DEV_STANDARDS](./03_DEV_STANDARDS.md) | 공통 CSS·JS·Router·API·AI Core 호출 규칙 |
| [04_AI_DEV_STANDARDS](./04_AI_DEV_STANDARDS.md) | ChatGPT·Claude·Gemini·향후 AI 공통 작업 규칙 |
| [05_PROJECT_STATUS](./05_PROJECT_STATUS.md) | 완료/진행중/다음/장기로드맵 (사람이 읽는 서술형) |
| [06_DEPLOYMENT](./06_DEPLOYMENT.md) | GitHub·GitHub Desktop·Render·독립모듈배포·Path/서브도메인 |
| [07_AI_SIMULATION](./07_AI_SIMULATION.md) | 사업성·경쟁력·참여도·기여도·수익분배·투자 시뮬레이션 |
| [08_LIFEMAP_INTEGRATION](./08_LIFEMAP_INTEGRATION.md) | LifeMap 프로젝트와의 연동 구조 |
| [09_AGI_ASI_ROADMAP](./09_AGI_ASI_ROADMAP.md) | 향후 AGI/ASI 확장 방향 |

## 이 문서를 읽는 AI에게

당신이 ChatGPT든, Claude든, Gemini든, 혹은 아직 이름이 없는 미래의 AI든 —
이 docs/를 읽었다면 다음을 약속해 주세요:

1. 여기 적힌 **AI Core 호출 규칙**을 우회하지 않습니다 (직접 외부 AI API를 호출하지 않습니다).
2. 여기 적힌 **철학(01번 문서)**에 반하는 기능을 제안하지 않습니다 — 특히 사람의 참여를 배제하거나, 기여도 측정을 불투명하게 만드는 방향.
3. 구조를 변경해야 한다고 판단되면, 임의로 바꾸지 않고 **이 문서들을 먼저 갱신할 것을 제안**합니다. 문서와 코드가 어긋나면 항상 둘 중 하나를 맞추는 작업을 먼저 합니다.

## 문서 갱신 원칙

- 이 docs/는 "한 번 쓰고 끝"이 아니라 **프로젝트와 함께 계속 진화**합니다.
- 단, 01(철학)과 02(아키텍처 큰 틀)는 거의 바뀌지 않아야 합니다 — 자주 바뀐다면 애초에 설계가 흔들린다는 신호입니다.
- 05(진행상황)는 가장 자주 갱신됩니다. 동적 정보는 `/api/ai-context`가 더 정확하니, 05번 문서는 "사람이 읽는 서사" 역할에 집중합니다.
