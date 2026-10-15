// HM-30 — lớp địa chính vector: 20.000 thửa, vẽ theo khung nhìn, nhãn tờ/thửa, chạm chọn đúng thửa, ngoại tuyến, bản đọc nhúng = app/lib/lgpack.js.
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path'), fs = require('fs'), os = require('os'); const { spawnSync } = require('child_process'); const { report } = require('../lib');
const root = path.join(__dirname, '..', '..');
(async () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'cad-')); const parcels = []; const N = 20000, W = 200, E0 = 567000, N0 = 2256000;
  for (let i = 0; i < N; i++) { const x = E0 + (i % W) * 22.5, y = N0 + Math.floor(i / W) * 31.25; parcels.push({ to: 1 + Math.floor(i / 2000), thua: 1 + (i % 2000), dt: 300, dtHH: 300, ld: 'ONT', ring: [[x, y], [x + 20, y], [x + 20, y + 15], [x, y + 15], [x, y]] }); }
  fs.writeFileSync(d + '/parcels.json', JSON.stringify({ xa: 'Xã thử', crs: 'VN2000', ktt: 105.5, mui: 3, n: N, parcels }));
  const r0 = spawnSync('python3', [root + '/handover/tools/cadastre_pack.py', d + '/parcels.json', d + '/out'], { encoding: 'utf8' }); if (r0.status) { console.error(r0.stderr); process.exit(1); }
  const gz = fs.readFileSync(d + '/out/pack.lgpk.gz'); const man = JSON.parse(fs.readFileSync(d + '/out/manifest.json'));
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); await p.route(/^https?:/, r => r.abort());
  const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto('file://' + path.resolve(process.argv[2])); await p.waitForTimeout(3500);
  const lib = fs.readFileSync(root + '/app/lib/lgpack.js', 'utf8'); const html = fs.readFileSync(path.resolve(process.argv[2]), 'utf8');
  const r = await p.evaluate(async ([b64, ktt, E0, N0]) => {
    const u = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); const w = ms => new Promise(r => setTimeout(r, ms)); const o = {};
    const pk = await LGCadastre.openBuffer(u.buffer); o.n = pk.n; const l = LGCadastre.mount(pk, { ktt, mui: 3 });
    const def = LGCore.Geometry.vn2000.def({ ktt, mui: 3 }); const c = proj4(def, 'WGS84', [E0 + 5000, N0 + 3000]); const target = [E0 + 22.5 * 40 + 10, N0 + 31.25 * 40 + 7];   // giữa thửa i = 40*200+40 → tờ 5? (8040 → tờ 5, thửa 41)
    map.setView([c[1], c[0]], 14); await w(500); o.z14 = l.stats();
    const t = proj4(def, 'WGS84', target); map.setView([t[1], t[0]], 17); await w(600); o.z17 = l.stats(); o.canvasInk17 = (() => { const cv = document.querySelector('canvas.lg30-cad'), x = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let k = 0; for (let i = 3; i < x.length; i += 4) if (x[i]) k++; return k; })();
    map.setView([t[1], t[0]], 19); await w(600); o.z19 = l.stats();
    let ev = null; document.addEventListener('lgcadastre:select', e => ev = e.detail); const pt = map.latLngToContainerPoint([t[1], t[0]]); const rc = map.getContainer().getBoundingClientRect();
    map.fire('click', { latlng: map.containerPointToLatLng(pt), containerPoint: pt, layerPoint: map.containerPointToLayerPoint(pt), originalEvent: {} }); await w(300);
    o.sel = ev && [ev.to, ev.thua]; o.expect = [1 + Math.floor(8040 / 2000), 1 + (8040 % 2000)];
    map.setView([t[1], t[0]], 15); await w(600); o.z15 = l.stats(); const pan = []; for (let k = 0; k < 5; k++) { map.panBy([120, 80], { animate: false }); await w(60); pan.push(l.stats().ms); } o.pan = pan;
    LGCadastre.hide(); o.removed = !document.querySelector('canvas.lg30-cad'); return o;
  }, [gz.toString('base64'), 105.5, 567000, 2256000]);
  const ok = report('hm30_cadastre', {
    nap_20000_thua: r.n === 20000, khong_ve_duoi_zoom15: r.z14.n === 0 && r.z14.skipped === true,
    ve_theo_khung_nhin_co_muc: r.z17.n > 0 && r.z17.n <= 8000 && r.canvasInk17 > 1000 && r.z19.n > 0 && r.z19.n < 400,
    cham_chon_dung_thua: !!r.sel && r.sel[0] === r.expect[0] && r.sel[1] === r.expect[1],
    ve_nhanh_khi_keo_20000_thua: r.pan.every(ms => ms < 250) && r.z15.ms < 400,
    go_lop_sach: r.removed, ban_doc_nhung_khop_lib: html.includes(lib), khong_loi_trang: errs.length === 0 }, { r, errs, man });
  await b.close(); process.exit(ok ? 0 : 1);
})();
