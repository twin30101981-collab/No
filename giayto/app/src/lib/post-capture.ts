/** P8: tự động hoá sau chụp/thêm — nhận chữ nền cho trang mới + AI đặt tên (chỉ tài liệu mới). */
import type { Doc } from "./db";

export type PostCaptureSettings = { autoOcr: boolean; autoName: boolean };
export type PostCapturePlan = { ocrPageIds: string[]; autoName: boolean };

/** Thuần: chọn trang cần nhận chữ (mới thêm, chưa có chữ) và có đặt tên tự động không. */
export function planPostCapture(doc: Pick<Doc, "pages" | "locked">, before: Set<string>, isNewDoc: boolean, s: PostCaptureSettings, online: boolean): PostCapturePlan {
  if (doc.locked) return { ocrPageIds: [], autoName: false };
  const ocrPageIds = s.autoOcr ? doc.pages.filter((p) => !before.has(p.id) && !(p.text ?? "").trim()).map((p) => p.id) : [];
  return { ocrPageIds, autoName: isNewDoc && s.autoName && online };
}

/** Chạy kế hoạch: OCR qua hàng đợi nền dùng chung; đặt tên sau khi OCR xong (không chặn giao diện). */
export async function runPostCapture(doc: Doc, before: Set<string>, isNewDoc: boolean, metrics?: Map<string, import("./page-grade").PageMetrics>) {
  const { getSettings } = await import("./settings");
  const st = getSettings();
  const plan = planPostCapture(doc, before, isNewDoc, { autoOcr: st.autoOcr ?? true, autoName: st.autoName }, navigator.onLine);
  if (metrics?.size && st.autoRecipe !== false) void applyAutoRecipes(doc, before, metrics, st.defaultFilter); // P8.4
  if (plan.autoName) void import("./auto-name-run").then((m) => m.autoNameDoc(doc.id));
  if (!plan.ocrPageIds.length) return plan;
  const { ocrQueue } = await import("./ocr-queue");
  const idx = new Map(doc.pages.map((p, i) => [p.id, i]));
  const tasks = ocrQueue().add(plan.ocrPageIds.map((id) => ({ docId: doc.id, pageId: id, label: `${doc.name} · trang ${(idx.get(id) ?? 0) + 1}`, src: doc.pages[idx.get(id)!]!.src })));
  void Promise.allSettled(tasks);
  return plan;
}

/** P8.4: áp công thức xử lý cho trang mới (đọc lại bản mới nhất để không đè thay đổi của người dùng). */
async function applyAutoRecipes(doc: Doc, before: Set<string>, metrics: Map<string, import("./page-grade").PageMetrics>, defaultFilter: import("./db").Filter) {
  try {
    const [{ planRecipes, applyRecipes }, { detectDocType }, { combineDocType, docImageSignals, guessDocTypeFromImage }, { loadChoices }, db] = await Promise.all([import("./recipe-apply"), import("./doc-type"), import("./doc-type-image"), import("./user-recipe"), import("./db")]);
    const text = doc.pages.map((p) => p.text ?? "").join("\n");
    // R3.4: bổ sung tín hiệu ảnh (màu, dấu đỏ, tỉ lệ khung) từ trang mới đầu tiên.
    const newPage = doc.pages.find((p) => before.size === 0 || !before.has(p.id)) ?? doc.pages[0];
    const signals = newPage?.src ? await docImageSignals(newPage.src) : null;
    const docType = combineDocType(detectDocType(text), signals ? guessDocTypeFromImage(signals) : null);
    const changes = planRecipes(doc, before, metrics, defaultFilter, docType?.id ?? null, loadChoices());
    if (!changes.length) return;
    const fresh = db.getDocs().find((d) => d.id === doc.id) ?? doc;
    if (fresh.locked) return;
    await db.saveDoc({ ...fresh, pages: applyRecipes(fresh.pages, changes) });
  } catch { /* không chặn luồng chụp */ }
}
