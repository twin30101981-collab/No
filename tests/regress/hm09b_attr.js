// HM-09b — ghi nguồn bản đồ hiện lại: gọn (chữ 10 px, bấm mở rộng), đúng tên nguồn theo lớp nền đang dùng.
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path'); const { report } = require('../lib');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage(); await p.route(/^https?:/, r => r.abort());
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(process.argv[2])); await p.waitForTimeout(6000);
  const r = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)); const c = () => document.querySelector('.leaflet-control-attribution'); const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).display !== 'none'; };
    const o = { visible: !!c() && vis(c()) }; const cs = getComputedStyle(c()); o.collapsedW = Math.round(c().getBoundingClientRect().width); o.fs0 = cs.fontSize;
    o.before = getComputedStyle(c(), '::before').content;
    c().click(); await w(200); o.open = c().classList.contains('lg9b-open'); o.fsOpen = getComputedStyle(c()).fontSize; o.textG = c().textContent;
    const sw = k => { Object.values(LG_LAYER_DEFS).forEach(d => { if (map.hasLayer(d.layer)) map.removeLayer(d.layer); }); LG_LAYER_DEFS[k].layer.addTo(map); };
    sw('esri_img'); await w(300); o.textEsri = c().textContent; sw('osm'); await w(300); o.textOsm = c().textContent; sw('ggl_hybrid');
    const r1 = c().getBoundingClientRect(); o.left = r1.left < innerWidth / 2; return o; });
  const ok = report('hm09b_attr', {
    hien_lai_gon: r.visible && r.collapsedW < 120 && /Nguồn/.test(r.before),
    chu_10px_bam_mo_rong: r.open && r.fsOpen === '10px' && r.fs0 === '0px',
    dung_ten_nguon_theo_lop: /Google/.test(r.textG) && /Esri/.test(r.textEsri) && /OpenStreetMap/.test(r.textOsm),
    goc_duoi_trai_khong_de_nut_tron: r.left }, r);
  await b.close(); process.exit(ok && !errs.length ? 0 : 1);
})();
