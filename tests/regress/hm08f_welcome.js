// HM-08f — màn chào khi chưa có thửa: thẻ 3 lối vào, tự ẩn khi có thửa; mã tự phục hồi sidebar/lg111 đã gỡ.
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path'); const { report } = require('../lib');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route(/^https?:/, r => r.abort()); await p.goto('file://' + path.resolve(process.argv[2])); await p.waitForTimeout(4500);
  const o = {};
  o.vis0 = await p.evaluate(() => { const e = document.getElementById('lg-welcome'); if (!e) return null; const r = e.getBoundingClientRect(); return { n: e.querySelectorAll('button').length, inView: r.bottom <= innerHeight && r.top >= 0 && r.width > 200, plots: plots.length }; });
  await p.click('[data-lgw="book"]'); await p.waitForSelector('#lg8d'); o.wizard = true; await p.evaluate(() => lg8dClose());
  await p.click('[data-lgw="scan"]'); o.scan = await p.evaluate(() => document.getElementById('sidebar').classList.contains('on')); await p.evaluate(() => lgCloseScan());
  await p.evaluate(async () => { await LG145.applyBook({ points: [{ x: 2259300, y: 600100 }, { x: 2259300, y: 600110 }, { x: 2259290, y: 600110 }, { x: 2259290, y: 600100 }], dien_tich_m2: 100 }); });
  await p.waitForTimeout(800); o.after = await p.evaluate(() => ({ plots: plots.length, card: !!document.getElementById('lg-welcome') }));
  o.dead = await p.evaluate(() => ['applySidebarState', 'openSidebar', 'closeSidebar', 'lg111RestoreInput'].filter(k => typeof window[k] !== 'undefined'));
  o.noNav = await p.evaluate(() => !document.getElementById('lg62-back') && !document.getElementById('lg62-next') && !document.getElementById('lg62-steps'));
  const ok = report('hm08f_welcome', { the_chao_3_loi_vao: !!o.vis0 && o.vis0.n === 3 && o.vis0.inView && o.vis0.plots === 0, mo_wizard_va_scan: o.wizard && o.scan, tu_an_khi_co_thua: o.after.plots === 1 && !o.after.card, ma_chet_da_go: o.dead.length === 0 && o.noNav, khong_loi_trang: errs.length === 0 }, { o, errs });
  await b.close(); process.exit(ok ? 0 : 1);
})();
