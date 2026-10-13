/** S13 – Phiên chỉnh tay trước khi lưu (thuần): bản nháp tách khỏi trang đã lưu, hoàn tác/làm lại, đặt lại, hủy, lưu; kiểm vùng cắt an toàn. */
import type { PageEdit, Quad } from "./db";
import { toolsKey } from "./tool-levels";

export type EditSession = { saved: PageEdit; draft: PageEdit; past: PageEdit[]; future: PageEdit[] };
export const MAX_HISTORY = 50;

// Khoá `quad` và `paper` luôn có mặt (kể cả undefined): nếu bản đã lưu không có `paper` thì `{ ...nháp, ...đã lưu }` mới ghi đè được paper thêm vào sau (lỗi S13b: Đặt lại để sót paper).
const clone = (e: PageEdit): PageEdit => ({ ...e, tools: e.tools ? { ...e.tools } : undefined, quad: e.quad ? (e.quad.map((p) => [p[0], p[1]]) as Quad) : undefined, paper: e.paper });

/** Góc xoay theo vòng 0..359: app cộng dồn +90 (360, 450…) và image.ts chuẩn hoá khi dựng, nên so sánh cũng phải chuẩn hoá. */
const turn = (r: number): number => ((r % 360) + 360) % 360;

export function editsEqual(a: PageEdit, b: PageEdit): boolean {
  if (turn(a.rotation) !== turn(b.rotation) || a.filter !== b.filter || a.brightness !== b.brightness || a.contrast !== b.contrast) return false;
  if ((a.flatten ?? null) !== (b.flatten ?? null) || toolsKey(a.tools) !== toolsKey(b.tools)) return false;
  if (JSON.stringify(a.quad ?? null) !== JSON.stringify(b.quad ?? null)) return false;
  return JSON.stringify(a.paper ?? null) === JSON.stringify(b.paper ?? null);
}

/** Mở phiên: `saved` không bao giờ bị sửa tại chỗ; mọi thao tác chỉ đổi `draft`. */
export function startSession(saved: PageEdit): EditSession {
  return { saved: clone(saved), draft: clone(saved), past: [], future: [] };
}

export const isDirty = (s: EditSession) => !editsEqual(s.draft, s.saved);
export const canUndo = (s: EditSession) => s.past.length > 0;
export const canRedo = (s: EditSession) => s.future.length > 0;

/** Áp một thay đổi lên bản nháp. Thay đổi không làm đổi gì thì không thêm bước hoàn tác. */
export function applyEdit(s: EditSession, patch: Partial<PageEdit>): EditSession {
  const next = clone({ ...s.draft, ...patch } as PageEdit);
  if (editsEqual(next, s.draft)) return s;
  return { ...s, draft: next, past: [...s.past, s.draft].slice(-MAX_HISTORY), future: [] };
}

export function undo(s: EditSession): EditSession {
  const prev = s.past[s.past.length - 1];
  if (!prev) return s;
  return { ...s, draft: prev, past: s.past.slice(0, -1), future: [s.draft, ...s.future] };
}

export function redo(s: EditSession): EditSession {
  const nxt = s.future[0];
  if (!nxt) return s;
  return { ...s, draft: nxt, past: [...s.past, s.draft].slice(-MAX_HISTORY), future: s.future.slice(1) };
}

/** Đặt lại về bản đã lưu; bản thân việc đặt lại cũng hoàn tác được. */
export function resetSession(s: EditSession): EditSession {
  return applyEdit(s, s.saved);
}

/** Hủy: trả đúng bản đã lưu, không ghi gì. Rời màn hình mà không Lưu cũng coi như Hủy. */
export function cancelSession(s: EditSession): PageEdit {
  return clone(s.saved);
}

/** Lưu: chỉ báo `changed` khi bản nháp khác bản đã lưu; nơi gọi chỉ dựng lại/ghi trang khi `changed`. */
export function saveSession(s: EditSession): { edit: PageEdit; changed: boolean; session: EditSession } {
  const edit = clone(s.draft);
  return { edit, changed: isDirty(s), session: startSession(edit) };
}

// ---- Vùng cắt an toàn ----
export type ContentKind = "text" | "sign" | "table";
/** Hộp nội dung theo toạ độ chuẩn hoá 0..1 của ảnh gốc. */
export type ContentBox = { x: number; y: number; w: number; h: number; kind?: ContentKind };
export type CropCheck = { safe: boolean; cut: { index: number; kind: ContentKind | undefined; inside: number }[] };

const area2 = (q: Quad) => q.reduce((a, p, i) => { const n = q[(i + 1) % q.length]; return a + (p[0] * n[1] - n[0] * p[1]); }, 0);

function insideQuad(q: Quad, x: number, y: number, margin: number): boolean {
  const sign = area2(q) >= 0 ? 1 : -1;
  for (let i = 0; i < q.length; i++) {
    const a = q[i], b = q[(i + 1) % q.length];
    const ex = b[0] - a[0], ey = b[1] - a[1], len = Math.hypot(ex, ey);
    if (len === 0) continue;
    if (sign * (ex * (y - a[1]) - ey * (x - a[0])) / len < -margin) return false;
  }
  return true;
}

/**
 * Kiểm vùng sẽ cắt: lấy lưới 5×5 điểm trên mỗi hộp nội dung, hộp nào có điểm nằm ngoài khung (dung sai `margin`) là bị cắt.
 * Không có khung (quad rỗng) = giữ cả ảnh = an toàn. Đây là chỉ báo cho người dùng xem trước khi Lưu, không thay việc soi mắt ở 100%.
 */
export function cropSafety(quad: Quad | undefined, boxes: ContentBox[], margin = 0.005): CropCheck {
  if (!quad || quad.length < 3) return { safe: true, cut: [] };
  const cut: CropCheck["cut"] = [];
  boxes.forEach((b, index) => {
    let inn = 0, tot = 0;
    for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) { tot++; if (insideQuad(quad, b.x + (b.w * i) / 4, b.y + (b.h * j) / 4, margin)) inn++; }
    if (inn < tot) cut.push({ index, kind: b.kind, inside: inn / tot });
  });
  return { safe: cut.length === 0, cut };
}

/**
 * Chỉ giữ hộp bị khung cắt NGANG (một phần trong, một phần ngoài). Hộp nằm hẳn ngoài khung (chữ trang kế, bàn, hình mờ máy ảnh) không phải chữ bị mất nên bỏ qua.
 * Đo trên bộ ảnh gốc: từ OCR hẳn ngoài khung 66/307, vắt ngang mép 8/307 (progress/S13/s13c).
 */
export function edgeCutCheck(quad: Quad | undefined, boxes: ContentBox[], margin = 0.005): CropCheck {
  const r = cropSafety(quad, boxes, margin);
  const cut = r.cut.filter((c) => c.inside > 0);
  return { safe: cut.length === 0, cut };
}

/** Ảnh xuất phải cùng tỉ lệ với bản xem trước (sai số tương đối `tol`). */
export function sameAspect(a: { w: number; h: number }, b: { w: number; h: number }, tol = 0.01): boolean {
  if (!(a.w > 0 && a.h > 0 && b.w > 0 && b.h > 0)) return false;
  return Math.abs(a.w / a.h - b.w / b.h) / (a.w / a.h) <= tol;
}
