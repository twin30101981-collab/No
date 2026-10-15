#!/usr/bin/env python3
"""So hai thư mục ảnh (cùng tên tệp) bằng PIL; in số điểm ảnh khác nhau. Dùng: python3 tests/tools/shotdiff.py A B [ngưỡng_điểm]"""
import sys, os
from PIL import Image, ImageChops
a, b = sys.argv[1], sys.argv[2]; thr = int(sys.argv[3]) if len(sys.argv) > 3 else 0
bad = 0
for f in sorted(os.listdir(a)):
    if not f.endswith('.png'): continue
    pb = os.path.join(b, f)
    if not os.path.exists(pb): print('THIEU', f); bad += 1; continue
    ia, ib = Image.open(os.path.join(a, f)).convert('RGB'), Image.open(pb).convert('RGB')
    if ia.size != ib.size: print('KHAC KICH CO', f, ia.size, ib.size); bad += 1; continue
    d = ImageChops.difference(ia, ib).convert('L').point(lambda v: 255 if v > 12 else 0)
    n = sum(1 for v in d.getdata() if v)
    print(('OK  ' if n <= thr else 'KHAC'), f, n)
    if n > thr: bad += 1
sys.exit(1 if bad else 0)
