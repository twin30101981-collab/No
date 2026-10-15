// HM-34 — GPS đang đứng → thửa chứa điểm + thửa lân cận (khi sai số lớn); ngoài gói / chưa tải gói báo rõ; bấm Xem → bản đồ chọn đúng thửa.
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path'), fs = require('fs'), os = require('os'), crypto = require('crypto'); const { spawnSync } = require('child_process'); const { report } = require('../lib');
const root = path.join(__dirname, '..', '..');
(async () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'l34-')); const E = 567000, N = 2256000, sq = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]];
  const parcels = [{ to: 3, thua: 1, dt: 300, dtHH: 300, ld: 'ONT', ring: sq(E, N, 20, 15) }, { to: 3, thua: 2, dt: 300, dtHH: 300, ld: 'ONT', ring: sq(E + 28, N, 20, 15) }, { to: 3, thua: 3, dt: 300, dtHH: 300, ld: 'ONT', ring: sq(E + 200, N, 20, 15) }];
  fs.writeFileSync(d + '/p.json', JSON.stringify({ xa: 'Xã Định Vị', crs: 'VN2000', ktt: 105.5, mui: 3, n: 3, parcels }));
  const r0 = spawnSync('python3', [root + '/handover/tools/cadastre_pack.py', d + '/p.json', d + '/o'], { encoding: 'utf8' }); if (r0.status) { console.error(r0.stderr); process.exit(1); }
  const gz = fs.readFileSync(d + '/o/pack.lgpk.gz'), sha = crypto.createHash('sha256').update(gz).digest('hex');
  const cat = { packs: [{ id: 'xa-dinh-vi', ten: 'Xã Định Vị', ver: '1', ktt: 105.5, mui: 3, bytes: gz.length, sha256: sha, url: 'http://pk.test/a.bin' }] };
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, permissions: ['geolocation'], geolocation: { latitude: 20.4, longitude: 106, accuracy: 10 } }); const p = await ctx.newPage();
  await p.route(/^https?:/, r => { const u = r.request().url(); if (u.endsWith('catalog.json')) return r.fulfill({ json: cat }); if (u.endsWith('a.bin')) return r.fulfill({ status: 200, body: gz }); return r.abort(); });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto('file://' + path.resolve(process.argv[2])); await p.waitForTimeout(3500);
  const r = await p.evaluate(async ([E, N]) => {
    const w = ms => new Promise(r => setTimeout(r, ms)), o = {}; LGPacks.config({ catalogUrl: 'http://pk.test/catalog.json' });
    const def = LGCore.Geometry.vn2000.def({ ktt: 105.5, mui: 3 }); const ll = (e, n) => { const q = proj4(def, 'WGS84', [e, n]); return [q[1], q[0]]; };
    o.chuaTai = await LGCadastre.locate(...ll(E + 10, N + 7), 5); await LGPacks.install((await LGPacks.catalog())[0]);
    o.trong = await LGCadastre.locate(...ll(E + 10, N + 7), 4);
    o.khe = await LGCadastre.locate(...ll(E + 24, N + 7), 25);           // khe giữa 2 thửa, GPS sai số 25 m
    o.ngoai = await LGCadastre.locate(20.9, 106.9, 10);
    o.html = LGCadastre.locateHTML(o.khe).replace(/<[^>]+>/g, ' ');
    // giao diện: Thêm → Thửa tại vị trí của tôi (định vị giả lập tại giữa thửa 1, sai số 10)
    const q = ll(E + 10, N + 7); window.__gps = q;
    return o;
  }, [E, N]);
  const def = await p.evaluate(() => { const g = LGCore.Geometry.vn2000.def({ ktt: 105.5, mui: 3 }); const q = proj4(g, 'WGS84', [567010, 2256007]); return q; });
  await ctx.setGeolocation({ latitude: def[1], longitude: def[0], accuracy: 10 });
  const ui = await p.evaluate(async (def) => { navigator.geolocation.getCurrentPosition = ok => ok({ coords: { latitude: def[1], longitude: def[0], accuracy: 10 } }); // file:// không phải nguồn an toàn → giả lập API
    const w = ms => new Promise(r => setTimeout(r, ms)); const btn = Array.from(document.querySelectorAll('.lg103-dbtn')).pop(); btn.click(); await w(600); const row = document.querySelector('[data-lg103-act="cad-gps"]'); if (!row) return { row: false }; row.click(); await w(2500);
    const body = document.getElementById('lg103-body'), xem = body.querySelector('[data-lgpk-act="goto"]'); const o = { row: true, text: body.innerText.slice(0, 200), n: body.querySelectorAll('[data-lgpk-act="goto"]').length }; if (xem) { xem.click(); await w(1800); const l = LGCadastre.layer(); o.sel = l && l.selected() && [l.selected().to, l.selected().thua]; o.zoom = map.getZoom(); } return o; }, def);
  const ok = report('hm34_gps', {
    chua_tai_goi_bao_ro: !r.chuaTai.ok && /Chưa tải/.test(r.chuaTai.msg), thua_chua_diem: r.trong.ok && r.trong.inside && r.trong.inside.to === 3 && r.trong.inside.thua === 1,
    khe_hai_thua_liet_ke_lan_can: r.khe.ok && !r.khe.inside && r.khe.gan.length === 2 && r.khe.gan[0].kc <= r.khe.gan[1].kc && r.khe.gan[0].kc < 5 && r.khe.gan[1].kc < 5,
    khong_lay_thua_xa_ngoai_ban_kinh: !r.khe.gan.some(g => g.thua === 3), ngoai_goi_bao_ro: !r.ngoai.ok && /ngoài/.test(r.ngoai.msg), canh_bao_sai_so_lon: /sai số lớn/.test(r.html),
    giao_dien_dung_thua: ui.row && ui.n >= 1 && /Tờ 3 · Thửa 1/.test(ui.text) && JSON.stringify(ui.sel) === '[3,1]' && ui.zoom >= 18, khong_loi_trang: errs.length === 0 }, { r, ui, errs });
  await b.close(); process.exit(ok ? 0 : 1);
})();
