// B10 — Dò dòng ký: đường kẻ ngang / chấm chấm (trên điểm ảnh) + nhãn "Ký", "Người ký", "Giám đốc"… (OCR có vị trí).
// Toàn bộ là hàm thuần để kiểm thử được; giao diện chỉ việc truyền ảnh xám thu nhỏ và (tuỳ chọn) danh sách từ OCR.

/** Đoạn kẻ ngang tính theo điểm ảnh của ảnh xám đầu vào. */
export type RuleLine = { x0: number; x1: number; y: number };
/** Từ OCR theo toạ độ ảnh (y tăng xuống dưới). */
export type LabelWord = { str: string; x: number; y: number; w: number; h: number };
/** Gợi ý chỗ ký theo phần trang (0..1). `y + h` là chân chữ ký (đặt lên dòng). */
export type SignSpot = { x: number; y: number; w: number; h: number; score: number; source: "line" | "label" | "both" };

const KEY = /^(ký|ky|kí|ki)$|người\s*ký|giám\s*đốc|giam\s*doc|xác\s*nhận|đại\s*diện|người\s*lập|kế\s*toán|thủ\s*trưởng|chữ\s*ký|signature|sign/i;
export const isSignLabel = (s: string) => KEY.test(s.normalize("NFC").trim().replace(/[.,:;()]/g, ""));

/** Tìm đoạn kẻ ngang mảnh (≤ maxThick px), cho phép khe hở (đường chấm chấm), dài ≥ minFrac bề rộng ảnh. */
export function detectRuleLines(gray: Uint8Array | Uint8ClampedArray, w: number, h: number, opts: { dark?: number; minFrac?: number; gap?: number; maxThick?: number } = {}) {
  const dark = opts.dark ?? 150, minLen = Math.max(12, (opts.minFrac ?? 0.12) * w), gap = opts.gap ?? Math.max(4, Math.round(w / 70)), maxThick = opts.maxThick ?? Math.max(3, Math.round(h / 300));
  const raw: { x0: number; x1: number; y: number }[] = [];
  for (let y = 0; y < h; y++) {
    let start = -1, last = -1, ink = 0;
    const flush = () => { if (start >= 0 && last - start + 1 >= minLen && ink / (last - start + 1) >= 0.35) raw.push({ x0: start, x1: last, y }); start = -1; ink = 0; };
    for (let x = 0; x < w; x++) {
      if (gray[y * w + x] < dark) { if (start < 0) start = x; else if (x - last > gap) { flush(); start = x; } last = x; ink++; }
    }
    flush();
  }
  // Gộp các hàng liền nhau chồng lấn → một đường; loại khối dày (chữ đậm, ô tô đen).
  raw.sort((a, b) => a.y - b.y || a.x0 - b.x0);
  const groups: { x0: number; x1: number; y0: number; y1: number }[] = [];
  for (const r of raw) {
    const g = groups.find((q) => r.y - q.y1 <= 1 && r.x0 < q.x1 && r.x1 > q.x0);
    if (g) { g.y1 = r.y; g.x0 = Math.min(g.x0, r.x0); g.x1 = Math.max(g.x1, r.x1); } else groups.push({ x0: r.x0, x1: r.x1, y0: r.y, y1: r.y });
  }
  const lines: RuleLine[] = [];
  for (const g of groups) {
    if (g.y1 - g.y0 + 1 > maxThick) continue;
    // Đường thật phải có khoảng trống phía trên (chỗ để ký) — bỏ gạch chân sát chữ dày đặc và đường biên bảng chồng chữ.
    // Đường thật có khoảng trống ngay trên và dưới; chân dòng chữ / gạch chân chữ thì sát nét chữ.
    const band = (ya: number, yb: number) => { let ink = 0, tot = 0; for (let y = Math.max(0, ya); y < Math.min(h, yb); y++) for (let x = g.x0; x <= g.x1; x += 2) { tot++; if (gray[y * w + x] < dark) ink++; } return tot ? ink / tot : 0; };
    const near = Math.max(3, Math.round(h * 0.008)), far = Math.round(h * 0.03);
    if (band(g.y0 - near - 1, g.y0 - 1) > 0.03 || band(g.y1 + 2, g.y1 + 2 + near) > 0.06 || band(g.y0 - far, g.y0 - near) > 0.08) continue;
    lines.push({ x0: g.x0, x1: g.x1, y: (g.y0 + g.y1) / 2 });
  }
  return lines;
}

/** Kết hợp đường kẻ + nhãn → danh sách gợi ý đã xếp hạng (điểm cao trước), theo phần trang. */
export function suggestSignSpots(lines: RuleLine[], words: LabelWord[], w: number, h: number, max = 4): SignSpot[] {
  const labels = words.filter((t) => isSignLabel(t.str));
  // Cụm 2 từ "Người ký" / "Giám đốc" bị OCR tách: ghép từ kề nhau trên cùng hàng.
  for (let i = 0; i + 1 < words.length; i++) {
    const a = words[i], b = words[i + 1];
    if (Math.abs(a.y - b.y) < a.h && isSignLabel(`${a.str} ${b.str}`) && !labels.includes(a) && !labels.includes(b))
      labels.push({ str: `${a.str} ${b.str}`, x: a.x, y: Math.min(a.y, b.y), w: b.x + b.w - a.x, h: Math.max(a.h, b.h) });
  }
  const spots: SignSpot[] = []; const sigH = h * 0.07;
  const used = new Set<LabelWord>();
  for (const l of lines) {
    const len = l.x1 - l.x0; let score = 1 + Math.min(1, len / (w * 0.3));
    // Nhãn ngay bên trái trên cùng hàng ("Ký: ______") hoặc ngay phía trên/dưới đường trong 12% chiều cao.
    const lab = labels.find((t) => {
      const cx = t.x + t.w / 2, cy = t.y + t.h / 2;
      const sameRow = Math.abs(cy - l.y) < Math.max(t.h, h * 0.02) && t.x + t.w <= l.x0 + len * 0.2 && l.x0 - (t.x + t.w) < w * 0.25;
      const near = cx > l.x0 - w * 0.08 && cx < l.x1 + w * 0.08 && Math.abs(cy - l.y) < h * 0.12;
      return sameRow || near;
    });
    if (lab) { score += 3; used.add(lab); }
    const bw = Math.min(len, w * 0.34);
    spots.push({ x: (l.x0 + (len - bw) / 2) / w, y: (l.y - sigH) / h, w: bw / w, h: sigH / h, score, source: lab ? "both" : "line" });
  }
  // Nhãn không có đường ("GIÁM ĐỐC" rồi để trống bên dưới) → đặt ngay dưới nhãn, căn giữa.
  for (const t of labels) {
    if (used.has(t)) continue;
    const bw = w * 0.3, cx = t.x + t.w / 2;
    spots.push({ x: Math.min(1 - bw / w, Math.max(0, (cx - bw / 2) / w)), y: Math.min(1 - sigH / h, (t.y + t.h + h * 0.01) / h), w: bw / w, h: sigH / h, score: 2.5, source: "label" });
  }
  // Ưu tiên nửa dưới trang (dòng ký thường ở cuối) — cộng nhẹ.
  for (const s of spots) s.score += s.y * 1.5;
  spots.sort((a, b) => b.score - a.score);
  // Bỏ gợi ý trùng chỗ.
  const out: SignSpot[] = [];
  for (const s of spots) if (!out.some((o) => Math.abs(o.x - s.x) < 0.08 && Math.abs(o.y - s.y) < 0.04)) out.push(s);
  return out.slice(0, max);
}

/** Đặt chữ ký (tỉ lệ cao/rộng theo phần trang = ratio) vào gợi ý: chân chữ ký chạm dòng, căn giữa, vừa bề rộng. */
export function anchorTo(spot: SignSpot, ratio: number) {
  let w = spot.w, h = w * ratio;
  const maxH = spot.h * 1.6; if (h > maxH) { h = maxH; w = h / ratio; }
  const cx = spot.x + spot.w / 2, bottom = spot.y + spot.h;
  const x = Math.min(1 - w, Math.max(0, cx - w / 2)), y = Math.min(1 - h, Math.max(0, bottom - h * 0.92));
  return { x, y, w, h };
}

/** Ảnh → mảng xám thu nhỏ (tối đa `max` px cạnh dài). Chạy trên trình duyệt. */
export function grayOf(img: CanvasImageSource & { naturalWidth?: number; naturalHeight?: number; width: number; height: number }, max = 1000) {
  const W = img.naturalWidth || img.width, H = img.naturalHeight || img.height; const k = Math.min(1, max / Math.max(W, H));
  const w = Math.max(1, Math.round(W * k)), h = Math.max(1, Math.round(H * k));
  const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(img, 0, 0, w, h); const d = g.getImageData(0, 0, w, h).data; const out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = (d[i * 4] * 299 + d[i * 4 + 1] * 587 + d[i * 4 + 2] * 114) / 1000;
  return { gray: out, w, h, canvas: c };
}
