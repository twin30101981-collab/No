/* HM-06: module số / ngày dùng chung (TD.num, TD.date).
   Một nguồn duy nhất thay cho 3 bản parseVNDate, 2 bản parseNum, groupDigits/stripDots rải rác.
   Nguồn này vừa được nhúng nguyên văn vào app, vừa được Node nạp trực tiếp để kiểm thử (không có bản sao thứ hai). */
(function (root) {
  'use strict';
  var TD = root.TD = root.TD || {};

  /* ───────── SỐ ───────── */
  var num = {};
  /* parse(v): số thực hoặc NaN. Nhận 300.000.000 · 300,000,000 · 1.234,56 · 1,234.56 · (1.234) · -5 · 8,5 · 0.075 · "1.234 đ"
     Quy tắc dấu phân cách: có cả '.' và ',' → dấu xuất hiện CUỐI là thập phân, dấu kia là hàng nghìn;
     chỉ một loại dấu, xuất hiện ≥2 lần → hàng nghìn; xuất hiện 1 lần → hàng nghìn nếu đúng 3 chữ số sau dấu
     và phần trước dấu 1–3 chữ số không phải "0"; ngược lại là thập phân. */
  num.parse = function (v) {
    if (typeof v === 'number') return isFinite(v) ? v : NaN;
    if (v == null) return NaN;
    var s = String(v).trim();
    if (!s) return NaN;
    if (/^[+-]?\d+(\.\d+)?[eE][+-]?\d+$/.test(s)) return Number(s);
    var neg = false;
    if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
    s = s.replace(/[−–]/g, '-');
    if (s.charAt(0) === '-') { neg = true; s = s.slice(1); }
    s = s.replace(/[^\d.,]/g, '');
    if (!/\d/.test(s)) return NaN;
    var dots = (s.match(/\./g) || []).length, commas = (s.match(/,/g) || []).length;
    var out;
    if (dots && commas) {
      var dec = s.lastIndexOf('.') > s.lastIndexOf(',') ? '.' : ',';
      var th = dec === '.' ? ',' : '.';
      out = s.split(th).join('');
      var parts = out.split(dec);
      if (parts.length > 2) return NaN; // nhiều dấu thập phân
      out = parts[0] + (parts.length === 2 ? '.' + parts[1] : '');
    } else if (dots || commas) {
      var sep = dots ? '.' : ',';
      var cnt = dots || commas;
      if (cnt >= 2) {
        out = s.split(sep).join('');
      } else {
        var idx = s.indexOf(sep), left = s.slice(0, idx), right = s.slice(idx + 1);
        if (right.length === 3 && /^[1-9]\d{0,2}$/.test(left)) out = left + right;      // 1.234 / 300,000
        else out = left + '.' + right;                                                 // 8,5 / 0.075 / 12,3456
      }
    } else {
      out = s;
    }
    if (out === '' || out === '.') return NaN;
    var n = Number(out);
    if (!isFinite(n)) return NaN;
    return neg ? -n : n;
  };
  num.toNumber = function (v, def) { var n = num.parse(v); return isNaN(n) ? (def === undefined ? 0 : def) : n; };
  /* fmt(n, dec): chuẩn vi-VN (dấu '.' hàng nghìn, ',' thập phân), không phụ thuộc ICU của trình duyệt */
  num.fmt = function (n, dec) {
    n = Number(n); if (!isFinite(n)) return '';
    dec = dec == null ? 0 : dec;
    var neg = n < 0, a = Math.abs(n), f = a.toFixed(dec), p = f.split('.');
    var g = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (neg ? '-' : '') + g + (p[1] ? ',' + p[1] : '');
  };
  /* tiền VND nhập tay: số → làm tròn nguyên; chuỗi gõ tay → chỉ giữ chữ số; chuỗi số máy (≥4 chữ số + 1–2 thập phân) → làm tròn */
  num.groupVND = function (s) {
    if (s == null || s === '') return '';
    if (typeof s === 'number') return isFinite(s) ? num.fmt(Math.round(s), 0) : '';
    var t = String(s).trim();
    if (/^-?\d{4,}\.\d{1,2}$/.test(t)) return num.fmt(Math.round(Number(t)), 0);
    var neg = /^-/.test(t);
    var d = t.replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '');
    return d ? (neg ? '-' : '') + d.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '';
  };
  num.stripVND = function (s) {
    var t = String(s == null ? '' : s).trim();
    var d = t.replace(/[^\d]/g, '');
    return d && /^-/.test(t) ? '-' + d : d;
  };

  /* ───────── NGÀY ───────── */
  var date = {};
  function mk(y, m, d) {            // Date (giờ địa phương 00:00) hoặc null nếu ngày không tồn tại (31/02…)
    if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1000 || y > 9999) return null;
    var dt = new Date(y, m - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
    return dt;
  }
  var TAIL = '(?![\\d/\\-.])'; // sau năm không được tiếp tục là chữ số hoặc dấu phân cách (tránh "2026-05-31" thành 26/05/31, "…20261")
  var RE = {
    dmy4: new RegExp('^(\\d{1,2})[/\\-.](\\d{1,2})[/\\-.](\\d{4})' + TAIL),
    ymd:  new RegExp('^(\\d{4})[/\\-.](\\d{1,2})[/\\-.](\\d{1,2})(?![\\d])'),
    ymd8: /^(\d{4})(\d{2})(\d{2})$/,
    dmy2: /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/
  };
  /* parse(s): Date hợp lệ hoặc null. Neo đầu chuỗi (cho phép giờ/chữ theo sau).
     Nhận dd/mm/yyyy, d/m/yyyy, dd-mm-yyyy, dd.mm.yyyy, yyyy-mm-dd, yyyy/mm/dd, yyyymmdd, dd/mm/yy (năm 2000+). */
  date.parse = function (s) {
    if (s == null || s === '') return null;
    if (s instanceof Date) return isNaN(s) ? null : s;
    var str = String(s).trim(), m;
    if ((m = RE.dmy4.exec(str))) return mk(+m[3], +m[2], +m[1]);
    if ((m = RE.ymd.exec(str))) return mk(+m[1], +m[2], +m[3]);
    if ((m = RE.ymd8.exec(str))) return mk(+m[1], +m[2], +m[3]);
    if ((m = RE.dmy2.exec(str))) return mk(2000 + +m[3], +m[2], +m[1]);
    return null;
  };
  /* find(text): ngày hợp lệ đầu tiên nằm BẤT KỲ đâu trong văn bản (cho phát hiện ngày trên trang); ISO ưu tiên */
  date.find = function (text) {
    if (text == null) return null;
    var t = String(text), m, re;
    re = /(?<![\d/\-.])(\d{4})-(\d{1,2})-(\d{1,2})(?![\d])/g;
    while ((m = re.exec(t))) { var a = mk(+m[1], +m[2], +m[3]); if (a) return a; }
    re = /(?<![\d/\-.])(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4}|\d{2})(?![\d/\-.])/g;
    while ((m = re.exec(t))) { var y = +m[3]; if (m[3].length === 2) y += 2000; var b = mk(y, +m[2], +m[1]); if (b) return b; }
    return null;
  };
  date.iso = function (d) { d = d instanceof Date ? d : date.parse(d); return d ? d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2) : ''; };
  date.vn = function (d) { d = d instanceof Date ? d : date.parse(d); return d ? ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear() : ''; };
  date.isValid = function (s) { return !!date.parse(s); };

  TD.num = num; TD.date = date;
  if (typeof module !== 'undefined' && module.exports) module.exports = TD;
})(typeof window !== 'undefined' ? window : globalThis);
