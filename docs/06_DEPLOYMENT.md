# 06. 배포 구조

> GitHub·Render·독립모듈 배포·Path/서브도메인 방식을 정리합니다.

---

## 6.1 배포 파이프라인 (현재)

```
GitHub Desktop (로컬 커밋/푸시)
        ↓
GitHub 저장소 (origin)
        ↓ (Render가 자동 감지)
Render (Web Service, Node.js)
        ↓
aiplatmarket.com (실제 서비스)
```

형식 님은 GitHub Desktop으로 커밋·푸시하고, Render는 저장소에 push가 감지되면
자동으로 새 빌드를 시작합니다 (Render 대시보드에서 Auto-Deploy 설정 확인).

## 6.2 새 폴더(framework/, docs/, ai-core/, public/platform/ 등) 병합 방법

scaffold zip을 받으면:
1. 압축 해제
2. 기존 저장소 루트에 그대로 복사 (기존 `public/index.html`, `admin.html`은 덮어쓰지 않음 —
   scaffold에는 이 파일들이 포함되어 있지 않으므로 자동으로 안전합니다)
3. `git add . && git commit -m "framework/docs/모듈 구조 추가" && git push`
4. Render가 자동 재배포

**주의**: `index.js`는 메인 개발창에서 직접 수정한 버전을 별도로 받아 같은 방식으로 덮어써야 합니다
(scaffold zip에는 index.js가 포함되지 않습니다 — 메인 코드와 구조 스캐폴드를 분리 전달하기 때문).

## 6.3 독립 모듈 배포 — 별도 배포가 필요 없는 이유

각 모듈(`public/{group}/{id}/`)은 **메인 서버(index.js)가 그대로 정적 파일로 서빙**하므로,
모듈마다 별도의 Render 서비스를 만들 필요가 없습니다. 새 모듈 폴더를 저장소에 추가하고
push하면, 메인 서버가 재배포되면서 그 모듈도 함께 살아납니다.

예외적으로 모듈이 독자적인 백엔드(자체 DB, 자체 인증 등)가 필요할 만큼 커지면, 그때는
별도 Render 서비스 + 서브도메인 분리를 검토합니다 (예: ChatDoumi처럼 완전 분리 운영).

## 6.4 Path 방식 vs 서브도메인 방식

| 항목 | Path 방식 | 서브도메인 방식 |
|---|---|---|
| 예시 | `aiplatmarket.com/aird` | `aird.aiplatmarket.com` |
| 현재 상태 | ✅ 기본 동작 | ✅ 코드 준비됨, DNS 설정 필요 |
| 필요 작업 | 없음 (이미 동작) | 도메인 DNS에 와일드카드 서브도메인(`*.aiplatmarket.com`) A/CNAME 레코드 추가, Render에서 커스텀 도메인 등록 |
| 전환 비용 | - | **코드 수정 없음** — `index.js`가 `req.hostname`으로 자동 감지 |

**언제 서브도메인으로 전환하나**: 특정 모듈이 독립 브랜드처럼 키우고 싶을 때(예: "AIR&D"를
별도 서비스처럼 마케팅하고 싶을 때) 그 모듈만 서브도메인을 연결하면 됩니다. 나머지는 그대로
path 방식을 유지해도 무방합니다 — 두 방식이 공존 가능합니다.

## 6.5 환경변수 (Render 대시보드 → Environment)

| 변수 | 용도 | 필수 여부 |
|---|---|---|
| `OPENAI_API_KEY` | AI Core의 GPT Adapter | 선택 (없으면 자동 스킵) |
| `ANTHROPIC_API_KEY` | AI Core의 Claude Adapter | 선택 |
| `GEMINI_API_KEY` | AI Core의 Gemini Adapter | 선택 |
| `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET` | 실시간 뉴스 API | **중요** — 미설정 시 뉴스가 폴백 데이터로 표시됨 |
| `GOOGLE_APPLICATION_CREDENTIALS` (또는 서비스계정 JSON 경로) | Firebase/Firestore | 필수 |
| `ADMIN_TOKEN` | admin.html 보호 | 필수 (기본값 그대로 두면 경고 로그 출력) |

세 AI 엔진 키 중 하나도 없어도 서비스는 정상 동작합니다 (RuleAdapter가 항상 응답) —
다만 응답 품질이 떨어지므로 가능한 모두 설정하는 것을 권장합니다.

## 6.6 배포 전 체크리스트

- [ ] `node --check index.js` 로 문법 오류 없는지 확인
- [ ] 환경변수(6.5) 누락 없는지 Render 대시보드 확인
- [ ] `framework/`, `docs/`, `public/platform/` 등 새 폴더가 실제로 push 됐는지 GitHub에서 확인
- [ ] 배포 후 `/api/ai-core/status`, `/api/ai-context`, `/api/popup-config?key=intro` 응답 확인

---
*다음 문서: [07_AI_SIMULATION](./07_AI_SIMULATION.md) — 사업성·기여도·수익분배 시뮬레이션*
