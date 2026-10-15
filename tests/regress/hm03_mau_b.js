// HM-03 (đặc tả) — một quy tắc sai số diện tích: Mẫu B |(91,29 − 1,44) − 89,9| ≈ 0,05 ≤ 0,50 → ĐẠT;
// hàm sai số duy nhất 0,05√A + 0,0003A. Hiện tại Mẫu B bị báo lệch 1,39 m² → FAIL trên v237 (XFAIL tới HM-03).
const { open, report, fx } = require('../lib');
(async () => {
  const B = fx('so-mau-B.json'); const { b, p } = await open(process.argv[2]);
  const txt = B.khoi_chinh.map((q, i) => `${i + 1} ${q[0]} ${q[1]} ${q[2] == null ? '' : q[2]}`).join('\n') + `\n1 ${B.khoi_chinh[0][0]} ${B.khoi_chinh[0][1]}`;
  const r = await p.evaluate(([txt, gcn, kc]) => { const a = LG145.parseBookText(txt);
    const c = LG145.checkBook({ points: a.points, sides: a.sides, dien_tich_m2: gcn, khong_cap_m2: kc });
    const bad = LG145.checkBook({ points: a.points, sides: a.sides, dien_tich_m2: gcn }); // không trừ phần không cấp → lệch 1,39 > 0,50
    const A = LG145.parseBookText('1 2260081.59 570346.55 0.50\n2 2260081.96 570346.89 3.02\n3 2260083.99 570349.13 5.59\n4 2260080.98 570353.84 4.54\n5 2260077.72 570350.68 1.38\n6 2260076.73 570349.72 5.64\n7 2260080.72 570345.74 1.19');
    const cA = LG145.checkBook({ points: A.points, sides: A.sides, dien_tich_m2: 29.7 });
    const strip = h => h.replace(/<[^>]+>/g, '');
    const bd = areaDeviationBadgeHTML(c.area, gcn, kc, { dien_tich_m2: gcn });
    const v142 = LG142 && LG142.reconcile ? 1 : 0;
    return { area: c.area, okArea: c.okArea, tol: calcPermissibleAreaError(gcn), tolFormula: 0.05 * Math.sqrt(gcn) + 0.0003 * gcn,
      khongTruThiLech: bad.okArea, A: cA.okArea && cA.okEdge, badgeOk: /✓/.test(bd), badge: strip(bd).slice(0, 160),
      verdict: [lgAreaVerdict(100, 100.3, 0).level, lgAreaVerdict(100, 101, 0).level, lgAreaVerdict(100, 104, 0).level] }; }, [txt, B.dien_tich_gcn, B.dien_tich_khong_cap_chuan]);
  const ok = report('hm03_mau_b', { dat_sau_tru_phan_khong_cap: r.okArea === true, sai_so_dung_cong_thuc: Math.abs(r.tol - r.tolFormula) < 1e-6,
    khong_tru_phan_khong_cap_thi_khong_dat: r.khongTruThiLech === false, mau_A_dat: r.A === true, the_thua_cung_ket_luan_dat: r.badgeOk,
    ba_muc_ok_warn_bad: r.verdict.join() === 'ok,warn,bad' }, r);
  await b.close(); process.exit(ok ? 0 : 1);
})();
