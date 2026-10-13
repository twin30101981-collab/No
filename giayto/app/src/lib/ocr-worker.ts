/** O7: một Worker Tesseract dùng chung cho toàn app (nhận chữ nền, PDF tìm được chữ, OCR theo lô, tải ngoại tuyến).
 * Việc được xếp hàng tuần tự; đổi ngôn ngữ thì dựng lại Worker. Factory được tiêm vào để kiểm thử không cần Tesseract. */
type Logger = (m: { status: string; progress: number }) => void;
export type OcrEngine = {
  recognize: (src: string, opts?: Record<string, unknown>, out?: Record<string, unknown>) => Promise<{ data: unknown }>;
  terminate: () => Promise<unknown>;
};
export type EngineFactory = (lang: string, logger: Logger) => Promise<OcrEngine>;

export class SharedOcr {
  private engine: Promise<OcrEngine> | null = null;
  private lang = "";
  private chain: Promise<unknown> = Promise.resolve();
  private progress: ((p: number) => void) | null = null;
  created = 0;
  constructor(private factory: EngineFactory) {}

  private get(lang: string) {
    if (this.engine && this.lang !== lang) { const old = this.engine; this.engine = null; void old.then((e) => e.terminate()).catch(() => {}); }
    this.lang = lang;
    if (!this.engine) {
      this.created++;
      const p = this.factory(lang, (m) => { if (m.status === "recognizing text") this.progress?.(m.progress); });
      p.catch(() => { if (this.engine === p) this.engine = null; });
      this.engine = p;
    }
    return this.engine;
  }

  /** Chạy một lượt nhận chữ; các lượt nối đuôi nhau trên cùng Worker. */
  run<T = import("tesseract.js").Page>(lang: string, src: string, opts?: { out?: Record<string, unknown>; onProgress?: (p: number) => void }): Promise<{ data: T }> {
    const job = this.chain.then(async () => {
      this.progress = opts?.onProgress ?? null;
      try { return await (await this.get(lang)).recognize(src, {}, opts?.out); } finally { this.progress = null; }
    });
    this.chain = job.catch(() => {});
    return job as Promise<{ data: T }>;
  }

  /** Chỉ tải sẵn Worker + dữ liệu ngôn ngữ. */
  async warm(lang: string) { await this.get(lang); }

  /** Dừng việc đang chạy (huỷ): bỏ Worker, lượt sau tự dựng lại. */
  async reset() { const e = this.engine; this.engine = null; if (e) await e.then((w) => w.terminate()).catch(() => {}); }
}

/** HM-07: không tải được gói nhận chữ (mất mạng/CDN bị chặn lần đầu) — lỗi có tên để giao diện báo đúng cách khắc phục. */
export class OcrUnavailableError extends Error { constructor() { super("Chưa tải được gói nhận chữ"); this.name = "OcrUnavailableError"; } }
export const ocrWorkerUrl = (version: string) => `https://cdn.jsdelivr.net/npm/tesseract.js@v${version}/dist/worker.min.js`;
/** Thử với tới tệp worker trước khi dựng Worker: nếu thất bại thì ném lỗi gọn, thay vì để Worker nổ lỗi importScripts không ai bắt.
 *  Tệp đã được service worker giữ (mục Tôi → Tải sẵn) vẫn lấy được khi mất mạng. */
export async function assertOcrReachable(fetchFn: typeof fetch = fetch, url?: string): Promise<void> {
  try { await fetchFn(url ?? ocrWorkerUrl((await import("tesseract.js/package.json")).default.version), { mode: "no-cors" }); }
  catch { throw new OcrUnavailableError(); }
}
async function makeEngine(lang: string, logger: Logger) {
  await assertOcrReachable();
  const T = await import("tesseract.js");
  return T.createWorker(lang, 1, { logger }) as unknown as OcrEngine;
}

let shared: SharedOcr | null = null;
export function sharedOcr() {
  return (shared ??= new SharedOcr(makeEngine));
}
/** S7: Worker Tesseract riêng cho làn OCR phụ (không nối đuôi với Worker chung). */
export function extraOcr() {
  return new SharedOcr(makeEngine);
}
export async function currentLang() { return (await import("./settings")).getSettings().ocrLang; }
