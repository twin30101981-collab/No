#!/usr/bin/env python3
"""HM-08f — gỡ luật CSS CHẾT khỏi app: luật mà selector chứa class/id không xuất hiện ở bất kỳ đâu ngoài các khối <style> (HTML, JS, chuỗi).
An toàn theo cách làm: token (.class / #id) bị coi là "còn dùng" nếu xuất hiện nguyên văn ngoài CSS, hoặc là tiền tố ghép chuỗi (lg8e- + …).
Selector có :not()/:is()/:where()/:has() chỉ xét phần ngoài các hàm đó. Không đụng @keyframes/@font-face/@page. Chạy:
  python3 handover/tools/prune_dead_css.py app/land-gis.html            # báo cáo (khô)
  python3 handover/tools/prune_dead_css.py app/land-gis.html --apply    # ghi đè
"""
import re, sys

STYLE = re.compile(r'(<style[^>]*>)(.*?)(</style>)', re.S)
FUNC = re.compile(r':(?:not|is|where|has|matches)\((?:[^()]|\([^()]*\))*\)')
TOK = re.compile(r'(?<![\w-])([.#])(-?[A-Za-z_][\w-]*)')

def parse(css):
    """Tách CSS thành nút: ('c',text) | ('r',sel,body) | ('a',header,children|None,raw)"""
    i, n, out = 0, len(css), []
    def skip_str(j, q):
        j += 1
        while j < n and css[j] != q:
            j += 2 if css[j] == '\\' else 1
        return j + 1
    while i < n:
        if css.startswith('/*', i):
            j = css.find('*/', i + 2); j = n if j < 0 else j + 2; out.append(('c', css[i:j])); i = j; continue
        if css[i].isspace():
            j = i
            while j < n and css[j].isspace(): j += 1
            out.append(('c', css[i:j])); i = j; continue
        # đọc phần đầu tới '{' hoặc ';' (at-rule không khối)
        j = i
        while j < n and css[j] not in '{;':
            if css[j] in '"\'': j = skip_str(j, css[j])
            elif css.startswith('/*', j): j = css.find('*/', j + 2); j = n if j < 0 else j + 2
            else: j += 1
        if j >= n: out.append(('c', css[i:])); break
        if css[j] == ';': out.append(('c', css[i:j + 1])); i = j + 1; continue
        head = css[i:j]; k, depth = j + 1, 1
        while k < n and depth:
            ch = css[k]
            if ch in '"\'': k = skip_str(k, ch); continue
            if css.startswith('/*', k): k = css.find('*/', k + 2); k = n if k < 0 else k + 2; continue
            if ch == '{': depth += 1
            elif ch == '}': depth -= 1
            k += 1
        body = css[j + 1:k - 1]
        h = head.strip()
        if h.startswith('@'):
            name = re.match(r'@([\w-]+)', h).group(1).lower()
            if name in ('media', 'supports', 'layer', 'container', 'document'): out.append(('a', head, parse(body), None))
            else: out.append(('a', head, None, css[i:k]))
        else: out.append(('r', head, body))
        i = k
    return out

def split_sel(sel):
    parts, depth, cur = [], 0, ''
    for ch in sel:
        if ch in '([': depth += 1
        elif ch in ')]': depth -= 1
        if ch == ',' and depth == 0: parts.append(cur); cur = ''
        else: cur += ch
    parts.append(cur); return parts

def used(tok, text):
    if tok in text: return True
    for m in re.finditer(r'[-_]', tok):
        p = tok[:m.start() + 1]
        if len(p) >= 3 and any((p + q) in text for q in ('"', "'", '`', '${')): return True
    return False

def build(nodes, text, stats):
    out = []
    for nd in nodes:
        if nd[0] == 'c': out.append(nd[1]); continue
        if nd[0] == 'a':
            if nd[2] is None: out.append(nd[3]); continue
            inner = build(nd[2], text, stats)
            if not inner.strip() or all(x[0] == 'c' for x in nd[2] if False): pass
            if re.sub(r'/\*.*?\*/|\s', '', inner, flags=re.S) == '': stats['empty_at'] += 1; continue
            out.append(nd[1] + '{' + inner + '}'); continue
        sel, body = nd[1], nd[2]
        alive = []
        for s in split_sel(sel):
            core = FUNC.sub('', s)
            dead = [m.group(0) for m in TOK.finditer(core) if not used(m.group(2), text)]
            if dead: stats['dead_sel'] += 1; stats['tok'].update(dead)
            else: alive.append(s)
        if not alive:
            stats['rules'] += 1; stats['bytes'] += len(sel) + len(body) + 2; stats['imp'] += body.count('!important'); continue
        out.append((','.join(alive) if len(alive) != len(split_sel(sel)) else sel) + '{' + body + '}')
    return ''.join(out)

def run(path, apply):
    src = open(path, encoding='utf-8').read()
    text = STYLE.sub('', src)
    stats = {'rules': 0, 'bytes': 0, 'imp': 0, 'dead_sel': 0, 'empty_at': 0, 'tok': set()}
    stats['tok'] = set()
    class S(dict): pass
    st = {'rules': 0, 'bytes': 0, 'imp': 0, 'dead_sel': 0, 'empty_at': 0, 'tok': set()}
    # bộ đếm token dùng set.update → đổi tên cho đơn giản
    class T(set): pass
    def repl(m):
        css = m.group(2)
        if 'lg-keep-css' in css[:200]: return m.group(0)
        class St(dict):
            pass
        s2 = {'rules': 0, 'bytes': 0, 'imp': 0, 'dead_sel': 0, 'empty_at': 0, 'tok': _Tok()}
        new = build(parse(css), text, s2)
        for k in ('rules', 'bytes', 'imp', 'dead_sel', 'empty_at'): st[k] += s2[k]
        st['tok'].update(s2['tok'].s)
        return m.group(1) + new + m.group(3)
    out = STYLE.sub(repl, src)
    before = sum(len(m.group(2)) for m in STYLE.finditer(src)); after = sum(len(m.group(2)) for m in STYLE.finditer(out))
    print('luật chết bỏ: %d (selector chết %d) · !important gỡ: %d · CSS %d → %d byte (−%d) · at-rule rỗng bỏ: %d' % (st['rules'], st['dead_sel'], st['imp'], before, after, before - after, st['empty_at']))
    print('mẫu token chết:', ' '.join(sorted(st['tok'])[:25]))
    if apply and out != src:
        open(path, 'w', encoding='utf-8').write(out); print('đã ghi', path)
    return st, before - after

class _Tok:
    def __init__(self): self.s = set()
    def update(self, it): self.s.update(it)

if __name__ == '__main__':
    run(sys.argv[1], '--apply' in sys.argv)
