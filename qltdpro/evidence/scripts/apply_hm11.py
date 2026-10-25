"""HM-11: bảng giá đất — khoá tra cứu, trang lỗi dữ liệu, gộp K2, nối sang hồ sơ vay (nguồn: td_giadat.js, gd_docx_issues.json).
 - Cột NQ38 tra theo "từ|||đến" không có tên đường ⇒ 54 nhóm khoá trùng (162 dòng; 143 dòng có giá NQ38) nhận cùng một giá của đường khác.
   Nay: khoá trùng ⇒ hiện "⚠ trùng khoá" thay vì giá sai; trang mới "Lỗi dữ liệu bảng giá" liệt kê khoá trùng, TB ≠ (cao+thấp)/2, giá NQ38 > giá thấp nhất,
   40 ô "#DIV/0!/Chưa hoàn thiện" và 28 dòng của PL02 .docx không có trong bảng (quét trực tiếp từ tệp PL02).
 - bgd_getK2 dùng TD.giadat.coeff (cùng ngưỡng PL01 với kh_getCoeff); nút "Đưa sang hồ sơ vay (G0)".
Dùng: python3 apply_hm11.py <vao.html> <ra.html>"""
import sys, os
src, dst = sys.argv[1], sys.argv[2]
here = os.path.dirname(os.path.abspath(__file__))
s = open(src, encoding='utf-8').read()
mod = open(os.path.join(here, 'td_giadat.js'), encoding='utf-8').read()
issues = open(os.path.join(here, 'gd_docx_issues.json'), encoding='utf-8').read().strip()
def rep(old, new):
    global s
    assert s.count(old) == 1, ('không duy nhất/không thấy', old[:90], s.count(old))
    s = s.replace(old, new)

rep("function tdRenderDateChip() { // HM-07", mod.rstrip() + "\n\nfunction tdRenderDateChip() { // HM-07")
# nút điều hướng + vùng trang lỗi
rep("""  <button class="bgd-snav-btn" onclick="bgd_showSection('quy-dinh',this)">📋 QUY ĐỊNH</button>""",
    """  <button class="bgd-snav-btn" onclick="bgd_showSection('quy-dinh',this)">📋 QUY ĐỊNH</button>
  <button class="bgd-snav-btn" onclick="bgd_showSection('loi-du-lieu',this)">⚠️ LỖI DỮ LIỆU BẢNG GIÁ</button>""")
rep("<!-- ===== SECTION 5: TÍNH GIÁ ===== -->", """<!-- ===== HM-11: LỖI DỮ LIỆU BẢNG GIÁ ===== -->
<div id="loi-du-lieu" class="section">
  <div class="section-title">Lỗi dữ liệu bảng giá đất</div>
  <div class="section-sub">Phát hiện từ chính bảng giá đang nạp + quét tệp PL02 .docx — chỉ liệt kê, KHÔNG tự sửa số liệu</div>
  <div id="bgd-audit-body" style="margin-top:12px">Đang tính…</div>
</div>

<!-- ===== SECTION 5: TÍNH GIÁ ===== -->""")
# dữ liệu lỗi từ docx + tra cứu
rep("// Helper: normalize string for lookup\nfunction bgd_normKey(s){return s?s.toLowerCase().trim().replace(/\\s+/g,' '):''}\nfunction bgd_getUBND(ward, tu, den){\n  const wData = bgd_UBND[ward];\n  if(!wData) return null;\n  const key = bgd_normKey(tu)+'|||'+bgd_normKey(den);\n  return wData[key] || null;\n}",
"""// HM-11: các ô lỗi/dòng thiếu quét từ PL02 .docx (#DIV/0!, "Chưa hoàn thiện", dòng không có trong bảng)
const BGD_DOCX_ISSUES = """ + issues + """;

// Helper: normalize string for lookup
function bgd_normKey(s){return s?s.toLowerCase().trim().replace(/\\s+/g,' '):''}
let _bgd_idx = null;
function bgd_lookup(ward, tu, den, duong){ // HM-11: khoá trùng (cùng từ|đến, nhiều đường) ⇒ không xác định
  if(!_bgd_idx) _bgd_idx = TD.giadat.index(W);
  return TD.giadat.lookupUBND(_bgd_idx, bgd_UBND, ward, tu, den, duong);
}
function bgd_getUBND(ward, tu, den){
  return bgd_lookup(ward, tu, den).price;
}""")
rep("    const ubndRow = bgd_getUBND(rowWard, tu, den);", "    const _lk = bgd_lookup(rowWard, tu, den, ten);\n    const ubndRow = _lk.price;\n    const _U = v => _lk.ambiguous ? '<span title=\"Khoá (từ|đến) trùng ở nhiều đường — bảng NQ38 không có tên đường nên không xác định giá của đường này\" style=\"color:#b45309;font-size:.75rem;\">⚠ trùng khoá</span>' : bgd_fmtUBND(v);")
for i in '1234':
    rep("${bgd_fmtUBND(v%subnd)}" % i, "${_U(v%subnd)}" % i)
# K2 dùng chung
rep("function bgd_getK2(area, loai) {\n  if(area <= 0) return 1;\n  if(loai === 'nn') {\n    if(area < 200) return 1;\n    if(area < 500) return 0.95;\n    if(area < 2000) return 0.9;\n    if(area < 5000) return 0.8;\n    if(area < 10000) return 0.7;\n    return 0.5;\n  }\n  if(area < 100) return 1;\n  if(area < 300) return 0.9;\n  if(area < 500) return 0.8;\n  if(area < 1000) return 0.7;\n  return 0.5;\n}",
    "function bgd_getK2(area, loai) { // HM-11: một bảng ngưỡng PL01 cho cả hai nơi\n  return TD.giadat.coeff(area, loai);\n}")
# bgd_showSection kích hoạt trang lỗi
rep("  if(btn) btn.classList.add('active');\n}\n\n// ===== KH CALCULATOR =====", "  if(btn) btn.classList.add('active');\n  if(id === 'loi-du-lieu') { try { bgd_renderAudit(); } catch(e) { console.error('[HM-11]', e); } }\n}\n\n// ===== KH CALCULATOR =====")
# trang lỗi
rep("function bgd_resetForm() {", """function bgd_renderAudit() { // HM-11
  const esc = x => String(x == null ? '' : x).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const A = TD.giadat.audit(W, bgd_UBND), D = BGD_DOCX_ISSUES;
  const kpi = (t, v, c) => `<div style="flex:1 1 170px;border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px;background:#fff"><div style="font-size:1.4rem;font-weight:800;color:${c||'#111827'}">${v.toLocaleString('vi-VN')}</div><div style="font-size:.8rem;color:#555">${t}</div></div>`;
  const tbl = (title, head, rows, note) => `<div class="card" style="margin:12px 0;padding:0"><div class="card-head"><span>${title} — ${rows.length} dòng</span></div>${note?`<div style="padding:6px 12px;font-size:.82rem;color:#555">${note}</div>`:''}<div class="table-wrap" style="max-height:340px"><table class="data-table"><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.slice(0,400).map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')||'<tr><td colspan="'+head.length+'" style="text-align:center;color:#16a34a">✅ Không có</td></tr>'}</tbody></table></div>${rows.length>400?'<div style="padding:6px 12px;font-size:.8rem">Hiển thị 400 dòng đầu.</div>':''}</div>`;
  const fmt = v => (v*1000).toLocaleString('vi-VN');
  document.getElementById('bgd-audit-body').innerHTML =
    `<div style="display:flex;flex-wrap:wrap;gap:10px">${kpi('Dòng bảng giá đang nạp', A.rows)}${kpi('Nhóm khoá (từ|đến) trùng', A.dupGroups.length, '#b45309')}${kpi('Dòng bị ảnh hưởng', A.dupRows, '#b45309')}${kpi('…trong đó có giá NQ38 (đang ẩn)', A.dupAffectedUBND, '#dc2626')}${kpi('TB ≠ (cao+thấp)/2', A.tbLech.length, '#b45309')}${kpi('Giá NQ38 > giá thấp nhất', A.ubndCaoHonThap.length, '#b45309')}${kpi('Ô lỗi trong PL02 .docx', D.errCells.length, '#dc2626')}${kpi('Dòng PL02 không có trong bảng', D.missingRows.length, '#dc2626')}</div>` +
    tbl('🔁 Khoá (từ|đến) trùng ở nhiều đường', ['PHƯỜNG','TỪ|||ĐẾN','CÁC ĐƯỜNG','SỐ DÒNG','CÓ GIÁ NQ38'], A.dupGroups.map(g => [g.ward, g.key.replace('|||',' → '), g.roads.join(' ; '), g.n, g.ubnd ? 'có (không gán)' : 'không']), 'Bảng NQ38 chỉ khoá theo từ|đến nên không biết giá thuộc đường nào ⇒ app hiện “⚠ trùng khoá” thay vì gán nhầm. Cần đối chiếu bản gốc NQ38 (PDF) để bổ sung tên đường.') +
    tbl('🧮 Trung bình ≠ (cao nhất + thấp nhất)/2', ['PHƯỜNG','STT','ĐƯỜNG','TỪ','ĐẾN','VT','CAO','THẤP','TB','TB KỲ VỌNG'], A.tbLech.map(x => [x.ward,x.stt,x.duong,x.tu,x.den,'VT'+x.vt,fmt(x.cao),fmt(x.thap),fmt(x.tb),fmt(x.ky_vong)])) +
    tbl('📈 Giá NQ38 cao hơn giá thấp nhất (CV 39/2026)', ['PHƯỜNG','STT','ĐƯỜNG','TỪ','ĐẾN','VT','GIÁ NQ38','THẤP NHẤT'], A.ubndCaoHonThap.map(x => [x.ward,x.stt,x.duong,x.tu,x.den,'VT'+x.vt,fmt(x.ubnd),fmt(x.thap)])) +
    tbl('🛑 Ô lỗi trong PL02 .docx (“#DIV/0!”, “Chưa hoàn thiện”)', ['PHƯỜNG','STT','ĐƯỜNG','TỪ','ĐẾN','CỘT','NỘI DUNG Ô'], D.errCells, 'Nguồn: ' + esc(D.nguon) + '. Các ô này không có số nên không dùng để tính; cần cơ quan ban hành bổ sung.') +
    tbl('📄 Dòng PL02 .docx không có trong bảng đang nạp', ['PHƯỜNG','STT','ĐƯỜNG','TỪ','ĐẾN','CÓ Ô LỖI'], D.missingRows.map(r => [r[0],r[1],r[2],r[3],r[4],r[5]?'có':'']));
}
function bgd_toHoSo() { // HM-11: đưa kết quả sang hồ sơ vay (ô G0 — calcGiaDat)
  const v = window._bgdLastResult || 0, el = document.getElementById('giaDatG0');
  if(!(v > 0)) { alert('Hãy bấm Tính trước.'); return; }
  if(!el) { try { showToast('Chưa mở hồ sơ vay có ô đơn giá đất (G0) — hãy mở hồ sơ vay trước', 'red'); } catch(e) {} return; }
  el.value = Math.round(v); try { el.dispatchEvent(new Event('input', {bubbles:true})); } catch(e) {}
  try { calcGiaDat(); showToast('✅ Đã đưa ' + Math.round(v).toLocaleString('vi-VN') + ' đ/m² sang hồ sơ vay (G0)', 'green'); } catch(e) { console.error(e); }
}

function bgd_resetForm() {""")
rep("  try { box.scrollIntoView({behavior:'smooth',block:'nearest'}); } catch(e) { box.scrollIntoView(); }\n}", "  window._bgdLastResult = tong;\n  document.getElementById('result-breakdown').insertAdjacentHTML('beforeend', '<div style=\"grid-column:1/-1;margin-top:8px\"><button class=\"btn btn-green\" onclick=\"bgd_toHoSo()\">📤 Đưa sang hồ sơ vay (G0)</button></div>');\n  try { box.scrollIntoView({behavior:'smooth',block:'nearest'}); } catch(e) { box.scrollIntoView(); }\n}")
open(dst, 'w', encoding='utf-8').write(s); print('OK', len(s.encode('utf-8')))
