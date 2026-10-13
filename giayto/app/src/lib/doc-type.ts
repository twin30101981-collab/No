// P8.2: nhận loại tài liệu từ chữ OCR — chấm điểm theo từ khoá + mẫu định dạng,
// không cần AI. Thuần, kiểm thử được. Kết quả dùng để gợi ý mẫu trích xuất (vn-templates).
import { VN_TEMPLATES, isLicenseNo, isPlate, isTaxCode, type VnTemplate } from "./vn-templates";

export type DocTypeGuess = {
  template: VnTemplate;
  /** Độ tin cậy 0–1: tỷ trọng điểm của mẫu thắng so với tổng điểm các mẫu. */
  confidence: number;
  /** Điểm từng mẫu (để ghi nhật ký / gỡ lỗi). */
  scores: Record<string, number>;
};

/** Bỏ dấu + thường hoá để so khớp từ khoá bền với lỗi OCR dấu tiếng Việt. */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ");
}

/** Từ khoá đặc trưng từng loại — từ dài/hiếm nặng điểm hơn. */
const KEYWORDS: Record<string, string[]> = {
  vat: ["hoa don", "gtgt", "vat", "ma so thue", "cong tien hang", "thue suat", "tien thue", "ma tra cuu", "don vi ban"],
  xe: ["dang ky xe", "giay chung nhan dang ky", "bien so", "so khung", "so may", "nhan hieu", "mau son", "ca vet"],
  sodo: ["so do", "so hong", "quyen su dung dat", "giay chung nhan quyen", "thua dat", "to ban do", "dien tich dat"],
  banglai: ["giay phep lai xe", "bang lai", "hang bang", "co quan cap", "driving license", "gplx"],
  khaisinh: ["giay khai sinh", "khai sinh", "ngay sinh", "noi sinh", "que quan", "dan toc", "ho ten cha", "ho ten me"],
  hopdong: ["hop dong", "ben a", "ben b", "ngay hieu luc", "ngay het han", "gia tri hop dong", "dieu khoan", "thoa thuan"],
};

/** Mẫu định dạng đặc trưng: khớp token nào trong văn bản thì cộng điểm cho loại tương ứng. */
const PATTERNS: { id: string; test: (token: string) => boolean; weight: number }[] = [
  { id: "xe", test: isPlate, weight: 3 },
  { id: "vat", test: isTaxCode, weight: 2 },
  { id: "banglai", test: isLicenseNo, weight: 2 },
];

/** Ngưỡng tối thiểu để coi là nhận được loại (tránh đoán bừa trên văn bản chung chung). */
export const DOC_TYPE_MIN_SCORE = 3;
export const DOC_TYPE_MIN_CONFIDENCE = 0.45;

function scoreOne(id: string, text: string, tokens: string[]): number {
  let score = 0;
  for (const kw of KEYWORDS[id] ?? []) {
    if (text.includes(kw)) score += kw.includes(" ") ? 2 : 1;
  }
  for (const p of PATTERNS) {
    if (p.id !== id) continue;
    if (tokens.some((t) => p.test(t))) score += p.weight;
  }
  return score;
}

/**
 * Nhận loại tài liệu từ chữ OCR của trang (hoặc gộp nhiều trang).
 * Trả null khi không mẫu nào đủ chắc — khi đó app giữ luồng AI "Tự nhận" như cũ.
 */
export function detectDocType(ocrText: string): DocTypeGuess | null {
  const text = normalizeText(ocrText);
  if (text.length < 10) return null;
  const tokens = text.split(/[^0-9a-zA-Z.-]+/).filter((t) => t.length >= 4);
  const scores: Record<string, number> = {};
  let best: VnTemplate | null = null;
  let total = 0;
  for (const t of VN_TEMPLATES) {
    const s = scoreOne(t.id, text, tokens);
    scores[t.id] = s;
    total += s;
    if (s > 0 && (!best || s > scores[best.id])) best = t;
  }
  if (!best || scores[best.id] < DOC_TYPE_MIN_SCORE || total === 0) return null;
  const confidence = scores[best.id] / total;
  if (confidence < DOC_TYPE_MIN_CONFIDENCE) return null;
  return { template: best, confidence: Math.round(confidence * 100) / 100, scores };
}
