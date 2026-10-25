"""HM-01: khôi phục chuỗi tiêu đề HTML gốc của SheetJS 0.20.3 (gỡ CSS chèn nhầm làm hỏng thư viện).
Dùng: python3 apply_hm01.py <vao.html> <ra.html>"""
import sys, hashlib
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
i = s.find("var yb='<html>"); j = s.find("var Eb=", i)
assert i > 0 and j > i, 'Không tìm thấy chuỗi yb của SheetJS'
old = s[i:j]
assert 'td-global-font' in old or old.endswith("<body>';"), 'Vùng không như dự kiến'
s = s[:i] + "var yb='<html><head><meta charset=\"utf-8\"/><title>SheetJS Table Export</title></head><body>';" + s[j:]
open(dst, 'w', encoding='utf-8').write(s)
print('OK', hashlib.sha256(s.encode('utf-8')).hexdigest())
