// HM-02 — bộ đọc bảng kê: Mẫu B không hồi quy; số định dạng VN/khoảng trắng; O/l→0/1 kèm cảnh báo;
// dòng không đọc được & nhảy STT phải CẢNH BÁO (không bỏ im lặng).
const { open, report, fx } = require('../lib');
(async () => {
  const B = fx('so-mau-B.json'); const { b, p, errs } = await open(process.argv[2]);
  const txtB = B.khoi_chinh.map((q, i) => `${i + 1} ${q[0]} ${q[1]} ${q[2]}`).join('\n') + `\n1 ${B.khoi_chinh[0][0]} ${B.khoi_chinh[0][1]}`;
  const r = await p.evaluate(txtB => {
    const P = LG145.parseBookText, o = {};
    const bb = P(txtB); o.B = { n: bb.points.length, nb: bb.blocks.length, w: bb.warnings.length, area: calcArea(bb.points) };
    const vn = P('1 2.259.336,23 568.027,14 2,06\n2 2.259.334,17 568.027,23 3,85\n3 2.259.334,42 568.031,07 17,58');
    o.vn = vn.points.map(q => [q.x, q.y]).concat([vn.sides]);
    const sp = P('1 2 259 336,23 568 027,14\n2 2 259 334,17 568 027,23\n3 2 259 334,42 568 031,07');
    o.sp = sp.points.map(q => [q.x, q.y]);
    const ol = P('1 2259336.23 568O27.14 2.06\n2 2259334.17 568027.23 3.85\n3 2259334.42 568031.07 l7.58');
    o.ol = { y0: ol.points[0].y, s2: ol.sides && ol.sides[2], warn: ol.warnings.length };
    const bad = P('1 2259336.23 568027.14\n2 xyz 12 34\n3 2259334.42 568031.07\n5 2259316.85 568031.69');
    o.bad = { n: bad.points.length, w: bad.warnings.join(' | ') };
    return o; }, txtB);
  const near = (a, v) => Math.abs(a - v) < 1e-6;
  const ok = report('hm02_parser', {
    B_8moc_khong_khoi_phu_khong_canh_bao: r.B.n === 8 && r.B.nb === 0 && r.B.w === 0 && Math.abs(r.B.area - 91.29) < 0.01,
    so_VN_cham_phay: near(r.vn[0][0], 2259336.23) && near(r.vn[0][1], 568027.14) && r.vn[3] && near(r.vn[3][0], 2.06),
    so_khoang_trang: near(r.sp[0][0], 2259336.23) && near(r.sp[0][1], 568027.14),
    O_l_sua_kem_canh_bao: r.ol.y0 === 568027.14 && r.ol.s2 === 17.58 && r.ol.warn >= 1,
    dong_loi_va_STT_nhay_co_canh_bao: /không đọc được/.test(r.bad.w) && /STT nhảy/.test(r.bad.w) }, r);
  await b.close(); process.exit(ok && !errs.length ? 0 : 1);
})();
