/**
 * Field test on real phone photos: per-photo detector result vs the user's verdict,
 * aggregated into a small report (numbers only, no images) used to tune thresholds.
 * Pure — the screen /field-test feeds it.
 */
import type { Quad } from "./db";
import { cornerError } from "./crop-bench";

export type FieldSample = {
  id: string; name: string; width: number; height: number; ms: number;
  detected: Quad | null; truth: Quad | null; // truth = user-confirmed/corrected frame; null = no paper
  verdict: "ok" | "fixed" | "nopaper" | "pending";
  quality: { score: number; level: string; blur: number; brightness: number; contrast: number; glare: number; skew: number };
};

export type FieldReport = {
  device: string; total: number; judged: number;
  hit: number; miss: number; falseFind: number; hitRate: number;
  meanError: number; worstError: number; medianMs: number; slowMs: number;
  qualityByVerdict: { ok: number; fixed: number };
  suggestions: string[];
};

const median = (a: number[]) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const mean = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const r3 = (x: number) => Math.round(x * 1000) / 1000;

/** Error ≤ tol (share of diagonal) counts as a correct detection. */
export function fieldReport(samples: FieldSample[], device = "", tol = 0.03): FieldReport {
  const judged = samples.filter((s) => s.verdict !== "pending");
  let hit = 0, miss = 0, falseFind = 0; const errs: number[] = [];
  for (const s of judged) {
    if (!s.truth) { if (s.detected) falseFind++; continue; }
    if (!s.detected) { miss++; continue; }
    const e = cornerError(s.detected, s.truth, s.width, s.height); errs.push(e);
    if (e <= tol) hit++; else miss++;
  }
  const withPaper = judged.filter((s) => s.truth).length;
  const ms = samples.map((s) => s.ms);
  const q = (v: string) => r3(mean(judged.filter((s) => s.verdict === v).map((s) => s.quality.score)));
  const rep: FieldReport = {
    device, total: samples.length, judged: judged.length, hit, miss, falseFind,
    hitRate: withPaper ? r3(hit / withPaper) : 0, meanError: r3(mean(errs)), worstError: r3(Math.max(0, ...errs)),
    medianMs: Math.round(median(ms)), slowMs: Math.round(Math.max(0, ...ms)),
    qualityByVerdict: { ok: q("ok"), fixed: q("fixed") }, suggestions: [],
  };
  if (withPaper >= 5 && rep.hitRate < 0.8) rep.suggestions.push("Tỉ lệ dò đúng dưới 80%: nên nới ngưỡng điểm khung hoặc dùng AI dò mép sớm hơn.");
  if (falseFind >= 2) rep.suggestions.push("Có ảnh không có giấy mà app vẫn thấy khung: nên tăng ngưỡng điểm khung.");
  if (rep.medianMs > 800) rep.suggestions.push("Dò khung chậm trên máy này: nên giảm cỡ ảnh dò.");
  const okBlur = judged.filter((s) => s.verdict !== "nopaper").map((s) => s.quality.blur);
  if (okBlur.length >= 5 && median(okBlur) < 35) rep.suggestions.push("Độ nét trung vị thấp hơn ngưỡng cảnh báo: có thể ngưỡng mờ quá chặt với máy này.");
  return rep;
}

const KEY = "gn-field-test";
export function loadField(): FieldSample[] { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } }
export function saveField(l: FieldSample[]) { localStorage.setItem(KEY, JSON.stringify(l)); }
