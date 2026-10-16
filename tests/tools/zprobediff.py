#!/usr/bin/env python3
"""So hai tệp zprobe: in số điểm lưới đổi phần tử trên cùng theo từng trạng thái (kèm vài ví dụ). Thoát 1 nếu khác. Dùng: zprobediff.py A.json B.json [so_vi_du]"""
import json, sys, collections
a, b = json.load(open(sys.argv[1])), json.load(open(sys.argv[2])); bad = 0; n = int(sys.argv[3]) if len(sys.argv) > 3 else 3
for k in sorted(a):
    x, y = a[k], b.get(k, [])
    d = collections.Counter((x[i], y[i] if i < len(y) else '?') for i in range(len(x)) if i >= len(y) or x[i] != y[i])
    print(('OK  ' if not d else 'KHAC'), k, sum(d.values()), 'điểm đổi')
    if d: bad += 1; [print('     ', c, a_, '→', b_) for (a_, b_), c in d.most_common(n)]
sys.exit(1 if bad else 0)
