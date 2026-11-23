#!/usr/bin/env node
'use strict';
/*
 edition.json → 월간 e북 PDF(실제 텍스트·한글 폰트 임베드·면별 북마크) + 1면 썸네일 JPG
 사용:  node tools/paper/build-edition-pdf.js [edition.json 경로] [출력폴더]
 기본:  public/newspaper/paper/edition.json  →  public/newspaper/paper/assets/
 결과:  assets/{YYYYMM}_국민경제㊉월간편집본A4({N}p).pdf  +  같은 이름의 .jpg
 필요:  npm i playwright && npx playwright install chromium  (서버에 한글 폰트: fonts-noto-cjk)
*/
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const { buildHtml } = require('./edition-template');

(async () => {
  const paper = path.resolve(__dirname, '..', '..', 'public', 'newspaper', 'paper');
  const src = process.argv[2] || path.join(paper, 'edition.json');
  const out = process.argv[3] || path.join(paper, 'assets');
  const ed = JSON.parse(fs.readFileSync(src, 'utf8'));
  if (!Array.isArray(ed.pages) || !ed.pages.length) throw new Error('edition.json 에 pages 가 없습니다');
  const name = `${String(ed.month).replace('-', '')}_국민경제㊉월간편집본A4(${ed.pages.length}p)`;
  fs.mkdirSync(out, { recursive: true });
  const pdf = path.join(out, name + '.pdf'), jpg = path.join(out, name + '.jpg');

  const browser = await chromium.launch();
  try {
    const pg = await browser.newPage({ viewport: { width: 794, height: 1123 } });
    await pg.setContent(buildHtml(ed), { waitUntil: 'load' });
    await pg.evaluate(() => document.fonts.ready);
    const opt = { path: pdf, preferCSSPageSize: true, printBackground: true };
    try { await pg.pdf({ ...opt, outline: true, tagged: true }); } catch (e) { await pg.pdf(opt); }
    await pg.locator('.pg').first().screenshot({ path: jpg, type: 'jpeg', quality: 82 });
  } finally { await browser.close(); }
  console.log('PDF :', pdf, '\nJPG :', jpg);
})().catch(err => { console.error('[build-edition-pdf] 실패:', err); process.exit(1); });
