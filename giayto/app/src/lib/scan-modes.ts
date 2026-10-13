// Chế độ quét — tách khỏi route để dùng chung giữa kiểm tham số và giao diện.
export const MODES = { doc: "Tài liệu", id: "Thẻ CCCD", book: "Sách", whiteboard: "Bảng trắng", passport: "Hộ chiếu", photo: "Ảnh", qr: "Mã QR" } as const;
export type Mode = keyof typeof MODES;
