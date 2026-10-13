import { normalizeInWorker } from "./normalize-pool";
import type { Filter, PageEdit, Quad } from "./db";
import { detectPaper, type Paper, quadAspect, snapAspect } from "./detect";
import { edgeStripBox, refineQuadSampler, stripSampler } from "./detect-refine";
import { unsharp as unsharpPx, estimateSkewPx } from "./pixels";
import { deskewQuad } from "./deskew-quad";
import { runPixels } from "./worker-call";
import { edgeCurves, trimBox } from "./dewarp";
import { webglWarp } from "./webgl-warp";
import { gpuWarpMesh } from "./warp-mesh";
import { recordPerf } from "./perf-stats";
import { hasTools, type Tools } from "./tool-levels";
import { Lru, MB, limiter, srcKey, geoKey, resultKey, PREVIEW_LONG } from "./render-cache";

/** Đo tốc độ nắn gần nhất (G2-04): "gpu" | "cpu" và số ms. */
export const warpStats: { engine: "gpu" | "cpu" | ""; ms: number } = { engine: "", ms: 0 };

export function loadImg(src: string | Blob): Promise<HTMLImageElement> {
  // S4: nhận Blob trực tiếp (object URL) – tránh chuỗi base64 lớn trên luồng chính
  const url = typeof src === "string" ? src : URL.createObjectURL(src);
  return new Promise((resolve, reject) => {
    const img = new Image();
    const done = () => { if (typeof src !== "string") URL.revokeObjectURL(url); };
    img.onload = () => { done(); resolve(img); }; img.onerror = (e) => { done(); reject(e); }; img.src = url;
  });
}
export function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader(); r.onload = () => resolve(r.result as string); r.onerror = reject; r.readAsDataURL(file);
  });
}
function canvas(w: number, h: number) {
  const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  return [c, c.getContext("2d", { willReadFrequently: true })!] as const;
}
export function toJpeg(c: HTMLCanvasElement, q = 0.92) { return c.toDataURL("image/jpeg", q); }
/** S4: nén JPEG thành Blob ngoài luồng chính; rơi về chuyển từ toDataURL khi thiếu toBlob. */
export function toJpegBlob(c: HTMLCanvasElement, q = 0.92): Promise<Blob> {
  if (typeof c.toBlob !== "function") return Promise.resolve(dataUrlToBlob(toJpeg(c, q)));
  return new Promise((res) => c.toBlob((b) => res(b ?? dataUrlToBlob(toJpeg(c, q))), "image/jpeg", q));
}
/** S3: nén JPEG không chặn luồng chính – toBlob mã hoá ngoài luồng chính, rơi về toDataURL khi thiếu. */
export function toJpegAsync(c: HTMLCanvasElement, q = 0.92): Promise<string> {
  if (typeof c.toBlob !== "function") return Promise.resolve(toJpeg(c, q));
  return new Promise((res) => c.toBlob((b) => (b ? fileToDataUrl(b).then(res, () => res(toJpeg(c, q))) : res(toJpeg(c, q))), "image/jpeg", q));
}

async function drawNormalized(src: string | Blob | CanvasImageSource, max: number) {
  const img = typeof src === "string" ? await loadImg(src.startsWith("data:") ? dataUrlToBlob(src) : src)
    : src instanceof Blob ? await loadImg(src) : src;
  const w = (img as HTMLImageElement).naturalWidth || (img as HTMLVideoElement).videoWidth || (img as HTMLCanvasElement).width;
  const h = (img as HTMLImageElement).naturalHeight || (img as HTMLVideoElement).videoHeight || (img as HTMLCanvasElement).height;
  const s = Math.min(1, max / Math.max(w, h));
  const [c, ctx] = canvas(w * s, h * s); ctx.drawImage(img, 0, 0, c.width, c.height);
  return c;
}
/** B07: ảnh thu nhỏ mới nhất từ page-pipeline (khoá = Blob nguồn), để lưới trang dùng ngay. */
export const lastThumbs = new WeakMap<Blob, Blob>();
/** S5d/B07: Blob → Worker (giải mã/thu nhỏ/nén ngoài luồng chính); lỗi hoặc không hỗ trợ → null.
 *  B07: ưu tiên page-pipeline — một lượt nền duy nhất cho cả ảnh chính lẫn ảnh thu nhỏ. */
async function viaWorker(src: unknown, max: number, q: number): Promise<Blob | null> {
  if (!(src instanceof Blob)) return null;
  try {
    const { processPageInWorker } = await import("./page-pipeline");
    const bmp = await createImageBitmap(src);
    const pp = processPageInWorker(bmp, { max, q, thumbMax: 512 });
    if (pp) {
      try {
        const r = await pp;
        lastThumbs.set(src, r.thumb);
        return r.main;
      } catch { /* rơi xuống worker cũ */ }
    }
  } catch { /* thiếu createImageBitmap → worker cũ */ }
  const p = normalizeInWorker(src, max, q); if (!p) return null;
  try { return await p; } catch { return null; }
}
/** Downscale any image source to a max dimension and return a jpeg data URL. */
export async function normalize(src: string | Blob | CanvasImageSource, max = 2000, q = 0.9) {
  const wb = await viaWorker(src, max, q); if (wb) return fileToDataUrl(wb);
  const c = await drawNormalized(src, max);
  const out = await toJpegAsync(c, q); c.width = 0; return out;
}
/** S4: như normalize nhưng trả Blob – không tạo chuỗi base64 (giảm RAM, nhanh hơn). */
export async function normalizeBlob(src: string | Blob | CanvasImageSource, max = 2000, q = 0.9) {
  const wb = await viaWorker(src, max, q); if (wb) return wb;
  const c = await drawNormalized(src, max);
  const out = await toJpegBlob(c, q); c.width = 0; return out;
}

const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Perspective-correct a quad region into a flat rectangle with the paper's true aspect ratio. */
const curvedOut = new WeakSet<HTMLCanvasElement>();
/** V4: số lần đọc toàn ảnh gốc (getImageData W×H) — đích 1 lần/trang. */
export const v4Stats = { fullReads: 0 };
if (typeof globalThis !== "undefined") (globalThis as { __v4?: typeof v4Stats }).__v4 = v4Stats;
/** V4: đọc điểm ảnh gốc một lần; straightWarp dùng lại cho cả bản dò lẫn bản chính. */
function readSrc(img: HTMLImageElement) {
  const W = img.naturalWidth, H = img.naturalHeight;
  const [sc, sctx] = canvas(W, H); sctx.drawImage(img, 0, 0);
  const d = sctx.getImageData(0, 0, W, H).data; sc.width = 0; v4Stats.fullReads++;
  return d;
}
/** keep=true: bản dò — không chuyển quyền bộ đệm dùng chung (đưa bản sao cho Worker CPU). */
async function warp(img: HTMLImageElement, quad: Quad, max: number, paper: Paper = "auto", shared?: Uint8ClampedArray, keep = false, flatten?: boolean) {
  const W = img.naturalWidth, H = img.naturalHeight;
  const q = quad.map(([x, y]) => [x * W, y * H] as [number, number]);
  const ratio = snapAspect(quadAspect(quad, W, H), paper);
  const sideW = Math.max(dist(q[0], q[1]), dist(q[3], q[2])), sideH = Math.max(dist(q[0], q[3]), dist(q[1], q[2]));
  // B1: khổ đích cố định theo chất lượng (A4 300 dpi = 3508 px cạnh dài), cho phép phóng to – không phụ thuộc kích thước tờ giấy trong khung
  void sideW; void sideH; const long = max;
  let ow = ratio >= 1 ? long : long * ratio, oh = ratio >= 1 ? long / ratio : long;
  ow = Math.round(ow); oh = Math.round(oh);
  const t0 = performance.now();
  const sd = (shared && !(globalThis as { __v4Off?: boolean }).__v4Off) ? shared : readSrc(img); // __v4Off: chỉ để so sánh kiểm chứng
  // B7: nắn bằng lưới ánh xạ trên GPU (bicubic, cả giấy phẳng lẫn cong); không có WebGL2 → GPU cũ (phẳng) → CPU trong Worker
  // P4/TD-09: flatten === false → người dùng tắt nắn cong, chỉ nắn phối cảnh thẳng
  const curves = flatten === false ? [] : edgeCurves(sd, W, H, q);
  const curved = curves.some(Boolean);
  let od: Uint8ClampedArray | null = gpuWarpMesh(img, W, H, q, ow, oh, curves); let engine: "gpu" | "cpu" = od ? "gpu" : "cpu";
  if (!od && !curved) {
    const gpu = webglWarp(img, W, H, q, ow, oh);
    if (gpu) { od = new Uint8ClampedArray(gpu.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, ow, oh).data); gpu.width = 0; engine = "gpu"; }
  }
  if (!od) od = await runPixels({ op: "warp", src: keep ? new Uint8ClampedArray(sd) : sd, W, H, q, ow, oh, curves });
  // G4-06: nắn theo dòng chữ bên trong — chạy cho CẢ nhánh GPU lẫn CPU (trước đây nhánh GPU trả về sớm và bỏ qua bước này)
  if (flatten !== false) od = await runPixels({ op: "textflat", d: od, W: ow, H: oh });
  const [c, ctx] = canvas(ow, oh); ctx.putImageData(new ImageData(od as Uint8ClampedArray<ArrayBuffer>, ow, oh), 0, 0); // V3: không sao chép
  if (curved) curvedOut.add(c);
  warpStats.engine = engine; warpStats.ms = Math.round(performance.now() - t0); recordPerf(engine === "gpu" ? "warp-gpu" : "warp-cpu", warpStats.ms);
  return c;
}

/** Divide out uneven lighting/shadows: estimate the paper background and normalise to white. Chạy trong Worker. */
async function flattenLight(c: HTMLCanvasElement) {
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  const im = ctx.getImageData(0, 0, c.width, c.height);
  // S15d: ảnh lớn → đo bản đồ nền trên bản ≤1000 px (bỏ lượt đọc toàn ảnh lớn khi dựng nền),
  // rồi áp lên bản lớn trong Worker. Ảnh nhỏ sẵn → một lượt flatten như cũ.
  if (Math.max(c.width, c.height) > 1000) {
    const s = 1000 / Math.max(c.width, c.height);
    const sw = Math.max(1, Math.round(c.width * s)), sh = Math.max(1, Math.round(c.height * s));
    const [sm, smx] = canvas(sw, sh); smx.imageSmoothingQuality = "high"; smx.drawImage(c, 0, 0, sw, sh);
    const sd = smx.getImageData(0, 0, sw, sh).data; sm.width = 0;
    const { flattenMap } = await import("./pixels");
    const maps = flattenMap(sd, sw, sh);
    ctx.putImageData(asIm(await runPixels({ op: "flatten-apply", d: im.data, W: c.width, H: c.height, maps }), c), 0, 0);
  } else {
    ctx.putImageData(asIm(await runPixels({ op: "flatten", d: im.data, W: c.width, H: c.height }), c), 0, 0);
  }
}

/** S15b: tên bộ lọc cũ/ngoài ("bw", "blackwhite", "document"…) → tên nội bộ; tên lạ rơi về "original" có cảnh báo. */
const FILTER_ALIAS: Record<string, Filter> = { bw: "mono", blackwhite: "mono", "black-white": "mono", grey: "gray", grayscale: "gray", document: "auto", light: "auto", color: "original" };
const FILTERS: Filter[] = ["original", "magic", "auto", "sharp", "mono", "gray", "ink", "eco", "vivid", "bright", "shadow", "denoise"];
export function normalizeFilter(f: string | undefined | null): Filter {
  const k = String(f ?? "original").trim().toLowerCase();
  if ((FILTERS as string[]).includes(k)) return k as Filter;
  if (FILTER_ALIAS[k]) return FILTER_ALIAS[k];
  console.warn(`[filter] tên bộ lọc không hợp lệ: ${f} → original`);
  return "original";
}

/** V3: bọc mảng trả về từ Worker thành ImageData (không sao chép). */
function asIm(px: Uint8ClampedArray, c: HTMLCanvasElement) { return new ImageData(px as Uint8ClampedArray<ArrayBuffer>, c.width, c.height); }

async function applyFilter(c: HTMLCanvasElement, rawFilter: Filter, brightness: number, contrast: number, preFlat = false, tools?: Tools, level = 100) {
  const filter = normalizeFilter(rawFilter);
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  const W = c.width, H = c.height;
  // V3: bộ đệm chuyển quyền thẳng sang Worker và nhận lại; không còn new Uint8ClampedArray(d) + d.set(...) mỗi bước.
  let d: Uint8ClampedArray = ctx.getImageData(0, 0, W, H).data; const n = d.length;
  // R2.4: cấp độ bộ lọc < 100 → giữ bản gốc để trộn lại ở cuối (0 = giữ gốc).
  const keep = level < 100 ? new Uint8ClampedArray(d) : null;
  const reread = () => { d = ctx.getImageData(0, 0, W, H).data; };
  if (filter === "auto" || filter === "sharp") {
    if (!preFlat) { await flattenLight(c); reread(); }
    d = await runPixels({ op: "docchain", d, W, H, sharp: filter === "sharp" });
    { const ik = await import("./ink-deepen"); ik.inkDeepen(d, 170, 2.2, ik.edgeSaturatedMask(d, W, H)); } // R6.1d: đậm hoá dịu nét mực (ca 093540 ΔL 51 → ≥ 60); nền ≥ gối giữ nguyên, không đẩy góc tối quá 5%; HM-11: giữ khối màu ở mép
  } else if (filter === "magic") {
    // CamScanner-style "magic colour": flatten lighting to pure white paper, crush grey text to near-black,
    // but keep coloured ink (red stamps, blue signatures/pen) in colour and make it more vivid.
    if (!preFlat) { await flattenLight(c); reread(); }
    const hist = new Uint32Array(256);
    for (let i = 0; i < n; i += 16) hist[(d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) | 0]++;
    let acc = 0, lo = 0; const total = n / 16; for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc > total * 0.005) { lo = i; break; } }
    const white = 205; // R6.1a: nén sớm vùng sáng, dành dải cho nét tối
    const keepSat = (await import("./ink-deepen")).edgeSaturatedMask(d, W, H); // HM-11: khối màu ở mép không bị nén xuống đen
    for (let i = 0; i < n; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b); const sat = mx ? (mx - mn) / mx : 0;
      const y = r * 0.3 + g * 0.59 + b * 0.11;
      const t = Math.min(1, Math.max(0, (y - lo) / Math.max(30, white - lo))); const ny = 255 * Math.pow(t, 2.3); // R6.1a: gamma 1.6 → 2.3, đậm hoá nét mực (ΔL ≥ 60)
      if (sat > 0.22 && mx - mn > 35 && y < 235) {
        const k = Math.max(ny / Math.max(1, y), keepSat[i >> 2] ? 0.6 : 0); const boost = 1.35;
        for (let ch = 0; ch < 3; ch++) { const v = d[i + ch]; d[i + ch] = Math.min(255, Math.max(0, (y + (v - y) * boost) * k)); }
      } else { d[i] = d[i + 1] = d[i + 2] = ny; }
    }
    d = await runPixels({ op: "sharpen", d, W, H, amount: 1.0 });
  } else if (filter === "shadow") {
    d = await runPixels({ op: "deshadow", d, W, H });
  } else if (filter === "denoise") {
    const { denoise } = await import("./denoise");
    d = denoise(d, W, H);
  } else if (filter === "gray") {
    if (!preFlat) { await flattenLight(c); reread(); } // R6.1b-2: chuẩn hoá nền (1 ca lệch nền 42%)
    const ik = await import("./ink-deepen");
    const keepSat = ik.edgeSaturatedMask(d, W, H); // HM-11: nhớ điểm màu bão hoà trước khi xám hoá (đỏ in, logo) để không ép đen
    d = await runPixels({ op: "gray", d, W, H });
    // R6.1a: sau khi xám hoá, kéo mức đậm hoá nét mực (ΔL ≥ 60), nền neo về PAPER_TARGET.
    const { autoLevel } = await import("./auto-level");
    autoLevel(d, 1.7);
    ik.inkDeepen(d, undefined, undefined, keepSat); // R6.1b-2: ΔL trung vị 48 → ≥ 60
    ik.inkDeepen(d, 160, 2.2, keepSat); // R6.1d: lượt hai dịu hơn cho mực rất nhạt (ca 093540 ΔL 56 → ≥ 60)
  } else if (filter === "mono" || filter === "ink") {
    const keepSat = filter === "mono" ? (await import("./ink-deepen")).edgeSaturatedMask(d, W, H) : null; // HM-11
    d = await runPixels({ op: "threshold", d, W, H, ink: filter === "ink" });
    // HM-11: đen trắng nhị phân sẽ ép khối màu bão hoà (số trang đỏ, logo) thành đen đặc → hiện thành xám giữa để không nuốt mép trang.
    if (keepSat) for (let i = 0; i < keepSat.length; i++) if (keepSat[i] && d[i * 4]! < 110) { d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = 110; }
  } else if (filter === "eco" || filter === "vivid" || filter === "bright") {
    if (filter === "eco" && !preFlat) { await flattenLight(c); reread(); }
    d = await runPixels({ op: "style", d, W, H, mode: filter });
  }
  if (hasTools(tools)) d = await runPixels({ op: "tools", d, W, H, tools: tools! });
  if (brightness || contrast) d = await runPixels({ op: "tone", d, W, H, brightness, contrast });
  // R2.4: trộn với bản gốc theo cấp độ (chỉ RGB, giữ alpha).
  if (keep) {
    const m = Math.max(0, Math.min(100, level)) / 100;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = keep[i]! + (d[i]! - keep[i]!) * m;
      d[i + 1] = keep[i + 1]! + (d[i + 1]! - keep[i + 1]!) * m;
      d[i + 2] = keep[i + 2]! + (d[i + 2]! - keep[i + 2]!) * m;
    }
  }
  ctx.putImageData(asIm(d, c), 0, 0);
}

/** Estimate small text tilt (±5°) via row projection-profile sharpness. */
export function estimateSkew(c: HTMLCanvasElement) {
  const s = Math.min(1, 600 / Math.max(c.width, c.height)); const w = Math.max(8, Math.round(c.width * s)), h = Math.max(8, Math.round(c.height * s));
  const g = grayscale(c, w, h); const t = otsu(g);
  const ink: number[] = []; const mx = Math.round(w * 0.05), my = Math.round(h * 0.05);
  for (let y = my; y < h - my; y++) for (let x = mx; x < w - mx; x++) if (g[y * w + x] < t - 10) ink.push(x, y);
  if (ink.length < 400 || ink.length / 2 > w * h * 0.35) return 0;
  const score = (deg: number) => {
    const a = (deg * Math.PI) / 180, tn = Math.tan(a); const rows = new Float64Array(h * 2);
    for (let i = 0; i < ink.length; i += 2) { const r = Math.round(ink[i + 1] - (ink[i] - w / 2) * tn) + h / 2; if (r >= 0 && r < rows.length) rows[r]++; }
    let v = 0; for (let i = 1; i < rows.length; i++) v += (rows[i] - rows[i - 1]) ** 2; return v;
  };
  let best = 0, bs = score(0);
  for (let d = -5; d <= 5; d += 0.5) { const v = score(d); if (v > bs) { bs = v; best = d; } }
  const c0 = best; for (let d = c0 - 0.4; d <= c0 + 0.4; d += 0.1) { const v = score(d); if (v > bs) { bs = v; best = d; } }
  return Math.abs(best) < 0.25 || bs < score(0) * 1.05 ? 0 : best;
}

/** Rotate away small tilt; fills exposed corners with edge-matching paper colour by slight zoom. Chạy trong Worker. */
async function deskew(c: HTMLCanvasElement) {
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  const im = ctx.getImageData(0, 0, c.width, c.height);
  const out = await runPixels({ op: "deskew", d: new Uint8ClampedArray(im.data), W: c.width, H: c.height });
  im.data.set(out); ctx.putImageData(im, 0, 0);
  return c;
}

/**
 * B5: xoay thẳng → nắn/cắt → (làm sạch ở bước sau). Đo độ nghiêng trên bản nắn thô nhỏ, rồi xoay khung
 * nguồn và nắn một lần — không sinh góc nền mới. Giấy cong: giữ cách cũ (nắn rồi xoay thẳng điểm ảnh).
 */
async function straightWarp(img: HTMLImageElement, quad: Quad, max: number, paper?: Paper, flatten?: boolean) {
  let sd: Uint8ClampedArray | undefined = readSrc(img); // V4: một lần đọc 12 MP cho cả trang
  const probe = await warp(img, quad, Math.min(max, 720), paper, sd, true, flatten);
  const curved = curvedOut.has(probe);
  let deg = 0;
  if (!curved) { const d = probe.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, probe.width, probe.height).data; deg = estimateSkewPx(d, probe.width, probe.height); }
  const pw = probe.width, ph = probe.height; probe.width = 0;
  if (curved) return deskew(await warp(img, quad, max, paper, sd, false, flatten));
  if (!deg) return warp(img, quad, max, paper, sd, false, flatten);
  const W = img.naturalWidth, H = img.naturalHeight;
  const q2 = deskewQuad(quad.map(([x, y]) => [x * W, y * H] as [number, number]), pw, ph, deg).map(([x, y]) => [x / W, y / H]) as Quad;
  const out = warp(img, q2, max, paper, sd, false, flatten); sd = undefined; // giải phóng ngay sau dùng
  return out;
}

/**
 * Bỏ mép nền thừa sau khi nắn: cắt dải tối sát cạnh, rồi xoá nêm nền dính viền.
 * V5: một lượt — đọc điểm ảnh một lần, cắt trên bộ đệm (không vẽ lại canvas, không đọc lần hai), chuyển thẳng sang Worker.
 */
async function cleanEdges(c: HTMLCanvasElement) {
  const W = c.width, H = c.height;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  const im = ctx.getImageData(0, 0, W, H);
  const b = trimBox(im.data, W, H);
  const w = b.x1 - b.x0, h = b.y1 - b.y0;
  const cropped = w !== W || h !== H;
  let d: Uint8ClampedArray;
  if (!cropped) d = im.data;
  else if (w === W) d = im.data.slice(b.y0 * W * 4, b.y1 * W * 4);
  else { d = new Uint8ClampedArray(w * h * 4); for (let y = 0; y < h; y++) { const s = ((y + b.y0) * W + b.x0) * 4; d.set(im.data.subarray(s, s + w * 4), y * w * 4); } }
  const res = await runPixels({ op: "clean", d, W: w, H: h });
  let out = c;
  if (cropped) { c.width = 0; [out] = canvas(w, h); }
  out.getContext("2d", { willReadFrequently: true })!.putImageData(new ImageData(new Uint8ClampedArray(res.buffer as ArrayBuffer, res.byteOffset, w * h * 4), w, h), 0, 0);
  return out;
}

/** B1: cạnh dài đích (px) theo chất lượng: Nét nhất = A4 300 dpi, Cân bằng = A4 200 dpi. */
export const TARGET_LONG = { high: 3508, normal: 2339 } as const;
export function targetLong(quality: "high" | "normal" = "high") { return TARGET_LONG[quality] ?? TARGET_LONG.high; }

// B2b: ảnh gốc giải mã một lần từ Blob (object URL), tối đa 2 ảnh lớn giải mã cùng lúc, giữ 2 ảnh gần nhất.
const decodeGate = limiter(2);
const decoded = new Lru<{ img: HTMLImageElement; url: string | null }>(2, (v) => { if (v.url) URL.revokeObjectURL(v.url); v.img.src = ""; }, (v) => v.img.naturalWidth * v.img.naturalHeight * 4, 128 * MB);
/** Phần hình học đã dựng (nắn → thẳng → làm sạch mép → xoay), dùng lại khi chỉ đổi bộ lọc. */
const geoCache = new Lru<HTMLCanvasElement>(8, (c) => { c.width = 0; }, (c) => c.width * c.height * 4, 160 * MB); // S15f: trần theo MB
/** Kết quả cuối theo (ảnh, hình học, bộ lọc, sáng, tương phản). */
const resultCache = new Lru<string>(24, (u) => { if (u.startsWith("blob:")) URL.revokeObjectURL(u); });
const inflight = new Map<string, Promise<unknown>>();
function once<T>(k: string, fn: () => Promise<T>): Promise<T> {
  const p = inflight.get(k) as Promise<T> | undefined; if (p) return p;
  const q = fn().finally(() => inflight.delete(k)); inflight.set(k, q); return q;
}
export function dataUrlToBlob(u: string) {
  const i = u.indexOf(","); const meta = u.slice(5, i); const b64 = meta.endsWith(";base64");
  const raw = b64 ? atob(u.slice(i + 1)) : decodeURIComponent(u.slice(i + 1));
  const a = new Uint8Array(raw.length); for (let k = 0; k < raw.length; k++) a[k] = raw.charCodeAt(k);
  return new Blob([a], { type: meta.replace(";base64", "") || "image/jpeg" });
}
async function decodeOrig(orig: string) {
  const k = srcKey(orig); const hit = decoded.get(k); if (hit) return hit.img;
  return once("d:" + k, () => decodeGate(async () => {
    const url = orig.startsWith("data:") ? URL.createObjectURL(dataUrlToBlob(orig)) : null;
    const img = await loadImg(url ?? orig); try { await img.decode?.(); } catch { /* đã tải xong */ }
    decoded.set(k, { img, url }); return img;
  }));
}
/** Giải phóng toàn bộ ảnh giải mã + bộ đệm (gọi khi rời màn hình chỉnh/chụp). */
export function releaseRenderCache() { decoded.clear(); geoCache.clear(); resultCache.clear(); }
export const renderCacheStats = () => ({ decoded: decoded.size, geo: geoCache.size, results: resultCache.size, decode: decodeGate.stats() });
export function resetDecodePeak() { decodeGate.resetPeak(); }

/** V0: ghi thời gian từng bước dựng trang vào globalThis.__v0 (chỉ số đo, không ảnh hưởng ảnh ra). */
async function v0<T>(step: string, fn: () => Promise<T> | T): Promise<T> {
  const t0 = performance.now();
  try { return await fn(); } finally {
    const g = globalThis as { __v0?: { step: string; ms: number }[] };
    (g.__v0 ??= []).push({ step, ms: Math.round(performance.now() - t0) });
  }
}

async function renderGeometry(orig: string, edit: PageEdit, max: number) {
  const k = geoKey(orig, edit, max); const hit = geoCache.get(k); if (hit && hit.width) return hit;
  return once("g:" + k, async () => {
    const img = await v0("decode", () => decodeOrig(orig));
    let c: HTMLCanvasElement;
    if (edit.quad) c = await v0("edge-clean", async () => cleanEdges(await v0("warp", () => straightWarp(img, edit.quad!, max, edit.paper, edit.flatten))));
    else { const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight)); const [cc, ctx] = canvas(img.naturalWidth * s, img.naturalHeight * s); ctx.drawImage(img, 0, 0, cc.width, cc.height); c = cc; }
    const r = ((edit.rotation % 360) + 360) % 360;
    if (r) {
      const [rc, rctx] = canvas(r % 180 ? c.height : c.width, r % 180 ? c.width : c.height);
      rctx.translate(rc.width / 2, rc.height / 2); rctx.rotate((r * Math.PI) / 180); rctx.drawImage(c, -c.width / 2, -c.height / 2); c.width = 0; c = rc;
    }
    geoCache.set(k, c); return c;
  });
}

/** Lớp đã chuẩn hoá ánh sáng (dùng chung cho Tự động/Nét/Màu kỳ diệu/Tiết kiệm mực). */
const FLAT_FILTERS = new Set<Filter>(["auto", "sharp", "magic", "eco"]);
async function renderFlat(orig: string, edit: PageEdit, max: number) {
  const k = geoKey(orig, edit, max) + "|flat"; const hit = geoCache.get(k); if (hit && hit.width) return hit;
  return once("f:" + k, async () => {
    const g = await renderGeometry(orig, edit, max);
    const [c, ctx] = canvas(g.width, g.height); ctx.drawImage(g, 0, 0); await v0("flatten", () => flattenLight(c));
    geoCache.set(k, c); return c;
  });
}

/**
 * S11r: nắn riêng ô dải 0 lệch nhất. Đo trên ảnh đã nén JPEG (giống ảnh lưu):
 * trên dữ liệu thô trước nén, ô tiêu đề đo lệch (−2,5° thay vì −1,75°) nên nắn ngược.
 */
async function band0Fix(c: HTMLCanvasElement) {
  try {
    const { lineSkewRefineBand0, lineSkewRefineBand1 } = await import("./line-skew");
    // S15c: đo trước trên bản thu nhỏ (≤ 1000 px, thu nhỏ làm mịn như JPEG). Đa số trang
    // không cần nắn → bỏ hẳn vòng nén/giải nén JPEG và hai lượt đo trên ảnh lớn.
    const s = Math.min(1, 1000 / Math.max(c.width, c.height));
    const sw = Math.max(1, Math.round(c.width * s)), sh = Math.max(1, Math.round(c.height * s));
    const [sm, smx] = canvas(sw, sh); smx.imageSmoothingQuality = "high"; smx.drawImage(c, 0, 0, sw, sh);
    const sd = smx.getImageData(0, 0, sw, sh).data; sm.width = 0;
    const p0 = lineSkewRefineBand0(sd, sw, sh, 3);
    const p1 = lineSkewRefineBand1(p0.data, sw, sh, 2);
    if (p0.passes === 0 && p1.passes === 0) return;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    const blob = await new Promise<Blob | null>((res) => c.toBlob(res, "image/jpeg", 0.92));
    if (!blob) return;
    const bmp = await createImageBitmap(blob);
    const [t, tctx] = canvas(c.width, c.height); tctx.drawImage(bmp, 0, 0); bmp.close();
    const im = tctx.getImageData(0, 0, c.width, c.height); t.width = 0;
    const r = lineSkewRefineBand0(im.data, c.width, c.height, 3);
    // S11s: nắn ô dải 1 còn lệch, bù dải 0 trong cùng lượt
    const r1 = lineSkewRefineBand1(r.data, c.width, c.height, 2);
    (globalThis as { __s11?: string[] }).__s11 = [...((globalThis as { __s11?: string[] }).__s11 ?? []), ...r1.log];
    if (r.passes > 0 || r1.passes > 0) { im.data.set(r1.data); ctx.putImageData(im, 0, 0); }
  } catch { /* bỏ qua: giữ ảnh như cũ */ }
}

async function renderTo(orig: string, edit: PageEdit, max: number, as: "data" | "blob") {
  const k = resultKey(orig, edit, max) + "|" + as; const hit = resultCache.get(k); if (hit) return hit;
  return once("r:" + k, async () => {
    const flat = FLAT_FILTERS.has(edit.filter);
    const g = flat ? await renderFlat(orig, edit, max) : await renderGeometry(orig, edit, max);
    const [c, ctx] = canvas(g.width, g.height); ctx.drawImage(g, 0, 0);
    await v0("filter", () => applyFilter(c, edit.filter, edit.brightness, edit.contrast, flat, edit.tools, edit.level ?? 100));
    if (edit.filter === "auto" || edit.filter === "sharp") await v0("band0", () => band0Fix(c));
    // B1: nén JPEG duy nhất một lần ở cuối đường ống
    const out = as === "blob"
      ? URL.createObjectURL(await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("toBlob"))), "image/jpeg", 0.9)))
      : await v0("jpeg", () => toJpegAsync(c, 0.92));
    c.width = 0; resultCache.set(k, out); return out;
  });
}

/** Dựng đầy đủ (A4 300 dpi mặc định) – dùng khi lưu/xuất. Trả data URL. */
export function renderPage(orig: string, edit: PageEdit, max: number = TARGET_LONG.high) { return renderTo(orig, edit, max, "data"); }
/** Tầng xem trước ~1200 px, trả object URL (bộ đệm sở hữu – không tự revoke). */
export function renderPreview(orig: string, edit: PageEdit) { return renderTo(orig, edit, PREVIEW_LONG, "blob"); }

function otsu(g: Uint8ClampedArray | number[]) {
  const hist = new Array(256).fill(0); for (const v of g) hist[v | 0]++;
  const total = g.length; let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, best = 0, t = 127;
  for (let i = 0; i < 256; i++) {
    wB += hist[i]; if (!wB) continue; const wF = total - wB; if (!wF) break;
    sumB += i * hist[i]; const mB = sumB / wB, mF = (sum - sumB) / wF; const between = wB * wF * (mB - mF) ** 2;
    if (between > best) { best = between; t = i; }
  }
  return t;
}
function grayscale(src: CanvasImageSource, w: number, h: number) {
  const [c, ctx] = canvas(w, h); ctx.drawImage(src, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data; const g = new Uint8ClampedArray(w * h);
  for (let i = 0; i < g.length; i++) g[i] = d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11;
  return g;
}

/** Find the paper sheet (edge + straight-line based). Returns null if nothing convincing. */
export function detectQuad(src: CanvasImageSource, sw: number, sh: number, size = 360): Quad | null {
  const d = detectPaper(src, sw, sh, size);
  return d && d.score > 0.35 ? d.quad : null;
}
/** S2: dò nhanh trên khung hình kèm điểm tin cậy (không cần giải mã ảnh gốc). */
export function detectQuadScored(src: CanvasImageSource, sw: number, sh: number, size = 720): { quad: Quad; score: number } | null {
  const d = detectPaper(src, sw, sh, size);
  return d && d.score > 0.35 ? { quad: d.quad, score: d.score } : null;
}
export async function detectQuadFromSrc(src: string) {
  const img = await decodeOrig(src);
  const quad = detectQuad(img, img.naturalWidth, img.naturalHeight, 640);
  if (!quad) return null;
  return refineQuadOnSrc(src, quad);
}
/**
 * Local detection plus a trust flag. Not sure = weak score or a side lying on the image border
 * (sheet edge not actually seen, e.g. white paper on white paper) — callers should then ask the AI.
 */
export async function detectQuadInfo(src: string): Promise<{ quad: Quad | null; sure: boolean }> {
  const img = await decodeOrig(src);
  const d = detectPaper(img, img.naturalWidth, img.naturalHeight, 640);
  if (!d || d.score <= 0.35) return { quad: null, sure: false };
  const e = 0.012, q = d.quad;
  const onEdge = [0, 1, 2, 3].some((i) => { const a = q[i], b = q[(i + 1) % 4];
    return (a[0] < e && b[0] < e) || (a[1] < e && b[1] < e) || (a[0] > 1 - e && b[0] > 1 - e) || (a[1] > 1 - e && b[1] > 1 - e); });
  let sure = d.score >= 0.7 && !onEdge;
  const refined = await refineQuadOnSrc(src, q);
  // S15l/V10: dò chồng giấy trên khung ĐÃ tinh chỉnh (khung thô có thể bám vào mép tờ lót)
  if (sure) sure = !(await looksStacked(img, refined));
  return { quad: refined, sure };
}
async function looksStacked(img: HTMLImageElement, q: Quad): Promise<boolean> {
  try {
    const { stackedSides } = await import("./paper-stack");
    const s = 640 / Math.max(img.naturalWidth, img.naturalHeight);
    const w = Math.max(1, Math.round(img.naturalWidth * s)), h = Math.max(1, Math.round(img.naturalHeight * s));
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const x = c.getContext("2d", { willReadFrequently: true }); if (!x) return false;
    x.drawImage(img, 0, 0, w, h);
    const rgba = x.getImageData(0, 0, w, h).data, g = new Uint8Array(w * h);
    for (let i = 0; i < g.length; i++) g[i] = (rgba[i * 4] * 77 + rgba[i * 4 + 1] * 150 + rgba[i * 4 + 2] * 29) >> 8;
    return stackedSides({ data: g, w, h }, q).length > 0;
  } catch { return false; }
}
/** Snap a rough quad (e.g. from the AI model) onto real paper edges of the original. */
export async function refineQuadOnSrc(src: string, quad: Quad) {
  // B3: dùng ảnh đã giải mã trong bộ đệm, chỉ đọc 4 dải quanh cạnh (không getImageData cả ảnh 4096 px)
  const img = await decodeOrig(src);
  const W = img.naturalWidth, H = img.naturalHeight, pad = 24;
  const strips = [0, 1, 2, 3].map((i) => {
    const b = edgeStripBox(quad, W, H, i, pad);
    const [c, ctx] = canvas(b.w, b.h);
    ctx.drawImage(img, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h);
    const data = ctx.getImageData(0, 0, b.w, b.h).data; c.width = 0;
    return { ...b, data };
  });
  return refineQuadSampler(stripSampler(strips), W, H, quad);
}

/** Cheap luminance signature for stability checks while auto-capturing. */
export function frameSignature(video: HTMLVideoElement) {
  return grayscale(video, 32, 24);
}
export function frameDiff(a: Uint8ClampedArray, b: Uint8ClampedArray) {
  let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length;
}

export async function splitBook(src: string) {
  const img = await loadImg(src); const W = img.naturalWidth, H = img.naturalHeight;
  return [0, 1].map((i) => { const [c, ctx] = canvas(W / 2, H); ctx.drawImage(img, -i * (W / 2), 0); return toJpeg(c); });
}

/** Place both sides of an ID card at real size (85.6 × 54 mm) on an A4 sheet. */
export async function composeIdCard(front: string, back: string) {
  const px = 150 / 25.4; const [c, ctx] = canvas(210 * px, 297 * px);
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, c.width, c.height);
  const cw = 85.6 * px, ch = 54 * px, x = (c.width - cw) / 2;
  for (const [i, s] of [front, back].entries()) {
    const img = await loadImg(s); ctx.drawImage(img, x, 50 * px + i * (ch + 30 * px), cw, ch);
  }
  return toJpeg(c, 0.92);
}

export async function compress(src: string, max = 1400, q = 0.6) { return normalize(src, max, q); }

/** Count distinct objects on a contrasting background. Returns count + annotated image. */
export async function countObjects(src: string) {
  const img = await loadImg(src); const s = 360 / Math.max(img.naturalWidth, img.naturalHeight);
  const w = Math.round(img.naturalWidth * s), h = Math.round(img.naturalHeight * s);
  const g = grayscale(img, w, h); const t = otsu(g);
  let dark = 0; for (const v of g) if (v <= t) dark++;
  const fgDark = dark < g.length / 2;
  const mask = new Uint8Array(w * h); for (let i = 0; i < g.length; i++) mask[i] = (fgDark ? g[i] <= t : g[i] > t) ? 1 : 0;
  const label = new Int32Array(w * h); const boxes: number[][] = []; const minArea = w * h * 0.0008;
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i] || label[i]) continue;
    const stack = [i]; label[i] = 1; let area = 0, x0 = w, y0 = h, x1 = 0, y1 = 0;
    while (stack.length) {
      const p = stack.pop()!; area++; const x = p % w, y = (p / w) | 0;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      for (const q of [p - 1, p + 1, p - w, p + w]) if (q >= 0 && q < mask.length && mask[q] && !label[q] && Math.abs((q % w) - x) <= 1) { label[q] = 1; stack.push(q); }
    }
    if (area >= minArea && area < w * h * 0.5) boxes.push([x0, y0, x1, y1]);
  }
  const [c, ctx] = canvas(img.naturalWidth, img.naturalHeight); ctx.drawImage(img, 0, 0);
  ctx.strokeStyle = "#00BFA5"; ctx.lineWidth = Math.max(3, c.width / 250); ctx.fillStyle = "#00BFA5"; ctx.font = `bold ${Math.max(16, c.width / 40)}px sans-serif`;
  boxes.forEach(([a, b, cc, d], i) => { ctx.strokeRect(a / s, b / s, (cc - a) / s, (d - b) / s); ctx.fillText(String(i + 1), a / s, b / s - 4); });
  return { count: boxes.length, image: toJpeg(c) };
}

/** Overlay a transparent drawing (signature / annotation) onto a page image. */
export async function stamp(base: string, overlay: string) {
  const [a, b] = await Promise.all([loadImg(base), loadImg(overlay)]);
  const [c, ctx] = canvas(a.naturalWidth, a.naturalHeight); ctx.drawImage(a, 0, 0); ctx.drawImage(b, 0, 0, c.width, c.height);
  return toJpeg(c, 0.92);
}

/** Focus/shake score: variance of the Laplacian on a ~480px grey copy (optionally only inside the paper quad).
 *  Higher = sharper. Scale-normalised so video frames and full-res stills are comparable. */
export function sharpness(src: CanvasImageSource, sw: number, sh: number, quad?: Quad | null) {
  const s = 480 / Math.max(sw, sh); const w = Math.max(8, Math.round(sw * s)), h = Math.max(8, Math.round(sh * s));
  const g = grayscale(src, w, h);
  let x0 = 1, y0 = 1, x1 = w - 1, y1 = h - 1;
  if (quad) { const xs = quad.map((p) => p[0] * w), ys = quad.map((p) => p[1] * h);
    x0 = Math.max(1, Math.round(Math.min(...xs) + w * 0.03)); x1 = Math.min(w - 1, Math.round(Math.max(...xs) - w * 0.03));
    y0 = Math.max(1, Math.round(Math.min(...ys) + h * 0.03)); y1 = Math.min(h - 1, Math.round(Math.max(...ys) - h * 0.03)); }
  let sum = 0, sq = 0, n = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = y * w + x; const l = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - w] - g[i + w];
    sum += l; sq += l * l; n++; }
  return n ? sq / n - (sum / n) ** 2 : 0;
}

/** Share of blown-out (glare) pixels inside the paper area, 0..1. */
export function glare(src: CanvasImageSource, sw: number, sh: number, quad?: Quad | null) {
  const s = 240 / Math.max(sw, sh); const w = Math.max(8, Math.round(sw * s)), h = Math.max(8, Math.round(sh * s));
  const [c, ctx] = canvas(w, h); ctx.drawImage(src, 0, 0, w, h); const d = ctx.getImageData(0, 0, w, h).data;
  let x0 = 0, y0 = 0, x1 = w, y1 = h;
  if (quad) { const xs = quad.map((p) => p[0] * w), ys = quad.map((p) => p[1] * h);
    x0 = Math.max(0, Math.round(Math.min(...xs))); x1 = Math.min(w, Math.round(Math.max(...xs)));
    y0 = Math.max(0, Math.round(Math.min(...ys))); y1 = Math.min(h, Math.round(Math.max(...ys))); }
  let hot = 0, n = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = (y * w + x) * 4; n++;
    if (d[i] > 250 && d[i + 1] > 250 && d[i + 2] > 250) hot++; }
  c.width = 0; return n ? hot / n : 0;
}

/** How strongly the phone is tilted: 0 = flat above the page, ~0.3+ = strong angle. */
export function tilt(q: Quad) {
  const L = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const top = L(q[0], q[1]), bot = L(q[3], q[2]), lef = L(q[0], q[3]), rig = L(q[1], q[2]);
  return Math.max(Math.abs(top - bot) / Math.max(top, bot), Math.abs(lef - rig) / Math.max(lef, rig));
}

/** Bản ảnh tăng cường cho lần đọc AI thứ 2: thẳng hoá, xám, kéo giãn tương phản, khử nhiễu nhẹ, làm nét, cỡ tối ưu OCR. */
export async function enhanceForOcr(src: string, max = 1600) {
  const img = await loadImg(src);
  const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  let [c, ctx] = canvas(Math.round(img.naturalWidth * s), Math.round(img.naturalHeight * s));
  ctx.imageSmoothingQuality = "high"; ctx.drawImage(img, 0, 0, c.width, c.height);
  c = await deskew(c); ctx = c.getContext("2d")!;
  const W = c.width, H = c.height, im = ctx.getImageData(0, 0, W, H), d = im.data, n = W * H;
  const g = new Float32Array(n); const hist = new Uint32Array(256);
  for (let p = 0; p < n; p++) { const v = 0.299 * d[p * 4] + 0.587 * d[p * 4 + 1] + 0.114 * d[p * 4 + 2]; g[p] = v; hist[v | 0]++; }
  let lo = 0, hi = 255, acc = 0; for (; lo < 255 && (acc += hist[lo]) < n * 0.01; lo++); acc = 0; for (; hi > 0 && (acc += hist[hi]) < n * 0.01; hi--);
  const range = Math.max(30, hi - lo);
  // khử nhiễu 3x3 trung bình có trọng số rồi kéo giãn tương phản
  const out = new Uint8ClampedArray(n * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x; let v = g[p];
    if (x > 0 && y > 0 && x < W - 1 && y < H - 1) v = (4 * g[p] + g[p - 1] + g[p + 1] + g[p - W] + g[p + W]) / 8;
    v = ((v - lo) / range) * 255;
    out[p * 4] = out[p * 4 + 1] = out[p * 4 + 2] = v; out[p * 4 + 3] = 255;
  }
  unsharpPx(out, W, H, 0.8);
  d.set(out); ctx.putImageData(im, 0, 0);
  return toJpeg(c, 0.85);
}
