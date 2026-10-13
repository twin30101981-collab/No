/** P4.3–P4.6 – Công cụ chỉnh 3 mức (thuần điểm ảnh): Làm rõ chữ, Sáng nền, Xoá góc ố đen.
 *  Mức 0 = tắt, 1 = nhẹ, 2 = vừa, 3 = mạnh. Chạy sau bộ lọc, trước độ sáng/tương phản. */
import { denoise } from "./denoise";

type Px = Uint8ClampedArray;

export type ToolLevel = 0 | 1 | 2 | 3;
export type ToolKey = "clarify" | "whiten" | "corners" | "deshadow" | "denoise";
export type Tools = Partial<Record<ToolKey, ToolLevel>>;

export const TOOL_LABEL: Record<ToolKey, string> = { clarify: "Làm rõ chữ", whiten: "Sáng nền", corners: "Xoá góc ố đen", deshadow: "Khử bóng", denoise: "Khử nhiễu" };
export const LEVEL_LABEL = ["Tắt", "Nhẹ", "Vừa", "Mạnh"] as const;
export const TOOL_KEYS: ToolKey[] = ["clarify", "whiten", "corners", "deshadow", "denoise"];

/** Tham số theo mức — tăng dần đơn điệu. */
export const CLARIFY_AMOUNT = [0, 0.6, 1.1, 1.8] as const; // độ làm nét độ chói
export const CLARIFY_INK = [0, 0.08, 0.16, 0.26] as const; // mức đậm thêm cho nét chữ tối
export const WHITEN_TARGET = [0, 0.94, 0.88, 0.8] as const; // phân vị nền: điểm sáng hơn mức này → trắng
export const CORNER_STRENGTH = [0, 0.5, 0.8, 1] as const; // phần bù tối mép/góc
/** R6.1 – Khử bóng: phần bù nền cục bộ (chia cho nền ước lượng theo ô). */
export const DESHADOW_STRENGTH = [0, 0.55, 0.8, 1] as const;
/** R6.1 – Khử nhiễu: độ mạnh lọc song phương (denoise.ts). */
export const DENOISE_STRENGTH = [0, 0.6, 1, 1.6] as const;

export function clampLevel(v: unknown): ToolLevel {
  const n = Math.round(Number(v));
  return (n >= 3 ? 3 : n <= 0 || !Number.isFinite(n) ? 0 : n) as ToolLevel;
}
export function hasTools(t: Tools | undefined): boolean {
  return !!t && TOOL_KEYS.some((k) => clampLevel(t[k]) > 0);
}
/** Chuỗi khoá ổn định cho bộ đệm/so sánh. */
export function toolsKey(t: Tools | undefined): string {
  return TOOL_KEYS.map((k) => clampLevel(t?.[k])).join("");
}

const luma = (d: Px, i: number) => d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;

/** Phân vị độ chói (lấy mẫu thưa). */
function lumaPercentile(d: Px, p: number): number {
  const hist = new Uint32Array(256); let n = 0;
  const step = d.length > 4_000_000 ? 32 : 4;
  for (let i = 0; i < d.length; i += step) { hist[luma(d, i) | 0]++; n++; }
  const want = n * p; let acc = 0;
  for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= want) return v; }
  return 255;
}

/** Sáng nền: kéo điểm nền (phân vị cao) về trắng, giữ chữ tối. */
export function whitenPixels(d: Px, level: ToolLevel): Px {
  if (!level) return d;
  const paper = Math.max(120, lumaPercentile(d, WHITEN_TARGET[level]));
  const gain = 255 / paper;
  for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) d[i + k] = Math.min(255, d[i + k] * gain);
  return d;
}

/** Làm rõ chữ: làm nét độ chói bằng mờ hộp 3×3 + đậm thêm nét tối. */
export function clarifyPixels(d: Px, W: number, H: number, level: ToolLevel): Px {
  if (!level || W < 3 || H < 3) return d;
  const amt = CLARIFY_AMOUNT[level], ink = CLARIFY_INK[level];
  const Y = new Float32Array(W * H);
  for (let p = 0, i = 0; p < Y.length; p++, i += 4) Y[p] = luma(d, i);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let s = 0, c = 0;
    for (let dy = -1; dy <= 1; dy++) { const yy = y + dy; if (yy < 0 || yy >= H) continue;
      for (let dx = -1; dx <= 1; dx++) { const xx = x + dx; if (xx < 0 || xx >= W) continue; s += Y[yy * W + xx]; c++; } }
    const p = y * W + x, i = p * 4, y0 = Y[p];
    let ny = y0 + (y0 - s / c) * amt;
    if (ny < 160) ny -= (160 - ny) * ink;
    const delta = ny - y0;
    for (let k = 0; k < 3; k++) d[i + k] = Math.min(255, Math.max(0, d[i + k] + delta));
  }
  return d;
}

/** Xoá góc ố đen: đo nền theo vòng khoảng cách tới tâm, nâng các vòng ngoài tối hơn tâm. */
export function cornersPixels(d: Px, W: number, H: number, level: ToolLevel): Px {
  if (!level || W < 4 || H < 4) return d;
  const RINGS = 16, cx = (W - 1) / 2, cy = (H - 1) / 2, rmax = Math.hypot(cx, cy) || 1;
  const ringOf = (x: number, y: number) => Math.min(RINGS - 1, Math.floor((Math.hypot(x - cx, y - cy) / rmax) * RINGS));
  const hists = Array.from({ length: RINGS }, () => new Uint32Array(256));
  const step = Math.max(1, Math.round(Math.sqrt((W * H) / 250_000)));
  for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) hists[ringOf(x, y)][luma(d, (y * W + x) * 4) | 0]++;
  // nền mỗi vòng = phân vị 80% (bỏ qua chữ)
  const bg = hists.map((h) => { let n = 0; for (const v of h) n += v; if (!n) return -1; let acc = 0; for (let v = 0; v < 256; v++) { acc += h[v]; if (acc >= n * 0.8) return v; } return 255; });
  const center = Math.max(1, ...bg.slice(0, 4).filter((v) => v > 0));
  const s = CORNER_STRENGTH[level];
  const gain = bg.map((v) => (v <= 0 ? 1 : 1 + Math.max(0, center / Math.max(20, v) - 1) * s));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    // nội suy mượt giữa các vòng
    const t = (Math.hypot(x - cx, y - cy) / rmax) * RINGS - 0.5;
    const a = Math.max(0, Math.min(RINGS - 1, Math.floor(t))), b = Math.min(RINGS - 1, a + 1), f = Math.max(0, Math.min(1, t - a));
    const g = gain[a] * (1 - f) + gain[b] * f; if (g <= 1.001) continue;
    const i = (y * W + x) * 4;
    for (let k = 0; k < 3; k++) d[i + k] = Math.min(255, d[i + k] * g);
  }
  return d;
}

/** R6.1 – Khử bóng: ước lượng nền theo lưới ô (phân vị 90%), nội suy song tuyến, chia nền về trắng.
 *  Bóng tay/điện thoại đổ lên giấy là biến thiên nền tần số thấp → san phẳng mà giữ nét chữ. */
export function deshadowPixels(d: Px, W: number, H: number, level: ToolLevel): Px {
  if (!level || W < 8 || H < 8) return d;
  const G = 16, cw = W / G, ch = H / G, s = DESHADOW_STRENGTH[level];
  const bg = new Float32Array(G * G);
  const step = Math.max(1, Math.round(Math.sqrt((W * H) / 400_000)));
  for (let gy = 0; gy < G; gy++) for (let gx = 0; gx < G; gx++) {
    const h = new Uint32Array(256); let n = 0;
    const x0 = Math.floor(gx * cw), x1 = Math.max(x0 + 1, Math.floor((gx + 1) * cw));
    const y0 = Math.floor(gy * ch), y1 = Math.max(y0 + 1, Math.floor((gy + 1) * ch));
    for (let y = y0; y < y1; y += step) for (let x = x0; x < x1; x += step) { h[luma(d, (y * W + x) * 4) | 0]++; n++; }
    let acc = 0, v = 255; for (let k = 0; k < 256; k++) { acc += h[k]; if (acc >= n * 0.9) { v = k; break; } }
    bg[gy * G + gx] = Math.max(24, v);
  }
  let ref = 0; for (const v of bg) ref = Math.max(ref, v);
  for (let y = 0; y < H; y++) {
    const fy = Math.max(0, Math.min(G - 1, y / ch - 0.5)), ay = Math.floor(fy), by = Math.min(G - 1, ay + 1), ty = fy - ay;
    for (let x = 0; x < W; x++) {
      const fx = Math.max(0, Math.min(G - 1, x / cw - 0.5)), ax = Math.floor(fx), bx = Math.min(G - 1, ax + 1), tx = fx - ax;
      const b = (bg[ay * G + ax] * (1 - tx) + bg[ay * G + bx] * tx) * (1 - ty) + (bg[by * G + ax] * (1 - tx) + bg[by * G + bx] * tx) * ty;
      const g = 1 + (ref / b - 1) * s; if (g <= 1.001) continue;
      const i = (y * W + x) * 4;
      for (let k = 0; k < 3; k++) d[i + k] = Math.min(255, d[i + k] * g);
    }
  }
  return d;
}

/** R6.1 – Khử nhiễu 3 cấp (song phương giữ cạnh chữ). */
export function denoisePixels(d: Px, W: number, H: number, level: ToolLevel): Px {
  if (!level || W < 3 || H < 3) return d;
  d.set(denoise(d, W, H, DENOISE_STRENGTH[level]));
  return d;
}

/** Chạy công cụ theo thứ tự cố định: nhiễu → bóng → góc → nền → chữ. */
export function applyTools(d: Px, W: number, H: number, t: Tools | undefined): Px {
  if (!hasTools(t)) return d;
  denoisePixels(d, W, H, clampLevel(t!.denoise));
  deshadowPixels(d, W, H, clampLevel(t!.deshadow));
  cornersPixels(d, W, H, clampLevel(t!.corners));
  whitenPixels(d, clampLevel(t!.whiten));
  clarifyPixels(d, W, H, clampLevel(t!.clarify));
  return d;
}
