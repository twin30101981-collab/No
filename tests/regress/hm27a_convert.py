#!/usr/bin/env python3
"""HM-27a: dữ liệu giả lập (không phải dữ liệu thật) -> chạy công cụ -> kiểm tra báo cáo và không còn trường cá nhân."""
import json, os, subprocess, sys, tempfile
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
sq = lambda x, y, s: [[[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]]]
F = lambda to, th, dt, ld, ten, cccd, geom: {'type': 'Feature', 'properties': {'SoTo': to, 'SoThua': th, 'DienTich': dt, 'MDSD': ld, 'TenChu': ten, 'CMND': cccd}, 'geometry': {'type': 'Polygon', 'coordinates': geom}}
feats = [F(1, 1, 100.0, 'ONT', 'NGUOI GIA LAP A', '000000000001', sq(0, 0, 10)),
         F(1, 2, 150.0, 'LUC', 'NGUOI GIA LAP B', '000000000002', sq(20, 0, 10)),   # lệch: hình học 100 vs 150
         F(1, 1, 100.0, 'ONT', 'TRUNG', '000000000003', sq(40, 0, 10)),              # trùng tờ/thửa
         F(2, 1, 50.0, 'CLN', 'X', '1', [[[0, 0], [10, 10], [10, 0], [0, 10], [0, 0]]])]  # tự cắt (nơ)
d = tempfile.mkdtemp(); src = os.path.join(d, 'xa.geojson'); json.dump({'type': 'FeatureCollection', 'features': feats}, open(src, 'w'))
out = os.path.join(d, 'out')
r = subprocess.run([sys.executable, os.path.join(root, 'handover/tools/cadastre_convert.py'), src, '--xa', 'Xã thử', '--out', out], capture_output=True, text=True)
assert r.returncode == 0, r.stderr
rep = json.load(open(os.path.join(out, 'report.json'))); pj = open(os.path.join(out, 'parcels.json'), encoding='utf-8').read()
assert rep['truong_nhan_dien'] == {'to': 'SoTo', 'thua': 'SoThua', 'dt': 'DienTich', 'ld': 'MDSD'}, rep['truong_nhan_dien']
assert set(rep['truong_bi_loai']) == {'TenChu', 'CMND'}, rep['truong_bi_loai']
for s in ('NGUOI GIA LAP', '00000000000', 'TenChu', 'CMND'): assert s not in pj, 'lộ trường cá nhân: ' + s
assert len(rep['thua_trung_to_thua']) == 1 and len(rep['thua_loi_hinh']) == 1
assert 2 in [m['thua'] for m in rep['lech_dien_tich_qua_5%']]
assert json.loads(pj)['n'] == 4 and rep['thua_ghi'] == 4 and rep['thua_loi_hinh'][0]['tu_sua']
print('PASS hm27a_convert')
