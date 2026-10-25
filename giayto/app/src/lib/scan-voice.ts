// G4-01: hướng dẫn bằng giọng nói + rung khi quét. Bộ quyết định thuần (dễ test), phần phát âm/rung tách riêng.
export type ScanTip = "none" | "closer" | "hold" | "found" | "blur" | "glare" | "tilt" | "dark";

export const VOICE_LINES: Record<ScanTip, string> = {
  none: "Đưa cả tờ giấy vào khung",
  closer: "Đưa máy lại gần hơn",
  found: "Đã thấy giấy, giữ thẳng máy",
  hold: "Giữ yên máy",
  blur: "Hình mờ, giữ yên chờ lấy nét",
  glare: "Bị lóa, nghiêng nhẹ máy",
  tilt: "Máy đang nghiêng, đưa song song với giấy",
  dark: "Thiếu sáng, bật đèn hoặc ra chỗ sáng hơn",
};

/** Rung theo lời nhắc: lỗi = 2 nhịp ngắn, đã khớp = 1 nhịp, không có = không rung. */
export const VIBRATE: Partial<Record<ScanTip, number[]>> = { found: [15], hold: [15], blur: [30, 60, 30], glare: [30, 60, 30], tilt: [30, 60, 30], dark: [30, 60, 30] };

export type GuideOpts = { stableMs: number; gapMs: number; repeatMs: number };
const DEF: GuideOpts = { stableMs: 700, gapMs: 2500, repeatMs: 8000 };

/** Chỉ nói khi lời nhắc đứng yên đủ lâu, cách lần nói trước đủ xa, không lặp lại cùng câu quá sớm. */
export class ScanGuide {
  private cur: ScanTip | null = null; private since = 0;
  private lastAt = -Infinity; private lastTip: ScanTip | null = null; private lastSaid = new Map<ScanTip, number>();
  constructor(private o: GuideOpts = DEF) {}
  push(tip: ScanTip, now: number): ScanTip | null {
    if (tip !== this.cur) { this.cur = tip; this.since = now; return null; }
    if (now - this.since < this.o.stableMs || now - this.lastAt < this.o.gapMs) return null;
    if (tip === this.lastTip) return null; // chỉ nói lại khi lời nhắc thay đổi
    const prev = this.lastSaid.get(tip) ?? -Infinity;
    if (now - prev < this.o.repeatMs) return null;
    this.lastAt = now; this.lastTip = tip; this.lastSaid.set(tip, now);
    return tip;
  }
  /** Sau khi chụp: quên câu cuối để trang tiếp theo được nhắc lại. */
  reset() { this.cur = null; this.lastTip = null; this.lastSaid.clear(); }
}

export function speakTip(tip: ScanTip, opt: { voice: boolean; vibrate: boolean }) {
  if (opt.vibrate) { const p = VIBRATE[tip]; if (p) navigator.vibrate?.(p); }
  if (!opt.voice || typeof speechSynthesis === "undefined") return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(VOICE_LINES[tip]);
    u.lang = "vi-VN"; u.rate = 1.05;
    const v = speechSynthesis.getVoices().find((x) => x.lang?.toLowerCase().startsWith("vi"));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  } catch { /* máy không hỗ trợ đọc thì bỏ qua */ }
}
export function stopSpeaking() { try { if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel(); } catch { /* bỏ qua */ } }
