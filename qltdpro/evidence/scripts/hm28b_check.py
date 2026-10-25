import _realenv as E  # P10 (T8)
"""Đối chiếu độc lập: Word/Excel xuất từ app ↔ tính lại bằng Python từ tệp XLS gốc (cột dsbsbal; KH theo cột 0)."""
import sys, re, zipfile, json
sys.path.insert(0, E.PYLIB)
import xlrd, openpyxl
D = E.DATA+'/'; O = E.OUT+'/'
def raw(f):
    s = xlrd.open_workbook(D + f, logfile=open('/dev/null', 'w')).sheet_by_index(0)
    rows = [s.row_values(i) for i in range(1, s.nrows)]
    pos = [r for r in rows if isinstance(r[17], float) and r[17] > 0]
    return round(sum(r[17] for r in pos)), len({str(r[0]).strip() for r in pos}), len(pos)
def doc_text(f):
    x = zipfile.ZipFile(O + f).read('word/document.xml').decode('utf8')
    return re.sub(r'<[^>]+>', '', x.replace('</w:p>', '\n')), x
res = []; ck = lambda n, c, x='': res.append(('PASS ' if c else 'FAIL ') + n + ('' if c else ' ' + str(x)[:300]))
vn = lambda n: '{:,}'.format(n).replace(',', '.')
for f, src, dd in [('cur.docx', '20.10.2026.XLS', '20/10/2026'), ('p0930.docx', '30.09.2026.XLS', '30/09/2026')]:
    tot, kh, hs = raw(src); t, x = doc_text(f)
    ck(f + ': ngày dữ liệu ' + dd, ('Ngày dữ liệu: ' + dd) in t, t[:120])
    row = re.search(r'TỔNG CỘNG\n([\d.]+)\n([\d.]+)\n([\d.]+)\n', t)
    ck(f + ': TỔNG CỘNG (KH, khoản, dư nợ) = tính lại từ tệp gốc %s / %d / %d' % (vn(tot), kh, hs), bool(row) and [row.group(1), row.group(2), row.group(3)] == [vn(kh), vn(hs), vn(tot)], row and row.groups())
    ck(f + ': tổng 100,0%', '100,0%' in t)
    ck(f + ': đủ 6 hoặc 4 phần theo kỳ', len(re.findall('<w:sectPr', x)) == (6 if f == 'cur.docx' else 4), len(re.findall('<w:sectPr', x)))
t, x = doc_text('cur.docx')
ck('cur.docx: khối chữ ký có', 'Ký, ghi rõ họ tên' in t); ck('p0930.docx: không chọn ký ⇒ không có', 'Ký, ghi rõ họ tên' not in doc_text('p0930.docx')[0])
ck('cur.docx: biên bản đối soát có KHỚP, không LỆCH', 'KHỚP' in t and 'LỆCH' not in t.split('BIÊN BẢN ĐỐI SOÁT')[1].split('XU HƯỚNG')[0])
ck('p0930.docx: kỳ cũ không có biên bản đối soát/cảnh báo', 'BIÊN BẢN ĐỐI SOÁT' not in doc_text('p0930.docx')[0] and 'CẢNH BÁO SỚM' not in doc_text('p0930.docx')[0])
for f, src, n in [('cur.xlsx', '20.10.2026.XLS', 6), ('p0930.xlsx', '30.09.2026.XLS', 4)]:
    tot, kh, hs = raw(src); wb = openpyxl.load_workbook(O + f, data_only=True); ws = wb['Tổng hợp']
    r = [r for r in ws.iter_rows(values_only=True) if r[0] == 'TỔNG CỘNG'][0]
    ck(f + ': %d trang; TỔNG = tệp gốc' % n, len(wb.sheetnames) == n and [r[1], r[2], r[3]] == [kh, hs, tot], [wb.sheetnames, r])
# Word = Excel: mọi số trong bảng Tổng hợp/loại vay của Word có ở Excel
t, _ = doc_text('cur.docx'); wb = openpyxl.load_workbook(O + 'cur.xlsx', data_only=True)
nums = {vn(abs(round(c))) for ws in wb for row in ws.iter_rows(values_only=True) for c in row if isinstance(c, (int, float)) and abs(c) >= 1000}
words = set(re.findall(r'\b\d{1,3}(?:\.\d{3})+\b', t))
ck('Word = Excel: mọi số ≥1.000 trong Word đều có trong Excel cùng kỳ (%d số)' % len(words), words <= nums, sorted(words - nums)[:5])
print('\n'.join(res)); print('PASS', sum(r[0] == 'P' for r in res), 'FAIL', sum(r[0] == 'F' for r in res))
