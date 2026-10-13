/**
 * V7: dò khung trong một Worker riêng (không xếp hàng sau việc dựng trang nặng).
 * Luồng chính chỉ lấy mẫu RGBA ~320 px rồi chuyển quyền bộ đệm. Không có Worker / lỗi → dò trên luồng chính.
 */
import { detectFromRgba, detectSize, sampleRgba, sharpnessRgba, glareRgba, type Detection } from "./detect";
import { runInPool } from "./worker-pool";

/** B09: kết quả một nhịp ngắm — khung giấy + độ nét + lóa, tính trong Worker. */
export type FrameResult = { det: Detection | null; sharp: number; glare: number; fromWorker: boolean };

export const v7Stats = { worker: 0, main: 0, mainMs: 0, workerMs: 0, dropped: 0 };
if (typeof globalThis !== "undefined") (globalThis as { __v7?: typeof v7Stats }).__v7 = v7Stats;

type DetectReply = { det?: Detection | null; sharp?: number; glare?: number; error?: string };
/** R2.1: gọi bể chung ưu tiên cao nhất (nhịp ngắm trực tiếp); null khi không có Worker. */
function detectViaPool(d: Uint8ClampedArray, w: number, h: number, robust: boolean): Promise<DetectReply> | null {
  return runInPool<DetectReply>("detect", { d, w, h, robust }, [d.buffer]);
}

/** Dò khung bất đồng bộ; kết quả giống hệt detectPaper(src, sw, sh, size). */
export async function detectPaperAsync(src: CanvasImageSource, sw: number, sh: number, size = 360): Promise<Detection | null> {
  if (!sw || !sh) return null;
  const { w, h } = detectSize(sw, sh, size); const robust = size >= 500;
  const d = sampleRgba(src, w, h);
  const viaPool = detectViaPool(d, w, h, robust);
  if (viaPool) {
    const t0 = performance.now();
    const r = await viaPool.catch((): DetectReply => ({ error: "worker" }));
    if (!r.error) { v7Stats.worker++; v7Stats.workerMs += performance.now() - t0; return r.det ?? null; }
    return detectPaperAsync(src, sw, sh, size); // Worker vừa lỗi → lần này chạy luồng chính
  }
  const t0 = performance.now(); const det = detectFromRgba(d, w, h, robust);
  v7Stats.main++; v7Stats.mainMs += performance.now() - t0; return det;
}

/** B09: một nhịp ngắm trọn gói — dò khung + độ nét + lóa đều tính trong Worker trên cùng bản mẫu RGBA.
 *  Không có Worker / lỗi → tính trên luồng chính nhưng vẫn trên bản mẫu nhỏ (không vẽ lại canvas). */
export async function detectFrameAsync(src: CanvasImageSource, sw: number, sh: number, size = 320): Promise<FrameResult> {
  if (!sw || !sh) return { det: null, sharp: 0, glare: 0, fromWorker: false };
  const { w, h } = detectSize(sw, sh, size); const robust = size >= 500;
  const d = sampleRgba(src, w, h);
  const viaPool = detectViaPool(d, w, h, robust);
  if (viaPool) {
    const t0 = performance.now();
    const r = await viaPool.catch((): DetectReply => ({ error: "worker" }));
    if (!r.error) {
      v7Stats.worker++; v7Stats.workerMs += performance.now() - t0;
      return { det: r.det ?? null, sharp: r.sharp ?? 0, glare: r.glare ?? 0, fromWorker: true };
    }
    return detectFrameAsync(src, sw, sh, size); // Worker vừa lỗi → chạy luồng chính
  }
  const t0 = performance.now();
  const det = detectFromRgba(d, w, h, robust);
  const sharp = sharpnessRgba(d, w, h, det?.quad ?? null);
  const gl = glareRgba(d, w, h, det?.quad ?? null);
  v7Stats.main++; v7Stats.mainMs += performance.now() - t0;
  return { det, sharp, glare: gl, fromWorker: false };
}
