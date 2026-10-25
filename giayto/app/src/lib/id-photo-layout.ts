// G3-17: ảnh thẻ — đổi nền, cắt cỡ 3x4/4x6, xếp lên khổ in.
// Phần tính toán thuần (test được); phần vẽ dùng canvas.

export type PhotoSize = { id: "3x4" | "4x6" | "2x3" | "35x45"; label: string; wMm: number; hMm: number };
export const PHOTO_SIZES: PhotoSize[] = [
  { id: "3x4", label: "3×4 cm", wMm: 30, hMm: 40 },
  { id: "4x6", label: "4×6 cm", wMm: 40, hMm: 60 },
  { id: "2x3", label: "2×3 cm", wMm: 20, hMm: 30 },
  { id: "35x45", label: "3,5×4,5 (hộ chiếu)", wMm: 35, hMm: 45 },
];

export type Sheet = { id: "10x15" | "13x18" | "a4"; label: string; wMm: number; hMm: number };
export const SHEETS: Sheet[] = [
  { id: "10x15", label: "Ảnh 10×15", wMm: 100, hMm: 150 },
  { id: "13x18", label: "Ảnh 13×18", wMm: 130, hMm: 180 },
  { id: "a4", label: "Giấy A4", wMm: 210, hMm: 297 },
];

export const BACKGROUNDS = [
  { id: "white", label: "Trắng", color: "#ffffff" },
  { id: "blue", label: "Xanh", color: "#2f6fd6" },
  { id: "lightblue", label: "Xanh nhạt", color: "#bcd8f2" },
  { id: "gray", label: "Xám", color: "#d9d9d9" },
] as const;

export const DPI = 300;
export const mmToPx = (mm: number, dpi = DPI) => Math.round((mm / 25.4) * dpi);

export type Box = { x: number; y: number; w: number; h: number };

/** Khung người (alpha ≥ thr) trong mặt nạ; null nếu trống. */
export function personBox(a: ArrayLike<number>, w: number, h: number, thr = 128): Box | null {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (a[y * w + x] >= thr) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/**
 * Vùng cắt theo tỉ lệ ảnh thẻ: đầu chiếm khoảng 70% chiều cao khung, chừa ~10% phía trên đầu.
 * Ước lượng đầu = phần trên 45% chiều cao người (ảnh chân dung tới vai/ngực).
 * Vùng có thể vượt ra ngoài ảnh — phần đó được tô màu nền.
 */
export function cropForSize(person: Box, size: PhotoSize, zoom = 1): Box {
  const ratio = size.wMm / size.hMm;
  const head = Math.min(person.h * 0.45, person.w * 0.75);
  const h = (head / 0.55) / zoom;
  const w = h * ratio;
  const cx = person.x + person.w / 2;
  const y = person.y - h * 0.1;
  return { x: cx - w / 2, y, w, h };
}

/** Xếp lưới ảnh lên khổ in, chừa lề và khe cắt. */
export function tileLayout(sheet: Sheet, size: PhotoSize, marginMm = 4, gapMm = 2) {
  const fit = (total: number, item: number) => Math.max(0, Math.floor((total - 2 * marginMm + gapMm) / (item + gapMm)));
  const tryFit = (rot: boolean) => {
    const pw = rot ? size.hMm : size.wMm, ph = rot ? size.wMm : size.hMm;
    return { cols: fit(sheet.wMm, pw), rows: fit(sheet.hMm, ph), pw, ph, rot };
  };
  const a = tryFit(false);
  const cells: Box[] = [];
  const usedW = a.cols * a.pw + (a.cols - 1) * gapMm, usedH = a.rows * a.ph + (a.rows - 1) * gapMm;
  const ox = (sheet.wMm - usedW) / 2, oy = (sheet.hMm - usedH) / 2;
  for (let r = 0; r < a.rows; r++) for (let c = 0; c < a.cols; c++)
    cells.push({ x: ox + c * (a.pw + gapMm), y: oy + r * (a.ph + gapMm), w: a.pw, h: a.ph });
  return { cols: a.cols, rows: a.rows, count: cells.length, cells };
}

async function load(src: string) {
  const { loadImg } = await import("./image");
  return loadImg(src);
}

/** Ảnh người nền trong suốt → ảnh thẻ đúng cỡ (300 dpi) trên nền màu. */
export async function renderIdPhoto(cutoutPng: string, size: PhotoSize, bg: string, zoom = 1, offsetY = 0): Promise<string> {
  const img = await load(cutoutPng);
  const sw = img.naturalWidth, sh = img.naturalHeight;
  const tmp = document.createElement("canvas"); tmp.width = sw; tmp.height = sh;
  const tctx = tmp.getContext("2d")!; tctx.drawImage(img, 0, 0);
  const d = tctx.getImageData(0, 0, sw, sh).data;
  const alpha = new Uint8ClampedArray(sw * sh);
  for (let i = 0; i < alpha.length; i++) alpha[i] = d[i * 4 + 3];
  const box = personBox(alpha, sw, sh) ?? { x: 0, y: 0, w: sw, h: sh };
  const crop = cropForSize(box, size, zoom);
  crop.y += offsetY * crop.h;
  const W = mmToPx(size.wMm), H = mmToPx(size.hMm);
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.imageSmoothingQuality = "high";
  const k = W / crop.w;
  ctx.drawImage(img, -crop.x * k, -crop.y * k, sw * k, sh * k);
  return c.toDataURL("image/jpeg", 0.95);
}

/** Xếp nhiều bản ảnh thẻ lên khổ in, có đường cắt mảnh. */
export async function renderSheet(photo: string, sheet: Sheet, size: PhotoSize): Promise<{ jpeg: string; count: number }> {
  const img = await load(photo);
  const lay = tileLayout(sheet, size);
  const c = document.createElement("canvas"); c.width = mmToPx(sheet.wMm); c.height = mmToPx(sheet.hMm);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = "#bbbbbb"; ctx.lineWidth = 1;
  for (const b of lay.cells) {
    const x = mmToPx(b.x), y = mmToPx(b.y), w = mmToPx(b.w), h = mmToPx(b.h);
    ctx.drawImage(img, x, y, w, h); ctx.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
  }
  return { jpeg: c.toDataURL("image/jpeg", 0.95), count: lay.count };
}
