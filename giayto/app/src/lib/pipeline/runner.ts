// CS-02: bộ điều phối nền DÙNG CHUNG TOÀN APP (đề án "Chụp trước – Xử lý sau", báo cáo mục 8.1).
// Lỗi gốc (G-03): bộ xử lý việc "finish" chỉ được đăng ký trong màn Chụp (scan.tsx) và hàng đợi bị huỷ khi rời màn →
// rời màn giữa chừng/tải lại thì không ai hoàn thiện trang. Nay bộ xử lý đăng ký ở gốc app (__root), không huỷ khi đổi màn,
// tiếp tục việc còn dở sau khi tải lại, và ghi kết quả thẳng vào tài liệu đã lưu (nếu trang đã nằm trong tài liệu).
// Đặt sau cờ `globalPipeline` (mặc định bật; tắt = hành vi cũ: bộ xử lý cục bộ trong màn Chụp).
import { bgQueue, type BgJob } from "../bg-queue";
import { ensureDocsLoaded, getDocs, saveDoc, type PageEdit } from "../db";
import { renderPage, targetLong } from "../image";
import { timed } from "../perf-stats";
import { getSettings } from "../settings";

export const pipelineEnabled = (): boolean => getSettings().globalPipeline !== false;

// ——— kết quả "bản đầy đủ" của trang CHƯA nằm trong tài liệu nào (còn trong khay màn Chụp) ———
type Listener = (pageId: string, src: string) => void;
const finished = new Map<string, string>();
const listeners = new Set<Listener>();
export const finishedStore = {
  get: (id: string) => finished.get(id),
  delete: (id: string) => { finished.delete(id); },
  subscribe: (fn: Listener) => { listeners.add(fn); return () => { listeners.delete(fn); }; },
  size: () => finished.size,
};

const DEFAULT_EDIT: PageEdit = { rotation: 0, filter: "original", brightness: 0, contrast: 0 };
const sameEdit = (a: PageEdit | undefined, b: PageEdit | undefined) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

let applyChain: Promise<unknown> = Promise.resolve();
/** Ghi bản đầy đủ vào trang trong tài liệu đã lưu. Trả true nếu đã ghi. Tuần tự hoá để hai trang cùng tài liệu không ghi đè nhau. */
export function applyFinished(pageId: string, src: string, edit: PageEdit | undefined): Promise<boolean> {
  const run = async () => {
    await ensureDocsLoaded().catch(() => {}); // tải lại ở màn không nạp tài liệu → vẫn tìm được trang trong kho
    const doc = getDocs().find((d) => d.pages.some((p) => p.id === pageId));
    if (!doc || doc.locked || doc.enc || doc.deletedAt) return false;
    const pg = doc.pages.find((p) => p.id === pageId)!;
    if (!sameEdit(pg.edit, edit)) return false; // người dùng đã sửa trang này trong lúc chờ → không ghi đè
    await saveDoc({ ...doc, pages: doc.pages.map((p) => (p.id === pageId ? { ...p, src } : p)) }, false);
    return true;
  };
  const p = applyChain.then(run, run);
  applyChain = p.catch(() => {});
  return p;
}

/** Bộ xử lý việc "finish": dựng bản đầy đủ; ghi vào tài liệu nếu trang đã lưu, không thì giữ cho màn Chụp nhận. */
export async function finishHandler(j: BgJob): Promise<void> {
  const full = j.payload.targetLong ?? targetLong(getSettings().quality === "normal" ? "normal" : "high");
  const src = await timed("finish", () => renderPage(j.payload.orig, j.payload.edit ?? DEFAULT_EDIT, full));
  if (await applyFinished(j.pageId, src, j.payload.edit ?? DEFAULT_EDIT)) return;
  finished.set(j.pageId, src);
  listeners.forEach((l) => l(j.pageId, src));
}

let started = false;
/** Gọi một lần ở gốc app: đăng ký bộ xử lý và chạy tiếp việc còn dở sau khi tải lại. Trả true nếu vừa khởi động. */
export function startPipeline(): boolean {
  if (started || typeof window === "undefined" || !pipelineEnabled()) return false;
  started = true;
  bgQueue.setHandler("finish", finishHandler);
  void bgQueue.resume().catch(() => {});
  return true;
}
/** Chỉ cho kiểm thử. */
export function _resetPipelineForTest() { started = false; finished.clear(); applyChain = Promise.resolve(); }
