"""HM-16 (phần 1 — an toàn): sửa tương phản bảng màu + chế độ giao diện mặc định SÁNG.
 Đo (contrast.js, 5 trang chính, dữ liệu thật): chế độ sáng 2–12% phần tử chữ < 4,5:1 (cam #e07b2c, xám #8594a8/#888, xanh #16a34a); chế độ "auto" theo hệ điều hành
 bật giao diện tối dở dang (Dashboard 27% / Giá đất 36% / Đối soát 78% phần tử chữ < 4,5:1: chữ sáng trên nền thẻ vẫn trắng) ⇒ máy đặt tối sẽ đọc không được.
 Sửa: mặc định 'light', giá trị đã lưu 'auto' chuyển về 'light'; biến màu --orange/--gray-500 và các màu chữ cam/xanh/xám đậm hơn đạt ≥4,5:1 trên nền trắng.
 CHƯA làm (HM-16b): thang z-index ≤8 bậc (60 giá trị, 2147483601), gộp 9 bộ :root/5 hệ toast/12 kiểu tab, hoàn thiện giao diện tối.
Dùng: python3 apply_hm16.py <vao.html> <ra.html>"""
import sys, re
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, cnt=1):
    global s
    assert s.count(old) == cnt, ('không đúng số lần', old[:90], s.count(old))
    s = s.replace(old, new)

# mặc định sáng + di chuyển 'auto' cũ
rep("  applyTheme(LS.get('theme','auto'));", "  applyTheme((function(){ var t = LS.get('theme','light'); return (t === 'auto' || t === 'dark' && !LS.get('theme_ok','')) ? 'light' : t; })()); // HM-16: mặc định sáng; 'auto'/tối dở dang không tự bật")
rep("      if ((LS.get('theme','auto'))==='auto') applyTheme('auto');", "      if ((LS.get('theme','light'))==='auto') applyTheme('auto');")
rep("    var cur = LS.get('theme','auto');\n    var next = THEMES[(THEMES.indexOf(cur)+1) % THEMES.length];\n    applyTheme(next); toast('Giao diện: '+next);",
    "    var cur = LS.get('theme','light');\n    var next = cur === 'dark' ? 'light' : 'dark'; // HM-16: bỏ 'auto' khỏi vòng đổi\n    if (next === 'dark') LS.set('theme_ok', '1');\n    applyTheme(next); toast('Giao diện: ' + (next === 'dark' ? 'tối (thử nghiệm — chưa hoàn thiện)' : 'sáng'));")
# màu: biến + literal chữ
rep("--orange:#e07b2c;", "--orange:#b45309;")
rep("--gray-500:#8594a8;", "--gray-500:#566579;")
n_or = s.count('#e07b2c'); s = s.replace('#e07b2c', '#b45309')
n_gr = len(re.findall(r'(?<![\w-])color\s*:\s*#888(?![0-9a-fA-F])', s)); s = re.sub(r'(?<![\w-])color\s*:\s*#888(?![0-9a-fA-F])', 'color:#666', s)
n_g2 = len(re.findall(r'(?<![\w-])color\s*:\s*#16a34a', s)); s = re.sub(r'(?<![\w-])color\s*:\s*#16a34a', 'color:#15803d', s)
s = s.replace('#8594a8', '#566579')
n_99 = len(re.findall(r'(?<![\w-])color\s*:\s*#999(?![0-9a-fA-F])', s)); s = re.sub(r'(?<![\w-])color\s*:\s*#999(?![0-9a-fA-F])', 'color:#6b7280', s)
rep(".topbar-right{display:flex;align-items:center;gap:6px;flex-wrap:wrap}", ".topbar-right{display:flex;align-items:center;gap:6px;flex-wrap:wrap}\n#page-giadat .stat-val{color:#7a5200}")
print('thay #999:', n_99)
print('thay: cam', n_or, '· xám #888', n_gr, '· xanh', n_g2)
open(dst, 'w', encoding='utf-8').write(s); print('OK', len(s.encode('utf-8')))
