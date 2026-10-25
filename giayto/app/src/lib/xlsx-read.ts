/** Đọc .xlsx không cần thư viện: zip (DecompressionStream 'deflate-raw'), sharedStrings, inlineStr, số, ô gộp, định dạng ngày/tiền/%. */
export type Merge = { r: number; c: number; rs: number; cs: number };
export type XSheet = { name: string; rows: string[][]; merges: Merge[]; red: string[] };

export class XlsxError extends Error { override name = "XlsxError"; }

const dec = new TextDecoder();

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream("deflate-raw");
  const w = ds.writable.getWriter(); void w.write(data as BufferSource).then(() => w.close()).catch(() => {});
  const r = ds.readable.getReader(); const parts: Uint8Array[] = []; let n = 0;
  for (;;) { const { done, value } = await r.read(); if (done) break; parts.push(value); n += value.length; }
  const out = new Uint8Array(n); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

/** Mở zip qua thư mục trung tâm; trả về hàm đọc từng tệp theo tên. */
export function unzip(buf: Uint8Array) {
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (buf.length < 22 || v.getUint32(0, true) !== 0x04034b50) throw new XlsxError("not zip");
  let e = buf.length - 22;
  while (e >= 0 && v.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new XlsxError("no eocd");
  const count = v.getUint16(e + 10, true); let p = v.getUint32(e + 16, true);
  const entries = new Map<string, { method: number; size: number; off: number; flags: number }>();
  for (let i = 0; i < count; i++) {
    if (v.getUint32(p, true) !== 0x02014b50) throw new XlsxError("bad central");
    const flags = v.getUint16(p + 8, true), method = v.getUint16(p + 10, true), size = v.getUint32(p + 20, true);
    const nl = v.getUint16(p + 28, true), el = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true), off = v.getUint32(p + 42, true);
    entries.set(dec.decode(buf.subarray(p + 46, p + 46 + nl)), { method, size, off, flags });
    p += 46 + nl + el + cl;
  }
  return async (name: string): Promise<string | null> => {
    const en = entries.get(name.replace(/^\//, "")); if (!en) return null;
    if (en.flags & 1) throw new XlsxError("encrypted");
    const start = en.off + 30 + v.getUint16(en.off + 26, true) + v.getUint16(en.off + 28, true);
    const raw = buf.subarray(start, start + en.size);
    if (en.method === 0) return dec.decode(raw);
    if (en.method === 8) return dec.decode(await inflate(raw));
    throw new XlsxError("method");
  };
}

const parse = (s: string) => new DOMParser().parseFromString(s, "application/xml");
const all = (n: Document | Element, tag: string) => Array.from(n.getElementsByTagNameNS("*", tag));
const first = (n: Element, tag: string) => n.getElementsByTagNameNS("*", tag)[0] as Element | undefined;
const kids = (n: Element, tag: string) => Array.from(n.children).filter((c) => c.localName === tag);

const ref = (a: string) => {
  const m = /^([A-Z]+)(\d+)$/.exec(a.replace(/\$/g, "")); if (!m) return null;
  let c = 0; for (const ch of m[1]) c = c * 26 + ch.charCodeAt(0) - 64;
  return { r: +m[2] - 1, c: c - 1 };
};

const DATE_IDS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47]);
const BUILTIN: Record<number, string> = { 1: "0", 2: "0.00", 3: "#,##0", 4: "#,##0.00", 9: "0%", 10: "0.00%", 37: "#,##0;(#,##0)", 38: "#,##0;[Red](#,##0)", 39: "#,##0.00;(#,##0.00)", 40: "#,##0.00;[Red](#,##0.00)" };

/** Số kiểu Việt Nam: dấu chấm hàng nghìn, dấu phẩy thập phân, âm hiển thị "-1.156". */
export function vnNumber(n: number, decimals?: number) {
  const d = decimals ?? (Number.isInteger(n) ? 0 : Math.min(10, (String(Math.abs(n)).split(".")[1] ?? "").length));
  const [i, f] = Math.abs(n).toFixed(d).split(".");
  const s = i.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (f && /[1-9]/.test(f) || (f && decimals !== undefined) ? "," + f : "");
  return (n < 0 && /[1-9]/.test(s) ? "-" : "") + s;
}

const pad = (n: number) => String(n).padStart(2, "0");
function serialToDate(v: number, withTime: boolean) {
  const ms = Math.round((v - 25569) * 86400000); const d = new Date(ms);
  const s = `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
  return withTime && v % 1 ? `${s} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}` : s;
}

/** Hiển thị một số theo mã định dạng Excel. Trả về chữ và có tô đỏ hay không. */
export function formatValue(v: number, id: number, code = BUILTIN[id] ?? "General"): { text: string; red: boolean } {
  const sections = code.split(";"); const sec = (v < 0 && sections[1]) || sections[0];
  const bare = sec.replace(/"[^"]*"|\\.|\[[^\]]*\]/g, "");
  const red = v < 0 && /\[red\]/i.test(sec);
  if (DATE_IDS.has(id) || (/[dy]/i.test(bare) && !/[0#]/.test(bare)) || (/m/i.test(bare) && /[dy]/i.test(bare))) return { text: serialToDate(v, /h/i.test(bare)), red };
  const decimals = /\.([0#]+)/.exec(bare)?.[1].length;
  const fixed = /[0#]/.test(bare) ? decimals ?? 0 : undefined;
  if (bare.includes("%")) return { text: vnNumber(v * 100, fixed) + "%", red };
  let text = vnNumber(v, fixed);
  if (/₫|đ|VND/i.test(sec)) text += " ₫"; else if (sec.includes("$")) text = (v < 0 ? "-$" : "$") + text.replace(/^-/, "");
  return { text, red };
}

export async function readXlsx(file: Blob | Uint8Array): Promise<XSheet[]> {
  const read = unzip(file instanceof Uint8Array ? file : new Uint8Array(await file.arrayBuffer()));
  const wbXml = await read("xl/workbook.xml"); if (!wbXml) throw new XlsxError("no workbook");
  const wb = parse(wbXml), rels = parse((await read("xl/_rels/workbook.xml.rels")) ?? "<r/>");
  const target = new Map(all(rels, "Relationship").map((r) => [r.getAttribute("Id"), r.getAttribute("Target") ?? ""]));

  const strings = await read("xl/sharedStrings.xml").then((s) => (s ? all(parse(s), "si").map((si) => all(si, "t").filter((t) => t.parentElement?.localName !== "rPh").map((t) => t.textContent ?? "").join("")) : []));
  const styles = parse((await read("xl/styles.xml")) ?? "<s/>");
  const codes = new Map(all(styles, "numFmt").map((n) => [+(n.getAttribute("numFmtId") ?? 0), n.getAttribute("formatCode") ?? ""]));
  const fontsEl = all(styles, "fonts")[0];
  const redFont = fontsEl ? kids(fontsEl, "font").map((f) => /^(FF)?(FF0000|C00000|E00000)$/i.test(first(f, "color")?.getAttribute("rgb") ?? "")) : [];
  const xfsEl = all(styles, "cellXfs")[0];
  const xfs = xfsEl ? kids(xfsEl, "xf").map((x) => ({ id: +(x.getAttribute("numFmtId") ?? 0), font: +(x.getAttribute("fontId") ?? 0) })) : [];

  const out: XSheet[] = [];
  for (const s of all(wb, "sheet")) {
    const rid = s.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id") ?? s.getAttribute("r:id");
    let t = target.get(rid) ?? ""; if (!t) continue;
    t = t.startsWith("/") ? t.slice(1) : "xl/" + t.replace(/^\.\//, "");
    const xml = await read(t); if (!xml) continue;
    const doc = parse(xml); const grid: string[][] = []; const red: string[] = [];
    for (const c of all(doc, "c")) {
      const p = ref(c.getAttribute("r") ?? ""); if (!p) continue;
      const type = c.getAttribute("t"), v = first(c, "v")?.textContent ?? "";
      const st = xfs[+(c.getAttribute("s") ?? 0)] ?? { id: 0, font: 0 };
      let text = "";
      if (type === "s") text = strings[+v] ?? "";
      else if (type === "inlineStr") text = all(c, "t").map((x) => x.textContent ?? "").join("");
      else if (type === "b") text = v === "1" ? "Đúng" : "Sai";
      else if (type === "str" || type === "e") text = v;
      else if (v !== "") {
        const f = formatValue(+v, st.id, codes.get(st.id));
        text = f.text; if (f.red || (+v < 0 && redFont[st.font])) red.push(`${p.r},${p.c}`);
      }
      if (!text) continue;
      (grid[p.r] ??= [])[p.c] = text;
    }
    const merges = all(doc, "mergeCell").flatMap((m) => {
      const [a, b] = (m.getAttribute("ref") ?? "").split(":"); const p = ref(a ?? ""), q = ref(b ?? a ?? "");
      return p && q ? [{ r: p.r, c: p.c, rs: q.r - p.r + 1, cs: q.c - p.c + 1 }] : [];
    });
    // cắt hàng/cột trống ở đầu và cuối
    const used = grid.flatMap((r, ri) => (r ? r.map((x, ci) => (x ? [ri, ci] : null)).filter(Boolean) as number[][] : []));
    if (!used.length) { out.push({ name: s.getAttribute("name") ?? "", rows: [], merges: [], red: [] }); continue; }
    const r0 = Math.min(...used.map((u) => u[0])), r1 = Math.max(...used.map((u) => u[0]));
    const c0 = Math.min(...used.map((u) => u[1])), c1 = Math.max(...used.map((u) => u[1]));
    const rows = Array.from({ length: r1 - r0 + 1 }, (_, i) => Array.from({ length: c1 - c0 + 1 }, (_, j) => grid[r0 + i]?.[c0 + j] ?? ""));
    out.push({
      name: s.getAttribute("name") ?? "", rows,
      merges: merges.map((m) => ({ ...m, r: m.r - r0, c: m.c - c0 })).filter((m) => m.r >= 0 && m.c >= 0 && m.r < rows.length && m.c < rows[0].length && (m.rs > 1 || m.cs > 1))
        .map((m) => ({ ...m, rs: Math.min(m.rs, rows.length - m.r), cs: Math.min(m.cs, rows[0].length - m.c) })),
      red: red.map((k) => { const [r, c] = k.split(",").map(Number); return `${r - r0},${c - c0}`; }),
    });
  }
  return out;
}
