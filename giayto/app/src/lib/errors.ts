import { toast } from "sonner";
import { SCAN_ERRORS } from "./scan-errors";

/** Chuyển lỗi kỹ thuật thành câu dễ hiểu + gợi ý cách xử lý. */
export function friendlyError(e: unknown): { title: string; hint: string } {
  const name = (e as { name?: string })?.name ?? "";
  const msg = String((e as { message?: string })?.message ?? e ?? "");
  if (name === "XlsxError") { const x = SCAN_ERRORS.XLSX_UNREADABLE; return { title: x.message.replace(/\.$/, ""), hint: x.hint }; }
  if (name === "NotAllowedError" || /permission/i.test(msg)) return { title: "Chưa được cấp quyền", hint: "Mở cài đặt trình duyệt và cho phép camera/tệp cho trang này." };
  if (name === "NotFoundError" || /no camera|device not found/i.test(msg)) return { title: "Không tìm thấy camera", hint: "Dùng nút Nhập ảnh để chọn ảnh có sẵn." };
  if (name === "NotReadableError") return { title: "Camera đang bận", hint: "Đóng ứng dụng khác đang dùng camera rồi thử lại." };
  if (name === "QuotaExceededError" || /quota/i.test(msg)) return { title: "Bộ nhớ máy đã đầy", hint: "Xoá bớt tài liệu hoặc sao lưu ra tệp rồi xoá." };
  if (/hết lượt ai/i.test(msg)) return { title: "Đã hết lượt AI trong giờ này", hint: "Thử lại sau ít phút. Quét, cắt, xuất PDF vẫn dùng bình thường." };
  if (name === "OcrUnavailableError" || /importscripts|traineddata|failed to load/i.test(msg)) return { title: "Chưa tải được gói nhận chữ", hint: "Lần đầu cần mạng. Khi có mạng, vào Tôi → “Tải sẵn để mở app & nhận chữ khi mất mạng”, rồi thử lại." };
  if (/network|fetch|load failed/i.test(msg)) return { title: "Mất kết nối mạng", hint: "Nhận chữ lần đầu cần mạng để tải dữ liệu ngôn ngữ. Kiểm tra mạng và thử lại." };
  if (/decode|image|corrupt/i.test(msg)) return { title: "Không đọc được ảnh", hint: "Tệp có thể bị hỏng hoặc không phải ảnh. Thử tệp khác." };
  if (/json/i.test(msg)) return { title: "Tệp không đúng định dạng", hint: "Hãy chọn tệp sao lưu tạo từ Ghi Nhanh." };
  return { title: "Đã có lỗi xảy ra", hint: "Thử lại. Nếu vẫn lỗi, tải lại trang." };
}
export function showError(e: unknown, context?: string) {
  console.error(e);
  const f = friendlyError(e);
  toast.error(context ? `${context}: ${f.title}` : f.title, { description: f.hint });
}
/** Bắt mọi lỗi chưa xử lý và hiện thông báo dễ hiểu. */
export function installGlobalErrorToasts() {
  const onRej = (ev: PromiseRejectionEvent) => { if ((ev.reason as { name?: string })?.name === "AbortError") return; showError(ev.reason); };
  window.addEventListener("unhandledrejection", onRej);
  return () => window.removeEventListener("unhandledrejection", onRej);
}
