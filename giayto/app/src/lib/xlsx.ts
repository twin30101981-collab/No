/** Minimal real .xlsx writer (stored ZIP, inline strings) — no dependency, keeps Vietnamese text. */
const enc = new TextEncoder();
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (b: Uint8Array) => { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

export function zip(files: [string, string | Uint8Array][], type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
  const parts: Uint8Array[] = []; const central: Uint8Array[] = []; let off = 0;
  for (const [name, text] of files) {
    const n = enc.encode(name), d = typeof text === "string" ? enc.encode(text) : text, c = crc32(d);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x800, true);
    h.setUint32(14, c, true); h.setUint32(18, d.length, true); h.setUint32(22, d.length, true); h.setUint16(26, n.length, true);
    const ce = new DataView(new ArrayBuffer(46));
    ce.setUint32(0, 0x02014b50, true); ce.setUint16(4, 20, true); ce.setUint16(6, 20, true); ce.setUint16(8, 0x800, true);
    ce.setUint32(16, c, true); ce.setUint32(20, d.length, true); ce.setUint32(24, d.length, true); ce.setUint16(28, n.length, true); ce.setUint32(42, off, true);
    parts.push(new Uint8Array(h.buffer), n, d); central.push(new Uint8Array(ce.buffer), n);
    off += 30 + n.length + d.length;
  }
  const size = central.reduce((s, b) => s + b.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, size, true); end.setUint32(16, off, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)] as BlobPart[], { type });
}

// HM-06: cố ý loại ký tự điều khiển bị cấm trong XML 1.0 (giữ \t \n \r); không phải lỗi.
// eslint-disable-next-line no-control-regex
const x = (s: string) => s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const col = (i: number): string => (i >= 26 ? col(Math.floor(i / 26) - 1) : "") + String.fromCharCode(65 + (i % 26));

/** Style ids in styles.xml cellXfs. */
const S = { header: 1, text: 2, int: 3, dec: 4, money: 5, date: 6, pct: 7, totalLabel: 8, totalInt: 9, totalMoney: 10, totalDec: 11, title: 12 } as const;

export type Cell = { kind: "text"; v: string } | { kind: "num"; v: number; style: number };

/** Read Vietnamese-style numbers, money and dates (1.234.567 đ, 12,5, 31/12/2026, 15%). */
export function parseCell(raw: string): Cell {
  const t = raw.trim();
  if (!t) return { kind: "text", v: "" };
  const d = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (d) {
    const [dd, mm, yy] = [+d[1], +d[2], +d[3]];
    if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) return { kind: "num", v: (Date.UTC(yy, mm - 1, dd) - Date.UTC(1899, 11, 30)) / 86400000, style: S.date };
  }
  let s = t.replace(/\s+/g, "");
  let money = false, pct = false;
  if (/(vnđ|vnd|đồng|đ|₫)$/i.test(s)) { money = true; s = s.replace(/(vnđ|vnd|đồng|đ|₫)$/i, ""); }
  if (/^(₫|vnđ|vnd)/i.test(s)) { money = true; s = s.replace(/^(₫|vnđ|vnd)/i, ""); }
  if (s.endsWith("%")) { pct = true; s = s.slice(0, -1); }
  s = s.replace(/^[−–]/, "-").replace(/(\d)\.$/, "$1");
  // accounting negatives: (98.855) → -98.855
  let neg = false; if (/^\(.+\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  if (/^0\d+$/.test(s)) return { kind: "text", v: t }; // phone numbers, codes
  let n: number | null = null;
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) n = +s.replace(/\./g, "").replace(",", ".");
  else if (/^-?\d{1,3}(,\d{3}){2,}(\.\d+)?$/.test(s) || /^-?\d{1,3}(,\d{3})+\.\d+$/.test(s)) n = +s.replace(/,/g, "");
  else if (/^-?\d+(,\d+)?$/.test(s)) n = +s.replace(",", ".");
  else if (/^-?\d+\.\d+$/.test(s)) n = +s;
  if (n === null || !Number.isFinite(n)) return { kind: "text", v: t };
  if (neg) n = -Math.abs(n);
  if (pct) return { kind: "num", v: n / 100, style: S.pct };
  if (money) return { kind: "num", v: n, style: S.money };
  return { kind: "num", v: n, style: Number.isInteger(n) ? S.int : S.dec };
}

const NO_SUM = /stt|^tt$|mã|số\s*(hiệu|điện|đt|tk|tài khoản|cccd|cmnd|hđ)|sđt|điện thoại|năm|ngày|tháng|code|id|phone/i;

function sheetXml(rowsIn: string[][], totals = true) {
  const width = Math.max(1, ...rowsIn.map((r) => r.length));
  const rows = rowsIn.map((r) => Array.from({ length: width }, (_, i) => (r[i] ?? "").toString()));
  const merges: string[] = [];
  // Title rows above the header: a single filled cell in a wide table → merge across.
  let h = 0;
  while (h < rows.length - 1 && width > 1 && rows[h].filter((v) => v.trim()).length === 1 && rows[h][0].trim()) { merges.push(`A${h + 1}:${col(width - 1)}${h + 1}`); h++; }
  const header = rows[h] ?? [];
  // Header cells followed by blanks → merged group header.
  for (let i = 0; i < width; i++) {
    if (!header[i]?.trim()) continue;
    let j = i; while (j + 1 < width && !header[j + 1]?.trim()) j++;
    if (j > i && h + 1 < rows.length) merges.push(`${col(i)}${h + 1}:${col(j)}${h + 1}`);
    i = j;
  }
  const parsed = rows.map((r, ri) => r.map((v) => (ri > h ? parseCell(v) : ({ kind: "text", v } as Cell))));
  const data = parsed.slice(h + 1);
  // Columns to total: mostly numbers (not dates/percent/IDs).
  const sumCols: { i: number; style: number }[] = [];
  if (totals && data.length >= 2) for (let i = 0; i < width; i++) {
    if (NO_SUM.test(header[i] ?? "")) continue;
    const filled = data.map((r) => r[i]).filter((c) => !(c.kind === "text" && !c.v));
    const nums = filled.filter((c): c is Extract<Cell, { kind: "num" }> => c.kind === "num" && c.style !== S.date && c.style !== S.pct);
    if (nums.length >= 2 && nums.length >= filled.length * 0.6) {
      const style = nums.some((c) => c.style === S.money) ? S.totalMoney : nums.some((c) => c.style === S.dec) ? S.totalDec : S.totalInt;
      sumCols.push({ i, style });
    }
  }
  const body = parsed.map((r, ri) => `<row r="${ri + 1}">${r.map((c, ci) => {
    const ref = `${col(ci)}${ri + 1}`;
    if (ri < h) return `<c r="${ref}" t="inlineStr" s="${S.title}"><is><t xml:space="preserve">${x(c.kind === "text" ? c.v : String(c.v))}</t></is></c>`;
    if (c.kind === "num") return `<c r="${ref}" s="${c.style}"><v>${c.v}</v></c>`;
    return `<c r="${ref}" t="inlineStr" s="${ri === h ? S.header : S.text}"><is><t xml:space="preserve">${x(c.v)}</t></is></c>`;
  }).join("")}</row>`);
  if (sumCols.length) {
    const tr = rows.length + 1, from = h + 2, to = rows.length;
    const labelCol = Array.from({ length: width }, (_, i) => i).find((i) => !sumCols.some((c) => c.i === i)) ?? -1;
    body.push(`<row r="${tr}">${Array.from({ length: width }, (_, i) => {
      const ref = `${col(i)}${tr}`, sc = sumCols.find((c) => c.i === i);
      if (sc) return `<c r="${ref}" s="${sc.style}"><f>SUM(${col(i)}${from}:${col(i)}${to})</f></c>`;
      return i === labelCol ? `<c r="${ref}" t="inlineStr" s="${S.totalLabel}"><is><t>Tổng cộng</t></is></c>` : `<c r="${ref}" s="${S.totalLabel}"/>`;
    }).join("")}</row>`);
  }
  const widths = Array.from({ length: width }, (_, i) =>
    `<col min="${i + 1}" max="${i + 1}" width="${Math.min(60, Math.max(10, ...rows.slice(h).map((r) => (r[i] ?? "").length + 3)))}" customWidth="1"/>`).join("");
  const X = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  return `${X}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="${h + 1}" topLeftCell="A${h + 2}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths}</cols><sheetData>${body.join("")}</sheetData>${merges.length ? `<mergeCells count="${merges.length}">${merges.map((m) => `<mergeCell ref="${m}"/>`).join("")}</mergeCells>` : ""}</worksheet>`;
}

const B = '<border><left style="thin"><color rgb="FF9CA3AF"/></left><right style="thin"><color rgb="FF9CA3AF"/></right><top style="thin"><color rgb="FF9CA3AF"/></top><bottom style="thin"><color rgb="FF9CA3AF"/></bottom><diagonal/></border>';
const STYLES = `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="164" formatCode="#,##0&quot; ₫&quot;"/><numFmt numFmtId="165" formatCode="dd/mm/yyyy"/></numFmts><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="14"/><name val="Calibri"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE5E7EB"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF3F4F6"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border/>${B}</borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="13"><xf/>`
  + `<xf fontId="1" fillId="2" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>`
  + `<xf borderId="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>`
  + `<xf numFmtId="3" borderId="1" applyNumberFormat="1" applyBorder="1"/>`
  + `<xf numFmtId="4" borderId="1" applyNumberFormat="1" applyBorder="1"/>`
  + `<xf numFmtId="164" borderId="1" applyNumberFormat="1" applyBorder="1"/>`
  + `<xf numFmtId="165" borderId="1" applyNumberFormat="1" applyBorder="1"/>`
  + `<xf numFmtId="10" borderId="1" applyNumberFormat="1" applyBorder="1"/>`
  + `<xf fontId="1" fillId="3" borderId="1" applyFont="1" applyFill="1" applyBorder="1"/>`
  + `<xf numFmtId="3" fontId="1" fillId="3" borderId="1" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>`
  + `<xf numFmtId="164" fontId="1" fillId="3" borderId="1" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>`
  + `<xf numFmtId="4" fontId="1" fillId="3" borderId="1" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>`
  + `<xf fontId="2" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>`
  + `</cellXfs></styleSheet>`;

export type Sheet = { name: string; rows: string[][]; totals?: boolean };

/** Real .xlsx with one worksheet per page/table, borders, bold header, merges, VN number/date parsing and SUM rows. */
export function sheetsToXlsx(sheetsIn: Sheet[]) {
  const used = new Set<string>();
  const sheets = sheetsIn.filter((s) => s.rows.length).map((s, i) => {
    const base = s.name.replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 28) || `Trang ${i + 1}`;
    let n = base, k = 2;
    while (used.has(n.toLowerCase())) n = `${base.slice(0, 26)} ${k++}`;
    used.add(n.toLowerCase()); return { ...s, name: n };
  });
  if (!sheets.length) sheets.push({ name: "Bang", rows: [[""]] });
  const X = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  return zip([
    ["[Content_Types].xml", `${X}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],
    ["_rels/.rels", `${X}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ["xl/workbook.xml", `${X}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><calcPr fullCalcOnLoad="1"/><sheets>${sheets.map((s, i) => `<sheet name="${x(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`.replace('<calcPr fullCalcOnLoad="1"/><sheets>', "<sheets>").replace("</sheets></workbook>", '</sheets><calcPr fullCalcOnLoad="1"/></workbook>')],
    ["xl/_rels/workbook.xml.rels", `${X}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ["xl/styles.xml", X + STYLES],
    ...sheets.map((s, i) => [`xl/worksheets/sheet${i + 1}.xml`, sheetXml(s.rows, s.totals !== false)] as [string, string]),
  ]);
}

export const rowsToXlsx = (rows: string[][], sheet = "Bang", totals = true) => sheetsToXlsx([{ name: sheet, rows, totals }]);

/** Fallback when AI is unavailable: split OCR lines on wide gaps. */
export const textToRows = (text: string) => text.split(/\n/).filter((l) => l.trim()).map((l) => l.trim().split(/\s{2,}|\t|\s\|\s/));
