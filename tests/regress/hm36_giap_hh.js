// HM-36 — giáp ranh theo hình học: Mẫu B + 2 thửa bên cạnh → Tây 130, Đông 132, Nam không có thửa (đường); mâu thuẫn nhãn sổ → cảnh báo; nhãn trên bản đồ bật/tắt; thửa từ gói địa chính.
const { open, report } = require('../lib');
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto'); const { spawnSync } = require('child_process'); const { chromium } = require('/opt/node-tools/node_modules/playwright');
const root = path.join(__dirname, '..', '..');
(async () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'l36-')); // gói địa chính có thửa 140 sát cạnh BẮC (trên cạnh 8→1): ring [Đông, Bắc]
  const parcels = [{ to: 10, thua: 140, dt: 80, dtHH: 80, ld: 'ONT', ring: [[568027.14, 2259336.23], [568034.94, 2259336.65], [568034.94, 2259346], [568027.14, 2259346], [568027.14, 2259336.23]] }];
  fs.writeFileSync(d + '/p.json', JSON.stringify({ xa: 'Xã Giáp', crs: 'VN2000', ktt: 105.5, mui: 3, n: 1, parcels }));
  const r0 = spawnSync('python3', [root + '/handover/tools/cadastre_pack.py', d + '/p.json', d + '/o'], { encoding: 'utf8' }); if (r0.status) { console.error(r0.stderr); process.exit(1); }
  const gz = fs.readFileSync(d + '/o/pack.lgpk.gz'), sha = crypto.createHash('sha256').update(gz).digest('hex'); const cat = { packs: [{ id: 'xa-giap', ten: 'Xã Giáp', ver: '1', ktt: 105.5, mui: 3, bytes: gz.length, sha256: sha, url: 'http://pk.test/a.bin' }] };
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route(/^https?:/, r => { const u = r.request().url(); if (u.endsWith('catalog.json')) return r.fulfill({ json: cat }); if (u.endsWith('a.bin')) return r.fulfill({ status: 200, body: gz }); return r.abort(); });
  await p.goto('file://' + path.resolve(process.argv[2])); await p.waitForTimeout(3500);
  const r = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)), o = {}; const P = a => a.map(q => ({ x: q[0], y: q[1] }));
    const B = [[2259336.23, 568027.14], [2259334.17, 568027.23], [2259334.42, 568031.07], [2259316.85, 568031.69], [2259316.59, 568031.7], [2259316.99, 568036.18], [2259317.37, 568036.15], [2259336.65, 568034.94]];
    drawPlot('Thửa 130', P([[2259334.42, 568031.07], [2259316.85, 568031.69], [2259316.0, 568022], [2259335, 568022]]), 105.5, { so_thua: '130', to_ban_do: '10.1' }, false, 3);
    drawPlot('Thửa 132', P([[2259317.37, 568036.15], [2259336.65, 568034.94], [2259337, 568045], [2259317, 568045]]), 105.5, { so_thua: '132', to_ban_do: '10.1' }, false, 3);
    drawPlot('Thửa 131', P(B), 105.5, { so_thua: '131', to_ban_do: '10.1', giap_ranh_tay: 'T.130', giap_ranh_dong: 'T.132', giap_ranh_nam: 'Đường Phạm Ngũ Lão' }, false, 3);
    const plot = plots.filter(q => q.id === 'Thửa 131')[0]; LG35.save(plot, LG35.fromPlot(plot));   // người dùng đã xác nhận nhãn sổ
    const c = LG36.compute(plot); o.huong = Object.fromEntries(Object.entries(c.huong).map(([k, v]) => [k, v.map(t => t.so_thua)])); o.canhbao = c.canh_bao.map(x => x.text); o.nCanh = c.canh.length;
    // mâu thuẫn: sổ ghi Đông giáp 999
    const ds = plot.meta.giap_ranh_ds.map(e => ({ ...e })); ds.filter(e => e.huong === 'dong')[0].so_thua = '999'; plot.meta.giap_ranh_ds = ds; o.canhbaoXau = LG36.compute(plot).canh_bao.map(x => x.text);
    ds.filter(e => e.huong === 'dong')[0].so_thua = '132'; plot.meta.giap_ranh_ds = ds;
    // gói địa chính: thửa 140 sát cạnh Bắc
    LGPacks.config({ catalogUrl: 'http://pk.test/catalog.json' }); await LGPacks.install((await LGPacks.catalog())[0]); await LGCadastre.warmPacks();
    const extra = await LG36.packCandidates(plot); o.extra = extra.map(e => e.so_thua); const c2 = LG36.compute(plot, extra); o.bac = c2.huong.bac.map(t => t.so_thua + '/' + t.nguon);
    // giao diện: Hồ sơ → Giáp ranh + nhãn bản đồ
    Array.from(document.querySelectorAll('.lg103-dbtn')).filter(x => /Hồ sơ/.test(x.innerText))[0].click(); await w(900); setSelectedPlotId && setSelectedPlotId(plot.id); await w(300);
    document.querySelector('[data-lg103-act="prof-giap"]').click(); await w(2500); const box = document.getElementById('lg36-box'); o.ui = box ? box.innerText : '';
    document.querySelector('[data-lg103-act="giap-labels"]').click(); await w(800); o.tags = document.querySelectorAll('.lg36-tag').length; o.tagTxt = Array.from(document.querySelectorAll('.lg36-tag')).map(e => e.innerText).join(' | ');
    document.querySelector('[data-lg103-act="giap-labels"]').click(); await w(500); o.tagsOff = document.querySelectorAll('.lg36-tag').length;
    return o; });
  const ok = report('hm36_giap_hh', {
    tay_130: r.huong.tay.join() === '130', dong_132: r.huong.dong.join() === '132', nam_khong_co_thua: r.huong.nam.length === 0, bac_khong_co_thua_khi_chua_co_goi: r.huong.bac.length === 0,
    nhan_so_khop_hinh_hoc_khong_canh_bao: r.canhbao.length === 0, mau_thuan_nhan_so_thi_canh_bao: r.canhbaoXau.length === 1 && /giáp thửa 999/.test(r.canhbaoXau[0]) && /132/.test(r.canhbaoXau[0]),
    goi_dia_chinh_cho_thua_ben_bac: r.extra.join() === '140' && r.bac.join() === '140/dia_chinh', tab_giap_ranh_hien_thi: /Tây/.test(r.ui) && /Thửa 130/.test(r.ui) && /Thửa 132/.test(r.ui) && /chỉ để tham khảo/i.test(r.ui),
    nhan_ban_do_bat_tat: r.tags >= 3 && /Tây: Thửa 130/.test(r.tagTxt) && r.tagsOff === 0, khong_loi_trang: errs.length === 0 }, { r, errs });
  await b.close(); process.exit(ok ? 0 : 1);
})();
