/** Dựng bảng từ các dòng có toạ độ ngang: gom ranh giới cột (chia cụm 1 chiều), gán ô vào cột, ô gộp trải nhiều cột. */
export type RowCell = { x0: number; x1: number; text: string };
export type RowIn = { y: number; cells: RowCell[] };

/** "-   1.156", "− 1.156", "–1.156" → "-1.156". Ô chỉ có "-" giữ nguyên (nghĩa là 0). */
export function fixNegative(t: string): string {
  const s = t.replace(/\s+/g, " ").trim();
  return s.replace(/^[-−–]\s*(?=[\d(])/, "-");
}

type Col = { x0: number; x1: number };
const overlap = (a: Col, b: Col) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0));
const w = (c: Col) => Math.max(1e-6, c.x1 - c.x0);

/** Ranh giới cột: duyệt ô hẹp trước; ô phủ ≥2 cột đã có là ô gộp nên không mở rộng cột. */
export function findColumns(rows: RowIn[]): Col[] {
  const cells = rows.flatMap((r) => r.cells).filter((c) => c.x1 > c.x0).sort((a, b) => w(a) - w(b));
  const cols: Col[] = [];
  for (const c of cells) {
    const hit = cols.filter((k) => overlap(k, c) > 0.5 * Math.min(w(k), w(c)));
    if (!hit.length) cols.push({ x0: c.x0, x1: c.x1 });
    else if (hit.length === 1) { hit[0].x0 = Math.min(hit[0].x0, c.x0); hit[0].x1 = Math.max(hit[0].x1, c.x1); }
  }
  cols.sort((a, b) => a.x0 + a.x1 - b.x0 - b.x1);
  // gộp cột trùng nhau sau khi mở rộng
  const out: Col[] = [];
  for (const k of cols) {
    const p = out[out.length - 1];
    if (p && overlap(p, k) > 0.5 * Math.min(w(p), w(k))) { p.x0 = Math.min(p.x0, k.x0); p.x1 = Math.max(p.x1, k.x1); } else out.push({ ...k });
  }
  return out;
}

/** Gán ô vào cột; trả về lưới chữ, mọi hàng cùng số cột. */
export function rowsToGrid(rows: RowIn[]): string[][] {
  const cols = findColumns(rows);
  if (!cols.length) return rows.map((r) => r.cells.map((c) => fixNegative(c.text)));
  const centerCol = (x: number) => {
    let best = 0, d = Infinity;
    cols.forEach((k, i) => { const dd = x < k.x0 ? k.x0 - x : x > k.x1 ? x - k.x1 : 0; if (dd < d) { d = dd; best = i; } });
    return best;
  };
  return fillDashRows(mergeWrapped([...rows].sort((a, b) => a.y - b.y).map((r) => {
    const line = cols.map(() => "");
    for (const c of [...r.cells].sort((a, b) => a.x0 - b.x0)) {
      const text = fixNegative(c.text);
      if (!text) continue;
      const covered = cols.map((k, i) => (overlap(k, c) > 0.5 * w(k) ? i : -1)).filter((i) => i >= 0);
      const i = covered.length ? covered[0] : centerCol((c.x0 + c.x1) / 2);
      line[i] = line[i] ? `${line[i]} ${text}` : text;
    }
    return line;
  })));
}

/**
 * Hàng toàn "-" (trừ nhãn cột đầu) mà thiếu "-" ở vài cột — thường do AI đọc sót:
 * nếu có ≥2 hàng toàn "-" khác và đa số chúng có "-" ở cột đó thì điền "-" vào ô trống.
 */
export function fillDashRows(grid: string[][]): string[][] {
  const isDashRow = (r: string[]) => r.some((t) => isDash(t)) && r.every((t, i) => !t.trim() || isDash(t) || i === 0);
  const dashRows = grid.map((r, i) => (isDashRow(r) ? i : -1)).filter((i) => i >= 0);
  if (dashRows.length < 3) return grid;
  const width = Math.max(...grid.map((r) => r.length));
  for (const i of dashRows) {
    for (let c = 1; c < width; c++) {
      if (grid[i][c]?.trim()) continue;
      const votes = dashRows.filter((j) => j !== i && isDash(grid[j][c] ?? "")).length;
      if (votes >= Math.ceil((dashRows.length - 1) / 2) && votes >= 2) grid[i][c] = "-";
    }
  }
  return grid;
}

const isDash = (t: string) => /^[-−–]$/.test(t.trim());
const hasDigit = (t: string) => /\d/.test(t);

/**
 * Gộp hàng thừa do tên dài xuống dòng (vd "Nguyễn Thị Ngọc" + "Ánh"):
 * hàng không có chữ số, chỉ có chữ ngắn (≤ 2 từ) ở cột đầu và/hoặc ô "-",
 * nằm ngay dưới một hàng có số → nối chữ vào cột đầu hàng trên, "-" điền vào ô trống tương ứng.
 */
const fold = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase();
/**
 * Mảnh tên lặp: AI tách phần xuống dòng của tên dài ("Ánh") thành hàng riêng, đặt lệch chỗ (dưới hàng khác đã đủ số),
 * trong khi tên đầy đủ đã có ở hàng trước. Hàng chỉ có 1 từ + vài ô "-" như vậy bị bỏ.
 */
function isEchoFragment(row: string[], filled: (readonly [string, number])[], first: string, out: string[][]) {
  if (!first || isDash(first) || hasDigit(first) || first.split(/\s+/).length !== 1) return false;
  if (!filled.every(([t, i]) => i === 0 || isDash(t))) return false;
  const w = fold(first);
  return out.some((r) => { const n = (r[0] ?? "").trim().split(/\s+/); return n.length > 2 && fold(n[n.length - 1]) === w && r.some(hasDigit); });
}

export function mergeWrapped(grid: string[][]): string[][] {
  const out: string[][] = [];
  for (const row of grid) {
    const prev = out[out.length - 1];
    const filled = row.map((t, i) => [t.trim(), i] as const).filter(([t]) => t);
    const first = row[0]?.trim() ?? "";
    // "-" chỉ được điền vào ô trống của hàng trên; nếu đè lên ô đã có số thì đây là hàng thật (vd "Vay online" toàn "-").
    const restOk = filled.every(([t, i]) => i === 0 || (isDash(t) && !prev?.[i]?.trim()));
    const firstOk = !first || isDash(first) || (!hasDigit(first) && first.split(/\s+/).length <= 2);
    const wrap = prev && filled.length > 0 && restOk && firstOk && !filled.some(([t]) => hasDigit(t)) && prev.some(hasDigit);
    if (!wrap) {
      if (isEchoFragment(row, filled, first, out)) continue;
      out.push([...row]); continue;
    }
    for (const [t, i] of filled) {
      if (i === 0 && !isDash(t)) prev[0] = prev[0] ? `${prev[0]} ${t}` : t;
      else if (!prev[i]?.trim()) prev[i] = t;
    }
  }
  return out;
}
