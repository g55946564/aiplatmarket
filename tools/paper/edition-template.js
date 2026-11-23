'use strict';
// 코렐·인디자인 재편집용: 정적 TrueType 한글 고딕(NanumGothic)을 먼저 사용 → PDF에 편집 가능한 글꼴로 포함됨
// (Noto Sans CJK 같은 OpenType-CFF 폰트는 Type 3로 들어가 코렐에서 글자가 곡선으로 열림)
// edition.json → 인쇄용 HTML(A4, 표1~표4 + 본문면). 의존성 없음 (순수 함수)
const e = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
@page{size:210mm 297mm;margin:0}
*{box-sizing:border-box}
body{margin:0;font-family:'NanumGothic','Nanum Gothic','Noto Sans KR','Noto Sans CJK KR','Malgun Gothic','Apple SD Gothic Neo',sans-serif;color:#221f1a;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.pg{width:210mm;height:297mm;padding:13mm 14mm 10mm;page-break-after:always;overflow:hidden;position:relative}
.pg:last-child{page-break-after:auto}
.mast{font-size:40pt;font-weight:900;color:#1b4332;letter-spacing:.12em;line-height:1.1}.mast i{font-style:normal;color:#e53935}
.mast small{display:block;font-size:10pt;font-weight:500;color:#5a5448;letter-spacing:0;margin-top:2mm}
.eh{display:flex;justify-content:space-between;border-bottom:.6mm solid #221f1a;padding:1.5mm 0;margin:4mm 0 5mm;font-size:8.5pt;color:#5a5448}.eh b{color:#1b4332;font-weight:900}
.at{padding-bottom:4mm;margin-bottom:4mm;border-bottom:.3mm solid #c9bfa8}.at:last-of-type{border-bottom:0}
.at small{color:#2e7d32;font-weight:700;font-size:8.5pt}
.at h3{margin:1mm 0 1.5mm;font-size:17pt;line-height:1.3;font-weight:900}.lead h3{font-size:24pt}
.dk{margin:0 0 1.5mm;font-weight:500;color:#5a5448;font-size:10pt}.by{margin:0 0 2.5mm;font-size:8pt;color:#5a5448}
.bd{column-count:2;column-gap:6mm;font-size:9.3pt;line-height:1.65;text-align:justify}.bd p{margin:0 0 2mm}
.sb{list-style:none;margin:3mm 0 0;padding:2.5mm 3.5mm;background:#f6f3ea;font-size:8.6pt;line-height:1.55}.sb li+li{margin-top:1.4mm}.sb strong{color:#1b4332}
.br{background:#f6f3ea;padding:3.5mm 4.5mm;font-size:8.8pt;line-height:1.55;margin-bottom:5mm}.br h4{margin:0 0 2mm;font-size:10.5pt;color:#1b4332}.br p{margin:0 0 1.6mm}.br em{font-style:normal;color:#5a5448}
.toc{list-style:none;margin:0 0 6mm;padding:0;font-size:10pt;line-height:1.5}
.toc li{display:flex;gap:4mm;padding:1.6mm 0;border-bottom:.3mm solid #c9bfa8}
.toc b{flex:none;width:14mm;color:#2e7d32}.toc span{color:#5a5448;font-size:8.6pt}
.nt{background:#f6f3ea;padding:6mm 7mm;margin-bottom:6mm}.nt h4{margin:0 0 3mm;font-size:14pt;color:#1b4332}.nt p{margin:0;font-size:10.5pt;line-height:1.7}
.no{position:absolute;bottom:6mm;left:0;right:0;text-align:center;font-size:8pt;color:#777}`;

function page(ed, pg, i, all) {
  const n = i + 1, label = pg.label || n + '면';
  const items = (pg.items || []).map((it, k) =>
    `<article class="at${pg.kind === 'cover1' && k === 0 ? ' lead' : ''}"><small>${e(it.kicker || it.catName)}</small>` +
    `<h3>${e(it.title)}</h3><p class="dk">${e(it.dek)}</p><p class="by">${e(it.byline)}</p>` +
    `<div class="bd">${(it.body || []).map(t => `<p>${e(t)}</p>`).join('')}</div>` +
    (it.subs && it.subs.length ? `<ul class="sb">${it.subs.map(s => `<li><strong>${e(s.title)}</strong> ${e(s.body)}</li>`).join('')}</ul>` : '') +
    '</article>').join('');
  const brief = pg.briefs ? `<div class="br"><h4>주요 뉴스 단신</h4>${pg.briefs.map(b => `<p><strong>${e(b.title)}</strong> ${e(b.summary)} <em>${e(b.source)}</em></p>`).join('')}</div>` : '';
  const toc = pg.toc ? `<ul class="toc">${all.filter(p => p.kind === 'body').map(p => `<li><b>${e(p.label)}</b><div>${e(p.sec)}<br><span>${(p.items || []).map(x => e(x.title)).join(' · ')}</span></div></li>`).join('')}</ul>` : '';
  const notes = (pg.notes || []).map(x => `<div class="nt"><h4>${e(x.title)}</h4><p>${e(x.text)}</p></div>`).join('');
  const [y, m] = String(ed.month).split('-');
  const mast = pg.kind === 'cover1' ? `<div class="mast">국민경제<i>㊉</i><small>월간 디지털신문 · ${y}년 ${+m}월호</small></div>` : '';
  return `<section class="pg" data-label="${e(label)}">${mast}<div class="eh"><b>${e(ed.title)}</b><span>${e(pg.sec)}</span><span>${e(label)}</span></div>${toc}${items}${brief}${notes}<div class="no">${e(label)}</div></section>`;
}

function buildHtml(ed) {
  const body = ed.pages.map((p, i, all) => page(ed, p, i, all)).join('');
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${e(ed.title)} ${e(ed.month)} 월간 편집본</title><style>${CSS}</style></head><body>${body}</body></html>`;
}
module.exports = { buildHtml };
