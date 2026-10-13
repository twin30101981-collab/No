/** QR/barcode reading: native BarcodeDetector where available (Android/Chrome), jsQR fallback for iPhone Safari. */
type Det = { detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]> };
let native: Det | null | undefined;
const canvas = () => document.createElement("canvas");

function getNative(): Det | null {
  if (native !== undefined) return native;
  const BD = (window as unknown as { BarcodeDetector?: new (o: object) => Det }).BarcodeDetector;
  try { native = BD ? new BD({ formats: ["qr_code", "ean_13", "code_128"] }) : null; } catch { native = null; }
  return native;
}

let cv: HTMLCanvasElement | null = null;
async function viaJsQr(src: HTMLVideoElement | HTMLImageElement, w: number, h: number) {
  const { default: jsQR } = await import("jsqr");
  const s = Math.min(1, 800 / Math.max(w, h));
  cv ??= canvas(); cv.width = Math.round(w * s); cv.height = Math.round(h * s);
  const ctx = cv.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(src, 0, 0, cv.width, cv.height);
  const d = ctx.getImageData(0, 0, cv.width, cv.height);
  return jsQR(d.data, d.width, d.height, { inversionAttempts: "attemptBoth" })?.data ?? null;
}

export async function readCode(src: HTMLVideoElement | HTMLImageElement): Promise<string | null> {
  const w = src instanceof HTMLVideoElement ? src.videoWidth : src.naturalWidth;
  const h = src instanceof HTMLVideoElement ? src.videoHeight : src.naturalHeight;
  if (!w) return null;
  const n = getNative();
  if (n) { const [r] = await n.detect(src).catch(() => []); if (r?.rawValue) return r.rawValue; }
  return viaJsQr(src, w, h);
}

export async function readCodeFromDataUrl(url: string) {
  const img = new Image(); img.src = url; await img.decode();
  return readCode(img);
}
