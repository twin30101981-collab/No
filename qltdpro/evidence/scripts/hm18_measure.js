// Đo HM-18: số lần callback MutationObserver (theo nguồn tạo) + thời gian script khi nhàn rỗi và khi chuyển trang
const { chromium } = require('playwright'); const path = require('path');
const APP = path.resolve(process.argv[2]), FIX = path.resolve(process.argv[3]);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] }).catch(() => chromium.launch());
  const ctx = await b.newContext({ viewport: { width: 1500, height: 900 }, acceptDownloads: true }); const p = await ctx.newPage();
  await p.addInitScript(() => {
    window.__mo = []; const MO = window.MutationObserver;
    window.MutationObserver = function (cb) { const st = (new Error().stack || '').split('\n').slice(2, 3).join('').replace(/.*[(@ ]/, '').slice(-60); const rec = { id: window.__mo.length, src: st, calls: 0, ms: 0 }; window.__mo.push(rec);
      return new MO(function () { const t = performance.now(); try { return cb.apply(this, arguments); } finally { rec.calls++; rec.ms += performance.now() - t; } }); };
    window.MutationObserver.prototype = MO.prototype;
    window.__iv = []; const SI = window.setInterval;
    window.setInterval = function (fn, ms) { const st = (new Error().stack || '').split('\n').slice(2, 3).join('').replace(/.*[(@ ]/, '').slice(-60); const rec = { src: st, ms: ms, calls: 0, t: 0 };
      window.__iv.push(rec); return SI.call(window, function () { const t = performance.now(); try { return fn.apply(this, arguments); } finally { rec.calls++; rec.t += performance.now() - t; } }, ms); };
  });
  await p.goto('file://' + APP, { waitUntil: 'load' }); await p.waitForTimeout(5000);
  await p.evaluate(() => { try { pendingImportRows = null } catch (e) {} }); await p.setInputFiles('#import-file', FIX + '/20.10.2026.xlsx');
  for (let i = 0; i < 60; i++) { await p.waitForTimeout(500); if (await p.evaluate(() => { try { return !!pendingImportRows } catch (e) { return false } })) break; }
  await p.evaluate(() => doImport()); await p.waitForTimeout(800); await p.evaluate(() => completeImportToDataArchive()); await p.waitForTimeout(3500);
  const snap = () => p.evaluate(() => ({ mo: window.__mo.map(r => ({ ...r })), iv: window.__iv.map(r => ({ ...r })) }));
  const diff = (a, b2, k) => b2[k].map((r, i) => ({ ...r, calls: r.calls - (a[k][i] ? a[k][i].calls : 0), ms: +((r.ms || r.t) - ((a[k][i] && (a[k][i].ms !== undefined && k === 'mo' ? a[k][i].ms : a[k][i] ? a[k][i].t : 0)) || 0)).toFixed(1) }));
  const phases = {};
  for (const [name, fn] of [['idle10s', async () => { await p.waitForTimeout(10000); }], ['tour', async () => { for (const pg of ['dashboard', 'qltd', 'denhan', 'chlm', 'tsbd', 'giadat', 'dashboard']) { await p.evaluate(n => showPage(n), pg); await p.waitForTimeout(1500); } }]]) {
    const a = await snap(); const t0 = Date.now(); await fn(); const bb = await snap(); phases[name] = { wall: Date.now() - t0, mo: diff(a, bb, 'mo'), iv: diff(a, bb, 'iv') };
  }
  const perf = await p.evaluate(() => { const nav = performance.getEntriesByType('navigation')[0]; return { dcl: Math.round(nav.domContentLoadedEventEnd), nodes: document.getElementsByTagName('*').length }; });
  const lay = await p.evaluate(async () => { showPage('qltd'); await new Promise(r => setTimeout(r, 800)); showPage('dashboard'); const t = performance.now(); document.body.offsetHeight; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return Math.round(performance.now() - t); });
  console.log(JSON.stringify({ perf, dashboardNavFrames: lay, phases }, null, 1)); await b.close();
})();
