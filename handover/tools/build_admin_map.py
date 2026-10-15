#!/usr/bin/env python3
"""CSV -> app/admin-map.json (HM-33). Cột: xa_moi, loai, xa_cu, huyen_cu, tinh_cu_khoa (khoá VN2000_PROVINCES, vd NINH_BINH).
Mỗi xã mới có thể có nhiều dòng (nhiều xã cũ). Dùng:  python3 handover/tools/build_admin_map.py danh_sach.csv > app/admin-map.json"""
import csv, json, sys
rows = {}
for r in csv.DictReader(open(sys.argv[1], encoding='utf-8-sig')):
    k = r['xa_moi'].strip(); d = rows.setdefault(k, {'moi': k, 'loai': r.get('loai', '').strip(), 'cu': []})
    d['cu'].append({'ten': r['xa_cu'].strip(), 'huyen': r['huyen_cu'].strip(), 'tinh': r['tinh_cu_khoa'].strip()})
print(json.dumps({'phien_ban': 1, 'nguon': 'danh sách người dùng cung cấp', 'rows': list(rows.values())}, ensure_ascii=False))
