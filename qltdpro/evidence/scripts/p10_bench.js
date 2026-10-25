/* P10 — đo thời gian mở trang trên DỮ LIỆU THẬT (trung vị 3 lần). node p10_bench.js <app.html> [trang,trang…] [--profile DIR] [--data DIR]
   Hồ sơ trình duyệt bền: lần đầu nhập 11 kỳ + TSBĐ qua Trung tâm nhập, các lần sau dùng lại. Chỉ in số đo, không in dữ liệu. */
const { chromium } = require('playwright'); const path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const APP = path.resolve(process.argv[2]), PAGES = (process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : 'dashboard,tranop,phidv,tsbd,doisoat').split(',');
const D = arg('--data', '/tmp/claude-0/real/data') + '/', PROF = arg('--profile', '/tmp/claude-0/p10/profile');
const PER = ['31.12.2025.xlsx', '31.01.2026.xlsx', '28.02.2026.xlsx', '31.03.2026.xlsx', '30.04.2026.xlsx', '31.05.2026.xlsx', '30.06.2026.XLS', '31.07.2026.XLS', '31.08.2026.XLS', '30.09.2026.XLS', '20.10.2026.XLS', 'Sao ke tai san bao dam 20.10.2026.XLS'];
(async () => {
  const ctx = await chromium.launchPersistentContext(PROF, { headless: true, args: ['--no-sandbox'], viewport: { width: 1500, height: 900 } }); const p = ctx.pages()[0] || await ctx.newPage(); p.on('dialog', d => d.accept().catch(() => {}));
  await p.addInitScript(() => { window.__lt = []; try { new PerformanceObserver(l => l.getEntries().forEach(e => window.__lt.push(e.duration))).observe({ type: 'longtask', buffered: true }); } catch (e) {} });
  await p.goto('file://' + APP); await p.waitForTimeout(6000);
  let n = await p.evaluate(() => DATA.qltd.length); const arch = await p.evaluate(() => (_archiveReportList || []).filter(x => x && x.autoDaily).length);
  if (!(n > 3000 && arch >= 11)) { console.log('nhập dữ liệu lần đầu…'); await p.evaluate(() => showPage('nhap')); await p.waitForTimeout(600); await p.setInputFiles('#hub-file', PER.map(f => D + f)); await p.waitForTimeout(3000); await p.evaluate(() => { window.confirm = () => true; tdHubRun(); });
    for (let i = 0; i < 600; i++) { await p.waitForTimeout(2000); if (await p.evaluate(() => !document.getElementById('hub-run').disabled)) break; } await p.waitForTimeout(3000); n = await p.evaluate(() => DATA.qltd.length); }
  console.log('hồ sơ:', n, 'mốc:', await p.evaluate(() => (_archiveReportList || []).length));
  const res = {};
  for (const pg of PAGES) {
    const ts = [], lts = [], nodes = [];
    for (let k = 0; k < 3; k++) {
      await p.evaluate(() => showPage('nhap')); await p.waitForTimeout(800); await p.evaluate(() => { window.__lt = []; });
      const t = await p.evaluate(async n => { const t0 = performance.now(); showPage(n); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return performance.now() - t0; }, pg);
      await p.waitForTimeout(1500); ts.push(Math.round(t)); lts.push(Math.round(Math.max(0, ...(await p.evaluate(() => window.__lt)))));
      nodes.push(await p.evaluate(n => { const e = document.getElementById('page-' + n); return e ? e.getElementsByTagName('*').length : -1; }, pg));
    }
    const med = a => a.slice().sort((x, y) => x - y)[1];
    res[pg] = { ms: med(ts), longtask: med(lts), nodes: med(nodes), runs: ts };
    console.log(pg.padEnd(10), 'mở', String(res[pg].ms).padStart(5), 'ms · longtask lớn nhất', String(res[pg].longtask).padStart(5), 'ms · nút DOM trang', res[pg].nodes, '· các lần', ts.join('/'));
  }
  console.log('JSON', JSON.stringify(res));
  await ctx.close();
})();
