// HM-17 — chồng lấn / hở ranh với thửa đã lưu: báo diện tích chồng lấn + vị trí trên bản đồ (nút Xem), ngưỡng bỏ qua sai số đo cấu hình (lưu bền).
const { open, report } = require('../lib');
(async () => {
  const { b, p, errs } = await open(process.argv[2]);
  const r = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)), o = {}; const sq = (n, e, s) => [[n, e], [n + s, e], [n + s, e + s], [n, e + s]].map(q => ({ x: q[0], y: q[1] }));
    drawPlot('A', sq(2259000, 568000, 10), 105.5, { so_thua: 'A' }, false, 3);
    drawPlot('B', sq(2259000, 568008, 10), 105.5, { so_thua: 'B' }, false, 3);   // chồng 2 m × 10 m = 20 m²
    drawPlot('C', sq(2259000, 568010.3 + 8, 10), 105.5, { so_thua: 'C' }, false, 3);   // cách B 0,3 m
    Array.from(document.querySelectorAll('.lg103-dbtn')).filter(x => /Thêm/.test(x.innerText))[0].click(); await w(700);
    document.querySelector('[data-lg103-act="topo"]').click(); await w(800);
    const txt = () => document.getElementById('lg103-body').innerText; o.t1 = txt(); o.cfg0 = lgTopoCfg();
    o.ov1 = LG_TOPO_RESULT.overlaps.map(x => [x.a, x.b, Math.round(x.area)]); o.gp1 = LG_TOPO_RESULT.gaps.map(x => [x.a, x.b, +x.dist.toFixed(2)]);
    const set = (f, v) => { document.querySelector('.lg17 [data-f=' + f + ']').value = v; };
    set('ov', '25'); document.querySelector('[data-lg103-act="topo-run"]').click(); await w(700); o.ov2 = LG_TOPO_RESULT.overlaps.length; o.cfg1 = lgTopoCfg(); o.t2 = /Không có chồng lấn đáng kể/.test(txt());
    set('ov', '0,01'); set('gp', '0.2'); document.querySelector('[data-lg103-act="topo-run"]').click(); await w(700); o.ov3 = LG_TOPO_RESULT.overlaps.length; o.gp3 = LG_TOPO_RESULT.gaps.length;
    set('gp', '0.5'); document.querySelector('[data-lg103-act="topo-run"]').click(); await w(700);
    const view = document.querySelector('[data-lg103-act="topo-view"][data-k="o"]'); o.hasView = !!view; const before = map.getZoom(); view.click(); await w(1200); o.viewZoom = map.getZoom(); const c = map.getCenter(); o.center = [c.lat, c.lng];
    const def = LGCore.Geometry.vn2000.def({ ktt: 105.5, mui: 3 }); const q = proj4(def, 'WGS84', [568009, 2259005]); o.expect = [q[1], q[0]];
    return o; });
  const ok = report('hm17_topo', { bao_chong_lan_20m2: r.ov1.length >= 1 && r.ov1.some(x => x[0] === 'A' && x[1] === 'B' && x[2] === 20) && /Chồng lấn/.test(r.t1), bao_khe_ho_0_3m: r.gp1.some(g => g[2] === 0.3), mac_dinh_nguong: r.cfg0.overlapMin === 0.01 && r.cfg0.gapMax === 0.5,
    nguong_bo_qua_chong_lan_nho: r.ov2 === 0 && r.cfg1.overlapMin === 25 && r.t2, nguong_khe_ho_0_2_bo_qua_0_3: r.ov3 >= 1 && r.gp3 === 0, nut_xem_dua_ban_do_toi_cho_chong_lan: r.hasView && r.viewZoom >= 18 && Math.abs(r.center[0] - r.expect[0]) < 0.0005 && Math.abs(r.center[1] - r.expect[1]) < 0.0005, khong_loi_trang: errs.length === 0 }, { r: { ...r, t1: r.t1.slice(0, 60) }, errs });
  await b.close(); process.exit(ok ? 0 : 1);
})();
