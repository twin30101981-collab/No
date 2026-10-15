// HM-08g — xoá có thanh Hoàn tác 6 s; mở lại app vẫn khôi phục từ Thùng rác (30 ngày); xoá tất cả cần 2 bước xác nhận.
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path'); const { report } = require('../lib');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }); const p = await ctx.newPage(); await p.route(/^https?:/, r => r.abort());
  const errs = []; p.on('pageerror', e => errs.push(e.message)); const dialogs = []; let accept = 2; p.on('dialog', d => { dialogs.push(d.message()); if (accept-- > 0) d.accept(); else d.dismiss(); });
  const url = 'file://' + path.resolve(process.argv[2]);
  await p.goto(url); await p.waitForTimeout(5000);
  const sq = dx => [[0, 0], [10, 0], [10, 10], [0, 10]].map(q => ({ x: 2259336 + q[0] + dx, y: 568027 + q[1] }));
  const r1 = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)); const o = {};
    drawPlot('Thửa A', [[0, 0], [10, 0], [10, 10], [0, 10]].map(q => ({ x: 2259336 + q[0], y: 568027 + q[1] })), 105.5, { provCode: 'NAM_DINH' }, false, 3);
    drawPlot('Thửa B', [[0, 0], [10, 0], [10, 10], [0, 10]].map(q => ({ x: 2259436 + q[0], y: 568027 + q[1] })), 105.5, { provCode: 'NAM_DINH' }, false, 3);
    deletePlot('Thửa A'); const bar = document.getElementById('lg8g-undo'); o.bar = !!bar && getComputedStyle(bar).display !== 'none'; o.afterDel = plots.length;
    bar.querySelector('button').click(); await w(300); o.afterUndo = plots.length; o.trashAfterUndo = lgTrashList().length;
    deletePlot('Thửa A'); await w(6400); o.barHidden = getComputedStyle(document.getElementById('lg8g-undo')).display === 'none'; o.trash = lgTrashList().map(t => t.data.id);
    return o; });
  await p.reload(); await p.waitForTimeout(4500);
  const r2 = await p.evaluate(() => ({ plots: plots.map(x => x.id), trash: lgTrashList().map(t => t.data.id) }));
  await p.evaluate(() => { LandGIS.ui.switchDock('more'); }); await p.waitForTimeout(300);
  await p.click('#lg103-body [data-lg103-act="trash"]'); await p.waitForTimeout(300);
  const trashUi = await p.innerText('#lg103-body'); await p.click('#lg103-body [data-lg103-act="trash-restore"]', { timeout: 3000 }); await p.waitForTimeout(500);
  const r3 = await p.evaluate(() => ({ plots: plots.map(x => x.id), trash: lgTrashList().length }));
  // xoá tất cả: 2 bước
  accept = 1; dialogs.length = 0; await p.evaluate(() => clearAllPlots()); const stillThere = await p.evaluate(() => plots.length);   // bước 2 bị từ chối
  accept = 2; await p.evaluate(() => clearAllPlots()); await p.waitForTimeout(300); const cleared = await p.evaluate(() => ({ n: plots.length, trash: lgTrashList().length }));
  await p.reload(); await p.waitForTimeout(4500); const r4 = await p.evaluate(() => ({ plots: plots.length, trash: lgTrashList().map(t => t.data.id) }));
  await p.evaluate(() => { for (const t of lgTrashList()) lgTrashRestore(t.data.id); }); const r5 = await p.evaluate(() => plots.length);
  const ok = report('hm08g_trash', {
    xoa_hien_thanh_hoan_tac_va_hoan_tac_duoc: r1.bar && r1.afterDel === 1 && r1.afterUndo === 2 && r1.trashAfterUndo === 0,
    thanh_hoan_tac_tu_an_sau_6s: r1.barHidden,
    mo_lai_app_van_khoi_phuc_tu_thung_rac: r2.plots.join() === 'Thửa B' && r2.trash.includes('Thửa A') && /Thửa A/.test(trashUi) && r3.plots.includes('Thửa A') && r3.trash === 0,
    xoa_tat_ca_2_buoc: stillThere === 2 && cleared.n === 0 && cleared.trash === 2 && dialogs.length >= 3,
    sau_xoa_tat_ca_mo_lai_van_khoi_phuc: r4.plots === 0 && r4.trash.length === 2 && r5 === 2 }, { r1, r2, r3, cleared, r4, r5, dialogs: dialogs.length });
  await b.close(); if (errs.length) console.log('PAGEERR', errs.slice(0, 3)); process.exit(ok && !errs.length ? 0 : 1);
})();
