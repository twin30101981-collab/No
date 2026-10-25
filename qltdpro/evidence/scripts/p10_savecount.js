/* P10 (T5) — đếm số lần gọi saveData, số lần LƯU THẬT (saveToLS) / số lần ghi localStorage bản dư nợ / CPU nén khi nhập qua Trung tâm nhập trên DỮ LIỆU THẬT.
   node p10_savecount.js <app.html> [số kỳ=3] [--data DIR]. Hồ sơ trình duyệt mới mỗi lần (không dùng lại dữ liệu cũ). Chỉ in số đếm. */
const { chromium } = require('playwright'); const path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const APP = path.resolve(process.argv[2]), N = +(process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : 3), D = arg('--data', '/tmp/claude-0/real/data') + '/';
const PER = ['31.12.2025.xlsx', '31.01.2026.xlsx', '28.02.2026.xlsx', '31.03.2026.xlsx', '30.04.2026.xlsx', '31.05.2026.xlsx', '30.06.2026.XLS', '31.07.2026.XLS', '31.08.2026.XLS', '30.09.2026.XLS', '20.10.2026.XLS'].slice(-N);
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] }); const ctx = await b.newContext({ viewport: { width: 1500, height: 900 } }); const p = await ctx.newPage(); p.on('dialog', d => d.accept().catch(() => {}));
  await p.addInitScript(() => { window.__lt = []; try { new PerformanceObserver(l => l.getEntries().forEach(e => window.__lt.push(e.duration))).observe({ type: 'longtask', buffered: true }); } catch (e) {} });
  await p.goto('file://' + APP); await p.waitForTimeout(5000);
  await p.evaluate(() => { const C = window.__cnt = { save: 0, real: 0, ls: 0, lsKeys: {}, lzMs: 0, lzBig: 0 }; const ol = window.saveToLS; window.saveToLS = function () { C.real++; return ol.apply(this, arguments); }; try { saveToLS = window.saveToLS; } catch (e) {} const os = window.saveData; window.saveData = function () { C.save++; return os.apply(this, arguments); }; try { saveData = window.saveData; } catch (e) {}
    const si = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (String(v).length > 100000) { C.ls++; C.lsKeys[k] = (C.lsKeys[k] || 0) + 1; } return si.apply(this, arguments); };
    const oc = LZS.compressToBase64; LZS.compressToBase64 = function (s) { const t = performance.now(), r = oc.call(this, s); if (s && s.length >= 20000) { C.lzBig++; C.lzMs += performance.now() - t; } return r; }; });
  await p.evaluate(() => showPage('nhap')); await p.waitForTimeout(600); await p.setInputFiles('#hub-file', PER.map(f => D + f)); await p.waitForTimeout(3000);
  const t0 = Date.now(); await p.evaluate(() => { window.__lt = []; window.confirm = () => true; tdHubRun(); });
  for (let i = 0; i < 600; i++) { await p.waitForTimeout(1000); if (await p.evaluate(() => !document.getElementById('hub-run').disabled)) break; }
  const tRun = Date.now() - t0; await p.waitForTimeout(12000); // gồm cả lưu tự động trễ (8 s sau lần sửa cuối)
  const r = await p.evaluate(() => ({ cnt: window.__cnt, n: DATA.qltd.length, arch: (_archiveReportList || []).length, ltMax: Math.round(Math.max(0, ...window.__lt)), ltSum: Math.round(window.__lt.reduce((s, x) => s + x, 0)) }));
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(6000); r.afterReload = await p.evaluate(() => DATA.qltd.length);
  r.cnt.lzMs = Math.round(r.cnt.lzMs); console.log(JSON.stringify(Object.assign({ files: PER.length, runMs: tRun }, r)));
  await b.close();
})();
