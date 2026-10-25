// Đo HM-17b: dựng bảng Dư nợ ở chế độ "Tất cả" với ~3.848 dòng (nhân bản fixture ẩn danh)
const { chromium } = require('playwright'); const path = require('path');
const APP = path.resolve(process.argv[2]), FIX = path.resolve(process.argv[3]), N = +process.argv[4] || 3848;
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] }); const p = await (await b.newContext({ viewport: { width: 1500, height: 900 } })).newPage();
  p.on('dialog', d => d.accept().catch(() => {})); await p.goto('file://' + APP, { waitUntil: 'load' }); await p.waitForTimeout(5000);
  await p.evaluate(() => { try { pendingImportRows = null } catch (e) {} }); await p.setInputFiles('#import-file', FIX + '/20.10.2026.xlsx');
  for (let i = 0; i < 60; i++) { await p.waitForTimeout(500); if (await p.evaluate(() => { try { return !!pendingImportRows } catch (e) { return false } })) break; }
  await p.evaluate(() => doImport()); await p.waitForTimeout(800); await p.evaluate(() => completeImportToDataArchive()); await p.waitForTimeout(3500);
  await p.evaluate(() => showPage('qltd')); await p.waitForTimeout(1500);
  const r = await p.evaluate(async (N) => {
    const base = DATA.qltd.slice(); if (!base.length) return {err:"DATA.qltd rỗng"}; const out = []; while (out.length < N) base.forEach(x => { if (out.length < N) out.push(x.slice ? x.slice() : x); }); DATA.qltd = out;
    const res = {n: DATA.qltd.length}; for (const sz of [100, 0]) { __TDPgSetSize('qltd', sz); const t = performance.now(); renderTable('qltd'); const js = performance.now() - t; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); res[sz] = { js: Math.round(js), toFrame: Math.round(performance.now() - t), rows: document.querySelectorAll('#table-qltd tbody tr').length }; }
    __TDPgSetSize('qltd', 100); return res; }, N);
  console.log(JSON.stringify(r)); await b.close();
})();
