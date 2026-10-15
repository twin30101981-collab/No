// HM-03 (đặc tả) — một quy tắc sai số diện tích: Mẫu B |(91,29 − 1,44) − 89,9| ≈ 0,05 ≤ 0,50 → ĐẠT;
// hàm sai số duy nhất 0,05√A + 0,0003A. Hiện tại Mẫu B bị báo lệch 1,39 m² → FAIL trên v237 (XFAIL tới HM-03).
const { open, report, fx } = require('../lib');
(async () => {
  const B = fx('so-mau-B.json'); const { b, p } = await open(process.argv[2]);
  const txt = B.khoi_chinh.map((q, i) => `${i + 1} ${q[0]} ${q[1]} ${q[2] == null ? '' : q[2]}`).join('\n') + `\n1 ${B.khoi_chinh[0][0]} ${B.khoi_chinh[0][1]}`;
  const r = await p.evaluate(([txt, gcn, kc]) => { const a = LG145.parseBookText(txt);
    const c = LG145.checkBook({ points: a.points, sides: a.sides, dien_tich_m2: gcn, khong_cap_m2: kc });
    return { area: c.area, okArea: c.okArea, tol: calcPermissibleAreaError(gcn), tolFormula: 0.05 * Math.sqrt(gcn) + 0.0003 * gcn }; }, [txt, B.dien_tich_gcn, B.dien_tich_khong_cap_chuan]);
  const ok = report('hm03_mau_b', { dat_sau_tru_phan_khong_cap: r.okArea === true, sai_so_dung_cong_thuc: Math.abs(r.tol - r.tolFormula) < 1e-6 }, r);
  await b.close(); process.exit(ok ? 0 : 1);
})();
