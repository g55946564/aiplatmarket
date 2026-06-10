// scheduler.js
const cron = require('node-cron');

console.log('🚀 AI플랫마켓 스케줄러 시작');

// 매시간 상태 확인
cron.schedule('0 * * * *', () => {
  console.log(
    '[스케줄러] 정상 작동 중:',
    new Date().toLocaleString('ko-KR')
  );
});

// 3시간마다 뉴스 수집
cron.schedule('0 */3 * * *', async () => {

  try {

    console.log(
      '[스케줄러] 뉴스 수집 시작'
    );

    // TODO
    // Firestore 저장
    // RSS 수집
    // 블로그 생성

    console.log(
      '[스케줄러] 뉴스 수집 완료'
    );

  } catch (err) {

    console.error(
      '[스케줄러 오류]',
      err.message
    );

  }

});

// 매일 23:50
cron.schedule('50 23 * * *', async () => {

  try {

    console.log(
      '[스케줄러] 일일 보고서 생성'
    );

    // TODO
    // 통계 생성
    // 관리자 보고서 생성

    console.log(
      '[스케줄러] 보고서 완료'
    );

  } catch (err) {

    console.error(
      '[스케줄러 오류]',
      err.message
    );

  }

});

// 프로세스 종료 방지
process.stdin.resume();