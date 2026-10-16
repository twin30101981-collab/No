// HM-46c — Nhập sổ: 1 lối chính + 2 phụ + danh sách (đủ 10 lối cũ); Thửa: chip lọc có số đếm, cuộn ngang; Hồ sơ: thanh mục role=tablist; dock: biểu tượng SVG, nút Nhập sổ không nhô; không chữ bị cắt ở 360.
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path'); const { report } = require('../lib');
(async () => {
  const b = await chromium.launch(); const checks = {}; const detail = {};
  for (const w of [360, 430]) {
    const p = await (await b.newContext({ viewport: { width: w, height: 800 }, hasTouch: true })).newPage(); await p.route(/^https?:/, r => r.abort());
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + path.resolve(process.argv[2])); await p.waitForTimeout(5000);
    const r = await p.evaluate(async () => {
      const w8 = ms => new Promise(r => setTimeout(r, ms)); const o = {};
      const P = a => a.map(q => ({ x: q[0], y: q[1], ten: q[2] }));
      drawPlot('Thửa 130', P([[2259334.42, 568031.07, '1'], [2259316.85, 568031.69, '2'], [2259316.0, 568022, '3'], [2259335, 568022, '4']]), 105.5, { so_thua: '130', dien_tich_m2: 171.6 });
      await w8(1500);
      LandGIS.ui.switchDock('import'); await w8(400);
      const body = document.getElementById('lg103-body');
      o.big = body.querySelectorAll('.lg46-big').length; o.sec = body.querySelectorAll('.lg46-sec').length; o.rows = body.querySelectorAll('.lg46-row').length;
      o.acts = [...body.querySelectorAll('[data-lg103-act],[data-lg108-act]')].map(e => e.getAttribute('data-lg103-act') || e.getAttribute('data-lg108-act')).sort().join(',');
      o.clip = [...body.querySelectorAll('button')].filter(e => e.getBoundingClientRect().width && (e.scrollWidth > e.clientWidth + 1)).length;
      LandGIS.ui.switchDock('plots'); await w8(400);
      const ch = [...document.querySelectorAll('#lg103-body .lg46-chips .lg46-chip')]; o.chips = ch.length; o.chipN = ch.filter(c => c.querySelector('.n')).length; o.chipOn = ch.filter(c => c.classList.contains('on')).length;
      const cw = document.querySelector('#lg103-body .lg46-chips'); o.chipScroll = cw ? getComputedStyle(cw).overflowX : '';
      setSelectedPlotId('Thửa 130'); LandGIS.ui.switchDock('profile'); await w8(500);
      const seg = document.querySelector('#lg103-body .lg46-seg'); o.seg = seg ? seg.getAttribute('role') : null; o.segN = seg ? seg.querySelectorAll('[role=tab]').length : 0; o.segH = seg ? seg.getBoundingClientRect().height : 0;
      o.dockSvg = [...document.querySelectorAll('#lg103-dock .lg103-dbtn')].filter(d => d.getBoundingClientRect().width).map(d => !!d.querySelector('svg'));
      const fab = document.getElementById('lg103-fab'), dk = document.getElementById('lg103-dock'); o.fabIn = fab && dk ? fab.getBoundingClientRect().top >= dk.getBoundingClientRect().top - 1 : false;
      return o; });
    checks['nhap_so_thu_bac_' + w] = r.big === 1 && r.sec === 2 && r.rows === 7;
    checks['nhap_so_du_10_loi_' + w] = r.acts === 'import-book,import-cad,import-cam,import-edges,import-gps,import-pick,import-qr,import-rtk,queue,vision';
    checks['khong_cat_chu_' + w] = r.clip === 0;
    checks['chip_loc_' + w] = r.chips === 5 && r.chipN === 5 && r.chipOn === 1 && r.chipScroll === 'auto';
    checks['thanh_muc_ho_so_' + w] = r.seg === 'tablist' && r.segN === 7 && r.segH <= 56;
    checks['dock_svg_phang_' + w] = r.dockSvg.length === 5 && r.dockSvg.every(Boolean) && r.fabIn;
    checks['khong_loi_trang_' + w] = errs.length === 0; detail[w] = r;
    await p.context().close();
  }
  const ok = report('hm46c_sheets', checks, detail); await b.close(); process.exit(ok ? 0 : 1);
})();
