"""HM-16b (phần z-index): 60 giá trị z-index (100…2147483601) rải trong CSS và chuỗi style JS ⇒ thang 8 bậc token --z-1…--z-8.
 Mỗi giá trị cũ v ≥ 100 → calc(var(--z-N, nền) + hạng) với N là bậc chứa v và hạng = thứ tự của v trong các giá trị khác nhau của bậc đó.
 Ánh xạ TĂNG NGẶT (giữ nguyên mọi quan hệ trên/dưới và bằng nhau giữa mọi cặp lớp) ⇒ không đổi thứ tự chồng lớp; giá trị < 100 (cục bộ trong thành phần) và var(--tdup-z-*) giữ nguyên.
Dùng: python3 apply_hm16b.py <vao.html> <ra.html>"""
import sys, re, json
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
TIERS = [(100, 999, 100), (1000, 1999, 1000), (2000, 4999, 2000), (5000, 9899, 5000), (9900, 9999, 9900), (10000, 99989, 10000), (99990, 99999, 99990), (100000, 2**31, 100000)]
NAMES = ['nền/thanh dính', 'lớp phủ trang', 'hộp thoại', 'bảng tràn toàn màn hình', 'thông báo/tooltip', 'lớp trên hộp thoại', 'bảng lệnh/menu ngữ cảnh', 'chẩn đoán']
pat = re.compile(r'(z-index\s*:\s*)(\d+)(\s*!important)?', re.I)
vals = sorted({int(m.group(2)) for m in pat.finditer(s) if int(m.group(2)) >= 100})
mp = {}
for k, (lo, hi, base) in enumerate(TIERS):
    vs = [v for v in vals if lo <= v <= hi]
    nxt = TIERS[k + 1][2] if k + 1 < len(TIERS) else 10**12
    assert not vs or base + len(vs) - 1 < nxt, ('bậc tràn', k)
    for r, v in enumerate(vs):
        mp[v] = (k + 1, base, r)
assert set(mp) == set(vals)
new_vals = [mp[v][1] + mp[v][2] for v in vals]
assert new_vals == sorted(set(new_vals)) and len(set(new_vals)) == len(vals), 'ánh xạ không tăng ngặt'
def sub(m):
    v = int(m.group(2))
    if v < 100: return m.group(0)
    k, base, r = mp[v]
    e = ('var(--z-%d,%d)' % (k, base)) if r == 0 else ('calc(var(--z-%d,%d) + %d)' % (k, base, r))
    return m.group(1) + e + (m.group(3) or '')
n = len(pat.findall(s))
s2 = pat.sub(sub, s)
tok = '/* HM-16b: thang z-index 8 bậc (' + '; '.join('--z-%d %s' % (i + 1, NAMES[i]) for i in range(8)) + ') — lớp con = bậc + hạng */\n:root{' + ';'.join('--z-%d:%d' % (i + 1, t[2]) for i, t in enumerate(TIERS)) + '}\n'
a = s2.index(':root {\n  --td-primary:')
s2 = s2[:a] + tok + s2[a:]
open(dst, 'w', encoding='utf-8').write(s2)
json.dump({str(v): mp[v][1] + mp[v][2] for v in vals}, open(dst + '.zmap.json', 'w'))
print('OK khai báo', n, 'giá trị khác nhau ≥100:', len(vals), 'bậc dùng:', sorted({mp[v][0] for v in vals}))
