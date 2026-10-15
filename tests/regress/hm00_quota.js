// HM-00 — bộ nhớ đầy không được xoá kho thửa; lưu thửa thất bại → báo + bản sao IndexedDB → mở lại khôi phục.
// Dùng: node tests/regress/hm00_quota.js app/land-gis.html   (exit 0 = PASS)
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage(); await p.route(/^https?:/, r => r.abort());
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(process.argv[2])); await p.waitForTimeout(2500);
  const PTS = [[2259336.23,568027.14],[2259334.17,568027.23],[2259334.42,568031.07],[2259316.85,568031.69],[2259316.99,568036.18],[2259336.65,568034.94]];
  // Kho thửa kiểu cũ (không có chuỗi "v") + lược đồ cũ 118 → di trú không được xoá.
  await p.evaluate(pts => { localStorage.setItem('land_gis_v18_cache', JSON.stringify([{ id: 'T1', points: pts.map(a => ({ x: a[0], y: a[1] })), lon0: 105.5, zone: 3, meta: {} }]));
    Storage.prototype.setItem.call(localStorage, 'landgis_schema_version', '118'); }, PTS);
  await p.reload(); await p.waitForTimeout(3000);
  const r = {}; r.afterMigrate = await p.evaluate(() => (window.plots || []).length);
  const fill = () => p.evaluate(() => { const raw = Storage.prototype.setItem; const c = 'x'.repeat(256 * 1024);
    for (let n = 0; n < 200; n++) try { raw.call(localStorage, 'filler_' + n, c) } catch (e) { break }
    for (let i = 0; i < 400; i++) try { raw.call(localStorage, 'fs_' + i, 'y'.repeat(4096)) } catch (e) { break }
    for (let i = 0; i < 4000; i++) try { raw.call(localStorage, 'ft_' + i, 'w'.repeat(32)) } catch (e) { break } });
  const unfill = () => p.evaluate(() => { for (let i = 0; i < 400; i++) { localStorage.removeItem('filler_' + i); localStorage.removeItem('fs_' + i) } for (let i = 0; i < 4000; i++) localStorage.removeItem('ft_' + i) });
  await fill();
  r.unrelated = await p.evaluate(() => { localStorage.setItem('landgis_v42_diag_log', 'z'.repeat(64 * 1024)); return !!Storage.prototype.getItem.call(localStorage, 'land_gis_v18_cache'); });
  // Lưu thửa mới khi đầy → phải ném lỗi tới saveToLocalStorage → toast + IndexedDB.
  r.saveFail = await p.evaluate(pts => { window.LG_SAVE_WARNED = false;
    drawPlot('T2', pts.map(a => ({ x: a[0] + 50, y: a[1] + 50 })), 105.5, { ghi_chu: 'g'.repeat(300 * 1024) }, false, 3); saveToLocalStorage(); return window.LG_SAVE_WARNED === true; }, PTS);
  await p.waitForTimeout(800);
  r.storedWhileFull = await p.evaluate(() => JSON.parse(Storage.prototype.getItem.call(localStorage, 'land_gis_v18_cache') || '[]').length);
  await unfill();
  await p.reload(); await p.waitForTimeout(3500);
  r.reopen = await p.evaluate(() => ({ n: (window.plots || []).length, stored: JSON.parse(localStorage.getItem('land_gis_v18_cache') || '[]').length }));
  // Kho > 160 KB với 30 thửa: lớp LandGIS.storage không được cắt nửa/xoá kho lúc khởi động.
  await p.evaluate(pts => { localStorage.clear(); const arr = [];
    for (let i = 0; i < 30; i++) arr.push({ id: 'K' + i, points: pts.map(a => ({ x: a[0] + i * 40, y: a[1] })), lon0: 105.5, zone: 3, meta: { ghi_chu: 'n'.repeat(6000) } });
    localStorage.setItem('land_gis_v18_cache', JSON.stringify(arr)); }, PTS);
  await p.reload(); await p.waitForTimeout(3500);
  r.big = await p.evaluate(() => ({ n: (window.plots || []).length, stored: JSON.parse(localStorage.getItem('land_gis_v18_cache') || '[]').length }));
  r.errs = errs.length;
  const ok = r.afterMigrate === 1 && r.unrelated === true && r.saveFail === true && r.storedWhileFull === 1 && r.reopen.n === 2 && r.reopen.stored === 2 && r.big.n === 30 && r.big.stored === 30 && !errs.length;
  console.log(JSON.stringify(r), ok ? 'PASS' : 'FAIL'); await b.close(); process.exit(ok ? 0 : 1);
})();
