/** Real .docx writer (no dependency): headings, paragraphs, lists, bordered tables, Vietnamese text. */
import { zip } from "./xlsx";

export type Block = {
  kind: "heading" | "paragraph" | "bullet" | "number" | "table";
  level: number; text: string; align: "left" | "center" | "right" | "justify"; bold: boolean; rows: string[][];
  /** Ô gộp của bảng (hàng r, cột c, trải rs hàng × cs cột). */
  merges?: { r: number; c: number; rs: number; cs: number }[];
  /** Ô tô đỏ, dạng "hàng,cột". */
  red?: string[];
};
export const block = (kind: Block["kind"], text = "", extra: Partial<Block> = {}): Block =>
  ({ kind, level: 1, text, align: "left", bold: false, rows: [], ...extra });

// HM-06: cố ý loại ký tự điều khiển bị cấm trong XML 1.0 (giữ \t \n \r); không phải lỗi.
// eslint-disable-next-line no-control-regex
const x = (s: string) => s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const run = (t: string, bold = false, size?: number) =>
  `<w:r><w:rPr>${bold ? "<w:b/>" : ""}${size ? `<w:sz w:val="${size}"/>` : ""}</w:rPr><w:t xml:space="preserve">${x(t)}</w:t></w:r>`;
const jc = (a: Block["align"]) => (a === "justify" ? "both" : a);

function para(b: Block) {
  if (b.kind === "heading") {
    const lv = Math.min(3, Math.max(1, b.level || 1));
    return `<w:p><w:pPr><w:pStyle w:val="Heading${lv}"/><w:jc w:val="${jc(b.align)}"/></w:pPr>${run(b.text)}</w:p>`;
  }
  if (b.kind === "bullet" || b.kind === "number")
    return `<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="${b.kind === "bullet" ? 1 : 2}"/></w:numPr></w:pPr>${run(b.text, b.bold)}</w:p>`;
  return `<w:p><w:pPr><w:jc w:val="${jc(b.align)}"/></w:pPr>${b.text.split("\n").map((l, i) => (i ? "<w:r><w:br/></w:r>" : "") + run(l, b.bold)).join("")}</w:p>`;
}

const NUM = /^[-+]?\(?[$]?\d[\d.,]*\)?\s*(%|₫)?$/;

function table(rows: string[][], merges: Block["merges"] = [], red: string[] = []) {
  const n = Math.max(1, ...rows.map((r) => r.length)), w = Math.floor(9000 / n), sz = n > 8 ? 18 : n > 5 ? 22 : undefined;
  const reds = new Set(red);
  const at = new Map<string, { m: NonNullable<Block["merges"]>[number]; top: boolean }>();
  for (const m of merges ?? []) for (let r = m.r; r < m.r + m.rs; r++) for (let c = m.c; c < m.c + m.cs; c++) at.set(`${r},${c}`, { m, top: r === m.r });
  const bd = ["top", "left", "bottom", "right", "insideH", "insideV"].map((s) => `<w:${s} w:val="single" w:sz="4" w:color="808080"/>`).join("");
  const cell = (ri: number, ci: number, t: string) => {
    const g = at.get(`${ri},${ci}`);
    if (g && ci !== g.m.c) return "";
    const span = g ? g.m.cs : 1, head = ri === 0;
    const vm = g && g.m.rs > 1 ? (g.top ? '<w:vMerge w:val="restart"/>' : "<w:vMerge/>") : "";
    const text = g && !g.top ? "" : t;
    const right = !head && NUM.test(text.trim()) && !g;
    const isRed = reds.has(`${ri},${ci}`);
    const r = `<w:r><w:rPr>${head ? "<w:b/>" : ""}${isRed ? '<w:color w:val="C00000"/>' : ""}${sz ? `<w:sz w:val="${sz}"/>` : ""}</w:rPr><w:t xml:space="preserve">${x(text)}</w:t></w:r>`;
    return `<w:tc><w:tcPr><w:tcW w:w="${w * span}" w:type="dxa"/>${span > 1 ? `<w:gridSpan w:val="${span}"/>` : ""}${vm}${head ? '<w:shd w:val="clear" w:fill="E8EEF0"/>' : ""}</w:tcPr><w:p><w:pPr><w:spacing w:after="0"/>${right ? '<w:jc w:val="right"/>' : g ? '<w:jc w:val="center"/>' : ""}</w:pPr>${r}</w:p></w:tc>`;
  };
  return `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>${bd}</w:tblBorders></w:tblPr><w:tblGrid>${Array(n).fill(`<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>${
    rows.map((r, ri) => `<w:tr>${Array.from({ length: n }, (_, ci) => cell(ri, ci, r[ci] ?? "")).join("")}</w:tr>`).join("")
  }</w:tbl><w:p/>`;
}

export function blocksToDocx(blocks: Block[], title = "Ghi Nhanh") {
  const X = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
  const body = blocks.map((b) => (b.kind === "table" ? (b.rows.length ? table(b.rows, b.merges, b.red) : "") : b.text.trim() ? para(b) : "")).join("") || "<w:p/>";
  const hs = [1, 2, 3].map((l) => `<w:style w:type="paragraph" w:styleId="Heading${l}"><w:name w:val="heading ${l}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/><w:outlineLvl w:val="${l - 1}"/></w:pPr><w:rPr><w:b/><w:sz w:val="${[32, 28, 26][l - 1]}"/></w:rPr></w:style>`).join("");
  const lvl = (fmt: string, txt: string) => `<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="${fmt}"/><w:lvlText w:val="${txt}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl>`;
  return zip([
    ["[Content_Types].xml", `${X}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`],
    ["_rels/.rels", `${X}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`],
    ["docProps/core.xml", `${X}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${x(title)}</dc:title><dc:creator>Ghi Nhanh</dc:creator></cp:coreProperties>`],
    ["word/_rels/document.xml.rels", `${X}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/></Relationships>`],
    ["word/styles.xml", `${X}<w:styles ${W}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman"/><w:sz w:val="26"/><w:lang w:val="vi-VN"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="300" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>${hs}<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="60"/></w:pPr></w:style></w:styles>`],
    ["word/numbering.xml", `${X}<w:numbering ${W}><w:abstractNum w:abstractNumId="0">${lvl("bullet", "•")}</w:abstractNum><w:abstractNum w:abstractNumId="1">${lvl("decimal", "%1.")}</w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num><w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num></w:numbering>`],
    ["word/document.xml", `${X}<w:document ${W}><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1701" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr></w:body></w:document>`],
  ], "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
}

/** Fallback when AI is unavailable: guess structure from plain OCR text. */
export function textToBlocks(text: string): Block[] {
  const out: Block[] = []; let tbl: string[][] = []; let para: string[] = [];
  const flushT = () => { if (tbl.length >= 2) out.push(block("table", "", { rows: tbl })); else tbl.forEach((r) => para.push(r.join(" "))); tbl = []; };
  const flushP = () => { if (para.length) out.push(block("paragraph", para.join(" "), { align: "justify" })); para = []; };
  for (const raw of text.split("\n")) {
    const l = raw.trim();
    if (!l) { flushT(); flushP(); continue; }
    const cells = l.split(/\t|\s{3,}|\s\|\s/).map((c) => c.trim()).filter(Boolean);
    if (cells.length >= 2) { flushP(); tbl.push(cells); continue; }
    flushT();
    const letters = l.replace(/[^\p{L}]/gu, "");
    if (/^[-•*+·]\s+/.test(l)) { flushP(); out.push(block("bullet", l.replace(/^[-•*+·]\s+/, ""))); }
    else if (/^\d{1,2}[.)]\s+/.test(l)) { flushP(); out.push(block("number", l.replace(/^\d{1,2}[.)]\s+/, ""))); }
    else if (l.length <= 70 && letters.length >= 3 && letters === letters.toUpperCase()) { flushP(); out.push(block("heading", l, { level: out.length ? 2 : 1, align: out.length ? "left" : "center" })); }
    else para.push(l);
  }
  flushT(); flushP();
  return out;
}
