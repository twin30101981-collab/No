// HM-02 (đặc tả) — Mẫu A: bảng kê đầy đủ → vòng chính 7 mốc 29,70 m² + khối phụ 4 mốc ≈ 7,10 m² tách riêng.
// Hiện tại parseBookText gộp 11 mốc (29,85 m²) → FAIL trên v237 (XFAIL cho tới khi làm HM-02).
// Khi làm HM-02: nếu đặt tên trường khác 'blocks' thì chỉnh test này cho khớp, KHÔNG nới tiêu chí.
const { open, report } = require('../lib');
const T = `1 2260081.59 570346.55 0.50
2 2260081.96 570346.89 3.02
3 2260083.99 570349.13 5.59
4 2260080.98 570353.84 4.54
5 2260077.72 570350.68 1.38
6 2260076.73 570349.72 5.64
7 2260080.72 570345.74 1.19
1 2260081.59 570346.55

8 2260077.72 570350.68 2.69
9 2260079.53 570348.69 1.06
10 2260080.25 570347.91 1.91
11 2260081.59 570346.55`;
(async () => {
  const { b, p } = await open(process.argv[2]);
  const r = await p.evaluate(T => { const a = LG145.parseBookText(T);
    const blocks = a.blocks || [];
    return { n: a.points.length, area: calcArea(a.points), nb: blocks.length,
      nb0: blocks[0] && blocks[0].points ? blocks[0].points.length : 0,
      ab: blocks[0] && blocks[0].area || 0 }; }, T);
  const ok = report('hm02_mau_a', { vong_chinh_7_moc: r.n === 7, dien_tich_chinh_29_70: Math.abs(r.area - 29.70) < 0.01,
    khoi_phu_tach_rieng: r.nb === 1 && r.nb0 === 4, dien_tich_phu_7_10: Math.abs(r.ab - 7.10) < 0.05 }, r);
  await b.close(); process.exit(ok ? 0 : 1);
})();
