# CHÚ Ý (22/10/2026): các tên khách hàng thật trong tệp này đã được thay bằng [TÊN-KH-nn] khi rà soát dữ liệu cá nhân; script là lịch sử (HM-20 thay chuỗi vá bằng src/), không chạy lại được.
# P10: tên khách hàng thật trong kịch bản che (lịch sử, không còn dùng) đã thay bằng nhãn [TÊN-KH-nn]
"""HM-05: gỡ dữ liệu cứng và dữ liệu cá nhân thật nhúng trong tệp phát hành.
Gỡ: tsbd-seed-data (TSBĐ 18/08), denhan-amt-data, TD_PASTDUE.SEED (8 khoản 23/06), _PRE_SNAPS (mốc lưu trữ nhúng),
TKSTT_MAP (bảng tên KH → số TK/số tập). Giữ nguyên DATA.macb (danh sách cán bộ — cần cho báo cáo theo CBTD; xem HANDOVER).
Dùng: python3 apply_hm05.py <vao.html> <ra.html>"""
import sys, re, hashlib
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
n0 = len(s.encode('utf-8'))

def literal_end(text, start):
    """start trỏ vào '[' hoặc '{'; trả về chỉ số sau dấu đóng tương ứng (biết chuỗi ', \", ` và escape)."""
    depth = 0; i = start; q = None
    while i < len(text):
        c = text[i]
        if q:
            if c == '\\': i += 2; continue
            if c == q: q = None
        else:
            if c in '\'"`': q = c
            elif c in '[{': depth += 1
            elif c in ']}':
                depth -= 1
                if depth == 0: return i + 1
        i += 1
    raise AssertionError('không tìm thấy đóng ngoặc')

def replace_literal(marker, new_literal):
    global s
    assert s.count(marker) == 1, ('marker', marker, s.count(marker))
    a = s.index(marker) + len(marker)
    if marker[-1] in '[{': a -= 1
    while s[a] in ' \n\r\t': a += 1
    assert s[a] in '[{', (marker, s[a:a+20])
    b = literal_end(s, a)
    removed = b - a
    s = s[:a] + new_literal + s[b:]
    return removed

rm = {}
# 1. TSBĐ seed (script JSON)
m = re.search(r'(<script id="tsbd-seed-data" type="application/json") data-src="[^"]*" data-at="[^"]*">(.*?)(</script>)', s, re.S)
assert m; rm['tsbd-seed'] = len(m.group(2))
s = s[:m.start()] + m.group(1) + ' data-src="" data-at="">[]' + m.group(3) + s[m.end():]
# 2. bảng số tiền đến hạn cứng
m = re.search(r'(<script id="denhan-amt-data" type="application/json">)(.*?)(</script>)', s, re.S)
assert m; rm['denhan-amt'] = len(m.group(2))
s = s[:m.start()] + m.group(1) + '{}' + m.group(3) + s[m.end():]
# 3. mốc lưu trữ nhúng
rm['pre-snaps'] = replace_literal("window._PRE_SNAPS = [", "[]")
# 4. bảng TK/STT theo tên KH
rm['tkstt-raw'] = replace_literal("const TKSTT_MAP = (function(){\n  const raw =", "[]")
# 5. seed quá hạn 23/06
rm['pastdue-seed'] = replace_literal("TD.SEED = {\n    // FIX v13.9.14: SEED cập nhật theo IPCAS inpd01 chốt 23/06/2026 (Đến 22/06)\n    asOf: '23/06/2026',\n    rows:", "[]")
s = s.replace("TD.SEED = {\n    // FIX v13.9.14: SEED cập nhật theo IPCAS inpd01 chốt 23/06/2026 (Đến 22/06)\n    asOf: '23/06/2026',", "TD.SEED = {\n    // HM-05: đã gỡ seed 8 khoản quá hạn ngày 23/06/2026 (dữ liệu khách hàng thật)\n    asOf: '',", 1)
# dọn mục seed cũ đã lưu trong localStorage của người dùng (chỉ nguồn 'inpd01-seed', không đụng dữ liệu dán tay)
old = "  TD.seedDefault = function(){"
assert s.count(old) == 1
s = s.replace(old, old + """
    // HM-05: xoá các khoản seed cũ (source 'inpd01-seed') còn lưu trong trình duyệt; giữ nguyên dữ liệu người dùng tự dán
    var _purged = 0;
    Object.keys(TD.map).forEach(function(k){ if (TD.map[k] && TD.map[k].source === 'inpd01-seed') { delete TD.map[k]; _purged++; } });
    if (_purged) { try { TD.save(); } catch(_e){} }""")

# 6. dòng giữ chỗ KH thật, ví dụ/chú thích chứa mã KH, số TK, tên thật (không đụng DATA.macb — danh sách cán bộ)
m = re.search(r'(const TKSTT_PLACEHOLDERS = JSON\.parse\(`)(.*?)(`\);)', s, re.S)
assert m; rm['tkstt-placeholders'] = len(m.group(2))
s = s[:m.start()] + m.group(1) + '[]' + m.group(3) + s[m.end():]
for name in ['[TÊN-KH-21]', '[TÊN-KH-22]', '[TÊN-KH-23]', '[TÊN-KH-11]', '[TÊN-KH-06]', '[TÊN-KH-24]']:
    rm['name:' + name] = s.count(name)
    s = s.replace(name, '(đã ẩn)' if name != '[TÊN-KH-06]' else 'Nguyễn Văn A')
cnt = {'ma': 0}
def _mask(mo):
    cnt['ma'] += 1
    t = mo.group(0)
    return re.sub(r'\d', '0', t[4:]) and (t[:4] + re.sub(r'\d', '0', t[4:])) if not t.startswith('3201LAV') else t[:7] + '0' * (len(t) - 7)
s = re.sub(r'(?<!"stk": ")(3201-\d{9}|3201\d{9}|3201LAV\d{9}|3201LDS\d{9}|3201LCL\d{9})', _mask, s)
rm['codes-masked'] = cnt['ma']

# 7. tên khách hàng thật còn sót trong chú thích / ghi chú giao diện / placeholder
for a, b in [('[TÊN-KH-17] - [TÊN-KH-18]', 'NGUYỄN VĂN A - NGUYỄN THỊ B'), ('[TÊN-KH-07]', 'Nguyễn Văn A'), ('[TÊN-KH-17]', 'NGUYỄN VĂN A')]:
    rm['ph:' + a] = s.count(a); s = s.replace(a, b)
for nm in ['[TÊN-KH-15]', '[TÊN-KH-09]', '[TÊN-KH-02]', '[TÊN-KH-12]', '[TÊN-KH-08]', '[TÊN-KH-25]']:
    s, k = re.subn(re.escape(nm), '(đã ẩn)', s, flags=re.I); rm['name:' + nm] = k

# 8. tên KH thật trong dữ liệu mẫu hồ sơ / ví dụ tính lãi / placeholder (KHÔNG đụng tên đường phố trong bảng giá đất, tên cán bộ)
for a, b in [('placeholder="[TÊN-KH-13]"', 'placeholder="Nguyễn Văn A"'), ('placeholder="[TÊN-KH-19] - [TÊN-KH-20]"', 'placeholder="NGUYỄN VĂN A - NGUYỄN THỊ B"'),
             ('placeholder="[TÊN-KH-14]"', 'placeholder="Nguyễn Thị B"'), ('3201-LAV-202600008', '3201-LAV-000000000')]:
    rm['ph:' + a] = s.count(a); s = s.replace(a, b)
for nm, to in [('[TÊN-KH-16]', 'Khách hàng mẫu'), ('[TÊN-KH-01]', 'KH mẫu'), ('[TÊN-KH-05]', '(đã ẩn)'),
               ('[TÊN-KH-10]', '(đã ẩn)'), ('[TÊN-KH-03]', '(đã ẩn)'), ('[TÊN-KH-04]', '(đã ẩn)')]:
    s, k = re.subn(re.escape(nm), to, s, flags=re.I); rm['name:' + nm] = k
open(dst, 'w', encoding='utf-8').write(s)
n1 = len(s.encode('utf-8'))
print('OK', hashlib.sha256(s.encode('utf-8')).hexdigest(), 'bytes', n0, '->', n1, 'giảm', n0 - n1, rm)
