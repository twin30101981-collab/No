import { describe, expect, it } from "vitest";
import type { PageEdit } from "@/lib/db";
import { startSession, applyEdit, undo, redo, resetSession, cancelSession, saveSession, isDirty, canUndo, canRedo, cropSafety, edgeCutCheck, sameAspect, editsEqual, MAX_HISTORY } from "@/lib/edit-session";

const base: PageEdit = { rotation: 0, filter: "auto", brightness: 0, contrast: 0, quad: [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]] };

describe("S13 phiên chỉnh tay", () => {
  it("kéo thanh trượt chưa Lưu thì bản đã lưu không đổi và Lưu báo không đổi khi nháp bằng đã lưu", () => {
    let s = startSession(base);
    expect(isDirty(s)).toBe(false);
    s = applyEdit(s, { brightness: 20 });
    expect(isDirty(s)).toBe(true);
    expect(s.saved.brightness).toBe(0);
    expect(cancelSession(s).brightness).toBe(0);
    s = applyEdit(s, { brightness: 0 });
    expect(isDirty(s)).toBe(false);
    expect(saveSession(s).changed).toBe(false);
  });
  it("thay đổi trùng không thêm bước hoàn tác", () => {
    const s = startSession(base);
    expect(applyEdit(s, { filter: "auto" })).toBe(s);
    expect(canUndo(applyEdit(s, { contrast: 5 }))).toBe(true);
  });
  it("hoàn tác / làm lại; sửa mới xoá nhánh làm lại", () => {
    let s = startSession(base);
    s = applyEdit(s, { brightness: 10 }); s = applyEdit(s, { brightness: 30 });
    s = undo(s); expect(s.draft.brightness).toBe(10); expect(canRedo(s)).toBe(true);
    s = redo(s); expect(s.draft.brightness).toBe(30);
    s = undo(s); s = applyEdit(s, { contrast: -10 });
    expect(canRedo(s)).toBe(false);
    expect(undo(startSession(base))).toEqual(startSession(base));
  });
  it("đặt lại về bản đã lưu và hoàn tác được", () => {
    let s = startSession(base);
    s = applyEdit(s, { rotation: 2, filter: "mono" });
    s = resetSession(s);
    expect(isDirty(s)).toBe(false);
    s = undo(s);
    expect(s.draft.rotation).toBe(2);
  });
  it("không dùng chung mảng góc với bản đã lưu", () => {
    let s = startSession(base);
    s = applyEdit(s, { quad: [[0, 0], [1, 0], [1, 1], [0, 1]] });
    expect(s.saved.quad).toEqual(base.quad);
    expect(base.quad).toEqual([[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]]);
  });
  it("Lưu trả bản nháp, mở phiên mới sạch", () => {
    const s = applyEdit(startSession(base), { brightness: 15 });
    const r = saveSession(s);
    expect(r.changed).toBe(true);
    expect(r.edit.brightness).toBe(15);
    expect(isDirty(r.session)).toBe(false);
    expect(canUndo(r.session)).toBe(false);
  });
  it("giới hạn lịch sử", () => {
    let s = startSession(base);
    for (let i = 1; i <= MAX_HISTORY + 20; i++) s = applyEdit(s, { brightness: i % 160 - 80 + (i > 80 ? 1 : 0) });
    expect(s.past.length).toBeLessThanOrEqual(MAX_HISTORY);
  });
});

describe("S13 vùng cắt an toàn", () => {
  const quad = base.quad;
  it("hộp nằm trong khung thì an toàn", () => expect(cropSafety(quad, [{ x: 0.2, y: 0.2, w: 0.5, h: 0.5, kind: "text" }]).safe).toBe(true));
  it("hộp lấn ra ngoài khung bị báo cắt, kèm loại và tỉ lệ nằm trong", () => {
    const r = cropSafety(quad, [{ x: 0.2, y: 0.2, w: 0.3, h: 0.2 }, { x: 0.7, y: 0.5, w: 0.3, h: 0.2, kind: "sign" }]);
    expect(r.safe).toBe(false);
    expect(r.cut.length).toBe(1);
    expect(r.cut[0]!.index).toBe(1);
    expect(r.cut[0]!.kind).toBe("sign");
    expect(r.cut[0]!.inside).toBeGreaterThan(0);
    expect(r.cut[0]!.inside).toBeLessThan(1);
  });
  it("không phụ thuộc chiều thứ tự bốn góc", () => {
    const rev = [...quad!].reverse();
    expect(cropSafety(rev, [{ x: 0.2, y: 0.2, w: 0.5, h: 0.5 }]).safe).toBe(true);
    expect(cropSafety(rev, [{ x: 0.0, y: 0.0, w: 0.5, h: 0.5 }]).safe).toBe(false);
  });
  it("không có khung thì giữ cả ảnh (an toàn)", () => expect(cropSafety(undefined, [{ x: 0, y: 0, w: 1, h: 1 }]).safe).toBe(true));
  it("dung sai mép", () => expect(cropSafety(quad, [{ x: 0.098, y: 0.2, w: 0.3, h: 0.3 }], 0.005).safe).toBe(true));
  it("khung nghiêng cắt hộp ở góc", () => {
    const tilt = [[0.2, 0.1], [0.9, 0.2], [0.8, 0.9], [0.1, 0.8]] as [number, number][];
    expect(cropSafety(tilt, [{ x: 0.1, y: 0.1, w: 0.2, h: 0.1 }]).safe).toBe(false);
  });
});

describe("S13c cắt ngang mép", () => {
  const quad = base.quad;
  it("chữ hẳn ngoài khung (trang kế, bàn) không bị tính là mất", () => {
    expect(edgeCutCheck(quad, [{ x: 0.95, y: 0.3, w: 0.04, h: 0.02, kind: "text" }]).safe).toBe(true);
  });
  it("chữ vắt ngang mép bị báo, chữ trong và ngoài thì không", () => {
    const r = edgeCutCheck(quad, [{ x: 0.3, y: 0.3, w: 0.1, h: 0.02 }, { x: 0.86, y: 0.3, w: 0.08, h: 0.02, kind: "text" }, { x: 0.95, y: 0.3, w: 0.04, h: 0.02 }]);
    expect(r.safe).toBe(false);
    expect(r.cut.length).toBe(1);
    expect(r.cut[0]!.index).toBe(1);
  });
  it("không có khung thì an toàn", () => expect(edgeCutCheck(undefined, [{ x: 0, y: 0, w: 1, h: 1 }]).safe).toBe(true));
});

describe("S13 ảnh xuất khớp xem trước", () => {
  it("cùng tỉ lệ trong sai số", () => {
    expect(sameAspect({ w: 1200, h: 1697 }, { w: 2480, h: 3508 })).toBe(true);
    expect(sameAspect({ w: 1200, h: 1697 }, { w: 3508, h: 2480 })).toBe(false);
    expect(sameAspect({ w: 0, h: 1 }, { w: 1, h: 1 })).toBe(false);
  });
});

describe("S13b rà soát lần 2 – lỗi tìm được khi đọc mã", () => {
  const chuaCat: PageEdit = { rotation: 0, filter: "auto", brightness: 0, contrast: 0 };
  const khung: [number, number][] = [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]];
  it("Đặt lại bỏ cả khung lẫn khổ giấy thêm sau khi mở phiên (trang chưa từng cắt)", () => {
    let s = startSession(chuaCat);
    s = applyEdit(s, { quad: khung, paper: "a4" });
    expect(isDirty(s)).toBe(true);
    s = resetSession(s);
    expect(isDirty(s)).toBe(false);
    expect(s.draft.quad).toBeUndefined();
    expect(s.draft.paper).toBeUndefined();
    expect(saveSession(s).changed).toBe(false);
  });
  it("Đặt lại rồi Hoàn tác trả lại đúng khung và khổ giấy vừa chọn", () => {
    let s = applyEdit(startSession(chuaCat), { quad: khung, paper: "a4" });
    s = undo(resetSession(s));
    expect(s.draft.quad).toEqual(khung);
    expect(s.draft.paper).toBe("a4");
  });
  it("trang đã cắt sẵn: Đặt lại trả về đúng khung và khổ giấy đã lưu", () => {
    const daCat: PageEdit = { ...chuaCat, quad: khung, paper: "id" };
    let s = applyEdit(startSession(daCat), { quad: [[0, 0], [1, 0], [1, 1], [0, 1]], paper: "free" });
    s = resetSession(s);
    expect(isDirty(s)).toBe(false);
    expect(s.draft.paper).toBe("id");
    expect(s.draft.quad).toEqual(khung);
  });
  it("xoay đủ một vòng không tính là thay đổi (app cộng dồn xoay: 360 ≡ 0)", () => {
    let s = startSession({ ...chuaCat, rotation: 360 });
    for (let i = 0; i < 4; i++) s = applyEdit(s, { rotation: (s.draft.rotation + 90) % 360 });
    expect(s.draft.rotation).toBe(0);
    expect(isDirty(s)).toBe(false);
    expect(saveSession(s).changed).toBe(false);
  });
  it("so sánh góc xoay theo vòng: âm và lớn hơn 360 vẫn đúng", () => {
    const r = (rotation: number): PageEdit => ({ ...chuaCat, rotation });
    expect(editsEqual(r(-90), r(270))).toBe(true);
    expect(editsEqual(r(450), r(90))).toBe(true);
    expect(editsEqual(r(90), r(180))).toBe(false);
    expect(editsEqual(r(0), r(360))).toBe(true);
  });
  it("xoay khác góc vẫn được tính là thay đổi và Lưu báo changed", () => {
    const s = applyEdit(startSession({ ...chuaCat, rotation: 360 }), { rotation: 90 });
    expect(isDirty(s)).toBe(true);
    expect(saveSession(s).changed).toBe(true);
  });
});
