/// <reference lib="webworker" />
/**
 * R2.1: Worker hợp nhất cho bể chung — một Worker xử lý được cả 4 loại việc:
 * - "pixels": các op điểm ảnh (runJob từ pixels.ts), chuyển quyền bộ đệm hai chiều.
 * - "detect": dò khung giấy + độ nét + lóa trên bản mẫu RGBA nhỏ.
 * - "normalize": giải mã Blob → thu nhỏ → JPEG (createImageBitmap + OffscreenCanvas).
 * - "preview": vẽ ImageBitmap thu nhỏ → JPEG cho ảnh xem trước.
 * Lỗi "pixels" trả lại chính bộ đệm vào để luồng chính chạy dự phòng.
 */
import { runJob, type PixelJob } from "./pixels";
import { detectFromRgba, sharpnessRgba, glareRgba } from "./detect";
import { fitBox, thumbBox, type QuadPts } from "./page-pipeline-shared";
import { bwPng, pageBox, rgbaToLum } from "./page-compress";
import { bytesToDataUrl } from "./content-crop";

type Msg =
  | { id: number; kind: "pixels"; job: PixelJob }
  | { id: number; kind: "detect"; d: Uint8ClampedArray; w: number; h: number; robust: boolean }
  | { id: number; kind: "normalize"; blob: Blob; max: number; q: number }
  | { id: number; kind: "preview"; bmp: ImageBitmap; w: number; h: number }
  // R2.2: dựng trang nền (cắt khung → thu nhỏ → nén → ảnh thu nhỏ), gộp từ page-pipeline.worker
  | { id: number; kind: "page"; bmp: ImageBitmap; max: number; q: number; thumbMax: number; quad?: QuadPts | null }
  // R2.2: nén trang PDF, gộp từ compress-page.worker
  | { id: number; kind: "compress"; src: string; maxSide: number; q: number; bw: boolean; isJpeg: boolean };

const toDataUrl = (b: Blob) => new FileReaderSync().readAsDataURL(b);

const post = (m: unknown, t: Transferable[] = []) =>
  (self as unknown as Worker).postMessage(m, t);

self.onmessage = async (e: MessageEvent<Msg>) => {
  const m = e.data;
  try {
    if (m.kind === "pixels") {
      const out = runJob(m.job);
      post({ id: m.id, out }, [out.buffer]);
    } else if (m.kind === "detect") {
      const det = detectFromRgba(m.d, m.w, m.h, m.robust);
      const quad = det?.quad ?? null;
      post({ id: m.id, det, sharp: sharpnessRgba(m.d, m.w, m.h, quad), glare: glareRgba(m.d, m.w, m.h, quad) });
    } else if (m.kind === "normalize") {
      const bmp = await createImageBitmap(m.blob);
      const s = Math.min(1, m.max / Math.max(bmp.width, bmp.height));
      const w = Math.max(1, Math.round(bmp.width * s)), h = Math.max(1, Math.round(bmp.height * s));
      const c = new OffscreenCanvas(w, h);
      const ctx = c.getContext("2d")!; ctx.imageSmoothingQuality = "high"; ctx.drawImage(bmp, 0, 0, w, h); bmp.close();
      const out = await c.convertToBlob({ type: "image/jpeg", quality: m.q });
      post({ id: m.id, blob: out });
    } else if (m.kind === "page") {
      // 1) Cắt theo khung giấy (bao hình chữ nhật của quad, kẹp trong ảnh)
      let src: ImageBitmap | OffscreenCanvas = m.bmp;
      if (m.quad) {
        const xs = m.quad.map((p) => p[0]), ys = m.quad.map((p) => p[1]);
        const x = Math.max(0, Math.floor(Math.min(...xs)));
        const y = Math.max(0, Math.floor(Math.min(...ys)));
        const w = Math.min(m.bmp.width - x, Math.ceil(Math.max(...xs) - x));
        const h = Math.min(m.bmp.height - y, Math.ceil(Math.max(...ys) - y));
        if (w > 8 && h > 8 && (w < m.bmp.width || h < m.bmp.height)) {
          const c = new OffscreenCanvas(w, h);
          c.getContext("2d")!.drawImage(m.bmp, x, y, w, h, 0, 0, w, h);
          src = c;
        }
      }
      const sw = src.width, sh = src.height;
      // 2) Ảnh chính: thu nhỏ về max, nén JPEG
      const main = fitBox(sw, sh, m.max);
      const mc = new OffscreenCanvas(main.w, main.h);
      const mg = mc.getContext("2d")!;
      mg.imageSmoothingQuality = "high";
      mg.fillStyle = "#fff"; mg.fillRect(0, 0, main.w, main.h);
      mg.drawImage(src, 0, 0, main.w, main.h);
      const mainBlob = await mc.convertToBlob({ type: "image/jpeg", quality: m.q });
      // 3) Ảnh thu nhỏ
      const tb = thumbBox(sw, sh, m.thumbMax);
      const tc = new OffscreenCanvas(tb.w, tb.h);
      tc.getContext("2d")!.drawImage(src, 0, 0, tb.w, tb.h);
      const thumbBlob = await tc.convertToBlob({ type: "image/jpeg", quality: 0.8 });
      m.bmp.close();
      post({ id: m.id, main: mainBlob, thumb: thumbBlob, w: main.w, h: main.h });
    } else if (m.kind === "compress") {
      const bmp = await createImageBitmap(await (await fetch(m.src)).blob());
      const s = Math.min(1, m.maxSide / Math.max(bmp.width, bmp.height));
      const W = Math.round(bmp.width * s), H = Math.round(bmp.height * s);
      const c = new OffscreenCanvas(W, H);
      const x = c.getContext("2d", { willReadFrequently: true })!;
      x.imageSmoothingEnabled = true; x.imageSmoothingQuality = "high"; x.fillStyle = "#fff"; x.fillRect(0, 0, W, H); x.drawImage(bmp, 0, 0, W, H);
      const big = Math.max(bmp.width, bmp.height) > m.maxSide; bmp.close();
      const lum = rgbaToLum(x.getImageData(0, 0, W, H).data, W, H);
      const box = pageBox(lum, W, H);
      if (box.w === W && box.h === H && !(m.bw || !m.isJpeg || big)) return post({ id: m.id, page: { src: m.src, w: W, h: H, fmt: "JPEG" } });
      if (m.bw) return post({ id: m.id, page: { src: bytesToDataUrl(bwPng(lum, W, H, box)), w: box.w, h: box.h, fmt: "PNG" } });
      let out2: OffscreenCanvas = c;
      if (box.w !== W || box.h !== H) { out2 = new OffscreenCanvas(box.w, box.h); out2.getContext("2d")!.drawImage(c, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h); }
      const blob = await out2.convertToBlob({ type: "image/jpeg", quality: m.q });
      post({ id: m.id, page: { src: toDataUrl(blob), w: box.w, h: box.h, fmt: "JPEG" } });
    } else {
      const c = new OffscreenCanvas(m.w, m.h);
      const g = c.getContext("2d");
      if (!g) throw new Error("no-2d");
      g.drawImage(m.bmp, 0, 0, m.w, m.h);
      m.bmp.close();
      const blob = await c.convertToBlob({ type: "image/jpeg", quality: 0.8 });
      post({ id: m.id, blob });
    }
  } catch (err) {
    if (m.kind === "pixels") {
      const back = m.job.op === "warp" ? m.job.src : m.job.d;
      const live = back && back.buffer.byteLength > 0;
      post({ id: m.id, error: String(err), back: live ? back : undefined }, live ? [back.buffer] : []);
    } else {
      if (m.kind === "preview" || m.kind === "page") { try { m.bmp.close(); } catch { /* bỏ qua */ } }
      post({ id: m.id, error: String(err) });
    }
  }
};
