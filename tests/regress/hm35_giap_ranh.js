// HM-35 — giáp ranh có cấu trúc: Mẫu A (460/68,5; 500/25,5; Ngõ Quang Trung), Mẫu B (130, 132, Đường Phạm Ngũ Lão; nhãn trống → "chưa rõ"); người dùng xác nhận/sửa trước khi lưu.
const { open, report, fx } = require('../lib');
(async () => {
  const A = fx('ai-mock-A.json'), B = fx('ai-mock-B.json'); const { b, p, errs } = await open(process.argv[2]);
  const r = await p.evaluate(async ([A, B]) => {
    const na = lgNormalizeAI(JSON.parse(JSON.stringify(A))), nb = lgNormalizeAI(JSON.parse(JSON.stringify(B))); const ea = LG35.fromAI(na), eb = LG35.fromAI(nb); const by = (e, h) => e.filter(x => x.huong === h)[0];
    const o = { a: { bac: by(ea, 'bac'), dong: by(ea, 'dong'), tay: by(ea, 'tay'), nam: by(ea, 'nam') }, b: { tay: by(eb, 'tay'), dong: by(eb, 'dong'), nam: by(eb, 'nam'), bac: by(eb, 'bac') },
      extra: ['T.130', 'T 12a', 'Thửa 77', '45', '45/12,5', 'Đường Phạm Ngũ Lão', 'Ngách 3/12', 'Ao cá', 'abc xyz', ''].map(t => LG35.parseLabel(t).loai) };
    // dựng thửa Mẫu B với giáp ranh AI và đi qua form xác nhận
    const pts = [[2259336.23, 568027.14], [2259334.17, 568027.23], [2259334.42, 568031.07], [2259316.85, 568031.69], [2259316.59, 568031.7], [2259316.99, 568036.18], [2259317.37, 568036.15], [2259336.65, 568034.94]].map(q => ({ x: q[0], y: q[1] }));
    drawPlot('Thửa 131', pts, 105.5, { so_thua: '131', to_ban_do: '10.1', giap_ranh_tay: B.giap_ranh_tay, giap_ranh_dong: B.giap_ranh_dong, giap_ranh_nam: B.giap_ranh_nam }, false, 3);
    const plot = plots[plots.length - 1]; o.truoc = LG35.confirmed(plot);
    const w = ms => new Promise(r => setTimeout(r, ms)); Array.from(document.querySelectorAll('.lg103-dbtn')).filter(x => /Hồ sơ/.test(x.innerText))[0].click(); await w(900);
    const btn = document.querySelector('[data-lg103-act="giap-ranh"]'); o.btn = !!btn; btn.click(); await w(600);
    const rows = Array.from(document.querySelectorAll('.lg35 .lg35-row')); o.rows = rows.length; o.legend = rows.map(r => r.querySelector('legend').innerText);
    const bacRow = rows[0]; o.bacChuaRo = /chưa rõ/.test(bacRow.querySelector('legend').innerText);
    // người dùng sửa phía Bắc thành thửa 129 (60,2 m²) rồi lưu
    const setv = (row, f, v) => { const e = row.querySelector('[data-f="' + f + '"]'); e.value = v; }; setv(bacRow, 'loai', 'thua'); setv(bacRow, 'so_thua', '129'); setv(bacRow, 'dien_tich', '60,2');
    document.querySelector('[data-lg103-act="giap-save"]').click(); await w(500);
    const m = plot.meta; o.sau = { ds: m.giap_ranh_ds.map(e => [e.huong, e.loai, e.so_thua, e.dien_tich, e.ten, e.xac_nhan]), flat: [m.giap_ranh_bac, m.giap_ranh_dong, m.giap_ranh_nam, m.giap_ranh_tay], tong: m.giap_ranh, confirmed: LG35.confirmed(plot) };
    return o; }, [A, B]);
  const ok = report('hm35_giap_ranh', {
    mau_A_460_68_5: r.a.bac.loai === 'thua' && r.a.bac.so_thua === '460' && r.a.bac.dien_tich === 68.5, mau_A_500_25_5: r.a.dong.loai === 'thua' && r.a.dong.so_thua === '500' && r.a.dong.dien_tich === 25.5,
    mau_A_ngo_quang_trung: r.a.tay.loai === 'ngo' && /Quang Trung/.test(r.a.tay.ten), mau_A_nam_chua_ro: r.a.nam.loai === 'chua_ro',
    mau_B_130_132: r.b.tay.loai === 'thua' && r.b.tay.so_thua === '130' && r.b.dong.loai === 'thua' && r.b.dong.so_thua === '132', mau_B_duong_pham_ngu_lao: r.b.nam.loai === 'duong' && /Phạm Ngũ Lão/.test(r.b.nam.ten),
    mau_B_bac_chua_ro_khong_doan: r.b.bac.loai === 'chua_ro' && !r.b.bac.ten, nhan_dang_cac_dang: r.extra.join() === 'thua,thua,thua,thua,thua,duong,ngo,khac,chua_ro,chua_ro',
    form_xac_nhan_4_huong_va_danh_dau_chua_ro: r.btn && r.rows === 4 && r.bacChuaRo && r.truoc === false,
    luu_sau_khi_sua_giu_o_chu_cu: r.sau.confirmed && r.sau.ds[0][1] === 'thua' && r.sau.ds[0][2] === '129' && r.sau.ds[0][3] === 60.2 && /Thửa 129 \(60,2 m²\)/.test(r.sau.flat[0]) && /130/.test(r.sau.flat[3]) && /Phạm Ngũ Lão/.test(r.sau.flat[2]) && /Bắc giáp Thửa 129/.test(r.sau.tong),
    khong_loi_trang: errs.length === 0 }, { r, errs });
  await b.close(); process.exit(ok ? 0 : 1);
})();
