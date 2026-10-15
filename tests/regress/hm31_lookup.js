// HM-31 — Tra địa chính: xã (tên CŨ vẫn tìm được) + tờ + thửa → bảng toạ độ → đối chiếu GCN → dựng thửa; ghi nguồn "Dữ liệu địa chính … ngày …" vào hồ sơ.
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path'), fs = require('fs'), os = require('os'), crypto = require('crypto'); const { spawnSync } = require('child_process'); const { report } = require('../lib');
const root = path.join(__dirname, '..', '..');
(async () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'l31-')); const E = 567289.23, N = 2256045.02;
  const parcels = [{ to: 7, thua: 12, dt: 300, dtHH: 300, ld: 'ONT', ring: [[E, N], [E + 20, N], [E + 20, N + 15], [E, N + 15], [E, N]] }, { to: 7, thua: 13, dt: 100, dtHH: 100, ld: 'LUC', ring: [[E + 30, N], [E + 40, N], [E + 40, N + 10], [E + 30, N + 10], [E + 30, N]] }];
  fs.writeFileSync(d + '/p.json', JSON.stringify({ xa: 'Phường Thử Một', crs: 'VN2000', ktt: 105.5, mui: 3, n: 2, parcels }));
  const r0 = spawnSync('python3', [root + '/handover/tools/cadastre_pack.py', d + '/p.json', d + '/o'], { encoding: 'utf8' }); if (r0.status) { console.error(r0.stderr); process.exit(1); }
  const gz = fs.readFileSync(d + '/o/pack.lgpk.gz'), sha = crypto.createHash('sha256').update(gz).digest('hex');
  const cat = { packs: [{ id: 'phuong-thu-mot', ten: 'Phường Thử Một', ver: '1', ngay: '01/10/2026', ktt: 105.5, mui: 3, bytes: gz.length, sha256: sha, url: 'http://pk.test/a.bin' }] };
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await p.route(/^https?:/, r => { const u = r.request().url(); if (u.endsWith('catalog.json')) return r.fulfill({ json: cat }); if (u.endsWith('a.bin')) return r.fulfill({ status: 200, body: gz }); return r.abort(); });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto('file://' + path.resolve(process.argv[2])); await p.waitForTimeout(3500);
  const r = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)), o = {}; LGPacks.config({ catalogUrl: 'http://pk.test/catalog.json' });
    LGAdmin.load([{ moi: 'Phường Thử Một', loai: 'phường', cu: [{ ten: 'Xã Cũ Bê', huyen: 'Huyện Y', tinh: 'NINH_BINH' }] }]);
    o.k0 = await LGCadastre.lookup('Xã Cũ Bê', 7, 12); // chưa tải gói
    o.inst = await LGPacks.install((await LGPacks.catalog())[0]);
    o.ok = await LGCadastre.lookup('xa cu be', 7, 12); o.moi = (await LGCadastre.lookup('Thử Một', 7, 13)).ok; o.khong = await LGCadastre.lookup('Xã Cũ Bê', 7, 99); o.thieu = await LGCadastre.lookup('Xã Cũ Bê', '', '');
    const before = plots.length; lg8dOpen(); await w(300);
    const set = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); };
    set('lg8d-cadxa', 'Xã Cũ Bê'); set('lg8d-to', '7'); set('lg8d-so', '12'); document.querySelector('[data-w=cad]').click(); await w(1200);
    o.msg = (document.querySelector('#lg8d .good') || {}).textContent; o.text = document.getElementById('lg8d-text').value; o.gcn = document.getElementById('lg8d-gcn').value;
    document.querySelector('[data-w=next]').click(); await w(500); o.step2 = document.getElementById('lg8d').innerText.slice(0, 200);
    document.querySelector('[data-w=draw]').click(); await w(4000);
    const pl = plots[plots.length - 1]; o.created = plots.length > before; o.nguon = pl && pl.meta && pl.meta.nguon_toa_do; o.so = pl && pl.meta && pl.meta.so_thua; o.res = document.getElementById('lg8d').innerText.slice(0, 160);
    return o;
  });
  const ok = report('hm31_lookup', {
    chua_tai_goi_bao_ro: !r.k0.ok && /Gói dữ liệu địa chính/.test(r.k0.msg), tai_goi_ok: r.inst.ok === true,
    tra_bang_ten_cu_va_moi: r.ok.ok && r.moi, bang_toa_do_dung: r.ok.text.split('\n').length === 5 && /^1 2256045\.02 567289\.23 20\.00/.test(r.ok.text) && r.ok.text.split('\n')[4].startsWith('1 2256045.02 567289.23'),
    khong_thay_va_thieu_so: !r.khong.ok && /thửa 99/.test(r.khong.msg) && !r.thieu.ok, ghi_nguon_co_ngay: /ngày 01\/10\/2026/.test(r.ok.nguon),
    giao_dien_dien_buoc1: /Đã lấy 4 mốc/.test(r.msg || '') && r.gcn === '300', dung_thua_va_nguon_trong_ho_so: r.created && r.so === '12' && /Dữ liệu địa chính.*Phường Thử Một.*ngày 01\/10\/2026/.test(r.nguon || ''),
    khong_loi_trang: errs.length === 0 }, { r, errs });
  await b.close(); process.exit(ok ? 0 : 1);
})();
