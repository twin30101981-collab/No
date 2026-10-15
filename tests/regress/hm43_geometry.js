// HM-43 — kiểm tra hình học đầy đủ: Mẫu A gộp sai → "mốc 5 trùng mốc 8"; hồ sơ chỉ ghi "hợp lệ" khi qua hết; Mẫu A/B đúng → hợp lệ.
const { open, report, fx } = require('../lib');
(async () => {
  const A = fx('so-mau-A.json'), B = fx('so-mau-B.json'); const { b, p, errs } = await open(process.argv[2]);
  const r = await p.evaluate(([A, B]) => {
    const G = LGCore.Geometry, P = a => a.map((q, i) => ({ x: q[0], y: q[1], ten: String(i + 1) }));
    const merged = P(A.khoi_chinh.concat(A.khoi_phu));            // 11 mốc gộp sai (mốc 5 = mốc 8; mốc 11 = mốc 1)
    const vA = G.validate(P(A.khoi_chinh)), vB = G.validate(P(B.khoi_chinh)), vM = G.validate(merged);
    const bow = G.validate([{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 10, y: 0 }, { x: 0, y: 10 }]);           // nơ bướm: tự cắt
    const touch = G.validate([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 5, y: 0 }, { x: 0, y: 10 }]); // mốc 4 chạm cạnh 1–2
    const flat = G.validate([{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 0 }]);
    const out = G.validate(P(A.khoi_chinh), { blocks: [{ points: [{ x: 2260000, y: 570000 }, { x: 2260001, y: 570001 }] }] });
    // hồ sơ: thửa gộp sai phải KHÔNG ghi hợp lệ
    drawPlot('Thửa gop', merged.map(q => ({ x: q.x, y: q.y })), 105.5, { dien_tich_m2: 29.7, so_thua: '1' }, false, 3);
    const bad = LG60.buildDossier(plots[plots.length - 1]);
    drawPlot('Thửa A', P(A.khoi_chinh).map(q => ({ x: q.x, y: q.y })), 105.5, { dien_tich_m2: 29.7, so_thua: '2' }, false, 3);
    const good = LG60.buildDossier(plots[plots.length - 1]);
    return { vA: vA.ok, vB: vB.ok, vM: vM.errors.map(e => e.text), bow: bow.errors.map(e => e.type), touch: touch.errors.map(e => e.type), flat: flat.errors.map(e => e.type), outW: out.warnings.length,
      badLogs: bad.logs.join(' | '), goodLogs: good.logs.join(' | '), badShape: bad.shapeOk, goodShape: good.shapeOk }; }, [A, B]);
  const ok = report('hm43_geometry', {
    mau_A_va_B_dung_hop_le: r.vA === true && r.vB === true,
    A_gop_sai_bao_moc_5_trung_moc_8: r.vM.some(t => /mốc 5 trùng mốc 8/.test(t)),
    tu_cat_cham_thang_hang: r.bow.includes('tu_cat') && r.touch.includes('cham') && r.flat.includes('dien_tich_0'),
    khoi_phu_ngoai_vong_chinh_canh_bao: r.outW >= 1,
    ho_so_chi_ghi_hop_le_khi_qua_het: r.badShape === false && /KHÔNG HỢP LỆ/.test(r.badLogs) && /mốc 5 trùng mốc 8/.test(r.badLogs) && r.goodShape === true && /HỢP LỆ/.test(r.goodLogs) && !/KHÔNG HỢP LỆ/.test(r.goodLogs) }, r);
  await b.close(); process.exit(ok && !errs.length ? 0 : 1);
})();
