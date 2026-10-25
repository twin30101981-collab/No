"""HM-23: Trung tâm nhập dữ liệu (TD.hub): trang "TRUNG TÂM NHẬP DỮ LIỆU" — kéo thả/chọn NHIỀU tệp cùng lúc; tự nhận dạng dư nợ (msit80) / sao kê TSBĐ theo tên tệp,
 lấy ngày từ tên tệp (HM-07), lập kế hoạch: dư nợ nhập theo ngày TĂNG (tệp mới nhất thành dữ liệu hiện hành, mỗi tệp thành một mốc), chỉ nhập sao kê TSBĐ mới nhất, bỏ tệp trùng/không hỗ trợ,
 cảnh báo quy tắc; nhập tuần tự bằng chính luồng nhập sẵn có (processImportFile → doImport → completeImportToDataArchive / tsbdImportFile); so với kỳ trước;
 nhật ký nhập lưu trên máy (giờ, người thao tác, tệp, loại, ngày, SHA-256, kết quả) + xuất CSV.
Dùng: python3 apply_hm23.py <vao.html> <ra.html>   (áp SAU apply_hm26)"""
import sys, os
src, dst = sys.argv[1], sys.argv[2]
here = os.path.dirname(os.path.abspath(__file__))
s = open(src, encoding='utf-8').read()
mod = open(os.path.join(here, 'td_hub.js'), encoding='utf-8').read()
def rep(old, new):
    global s
    assert s.count(old) == 1, ('không duy nhất/không thấy', old[:90], s.count(old))
    s = s.replace(old, new)
glue = r"""
/* ───────── HM-23: giao diện Trung tâm nhập dữ liệu ───────── */
(function () {
  var LOGK = 'td_hub_log_v1', files = [], plan = null, running = false;
  var esc = function (x) { return String(x == null ? '' : x).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var money = function (v) { return Math.round(Number(v) || 0).toLocaleString('vi-VN'); };
  function actor() { try { return localStorage.getItem('td_audit_actor_v1') || ''; } catch (e) { return ''; } }
  function logGet() { try { return JSON.parse(localStorage.getItem(LOGK) || '[]'); } catch (e) { return []; } }
  function logAdd(o) { try { var a = logGet(); a.unshift(o); localStorage.setItem(LOGK, JSON.stringify(a.slice(0, 300))); } catch (e) {} }
  function dateOf(n) { return TD.dataDate.fromFileName(n); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  async function until(fn, ms, step) { var t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await sleep(step || 150); } return false; }
  async function sha(file) { try { if (window.crypto && crypto.subtle) return TD.hub.hex(await crypto.subtle.digest('SHA-256', await file.arrayBuffer())); } catch (e) {} return ''; }
  function render() {
    var el = document.getElementById('hub-plan'); if (!el) return;
    plan = TD.hub.plan(files.map(function (f) { return { name: f.name, size: f.size }; }), dateOf);
    window._tdHubPlan = plan;
    if (!files.length) el.innerHTML = '<div style="padding:10px;color:#555">Chưa chọn tệp nào.</div>';
    else el.innerHTML = '<div class="table-wrap"><table class="data-table"><thead><tr><th>THỨ TỰ</th><th>TỆP</th><th>LOẠI</th><th>NGÀY DỮ LIỆU</th><th>KÍCH THƯỚC</th><th>GHI CHÚ</th><th>TRẠNG THÁI</th></tr></thead><tbody>' +
      plan.items.slice().sort(function (a, b) { return (a.order || 999) - (b.order || 999) || a.idx - b.idx; }).map(function (it) {
        return '<tr data-idx="' + it.idx + '"><td>' + (it.order || '—') + '</td><td style="text-align:left">' + esc(it.name) + '</td><td>' + (it.kind === 'duno' ? 'Dư nợ (msit80)' : it.kind === 'tsbd' ? 'Sao kê TSBĐ' : '—') + '</td><td>' + esc(it.date || '(không có)') + '</td><td>' + TD.hub.fmtBytes(it.size) + '</td><td style="text-align:left;font-size:.8rem;color:#92400e">' + esc(it.skip || it.warn.join(' · ')) + '</td><td class="hub-st" style="font-weight:600">' + (it.skip ? '<span style="color:#6b7280">Bỏ qua</span>' : 'Chờ nhập') + '</td></tr>';
      }).join('') + '</tbody></table></div><div style="margin:8px 0;font-size:.85rem;color:#555">Sẽ nhập <b>' + plan.nImport + '</b> tệp, bỏ qua <b>' + plan.nSkip + '</b>.</div>';
    var b = document.getElementById('hub-run'); if (b) b.disabled = !plan || !plan.nImport || running;
  }
  function setSt(idx, html) { var r = document.querySelector('#hub-plan tr[data-idx="' + idx + '"] .hub-st'); if (r) r.innerHTML = html; }
  function renderLog() {
    var el = document.getElementById('hub-log'); if (!el) return; var L = logGet();
    el.innerHTML = L.length ? '<div class="table-wrap" style="max-height:340px"><table class="data-table"><thead><tr><th>GIỜ</th><th>NGƯỜI</th><th>TỆP</th><th>LOẠI</th><th>NGÀY DL</th><th>SHA-256</th><th>KẾT QUẢ</th></tr></thead><tbody>' + L.map(function (x) { return '<tr><td>' + esc(x.at) + '</td><td>' + esc(x.who || '(chưa đặt tên)') + '</td><td style="text-align:left">' + esc(x.name) + '</td><td>' + esc(x.kind === 'duno' ? 'Dư nợ' : 'TSBĐ') + '</td><td>' + esc(x.date || '') + '</td><td title="' + esc(x.sha) + '" style="font-family:monospace">' + esc((x.sha || '').slice(0, 12)) + '</td><td style="text-align:left">' + esc(x.result) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div style="padding:10px;color:#555">Chưa có lần nhập nào được ghi.</div>';
  }
  window.tdHubAdd = function (list) { Array.prototype.forEach.call(list || [], function (f) { if (!files.some(function (x) { return x.name === f.name && x.size === f.size; })) files.push(f); }); render(); };
  window.tdHubClear = function () { if (running) return; files = []; render(); };
  window.tdHubDrop = function (e) { e.preventDefault(); var z = document.getElementById('hub-drop'); if (z) z.classList.remove('over'); tdHubAdd(e.dataTransfer && e.dataTransfer.files); };
  window.tdHubRun = async function () {
    if (running || !plan || !plan.nImport) return;
    if (!window.confirm('Nhập ' + plan.nImport + ' tệp theo thứ tự ngày.\nDữ liệu dư nợ hiện tại sẽ được THAY bằng tệp mới nhất; mỗi tệp dư nợ tạo một mốc lưu trữ. Tiếp tục?')) return;
    running = true; document.getElementById('hub-run').disabled = true;
    var oc = window.confirm, oa = window.alert, msgs = []; window.confirm = function () { return true; }; window.alert = function (m) { msgs.push(String(m)); };
    var ok = 0, fail = 0;
    try {
      for (var k = 0; k < plan.order.length; k++) {
        var it = plan.order[k], file = files[it.idx], t0 = Date.now(), res = '', stat = '';
        setSt(it.idx, '<span style="color:#2563eb">⏳ Đang nhập…</span>'); await sleep(50);
        try {
          var h = await sha(file);
          if (it.kind === 'duno') {
            var prev = null; try { (_archiveReportList || []).forEach(function (x) { if (x && x.autoDaily && x.dayKey) { var d = parseVNDate(x.dayKey), cd = it.date ? parseVNDate(it.date) : null; if (d && cd && d < cd && (!prev || d > prev.d)) prev = { d: d, tot: x.totalBalance, k: x.dayKey }; } }); } catch (e) {}
            try { pendingImportRows = null; } catch (e) {}
            await processImportFile(file);
            if (!(await until(function () { try { return !!pendingImportRows && pendingImportRows.length; } catch (e) { return false; } }, 180000))) throw new Error('không đọc được dòng dữ liệu' + (msgs.length ? ' — ' + msgs[msgs.length - 1].slice(0, 90) : ''));
            var n = pendingImportRows.length; doImport(); await sleep(800); completeImportToDataArchive(); await sleep(3000);
            var tot = (DATA.qltd || []).reduce(function (s2, r) { return s2 + (Number(r[11]) || 0); }, 0), kh = TD.metrics.countCustomers(DATA.qltd || []);
            var snapOk = it.date ? (_archiveReportList || []).some(function (x) { return x && x.autoDaily && x.dayKey === it.date; }) : true;
            res = n.toLocaleString('vi-VN') + ' dòng · ' + kh.toLocaleString('vi-VN') + ' KH · dư nợ ' + money(tot) + ' đ' + (prev && prev.tot ? ' · so ' + prev.k + ': ' + (tot - prev.tot >= 0 ? '+' : '') + money(tot - prev.tot) + ' đ' : '') + (snapOk ? '' : ' · ⚠ chưa thấy mốc ' + it.date);
            stat = '<span style="color:#15803d">✅ ' + res + '</span>';
          } else {
            await window.tsbdImportFile({ files: [file], value: '' });
            if (!(await until(function () { return window.TSBD && TSBD.src === file.name && TSBD.rows && TSBD.rows.length; }, 240000))) throw new Error('không đọc được tài sản');
            var sm = TD.tsbd.summarize(TSBD.rows); res = TSBD.rows.length.toLocaleString('vi-VN') + ' dòng · ' + sm.unique.toLocaleString('vi-VN') + ' TS (khử trùng) · giá trị VND ' + money(sm.giaTriTS_VND) + ' đ'; stat = '<span style="color:#15803d">✅ ' + res + '</span>';
          }
          logAdd({ at: new Date().toLocaleString('vi-VN'), who: actor(), name: it.name, kind: it.kind, date: it.date || '', size: it.size, sha: h, result: res, ms: Date.now() - t0 }); ok++;
        } catch (err) {
          res = 'LỖI: ' + (err && err.message || err); stat = '<span style="color:#b91c1c">❌ ' + esc(res) + '</span>'; fail++;
          logAdd({ at: new Date().toLocaleString('vi-VN'), who: actor(), name: it.name, kind: it.kind, date: it.date || '', size: it.size, sha: '', result: res, ms: Date.now() - t0 });
        }
        setSt(it.idx, stat); renderLog();
      }
    } finally { window.confirm = oc; window.alert = oa; running = false; var b = document.getElementById('hub-run'); if (b) b.disabled = false; }
    try { showToast('✅ Nhập xong: ' + ok + ' tệp' + (fail ? ' · ' + fail + ' lỗi' : ''), fail ? 'orange' : 'green'); } catch (e) {}
    try { rebuildAll(); } catch (e) {}
  };
  window.tdHubLogCsv = function () {
    var L = logGet(), q = function (v) { v = String(v == null ? '' : v); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var csv = ['Giờ,Người,Tệp,Loại,Ngày dữ liệu,Kích thước,SHA-256,Kết quả,ms'].concat(L.map(function (x) { return [x.at, x.who, x.name, x.kind, x.date, x.size, x.sha, x.result, x.ms].map(q).join(','); })).join('\n');
    var blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'NhatKyNhap.csv'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
  window.tdHubRender = function () { render(); renderLog(); };
})();
"""
rep("function tdRenderDateChip() { // HM-07", mod.rstrip() + "\n" + glue + "\nfunction tdRenderDateChip() { // HM-07")
rep("  khachhang: ['KHÁCH HÀNG 360°',", "  nhap: ['TRUNG TÂM NHẬP DỮ LIỆU', 'Nhập nhiều tệp dư nợ / tài sản bảo đảm · so kỳ trước · nhật ký'],\n  khachhang: ['KHÁCH HÀNG 360°',")
rep("""  <a class="nav-item" data-page="archive" href="#/luu-tru" onclick="showPage('archive',this); return false;">""", """  <a class="nav-item" data-page="nhap" href="#/nhap-du-lieu" onclick="showPage('nhap',this); return false;">
    <span class="icon">📥</span><span class="label">TRUNG TÂM NHẬP DỮ LIỆU</span>
  </a>
  <a class="nav-item" data-page="archive" href="#/luu-tru" onclick="showPage('archive',this); return false;">""")
rep('<div class="page" id="page-khachhang">', """<div class="page" id="page-nhap">
  <div class="card" style="padding:14px">
    <div id="hub-drop" ondragover="event.preventDefault();this.classList.add('over')" ondragleave="this.classList.remove('over')" ondrop="tdHubDrop(event)" onclick="document.getElementById('hub-file').click()" style="border:2px dashed #94a3b8;border-radius:12px;padding:22px;text-align:center;cursor:pointer;background:#f8fafc">
      <div style="font-size:1.1rem;font-weight:700">📥 Kéo thả hoặc bấm để chọn NHIỀU tệp</div>
      <div style="font-size:.85rem;color:#566579;margin-top:4px">Dư nợ msit80 (.xls/.xlsx/.csv — tên tệp có ngày, vd 31.05.2026.xlsx) và Sao kê tài sản bảo đảm (tên có "tai san bao dam"). Tệp được nhận dạng theo tên, xếp theo ngày; tệp lạ/trùng bị bỏ qua.</div>
      <input id="hub-file" type="file" multiple accept=".xls,.xlsx,.xlsm,.csv" style="display:none" onchange="tdHubAdd(this.files); this.value=''">
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0"><button id="hub-run" class="btn btn-green" onclick="tdHubRun()" disabled>▶ Nhập tất cả theo thứ tự ngày</button><button class="btn btn-ghost" onclick="tdHubClear()">Xoá danh sách</button></div>
    <div id="hub-plan"></div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px"><b>📜 Nhật ký nhập (lưu trên máy này)</b><button class="btn btn-ghost btn-sm" onclick="tdHubLogCsv()">📄 Xuất CSV</button></div>
    <div id="hub-log" style="margin-top:6px"></div>
  </div>
</div>

<div class="page" id="page-khachhang">""")
rep("  if (name === 'khachhang') { try { tdKh360Run(); } catch (e) { console.error('[khachhang]', e); } }", "  if (name === 'khachhang') { try { tdKh360Run(); } catch (e) { console.error('[khachhang]', e); } }\n  if (name === 'nhap') { try { tdHubRender(); } catch (e) { console.error('[nhap]', e); } }")
rep(".topbar-right{display:flex;align-items:center;gap:6px;flex-wrap:wrap}", ".topbar-right{display:flex;align-items:center;gap:6px;flex-wrap:wrap}\n#hub-drop.over{background:#ecfdf5!important;border-color:#16a34a!important}")
open(dst, 'w', encoding='utf-8').write(s); print('OK', len(s.encode('utf-8')))
