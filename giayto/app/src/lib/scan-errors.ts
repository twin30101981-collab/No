/** Danh mục mã lỗi quét/AI: mã kỹ thuật + thông báo người dùng + hướng xử lý. */
export const SCAN_ERRORS = {
  SCAN_CAMERA_ERROR: { message: "Không mở được camera.", hint: "Đóng ứng dụng khác đang dùng camera rồi thử lại, hoặc dùng Nhập ảnh." },
  SCAN_PERMISSION_DENIED: { message: "Chưa được cấp quyền camera.", hint: "Mở cài đặt trình duyệt và cho phép camera cho trang này." },
  SCAN_IMAGE_TOO_BLURRY: { message: "Ảnh bị mờ.", hint: "Giữ điện thoại ổn định, chạm vào giấy để lấy nét rồi chụp lại." },
  SCAN_EXCESSIVE_SKEW: { message: "Biên bản đang bị nghiêng.", hint: "Vui lòng đặt điện thoại thẳng hơn, song song với tờ giấy." },
  SCAN_EXCESSIVE_GLARE: { message: "Ảnh đang bị chói đèn tại vùng nội dung.", hint: "Vui lòng thay đổi góc điện thoại hoặc vị trí ánh sáng." },
  SCAN_LOW_CONTRAST: { message: "Ảnh tối hoặc chữ quá nhạt.", hint: "Bật thêm đèn hoặc chụp gần nguồn sáng." },
  SCAN_LOW_RESOLUTION: { message: "Ảnh có độ phân giải thấp, chữ nhỏ khó đọc.", hint: "Đưa điện thoại gần hơn để tờ giấy chiếm gần hết khung." },
  SCAN_DOCUMENT_NOT_FOUND: { message: "Không thấy rõ mép giấy.", hint: "Đưa toàn bộ biên bản vào khung, đặt trên nền tối hơn giấy." },
  OCR_FAILED: { message: "Không nhận được chữ trong ảnh.", hint: "Chụp lại gần hơn, đủ sáng và giữ giấy phẳng." },
  AI_EXTRACTION_FAILED: { message: "AI chưa trích xuất được nội dung.", hint: "Bấm Thử lại, hoặc chụp lại ảnh rõ hơn." },
  AI_INVALID_RESPONSE: { message: "AI trả về dữ liệu không hợp lệ.", hint: "Bấm Thử lại. Nếu vẫn lỗi, hãy chụp lại." },
  AI_TIMEOUT: { message: "AI phản hồi quá lâu.", hint: "Kiểm tra mạng rồi bấm Thử lại." },
  AI_EMPTY_RESULT: { message: "AI không đọc được nội dung nào.", hint: "Chụp lại gần hơn, đủ sáng và giữ giấy phẳng." },
  AI_NETWORK: { message: "Không gửi được ảnh.", hint: "Kiểm tra kết nối mạng rồi bấm Thử lại." },
  AI_BLOCKED: { message: "AI tạm thời không dùng được cho ứng dụng này.", hint: "Liên hệ chủ ứng dụng. Ảnh và tài liệu của bạn vẫn được giữ nguyên." },
  AI_LIMIT: { message: "Đã hết lượt AI trong giờ này.", hint: "Thử lại sau ít phút. Quét, cắt, xuất PDF vẫn dùng bình thường." },
  AI_BUSY: { message: "AI đang quá tải.", hint: "Đợi khoảng một phút rồi bấm Thử lại." },
  XLSX_UNREADABLE: { message: "Không đọc được tệp Excel.", hint: "Hãy lưu lại dạng .xlsx (không đặt mật khẩu) rồi thử lại." },
} as const;
export type ScanErrorCode = keyof typeof SCAN_ERRORS;

/** Phân loại kết quả lỗi từ máy chủ AI thành mã lỗi chuẩn. code=0 nghĩa là lỗi mạng phía máy. */
export function classifyAiFailure(code: number, message = ""): ScanErrorCode {
  if (code === 0) return /timeout|quá lâu/i.test(message) ? "AI_TIMEOUT" : "AI_NETWORK";
  if (code === 402 || code === 403 || code === 401) return "AI_BLOCKED";
  if (code === 429) return /hết lượt/i.test(message) ? "AI_LIMIT" : "AI_BUSY";
  if (code === 408 || code === 504) return "AI_TIMEOUT";
  if (code === 400) return "AI_INVALID_RESPONSE";
  return "AI_EXTRACTION_FAILED";
}

/** Chỉ tự thử lại cho lỗi có thể khắc phục bằng ảnh tốt hơn hoặc lỗi tạm thời; không bao giờ cho lỗi bị chặn/hết lượt. */
export const isAutoRetryable = (c: ScanErrorCode) => c !== "AI_BLOCKED" && c !== "AI_BUSY" && c !== "AI_LIMIT";

export const MAX_AUTO_RETRY = 1;
