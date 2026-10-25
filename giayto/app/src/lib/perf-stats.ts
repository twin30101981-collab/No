/**
 * G2-16 — Đo tốc độ và tỉ lệ lỗi. Ghi mẫu thời gian (nắn ảnh, nhận khung) vào máy, tối đa 200 mục,
 * gộp với nhật ký AI (scan-log) thành báo cáo trong trang Tôi. Không lưu ảnh hay nội dung.
 */
import type { ScanLogEntry } from "./scan-log";

/** S1: thêm chuỗi công đoạn chụp grab → detect1 → normalize → detect2 → render → release (nhả nút). */
export const STAGES = ["grab", "detect1", "normalize", "detect2", "render", "release"] as const;
export type Stage = (typeof STAGES)[number];
export type PerfKind = "warp-gpu" | "warp-cpu" | "detect" | "preview-shown" | "finish" | Stage;
export type PerfSample = { k: PerfKind; ms: number; at: number };
export type Stat = { count: number; median: number; p90: number };
export type PerfReport = { warpGpu: Stat; warpCpu: Stat; detect: Stat; ai: Stat & { ok: number; fail: number; errorRate: number }; topErrors: { code: string; n: number }[] };

const KEY = "ghi-nhanh:perf";

/** Đo một tác vụ bất đồng bộ và ghi vào perf-stats (kể cả khi lỗi). */
export async function timed<T>(k: PerfKind, fn: () => Promise<T> | T): Promise<T> {
  const t0 = performance.now();
  try { return await fn(); } finally { recordPerf(k, performance.now() - t0); }
}
/** Bảng median/p90 cho từng công đoạn S1. */
export function stageReport(perf: PerfSample[]): Record<Stage, Stat> {
  return Object.fromEntries(STAGES.map((k) => [k, stat(perf.filter((p) => p.k === k).map((p) => p.ms))])) as Record<Stage, Stat>;
}
const MAX = 600; // S2: đủ chứa bộ đo 30 trang

export function recordPerf(k: PerfKind, ms: number) {
  try {
    const list: PerfSample[] = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    list.unshift({ k, ms: Math.round(ms), at: Date.now() });
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch { /* bộ nhớ đầy hoặc bị chặn */ }
}
export function readPerf(): PerfSample[] { try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; } }
export function clearPerf() { try { localStorage.removeItem(KEY); } catch { /* */ } }

export function stat(values: number[]): Stat {
  if (!values.length) return { count: 0, median: 0, p90: 0 };
  const s = [...values].sort((a, b) => a - b);
  const at = (p: number) => s[Math.min(s.length - 1, Math.ceil(p * s.length) - 1)];
  return { count: s.length, median: at(0.5), p90: at(0.9) };
}

const NOT_ERRORS = new Set(["AI_OK"]);

export function buildReport(perf: PerfSample[], log: ScanLogEntry[]): PerfReport {
  const of = (k: PerfKind) => stat(perf.filter((p) => p.k === k).map((p) => p.ms));
  const ai = log.filter((e) => e.aiStatus);
  const ok = ai.filter((e) => e.aiStatus === "ok").length, fail = ai.length - ok;
  const counts = new Map<string, number>();
  for (const e of log) if (!NOT_ERRORS.has(e.code)) counts.set(e.code, (counts.get(e.code) ?? 0) + 1);
  return {
    warpGpu: of("warp-gpu"), warpCpu: of("warp-cpu"), detect: of("detect"),
    ai: { ...stat(ai.filter((e) => e.aiStatus === "ok" && e.ms).map((e) => e.ms!)), ok, fail, errorRate: ai.length ? fail / ai.length : 0 },
    topErrors: [...counts].map(([code, n]) => ({ code, n })).sort((a, b) => b.n - a.n).slice(0, 3),
  };
}

/** B00 — Mốc đo nền V12: p50/p95 các mốc chính, xuất ra perf-baseline.json. */
export const BASELINE_KINDS = ["grab", "release", "preview-shown", "normalize", "render"] as const;
export type BaselineStat = { count: number; p50: number; p95: number };
export type PerfBaseline = { version: string; createdAt: string; userAgent: string; stages: Record<(typeof BASELINE_KINDS)[number], BaselineStat> };

export function pct(values: number[], p: number): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.ceil(p * s.length) - 1))];
}
export function buildBaseline(perf: PerfSample[], version = "V12", now = new Date(), ua = typeof navigator !== "undefined" ? navigator.userAgent : ""): PerfBaseline {
  const stages = Object.fromEntries(BASELINE_KINDS.map((k) => {
    const v = perf.filter((p) => p.k === k).map((p) => p.ms);
    return [k, { count: v.length, p50: pct(v, 0.5), p95: pct(v, 0.95) }];
  })) as PerfBaseline["stages"];
  return { version, createdAt: now.toISOString(), userAgent: ua, stages };
}
export function downloadBaseline(perf: PerfSample[] = readPerf()) {
  const blob = new Blob([JSON.stringify(buildBaseline(perf), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "perf-baseline.json"; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---- B16: Tự cảnh báo khi chậm — so p95 hiện tại với mốc baseline, chậm hơn 20% thì báo. ---- */

export type SlowWarning = { kind: (typeof BASELINE_KINDS)[number]; p95: number; baseP95: number; ratio: number };

/** Ngưỡng cảnh báo: chậm hơn mốc 20% (p95 hiện tại > 1.2 × p95 mốc). */
export const SLOW_RATIO = 1.2;
/** Cần tối thiểu 5 mẫu mới để kết luận, tránh báo ảo khi mới mở app. */
export const SLOW_MIN_SAMPLES = 5;

/**
 * So số đo hiện tại với mốc baseline. Trả danh sách mốc chậm hơn 20%,
 * sắp xếp theo mức chậm giảm dần. Mốc thiếu dữ liệu (mốc 0 hoặc ít mẫu) bị bỏ qua.
 */
export function slowWarnings(perf: PerfSample[], baseline: PerfBaseline, ratio = SLOW_RATIO): SlowWarning[] {
  const out: SlowWarning[] = [];
  for (const k of BASELINE_KINDS) {
    const base = baseline.stages[k];
    if (!base || !base.p95) continue;
    const v = perf.filter((p) => p.k === k).map((p) => p.ms);
    if (v.length < SLOW_MIN_SAMPLES) continue;
    const p95 = pct(v, 0.95);
    if (p95 > base.p95 * ratio) out.push({ kind: k, p95, baseP95: base.p95, ratio: p95 / base.p95 });
  }
  return out.sort((a, b) => b.ratio - a.ratio);
}

const BASELINE_KEY = "ghi-nhanh:perf-baseline";

/** Lưu mốc baseline (từ perf-baseline.json người dùng tải lên) vào máy. */
export function saveBaseline(b: PerfBaseline) {
  try { localStorage.setItem(BASELINE_KEY, JSON.stringify(b)); } catch { /* */ }
}
export function readBaseline(): PerfBaseline | null {
  try { const s = localStorage.getItem(BASELINE_KEY); return s ? (JSON.parse(s) as PerfBaseline) : null; } catch { return null; }
}

/** Câu cảnh báo tiếng Việt cho một mốc chậm. */
export function slowWarningText(w: SlowWarning): string {
  const label: Record<SlowWarning["kind"], string> = {
    grab: "lấy khung hình", release: "bấm chụp", "preview-shown": "hiện xem trước",
    normalize: "nắn trang", render: "dựng trang",
  };
  return `${label[w.kind]} chậm hơn mốc ${Math.round((w.ratio - 1) * 100)}% (p95 ${w.p95} ms / mốc ${w.baseP95} ms)`;
}
