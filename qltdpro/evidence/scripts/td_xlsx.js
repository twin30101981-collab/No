/* HM-28 (P04d): ghi .xlsx CÓ ĐỊNH DẠNG cho báo cáo chuẩn TD.xlsx — hàm thuần (dựng XML), đóng gói bằng JSZip đã nhúng; nhúng nguyên văn vào app + Node test.
   SheetJS bản cộng đồng không ghi được kiểu ô (đậm, màu nền, viền) nên báo cáo Excel trước đây trơn. Đầu vào là khuôn TD.report.sheets:
   [{name, widths, money:[cột], pct:[cột], rows:[[...]]}]. Vai trò dòng suy từ nội dung: dòng 0 tiêu đề; dòng 1 ô chữ IN HOA = đề mục;
   dòng toàn chữ (≥3 ô) ngay trên dòng dữ liệu = hàng tiêu đề cột; ô đầu "TỔNG…" = dòng tổng; [nhãn, giá trị] = thông tin. */
(function (root) {
  'use strict';
  var TD = root.TD = root.TD || {};
  var X = {};
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ''); };
  var isStr = function (v) { return typeof v === 'string' && v !== ''; };
  var isNum = function (v) { return typeof v === 'number' && isFinite(v); };
  X.col = function (i) { var s = ''; i++; while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
  /* chỉ số kiểu (khớp thứ tự cellXfs trong X.styles) */
  X.S = { text: 0, title: 1, section: 2, head: 3, label: 4, int: 5, money: 6, pct: 7, totText: 8, totInt: 9, totMoney: 10, totPct: 11, ok: 12, bad: 13, cell: 14 };
  X.rowKind = function (rows, i) {
    var r = rows[i] || [], ne = r.filter(function (v) { return v !== '' && v != null; });
    if (!ne.length) return 'blank';
    if (i === 0) return 'title';
    if (ne.length === 1 && isStr(r[0]) && r[0] === r[0].toUpperCase() && /[A-ZÀ-Ỹ]/.test(r[0])) return 'section';
    if (/^TỔNG/.test(String(r[0]))) return 'total';
    var nx = rows[i + 1] || [];
    if (ne.length >= 3 && ne.every(isStr) && nx.some(function (v) { return v !== '' && v != null; })) return 'head';
    if (r.length === 2 && isStr(r[0])) return 'info';
    return 'data';
  };
  X.styleOf = function (sh, kind, c, v) {
    var m = (sh.money || []).indexOf(c) >= 0, p = (sh.pct || []).indexOf(c) >= 0;
    if (kind === 'title') return X.S.title;
    if (kind === 'section') return X.S.section;
    if (kind === 'head') return X.S.head;
    if (kind === 'info') return c === 0 ? X.S.label : X.S.text;
    if (kind === 'total') return isNum(v) ? (p ? X.S.totPct : m ? X.S.totMoney : X.S.totInt) : X.S.totText;
    if (isNum(v)) return p ? X.S.pct : m ? X.S.money : X.S.int;
    if (v === 'KHỚP') return X.S.ok;
    if (v === 'LỆCH') return X.S.bad;
    return X.S.cell;
  };
  X.sheetXml = function (sh) {
    var rows = sh.rows || [], ncol = Math.max(1, (sh.widths || []).length, rows.reduce(function (a, r) { return Math.max(a, (r || []).length); }, 0)), out = [], merges = [], headRow = -1;
    rows.forEach(function (r, i) {
      var kind = X.rowKind(rows, i); if (kind === 'head' && headRow < 0) headRow = i;
      var cells = [], wide = kind === 'title' || kind === 'section';
      (r || []).forEach(function (v, c) {
        if (v === '' || v == null) { if (kind === 'head' || kind === 'total' || kind === 'data') cells.push('<c r="' + X.col(c) + (i + 1) + '" s="' + (kind === 'head' ? X.S.head : kind === 'total' ? X.S.totText : X.S.cell) + '"/>'); return; }
        var a = X.col(c) + (i + 1), s = X.styleOf(sh, kind, c, v);
        cells.push(isNum(v) ? '<c r="' + a + '" s="' + s + '"><v>' + v + '</v></c>' : '<c r="' + a + '" s="' + s + '" t="inlineStr"><is><t xml:space="preserve">' + esc(v) + '</t></is></c>');
      });
      if (kind === 'head' || kind === 'total') for (var c = (r || []).length; c < ncol; c++) cells.push('<c r="' + X.col(c) + (i + 1) + '" s="' + (kind === 'head' ? X.S.head : X.S.totText) + '"/>');
      if (wide && ncol > 1) merges.push('A' + (i + 1) + ':' + X.col(ncol - 1) + (i + 1));
      out.push('<row r="' + (i + 1) + '"' + (kind === 'title' ? ' ht="24" customHeight="1"' : kind === 'head' ? ' ht="30" customHeight="1"' : '') + '>' + cells.join('') + '</row>');
    });
    var cols = (sh.widths || []).map(function (w, i) { return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>'; }).join('');
    var pane = headRow >= 0 ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="' + (headRow + 1) + '" topLeftCell="A' + (headRow + 2) + '" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' : '';
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      pane + (cols ? '<cols>' + cols + '</cols>' : '') + '<sheetData>' + out.join('') + '</sheetData>' +
      (merges.length ? '<mergeCells count="' + merges.length + '">' + merges.map(function (m) { return '<mergeCell ref="' + m + '"/>'; }).join('') + '</mergeCells>' : '') +
      '<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>';
  };
  X.styles = function () {
    var font = function (b, sz, color) { return '<font>' + (b ? '<b/>' : '') + '<sz val="' + sz + '"/>' + (color ? '<color rgb="' + color + '"/>' : '') + '<name val="Times New Roman"/><family val="1"/></font>'; };
    var fill = function (rgb) { return '<fill><patternFill patternType="solid"><fgColor rgb="' + rgb + '"/><bgColor indexed="64"/></patternFill></fill>'; };
    var B = '<border><left style="thin"><color rgb="FF94A3B8"/></left><right style="thin"><color rgb="FF94A3B8"/></right><top style="thin"><color rgb="FF94A3B8"/></top><bottom style="thin"><color rgb="FF94A3B8"/></bottom><diagonal/></border>';
    /* font: 0 thường · 1 tiêu đề · 2 đậm · 3 đậm trắng · 4 đậm xanh lá · 5 đậm đỏ;  fill: 2 navy · 3 xám nhạt · 4 xanh nhạt;  border: 1 viền mảnh */
    var xf = function (numFmt, fontId, fillId, borderId, h, wrap) { return '<xf numFmtId="' + numFmt + '" fontId="' + fontId + '" fillId="' + fillId + '" borderId="' + borderId + '" xfId="0"' + (numFmt ? ' applyNumberFormat="1"' : '') + ' applyFont="1"' + (fillId ? ' applyFill="1"' : '') + (borderId ? ' applyBorder="1"' : '') + ' applyAlignment="1"><alignment vertical="center"' + (h ? ' horizontal="' + h + '"' : '') + (wrap ? ' wrapText="1"' : '') + '/></xf>'; };
    var cellXfs = [xf(0, 0, 0, 0), xf(0, 1, 0, 0, 'center'), xf(0, 2, 4, 0), xf(0, 3, 2, 1, 'center', 1), xf(0, 2, 0, 0), xf(3, 0, 0, 1), xf(3, 0, 0, 1), xf(164, 0, 0, 1),
      xf(0, 2, 3, 1), xf(3, 2, 3, 1), xf(3, 2, 3, 1), xf(164, 2, 3, 1), xf(0, 4, 0, 1, 'center'), xf(0, 5, 0, 1, 'center'), xf(0, 0, 0, 1, null, 1)];
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<numFmts count="1"><numFmt numFmtId="164" formatCode="0.0%"/></numFmts>' +
      '<fonts count="6">' + font(0, 12) + font(1, 14, 'FF0F2A5C') + font(1, 12) + font(1, 12, 'FFFFFFFF') + font(1, 12, 'FF15803D') + font(1, 12, 'FFB91C1C') + '</fonts>' +
      '<fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' + fill('FF1A2540') + fill('FFE2E8F0') + fill('FFE8F5EC') + '</fills>' +
      '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>' + B + '</borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="' + cellXfs.length + '">' + cellXfs.join('') + '</cellXfs>' +
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
  };
  X.safeName = function (n, used) { var s = String(n || 'Sheet').replace(/[\[\]:*?\/\\]/g, ' ').slice(0, 31) || 'Sheet', b = s, k = 2; while (used[s.toLowerCase()]) { s = b.slice(0, 28) + ' ' + k++; } used[s.toLowerCase()] = 1; return s; };
  /* files(sheets): { đường dẫn trong gói: nội dung } — đủ để mở bằng Excel/LibreOffice */
  X.files = function (sheets) {
    var used = {}, names = sheets.map(function (s) { return X.safeName(s.name, used); }), f = {};
    f['[Content_Types].xml'] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      sheets.map(function (s, i) { return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join('') + '</Types>';
    f['_rels/.rels'] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
    f['xl/workbook.xml'] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
      names.map(function (n, i) { return '<sheet name="' + esc(n) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join('') + '</sheets></workbook>';
    f['xl/_rels/workbook.xml.rels'] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      sheets.map(function (s, i) { return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join('') +
      '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
    f['xl/styles.xml'] = X.styles();
    sheets.forEach(function (s, i) { f['xl/worksheets/sheet' + (i + 1) + '.xml'] = X.sheetXml(s); });
    return f;
  };
  /* build(sheets, JSZip) ⇒ Promise<Blob|Uint8Array> */
  X.build = function (sheets, JSZip) {
    var z = new JSZip(), f = X.files(sheets); Object.keys(f).forEach(function (k) { z.file(k, f[k]); });
    return z.generateAsync({ type: typeof window !== 'undefined' ? 'blob' : 'uint8array', compression: 'DEFLATE', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  };
  TD.xlsx = X;
  if (typeof module !== 'undefined' && module.exports) module.exports = TD;
})(typeof window !== 'undefined' ? window : globalThis);
