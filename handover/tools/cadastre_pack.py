#!/usr/bin/env python3
"""HM-27b — parcels.json (từ cadastre_convert.py) -> gói nhị phân: <out>/pack.lgpk.gz + manifest.json (sha256).
Định dạng LGPK v1 (little-endian, toạ độ int32 mm tính từ gốc bbox):
 header 64B: 'LGPK' u32 ver, u32 n, u32 nRingPts, u32 nNodes, u32 nodeSize, u32 nLeafNodes, f64 ox, f64 oy, u32 nLd, pad
 parcels n*44B (sắp theo (to,thua)): u32 to, u32 thua, f32 dt, f32 dtHH, u16 ld, u16 pad, u32 ringStart, u32 ringLen, i32 minx,miny,maxx,maxy
 ring pts: i32 x,y   · R-tree STR đóng gói: node 24B: i32 minx,miny,maxx,maxy, u32 first, u32 count (lá: first=chỉ số thửa; trong: chỉ số nút con); nút gốc ở cuối
 bảng loại đất: nLd × 8B ASCII.   Dãy cạnh = hiệu hai điểm liên tiếp của vòng (tính ở bộ đọc)."""
import json, struct, sys, os, gzip, hashlib, math
NODE = 16
def build(parcels):
    ps = [p for p in parcels if isinstance(p['to'], (int, float)) or str(p['to']).isdigit()]
    ps = [p for p in ps if str(p['thua']).isdigit()]
    ps.sort(key=lambda p: (int(p['to']), int(p['thua'])))
    xs = [x for p in ps for x, _ in p['ring']]; ys = [y for p in ps for _, y in p['ring']]
    ox, oy = math.floor(min(xs)), math.floor(min(ys))
    lds = sorted({str(p.get('ld') or '')[:8] for p in ps}); lid = {v: i for i, v in enumerate(lds)}
    pts, rows, boxes = bytearray(), bytearray(), []
    npts = 0
    for p in ps:
        r = [(round((x - ox) * 1000), round((y - oy) * 1000)) for x, y in p['ring']]
        bb = (min(a for a, _ in r), min(b for _, b in r), max(a for a, _ in r), max(b for _, b in r)); boxes.append(bb)
        for x, y in r: pts += struct.pack('<ii', x, y)
        rows += struct.pack('<IIffHHIIiiii', int(p['to']), int(p['thua']), p['dt'] or 0, p['dtHH'], lid[str(p.get('ld') or '')[:8]], 0, npts, len(r), *bb)
        npts += len(r)
    # STR: sắp theo x rồi chia lát theo y
    n = len(ps); order = list(range(n)); nodes = []
    s = math.ceil(math.sqrt(math.ceil(n / NODE))) or 1
    order.sort(key=lambda i: boxes[i][0] + boxes[i][2]); per = s * NODE
    leafs = []
    for k in range(0, n, per):
        sl = sorted(order[k:k + per], key=lambda i: boxes[i][1] + boxes[i][3])
        for j in range(0, len(sl), NODE): leafs.append(sl[j:j + NODE])
    # lá trỏ tới mảng "thứ tự thửa" riêng để đọc được: ghi hoán vị
    perm = [i for g in leafs for i in g]
    level = []; pos = 0
    for g in leafs:
        bb = (min(boxes[i][0] for i in g), min(boxes[i][1] for i in g), max(boxes[i][2] for i in g), max(boxes[i][3] for i in g))
        level.append((bb, pos, len(g))); pos += len(g)
    nodes.extend(level); nLeaf = len(level); start = 0
    while len(level) > 1:
        nxt = []
        for j in range(0, len(level), NODE):
            g = level[j:j + NODE]
            bb = (min(a[0][0] for a in g), min(a[0][1] for a in g), max(a[0][2] for a in g), max(a[0][3] for a in g))
            nxt.append((bb, start + j, len(g)))
        start += len(level); nodes.extend(nxt); level = nxt
    nb = bytearray()
    for bb, f, c in nodes: nb += struct.pack('<iiiiII', *bb, f, c)
    permb = struct.pack('<%dI' % len(perm), *perm)
    hdr = struct.pack('<4sIIIIIIddI', b'LGPK', 1, n, npts, len(nodes), NODE, nLeaf, float(ox), float(oy), len(lds)).ljust(64, b'\0')
    ldb = b''.join(v.encode('ascii', 'replace').ljust(8, b'\0') for v in lds)
    return hdr + bytes(rows) + bytes(pts) + permb + bytes(nb) + ldb, n
def main():
    src, out = sys.argv[1], sys.argv[2]; d = json.load(open(src, encoding='utf-8'))
    blob, n = build(d['parcels']); os.makedirs(out, exist_ok=True)
    gz = gzip.compress(blob, 9, mtime=0); open(os.path.join(out, 'pack.lgpk.gz'), 'wb').write(gz)
    m = {'xa': d['xa'], 'crs': d['crs'], 'dinh_dang': 'LGPK1', 'so_thua': n, 'byte_nen': len(gz), 'byte_giai_nen': len(blob), 'sha256': hashlib.sha256(gz).hexdigest()}
    json.dump(m, open(os.path.join(out, 'manifest.json'), 'w'), ensure_ascii=False, indent=1); print(json.dumps(m, ensure_ascii=False))
if __name__ == '__main__': main()
