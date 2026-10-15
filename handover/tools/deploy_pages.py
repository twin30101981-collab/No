#!/usr/bin/env python3
"""HM-11 — triển khai bản app lên gốc repo (GitHub Pages): app/land-gis.html → index.html, admin-map.json, sw.js sinh từ sw.template.js
(tên cache = landgis-shell-<vNNN>-<sha256 8 ký tự của index.html>). Chạy:  python3 handover/tools/deploy_pages.py   (ở gốc repo)"""
import hashlib, re, shutil, os
root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
src = open(os.path.join(root, 'app/land-gis.html'), 'rb').read()
ver = max((int(v) for v in re.findall(rb"\)\('v(\d+)'\)", src)), default=0)
h = hashlib.sha256(src)
for f in sorted(os.listdir(os.path.join(root, 'vendor'))): h.update(open(os.path.join(root, 'vendor', f), 'rb').read())   # đổi thư viện ⇒ đổi tên cache
tag = 'v%d-%s' % (ver, h.hexdigest()[:8])
open(os.path.join(root, 'index.html'), 'wb').write(src)
shutil.copy(os.path.join(root, 'app/admin-map.json'), os.path.join(root, 'admin-map.json'))
t = open(os.path.join(root, 'handover/tools/sw.template.js'), encoding='utf-8').read().replace('__VERSION__', tag)
open(os.path.join(root, 'sw.js'), 'w', encoding='utf-8').write(t)
print('đã triển khai', tag)
