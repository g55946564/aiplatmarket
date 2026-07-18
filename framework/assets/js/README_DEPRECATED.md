# ⚠️ core.js 사용 중단 안내

`framework/assets/js/core.js`(자동 헤더/Footer 주입 방식)는 실제 메인 사이트의
GNB/Footer를 정확히 복제하지 못하고 별도로 재구성한 축소판이어서 사용을 중단합니다.

**대신 사용할 것**: `framework/standard-header-footer/AIPLATMARKET_HEADER_FOOTER.html`

이 파일은 메인 사이트의 실제 GNB/Footer 코드를 그대로 추출한 것으로, 각 독립
프로젝트 개발창에서 직접 자기 `index.html`에 복사해 넣는 방식입니다. 자동 주입이
아니라 "코드 그대로 붙여넣기"이므로 원본과 어긋날 일이 없습니다.

`core.js`는 삭제하지 않고 남겨두지만(과거 참조용), 새 프로젝트에서는 사용하지 마세요.
