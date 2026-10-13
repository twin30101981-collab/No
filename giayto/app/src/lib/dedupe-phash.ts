/**
 * R4.1: Chống ảnh trùng bằng dấu vân ảnh (pHash) + phân loại ảnh nhập.
 *
 * pHash: giảm mẫu ảnh về 32×32 xám, DCT 2 chiều, lấy khối tần số thấp 8×8
 * (bỏ hệ số DC), so với trung vị → dấu vân 64 bit (16 ký tự hex).
 * Hai ảnh trùng/gần trùng có khoảng cách Hamming nhỏ (≤ 6/64 bit).
 *
 * Phân loại ảnh nhập:
 * - "flat": ảnh đã phẳng (scan, ảnh đã cắt) — giấy tràn khung, viền đều;
 *   ảnh này không nên bị cắt lại.
 * - "screenshot": chụp màn hình — vùng màu đồng nhất lớn, cạnh sắc tuyệt đối,
 *   bảng màu ít, không nhiễu.
 * - "photo": ảnh chụp có nền — cần dò khung cắt như thường.
 */

export type ImportKind = "flat" | "screenshot" | "photo";

const SAMPLE = 32;
const BLOCK = 8;

/** Giảm mẫu RGBA về lưới xám size×size (trung bình khối). */
function grayGrid(data: Uint8ClampedArray, w: number, h: number, size: number): Float64Array {
  const out = new Float64Array(size * size);
  for (let gy = 0; gy < size; gy++) {
    const y0 = Math.floor((gy * h) / size), y1 = Math.max(y0 + 1, Math.floor(((gy + 1) * h) / size));
    for (let gx = 0; gx < size; gx++) {
      const x0 = Math.floor((gx * w) / size), x1 = Math.max(x0 + 1, Math.floor(((gx + 1) * w) / size));
      let sum = 0, n = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const i = (y * w + x) * 4;
        sum += 0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!;
        n++;
      }
      out[gy * size + gx] = sum / n;
    }
  }
  return out;
}

/** DCT-II 2 chiều trên lưới 32×32, trả khối tần số thấp 8×8. */
function dctLow(gray: Float64Array): Float64Array {
  const out = new Float64Array(BLOCK * BLOCK);
  for (let u = 0; u < BLOCK; u++) {
    const cu = u === 0 ? Math.SQRT1_2 : 1;
    for (let v = 0; v < BLOCK; v++) {
      const cv = v === 0 ? Math.SQRT1_2 : 1;
      let sum = 0;
      for (let y = 0; y < SAMPLE; y++) {
        const cy = Math.cos(((2 * y + 1) * u * Math.PI) / (2 * SAMPLE));
        for (let x = 0; x < SAMPLE; x++) {
          sum += gray[y * SAMPLE + x]! * cy * Math.cos(((2 * x + 1) * v * Math.PI) / (2 * SAMPLE));
        }
      }
      out[u * BLOCK + v] = 0.25 * cu * cv * sum;
    }
  }
  return out;
}

/** Dấu vân ảnh 64 bit dưới dạng 16 ký tự hex. Thuần hàm, kiểm thử được. */
export function phashFromRgba(data: Uint8ClampedArray, width: number, height: number): string {
  const low = dctLow(grayGrid(data, width, height, SAMPLE));
  // Bỏ hệ số DC (0,0); trung vị của 63 hệ số còn lại.
  const rest = Array.from(low.slice(1)).sort((a, b) => a - b);
  const median = rest[Math.floor(rest.length / 2)]!;
  let hi = 0n, lo = 0n;
  for (let i = 0; i < 64; i++) {
    if (low[i]! > median) {
      if (i < 32) hi |= 1n << BigInt(31 - i);
      else lo |= 1n << BigInt(63 - i);
    }
  }
  return hi.toString(16).padStart(8, "0") + lo.toString(16).padStart(8, "0");
}

/** Khoảng cách Hamming giữa hai dấu vân hex 64 bit. */
export function hammingHex(a: string, b: string): number {
  let dist = 0;
  for (let i = 0; i < 16; i += 8) {
    let x = parseInt(a.slice(i, i + 8), 16) ^ parseInt(b.slice(i, i + 8), 16);
    while (x) { x &= x - 1; dist++; }
  }
  return dist;
}

/** Hai dấu vân có coi là trùng không (mặc định ≤ 6/64 bit khác). */
export function isDuplicateHash(a: string, b: string, maxDist = 8): boolean {
  return a.length === 16 && b.length === 16 && hammingHex(a, b) <= maxDist;
}

/** Tìm dấu vân trùng trong danh sách đã có; trả chỉ số phần tử trùng đầu tiên. */
export function findDuplicate(hash: string, existing: (string | undefined)[], maxDist = 6): number {
  for (let i = 0; i < existing.length; i++) {
    const h = existing[i];
    if (h && isDuplicateHash(hash, h, maxDist)) return i;
  }
  return -1;
}

/**
 * Phân loại ảnh nhập. Thuần hàm trên dữ liệu RGBA (nên giảm mẫu ≤ 256 px
 * trước khi gọi để nhanh).
 */
export function classifyImportImage(data: Uint8ClampedArray, w: number, h: number): ImportKind {
  const px = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    return [data[i]!, data[i + 1]!, data[i + 2]!] as const;
  };
  const lum = (x: number, y: number) => {
    const [r, g, b] = px(x, y);
    return 0.299 * r + 0.587 * g + 0.114 * b;
  };

  // --- Vành viền ngoài cùng (3% kích thước): giấy tràn khung có vành sáng đều ---
  const band = Math.max(2, Math.round(Math.min(w, h) * 0.03));
  let borderSum = 0, borderN = 0, borderSat = 0, borderDark = 0;
  const sampleBorder = (x: number, y: number) => {
    const [r, g, b] = px(x, y);
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    borderSum += l; borderN++;
    if (l < 120) borderDark++;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx > 0) borderSat += (mx - mn) / mx;
  };
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
    if (x < band || x >= w - band || y < band || y >= h - band) sampleBorder(x, y);
  }
  const borderMean = borderSum / borderN;
  const borderDarkRatio = borderDark / borderN;
  const borderSatMean = borderSat / borderN;

  // --- Thống kê toàn ảnh: độ bão hoà, bảng màu lượng tử, hàng đồng nhất ---
  let satSum = 0, satN = 0;
  const colors = new Set<number>();
  let uniformRows = 0;
  for (let y = 0; y < h; y += 4) {
    let rowUniform = true;
    let prev = -1;
    for (let x = 0; x < w; x += 4) {
      const [r, g, b] = px(x, y);
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      if (mx > 0) { satSum += (mx - mn) / mx; satN++; }
      const q = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
      colors.add(q);
      if (prev >= 0 && Math.abs(q - prev) > 0x11) rowUniform = false;
      prev = q;
    }
    if (rowUniform) uniformRows++;
  }
  const satMean = satN ? satSum / satN : 0;
  const sampled = Math.ceil(h / 4) * Math.ceil(w / 4);
  const colorRichness = colors.size / Math.max(1, sampled);
  const uniformRowRatio = uniformRows / Math.ceil(h / 4);

  // --- Độ sắc cạnh ngang (ảnh chụp màn hình có cạnh "cứng" pixel-perfect) ---
  let hardEdges = 0, edgeN = 0;
  for (let y = Math.floor(h * 0.2); y < h * 0.8; y += 3) {
    for (let x = 1; x < w - 1; x += 3) {
      const d = Math.abs(lum(x + 1, y) - lum(x - 1, y));
      if (d > 4) { edgeN++; if (d > 90) hardEdges++; }
    }
  }
  const hardEdgeRatio = edgeN ? hardEdges / edgeN : 0;

  // Ảnh đã phẳng: vành viền sáng, gần như không có điểm tối, ít màu —
  // giấy tràn tới mép khung. (Kiểm tra trước screenshot: trang scan cũng có
  // nhiều hàng trắng đồng nhất.)
  if (borderMean > 150 && borderDarkRatio < 0.15 && borderSatMean < 0.25) return "flat";
  // Chụp màn hình: nhiều hàng đồng nhất hoặc bảng màu rất ít + cạnh cứng.
  if (uniformRowRatio > 0.35 || (colorRichness < 0.02 && hardEdgeRatio > 0.5)) return "screenshot";
  return "photo";
}

// ---------- Phần phụ thuộc trình duyệt (giải mã ảnh) ----------

const ANALYZE_SIZE = 96;

/** Giải mã nguồn ảnh (data URL / blob URL) về RGBA nhỏ để phân tích. SSR trả null. */
export async function analyzeImageSource(src: string): Promise<{ data: Uint8ClampedArray; w: number; h: number } | null> {
  if (typeof document === "undefined") return null;
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    const bmp = await createImageBitmap(blob);
    const scale = Math.min(1, ANALYZE_SIZE / Math.max(bmp.width, bmp.height));
    const w = Math.max(8, Math.round(bmp.width * scale));
    const h = Math.max(8, Math.round(bmp.height * scale));
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) { bmp.close(); return null; }
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const img = ctx.getImageData(0, 0, w, h);
    return { data: img.data, w, h };
  } catch {
    return null;
  }
}

/** Dấu vân + loại ảnh cho một nguồn ảnh; null khi không giải mã được. */
export async function fingerprintImageSource(src: string): Promise<{ phash: string; kind: ImportKind } | null> {
  const a = await analyzeImageSource(src);
  if (!a) return null;
  return { phash: phashFromRgba(a.data, a.w, a.h), kind: classifyImportImage(a.data, a.w, a.h) };
}
