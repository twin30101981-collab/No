// HM-41 — quét/đối soát KHÔNG tự ép diện tích hay ghi đè toạ độ. Bình sai chỉ khi người dùng gọi applyPendingAdjust.
const { open, report, fx } = require('../lib');
(async () => {
  const B = fx('so-mau-B.json'); const { b, p, errs } = await open(process.argv[2]);
  const r = await p.evaluate(B => {
    const mk = (pts, jig) => pts.map((q, i) => ({ ten: String(i + 1), x: q[0] + (i === 2 ? jig : 0), y: q[1], s_gcn: q[2] }));
    const out = {}; const snap = () => JSON.stringify(sodoCoords.map(c => [c.x, c.y]));
    // 1) Mẫu B đúng sổ (91,29 − 1,44 = 89,85 so với 89,9): không đổi toạ độ.
    window.sodoCoords = mk(B.khoi_chinh, 0);
    window.sodoMeta = { dien_tich_m2: B.dien_tich_gcn, dien_tich_khong_cap_gcn: B.khong_cap_gcn, canh_gcn: B.khoi_chinh.map(q => q[2]) };
    LG145.bookRef = null; const s0 = snap(); const a = LG145.autoAdjust();
    out.B = { ok: a && a.ok, same: snap() === s0, pending: !!LG145.pendingAdjust, applied: !!(LG145.lastAdjust && LG145.lastAdjust.applied) };
    // 2) bảng kê lệch (mốc 3 lệch 0,6 m): chỉ ĐỀ XUẤT, toạ độ vẫn nguyên; áp dụng thì mới đổi.
    window.sodoCoords = mk(B.khoi_chinh, 0.6);
    const s1 = snap(); const a2 = LG145.autoAdjust();
    out.lech = { same: snap() === s1, pending: !!LG145.pendingAdjust, applied: !!(LG145.lastAdjust && LG145.lastAdjust.applied) };
    const okApply = LG145.applyPendingAdjust();
    out.apply = { ok: okApply, changed: snap() !== s1, applied: !!(LG145.lastAdjust && LG145.lastAdjust.applied), hasBefore: !!(LG145.lastAdjust && LG145.lastAdjust.before) };
    return out; }, B);
  const ok = report('hm41_no_autoadjust', {
    MauB_khop_so_khong_dich: r.B.ok === true && r.B.same && !r.B.applied,
    lech_chi_de_xuat_khong_ghi_de: r.lech.same && r.lech.pending && !r.lech.applied,
    chi_ap_dung_khi_nguoi_dung_chon: r.apply.ok && r.apply.changed && r.apply.applied && r.apply.hasBefore }, r);
  await b.close(); process.exit(ok && !errs.length ? 0 : 1);
})();
