// HM-46d — màn chào (chưa có thửa) là NỘI DUNG TẤM TRƯỢT ở màn Bản đồ, không còn thẻ nổi riêng: nằm trong #lg103-sheet, đủ 3 lối vào,
// không đè dock/thanh tìm kiếm ở 360/390/430; mở khay khác rồi về Bản đồ thì hiện lại; có thửa thì tự rời tấm trượt.
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path'); const { report } = require('../lib');
(async () => {
  const b = await chromium.launch(), o = { w: {} }, errs = [];
  for (const W of [360, 390, 430]) {
    const p = await (await b.newContext({ viewport: { width: W, height: 800 }, hasTouch: true })).newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.route(/^https?:/, r => r.abort()); await p.goto('file://' + path.resolve(process.argv[2])); await p.waitForTimeout(4500);
    const geo = () => p.evaluate(() => { const e = document.getElementById('lg-welcome'), sh = document.getElementById('lg103-sheet'), d = document.getElementById('lg103-dock'), t = document.getElementById('lg8c-top');
      if (!e) return null; const r = e.getBoundingClientRect(), rs = sh.getBoundingClientRect(), rd = d.getBoundingClientRect(), rt = t.getBoundingClientRect();
      return { inSheet: sh.contains(e), on: sh.classList.contains('on'), n: e.querySelectorAll('button[data-lgw]').length, bottomOk: rs.bottom <= rd.top + 1 && r.bottom <= rd.top + 1, topOk: rs.top >= rt.bottom, inView: r.top >= 0 && r.width > 200, floating: getComputedStyle(e).position === 'fixed' }; });
    const g0 = await geo();
    await p.evaluate(() => { Array.from(document.querySelectorAll('.lg103-dbtn')).filter(x => /Thửa/.test(x.innerText))[0].click(); }); await p.waitForTimeout(500);
    const mid = await p.evaluate(() => !document.getElementById('lg-welcome'));
    await p.evaluate(() => { Array.from(document.querySelectorAll('.lg103-dbtn')).filter(x => /Bản đồ/.test(x.innerText))[0].click(); }); await p.waitForTimeout(500);
    const back = await geo();
    if (W === 390) { await p.evaluate(async () => { await LG145.applyBook({ points: [{ x: 2259300, y: 600100 }, { x: 2259300, y: 600110 }, { x: 2259290, y: 600110 }, { x: 2259290, y: 600100 }], dien_tich_m2: 100 }); }); await p.waitForTimeout(800);
      o.after = await p.evaluate(() => ({ plots: plots.length, gone: !document.getElementById('lg-welcome'), flag: document.getElementById('lg103-sheet').classList.contains('lg46-welcome-on') })); }
    o.w[W] = { g0, mid, back };
    await p.close();
  }
  const okW = w => w.g0 && w.g0.inSheet && w.g0.on && w.g0.n === 3 && w.g0.bottomOk && w.g0.topOk && w.g0.inView && !w.g0.floating;
  const ok = report('hm46d_welcome', {
    man_chao_trong_tam_truot_360_390_430: [360, 390, 430].every(W => okW(o.w[W])),
    mo_khay_khac_thi_thay_ve_ban_do_thi_hien_lai: [360, 390, 430].every(W => o.w[W].mid && o.w[W].back && o.w[W].back.inSheet),
    co_thua_thi_roi_tam_truot: !!o.after && o.after.plots === 1 && o.after.gone && !o.after.flag,
    khong_loi_trang: errs.length === 0
  }, { o, errs: errs.slice(0, 2) });
  await b.close(); process.exit(ok ? 0 : 1);
})();
