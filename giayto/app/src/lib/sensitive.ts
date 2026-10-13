import type { OcrWord } from "@/lib/ocr";
import type { Region } from "@/lib/region";

export type SensitiveKind = "cccd" | "phone" | "account";
export const SENSITIVE_LABEL: Record<SensitiveKind, string> = { cccd: "số CCCD/CMND", phone: "số điện thoại", account: "số tài khoản/thẻ" };
export type Sensitive = { kind: SensitiveKind; digits: string; region: Region };

/** Classify a digit string read from a page; null when it is not personal data. `raw` keeps separators to spot money amounts. */
export function classifyNumber(digits: string, raw = digits): SensitiveKind | null {
  if (/^\d{1,3}([.,]\d{3}){2,}$/.test(raw.replace(/\s/g, ""))) return null; // 15.000.000 → tiền
  const n = digits.length;
  if (/^0[35789]\d{8}$/.test(digits) || /^84[35789]\d{8}$/.test(digits)) return "phone";
  if (n === 12 && /^0\d{11}$/.test(digits)) return "cccd";
  if (n === 9 && !/^0/.test(digits)) return "cccd"; // CMND cũ
  if (n >= 8 && n <= 19) return "account";
  return null;
}

const NUMERIC = /^\+?[\d.\-–]+$/;

/** Find personal numbers in OCR words (pixel coords, y = -centre as produced by ocr.ts). Numbers split by spaces are joined per line. */
export function findSensitive(words: OcrWord[], W: number, H: number): Sensitive[] {
  const ws = words.filter((w) => w.str.trim()).map((w) => ({ ...w, top: -w.y - w.h / 2 }));
  ws.sort((a, b) => a.top - b.top || a.x - b.x);
  const lines: typeof ws[] = [];
  for (const w of ws) {
    const l = lines.find((ln) => Math.abs((ln[0].top + ln[0].h / 2) - (w.top + w.h / 2)) < Math.max(ln[0].h, w.h) * 0.5);
    if (l) l.push(w); else lines.push([w]);
  }
  const out: Sensitive[] = [];
  for (const ln of lines) {
    ln.sort((a, b) => a.x - b.x);
    let run: typeof ws = [];
    const flush = () => {
      if (!run.length) return;
      const raw = run.map((w) => w.str).join(" "); const digits = raw.replace(/\D/g, "");
      const kind = classifyNumber(digits, raw);
      if (kind) {
        const x0 = Math.min(...run.map((w) => w.x)), x1 = Math.max(...run.map((w) => w.x + w.w));
        const y0 = Math.min(...run.map((w) => w.top)), y1 = Math.max(...run.map((w) => w.top + w.h));
        const px = (y1 - y0) * 0.25;
        out.push({ kind, digits, region: { x: Math.max(0, (x0 - px) / W), y: Math.max(0, (y0 - px) / H), w: Math.min(1, (x1 - x0 + 2 * px) / W), h: Math.min(1, (y1 - y0 + 2 * px) / H) } });
      }
      run = [];
    };
    for (const w of ln) {
      const s = w.str.replace(/[:;,]$/, "");
      const prev = run[run.length - 1];
      const near = !prev || w.x - (prev.x + prev.w) < Math.max(prev.h, w.h) * 1.2;
      if (NUMERIC.test(s) && /\d/.test(s) && near) run.push({ ...w, str: s });
      else { flush(); if (NUMERIC.test(s) && /\d/.test(s)) run.push({ ...w, str: s }); }
    }
    flush();
  }
  return out;
}

export function summarize(found: Sensitive[]) {
  const c: Partial<Record<SensitiveKind, number>> = {};
  for (const f of found) c[f.kind] = (c[f.kind] ?? 0) + 1;
  return (Object.keys(c) as SensitiveKind[]).map((k) => `${c[k]} ${SENSITIVE_LABEL[k]}`).join(", ");
}
