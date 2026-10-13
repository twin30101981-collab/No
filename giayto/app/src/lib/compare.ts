/**
 * Mục 3 — So sánh Ghi Nhanh với CamScanner.
 * Đo cùng một bộ chỉ số trên hai ảnh của cùng một tờ biên bản rồi chấm thắng/thua theo từng tiêu chí.
 */
import { detectPaper } from "./detect";
import { estimateSkew, glare, loadImg, sharpness, tilt } from "./image";
import { recognize } from "./ocr";

export type Metrics = {
  width: number; height: number;
  edgeFound: boolean; edgeScore: number; // nhận diện mép giấy
  perspective: number;                   // 0 = phẳng, càng lớn càng méo
  skewDeg: number;                       // nghiêng dòng chữ còn lại
  blur: number;                          // độ nét (Laplacian)
  contrast: number; brightness: number;  // độ lệch chuẩn / trung bình độ sáng
  glare: number;                         // tỉ lệ điểm cháy sáng 0..1
  darkShare: number;                     // tỉ lệ vùng quá tối (ánh sáng yếu)
  inkShare: number;                      // tỉ lệ nét chữ còn giữ được
  analyzeMs: number;
  ocrChars?: number; ocrWords?: number; ocrMs?: number; ocrText?: string;
  aiFields?: number; aiConfidence?: number; aiMs?: number; aiError?: string;
};

function stats(img: HTMLImageElement) {
  const s = 400 / Math.max(img.naturalWidth, img.naturalHeight);
  const w = Math.max(8, Math.round(img.naturalWidth * s)), h = Math.max(8, Math.round(img.naturalHeight * s));
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!; ctx.drawImage(img, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data; const n = w * h;
  let sum = 0, sq = 0, dark = 0; const L = new Float32Array(n);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) { const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; L[p] = l; sum += l; sq += l * l; if (l < 50) dark++; }
  const mean = sum / n; let ink = 0; for (let p = 0; p < n; p++) if (L[p] < mean - 40) ink++;
  return { c, mean, std: Math.sqrt(Math.max(0, sq / n - mean * mean)), darkShare: dark / n, inkShare: ink / n };
}

export async function analyze(src: string): Promise<Metrics> {
  const t0 = performance.now();
  const img = await loadImg(src); const W = img.naturalWidth, H = img.naturalHeight;
  const det = detectPaper(img, W, H);
  const st = stats(img);
  const skew = estimateSkew(st.c); st.c.width = 0;
  return {
    width: W, height: H,
    edgeFound: !!det, edgeScore: det ? +det.score.toFixed(2) : 0,
    perspective: det ? +tilt(det.quad).toFixed(3) : 0,
    skewDeg: +Math.abs(skew).toFixed(2),
    blur: Math.round(sharpness(img, W, H)),
    contrast: Math.round(st.std), brightness: Math.round(st.mean),
    glare: +glare(img, W, H).toFixed(4), darkShare: +st.darkShare.toFixed(3), inkShare: +st.inkShare.toFixed(3),
    analyzeMs: Math.round(performance.now() - t0),
  };
}

export async function runOcr(src: string) {
  const t0 = performance.now(); const text = (await recognize(src)) || "";
  return { ocrText: text, ocrChars: text.replace(/\s/g, "").length, ocrWords: text.split(/\s+/).filter((w) => w.length > 1).length, ocrMs: Math.round(performance.now() - t0) };
}

export type Verdict = "gn" | "cs" | "tie" | "na";
export type Row = { key: string; label: string; target: string; gn: string; cs: string; verdict: Verdict };

const cmp = (a: number, b: number, higherBetter: boolean, tol = 0.05): Verdict => {
  if (!isFinite(a) || !isFinite(b)) return "na";
  const m = Math.max(Math.abs(a), Math.abs(b), 1e-9); if (Math.abs(a - b) / m <= tol) return "tie";
  return (a > b) === higherBetter ? "gn" : "cs";
};
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

/** Bảng tiêu chí đúng thứ tự mục 3.2. */
export function buildRows(g: Metrics, c: Metrics): Row[] {
  const lowLight = (m: Metrics) => m.brightness * (1 - m.darkShare);
  const smallText = (m: Metrics) => m.blur * Math.min(1, Math.min(m.width, m.height) / 1500);
  const rows: Row[] = [
    { key: "edge", label: "Nhận diện mép giấy", target: "Ổn định", gn: g.edgeFound ? `Có (${g.edgeScore})` : "Không thấy", cs: c.edgeFound ? `Có (${c.edgeScore})` : "Không thấy / đã cắt sát", verdict: g.edgeFound === c.edgeFound ? "tie" : g.edgeFound ? "gn" : "cs" },
    { key: "persp", label: "Căn chỉnh phối cảnh", target: "Tự động", gn: g.perspective.toFixed(3), cs: c.perspective.toFixed(3), verdict: cmp(g.perspective, c.perspective, false, 0.15) },
    { key: "skew", label: "Độ nghiêng", target: "Tự động deskew", gn: `${g.skewDeg}°`, cs: `${c.skewDeg}°`, verdict: Math.abs(g.skewDeg - c.skewDeg) < 0.3 ? "tie" : g.skewDeg < c.skewDeg ? "gn" : "cs" },
    { key: "blur", label: "Độ nét", target: "Tối ưu OCR", gn: String(g.blur), cs: String(c.blur), verdict: cmp(g.blur, c.blur, true) },
    { key: "contrast", label: "Độ tương phản", target: "Tự động điều chỉnh", gn: String(g.contrast), cs: String(c.contrast), verdict: cmp(g.contrast, c.contrast, true) },
    { key: "glare", label: "Chói đèn", target: "Phát hiện/cảnh báo", gn: pct(g.glare), cs: pct(c.glare), verdict: Math.abs(g.glare - c.glare) < 0.002 ? "tie" : g.glare < c.glare ? "gn" : "cs" },
    { key: "lowlight", label: "Ánh sáng yếu", target: "Tăng khả năng đọc", gn: `${g.brightness} / tối ${pct(g.darkShare)}`, cs: `${c.brightness} / tối ${pct(c.darkShare)}`, verdict: cmp(lowLight(g), lowLight(c), true) },
    { key: "small", label: "Chữ nhỏ", target: "Ưu tiên OCR", gn: `${Math.round(smallText(g))}`, cs: `${Math.round(smallText(c))}`, verdict: cmp(smallText(g), smallText(c), true) },
    { key: "output", label: "Chất lượng ảnh đầu ra", target: "Không làm mất chữ", gn: `${g.width}×${g.height}, nét chữ ${pct(g.inkShare)}`, cs: `${c.width}×${c.height}, nét chữ ${pct(c.inkShare)}`, verdict: g.ocrChars != null && c.ocrChars != null ? cmp(g.ocrChars, c.ocrChars, true) : cmp(g.inkShare, c.inkShare, true) },
    { key: "speed", label: "Tốc độ xử lý", target: "Tối ưu", gn: `${g.analyzeMs + (g.ocrMs ?? 0)} ms`, cs: `${c.analyzeMs + (c.ocrMs ?? 0)} ms`, verdict: cmp(g.analyzeMs + (g.ocrMs ?? 0), c.analyzeMs + (c.ocrMs ?? 0), false, 0.1) },
  ];
  const ai = (m: Metrics) => m.aiError ? `Lỗi: ${m.aiError}` : m.aiFields != null ? `${m.aiFields} trường, tin cậy ${Math.round((m.aiConfidence ?? 0) * 100)}%, ${m.aiMs} ms` : "Chưa chạy";
  const aiScore = (m: Metrics) => m.aiFields == null || m.aiError ? NaN : m.aiFields * (m.aiConfidence ?? 0);
  rows.push({ key: "ai", label: "AI trích xuất", target: "Tăng độ chính xác", gn: ai(g), cs: ai(c), verdict: cmp(aiScore(g), aiScore(c), true) });
  return rows;
}

/** Độ trùng khớp chữ OCR giữa hai ảnh (Jaccard trên từ), giúp đối chiếu nội dung. */
export function textAgreement(a = "", b = "") {
  const t = (s: string) => new Set(s.toLowerCase().normalize("NFC").split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 1));
  const A = t(a), B = t(b); if (!A.size && !B.size) return 0;
  let i = 0; A.forEach((w) => { if (B.has(w)) i++; }); return i / (A.size + B.size - i);
}

export function reportMarkdown(cond: string, rows: Row[], g: Metrics, c: Metrics) {
  const v = { gn: "Ghi Nhanh tốt hơn", cs: "CamScanner tốt hơn", tie: "Ngang nhau", na: "—" };
  const lines = [
    `# Báo cáo so sánh Ghi Nhanh – CamScanner`, ``, `- Thời gian: ${new Date().toLocaleString("vi-VN")}`, `- Điều kiện chụp: ${cond || "(không ghi)"}`,
    `- Thiết bị: ${navigator.userAgent}`, `- Độ trùng khớp chữ OCR: ${pct(textAgreement(g.ocrText, c.ocrText))}`, ``,
    `| Tiêu chí | Ghi Nhanh | CamScanner | Kết luận | Mục tiêu nâng cấp |`, `|---|---|---|---|---|`,
    ...rows.map((r) => `| ${r.label} | ${r.gn} | ${r.cs} | ${v[r.verdict]} | ${r.target} |`), ``,
    `Tổng: Ghi Nhanh thắng ${rows.filter((r) => r.verdict === "gn").length}, CamScanner thắng ${rows.filter((r) => r.verdict === "cs").length}, hoà ${rows.filter((r) => r.verdict === "tie").length}.`,
    ``, `## Số liệu thô`, "```json", JSON.stringify({ ghiNhanh: { ...g, ocrText: undefined }, camScanner: { ...c, ocrText: undefined } }, null, 2), "```",
  ];
  return lines.join("\n");
}
