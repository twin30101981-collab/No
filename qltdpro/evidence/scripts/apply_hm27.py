"""HM-27: chế độ có mạng (tuỳ chọn) — MẶC ĐỊNH TẮT, trình duyệt chặn mọi gửi dữ liệu ra ngoài (CSP meta chèn đầu <head>).
 Khi bật (người dùng tự bật, tải lại trang): chỉ mở đúng địa chỉ người dùng khai báo — (a) kiểm tra bản mới (GET, không gửi dữ liệu), (b) tải thư viện dự phòng có băm SRI, (c) AI (người dùng tự nhập khoá; chỉ gửi SỐ TỔNG HỢP, có xem trước và xác nhận từng lần). Nhật ký mọi lần gửi ra ngoài.
Dùng: python3 apply_hm27.py <vao.html> <ra.html>"""
import sys, os
src, dst = sys.argv[1], sys.argv[2]
here = os.path.dirname(os.path.abspath(__file__))
s = open(src, encoding='utf-8').read()
def rep(old, new, cnt=1):
    global s
    assert s.count(old) == cnt, ('không đúng số lần', old[:80], s.count(old))
    s = s.replace(old, new)
mod = open(os.path.join(here, 'td_net.js'), encoding='utf-8').read().replace("  if (typeof module !== 'undefined' && module.exports) module.exports = TD;\n", "")
guard = '<script id="td-net-guard" data-tag="HM-27">\n' + mod + r'''
/* HM-27: áp chính sách mạng NGAY ĐẦU <head> (trước mọi script khác). Lỗi bất kỳ ⇒ chính sách chặt nhất (tắt). */
(function () {
  var csp;
  try { csp = TD.net.csp(TD.net.load(localStorage)); } catch (e) { csp = TD.net.csp(TD.net.defaults()); }
  try { var m = document.createElement('meta'); m.setAttribute('http-equiv', 'Content-Security-Policy'); m.setAttribute('content', csp); document.head.appendChild(m); TD.net.cspApplied = csp; } catch (e) { TD.net.cspApplied = ''; }
})();
</script>
'''
rep('<html lang="vi">\n<head>\n', '<html lang="vi">\n<head>\n' + guard + '\n')
ui = r'''
/* ───────── HM-27: chế độ có mạng (tuỳ chọn) ───────── */
TD.net.version = 'v22.3-HM27';
TD.net.state = function () { return TD.net.load(localStorage); };
TD.net.getKey = function () { try { return localStorage.getItem(TD.net.AIKEY) || ''; } catch (e) { return ''; } };
TD.net.setKey = function (k) { try { k ? localStorage.setItem(TD.net.AIKEY, k) : localStorage.removeItem(TD.net.AIKEY); } catch (e) {} };
TD.net.getLog = function () { try { return JSON.parse(localStorage.getItem(TD.net.LOGKEY) || '[]'); } catch (e) { return []; } };
TD.net.log = function (feature, url, bytes) { try { const a = TD.net.getLog(); a.push({ t: new Date().toLocaleString('vi-VN'), f: feature, h: TD.net.origin(url) || String(url), b: bytes || 0 }); localStorage.setItem(TD.net.LOGKEY, JSON.stringify(a.slice(-50))); } catch (e) {} };
TD.net.checkVersion = async function () {
  const s = TD.net.state(); if (s.mode !== 'on' || !s.versionUrl) throw new Error('Chưa bật chế độ có mạng hoặc chưa khai báo địa chỉ kiểm tra bản mới');
  const r = await fetch(s.versionUrl, { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' }); // chỉ GET: không gửi dữ liệu nào
  if (!r.ok) throw new Error('HTTP ' + r.status); const j = await r.json(); TD.net.log('kiểm tra bản mới', s.versionUrl, 0);
  return { local: TD.net.version, remote: String(j.version || ''), newer: TD.net.cmpVersion(TD.net.version, j.version) < 0, url: String(j.url || ''), notes: String(j.notes || '') };
};
TD.net.ensureLib = function (g) { // thư viện dự phòng: chỉ khi bật mạng + bật mục dự phòng + entry có băm SRI
  if (window[g]) return Promise.resolve(window[g]);
  const f = TD.net.fallbackFor(g), s = TD.net.state();
  if (!f || s.mode !== 'on' || !s.cdn) return Promise.reject(new Error('Thư viện ' + g + ' chưa sẵn sàng và không có bản dự phòng được phép'));
  return new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = f.url; sc.integrity = f.sri; sc.crossOrigin = 'anonymous'; sc.referrerPolicy = 'no-referrer';
    sc.onload = () => { if (window[g]) { TD.net.log('thư viện dự phòng ' + f.name, f.url, 0); res(window[g]); } else rej(new Error('Tải xong nhưng không thấy ' + g)); };
    sc.onerror = () => rej(new Error('Không tải được hoặc băm SRI không khớp: ' + f.name)); document.head.appendChild(sc); });
};
TD.net.aiBuild = function () {
  const rows = (DATA.qltd || []).filter(isActualCreditRow); if (!rows.length) throw new Error('Chưa có dữ liệu dư nợ');
  const dd = TD.dataDate.get(), snaps = (typeof tdReportSnaps === 'function') ? tdReportSnaps() : [];
  return TD.net.aiPayload(TD.metrics.summarize(rows, { today: todayMidnight() }), { dataDate: dd ? TD.dataDate.vn(dd) : '', periods: TD.trend.build(snaps, TD.metrics.summarize) });
};
TD.net.askAI = async function (text) {
  const s = TD.net.state(), key = TD.net.getKey(); if (s.mode !== 'on' || !s.ai.enabled) throw new Error('AI chưa được bật'); if (!key) throw new Error('Chưa nhập khoá AI');
  const body = JSON.stringify({ model: s.ai.model, max_tokens: 1024, messages: [{ role: 'user', content: text }] });
  const r = await fetch(s.ai.endpoint, { method: 'POST', credentials: 'omit', referrerPolicy: 'no-referrer', headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, body: body });
  TD.net.log('hỏi AI (số tổng hợp)', s.ai.endpoint, body.length);
  if (!r.ok) throw new Error('AI trả lỗi HTTP ' + r.status); const j = await r.json();
  return (j.content || []).map(c => c.text || '').join('\n').trim() || '(không có nội dung)';
};
function tdNetDialog() {
  let d = document.getElementById('td-net-dlg'); if (d) d.remove();
  const s = TD.net.state(), esc = x => String(x == null ? '' : x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const hosts = []; if (s.mode === 'on') { const a = TD.net.origin(s.versionUrl); if (a) hosts.push(a); if (s.ai.enabled) hosts.push(TD.net.origin(s.ai.endpoint)); }
  const libs = TD.net.FALLBACKS.map(f => f.name + (f.sri ? '' : ' (chưa có băm SRI — không dùng)')).join(', ');
  d = document.createElement('div'); d.id = 'td-net-dlg'; d.className = 'no-print';
  d.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:var(--z-3,2000);display:flex;align-items:center;justify-content:center;overflow:auto';
  d.innerHTML = `<div style="background:#fff;color:#111;border-radius:10px;padding:18px 20px;width:min(560px,94vw);max-height:92vh;overflow:auto;box-shadow:0 10px 40px rgba(0,0,0,.3);font:14px/1.5 system-ui">
  <div style="font-weight:800;font-size:1.05rem;margin-bottom:6px">🌐 Chế độ có mạng (tuỳ chọn)</div>
  <div id="td-net-status" style="padding:8px 10px;border-radius:8px;margin-bottom:10px;font-weight:600;${s.mode === 'on' ? 'background:#fffbeb;border:1px solid #f59e0b;color:#78350f' : 'background:#f0fdf4;border:1px solid #86efac;color:#166534'}">${s.mode === 'on' ? '⚠️ ĐANG BẬT — chỉ được kết nối tới: ' + (hosts.map(esc).join(', ') || '(chưa khai báo địa chỉ nào)') : '✅ ĐANG TẮT (mặc định) — trình duyệt chặn mọi kết nối ra ngoài; dữ liệu không rời máy.'}</div>
  <label style="display:block;margin:6px 0"><input type="checkbox" id="td-net-on" ${s.mode === 'on' ? 'checked' : ''}> <b>Cho phép kết nối mạng</b> (áp dụng sau khi tải lại trang)</label>
  <div style="margin:8px 0 2px;font-weight:600">Kiểm tra bản mới</div>
  <input id="td-net-ver" value="${esc(s.versionUrl)}" placeholder="https://…/version.json  ({&quot;version&quot;:&quot;v22.4&quot;,&quot;url&quot;:&quot;…&quot;})" style="width:100%;padding:6px"> <button class="btn btn-ghost" id="td-net-chk" style="margin-top:4px">Kiểm tra ngay</button> <span id="td-net-chkr"></span>
  <label style="display:block;margin:8px 0 2px"><input type="checkbox" id="td-net-cdn" ${s.cdn ? 'checked' : ''}> Tải thư viện dự phòng khi bản nhúng lỗi (có băm SRI): <span style="font-size:.85rem;color:#555">${esc(libs)}</span></label>
  <div style="margin:10px 0 2px;font-weight:600">AI (tuỳ chọn — bạn tự nhập khoá; chỉ gửi SỐ TỔNG HỢP, không có thông tin khách hàng)</div>
  <label><input type="checkbox" id="td-net-ai" ${s.ai.enabled ? 'checked' : ''}> Bật AI</label>
  <input id="td-net-aiep" value="${esc(s.ai.endpoint)}" style="width:100%;padding:6px;margin:4px 0" placeholder="Địa chỉ API">
  <div style="display:flex;gap:6px"><input id="td-net-aimodel" value="${esc(s.ai.model)}" style="flex:1;padding:6px" placeholder="Mô hình"><input id="td-net-aikey" type="password" value="${esc(TD.net.getKey())}" style="flex:2;padding:6px" placeholder="Khoá API (chỉ lưu trên máy này, không nằm trong sao lưu)"></div>
  <button class="btn btn-ghost" id="td-net-askb" style="margin-top:6px">🤖 Nhận xét số liệu bằng AI… (xem trước nội dung sẽ gửi)</button>
  <div id="td-net-ai-box" style="display:none;margin-top:8px"><div style="font-weight:600">Nội dung SẼ được gửi tới <span id="td-net-ai-host"></span>:</div><textarea id="td-net-ai-pl" readonly style="width:100%;height:160px;font:12px/1.4 monospace"></textarea><button class="btn btn-green" id="td-net-ai-send">Đồng ý — Gửi</button> <pre id="td-net-ai-out" style="white-space:pre-wrap;margin-top:8px;font:13px/1.5 system-ui"></pre></div>
  <details style="margin-top:10px"><summary style="cursor:pointer;font-weight:600">Nhật ký gửi ra ngoài (${TD.net.getLog().length})</summary><div style="font-size:.82rem;max-height:120px;overflow:auto">${TD.net.getLog().slice(-10).reverse().map(l => esc(l.t + ' · ' + l.f + ' → ' + l.h + (l.b ? ' · ' + l.b + ' ký tự' : ''))).join('<br>') || 'Chưa có lần nào.'}</div></details>
  <div id="td-net-msg" style="min-height:20px;margin-top:6px;font-weight:600"></div>
  <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px"><button class="btn btn-ghost" onclick="document.getElementById('td-net-dlg').remove()">Đóng</button><button class="btn btn-green" id="td-net-save">Lưu</button></div></div>`;
  document.body.appendChild(d);
  const $ = id => document.getElementById(id), msg = (t, c) => { $('td-net-msg').textContent = t; $('td-net-msg').style.color = c || '#555'; };
  $('td-net-save').onclick = () => {
    const before = TD.net.cspApplied;
    TD.net.setKey($('td-net-aikey').value.trim());
    const n = TD.net.save(localStorage, { mode: $('td-net-on').checked ? 'on' : 'off', versionUrl: $('td-net-ver').value, cdn: $('td-net-cdn').checked, ai: { enabled: $('td-net-ai').checked, endpoint: $('td-net-aiep').value, model: $('td-net-aimodel').value } });
    if (TD.net.csp(n) !== before) { msg('✅ Đã lưu — đang tải lại trang để áp dụng chính sách mạng mới…', '#15803d'); setTimeout(() => location.reload(), 900); } else msg('✅ Đã lưu', '#15803d');
  };
  $('td-net-chk').onclick = async () => { const r = $('td-net-chkr'); r.textContent = '⌛'; try { const v = await TD.net.checkVersion(); r.style.color = v.newer ? '#b45309' : '#15803d'; r.textContent = v.newer ? '⬆ Có bản mới ' + v.remote + (v.url ? ' — ' + v.url : '') : '✅ Đang dùng bản mới nhất (' + v.local + ')'; } catch (e) { r.style.color = '#dc2626'; r.textContent = '⛔ ' + (/Failed to fetch|NetworkError/.test(e.message) ? 'Không kết nối được (chế độ mạng tắt, địa chỉ chưa lưu, hoặc không có mạng)' : e.message); } };
  $('td-net-askb').onclick = () => { try { const P = TD.net.aiBuild(); $('td-net-ai-pl').value = P.text; $('td-net-ai-host').textContent = TD.net.origin($('td-net-aiep').value) || '(địa chỉ không hợp lệ)'; $('td-net-ai-box').style.display = 'block'; $('td-net-ai-out').textContent = ''; msg('Kiểm tra nội dung rồi bấm "Đồng ý — Gửi" (cần Lưu trước nếu vừa đổi cài đặt).'); } catch (e) { msg('⛔ ' + e.message, '#dc2626'); } };
  $('td-net-ai-send').onclick = async () => { $('td-net-ai-out').textContent = '⌛ Đang hỏi AI…'; try { const t = await TD.net.askAI($('td-net-ai-pl').value); $('td-net-ai-out').textContent = t + '\n\n(Nội dung do AI sinh ra — hãy kiểm tra lại trước khi dùng.)'; } catch (e) { $('td-net-ai-out').textContent = '⛔ ' + (/Failed to fetch|NetworkError/.test(e.message) ? 'Không kết nối được (chưa bật/đã lưu AI, hoặc không có mạng)' : e.message); } };
}
window.tdNetDialog = tdNetDialog;
'''
rep("window.tdReportDialog = tdReportDialog; window.tdReportExportWord = tdReportExportWord; window.tdReportBuild = tdReportBuild;\n",
    "window.tdReportDialog = tdReportDialog; window.tdReportExportWord = tdReportExportWord; window.tdReportBuild = tdReportBuild;\n" + ui)
rep("  for (let i = 0; i < 40 && !window.docx; i++) await new Promise(r => setTimeout(r, 250)); // thư viện nạp lúc rảnh\n",
    "  for (let i = 0; i < 40 && !window.docx; i++) await new Promise(r => setTimeout(r, 250)); // thư viện nạp lúc rảnh\n  if (!window.docx) { try { await TD.net.ensureLib('docx'); } catch (e) {} } // HM-27: bản nhúng lỗi ⇒ thư viện dự phòng có SRI (nếu người dùng đã bật)\n")
rep('<button class="util-item" onclick="utilRun(tdReportDialog)"><span class="ue">📝</span> Báo cáo Word / chọn kỳ…</button>',
    '<button class="util-item" onclick="utilRun(tdReportDialog)"><span class="ue">📝</span> Báo cáo Word / chọn kỳ…</button>\n        <button class="util-item" onclick="utilRun(tdNetDialog)"><span class="ue">🌐</span> Chế độ có mạng…</button>')
open(dst, 'w', encoding='utf-8').write(s)
print('OK')
