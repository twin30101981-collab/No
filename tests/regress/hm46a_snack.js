// HM-46a — một snackbar 1 dòng cho mọi thông báo (toast + LGV42.notify), tự tắt, không đè dock/nút tròn; tiến độ hồ sơ = chip 1 dòng không đè nút phóng to/Lớp.
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path'); const { report } = require('../lib');
(async () => {
  const b = await chromium.launch(); const checks = {}; const detail = {};
  for (const w of [360, 390, 430]) {
    const p = await (await b.newContext({ viewport: { width: w, height: 800 }, hasTouch: true })).newPage(); await p.route(/^https?:/, r => r.abort());
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + path.resolve(process.argv[2])); await p.waitForTimeout(6500);
    const r = await p.evaluate(async () => {
      const w8 = ms => new Promise(r => setTimeout(r, ms)); const R = e => e && e.getBoundingClientRect();
      const hit = (a, c) => a && c && a.left < c.right && c.left < a.right && a.top < c.bottom - 1 && c.top < a.bottom - 1;
      toast({ title: 'Đã lưu thửa', description: 'Thửa 131 đã được lưu vào máy cùng 7 mốc toạ độ và ảnh hiện trường đi kèm' }); await w8(80);
      LGV42.notify('ok', 'Đã chuyển lớp nền: Esri World Imagery (vệ tinh)', 'Đang tự dò lại độ nét cho khu vực đang xem.'); await w8(400);
      const sbs = [...document.querySelectorAll('#lg46-snack .sb')]; const sb = sbs[0], tx = sb && sb.querySelector('.tx');
      const o = { n: sbs.length, h: sb ? R(sb).height : 0, ell: tx ? tx.scrollWidth > tx.clientWidth : false, text: tx ? tx.textContent : '' };
      o.dockHit = hit(R(sb), R(document.getElementById('lg103-dock'))); o.fabHit = [...document.querySelectorAll('#lg8c-fabs button')].some(f => f.getBoundingClientRect().width && hit(R(sb), R(f)));
      o.inView = sb ? R(sb).bottom <= innerHeight && R(sb).left >= 0 && R(sb).right <= innerWidth : false;
      o.oldHidden = ['toast-wrap', 'lgv42-toast-host'].every(id => { const e = document.getElementById(id); return !e || getComputedStyle(e).display === 'none'; });
      await w8(5200); o.gone = ![...document.querySelectorAll('#lg46-snack .sb')].some(e => /Esri World/.test(e.textContent));
      // tiến độ hồ sơ
      const P = a => a.map(q => ({ x: q[0], y: q[1], ten: q[2] }));
      drawPlot('T', P([[2259334.42, 568031.07, '1'], [2259316.85, 568031.69, '2'], [2259316.0, 568022, '3'], [2259335, 568022, '4']]), 105.5, { so_thua: '130' });
      let pr = null; for (let i = 0; i < 80 && !pr; i++) { await w8(100); const e = document.getElementById('lg63-progress'); if (e && !e.hidden && R(e).height) pr = e; }
      if (pr) { const zr = R(document.querySelector('.leaflet-control-zoom')), lr = R([...document.querySelectorAll('button')].find(x => /Lớp/.test(x.textContent) && x.getBoundingClientRect().width)); o.pr = { h: R(pr).height, zoom: hit(R(pr), zr), lop: hit(R(pr), lr), t: pr.textContent }; }
      return o; });
    checks['mot_snackbar_' + w] = r.n === 1 && r.h <= 52 && r.inView && r.oldHidden;
    checks['mot_dong_cat_chu_' + w] = r.ell && /Esri/.test(r.text);
    checks['khong_de_dock_nut_' + w] = !r.dockHit && !r.fabHit;
    checks['tu_tat_' + w] = r.gone;
    checks['chip_tien_do_' + w] = !!r.pr && r.pr.h <= 34 && !r.pr.zoom && !r.pr.lop;
    checks['khong_loi_trang_' + w] = errs.length === 0; detail[w] = r;
    await p.context().close();
  }
  const ok = report('hm46a_snack', checks, detail); await b.close(); process.exit(ok ? 0 : 1);
})();
