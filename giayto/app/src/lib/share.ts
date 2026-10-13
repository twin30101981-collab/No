// TF-01 (TF-01/TF-02 của báo cáo): chia sẻ tệp qua bảng chia sẻ của máy mà KHÔNG im lặng.
// Lỗi gốc: app dựng PDF xong (vài giây → hàng chục giây) mới gọi navigator.share; trình duyệt chỉ cho chia sẻ ngay sau một cú chạm
// (user activation ngắn) nên ném NotAllowedError; shareOrDownload coi MỌI lỗi là "đã huỷ", không tải về, không báo → nút như không làm gì.
import { toast } from "sonner";

export type ShareOutcome = "shared" | "cancelled" | "unsupported" | "needs-tap" | "failed";

/** Phân loại lỗi navigator.share: AbortError = người dùng đóng bảng; NotAllowedError = hết "quyền chia sẻ" của lần chạm. */
export function classifyShareError(e: unknown): "cancelled" | "needs-tap" | "failed" {
  const n = (e as { name?: string } | null)?.name;
  if (n === "AbortError") return "cancelled";
  if (n === "NotAllowedError") return "needs-tap";
  return "failed";
}

/** Máy có bảng chia sẻ VÀ chấp nhận đúng loại tệp này (nhiều máy từ chối ZIP/DOCX/XLSX). */
export function canShareThisFile(file: File): boolean {
  try { return typeof navigator !== "undefined" && typeof navigator.share === "function" && !!navigator.canShare?.({ files: [file] }); } catch { return false; }
}

export async function tryShare(file: File, data: { title?: string; text?: string } = {}): Promise<ShareOutcome> {
  if (!canShareThisFile(file)) return "unsupported";
  try { await navigator.share({ files: [file], title: data.title ?? file.name, ...(data.text ? { text: data.text } : {}) }); return "shared"; }
  catch (e) { return classifyShareError(e); }
}

/** Tệp đã dựng xong nhưng lần chạm đã hết hiệu lực: hiện thẻ để người dùng chạm lần 2 (chạm mới = quyền mới). */
function offerTap(file: File, data: { title?: string; text?: string }, save: (b: Blob, n: string) => void) {
  const big = { minHeight: 40, padding: "0 14px", fontSize: 14, fontWeight: 600 } as const; // vùng chạm ≥ 40 px (quy ước HM-05)
  toast("Tệp đã sẵn sàng", {
    actionButtonStyle: big, cancelButtonStyle: big,
    description: `“${file.name}” — chạm Chia sẻ để chọn Zalo, email…`, duration: 20000,
    action: { label: "Chia sẻ", onClick: () => { void tryShare(file, data).then((r) => {
      if (r === "unsupported" || r === "failed" || r === "needs-tap") { save(file, file.name); toast.info(`Không mở được bảng chia sẻ — đã lưu “${file.name}” về máy`); }
    }); } },
    cancel: { label: "Lưu về máy", onClick: () => { save(file, file.name); toast.success(`Đã lưu “${file.name}”`); } },
  });
}

/** Chia sẻ, hoặc lưu về máy kèm thông báo rõ ràng — không bao giờ để nút "không làm gì". */
export async function shareOrSave(blob: Blob, name: string, save: (b: Blob, n: string) => void, data: { title?: string; text?: string } = {}): Promise<"shared" | "cancelled" | "downloaded" | "needs-tap"> {
  const file = new File([blob], name, { type: blob.type });
  const r = await tryShare(file, data);
  if (r === "shared" || r === "cancelled") return r;
  if (r === "needs-tap") { offerTap(file, data, save); return "needs-tap"; }
  save(blob, name);
  if (r === "unsupported") {
    const phone = typeof navigator !== "undefined" && typeof navigator.share === "function";
    toast.info(phone ? `Máy không chia sẻ được loại tệp này — đã lưu “${name}” về máy` : `Đã lưu “${name}”`);
  } else toast.error("Không mở được bảng chia sẻ", { description: `Đã lưu “${name}” về máy để bạn gửi thủ công.` });
  return "downloaded";
}
export { offerTap as offerTapToShare };
