// V13-B08: cổng ưu tiên — chụp > hiển thị > lưu > OCR > AI.
// Khi màn hình chụp (/scan) đang mở, OCR và AI phải tạm dừng để nhường CPU cho camera.
let scanActive = false;
const idleWaiters = new Set<() => void>();

/** Gọi bởi màn hình chụp: true khi mở, false khi rời. */
export function setScanActive(on: boolean) {
  if (scanActive === on) return;
  scanActive = on;
  if (!on) { idleWaiters.forEach((f) => f()); idleWaiters.clear(); }
}

export function isScanActive() {
  return scanActive;
}

/** Chờ tới khi màn hình chụp đóng (trả về ngay nếu đã đóng). */
export function whenScanIdle(): Promise<void> {
  if (!scanActive) return Promise.resolve();
  return new Promise<void>((ok) => idleWaiters.add(ok));
}

/** Đăng ký nghe lúc máy rảnh trở lại (dùng cho hàng đợi AI). */
export function onScanIdle(cb: () => void): () => void {
  idleWaiters.add(cb);
  return () => idleWaiters.delete(cb);
}
