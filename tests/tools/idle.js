// Đo số thay đổi DOM + số bộ đếm sống khi app nhàn rỗi.  node tests/tools/idle.js app/land-gis.html [giây]
const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 800 } })).newPage(); await p.route(/^https?:/, r => r.abort());
  await p.addInitScript(() => { window.__mut = 0; window.__mutBy = {}; document.addEventListener('DOMContentLoaded', () => { new MutationObserver(ms => { window.__mut += ms.length; ms.forEach(m => { const k = (m.target.id || m.target.className || m.target.nodeName || '').toString().slice(0, 40) + ':' + m.type; window.__mutBy[k] = (window.__mutBy[k] || 0) + 1; }); }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true }); }); });
  await p.goto('file://' + require('path').resolve(process.argv[2])); await p.waitForTimeout(12000);
  await p.evaluate(() => { window.__mut = 0; window.__mutBy = {}; });
  const secs = +(process.argv[3] || 10); await p.waitForTimeout(secs * 1000);
  const r = await p.evaluate(() => ({ mut: window.__mut, top: Object.entries(window.__mutBy).sort((a, b) => b[1] - a[1]).slice(0, 6), reg: window.LG_TIMERS ? { s: window.LG_TIMERS.stats(), t: window.LG_TIMERS.table().slice(0, 14) } : null }));
  console.log(JSON.stringify({ secs, perSec: +(r.mut / secs).toFixed(1), ...r }, null, 1)); await b.close();
})();
