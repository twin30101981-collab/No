// G3-18: hoá đơn/biên lai — chuẩn hoá tiền, ngày và lưu danh sách chi tiêu trên máy.
export type ReceiptAi = { merchant: string; total: string; date: string; category: string; confidence: number };
export type Receipt = { id: string; merchant: string; total: number; date: string; category: string; thumb: string; createdAt: number };

export const CATEGORIES = ["Ăn uống", "Đi lại", "Mua sắm", "Điện nước", "Y tế", "Giáo dục", "Khác"] as const;

/** "1.234.500đ", "1,234,500 VND", "125.000,50" → số đồng (làm tròn). Không đọc được → null. */
export function parseAmount(s: string): number | null {
  const t = s.replace(/[^\d.,-]/g, "");
  if (!/\d/.test(t)) return null;
  let n: string;
  const lastDot = t.lastIndexOf("."), lastComma = t.lastIndexOf(",");
  const last = Math.max(lastDot, lastComma);
  const tail = last >= 0 ? t.length - last - 1 : 0;
  if (last >= 0 && tail > 0 && tail <= 2 && lastDot !== -1 && lastComma !== -1) n = t.slice(0, last).replace(/[.,]/g, "") + "." + t.slice(last + 1);
  else if (last >= 0 && tail > 0 && tail <= 2 && t.split(t[last]!).length === 2) n = t.slice(0, last).replace(/[.,]/g, "") + "." + t.slice(last + 1);
  else n = t.replace(/[.,]/g, "");
  const v = Number(n);
  return Number.isFinite(v) && v >= 0 ? Math.round(v) : null;
}

/** Ngày dạng dd/mm/yyyy, d-m-yy, yyyy-mm-dd → "yyyy-mm-dd"; sai → "". */
export function parseDate(s: string): string {
  const pad = (x: number) => String(x).padStart(2, "0");
  const ok = (y: number, m: number, d: number) => {
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d && y >= 2000 && y <= 2100 ? `${y}-${pad(m)}-${pad(d)}` : "";
  };
  let m = s.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return ok(+m[1]!, +m[2]!, +m[3]!);
  m = s.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (m) { let y = +m[3]!; if (y < 100) y += 2000; return ok(y, +m[2]!, +m[1]!); }
  return "";
}

export function formatVnd(n: number) { return n.toLocaleString("vi-VN") + " ₫"; }

export function normalizeReceipt(a: ReceiptAi): { merchant: string; total: number | null; date: string; category: string; unsure: boolean } {
  const total = parseAmount(a.total);
  const date = parseDate(a.date);
  const category = (CATEGORIES as readonly string[]).includes(a.category) ? a.category : "Khác";
  return { merchant: a.merchant.trim().slice(0, 80), total, date, category, unsure: total === null || !date || a.confidence < 0.6 };
}

const KEY = "gn-receipts";
export function loadReceipts(): Receipt[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Receipt[]; } catch { return []; }
}
export function saveReceipts(list: Receipt[]) { localStorage.setItem(KEY, JSON.stringify(list)); }

/** Tổng theo tháng "yyyy-mm". */
export function monthTotals(list: Receipt[]): { month: string; total: number; count: number }[] {
  const m = new Map<string, { total: number; count: number }>();
  for (const r of list) { const k = r.date.slice(0, 7) || "Không rõ"; const v = m.get(k) ?? { total: 0, count: 0 }; v.total += r.total; v.count++; m.set(k, v); }
  return [...m].map(([month, v]) => ({ month, ...v })).sort((a, b) => b.month.localeCompare(a.month));
}

const dmy = (iso: string) => iso ? iso.split("-").reverse().join("/") : "";

/** G3-19: sổ chi tiêu → các trang Excel: "Tổng hợp" (tháng × nhóm) + một trang mỗi tháng. `months` rỗng = tất cả. */
export function expenseSheets(list: Receipt[], months: string[] = []): { name: string; rows: string[][]; totals?: boolean }[] {
  const pick = list.filter((r) => !months.length || months.includes(r.date.slice(0, 7)));
  const ms = monthTotals(pick).map((m) => m.month).sort();
  const cats = CATEGORIES.filter((c) => pick.some((r) => r.category === c));
  const sum = (rs: Receipt[]) => String(rs.reduce((a, r) => a + r.total, 0));
  const summary = [["Tháng", "Số hoá đơn", ...cats, "Tổng"], ...ms.map((m) => {
    const rs = pick.filter((r) => r.date.slice(0, 7) === m);
    return [m.split("-").reverse().join("/"), String(rs.length), ...cats.map((c) => sum(rs.filter((r) => r.category === c))), sum(rs)];
  })];
  const per = ms.map((m) => ({ name: `Tháng ${m.slice(5)}-${m.slice(0, 4)}`, totals: true, rows: [["Ngày", "Cửa hàng", "Nhóm", "Số tiền"],
    ...pick.filter((r) => r.date.slice(0, 7) === m).sort((a, b) => a.date.localeCompare(b.date)).map((r) => [dmy(r.date), r.merchant, r.category, String(r.total)])] }));
  return [{ name: "Tổng hợp", rows: summary, totals: true }, ...per];
}
