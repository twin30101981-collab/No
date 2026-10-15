// HM-04b — KTT theo địa giới hành chính mới (sau 1/7/2025): theo phường/xã cũ; nhiều KTT mà không rõ → HỎI (không đoán); ưu tiên dòng KTT in trên sổ; chính tả Đắk Lắk.
const { open, report } = require('../lib');
(async () => {
  const { b, p, errs } = await open(process.argv[2]);
  const r = await p.evaluate(async () => {
    const R = a => { const x = LG146.resolveAddress(a); return { st: x.status, lon0: x.lon0, key: x.key, opts: x.options && x.options.map(o => o.key + ':' + o.lon0) }; };
    const out = {
      vt: R('phường Vũng Tàu, TP Hồ Chí Minh'), hd: R('phường Hải Dương, TP Hải Phòng'), td: R('phường Thành Đông, thành phố Hải Phòng'),
      nb: R('xã Xyz, tỉnh Ninh Bình'), ktt1: R('phường Thành Đông, thành phố Hải Phòng, KTT 105°30\''), ktt2: R('phường Gò Vấp, TP Hồ Chí Minh. Kinh tuyến trục 107°45′'), ktt3: R('KTT: 105.75 phường A, tỉnh Lâm Đồng'),
      dak: R('xã Ea Kar, tỉnh Đắc Lắk'), hoian: R('phường Hội An, thành phố Đà Nẵng'), bt: R('phường Phan Thiết, tỉnh Lâm Đồng'),
      fmt: [LG146.fmtKtt(107.75), LG146.fmtKtt(105.5)], name: VN2000_PROVINCES.DAK_LAK.name };
    // hỏi người dùng thay vì đoán: không có lựa chọn → KTT thửa giữ nguyên; có lựa chọn → áp dụng đúng
    const pts = [{ x: 2259336.23, y: 568027.14 }, { x: 2259334.17, y: 568027.23 }, { x: 2259334.42, y: 568031.07 }];
    drawPlot('Thửa ask', pts, 105.5, { so_thua: '1' }, false, 3); const pl = plots[plots.length - 1]; const before = pl.lon0;
    let asked = 0; window.LG146_ASK_OVERRIDE = () => { asked++; return null; };
    const ret = LG146.applyProvince('phường Thành Đông, thành phố Hải Phòng'); await new Promise(r => setTimeout(r, 200));
    out.skip = { ret, asked, same: pl.lon0 === before };
    window.LG146_ASK_OVERRIDE = () => 'HAI_PHONG'; LG146.applyProvince('phường Thành Đông, thành phố Hải Phòng'); await new Promise(r => setTimeout(r, 400));
    out.chosen = pl.lon0;
    return out; });
  const ok = report('hm04b_ktt', {
    vung_tau_107_45: r.vt.st === 'ok' && r.vt.lon0 === 107.75 && r.fmt[0] === '107°45′',
    hai_duong_105_30: r.hd.st === 'ok' && r.hd.lon0 === 105.5 && r.fmt[1] === '105°30′',
    nhieu_KTT_khong_ro_thi_hoi: r.td.st === 'ask' && r.td.opts.length === 2 && r.nb.st === 'ask',
    uu_tien_dong_KTT_tren_so: r.ktt1.st === 'ok' && r.ktt1.lon0 === 105.5 && r.ktt2.lon0 === 107.75 && r.ktt3.lon0 === 105.75,
    chinh_ta_Dak_Lak: r.name === 'Đắk Lắk' && r.dak.st === 'ok',
    cung_KTT_chot_luon: r.hoian.st === 'ok' && r.bt.lon0 === 108.5,
    khong_tu_doan_khi_nguoi_dung_bo_qua: r.skip.ret === null && r.skip.asked === 1 && r.skip.same,
    chon_dia_ban_cu_ap_dung_dung: r.chosen === 105.75 }, r);
  await b.close(); process.exit(ok && !errs.length ? 0 : 1);
})();
