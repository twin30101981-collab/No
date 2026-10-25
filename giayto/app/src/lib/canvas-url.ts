/**
 * R1.3 (TD-04) – xuất canvas thành Blob/object URL thay vì chuỗi base64 data URL.
 * Canvas được giải phóng (width = 0) ngay sau khi mã hoá để iPhone không giữ bộ nhớ ảnh.
 */
import { adoptBlob } from "./disk-pack";

export function canvasToBlob(c: HTMLCanvasElement, type = "image/png", quality?: number): Promise<Blob> {
  return new Promise((ok, bad) => c.toBlob((b) => (b ? ok(b) : bad(new Error("Ảnh quá lớn để tạo"))), type, quality));
}

/** Object URL tạm (xem trước/lớp phủ): người gọi phải gọi URL.revokeObjectURL khi xong. */
export async function canvasToTempUrl(c: HTMLCanvasElement, type = "image/png", quality?: number): Promise<string> {
  const b = await canvasToBlob(c, type, quality); c.width = 0;
  return URL.createObjectURL(b);
}

/** Object URL của trang: đã đăng ký với kho tài liệu, nên lưu/thu hồi cùng tài liệu. */
export async function canvasToPageUrl(c: HTMLCanvasElement, type = "image/jpeg", quality?: number): Promise<string> {
  const b = await canvasToBlob(c, type, quality); c.width = 0;
  return adoptBlob(b);
}

/** Thu hồi object URL tạm; bỏ qua chuỗi không phải blob:. */
export function revokeTemp(u: string | null | undefined) {
  if (u && u.startsWith("blob:")) URL.revokeObjectURL(u);
}
