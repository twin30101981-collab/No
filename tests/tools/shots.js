// Chụp ảnh các màn chính ở 360/390/430 px để so sánh trước–sau khi gỡ CSS (HM-08f). Dùng: node tests/tools/shots.js app/land-gis.html /tmp/out
// So ảnh: python3 tests/tools/shotdiff.py <thư mục A> <thư mục B>
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const app = process.argv[2], out = process.argv[3]; fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  for (const W of [360, 390, 430]) {
    const ctx = await b.newContext({ viewport: { width: W, height: 800 }, deviceScaleFactor: 1, reducedMotion: 'reduce' }); const p = await ctx.newPage(); await p.route(/^https?:/, r => r.abort());
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(() => { try { localStorage.clear(); } catch (e) {} const R = Math; });
    await p.goto('file://' + path.resolve(app)); await p.waitForTimeout(4000);
    await p.evaluate(async () => {
      const P = a => a.map(q => ({ x: q[0], y: q[1], ten: q[2] }));
      drawPlot('Thửa 130', P([[2259334.42, 568031.07, '1'], [2259316.85, 568031.69, '2'], [2259316.0, 568022, '3'], [2259335, 568022, '4']]), 105.5, { so_thua: '130', to_ban_do: '10.1', dia_chi: 'Xã A', dien_tich_m2: '200', __restoring: true, coordOrderConfirmed: 'as-is' }, false, 3);
      drawPlot('Thửa 131', P([[2259336.23, 568027.14, 'A'], [2259334.17, 568027.23, 'B'], [2259334.42, 568031.07, 'C'], [2259316.85, 568031.69, 'D'], [2259316.99, 568036.18, 'E'], [2259336.65, 568034.94, 'F']]), 105.5, { so_thua: '131', to_ban_do: '10.1', dia_chi: 'Xã A', dien_tich_m2: '89.9', __restoring: true, coordOrderConfirmed: 'as-is' }, false, 3);
      document.querySelectorAll('.toast, [class*="toast"]').forEach(e => { e.style.display = 'none'; });
    });
    await p.waitForTimeout(1500);
    const shot = async name => { await p.waitForTimeout(700); await p.screenshot({ path: path.join(out, W + '-' + name + '.png') }); };
    const dock = async re => { await p.evaluate(re => { Array.from(document.querySelectorAll('.lg103-dbtn')).filter(x => new RegExp(re).test(x.innerText))[0].click(); }, re); };
    await shot('1-ban-do');
    await dock('Thửa'); await shot('2-thua');
    await dock('Hồ sơ'); await shot('3-ho-so');
    await dock('Thêm'); await shot('4-them');
    await p.evaluate(() => { const r = document.querySelector('[data-lg103-act="conv-batch"]'); if (r) r.click(); }); await shot('5-quy-doi');
    await dock('Nhập'); await shot('6-nhap-so');
    if (errs.length) console.log('W' + W, 'pageerror', errs.slice(0, 3));
    await ctx.close();
  }
  await b.close(); console.log('xong', out);
})();
