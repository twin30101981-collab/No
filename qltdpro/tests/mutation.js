/* Đột biến: tái tạo các lỗi đã sửa vào BẢN SAO của app rồi chạy e2e; mỗi đột biến phải làm đúng nhóm HM tương ứng thất bại. */
const fs = require('fs'), path = require('path'), cp = require('child_process'), os = require('os');
const APP = path.resolve(process.argv[2]); const html = fs.readFileSync(APP, 'utf8');
const MUT = [
  { hm: 'HM-01', name: 'chèn xuống dòng vào chuỗi SheetJS (script vendor không biên dịch)', f: s => s.replace('<title>SheetJS Table Export</title>', '<title>SheetJS\nTable Export</title>') },
  { hm: 'HM-02', name: 'bỏ SheetJS, bộ đọc .xlsx tự viết đổi MỌI số 1<x<100000 thành ngày (lỗi gốc)', f: s => s.replace("if (typeof XLSX !== 'undefined') return parseXLS_legacy(file);", '').replace('num > 1 && num < 100000 && styleIdx != null && dateXf.has(+styleIdx)', 'num > 1 && num < 100000') },
  { hm: 'HM-03', name: 'cổng ghi đè L/S cho phép sửa tự động đè cả giá trị hợp lệ', f: s => s.replace('return !isFinite(cur) || cur < 1 || cur > 30;\n};', 'return true;\n};') },
  { hm: 'HM-04', name: 'chunk hỏng bị bỏ qua im lặng, nạp phần còn lại như dữ liệu đầy đủ', f: s => s.replace('if (bad) { _hm04MarkCorrupt(key, bad, meta.length); return []; }', 'if (bad) { return parts.filter(p => p.a).flatMap(p => p.a); }') },
  { hm: 'HM-05', name: 'nhúng lại seed Past Due (dữ liệu cứng) tự ghi vào trình duyệt khi mở', f: s => s.replace("    asOf: '',\n    rows: []\n  };", "    asOf: '01/01/2026',\n    rows: [{ makh: '9999999999', sohd: 'MUT-1', ten: 'Khách hàng giả', cbtd: '', soNgayQH: 1, loaiCV: '', kieuQH: '', duNoQH: 1, laiQH: 0, ngayQH: '01/01/2026' }]\n  };") },
  { hm: 'HM-08', name: 'đếm khách hàng theo số dòng thay vì theo mã', f: s => s.replace('M.countCustomers = function (rows) {', 'M.countCustomers = function (rows) { return rows.length;') },
  { hm: 'HM-09', name: 'báo cáo theo CBTD bỏ im lặng phần chưa phân', f: s => s.replace('u.hs++; u.duno += dn;', 'u.hs++; u.duno += 0;') },
  { hm: 'HM-17b', name: 'bật lại pager desktop-patch chồng lên bảng dữ liệu', f: s => s.replace("&& !/^table-(qltd|kd|td|denhan|laidong)$/.test(tbl.id||'')) setupPagination(tbl);", ") setupPagination(tbl);") },
  { hm: 'HM-17b', name: 'chọn cột: không đặt lại colspan tiêu đề gộp ô (lệch cột)', f: s => s.replace('if (!c.dataset.tdCs) c.dataset.tdCs = c.colSpan;', 'if (!c.dataset.tdCs) c.dataset.tdCs = c.colSpan; return;') },
  { hm: 'HM-10', name: 'TSBĐ: bỏ khử trùng clno (một TS thế chấp qua 2 HĐ bị cộng 2 lần)', f: s => s.replace('if (seen[k]) { dupRows.push(t); dupKeys[k] = 1; }', 'if (false) {}') },
  { hm: 'HM-28', name: 'báo cáo Excel quay về SheetJS trơn (mất định dạng)', f: s => s.replace("if (window.JSZip && TD.xlsx) {", "if (false) {") },
  { hm: 'HM-13b', name: 'showPage không chạy sổ hook (mất khởi tạo trang Hồ sơ/FHS/…)', f: s => s.replace("TD.pageHooks.forEach(h => { try { h(name, el); }", "[].forEach(h => { try { h(name, el); }") },
  { hm: 'HM-16b', name: 'thêm z-index literal ≥100 ngoài thang token', f: s => s.replace(/<\/head>/g, '<style>.zz-mut{z-index:99999}</style></head>') },
  { hm: 'HM-16c', name: 'thêm lại một kiểu tab riêng lệch chuẩn', f: s => s.replace(/<\/head>/g, '<style>.ctkh-tab{font-size:10px!important;padding:2px 3px!important}</style></head>') },
  { hm: 'HM-16c', name: 'thêm lại một khối :root rời', f: s => s.replace(/<\/head>/g, '<style>:root{--zz-mut:1}</style></head>') },
  { hm: 'CSS', name: 'mất dòng mở @media ngăn kéo (lỗi gốc: quy tắc ngăn kéo áp mọi độ rộng, menu bên ẩn trên máy tính)', f: s => s.replace('@media(max-width:1279px){\n  /* ── Sidebar: ngăn kéo ── */\n', '/* ── Sidebar: ngăn kéo ── */\n') },
  { hm: 'HM-17', name: 'bảng Dư nợ mặc định không còn tự lùi mẫu cột (tràn ngang ở 1920 với menu cố định — lỗi P05)', f: s => s.replace('while (ix < chain.length - 1) {', 'while (false) {') },
  { hm: 'CSS', name: 'nút ↶/↷ định vị cố định đè lên topbar (lỗi cũ)', f: s => s.replace('var tr=document.querySelector(\'.topbar-right\');', 'var tr=null;').replace('{\n  display: none; gap: 2px; align-items: center; flex-shrink: 0;\n}', '{\n  display: none; gap: 2px; align-items: center; position: fixed; top: 8px; right: 310px; z-index: calc(var(--z-6,10000) + 1);\n}') },
  { hm: 'SEC', name: 'bỏ escape tên khách hàng khi dựng bảng Dư nợ (chèn mã qua dữ liệu nhập)', f: s => s.replace('const escapeHtml = s => String(s ?? \'\').replace(/[&<>"\']/g, c => ({\'&\':\'&amp;\',\'<\':\'&lt;\',\'>\':\'&gt;\',\'"\':\'&quot;\',"\'":\'&#39;\'}[c]));', 'const escapeHtml = s => String(s ?? \'\');') },
  { hm: 'HM-19', name: 'thẻ KPI tổng dư nợ đếm số hồ sơ thay vì cộng dư nợ (lệch engine)', f: s => s.replace("tile('qltd', '💰', 'Tổng dư nợ', ty(S.totals.duno)", "tile('qltd', '💰', 'Tổng dư nợ', ty(S.totals.hs)") },
  { hm: 'CSS', name: 'ngăn chi tiết không mở khi bấm dòng', f: s => s.replace('    open(tr);\n  });', '  });') },
  { hm: 'HM-23', name: 'hoàn tác lần nhập không khôi phục dữ liệu', f: s => s.replace('DATA.qltd = U.rows; window._tdHubUndo = null;', 'window._tdHubUndo = null;') },
  { hm: 'SEC', name: 'bỏ escape tên mốc lưu trữ ở danh sách Lưu trữ (tên tệp chứa thẻ HTML)', f: s => s.replace('📊 ${escapeHtml(item.name)}</td>', '📊 ${item.name}</td>').replace('📄 <span style="font-weight:600;color:var(--navy)">${escapeHtml(item.name)}</span>', '📄 <span style="font-weight:600;color:var(--navy)">${item.name}</span>').replace('📊 <span>${escapeHtml(item.name)}</span>', '📊 <span>${item.name}</span>') },
  { hm: 'CSS', name: 'bỏ bẫy bàn phím của hộp thoại (Tab chui ra menu phía sau)', f: s => s.replace('if (!m.contains(a)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }', 'if (false) {}').replace('else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }', '').replace('else if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }', '') },
  { hm: 'SEC', name: 'bỏ escape ngày thế chấp/hết hạn ở bảng TSBĐ (ngày lấy từ tệp nhập)', f: s => s.replace("esc(dVN(t.ngayTheChap))", 'dVN(t.ngayTheChap)').replace("esc(dVN(t.ngayHetHan))", 'dVN(t.ngayHetHan)') },
  { hm: 'SEC', name: 'bỏ escape ghi chú/tên ở danh sách hồ sơ vay (hồ sơ nhập từ JSON chứa thẻ HTML)', f: s => s.replace("${escapeHtml(m.notes || '')}</textarea>", "${m.notes || ''}</textarea>").replace("const s = String(str == null ? '' : str);\n    if (!norm || !s) return escapeHtml(s);", "const s = String(str == null ? '' : str);\n    if (!norm || !s) return s;") },
  { hm: 'HM-23', name: 'Trung tâm nhập: tệp bị bỏ chọn vẫn được nhập (cờ loại bị bỏ qua)', f: s => s.replace('exclude: !!f.exclude }; });', 'exclude: false }; });') },
  { hm: 'HM-23', name: 'Trung tâm nhập: xem trước không escape ô dữ liệu', f: s => s.replace("h += '<' + t + '>' + esc(r[c]) + '</' + t + '>';", "h += '<' + t + '>' + r[c] + '</' + t + '>';") },
  { hm: 'PERF', name: 'modal-open: bỏ điều kiện nằm trong khung nhìn (ngăn kéo đóng bị coi là hộp thoại mở ⇒ dock ẩn vĩnh viễn)', f: s => s.replace('if (rc.right <= 0 || rc.left >= window.innerWidth || rc.bottom <= 0 || rc.top >= window.innerHeight) return false;', '') },
  { hm: 'PERF', name: 'modal-open: quay lại dùng offsetParent (không bao giờ phát hiện hộp thoại fixed — lỗi gốc)', f: s => s.replace('if (!el || !el.getClientRects().length) return false;', 'if (!el || !el.offsetParent) return false;') },
  { hm: 'PERF', name: 'TD_SXCB.rank: bộ nhớ đệm khoá sai (mọi phòng ban nhận hạng của lần gọi đầu)', f: s => s.replace('RANK_C[key] = i;', "RANK_C['k'] = i;").replace('var key = String(pb == null ? \'\' : pb), c = RANK_C[key];', "var key = String(pb == null ? '' : pb), c = RANK_C['k'];") },
  { hm: 'PERF', name: 'TSBĐ: lưu IndexedDB không còn bộ bắt lỗi (Promise bị từ chối chưa bắt khi IndexedDB bị chặn)', f: s => s.replace("return kvSet('current', { rows: S.rows, src: S.src, importedAt: S.importedAt }).catch(function () {", "return kvSet('current', { rows: S.rows, src: S.src, importedAt: S.importedAt }).then(function () {") },
  { hm: 'PERF', name: 'Web Vitals: ghi kv.set không bắt Promise bị từ chối (lỗi chưa bắt khi IndexedDB bị chặn)', f: s => s.replace('if (pr && pr.catch) pr.catch(function(){});', '') },
  { hm: 'PERF', name: 'saveData: bộ nhớ đệm nén bị tắt (nén lại 6 lần mỗi lần nhập — lỗi nghẽn 4,8 s)', f: s => s.replace("if (typeof str !== 'string' || str.length < 20000) return", "if (true) return") },
  { hm: 'PERF', name: 'saveData: bộ nhớ đệm nén khoá theo độ dài (lưu NHẦM dữ liệu cũ khi sửa 1 chữ số)', f: s => s.replace('let v = _lzMemoMap.get(str);', 'let v = _lzMemoMap.get(str.length);').replace('_lzMemoMap.set(str, v);', '_lzMemoMap.set(str.length, v);') },
  { hm: 'HM-17b', name: 'Phí DV: dựng lại cả tập không phân trang (lỗi nghẽn 7 s với dữ liệu thật)', f: s => s.replace('const visibleRows = __pg.size > 0 ? rows.slice(__start, __start + __pg.size) : rows;', 'const visibleRows = rows;') },
  { hm: 'HM-17b', name: 'Phí DV: "chọn tất cả" chỉ áp cho các dòng đang hiện (sót phần ở trang khác)', f: s => s.replace("getFilteredData('phidv').forEach(r => phidvSetSt(phidvGetRowKey(r), { checked: masterCb.checked }));", '') },
  { hm: 'HM-17b', name: '"Tất cả" không còn dựng dần (dựng cả 1.400 dòng một lần)', f: s => s.replace('__parts.length > 600);', '__parts.length > 600000);') },
  { hm: 'HM-17', name: 'Chuyển HM/TSBĐ: ô ghim không có tác dụng (không ghim cột)', f: s => s.replace('pin: spec ? (spec.pinTo != null && saved.pin === true)', 'pin: spec ? false') },
  { hm: 'HM-17', name: 'ghim cột Tên KH không còn bật mặc định', f: s => s.replace('(saved.pin === undefined ? viewportW >= 1280 : !!saved.pin)', '!!saved.pin') },
  { hm: 'HM-23', name: 'Trung tâm nhập bỏ nhận dạng theo tiêu đề cột (TSBĐ tên lạ bị nhập thành dư nợ)', f: s => s.replace("if (k && TD.hub.kind(f.name) !== k) { f.kind = k;", "if (false) { f.kind = k;") },
  { hm: 'HM-27', name: 'bỏ thẻ CSP chặn mạng (dữ liệu có thể gửi ra ngoài)', f: s => s.replace('document.head.appendChild(m); TD.net.cspApplied = csp;', 'TD.net.cspApplied = csp;') },
  { hm: 'P10-T1', name: 'Dashboard Bảng VIII dựng lại cả tập (không phân trang — 2.229 hàng, mở 1,4 s trên dữ liệu thật)', f: s => s.replace("window.__TDPagedTbody('db-lai', 'tbody-db-lai', topLai,", "((k, id, rows, f) => { document.getElementById(id).innerHTML = rows.map(f).join(''); })('db-lai', 'tbody-db-lai', topLai,") },
  { hm: 'P10-T2', name: 'Trả nợ: xuất Excel đọc thẳng bảng đang phân trang (mất các trang khác)', f: s => s.replace("window.__TDPagedFullClone('tbl-giam-duno', 'tranop-giam')", "document.getElementById('tbl-giam-duno')") },
  { hm: 'P10-T2', name: 'bảng phụ phân trang bỏ cắt trang (dựng cả tập)', f: s => s.replace('var vis = pg.size > 0 ? rows.slice(start, start + pg.size) : rows;', 'var vis = rows;') },
  { hm: 'P10-EXP', name: 'xuất Excel bảng đã phân trang chỉ lấy trang đang xem (lỗi tiềm ẩn từ HM-17b/P09)', f: s => s.replace('__pgSt.size = 0; window.__TD_NODEFER = true;', 'window.__TD_NODEFER = true;') },
  { hm: 'P10-T3', name: 'đọc Excel không dùng worker nữa (đọc đồng bộ trên luồng chính — longtask 1,2 s mỗi kỳ)', f: s => s.replace('if (TD.xlsWorker.alive() && !window.__TD_NO_WORKER) {', 'if (false) {') },
  { hm: 'P10-T3', name: 'worker bị chặn ⇒ không có đường dự phòng luồng chính (không nhập được)', f: s => s.replace('TD.xlsWorker.stat.main++;\n  return mainFn();', "throw new Error('no-worker');") },
  { hm: 'P10-T3', name: 'saveData không nén trước trong worker (nén 0,9 s trên luồng chính)', f: s => s.replace("if (!need.length || window.__TD_NO_WORKER || !window.TD", "if (true || window.__TD_NO_WORKER || !window.TD") },
  { hm: 'P10-T4', name: 'nhánh cứu lãi suất quay lại cắt phần thập phân (8,5 ⇒ 8 — lỗi tiềm ẩn của bản cũ)', f: s => s.replace('if (!isFinite(v) || v < X.DATE_MIN) return String(v);', 'if (!isFinite(v) || v < X.DATE_MIN) return String(Math.floor(v));') },
  { hm: 'P10-T5', name: 'Trung tâm nhập lưu lại sau MỖI lần gọi saveData (không gộp theo đợt)', f: s => s.replace('if (window.__TD_SAVE_DEFER > 0) { window.__TD_SAVE_PENDING = true; return true; }', '') },
  { hm: 'P10-T5', name: 'gộp lưu nhưng quên lưu cuối đợt (mất dữ liệu nhập khi tải lại)', f: s => s.replace('if (!window.__TD_SAVE_DEFER && window.__TD_SAVE_PENDING) {', 'if (false) {') },
  { hm: 'P10-T6', name: 'danh sách cán bộ bỏ qua cấu hình người dùng', f: s => s.replace("if (R.count(saved)) return { cfg: saved, src: 'config' };", '') },
  { hm: 'P10-T6', name: 'không còn khớp tên viết tắt / đổi họ (thay cho bảng bí danh nhúng cứng)', f: s => s.replace('res = hits.length === 1 ? hits[0] : null;', 'res = null;') },
  { hm: 'P10-T6', name: 'chưa cấu hình thì không tự học phòng ban từ dữ liệu', f: s => s.replace('Object.keys(by).forEach(function (k) {\n      var o = by[k], best', '[].forEach(function (k) {\n      var o = by[k], best') },
  { hm: 'P10-T7', name: 'topbar mất nút ↶ hoàn tác (lệch tiêu chí HM-15 cập nhật)', f: s => s.replace("u.id='dp-undo-btn';", "u.id='dp-undo-x';") },
  { hm: 'P10-T9', name: 'không gỡ DOM trang không hoạt động (giữ ~150.000 nút sau khi duyệt hết trang)', f: s => s.replace("el.querySelectorAll('tbody').forEach(tb => { if (tb.firstChild) tb.textContent = ''; });", '') },
  { hm: 'P10-T9', name: 'gỡ cả trang có biểu mẫu giữ trạng thái (Hồ sơ vay) — mất dữ liệu đang nhập', f: s => s.replace("window.__TD_TRIM_MIN = 2500;", "window.__TD_TRIM_MIN = 2500; window.__TD_TRIM.add('hsvv');") },
  { hm: 'P10-T10', name: 'Trung tâm nhập không giữ nội dung tệp đã đọc (đọc lại 3 lần mỗi tệp)', f: s => s.replace('if (keep && bufHeld() + f.size <= BUF_MAX) f.__tdBuf = p;', '') },
];
const ONLY = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null; // vd. --only HM-16c
const FROM = process.argv.includes('--from') ? +process.argv[process.argv.indexOf('--from') + 1] : 1; // P10: chạy tiếp từ đột biến thứ N (1 = đầu)
let bad = 0;
for (const m of MUT.filter(x => !ONLY || x.hm === ONLY).slice(FROM - 1)) {
  const out = m.f(html); if (out === html) { console.log('✘ ' + m.hm + ' — đột biến không áp dụng được (mẫu mã đã đổi): ' + m.name); bad++; continue; }
  const f = path.join(os.tmpdir(), 'td_mut_' + m.hm.replace(/\W/g, '') + '.html'); fs.writeFileSync(f, out);
  const r = cp.spawnSync('node', [path.join(__dirname, 'e2e/suite.js'), f, '--json', f + '.json'], { encoding: 'utf8', timeout: 900000, env: process.env });
  let J = []; try { J = JSON.parse(fs.readFileSync(f + '.json', 'utf8')) } catch (e) {}
  const hit = J.filter(x => !x.ok && x.hm.split('/').some(h => m.hm.endsWith(h.replace('HM-', '')) || x.hm.includes(m.hm)));
  const caught = hit.length > 0 || (J.length === 0 && r.status !== 0);
  console.log((caught ? '✔ ' : '✘ ') + m.hm + ' — ' + m.name + (caught ? ' → phát hiện: ' + (hit[0] ? hit[0].name.slice(0, 70) : 'e2e không chạy được') : ' → KHÔNG bị phát hiện!'));
  if (!caught) bad++; fs.unlinkSync(f);
}
process.exit(bad ? 1 : 0);
