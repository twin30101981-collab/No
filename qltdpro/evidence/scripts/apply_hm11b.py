"""HM-11b: nhập PL02 .docx mới ngay trong app (zip+xml bằng PizZip nhúng sẵn), đối chiếu với bảng giá đang nạp.
 - nhúng td_pl02.js (TD.pl02.parse / issues) cạnh TD.giadat;
 - trang "Lỗi dữ liệu bảng giá đất": nút chọn PL02 .docx → thay BGD_DOCX_ISSUES (ô lỗi, dòng thiếu), lưu localStorage, bảng app / tệp / chênh lệch theo phường (vàng khi lệch).
 Không bổ sung giá NQ38 theo tên đường (PDF NQ38 là ảnh scan, chưa có nguồn) — vẫn chỉ ẩn khoá trùng.
Dùng: python3 apply_hm11b.py <vao.html> <ra.html>"""
import sys, os
src, dst = sys.argv[1], sys.argv[2]
here = os.path.dirname(os.path.abspath(__file__))
s = open(src, encoding='utf-8').read()
def rep(old, new, cnt=1):
    global s
    assert s.count(old) == cnt, ('không đúng số lần', old[:80], s.count(old))
    s = s.replace(old, new)
mod = open(os.path.join(here, 'td_pl02.js'), encoding='utf-8').read()
mod = mod.replace("if (typeof module !== 'undefined' && module.exports) module.exports = TD;\n", "")
rep("/* HM-11: lõi bảng giá đất TD.giadat", mod + "\n/* HM-11: lõi bảng giá đất TD.giadat")
rep('<div id="bgd-audit-body" style="margin-top:12px">Đang tính…</div>',
    '''<div class="card" style="margin:10px 0;padding:10px 12px;display:flex;flex-wrap:wrap;gap:10px;align-items:center">
    <b>📂 Nhập PL02 .docx mới</b>
    <input type="file" id="bgd-pl02-file" accept=".docx" onchange="bgd_importPL02(this.files[0]); this.value=''">
    <span id="bgd-pl02-status" style="font-size:.85rem;color:#555">Đọc ngay trong trình duyệt, không gửi đi đâu; chỉ đối chiếu với bảng đang nạp, không sửa bảng giá.</span>
  </div>
  <div id="bgd-audit-body" style="margin-top:12px">Đang tính…</div>''')
# let + khôi phục + nhập
i = s.index('const BGD_DOCX_ISSUES = ')
j = s.index('\n', i)
line = s[i:j].replace('const BGD_DOCX_ISSUES = ', 'let BGD_DOCX_ISSUES = ', 1)
add = r'''
let BGD_PL02_STAT = null; // HM-11b: {file, rows, byWard:{ward:số dòng PL02}}
try { const _sv = JSON.parse(localStorage.getItem('td_pl02_issues_v1') || 'null'); if (_sv && _sv.issues && _sv.issues.errCells) { BGD_DOCX_ISSUES = _sv.issues; BGD_PL02_STAT = _sv.stat || null; } } catch (e) {}
async function bgd_importPL02(file) { // HM-11b
  const st = document.getElementById('bgd-pl02-status'), say = (t, c) => { if (st) { st.textContent = t; st.style.color = c || '#555'; } };
  if (!file) return;
  try {
    say('⌛ Đang đọc ' + file.name + '…');
    for (let i = 0; i < 40 && typeof PizZip === 'undefined'; i++) await new Promise(r => setTimeout(r, 250)); // thư viện nạp lúc rảnh
    if (typeof PizZip === 'undefined') throw new Error('Thư viện đọc .docx chưa sẵn sàng — thử lại sau vài giây');
    const zip = new PizZip(await file.arrayBuffer()), f = zip.file('word/document.xml');
    if (!f) throw new Error('Không phải tệp .docx hợp lệ');
    const rows = TD.pl02.parse(f.asText());
    if (rows.length < 50) throw new Error('Không tìm thấy bảng giá (chỉ đọc được ' + rows.length + ' dòng) — có đúng PL02 không?');
    const iss = TD.pl02.issues(rows, W), byWard = {};
    rows.forEach(r => { byWard[r.ward] = (byWard[r.ward] || 0) + 1; });
    iss.nguon = file.name;
    BGD_DOCX_ISSUES = iss; BGD_PL02_STAT = { file: file.name, rows: rows.length, byWard: byWard };
    try { localStorage.setItem('td_pl02_issues_v1', JSON.stringify({ issues: iss, stat: BGD_PL02_STAT, at: new Date().toISOString() })); } catch (e) {}
    say('✅ Đã đọc ' + rows.length.toLocaleString('vi-VN') + ' dòng · ' + iss.errCells.length + ' ô lỗi · ' + iss.missingRows.length + ' dòng chưa có trong bảng đang nạp', '#15803d');
    bgd_renderAudit();
  } catch (e) { console.error('[HM-11b]', e); say('⛔ ' + e.message, '#dc2626'); }
}
'''
s = s[:j] + '\n' + line[line.index('let '):][0:0] + add + s[j:]
s = s[:i] + line + s[j:] if False else s
s = s.replace(s[i:j], line, 1)
# bảng app / tệp / chênh lệch theo phường
rep("""    tbl('🛑 Ô lỗi trong PL02 .docx""", """    (BGD_PL02_STAT ? tbl('⚖️ Đối chiếu số dòng theo phường: bảng đang nạp / PL02 .docx / chênh lệch', ['PHƯỜNG','BẢNG ĐANG NẠP','PL02 .docx','CHÊNH LỆCH'],
      Array.from(new Set(Object.keys(W).concat(Object.keys(BGD_PL02_STAT.byWard)))).map(w => { const a = (W[w] || []).length, b = BGD_PL02_STAT.byWard[w] || 0; return [w, a, b, (a - b) ? '⚠️ ' + (a - b) : '✅ 0']; }),
      'Chênh lệch ≠ 0: bảng nạp trong app khác PL02 (dòng thiếu/thừa) — xem danh sách dưới đây. Nguồn: ' + esc(BGD_PL02_STAT.file)) : '') +
    tbl('🛑 Ô lỗi trong PL02 .docx""")
open(dst, 'w', encoding='utf-8').write(s)
print('OK', len(s))
