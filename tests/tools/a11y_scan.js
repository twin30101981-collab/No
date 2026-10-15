// Quét truy cập tự động (HM-08h): nút không tên, ô nhập không nhãn, tiêu đề nhảy cấp, onclick nội dòng. Dùng: node tests/tools/a11y_scan.js app/land-gis.html [--json]
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path');
exports.scan = async (p) => p.evaluate(() => {
  const vis = e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && (r.width > 0 || r.height > 0 || e.closest('[hidden]') === null && cs.position === 'fixed'); };
  const txt = e => (e.getAttribute('aria-label') || e.getAttribute('title') || e.innerText || e.textContent || '').replace(/[\s​]+/g, ' ').trim();
  const nameOfBtn = b => { if (b.getAttribute('aria-label') || b.getAttribute('aria-labelledby')) return true; const t = (b.innerText || '').replace(/[\s​]+/g, ' ').trim(); if (t) return true; if (b.getAttribute('title')) return true; const im = b.querySelector('img[alt]:not([alt=""])'); return !!im; };
  const labelOf = i => { if (i.type === 'hidden') return true; if (i.getAttribute('aria-label') || i.getAttribute('aria-labelledby') || i.getAttribute('title')) return true; if (i.id && document.querySelector('label[for="' + CSS.escape(i.id) + '"]')) return true; if (i.closest('label')) return true; return false; };
  const out = { buttons: [], inputs: [], headings: [], inlineOnclick: 0 };
  document.querySelectorAll('button, [role=button], a[href]').forEach(b => { if (vis(b) && !nameOfBtn(b) && !txt(b)) out.buttons.push((b.id ? '#' + b.id : '') + '.' + (b.className + '').split(' ')[0] + ' ' + (b.outerHTML || '').slice(0, 70)); });
  document.querySelectorAll('input, select, textarea').forEach(i => { if (vis(i) && !labelOf(i) && i.type !== 'hidden' && i.type !== 'submit' && i.type !== 'button') out.inputs.push((i.id ? '#' + i.id : '') + ' ' + i.type + ' ' + (i.outerHTML || '').slice(0, 70)); });
  let prev = 0; document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(h => { if (!vis(h)) return; const l = +h.tagName[1]; if (prev && l > prev + 1) out.headings.push('h' + prev + '→h' + l + ' "' + txt(h).slice(0, 30) + '"'); prev = l; });
  out.inlineOnclick = document.querySelectorAll('[onclick]').length;
  return out;
});
if (require.main === module) (async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); await p.route(/^https?:/, r => r.abort());
  await p.goto('file://' + path.resolve(process.argv[2])); await p.waitForTimeout(3500);
  const res = {}; res.map = await exports.scan(p);
  const tab = async (sel) => { await p.evaluate(s => { const b = document.querySelector(s); b && b.click(); }, sel); await p.waitForTimeout(700); };
  const docks = await p.evaluate(() => Array.from(document.querySelectorAll('.lg103-dbtn')).map((b, i) => i));
  for (const i of docks) { await p.evaluate(i => document.querySelectorAll('.lg103-dbtn')[i].click(), i); await p.waitForTimeout(900); res['dock' + i] = await exports.scan(p); }
  console.log(JSON.stringify(res, null, 1).slice(0, 6000)); await b.close();
})();
