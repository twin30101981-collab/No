/* P09 — CPU profile (CDP Profiler) các trang nặng trên DỮ LIỆU THẬT. node prof_p09.js <app.html> [trang,trang…]
   Dùng hồ sơ trình duyệt bền (IndexedDB) tại /tmp/claude-0/p09/profile: lần đầu nhập 11 kỳ + TSBĐ, các lần sau dùng lại. Chỉ in tên hàm + vị trí, không in dữ liệu. */
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const APP = path.resolve(process.argv[2]), PAGES = (process.argv[3] || 'phidv,dashboard,tsbd,doisoat,tranop').split(','), D = '/tmp/claude-0/real/data/', PROF = '/tmp/claude-0/p09/profile';
const PER = ['31.12.2025.xlsx', '31.01.2026.xlsx', '28.02.2026.xlsx', '31.03.2026.xlsx', '30.04.2026.xlsx', '31.05.2026.xlsx', '30.06.2026.XLS', '31.07.2026.XLS', '31.08.2026.XLS', '30.09.2026.XLS', '20.10.2026.XLS', 'Sao ke tai san bao dam 20.10.2026.XLS'];
(async () => {
  const ctx = await chromium.launchPersistentContext(PROF, { headless: true, args: ['--no-sandbox'], viewport: { width: 1500, height: 900 } }); const p = ctx.pages()[0] || await ctx.newPage(); p.on('dialog', d => d.accept().catch(() => {}));
  await p.goto('file://' + APP); await p.waitForTimeout(6000);
  let n = await p.evaluate(() => DATA.qltd.length); const arch = await p.evaluate(() => (_archiveReportList || []).filter(x => x && x.autoDaily).length);
  if (!(n > 3000 && arch >= 11)) { console.log('nhập dữ liệu lần đầu…'); await p.evaluate(() => showPage('nhap')); await p.waitForTimeout(600); await p.setInputFiles('#hub-file', PER.map(f => D + f)); await p.waitForTimeout(3000); await p.evaluate(() => { window.confirm = () => true; tdHubRun(); });
    for (let i = 0; i < 600; i++) { await p.waitForTimeout(2000); if (await p.evaluate(() => !document.getElementById('hub-run').disabled)) break; } await p.waitForTimeout(3000); n = await p.evaluate(() => DATA.qltd.length); }
  console.log('hồ sơ:', n, 'mốc:', await p.evaluate(() => (_archiveReportList || []).length));
  const cdp = await ctx.newCDPSession(p); await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 });
  const html = fs.readFileSync(APP, 'utf8').split('\n');
  for (const pg of PAGES) {
    await p.evaluate(() => showPage('dashboard')); await p.waitForTimeout(2500); await p.evaluate(() => showPage('nhap')); await p.waitForTimeout(800);
    await cdp.send('Profiler.start'); const t = Date.now(); await p.evaluate(n => showPage(n), pg); await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))); const ms = Date.now() - t; await p.waitForTimeout(3500);
    const { profile } = await cdp.send('Profiler.stop'); const self = {}, byId = {}; profile.nodes.forEach(nd => byId[nd.id] = nd); const dt = profile.timeDeltas; let tot = 0;
    profile.samples.forEach((id, i) => { const nd = byId[id], cf = nd.callFrame, key = (cf.functionName || '(anon)') + ' @' + (cf.url ? path.basename(cf.url) : '') + ':' + (cf.lineNumber + 1); self[key] = (self[key] || 0) + (dt[i] || 0); tot += dt[i] || 0; });
    const top = Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, 9).filter(x => !/\(idle\)|\(program\)|\(garbage/.test(x[0]));
    console.log('\n== ' + pg + ' : tới khung hình ' + ms + ' ms ; mẫu CPU ' + Math.round(tot / 1000) + ' ms');
    top.forEach(([k, v]) => { const m = /:(\d+)$/.exec(k), ln = m ? html[+m[1] - 1] : ''; console.log('  ' + String(Math.round(v / 1000)).padStart(6) + ' ms  ' + k.slice(0, 90) + (ln ? '   | ' + ln.trim().slice(0, 90) : '')); });
  }
  await ctx.close();
})();
