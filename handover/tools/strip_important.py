#!/usr/bin/env python3
"""HM-08f — gỡ `!important` THỪA theo kết quả tests/tools/important_scan.js (khai báo thừa = bỏ đi thì kiểu dáng tính toán của mọi phần tử khớp không đổi).
  node tests/tools/important_scan.js app/land-gis.html /tmp/imp.json
  python3 handover/tools/strip_important.py app/land-gis.html /tmp/imp.json [--apply]
Chỉ sửa khi khối <style> thứ `sheet` có luật tại `path` mà selector khớp; không khớp → bỏ qua. Luôn kiểm lại bằng tests/tools/cssdump.js + cssdiff.py."""
import json, re, sys
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from prune_dead_css import STYLE, parse

# Ngữ cảnh động mà các trạng thái dựng sẵn không phủ hết (phần tử được JS chuyển vào/ra khung sheet, điều khiển lớp nền Leaflet) → luôn giữ !important
EXCLUDE = re.compile(r'lg62-sheet|data-lg62-moved|leaflet-control-layers')

def norm(s): return re.sub(r'\s+', '', s)

def serialize(nodes):
    out = []
    for nd in nodes:
        if nd[0] == 'c': out.append(nd[1])
        elif nd[0] == 'a': out.append(nd[3] if nd[2] is None else nd[1] + '{' + serialize(nd[2]) + '}')
        else: out.append(nd[1] + '{' + nd[2] + '}')
    return ''.join(out)

def strip_decl(body, prop):
    n = 0
    def rep(m):
        nonlocal n; n += 1; return m.group(1) + m.group(2).rstrip() 
    pat = re.compile(r'((?:^|[;{\s])' + re.escape(prop) + r'\s*:[^;{}]*?)\s*!important(\s*(?:;|$))', re.I)
    new = pat.sub(lambda m: m.group(1) + m.group(2), body)
    return new, (0 if new == body else 1)

def main(path, jpath, apply):
    data = json.load(open(jpath))['redundant']; src = open(path, encoding='utf-8').read()
    blocks = list(STYLE.finditer(src)); trees = [parse(m.group(2)) for m in blocks]
    done = skipped = 0; touched = set()
    # Đơn vị kiểm chứng của important_scan.js là NHÓM luật cùng selector (CSS có bản sao do JS nạp lại) → gỡ ở mọi luật tĩnh cùng selector + thuộc tính.
    import os
    keep = set(json.load(open(sys.argv[3]))) if len(sys.argv) > 3 and not sys.argv[3].startswith('--') and os.path.exists(sys.argv[3]) else set()
    want = {}
    for e in data:
        if norm(e['sel']) + '|' + e['prop'] in keep or EXCLUDE.search(e['sel']): continue
        want.setdefault(norm(e['sel']), set()).add(e['prop'])
    def walk(nodes, si):
        nonlocal done, touched
        for k, nd in enumerate(nodes):
            if nd[0] == 'a' and nd[2] is not None: walk(nd[2], si)
            elif nd[0] == 'r':
                props = want.get(norm(nd[1]))
                if not props: continue
                body = nd[2]; ch = False
                for pr in props:
                    body, c = strip_decl(body, pr)
                    if c: done += 1; ch = True
                if ch: nodes[k] = ('r', nd[1], body); touched.add(si)
    for si, t in enumerate(trees): walk(t, si)
    skipped = 0
    print('gỡ !important ở %d khai báo · bỏ qua %d · khối <style> đổi: %d' % (done, skipped, len(touched)))
    if apply and done:
        out, last = [], 0
        for m, t in zip(blocks, trees):
            out.append(src[last:m.start(2)]); out.append(serialize(t)); last = m.end(2)
        out.append(src[last:]); open(path, 'w', encoding='utf-8').write(''.join(out)); print('đã ghi', path)

if __name__ == '__main__': main(sys.argv[1], sys.argv[2], '--apply' in sys.argv)
