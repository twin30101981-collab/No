/* HM-27: chế độ có mạng TD.net — phần THUẦN (cấu hình, chính sách CSP, so sánh phiên bản, gói dữ liệu gửi AI). Nhúng nguyên văn vào <head> (chạy trước mọi mã khác) + Node test.
   Nguyên tắc: MẶC ĐỊNH TẮT; khi tắt, CSP connect-src/img-src chỉ cho 'self'/blob:/data:/file: ⇒ trình duyệt chặn mọi gửi dữ liệu ra ngoài (fetch/XHR/WebSocket/sendBeacon/ảnh).
   Khi bật chỉ mở đúng các điểm đến người dùng khai báo (địa chỉ kiểm tra bản mới, địa chỉ AI). Dữ liệu khách hàng không nằm trong bất kỳ gói gửi đi nào. */
(function (root) {
  'use strict';
  var TD = root.TD = root.TD || {};
  var N = {};
  N.KEY = 'td_net_v1'; N.AIKEY = 'td_ai_key_v1'; N.LOGKEY = 'td_net_log_v1';
  N.defaults = function () { return { mode: 'off', versionUrl: '', cdn: false, ai: { enabled: false, endpoint: 'https://api.anthropic.com/v1/messages', model: 'claude-sonnet-5-5' } }; };
  /* origin(url): chỉ https://…, hoặc http://localhost | 127.0.0.1 (máy chủ nội bộ); còn lại ⇒ null */
  N.origin = function (u) {
    var m = /^(https?):\/\/([^\/?#:@\s]+)(?::(\d{1,5}))?(?:[\/?#]|$)/i.exec(String(u == null ? '' : u).trim());
    if (!m) return null;
    var sch = m[1].toLowerCase(), host = m[2].toLowerCase(), local = host === 'localhost' || host === '127.0.0.1';
    if (sch === 'http' && !local) return null;
    if (!/^[a-z0-9.-]+$/.test(host)) return null;
    return sch + '://' + host + (m[3] ? ':' + m[3] : '');
  };
  N.sanitize = function (o) {
    var d = N.defaults(); o = o && typeof o === 'object' ? o : {};
    var out = { mode: o.mode === 'on' ? 'on' : 'off', versionUrl: N.origin(o.versionUrl) ? String(o.versionUrl).trim() : '', cdn: !!o.cdn,
      ai: { enabled: !!(o.ai && o.ai.enabled), endpoint: d.ai.endpoint, model: d.ai.model } };
    if (o.ai && N.origin(o.ai.endpoint)) out.ai.endpoint = String(o.ai.endpoint).trim();
    if (o.ai && /^[\w.:-]{3,80}$/.test(String(o.ai.model || ''))) out.ai.model = o.ai.model;
    if (out.mode !== 'on') { out.cdn = false; out.ai.enabled = false; } // tắt tổng ⇒ tắt mọi tính năng con
    return out;
  };
  N.load = function (storage) { try { return N.sanitize(JSON.parse(storage.getItem(N.KEY) || 'null')); } catch (e) { return N.defaults(); } };
  N.save = function (storage, s) { var c = N.sanitize(s); storage.setItem(N.KEY, JSON.stringify(c)); return c; };
  /* csp(s): chuỗi Content-Security-Policy cho thẻ <meta> */
  N.csp = function (s) {
    s = N.sanitize(s); var self = "'self' blob: data: file:", conn = [self], img = ["'self' data: blob: file:"];
    if (s.mode === 'on') {
      var o1 = N.origin(s.versionUrl); if (o1) conn.push(o1);
      if (s.ai.enabled) { var o2 = N.origin(s.ai.endpoint); if (o2) conn.push(o2); }
    }
    var seen = {}; conn = conn.filter(function (x) { if (seen[x]) return false; seen[x] = 1; return true; });
    return 'connect-src ' + conn.join(' ') + '; img-src ' + img.join(' ');
  };
  /* so sánh phiên bản dạng "v22.3-HM27" / "22.3.1": so từng nhóm số; trả -1/0/1 */
  N.cmpVersion = function (a, b) {
    var pa = String(a || '').match(/\d+/g) || [], pb = String(b || '').match(/\d+/g) || [], n = Math.max(pa.length, pb.length);
    for (var i = 0; i < n; i++) { var x = +(pa[i] || 0), y = +(pb[i] || 0); if (x !== y) return x < y ? -1 : 1; }
    return 0;
  };
  /* aiPayload(S, opt): S = TD.metrics.summarize(...); chỉ SỐ TỔNG HỢP theo loại vay / nhóm nợ / phòng ban (+ các kỳ) — KHÔNG có dòng dữ liệu, tên/mã khách hàng, tên cán bộ */
  N.aiPayload = function (S, opt) {
    opt = opt || {};
    var g = function (a) { return (a || []).filter(function (x) { return x.hs; }).map(function (x) { return { ten: x.name || x.key, so_kh: x.kh, so_khoan: x.hs, du_no_dong: Math.round(x.duno) }; }); };
    var data = { ngay_du_lieu: opt.dataDate || '', tong: { so_kh: S.totals.kh, so_khoan: S.totals.hs, du_no_dong: Math.round(S.totals.duno) }, theo_loai_vay: g(S.byLoai), theo_nhom_no: g(S.byNhom), theo_phong_ban: g(S.byPB) };
    if (opt.periods && opt.periods.length) data.cac_ky = opt.periods.map(function (p) { return { ky: p.key || p.dayKey || p.label || '', du_no_dong: Math.round(p.duno || 0) }; });
    var q = opt.question || 'Nhận xét ngắn gọn các điểm đáng chú ý của số liệu tín dụng tổng hợp sau (cơ cấu loại vay, nhóm nợ, tập trung theo phòng ban, xu hướng nếu có) và gợi ý 3 việc cần kiểm tra thêm.';
    var text = q + '\n\nSố liệu tổng hợp (JSON, đơn vị đồng; không có thông tin khách hàng):\n' + JSON.stringify(data, null, 1);
    return { data: data, text: text, bytes: text.length };
  };
  /* thư viện dự phòng khi bản nhúng lỗi: BẮT BUỘC có băm SRI; entry không có sri ⇒ không bao giờ tải */
  N.FALLBACKS = [
    { global: 'docx', name: 'docx 9.0.2', url: 'https://cdn.jsdelivr.net/npm/docx@9.0.2/build/index.umd.js', sri: 'sha384-0E47/4EreyRZQl9Vw8U7veXxL32+P1HPJ5BrL92opvktfsv4TSgDXOq82EbGFW6N' },
    { global: 'JSZip', name: 'JSZip 3.10.1', url: 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js', sri: 'sha384-+mbV2IY1Zk/X1p/nWllGySJSUN8uMs+gUAN10Or95UBH0fpj6GfKgPmgC5EXieXG' },
    { global: 'PizZip', name: 'PizZip 3.1.4', url: 'https://cdn.jsdelivr.net/npm/pizzip@3.1.4/dist/pizzip.min.js', sri: 'sha384-FvddpNfjntISy3Nx0eINbhVULmpFTv7tCY0hXpHLc12/Php7+tloiPLA/laRq/d1' }, // = bản nhúng (đối chiếu gói npm)
    { global: 'XLSX', name: 'SheetJS 0.20.3', url: 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js', sri: '' }
  ];
  N.fallbackFor = function (g) { var f = N.FALLBACKS.filter(function (x) { return x.global === g; })[0]; return f && f.sri && N.origin(f.url) ? f : null; };
  TD.net = N;
  if (typeof module !== 'undefined' && module.exports) module.exports = TD;
})(typeof window !== 'undefined' ? window : globalThis);
