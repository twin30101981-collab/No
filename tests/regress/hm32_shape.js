// HM-32 — tìm thửa theo hình dạng + diện tích + dãy cạnh (sổ không toạ độ): Mẫu B top-1 dù lệch mốc đầu/đảo chiều; 3 ứng viên có % và lý do; cảnh báo tham khảo.
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path'), fs = require('fs'), os = require('os'), crypto = require('crypto'); const { spawnSync } = require('child_process'); const { report, fx } = require('../lib');
const root = path.join(__dirname, '..', '..');
(async () => {
  const B = fx('so-mau-B.json'); const d = fs.mkdtempSync(path.join(os.tmpdir(), 'l32-')); const parcels = []; let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const poly = (ox, oy, pts) => pts.map(q => [oy + q[1] - B.khoi_chinh[0][1], ox + q[0] - B.khoi_chinh[0][0]]); // (E,N)
  const base = B.khoi_chinh.map(q => [q[0], q[1]]); const mk = (to, thua, pts, dt) => { const r = pts.map(q => [q[0], q[1]]); r.push(r[0]); return { to, thua, dt, dtHH: dt, ld: 'ONT', ring: r }; };
  // thửa đích: Mẫu B (x=Bắc, y=Đông → ring [Đông, Bắc]) đặt ở tờ 9 thửa 77
  const toRing = (ox, oy, k, sx, sy) => base.map(q => [ox + (q[1] - base[0][1]) * (sx || 1) * k, oy + (q[0] - base[0][0]) * (sy || 1) * k]);
  for (let i = 0; i < 1500; i++) { const sx = 0.6 + rnd() * 0.9, sy = 0.6 + rnd() * 0.9; parcels.push(mk(1 + (i % 8), i + 1, toRing(568000 + (i % 50) * 60, 2259000 + Math.floor(i / 50) * 60, 1, sx, sy), 60 + rnd() * 60)); }
  const near = toRing(568000, 2258000, 1); near[2] = [near[2][0] + 4, near[2][1]]; parcels.push(mk(9, 78, near, 89)); // gần giống nhưng lệch một cạnh
  parcels.push(mk(9, 77, toRing(568200, 2258000, 1), B.dien_tich_gcn));
  fs.writeFileSync(d + '/p.json', JSON.stringify({ xa: 'Phường Hình', crs: 'VN2000', ktt: 105.5, mui: 3, n: parcels.length, parcels }));
  const r0 = spawnSync('python3', [root + '/handover/tools/cadastre_pack.py', d + '/p.json', d + '/o'], { encoding: 'utf8' }); if (r0.status) { console.error(r0.stderr); process.exit(1); }
  const gz = fs.readFileSync(d + '/o/pack.lgpk.gz'), sha = crypto.createHash('sha256').update(gz).digest('hex');
  const cat = { packs: [{ id: 'phuong-hinh', ten: 'Phường Hình', ver: '1', ngay: '02/10/2026', ktt: 105.5, mui: 3, bytes: gz.length, sha256: sha, url: 'http://pk.test/a.bin' }] };
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await p.route(/^https?:/, r => { const u = r.request().url(); if (u.endsWith('catalog.json')) return r.fulfill({ json: cat }); if (u.endsWith('a.bin')) return r.fulfill({ status: 200, body: gz }); return r.abort(); });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto('file://' + path.resolve(process.argv[2])); await p.waitForTimeout(3500);
  const sides = B.khoi_chinh.map(q => q[2]); // cạnh in trên sổ: mốc i → i+1
  const geo = base.map((q, i) => { const n = base[(i + 1) % base.length]; return +Math.hypot(n[0] - q[0], n[1] - q[1]).toFixed(2); }); // cạnh hình học chuẩn
  const rot = geo.slice(3).concat(geo.slice(0, 3)), rev = geo.slice().reverse(), both = rev.slice(2).concat(rev.slice(0, 2));
  const r = await p.evaluate(async ([sides, geo, rot, rev, both, A]) => {
    const w = ms => new Promise(r => setTimeout(r, ms)), o = {}; LGPacks.config({ catalogUrl: 'http://pk.test/catalog.json' });
    o.k0 = await LGCadastre.findByShape('Phường Hình', { area: A, edges: geo }); await LGPacks.install((await LGPacks.catalog())[0]);
    const run = async e => (await LGCadastre.findByShape('Phường Hình', { area: A, edges: e }));
    o.geo = await run(geo); o.rot = await run(rot); o.rev = await run(rev); o.both = await run(both); o.few = await LGCadastre.findByShape('Phường Hình', { area: A, edges: [1, 2] });
    o.t0 = performance.now(); await run(both); o.ms = Math.round(performance.now() - o.t0);
    lg8dOpen(); await w(300); const set = (id, v) => { const e = document.getElementById(id); e.value = v; }; set('lg8d-cadxa', 'Phường Hình'); set('lg8d-gcn', String(A)); set('lg8d-edges', both.join(' '));
    document.querySelector('[data-w=shape]').click(); await w(1500); const pick = document.querySelector('[data-w=cadpick]'); o.ui = { n: document.querySelectorAll('[data-w=cadpick]').length, first: pick && pick.innerText.slice(0, 120), warn: /tham khảo/.test(document.getElementById('lg8d').innerText) };
    pick.click(); await w(1500); o.after = { so: document.getElementById('lg8d-so').value, to: document.getElementById('lg8d-to').value, text: document.getElementById('lg8d-text').value.split('\n').length };
    return o;
  }, [sides, geo, rot, rev, both, B.dien_tich_gcn]);
  const top = x => x.ung_vien && x.ung_vien[0] && x.ung_vien[0].to === 9 && x.ung_vien[0].thua === 77;
  const ok = report('hm32_shape', {
    chua_tai_goi_bao_ro: r.k0.ok === false, top1_khi_nhap_dung: top(r.geo), top1_lech_moc_dau: top(r.rot), top1_dao_chieu: top(r.rev), top1_dao_chieu_va_lech: top(r.both),
    ba_ung_vien_co_pct_va_ly_do: r.both.ung_vien.length === 3 && r.both.ung_vien.every(c => c.pct >= 0 && /Cạnh lệch/.test(c.why)) && r.both.ung_vien[0].pct > r.both.ung_vien[1].pct,
    canh_bao_tham_khao: /tham khảo/.test(r.both.msg) && r.ui.warn, thieu_canh_bao_loi: r.few.ok === false, nhanh_1500_thua: r.ms < 1500,
    chon_ung_vien_dien_to_thua_va_toa_do: r.ui.n === 3 && r.after.so === '77' && r.after.to === '9' && r.after.text === 9, khong_loi_trang: errs.length === 0 }, { r, errs });
  await b.close(); process.exit(ok ? 0 : 1);
})();
