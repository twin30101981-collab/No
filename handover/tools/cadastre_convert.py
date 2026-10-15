#!/usr/bin/env python3
"""HM-27a — chuyển dữ liệu địa chính (SHP / GeoJSON; DGN, GDB, GPKG qua ogr2ogr nếu máy có GDAL) -> gói trung gian theo xã.
Chạy 1 lệnh:  python3 handover/tools/cadastre_convert.py <nguồn> --xa "Tên xã" --out build/ten-xa [--crs VN2000-NB] [--tol 0.05]
Ra:  <out>/parcels.json   (thửa đã làm sạch: chỉ tờ, thửa, diện tích, loại đất, vòng toạ độ; KHÔNG có chủ/CCCD)
     <out>/report.json     (báo cáo kiểm định: diện tích hình học ↔ thuộc tính, thửa trùng, thửa lỗi hình, trường bị loại)
Danh sách trắng trường: chỉ giữ trường đã nhận diện; mọi trường khác (tên chủ, CCCD, địa chỉ, số GCN…) bị loại và chỉ đếm tên trường trong báo cáo.
Phụ thuộc: pip install pyshp shapely"""
import argparse, json, os, subprocess, sys, tempfile, shutil, hashlib
import shapefile
from shapely.geometry import shape, Polygon, MultiPolygon
from shapely.validation import explain_validity

ALIASES = {  # tên trường chuẩn -> các tên thường gặp (không phân biệt hoa/thường, bỏ dấu cách/gạch dưới)
    'to': ['soto', 'sohieuto', 'sht', 'tobando', 'mato', 'to'],
    'thua': ['sothua', 'sohieuthua', 'sothututhua', 'stt', 'thua', 'mathua'],
    'dt': ['dientich', 'dtpl', 'dientichpl', 'dtichphaply', 'dientichgcn', 'area', 'dt'],
    'ld': ['loaidat', 'mdsd', 'mucdichsudung', 'kyhieumdsd', 'ld', 'maloaidat'],
}
norm = lambda s: ''.join(c for c in str(s).lower() if c.isalnum())

def load(src):
    """Trả về [(props, geometry_dict)]. SHP bằng pyshp, GeoJSON trực tiếp; định dạng khác -> ogr2ogr sang GeoJSON."""
    ext = os.path.splitext(src)[1].lower()
    if ext in ('.dgn', '.gdb', '.gpkg', '.dxf', '.kml', '.mif', '.tab'):
        if not shutil.which('ogr2ogr'): sys.exit('Cần GDAL (ogr2ogr) để đọc %s — cài gdal-bin hoặc xuất sang SHP/GeoJSON trước.' % ext)
        tmp = os.path.join(tempfile.mkdtemp(), 'x.geojson')
        subprocess.check_call(['ogr2ogr', '-f', 'GeoJSON', tmp, src, '-skipfailures'])
        src, ext = tmp, '.geojson'
    if ext == '.shp':
        r = shapefile.Reader(src, encodingErrors='replace')
        names = [f[0] for f in r.fields[1:]]
        return [(dict(zip(names, sr.record)), sr.shape.__geo_interface__) for sr in r.shapeRecords() if sr.shape.shapeType]
    d = json.load(open(src, encoding='utf-8'))
    return [(f.get('properties') or {}, f['geometry']) for f in d['features'] if f.get('geometry')]

def ring_of(g):
    if isinstance(g, MultiPolygon): g = max(g.geoms, key=lambda p: p.area)
    return g

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('src'); ap.add_argument('--xa', required=True)
    ap.add_argument('--out', required=True); ap.add_argument('--crs', default='VN2000'); ap.add_argument('--ktt', type=float, default=None, help='kinh tuyến trục (độ), vd 105.5'); ap.add_argument('--mui', type=int, default=3); ap.add_argument('--tol', type=float, default=0.05, help='sai lệch tương đối diện tích hình học/thuộc tính để báo (mặc định 5%%)')
    a = ap.parse_args()
    feats = load(a.src); os.makedirs(a.out, exist_ok=True)
    field_map, dropped = {}, {}
    out, bad, dup, seen, mism, noattr = [], [], [], {}, [], 0
    for i, (props, geom) in enumerate(feats):
        low = {norm(k): k for k in props}
        for std, al in ALIASES.items():
            if std not in field_map:
                k = next((low[x] for x in al if x in low), None)
                if k: field_map[std] = k
    keep = set(field_map.values())
    for i, (props, geom) in enumerate(feats):
        for k in props:
            if k not in keep: dropped[k] = dropped.get(k, 0) + 1
        try: g = shape(geom)
        except Exception as e: bad.append({'idx': i, 'loi': 'hình không đọc được: %s' % e}); continue
        if g.geom_type not in ('Polygon', 'MultiPolygon'): bad.append({'idx': i, 'loi': 'không phải đa giác (%s)' % g.geom_type}); continue
        if not g.is_valid:
            why = explain_validity(g); g2 = g.buffer(0)
            bad.append({'idx': i, 'to': props.get(field_map.get('to')), 'thua': props.get(field_map.get('thua')), 'loi': why, 'tu_sua': bool(g2.is_valid and not g2.is_empty)})
            if not (g2.is_valid and not g2.is_empty): continue
            g = g2
        p = ring_of(g)
        if p.geom_type != 'Polygon': p = max(p.geoms, key=lambda q: q.area)
        to, th = props.get(field_map.get('to')), props.get(field_map.get('thua'))
        dt = props.get(field_map.get('dt')); ld = props.get(field_map.get('ld'))
        try: dtv = float(dt) if dt not in (None, '') else None
        except (TypeError, ValueError): dtv = None
        area = round(p.area, 2)
        if dtv is None: noattr += 1
        elif dtv > 0 and abs(area - dtv) / dtv > a.tol: mism.append({'to': to, 'thua': th, 'dt_hinh_hoc': area, 'dt_thuoc_tinh': dtv, 'lech_pct': round(100 * (area - dtv) / dtv, 2)})
        key = (str(to), str(th))
        if key in seen: dup.append({'to': to, 'thua': th, 'idx': [seen[key], i]})
        else: seen[key] = i
        out.append({'to': to, 'thua': th, 'dt': dtv, 'dtHH': area, 'ld': ld, 'ring': [[round(x, 3), round(y, 3)] for x, y in p.exterior.coords]})
    pj = json.dumps({'xa': a.xa, 'crs': a.crs, 'ktt': a.ktt, 'mui': a.mui, 'n': len(out), 'parcels': out}, ensure_ascii=False, separators=(',', ':'))
    open(os.path.join(a.out, 'parcels.json'), 'w', encoding='utf-8').write(pj)
    rep = {'xa': a.xa, 'nguon': os.path.basename(a.src), 'tong_doi_tuong': len(feats), 'thua_ghi': len(out), 'truong_nhan_dien': field_map,
           'truong_bi_loai': dropped, 'thua_loi_hinh': bad, 'thua_trung_to_thua': dup, 'thieu_dien_tich_thuoc_tinh': noattr,
           'lech_dien_tich_qua_%d%%' % round(a.tol * 100): mism, 'sha256_parcels': hashlib.sha256(pj.encode()).hexdigest()}
    json.dump(rep, open(os.path.join(a.out, 'report.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('%s: %d/%d thửa; lỗi hình %d; trùng %d; lệch DT %d; loại %d trường' % (a.xa, len(out), len(feats), len(bad), len(dup), len(mism), len(dropped)))

if __name__ == '__main__': main()
