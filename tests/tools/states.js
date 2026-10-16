// Dùng chung: dựng các trạng thái màn hình chính ở nhiều độ rộng rồi gọi cb(page, tên, rộng). Dùng cho tools/shots.js, cssdump.js, important_scan.js (HM-08f).
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path');
exports.run = async function (app, widths, cb, opt) {
  opt = opt || {}; const b = await chromium.launch();
  for (const W of widths) for (const theme of (opt.themes || ['light'])) {
    const ctx = await b.newContext({ viewport: { width: W, height: W > 800 ? 900 : 800 }, deviceScaleFactor: 1, reducedMotion: 'reduce' }); const p = await ctx.newPage(); await p.route(/^https?:/, r => r.abort());
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + path.resolve(app)); await p.waitForTimeout(3500);
    await p.evaluate(async (theme) => {
      const P = a => a.map(q => ({ x: q[0], y: q[1], ten: q[2] })), m = { __restoring: true, coordOrderConfirmed: 'as-is', dia_chi: 'Xã A', to_ban_do: '10.1' };
      drawPlot('Thửa 130', P([[2259334.42, 568031.07, '1'], [2259316.85, 568031.69, '2'], [2259316.0, 568022, '3'], [2259335, 568022, '4']]), 105.5, Object.assign({ so_thua: '130', dien_tich_m2: '200' }, m), false, 3);
      drawPlot('Thửa 131', P([[2259336.23, 568027.14, 'A'], [2259334.17, 568027.23, 'B'], [2259334.42, 568031.07, 'C'], [2259316.85, 568031.69, 'D'], [2259316.99, 568036.18, 'E'], [2259336.65, 568034.94, 'F']]), 105.5, Object.assign({ so_thua: '131', dien_tich_m2: '89.9' }, m), false, 3);
      if (theme === 'dark') document.documentElement.setAttribute('data-lg-theme', 'dark');
      document.querySelectorAll('[class*="toast"]').forEach(e => { e.style.display = 'none'; });
    }, theme);
    await p.waitForTimeout(1500);
    const tag = n => n + (theme === 'dark' ? '-toi' : '');
    const dock = async re => { await p.evaluate(re => { const x = Array.from(document.querySelectorAll('.lg103-dbtn')).filter(x => new RegExp(re).test(x.innerText))[0]; if (x) x.click(); }, re); await p.waitForTimeout(700); };
    await cb(p, tag('1-ban-do'), W);
    await dock('Thửa'); await cb(p, tag('2-thua'), W);
    await dock('Hồ sơ'); await cb(p, tag('3-ho-so'), W);
    await p.evaluate(() => { const x = document.querySelector('[data-lg103-act="prof-coords"]'); if (x) x.click(); }); await p.waitForTimeout(400); await cb(p, tag('3b-toa-do'), W);
    await dock('Thêm'); await cb(p, tag('4-them'), W);
    await p.evaluate(() => { const r = document.querySelector('[data-lg103-act="conv-batch"]'); if (r) r.click(); }); await p.waitForTimeout(500); await cb(p, tag('5-quy-doi'), W);
    await dock('Nhập'); await cb(p, tag('6-nhap-so'), W);
    if (errs.length) console.log('W' + W, 'pageerror', errs.slice(0, 3));
    await ctx.close();
  }
  await b.close();
};
