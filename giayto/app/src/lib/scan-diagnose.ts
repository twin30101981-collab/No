/** S12 – Chẩn đoán ảnh quét bằng AI: phần thuần (chặn ảnh hỏng, chuẩn hoá kết quả, khoá phiên bản). */

export const DIAG_GROUPS = ["shadow", "edge_noise", "cut_text", "skew"] as const;
export type DiagGroup = (typeof DIAG_GROUPS)[number];
export const DIAG_LABEL: Record<DiagGroup, string> = {
  shadow: "Bóng/vệt tối",
  edge_noise: "Rác mép",
  cut_text: "Mất chữ mép",
  skew: "Dòng cong/nghiêng",
};

export type DiagRegion = { x: number; y: number; w: number; h: number };
export type DiagIssue = { group: DiagGroup; severity: number; confidence: number; note: string; regions: DiagRegion[] };
export type Diagnosis = { version: string; issues: DiagIssue[]; summary: string };

export const MIN_SIDE = 800;
/** Trần chuỗi data URL máy chủ nhận cho chẩn đoán (aiScanDiagnose dùng đúng hằng này). */
export const MAX_DATA_CHARS = 4_000_000;
/** Trần dung lượng nhị phân: base64 nở 4/3, chừa 64 ký tự cho tiền tố "data:image/…;base64,". ≈ 3 MB. */
export const MAX_BYTES = Math.floor((MAX_DATA_CHARS - 64) * 0.75);

export type GuardResult = { ok: true } | { ok: false; reason: string };

/** Chặn trước khi gửi: ảnh hỏng, quá nhỏ, quá lớn, ngoại tuyến. */
export function guardImage(i: { width: number; height: number; bytes: number; online: boolean }): GuardResult {
  if (!i.online) return { ok: false, reason: "Đang ngoại tuyến – chẩn đoán AI cần mạng." };
  if (!(i.width > 0 && i.height > 0 && i.bytes > 0)) return { ok: false, reason: "Ảnh hỏng, không đọc được." };
  if (Math.min(i.width, i.height) < MIN_SIDE) return { ok: false, reason: `Ảnh quá nhỏ (cạnh ngắn < ${MIN_SIDE}px).` };
  if (i.bytes > MAX_BYTES) return { ok: false, reason: "Ảnh quá lớn để gửi (> 3 MB). Thử trang chưa làm nét HD." };
  return { ok: true };
}

/** Khoá phiên bản ảnh: cùng trang + cùng bộ lọc + cùng nội dung → cùng khoá. */
export function imageVersion(pageId: string, filter: string, data: string): string {
  let h = 2166136261;
  const step = Math.max(1, Math.floor(data.length / 4096));
  for (let k = 0; k < data.length; k += step) { h ^= data.charCodeAt(k); h = Math.imul(h, 16777619); }
  return `${pageId}:${filter}:${data.length}:${(h >>> 0).toString(36)}`;
}

/** Kết quả chỉ được gắn khi phiên bản còn khớp ảnh hiện tại. */
export function matchesVersion(d: Diagnosis | null | undefined, current: string): boolean {
  return !!d && d.version === current;
}

const clamp01 = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0; };

/** Chuẩn hoá câu trả lời AI: bỏ nhóm lạ, kẹp toạ độ/điểm, gộp trùng nhóm, sắp theo mức nặng. */
export function normalizeDiagnosis(raw: unknown, version: string): Diagnosis {
  const r = (raw ?? {}) as { issues?: unknown; summary?: unknown };
  const by = new Map<DiagGroup, DiagIssue>();
  for (const it of Array.isArray(r.issues) ? r.issues : []) {
    const o = it as { group?: unknown; severity?: unknown; confidence?: unknown; note?: unknown; regions?: unknown };
    const g = o.group as DiagGroup;
    if (!DIAG_GROUPS.includes(g)) continue;
    const regions = (Array.isArray(o.regions) ? o.regions : []).map((q) => {
      const p = q as { x?: unknown; y?: unknown; w?: unknown; h?: unknown };
      const x = clamp01(p.x), y = clamp01(p.y);
      return { x, y, w: Math.min(clamp01(p.w), 1 - x), h: Math.min(clamp01(p.h), 1 - y) };
    }).filter((q) => q.w > 0.005 && q.h > 0.005).slice(0, 8);
    const issue: DiagIssue = { group: g, severity: clamp01(o.severity), confidence: clamp01(o.confidence), note: String(o.note ?? "").slice(0, 200), regions };
    const prev = by.get(g);
    if (!prev) by.set(g, issue);
    else by.set(g, { ...prev, severity: Math.max(prev.severity, issue.severity), confidence: Math.max(prev.confidence, issue.confidence), regions: [...prev.regions, ...issue.regions].slice(0, 8) });
  }
  const issues = [...by.values()].filter((i) => i.severity > 0).sort((a, b) => b.severity - a.severity);
  return { version, issues, summary: String(r.summary ?? "").slice(0, 300) };
}

/** Thông báo dự phòng theo mã lỗi (402/429/ngoại tuyến/khác). */
export function diagFallback(code: number | "offline"): string {
  if (code === "offline") return "Đang ngoại tuyến. Ảnh vẫn được xử lý tự động; thử chẩn đoán khi có mạng.";
  if (code === 402) return "Hết lượt AI. Ảnh vẫn dùng được với xử lý tự động.";
  if (code === 429) return "AI đang quá tải, hãy thử lại sau khoảng một phút.";
  return "Chưa chẩn đoán được. Ảnh vẫn dùng được với xử lý tự động.";
}

/** Dòng log an toàn: chỉ mã và số lượng, không chứa nội dung tài liệu. */
export function diagLogLine(version: string, d: Diagnosis | null, code?: number): string {
  const ver = version.split(":").slice(1).join(":");
  return d ? `[s12] ok v=${ver} issues=${d.issues.map((i) => i.group).join(",") || "none"}` : `[s12] fail v=${ver} code=${code ?? 0}`;
}
