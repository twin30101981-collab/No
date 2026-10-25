"""HM-26: Khách hàng 360° (TD.kh360): trang "KHÁCH HÀNG 360°" — tìm theo mã/tên/số HĐ, 4 thẻ (Dư nợ, Hạn mức, TSBĐ, Nhóm nợ), tab Khoản vay · Tài sản bảo đảm ·
 Lịch sử các kỳ (cột dư nợ theo mốc đã nhập) · Hồ sơ vay (HSVV liên kết) · Ghi chú (lưu theo mã KH). Mở từ menu, từ bảng lệnh Ctrl+K (gõ tên/mã KH).
Dùng: python3 apply_hm26.py <vao.html> <ra.html>   (áp SAU apply_hm24)"""
import sys, os
src, dst = sys.argv[1], sys.argv[2]
here = os.path.dirname(os.path.abspath(__file__))
s = open(src, encoding='utf-8').read()
mod = open(os.path.join(here, 'td_kh360.js'), encoding='utf-8').read()
def rep(old, new):
    global s
    assert s.count(old) == 1, ('không duy nhất/không thấy', old[:90], s.count(old))
    s = s.replace(old, new)
glue = r"""
/* ───────── HM-26: giao diện Khách hàng 360° ───────── */
(function () {
  var esc = function (x) { return String(x == null ? '' : x).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var money = function (v) { return Math.round(Number(v) || 0).toLocaleString('vi-VN'); };
  var tyd = function (v) { v = Number(v) || 0; return (v / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' tỷ'; };
  var st = { key: null, tab: 'khoan' };
  function noteKey(h) { return 'td_kh_note_' + (h.ma || h.key); }
  function snaps() { var a = []; try { (_archiveReportList || []).forEach(function (x) { if (x && x.autoDaily && x.dayKey && Array.isArray(x.reportData)) a.push(x); }); } catch (e) {} return a; }
  function hoso(ma) {
    var out = []; try {
      var links = hsvvLinkGetAll(), recs = hosoGetAll(), m = String(ma || '').trim(); if (!m) return out;
      Object.keys(links).forEach(function (id) { var v = String(links[id] || ''); if (v.split('|')[0] === m && recs[id]) out.push({ id: id, ten: (recs[id]._meta && recs[id]._meta.tenKH) || '', sohd: v.split('|')[1] || '', loai: (recs[id]._meta && (recs[id]._meta.loai || recs[id]._meta.loaiHS)) || '', ngay: (recs[id]._meta && (recs[id]._meta.updated || recs[id]._meta.ngay)) || '' });
      });
    } catch (e) {} return out;
  }
  function compute() {
    var K = TD.kh360, t = { rows: null };
    var tsbd = null;
    try { if (window.TSBD && TSBD.rows && TSBD.rows.length && window.TSBD_mdig) { var row = (DATA.qltd || []).filter(function (r) { return r && K.key(r) === st.key; })[0]; tsbd = { rows: TSBD.rows, keyFn: TSBD_mdig, mdig: TSBD_mdig(row ? row[0] : ''), dedupe: TD.tsbd.dedupe, value: TD.tsbd.value, isVND: TD.tsbd.isVND }; } } catch (e) {}
    var row0 = (DATA.qltd || []).filter(function (r) { return r && K.key(r) === st.key; })[0];
    return K.build({ key: st.key, rows: DATA.qltd || [], tsbd: tsbd, snaps: snaps(), parse: parseVNDate, today: todayMidnight(), hoso: hoso(row0 ? row0[0] : '') });
  }
  function bars(H) {
    if (!H.length) return '<div style="padding:12px;color:#555">Chưa có mốc nào chứa khách hàng này — nhập thêm tệp dư nợ các kỳ.</div>';
    var W = 760, Hh = 240, L = 60, B = 40, T = 12, mx = Math.max.apply(null, H.map(function (x) { return x.duno; })) || 1, bw = Math.min(54, (W - L - 10) / H.length - 8);
    var svg = H.map(function (x, i) { var h = (Hh - T - B) * x.duno / mx, cx = L + (W - L - 10) * (i + .5) / H.length; return '<rect x="' + (cx - bw / 2) + '" y="' + (Hh - B - h) + '" width="' + bw + '" height="' + Math.max(h, x.duno ? 1 : 0) + '" rx="3" fill="' + (x.nhom >= 2 ? '#b45309' : '#0d5c1e') + '"><title>' + esc(x.key) + ': ' + money(x.duno) + ' đ · ' + x.hs + ' khoản · Nhóm ' + x.nhom + '</title></rect><text x="' + cx + '" y="' + (Hh - B + 14) + '" text-anchor="middle" font-size="10" fill="#475569" transform="rotate(-25 ' + cx + ' ' + (Hh - B + 14) + ')">' + esc(x.key.slice(0, 5) + '/' + x.key.slice(8)) + '</text>'; }).join('');
    return '<svg viewBox="0 0 ' + W + ' ' + Hh + '" width="100%" style="max-width:' + W + 'px"><line x1="' + L + '" x2="' + (W - 10) + '" y1="' + (Hh - B) + '" y2="' + (Hh - B) + '" stroke="#cbd5e1"/><text x="' + (L - 6) + '" y="' + (T + 8) + '" text-anchor="end" font-size="10.5" fill="#475569">' + tyd(mx) + '</text><text x="' + (L - 6) + '" y="' + (Hh - B) + '" text-anchor="end" font-size="10.5" fill="#475569">0</text>' + svg + '</svg><div style="font-size:.78rem;color:#555">Cột cam = có nhóm nợ ≥ 2 ở kỳ đó.</div>';
  }
  function render() {
    var box = document.getElementById('kh360-view'); if (!box) return;
    if (!st.key) { box.innerHTML = '<div style="padding:16px;color:#555">Gõ tên / mã KH / số HĐTD vào ô tìm kiếm phía trên (hoặc dùng Ctrl+K).</div>'; return; }
    var B = compute(), h = B.header;
    if (!h.nKhoan && !B.khoan.length) { box.innerHTML = '<div style="padding:16px;color:#b91c1c">Không tìm thấy khách hàng trong dữ liệu đang nạp.</div>'; return; }
    var card = function (t, v, sub, cls) { return '<div style="flex:1 1 190px;border:1px solid #e5e7eb;border-radius:10px;padding:10px 14px;background:#fff"><div style="font-size:.75rem;color:#566579">' + t + '</div><div style="font-size:1.5rem;font-weight:800;' + (cls || '') + '">' + v + '</div><div style="font-size:.78rem;color:#566579">' + sub + '</div></div>'; };
    var use = h.hmtd > 0 ? (h.duno / h.hmtd * 100).toFixed(1) + '% hạn mức' : '—';
    var tsHtml = B.ts ? card('TSBĐ (khử trùng clno)', tyd(B.ts.gt), B.ts.n + ' tài sản' + (B.ts.ratio != null ? ' · ' + B.ts.ratio.toFixed(2) + '× dư nợ' : '') + (B.ts.fx ? ' · ' + B.ts.fx + ' ngoại tệ' : '')) : card('TSBĐ', '—', 'chưa nạp sao kê TSBĐ');
    var tabs = [['khoan', 'Khoản vay'], ['ts', 'Tài sản bảo đảm'], ['ls', 'Lịch sử các kỳ'], ['hs', 'Hồ sơ vay'], ['gc', 'Ghi chú']];
    var note = ''; try { note = localStorage.getItem(noteKey(h)) || ''; } catch (e) {}
    var body = {
      khoan: '<div class="table-wrap"><table class="data-table"><thead><tr><th>SỐ HĐTD</th><th>LOẠI</th><th style="text-align:right">HMTD</th><th style="text-align:right">DƯ NỢ</th><th>L/S %</th><th>ĐẾN HẠN</th><th>NHÓM</th></tr></thead><tbody>' + B.khoan.map(function (k) { return '<tr><td>' + esc(k.sohd) + '</td><td>' + esc(k.loai) + '</td><td style="text-align:right">' + money(k.hmtd) + '</td><td style="text-align:right"><b>' + money(k.duno) + '</b></td><td>' + esc(k.ls) + '</td><td>' + esc(k.den) + (k.days != null ? ' <small style="color:' + (k.days < 0 ? '#b91c1c' : k.days <= 30 ? '#b45309' : '#555') + '">(' + (k.days < 0 ? 'quá ' + (-k.days) + 'd' : 'còn ' + k.days + 'd') + ')</small>' : '') + '</td><td>' + esc(k.nhom) + '</td></tr>'; }).join('') + '</tbody></table></div>',
      ts: B.ts ? (B.ts.n ? '<div class="table-wrap"><table class="data-table"><thead><tr><th>SỐ TS</th><th>LOẠI</th><th style="text-align:right">GIÁ TRỊ (VND)</th><th>HẾT HẠN</th><th>ĐỊNH GIÁ</th><th>ĐỊA CHỈ</th></tr></thead><tbody>' + B.ts.list.map(function (t) { return '<tr><td>' + esc(t.soTS) + '</td><td>' + esc(t.loai) + '</td><td style="text-align:right">' + (t.tienTe && String(t.tienTe).toUpperCase() !== 'VND' ? esc(t.tienTe) + ' (chưa quy đổi)' : money(t.gt)) + '</td><td>' + esc(t.han) + '</td><td>' + esc(t.dg) + '</td><td style="text-align:left">' + esc(t.dc) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div style="padding:12px;color:#555">Không có tài sản bảo đảm nào theo mã KH này trong sao kê (có thể đứng tên bên thứ ba).</div>') : '<div style="padding:12px;color:#555">Chưa nạp sao kê TSBĐ — vào trang Tài sản bảo đảm để nhập.</div>',
      ls: bars(B.history),
      hs: B.hoso.length ? '<div class="table-wrap"><table class="data-table"><thead><tr><th>TÊN TRÊN HỒ SƠ</th><th>SỐ HĐ</th><th>LOẠI</th><th></th></tr></thead><tbody>' + B.hoso.map(function (x) { return '<tr><td style="text-align:left">' + esc(x.ten) + '</td><td>' + esc(x.sohd) + '</td><td>' + esc(x.loai) + '</td><td><button class="btn btn-green btn-sm" onclick="hsvvOpenLinked(\'' + esc(x.id) + '\')">Mở hồ sơ</button></td></tr>'; }).join('') + '</tbody></table></div>' : '<div style="padding:12px;color:#555">Chưa có hồ sơ vay vốn (HSVV) liên kết với mã KH này.</div>',
      gc: '<textarea id="kh360-note" rows="6" style="width:100%;max-width:760px;padding:8px;border:1px solid #cbd5e1;border-radius:6px" placeholder="Ghi chú theo khách hàng (lưu trên máy này, theo mã KH)…">' + esc(note) + '</textarea><div id="kh360-note-st" style="font-size:.78rem;color:#555;margin-top:4px"></div>'
    };
    box.innerHTML = '<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;align-items:flex-end"><div><div style="font-size:1.4rem;font-weight:800">' + esc(h.ten) + '</div><div style="font-size:.85rem;color:#566579">Mã KH ' + esc(h.ma || '(không có)') + ' · CBTD ' + esc(h.cbtd) + ' · ' + esc(h.pb) + '</div></div><div><button class="btn btn-ghost btn-sm" onclick="tdKh360InQltd()">Xem trong Dư nợ</button></div></div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin:10px 0">' + card('Dư nợ', tyd(h.duno), h.nKhoan + ' khoản · ' + h.nHDTD + ' HĐTD') + card('Hạn mức', tyd(h.hmtd), 'dùng ' + use) + tsHtml + card('Nhóm nợ', 'Nhóm ' + (h.nhom || 1), h.nhom >= 2 ? 'cần theo dõi' : 'bình thường', h.nhom >= 2 ? 'color:#b45309' : '') + '</div>' +
      '<div style="display:flex;gap:4px;border-bottom:1px solid #e2e8f0;margin-bottom:8px;flex-wrap:wrap">' + tabs.map(function (t) { return '<button type="button" data-tab="' + t[0] + '" class="kh360-tab' + (st.tab === t[0] ? ' on' : '') + '" onclick="tdKh360Tab(\'' + t[0] + '\')">' + t[1] + '</button>'; }).join('') + '</div><div id="kh360-body">' + body[st.tab] + '</div>';
    var ta = document.getElementById('kh360-note'); if (ta) { var tm = 0; ta.addEventListener('input', function () { clearTimeout(tm); tm = setTimeout(function () { try { localStorage.setItem(noteKey(h), ta.value); document.getElementById('kh360-note-st').textContent = '✅ Đã lưu ' + new Date().toLocaleTimeString('vi-VN'); } catch (e) { document.getElementById('kh360-note-st').textContent = '⚠️ Không lưu được'; } }, 400); }); }
  }
  window.tdKh360Tab = function (t) { st.tab = t; render(); };
  window.tdKh360Run = function () { render(); };
  window.tdKh360Open = function (ma, ten) {
    var K = TD.kh360, rows = DATA.qltd || [], r = rows.filter(function (x) { return x && (String(x[0] || '').trim() === String(ma || '').trim()) && String(ma || '').trim(); })[0] || rows.filter(function (x) { return x && ten && String(x[1] || '').trim() === String(ten).trim(); })[0];
    if (r) st.key = K.key(r); st.tab = 'khoan'; showPage('khachhang');
    var inp = document.getElementById('kh360-q'); if (inp && r) inp.value = r[1];
  };
  window.tdKh360Search = function (q) {
    var res = document.getElementById('kh360-res'); if (!res) return; var L = TD.kh360.find(DATA.qltd || [], q, 12);
    res.innerHTML = L.map(function (x) { return '<div class="kh360-hit" onclick="tdKh360Pick(\'' + esc(x.key).replace(/'/g, '') + '\')"><b>' + esc(x.ten) + '</b> <small>' + esc(x.ma) + ' · dư nợ ' + tyd(x.duno) + '</small></div>'; }).join('') || (q ? '<div style="padding:6px 10px;color:#555">Không có kết quả</div>' : '');
    window._kh360hits = L;
  };
  window.tdKh360Pick = function (key) { var L = window._kh360hits || [], x = L.filter(function (y) { return y.key.replace(/'/g, '') === key; })[0]; if (!x) return; st.key = x.key; st.tab = 'khoan'; document.getElementById('kh360-res').innerHTML = ''; document.getElementById('kh360-q').value = x.ten; render(); };
  window.tdKh360InQltd = function () { var inp; showPage('qltd'); setTimeout(function () { inp = document.getElementById('search-qltd'); var r = (DATA.qltd || []).filter(function (x) { return x && TD.kh360.key(x) === st.key; })[0]; if (inp && r) { inp.value = r[1]; inp.dispatchEvent(new Event('input')); } }, 200); };
})();
"""
rep("function tdRenderDateChip() { // HM-07", mod.rstrip() + "\n" + glue + "\nfunction tdRenderDateChip() { // HM-07")
rep("  xuhuong: ['XU HƯỚNG NHIỀU KỲ',", "  khachhang: ['KHÁCH HÀNG 360°', 'Khoản vay · tài sản bảo đảm · lịch sử các kỳ · hồ sơ vay · ghi chú'],\n  xuhuong: ['XU HƯỚNG NHIỀU KỲ',")
rep("""  <a class="nav-item-parent active-able" id="nav-qltd-parent" data-page="qltd\"""", """  <a class="nav-item" data-page="khachhang" href="#/khach-hang" onclick="showPage('khachhang',this); return false;">
    <span class="icon">👤</span><span class="label">KHÁCH HÀNG 360°</span>
  </a>
  <a class="nav-item-parent active-able" id="nav-qltd-parent" data-page="qltd\"""")
rep('<div class="page" id="page-xuhuong">', """<div class="page" id="page-khachhang">
  <div class="card" style="padding:14px">
    <div style="position:relative;max-width:560px">
      <input id="kh360-q" type="search" placeholder="🔍 Tên KH, mã KH hoặc số HĐTD…" oninput="tdKh360Search(this.value)" autocomplete="off" style="width:100%;padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px">
      <div id="kh360-res" style="position:absolute;left:0;right:0;top:100%;background:#fff;border:1px solid #e2e8f0;border-radius:8px;z-index:20;max-height:320px;overflow:auto"></div>
    </div>
    <div id="kh360-view" style="margin-top:12px"></div>
  </div>
</div>

<div class="page" id="page-xuhuong">""")
rep("  if (name === 'xuhuong') { try { tdTrendRun(); } catch (e) { console.error('[xuhuong]', e); } }", "  if (name === 'xuhuong') { try { tdTrendRun(); } catch (e) { console.error('[xuhuong]', e); } }\n  if (name === 'khachhang') { try { tdKh360Run(); } catch (e) { console.error('[khachhang]', e); } }")
rep(".topbar-right{display:flex;align-items:center;gap:6px;flex-wrap:wrap}", ".topbar-right{display:flex;align-items:center;gap:6px;flex-wrap:wrap}\n.kh360-tab{border:0;background:none;padding:7px 12px;font-size:13px;font-weight:600;color:#566579;cursor:pointer;border-bottom:3px solid transparent}\n.kh360-tab.on{color:#0d5c1e;border-bottom-color:#0d5c1e}\n.kh360-hit{padding:7px 12px;cursor:pointer;font-size:13px}.kh360-hit:hover{background:#f1f5f9}")
# bảng lệnh Ctrl+K: KH mở 360°
rep("          cmds.push({ ico:'👤', lbl: ten + ' — ' + ma, grp:'Khách hàng', fn:function () {\n            var target = pageByLoai2(loai);", "          cmds.push({ ico:'👤', lbl: ten + ' — ' + ma, grp:'Khách hàng', fn:function () {\n            if (typeof window.tdKh360Open === 'function') { window.tdKh360Open(ma, ten); return; } // HM-26\n            var target = pageByLoai2(loai);")
open(dst, 'w', encoding='utf-8').write(s); print('OK', len(s.encode('utf-8')))
