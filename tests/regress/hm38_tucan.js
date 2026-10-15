// HM-38 — Tứ cận trên hồ sơ: Bắc/Đông/Nam/Tây giáp … (theo sổ đã xác nhận ↔ theo hình học), nhãn quanh sơ đồ, cảnh báo mâu thuẫn; thửa không có giáp ranh → không thêm mục.
const { open, report } = require('../lib');
(async () => {
  const { b, p, errs } = await open(process.argv[2]);
  const r = await p.evaluate(async () => {
    const P = a => a.map(q => ({ x: q[0], y: q[1] })), w = ms => new Promise(r => setTimeout(r, ms)), o = {};
    drawPlot('Thửa 130', P([[2259334.42, 568031.07], [2259316.85, 568031.69], [2259316.0, 568022], [2259335, 568022]]), 105.5, { so_thua: '130', to_ban_do: '10.1' }, false, 3);
    drawPlot('Thửa 132', P([[2259317.37, 568036.15], [2259336.65, 568034.94], [2259337, 568045], [2259317, 568045]]), 105.5, { so_thua: '132', to_ban_do: '10.1' }, false, 3);
    drawPlot('Thửa 131', P([[2259336.23, 568027.14], [2259334.17, 568027.23], [2259334.42, 568031.07], [2259316.85, 568031.69], [2259316.59, 568031.7], [2259316.99, 568036.18], [2259317.37, 568036.15], [2259336.65, 568034.94]]), 105.5, { so_thua: '131', to_ban_do: '10.1', dien_tich_m2: 89.9, giap_ranh_tay: 'T.130', giap_ranh_dong: 'T.129', giap_ranh_nam: 'Đường Phạm Ngũ Lão' }, false, 3);
    const plot = plots.filter(q => q.id === 'Thửa 131')[0]; LG35.save(plot, LG35.fromPlot(plot));
    LG60.open(plot); await w(1200); const txt = Array.from(document.querySelectorAll('.lg60-page')).map(e => e.innerText).join('\n'); o.has = /TỨ CẬN/.test(txt); o.tay = /Tây giáp\s*\n?\s*Thửa 130/.test(txt) || /Tây giáp[\s\S]{0,40}Thửa 130/.test(txt);
    o.canhbao = /giáp thửa 129 nhưng hình học cho thấy thửa 132/.test(txt); o.nhanQuanhSoDo = Array.from(document.querySelectorAll('.lg60-tucan .lg60-tc')).map(e => e.innerText); o.refsham = /tham khảo/.test(txt);
    // thửa không có giáp ranh
    drawPlot('Thửa 9', P([[2259400, 568100], [2259410, 568100], [2259410, 568110], [2259400, 568110]]), 105.5, { so_thua: '9' }, false, 3);
    const p9 = plots[plots.length - 1]; LG60.open(p9); await w(1200); o.none = !/TỨ CẬN/.test(Array.from(document.querySelectorAll('.lg60-page')).map(e => e.innerText).join('\n')) && !document.querySelector('.lg60-tucan');
    return o; });
  const ok = report('hm38_tucan', { co_muc_tu_can: r.has, tay_giap_130: r.tay, mau_thuan_dong_129_vs_132: r.canhbao, nhan_quanh_so_do: r.nhanQuanhSoDo.length === 4 && r.nhanQuanhSoDo.some(t => /Bắc/.test(t)) && r.nhanQuanhSoDo.some(t => /Tây: Thửa 130/.test(t)) && r.nhanQuanhSoDo.some(t => /Nam: Đường Phạm Ngũ Lão/.test(t)), ghi_chi_tham_khao: r.refsham,
    khong_giap_ranh_khong_them_muc: r.none, khong_loi_trang: errs.length === 0 }, { r, errs });
  await b.close(); process.exit(ok ? 0 : 1);
})();
