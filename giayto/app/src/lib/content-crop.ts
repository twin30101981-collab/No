// B8 — Cắt theo nội dung, đặt vừa A4 giữ tỉ lệ, mã hoá PNG 1-bit cho chế độ Đen trắng.
// Hàm thuần, không phụ thuộc DOM (chạy được trong Worker và kiểm thử).
import { zlibSync } from "fflate";

export type Box = { x: number; y: number; w: number; h: number };

/**
 * Tìm hộp nội dung (chữ/bảng/chữ ký) trên ảnh độ sáng.
 * - Điểm "mực": tối hơn nền giấy (trung vị) ≥ 25%.
 * - Hàng/cột "dải nền xám": > 55% điểm tối → coi là viền/dải sót ở mép, không phải nội dung.
 * - Bỏ hàng/cột lẻ tẻ (< minInk) để hạt nhiễu không kéo rộng hộp.
 * Trả về hộp có lề đều `padFrac` cạnh ngắn; không tìm thấy nội dung → cả ảnh.
 */
export function contentBox(lum: Uint8Array, W: number, H: number, padFrac = 0.04): Box {
  const hist = new Uint32Array(256);
  for (let i = 0; i < lum.length; i += 7) hist[lum[i]]++;
  let tot = 0; for (const v of hist) tot += v;
  let acc = 0, paper = 255;
  for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc >= tot * 0.3) { paper = v; break; } }
  const thr = paper * 0.55; // mực đậm (chữ/nét), không tính vùng xám nhạt
  const rows = new Uint32Array(H), cols = new Uint32Array(W);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (lum[y * W + x] < thr) { rows[y]++; cols[x]++; }
  // Dải xám ở mép: tính từ mép vào trong, dừng ở hàng/cột đầu tiên không phải dải.
  const band = (a: Uint32Array, n: number, len: number) => {
    let s = 0; while (s < n && a[s] > len * 0.55) s++;
    let e = n - 1; while (e > s && a[e] > len * 0.55) e--;
    return [s, e] as const;
  };
  const [ys, ye] = band(rows, H, W), [xs, xe] = band(cols, W, H);
  // Đếm lại trong vùng đã bỏ dải.
  const r2 = new Uint32Array(H), c2 = new Uint32Array(W);
  for (let y = ys; y <= ye; y++) for (let x = xs; x <= xe; x++) if (lum[y * W + x] < thr) { r2[y]++; c2[x]++; }
  const minR = Math.max(2, (xe - xs + 1) * 0.003), minC = Math.max(2, (ye - ys + 1) * 0.003);
  // Mở rộng từ khối mực dày nhất ra hai phía, dừng khi gặp khoảng trống > 3 % — bỏ vạch mép giấy, vệt bóng rời khỏi nội dung.
  const grow = (a: Uint32Array, s0: number, e0: number, min: number) => {
    const gap = Math.max(4, Math.round((e0 - s0 + 1) * 0.03));
    let best = -1, bv = -1, run = 0;
    for (let i = s0; i <= e0; i++) { run = a[i] >= min ? run + a[i] : 0; if (run > bv) { bv = run; best = i; } }
    if (best < 0 || a[best] < min) return [e0 + 1, e0] as const;
    let lo = best, hi = best, miss = 0;
    for (let i = best - 1; i >= s0; i--) { if (a[i] >= min) { lo = i; miss = 0; } else if (++miss > gap) break; }
    miss = 0;
    for (let i = best + 1; i <= e0; i++) { if (a[i] >= min) { hi = i; miss = 0; } else if (++miss > gap) break; }
    return [lo, hi] as const;
  };
  const [y0, y1] = grow(r2, ys, ye, minR), [x0, x1] = grow(c2, xs, xe, minC);
  if (y0 > ye || x0 > xe) return { x: xs, y: ys, w: xe - xs + 1, h: ye - ys + 1 };
  const pad = Math.round(Math.min(W, H) * padFrac);
  const bx0 = Math.max(xs, x0 - pad), by0 = Math.max(ys, y0 - pad);
  const bx1 = Math.min(xe, x1 + pad), by1 = Math.min(ye, y1 + pad);
  return { x: bx0, y: by0, w: bx1 - bx0 + 1, h: by1 - by0 + 1 };
}

/** Đặt ảnh w×h vừa khung PW×PH (đơn vị bất kỳ) giữ đúng tỉ lệ, canh giữa. */
export function fitPage(w: number, h: number, PW: number, PH: number) {
  const r = Math.min(PW / w, PH / h);
  const fw = w * r, fh = h * r;
  return { x: (PW - fw) / 2, y: (PH - fh) / 2, w: fw, h: fh, r };
}

const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b: Uint8Array) { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type: string, data: Uint8Array) {
  const out = new Uint8Array(12 + data.length), dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}
function png(W: number, H: number, depth: 1 | 8, color: 0 | 2, raw: Uint8Array) {
  const ihdr = new Uint8Array(13), dv = new DataView(ihdr.buffer);
  dv.setUint32(0, W); dv.setUint32(4, H); ihdr[8] = depth; ihdr[9] = color;
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlibSync(raw, { level: 9 })), chunk("IEND", new Uint8Array())];
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

/** PNG 1-bit xám (0 = đen, 1 = trắng) từ ảnh nhị phân: điểm < 128 là mực. */
export function encodePng1bit(bin: Uint8Array, W: number, H: number) {
  const stride = Math.ceil(W / 8), raw = new Uint8Array((stride + 1) * H);
  for (let y = 0; y < H; y++) {
    const o = y * (stride + 1) + 1;
    for (let x = 0; x < W; x++) if (bin[y * W + x] >= 128) raw[o + (x >> 3)] |= 0x80 >> (x & 7);
  }
  return png(W, H, 1, 0, raw);
}

/** PNG RGB 8-bit (để so dung lượng với cách cũ). */
export function encodePngRgb(bin: Uint8Array, W: number, H: number) {
  const raw = new Uint8Array((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) { const o = y * (W * 3 + 1) + 1; for (let x = 0; x < W; x++) { const v = bin[y * W + x]; raw[o + x * 3] = raw[o + x * 3 + 1] = raw[o + x * 3 + 2] = v; } }
  return png(W, H, 8, 2, raw);
}

export function bytesToDataUrl(b: Uint8Array, mime = "image/png") {
  let s = ""; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return `data:${mime};base64,${btoa(s)}`;
}
