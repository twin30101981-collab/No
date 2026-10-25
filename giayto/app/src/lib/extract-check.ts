import { checkTemplateFields, templateByType } from "./vn-templates";
/** Kiểm tra kết quả AI: schema → trường bắt buộc → độ chắc chắn → Chấp nhận / Cần xem lại. */
export type ExtractionLike = { type: string; title: string; summary: string; keyPoints: string[]; confidence: number; fields: { label: string; value: string }[]; tags: string[] };
export type FieldCheck = { label: string; value: string; ok: boolean };
export type CheckResult = { valid: boolean; verdict: "accept" | "review"; checks: FieldCheck[]; missing: string[]; empty: boolean; notes?: string[] };

/** Trường quan trọng theo loại tài liệu (so khớp không phân biệt hoa thường, theo từ khoá). */
export const REQUIRED_FIELDS: Record<string, string[]> = {
  "Biên bản": ["Ngày", "Nội dung", "Thành phần|Bên|Người"],
  "Hoá đơn": ["Số tiền|Tổng", "Ngày", "Bên bán|Người bán|Đơn vị bán"],
  "Biên lai": ["Số tiền|Tổng", "Ngày"],
  "Hợp đồng": ["Các bên|Bên", "Ngày ký|Ngày"],
  "CCCD/Hộ chiếu": ["Họ tên", "Số giấy tờ|Số", "Ngày sinh"],
  "Danh thiếp": ["Họ tên", "Điện thoại|Email"],
};
export const CONFIDENCE_REVIEW = 0.6;

const norm = (s: string) => s.normalize("NFC").toLowerCase();

export function isExtraction(x: unknown): x is ExtractionLike {
  const o = x as Partial<Record<keyof ExtractionLike, unknown>>;
  return !!o && typeof o === "object" && typeof o.type === "string" && typeof o.title === "string" && typeof o.summary === "string"
    && Array.isArray(o.keyPoints) && typeof o.confidence === "number" && Array.isArray(o.tags)
    && Array.isArray(o.fields) && (o.fields as unknown[]).every((f) => !!f && typeof (f as { label?: unknown }).label === "string" && typeof (f as { value?: unknown }).value === "string");
}

export function checkExtraction(x: unknown): CheckResult {
  if (!isExtraction(x)) return { valid: false, verdict: "review", checks: [], missing: [], empty: true };
  const filled = x.fields.filter((f) => f.value.trim());
  const empty = !filled.length && !x.summary.trim() && !x.keyPoints.some((k) => k.trim());
  const tpl = templateByType(x.type);
  const tc = tpl ? checkTemplateFields(tpl, filled) : null;
  const req = tc ? tc.required : REQUIRED_FIELDS[x.type] ?? [];
  const checks: FieldCheck[] = filled.map((f) => ({ label: f.label, value: f.value, ok: !/[?…]{2,}|không rõ|không đọc/i.test(f.value) && !tc?.bad.includes(f.label) }));
  const missing = req.filter((alts) => !filled.some((f) => alts.split("|").some((a) => norm(f.label).includes(norm(a))))).map((a) => a.split("|")[0]);
  missing.forEach((m) => checks.push({ label: m, value: "", ok: false }));
  const verdict = !empty && !missing.length && checks.every((c) => c.ok) && x.confidence >= CONFIDENCE_REVIEW ? "accept" : "review";
  return { valid: true, verdict, checks, missing, empty, notes: tc?.notes ?? [] };
}
