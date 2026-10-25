/* HM-28b: báo cáo Word TD.reportdocx — dựng .docx từ CÙNG các trang tính của TD.report (một nguồn số với Excel/màn hình); hàm thuần theo thư viện docx truyền vào, nhúng nguyên văn + Node test.
   sheets: [{name,widths,money:[cột],pct:[cột],rows:[[...]]}] (khuôn TD.report.sheets). opts: {dataDate, periodLabel, at, by, signers:[tên chức danh…]|null, title} */
(function (root) {
  'use strict';
  var TD = root.TD = root.TD || {};
  var X = {};
  var NAVY = '1A2540', YEL = 'FFF3B0', GRY = 'EEF2F7', RED = 'B91C1C', GRN = '15803D';
  X.fmtInt = function (n) { return Math.round(+n || 0).toLocaleString('vi-VN'); };
  X.fmtPct = function (p) { return ((+p || 0) * 100).toFixed(1).replace('.', ',') + '%'; };
  /* tách các dòng của một trang tính thành khối: title / kv / section / table{head,rows} */
  X.blocks = function (rows) {
    var out = [], cur = null, first = true;
    var flush = function () { if (cur) { out.push(cur); cur = null; } };
    rows.forEach(function (r) {
      if (!r.length) { flush(); return; }
      if (r.length >= 3) { if (!cur) cur = { kind: 'table', head: r, rows: [] }; else cur.rows.push(r); return; }
      flush();
      if (r.length === 1) { out.push({ kind: first ? 'title' : 'section', text: String(r[0]) }); first = false; }
      else out.push({ kind: 'kv', k: String(r[0]), v: r[1] == null ? '' : String(r[1]) });
    });
    flush();
    return out;
  };
  X.cellText = function (sheet, ci, v) {
    if (typeof v !== 'number') return v == null ? '' : String(v);
    if ((sheet.pct || []).indexOf(ci) >= 0) return X.fmtPct(v);
    return X.fmtInt(v);
  };
  X.build = function (lib, sheets, opts) {
    opts = opts || {};
    var D = lib, sections = [];
    var run = function (t, o) { o = o || {}; return new D.TextRun({ text: t, bold: !!o.bold, color: o.color, size: o.size || 20, font: 'Arial' }); };
    var para = function (children, o) { o = o || {}; return new D.Paragraph({ children: children, alignment: o.align, spacing: { before: o.before || 0, after: o.after == null ? 80 : o.after }, keepNext: !!o.keepNext }); };
    var cell = function (text, w, o) {
      o = o || {};
      return new D.TableCell({ width: { size: w, type: D.WidthType.DXA }, shading: o.fill ? { type: D.ShadingType.CLEAR, color: 'auto', fill: o.fill } : undefined,
        margins: { top: 40, bottom: 40, left: 80, right: 80 }, verticalAlign: D.VerticalAlign ? D.VerticalAlign.CENTER : undefined,
        children: [para([run(text, { bold: o.bold, color: o.color })], { align: o.right ? D.AlignmentType.RIGHT : (o.center ? D.AlignmentType.CENTER : D.AlignmentType.LEFT), after: 0 })] });
    };
    sheets.forEach(function (sh, si) {
      var wide = sh.widths.length >= 7;
      var pageW = wide ? 14570 : 9638, sum = sh.widths.reduce(function (a, b) { return a + b; }, 0);
      var colW = sh.widths.map(function (w) { return Math.max(500, Math.floor(w / sum * pageW)); });
      var kids = [];
      X.blocks(sh.rows).forEach(function (b) {
        if (b.kind === 'title') kids.push(para([run(b.text, { bold: true, size: 30, color: NAVY })], { align: D.AlignmentType.CENTER, after: 120 }));
        else if (b.kind === 'section') kids.push(para([run(b.text, { bold: true, size: 24, color: NAVY })], { before: 200, after: 80, keepNext: true }));
        else if (b.kind === 'kv') kids.push(para([run(b.k + ': ', { bold: true }), run(b.v)], { after: 40 }));
        else {
          var n = b.head.length, isNum = function (ci) { return (sh.money || []).indexOf(ci) >= 0 || (sh.pct || []).indexOf(ci) >= 0 || b.rows.some(function (r) { return typeof r[ci] === 'number'; }); };
          var trs = [new D.TableRow({ tableHeader: true, cantSplit: true, children: b.head.map(function (h, ci) { return cell(String(h), colW[ci] || 1000, { fill: NAVY, bold: true, color: 'FFFFFF', center: true }); }) })];
          b.rows.forEach(function (r) {
            var lech = r.some(function (v) { return v === 'LỆCH'; }), total = /^TỔNG/.test(String(r[0]));
            trs.push(new D.TableRow({ cantSplit: true, children: b.head.map(function (h, ci) {
              var v = r[ci], t = X.cellText(sh, ci, v), o = { right: typeof v === 'number', bold: total, fill: lech ? YEL : (total ? GRY : undefined) };
              if (v === 'LỆCH') { o.bold = true; o.color = RED; o.center = true; } else if (v === 'KHỚP') { o.bold = true; o.color = GRN; o.center = true; }
              return cell(t, colW[ci] || 1000, o);
            }) }));
          });
          kids.push(new D.Table({ width: { size: pageW, type: D.WidthType.DXA }, columnWidths: colW, rows: trs }));
          kids.push(para([run('')], { after: 60 }));
        }
      });
      if (si === sheets.length - 1 && opts.signers && opts.signers.length) {
        var sw = Math.floor(pageW / opts.signers.length), none = { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' };
        kids.push(para([run('')], { before: 240 }));
        kids.push(new D.Table({ width: { size: pageW, type: D.WidthType.DXA }, columnWidths: opts.signers.map(function () { return sw; }),
          borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none },
          rows: [new D.TableRow({ cantSplit: true, children: opts.signers.map(function (s) { return new D.TableCell({ width: { size: sw, type: D.WidthType.DXA }, children: [
            para([run(s, { bold: true })], { align: D.AlignmentType.CENTER, after: 0 }), para([run('(Ký, ghi rõ họ tên)', { size: 18 })], { align: D.AlignmentType.CENTER, after: 900 }) ] }); }) })] }));
      }
      sections.push({ properties: { page: { size: { orientation: wide ? D.PageOrientation.LANDSCAPE : D.PageOrientation.PORTRAIT, width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
        footers: { default: new D.Footer({ children: [para([run('QLTD PRO · ' + (opts.periodLabel || (opts.dataDate ? 'Ngày dữ liệu ' + opts.dataDate : '')) + ' · Trang ', { size: 16 }), new D.TextRun({ children: [D.PageNumber.CURRENT], size: 16, font: 'Arial' })], { align: D.AlignmentType.CENTER, after: 0 })] }) },
        children: kids });
    });
    return new D.Document({ creator: opts.by || 'QLTD PRO', title: opts.title || 'Báo cáo QLTD PRO', styles: { default: { document: { run: { font: 'Arial', size: 20 } } } }, sections: sections });
  };
  TD.reportdocx = X;
  if (typeof module !== 'undefined' && module.exports) module.exports = TD;
})(typeof window !== 'undefined' ? window : globalThis);
