import { loadImg } from "@/lib/image";
import { canvasToPageUrl } from "@/lib/canvas-url";
import type { Doc } from "@/lib/db";

export const ID_PURPOSES = ["Hồ sơ ngân hàng", "Nộp hồ sơ xin việc", "Đăng ký dịch vụ", "Thủ tục hành chính"] as const;

const ID_RE = /cccd|căn cước|cmnd|chứng minh|hộ chiếu|thẻ id/i;

/** True when the document looks like a personal ID (CCCD/CMND/passport). */
export function isIdDoc(doc: Pick<Doc, "kind" | "name">, text = "") {
  return ID_RE.test(`${doc.kind} ${doc.name} ${text}`);
}

/** "CHỈ DÙNG CHO MỤC ĐÍCH … · dd/mm/yyyy". Empty purpose → empty string (no watermark). */
export function idWatermarkText(purpose: string, date?: Date) {
  const p = purpose.replace(/\s+/g, " ").trim().replace(/^chỉ dùng cho( mục đích)?\s*/i, "");
  if (!p) return "";
  const base = `CHỈ DÙNG CHO MỤC ĐÍCH ${p.toLocaleUpperCase("vi-VN")}`;
  if (!date) return base;
  const d = `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
  return `${base} · ${d}`;
}

/** Diagonal rows positions covering a w×h image rotated by `angle` (pure; tested). */
export function tileRows(w: number, h: number, step: number) {
  const diag = Math.ceil(Math.hypot(w, h));
  const rows: number[] = [];
  for (let y = -diag / 2; y <= diag / 2; y += step) rows.push(Math.round(y));
  return { diag, rows };
}

/** Bake a repeating diagonal watermark into the image so it cannot be cropped away. */
export async function stampIdWatermark(src: string, text: string) {
  if (!text) return src;
  const img = await loadImg(src);
  const w = img.naturalWidth, h = img.naturalHeight;
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const fs = Math.max(14, Math.round(Math.min(w, h) / 28));
  ctx.font = `bold ${fs}px sans-serif`;
  ctx.textBaseline = "middle";
  const unit = `${text}     `;
  const uw = Math.max(1, ctx.measureText(unit).width);
  const { diag, rows } = tileRows(w, h, fs * 3.2);
  ctx.save();
  ctx.translate(w / 2, h / 2); ctx.rotate(-Math.PI / 6);
  ctx.fillStyle = "rgba(200, 30, 30, 0.28)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)"; ctx.lineWidth = Math.max(1, fs / 14);
  rows.forEach((y, i) => {
    const off = (i % 2) * (uw / 2);
    for (let x = -diag / 2 - off; x < diag / 2; x += uw) { ctx.strokeText(unit, x, y); ctx.fillText(unit, x, y); }
  });
  ctx.restore();
  return canvasToPageUrl(c, "image/jpeg", 0.92); // R1.4: object URL thay data URL
}
