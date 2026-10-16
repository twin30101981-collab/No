// HM-46b — Bản đồ 4 vùng: không còn thanh xanh v62, nút "Lớp" rời và ⧉; một cột nút phải (4 nút) + Vị trí; các vùng nổi không chồng nhau; bản đồ tràn mép trên; nhãn cạnh chỉ của thửa đang chọn.
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path'); const { report } = require('../lib');
(async () => {
  const b = await chromium.launch(); const checks = {}; const detail = {};
  for (const w of [360, 390, 430]) {
    const p = await (await b.newContext({ viewport: { width: w, height: 800 }, hasTouch: true, isMobile: true })).newPage(); await p.route(/^https?:/, r => r.abort());
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + path.resolve(process.argv[2])); await p.waitForTimeout(5000);
    const r = await p.evaluate(async () => {
      const w8 = ms => new Promise(r => setTimeout(r, ms));
      const P = a => a.map(q => ({ x: q[0], y: q[1], ten: q[2] }));
      drawPlot('Thửa 130', P([[2259334.42, 568031.07, '1'], [2259316.85, 568031.69, '2'], [2259316.0, 568022, '3'], [2259335, 568022, '4']]), 105.5, { so_thua: '130' });
      drawPlot('Thửa 131', P([[2259336.23, 568027.14, 'A'], [2259334.42, 568031.07, 'B'], [2259316.85, 568031.69, 'C'], [2259316.99, 568036.18, 'D'], [2259336.65, 568036.0, 'E']]), 105.5, { so_thua: '131' });
      await w8(2500); try { LandGIS.ui.closeSheet(); } catch (e) {} await w8(400);
      const vis = e => { if (!e) return false; const s = getComputedStyle(e), q = e.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && q.width > 4 && q.height > 4 && q.bottom > 0 && q.top < innerHeight; };
      const R = e => e.getBoundingClientRect(), hit = (a, c) => a.left < c.right - 1 && c.left < a.right - 1 && a.top < c.bottom - 1 && c.top < a.bottom - 1;
      const o = { green: vis(document.getElementById('lg62-top')), lop: vis(document.getElementById('lg183-layers')), box: vis(document.querySelector('.lg-zoomctrl')), zoom: vis(document.querySelector('.leaflet-control-zoom')) };
      o.rail = [...document.querySelectorAll('#lg46-rail button')].filter(vis).length; o.loc = vis(document.getElementById('lg8c-loc'));
      o.mapTop = R(document.getElementById('map')).top;
      const zones = { tim: document.getElementById('lg8c-bar'), chip: document.getElementById('lg8c-chips'), cot: document.getElementById('lg46-rail'), vitri: document.getElementById('lg8c-loc'), dock: document.getElementById('lg103-dock'), tiendo: document.getElementById('lg63-progress') };
      const ks = Object.keys(zones).filter(k => vis(zones[k])); o.zones = ks; o.hits = [];
      for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) if (hit(R(zones[ks[i]]), R(zones[ks[j]]))) o.hits.push(ks[i] + '×' + ks[j]);
      // chip tiến độ không đè chip hệ toạ độ: chip nằm giữa, chips nằm trái → chấp nhận nếu không giao
      // nhãn cạnh: chọn thửa 131 → chỉ nhãn của 131
      setSelectedPlotId('Thửa 131'); await w8(300);
      const sp = [...document.querySelectorAll('.lg-edge > span[data-pid]')]; o.edgeAll = sp.length;
      o.edgeShown = sp.filter(e => getComputedStyle(e).display !== 'none').map(e => e.getAttribute('data-pid'));
      // lối vào cũ vẫn có: Cài đặt, Công cụ, Lớp phủ, Cạnh/mốc
      o.paths = ['lg62-btn-set', 'lg62-btn-tool', 'lg183-layers', 'lg110-tools'].map(id => !!document.getElementById(id));
      return o; });
    checks['bo_thanh_xanh_lop_roi_' + w] = !r.green && !r.lop && !r.box && !r.zoom;
    checks['cot_nut_phai_' + w] = r.rail === 4 && r.loc;
    checks['ban_do_tran_mep_' + w] = r.mapTop <= 1;
    checks['vung_khong_chong_' + w] = r.hits.length === 0 && r.zones.length >= 5;
    checks['nhan_canh_thua_chon_' + w] = r.edgeAll > 0 && r.edgeShown.length > 0 && r.edgeShown.every(x => x === 'Thửa 131');
    checks['loi_vao_cu_' + w] = r.paths.every(Boolean);
    checks['khong_loi_trang_' + w] = errs.length === 0; detail[w] = r;
    await p.context().close();
  }
  const ok = report('hm46b_map', checks, detail); await b.close(); process.exit(ok ? 0 : 1);
})();
