#!/usr/bin/env python3
"""So hai tệp cssdump: in số phần tử đổi kiểu dáng/hộp theo từng trạng thái. Thoát 1 nếu có khác biệt. Dùng: cssdiff.py A.json B.json [chi_tiet] [A_lap]"""
import json, sys
a, b = json.load(open(sys.argv[1])), json.load(open(sys.argv[2])); bad = 0
noise = {}
for nf in sys.argv[4:]:   # các tệp tiếp theo = lần chụp lặp của bản A, để loại phần tử "nhiễu" (ô bản đồ, đồng hồ…)
    n = json.load(open(nf))
    for k in a:
        noise.setdefault(k, set()).update(i for i in range(min(len(a[k]), len(n.get(k, [])))) if a[k][i][1] != n[k][i][1] or a[k][i][2] != n[k][i][2])
for k in sorted(a):
    x, y = a[k], b.get(k)
    if y is None: print('THIEU', k); bad += 1; continue
    if len(x) != len(y):   # lệch số phần tử (đã gỡ/nhiễu): căn theo khoá thẻ#id.lớp rồi so phần còn khớp
        import difflib
        sm = difflib.SequenceMatcher(None, [e[0] for e in x], [e[0] for e in y], autojunk=False); px, py = [], []
        for t, a1, a2, b1, b2 in sm.get_opcodes():
            if t == 'equal': px += x[a1:a2]; py += y[b1:b2]
        print('   (căn', len(px), 'trên', len(x), '/', len(y), 'phần tử)'); x, y = px, py
    d = [(i, x[i][0], x[i][1] != y[i][1], x[i][2] != y[i][2]) for i in range(len(x)) if i not in noise.get(k, ()) and (x[i][1] != y[i][1] or x[i][2] != y[i][2])]
    print(('OK  ' if not d else 'KHAC'), k, len(x), 'phần tử', len(d), 'đổi')
    if d:
        bad += 1
        for i, n, st, bx in d[:int(sys.argv[3]) if len(sys.argv) > 3 else 0]: print('    ', i, n, 'style' if st else '', 'hop' if bx else '')
sys.exit(1 if bad else 0)
