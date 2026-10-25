"""HM-16c (giao diện): (1) gộp các bộ :root rải rác thành MỘT khối token; (2) một hệ toast; (3) tab về 3 kiểu chuẩn; (4) gỡ chế độ tối chưa hoàn thiện.
Dùng: python3 apply_hm16c.py <vao.html> <ra.html>   (từng phần có cờ --only=tokens,toast,tabs,dark để kiểm riêng)"""
import sys, re
src, dst = sys.argv[1], sys.argv[2]
only = [a.split('=')[1].split(',') for a in sys.argv[3:] if a.startswith('--only=')]
only = only[0] if only else ['tokens', 'toast', 'tabs', 'dark']
s = open(src, encoding='utf-8').read()
def rep(old, new, cnt=1):
    global s
    assert s.count(old) == cnt, ('không đúng số lần', old[:80], s.count(old))
    s = s.replace(old, new)

# ───────────── 1. token: một khối :root ─────────────
if 'tokens' in only:
    groups = []
    blank = lambda t: re.sub(r'/\*.*?\*/', lambda m: ' ' * len(m.group(0)), t, flags=re.S)  # bỏ chú thích khi đếm ngoặc, giữ nguyên vị trí
    for sm in re.finditer(r'<style[^>]*>(.*?)</style>', s, flags=re.S):
        body = sm.group(1); base = sm.start(1); clean = blank(body)
        for m in re.finditer(r':root\s*\{([^{}]*)\}', clean):
            at = clean.rfind('@media', 0, m.start()); inside = False
            if at >= 0:
                o = clean.find('{', at); seg = clean[o:m.start()]; inside = o < m.start() and seg.count('{') - seg.count('}') > 0  # còn nằm trong khối @media gần nhất
            if not inside: groups.append((base + m.start(), base + m.end(), body[m.start(1):m.end(1)]))
    assert len(groups) >= 7, len(groups)
    decls, seen, dup = [], {}, []
    for a, b, body in groups:
        for k, v in re.findall(r'(--[\w-]+)\s*:\s*([^;]+?)\s*(?:;|$)', body):
            if k in seen:  # trùng khai báo: giá trị SAU CÙNG thắng (đúng thứ tự cascade cũ)
                decls = [(a, (v if a == k else b)) for a, b in decls]; seen[k] = v; dup.append(k)
                continue
            seen[k] = v; decls.append((k, v))
    # nhóm theo tiền tố
    def fam(k):
        for p, n in (('--z-', 'Lớp chồng (z-index)'), ('--td-', 'Thương hiệu TD'), ('--apc-', 'Agribank APC'), ('--ux-', 'Bố cục UX'), ('--tdup2-', 'Bảng dữ liệu v2'), ('--tdup-', 'Pack v1'), ('--td15-', 'v15'), ('--sidebar', 'Bố cục')):
            if k.startswith(p): return n
        return 'Màu/khoảng chung'
    from collections import OrderedDict
    G = OrderedDict()
    for k, v in decls: G.setdefault(fam(k), []).append((k, v))
    txt = '/* ═════ HM-16c: DESIGN TOKENS — MỘT khối :root duy nhất (khối @media/ghi đè theo màn hình giữ nguyên tại chỗ) ═════ */\n:root{\n'
    for n, items in G.items():
        txt += '  /* ' + n + ' */\n' + ''.join('  %s:%s;\n' % (k, v) for k, v in items)
    txt += '}\n'
    # xoá các khối cũ (từ cuối lên), chèn khối gộp tại vị trí khối đầu tiên (kèm bỏ chú thích HM-16b liền trước nếu có)
    first = groups[0][0]
    for a, b, _ in reversed(groups): s = s[:a] + s[b:]
    cm = s.rfind('/* HM-16b: thang z-index 8 bậc', 0, first)
    if cm >= 0 and first - cm < 600:
        zc = s[cm:s.index('*/', cm) + 2]; s = s[:cm] + s[cm:].replace(zc, '/* thang z-index 8 bậc: ' + zc[zc.index('(') :].rstrip('*/ ').rstrip() + ' */', 1); first = s.index('*/', cm) + 2
    s = s[:first] + '\n' + txt + s[first:]

# ───────────── 2. toast: MỘT hệ (TD.toast) ─────────────
if 'toast' in only:
    TOAST_JS = r"""/* HM-16c: MỘT hệ thông báo (toast). Mọi nơi gọi showToast(msg, loại) / TDUP.toast(msg, {action}) / toast phím tắt đều đi qua TD.toast.
   loại: success|green · error|red · warn|orange|gold · info|blue|'' ; opt: {type, duration(ms; 0 = giữ đến khi close()), action:{label,onClick}} ; trả {el, close()} */
(function () {
  var TD = window.TD = window.TD || {};
  var TYPES = { success: 'success', green: 'success', ok: 'success', error: 'error', red: 'error', danger: 'error', warn: 'warn', warning: 'warn', orange: 'warn', gold: 'warn', yellow: 'warn', info: 'info', blue: 'info', '': 'info' };
  function stack() {
    var c = document.getElementById('td-toasts');
    if (!c) { c = document.createElement('div'); c.id = 'td-toasts'; c.className = 'no-print'; c.setAttribute('role', 'status'); c.setAttribute('aria-live', 'polite'); (document.body || document.documentElement).appendChild(c); }
    return c;
  }
  TD.toast = function (msg, opt) {
    if (opt == null || typeof opt === 'string') opt = { type: opt };
    var t = TYPES[String(opt.type || '').toLowerCase()] || 'info', el = document.createElement('div'), done = false, timer;
    el.className = 'td-toast td-toast-' + t; el.appendChild(document.createTextNode(String(msg == null ? '' : msg)));
    function close() { if (done) return; done = true; clearTimeout(timer); el.classList.add('td-toast-out'); setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 220); }
    if (opt.action) { var b = document.createElement('button'); b.type = 'button'; b.textContent = opt.action.label || 'Hoàn tác'; b.onclick = function () { try { opt.action.onClick && opt.action.onClick(); } finally { close(); } }; el.appendChild(b); }
    var st = stack(); st.appendChild(el); while (st.children.length > 5) st.removeChild(st.firstChild);
    var ms = opt.duration != null ? opt.duration : (opt.action ? 6000 : (t === 'error' ? 5000 : 3200));
    if (ms > 0) timer = setTimeout(close, ms);
    return { el: el, close: close };
  };
})();
function showToast(msg, type) { return TD.toast(msg, type); }
"""
    TOAST_CSS = """/* ═══════════════════════ TOAST (HM-16c: MỘT hệ) ═══════════════════════ */
#td-toasts{position:fixed;right:24px;bottom:24px;z-index:calc(var(--z-7,99990) + 3);display:flex;flex-direction:column;gap:8px;max-width:min(420px,calc(100vw - 32px));pointer-events:none}
.td-toast{pointer-events:auto;display:flex;align-items:center;gap:12px;background:#1a2540;color:#fff;padding:10px 16px;border-radius:10px;border-left:4px solid #3b82f6;font:600 12.5px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;white-space:pre-line;box-shadow:0 6px 20px rgba(0,0,0,.28);animation:td-toast-in .2s ease}
.td-toast-success{border-left-color:#22c55e}.td-toast-error{border-left-color:#ef4444}.td-toast-warn{border-left-color:#f59e0b}.td-toast-info{border-left-color:#3b82f6}
.td-toast button{appearance:none;border:0;background:transparent;color:#93c5fd;text-decoration:underline;font:inherit;cursor:pointer;padding:0}
.td-toast-out{opacity:0;transform:translateY(8px);transition:opacity .2s ease,transform .2s ease}
@keyframes td-toast-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
@media (max-width:600px){#td-toasts{left:12px;right:12px;bottom:calc(76px + env(safe-area-inset-bottom,0px));max-width:none}}
@media print{#td-toasts{display:none!important}}
"""
    import re as _re
    def cut(pat, cnt=1):
        global s
        m = list(_re.finditer(pat, s, flags=_re.S)); assert len(m) == cnt, (pat[:60], len(m))
        for x in reversed(m): s = s[:x.start()] + s[x.end():]
    # CSS cũ
    a = s.index('/* ═══════════════════════ TOAST ═══════════════════════ */'); b = s.index('@keyframes toastIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}', a)
    b = s.index('\n', b) + 1; s = s[:a] + TOAST_CSS + s[b:]
    cut(r'#toast-container \{[^}]*\}\n\.toast-item \{[^}]*\}\n\.toast-item\.success \{[^}]*\}\n\.toast-item\.error   \{[^}]*\}\n\.toast-item\.info    \{[^}]*\}\n@keyframes toastIn  \{[^}]*\{[^}]*\}[^}]*\{[^}]*\}\s*\}\n@keyframes toastOut \{[^}]*\{[^}]*\}[^}]*\{[^}]*\}\s*\}\n')
    cut(r'  #ux-toast\{[^}]*\}\n  #ux-toast\.show\{[^}]*\}\n')
    cut(r'  \.tdup-toast\{[^}]*\}\n  \.tdup-toast button\{[^}]*\}\n')
    cut(r'#page-hsvv \.template-toast\{[^}]*\}\n')
    rep('<div class="template-toast" id="hsvv-toast"></div>\n', '')
    # JS: showToast (2 định nghĩa) → TD.toast
    old1 = s[s.index("function showToast(msg, type) {\n  type = type || 'info';"):]
    old1 = old1[:old1.index('\n}\n') + 3]
    rep(old1, TOAST_JS)
    old2 = "function showToast(msg, cls = '') {\n  const t = document.createElement('div');\n  t.className = 'toast ' + cls;\n  t.textContent = msg;\n  document.body.appendChild(t);\n  setTimeout(() => {\n    t.style.cssText += 'opacity:0;transform:translateY(16px);transition:all .3s';\n    setTimeout(() => t.remove(), 320);\n  }, 2400);\n}\n"
    rep(old2, "function showToast(msg, cls = '') { return TD.toast(msg, cls); } // HM-16c: cùng một hệ toast\n")
    # phím tắt desktop-patch (ux-toast)
    rep("""  var toastEl;
  function toast(msg){
    if (!toastEl){
      toastEl = document.createElement('div');
      toastEl.id = 'ux-toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function(){ toastEl.classList.remove('show'); }, 1400);
  }
""", "  function toast(msg){ TD.toast(msg, { duration: 1400 }); } // HM-16c: dùng chung TD.toast\n")
    # TDUP.toast
    a = s.index("  function toast(msg, opts){\n    opts = opts || {};\n    var el = document.createElement('div'); el.className = 'tdup-toast';")
    b = s.index("    return el;\n  }\n", a) + len("    return el;\n  }\n")
    s = s[:a] + "  function toast(msg, opts){ opts = opts || {}; return TD.toast(msg, { duration: opts.duration || 4000, action: opts.action }).el; } // HM-16c: dùng chung TD.toast\n" + s[b:]
    # HSVV: toast gắn trang → TD.toast
    rep("""  const toast = document.getElementById('hsvv-toast');
  if (toast) { toast.textContent = '⏳ Đang tạo file Word...'; toast.style.display = 'block'; }
""", """  const toast = TD.toast('⏳ Đang tạo file Word...', { type: 'info', duration: 0 }); // HM-16c
""")
    rep("      if (toast) toast.style.display = 'none';\n      showToast('❌ Không tìm thấy file template", "      if (toast) toast.close();\n      showToast('❌ Không tìm thấy file template")
    rep("""    if (toast) {
      toast.textContent = `✅ Đã xuất: ${fileName}`;
      setTimeout(() => { toast.style.display = 'none'; }, 4000);
    }
""", """    if (toast) toast.close();
""")
    rep("    if (toast) toast.style.display = 'none';\n    // Docxtemplater", "    if (toast) toast.close();\n    // Docxtemplater")
    rep("""  function apcShowToast(message, bgColor = '#1A7F4B') {
    const toast = document.getElementById('hsvv-toast');
    toast.textContent = message;
    toast.style.background = bgColor;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3500);
  }
""", """  function apcShowToast(message, bgColor = '#1A7F4B') { // HM-16c: màu cũ → loại thông báo
    TD.toast(message, { type: bgColor === '#C0392B' ? 'error' : bgColor === '#D68910' ? 'warn' : 'success', duration: 3500 });
  }
""")
    rep("""  const toast = document.getElementById('hsvv-toast');
  if (toast) {
    toast.textContent = `✅ Đã điền ${applied} trường vào form!`;
    toast.style.display = 'block';
    setTimeout(() => toast.style.display = 'none', 3500);
  }
""", """  TD.toast(`✅ Đã điền ${applied} trường vào form!`, { type: 'success', duration: 3500 }); // HM-16c
""")
    rep("'hsvv-pgFill','hsvv-pgPct','hsvv-modalOv','hsvv-toast',", "'hsvv-pgFill','hsvv-pgPct','hsvv-modalOv',")

# ───────────── 3. tab: 2 kiểu chuẩn ─────────────
if 'tabs' in only:
    import re as _r2
    TOK = "  /* Tab */\n  --tab-fg:#64748b;\n  --tab-fg-active:#1e3a8a;\n  --tab-hover:#f1f5f9;\n  --tab-active-bg:#eff6ff;\n  --pill-bg:#f8fafc;\n  --pill-bd:#cbd5e1;\n  --pill-fg:#1a2540;\n  --pill-active:#1a2540;\n"
    if 'tokens' in only:
        i = s.index('HM-16c: DESIGN TOKENS'); j = s.index('\n}\n', i); s = s[:j + 1] + TOK + s[j + 1:]
    def cut_rule(selector):
        global s
        pat = _r2.compile(_r2.escape(selector) + r'\s*\{[^{}]*\}\n?')
        m = list(pat.finditer(s)); assert len(m) == 1, (selector, len(m))
        s = s[:m[0].start()] + s[m[0].end():]
    for sel in ['.laicalc-tab', '.laicalc-tab:hover', '.laicalc-tab.active', '.im-tab', '.im-tab.active',
                '#page-hsvv .tab-btn', '#page-hsvv .tab-btn.active', '#page-ctkh .ctkh-tab', '#page-ctkh .ctkh-tab:hover', '#page-ctkh .ctkh-tab.active',
                '#page-khmoi .khmoi-tab', '#page-khmoi .khmoi-tab:hover', '#page-khmoi .khmoi-tab.active', '.tab-btn', '.tab-btn.active',
                '.sync-tab', '.sync-tab:hover', '.sync-tab.active', '.bgdat-frame .ward-tab', '.bgdat-frame .ward-tab:hover', '.bgdat-frame .ward-tab.active-ward', '.ward-tab',
                '#page-tsbd .tsbd-tab', '#page-tsbd .tsbd-tab.active']:
        cut_rule(sel)
    TAB_CSS = """/* ═══ HM-16c: TAB — 2 kiểu chuẩn. A) gạch chân: chuyển mục trong trang (Khách hàng, KH mới, Đồng bộ, Máy tính lãi). B) nút: chọn nhóm/bộ lọc (Hồ sơ vay, Nhập liệu, TSBĐ, Phường). Tab trên nền tối (.lt-tab, .hsv-mob-tab) giữ riêng. ═══ */
.ctkh-tab,.khmoi-tab,.sync-tab,.laicalc-tab{padding:9px 16px;border:0;border-bottom:3px solid transparent;border-radius:0;background:transparent;font-family:inherit;font-size:13px;font-weight:700;color:var(--tab-fg,#64748b);cursor:pointer;margin-bottom:-2px;white-space:nowrap;transition:color .15s,background .15s,border-color .15s}
.ctkh-tab:hover,.khmoi-tab:hover,.sync-tab:hover,.laicalc-tab:hover{color:var(--tab-fg-active,#1e3a8a);background:var(--tab-hover,#f1f5f9)}
.ctkh-tab.active,.khmoi-tab.active,.sync-tab.active,.laicalc-tab.active{color:var(--tab-fg-active,#1e3a8a);border-bottom-color:var(--tab-fg-active,#1e3a8a);background:var(--tab-active-bg,#eff6ff)}
.tab-btn,.im-tab,.tsbd-tab,.btn.tsbd-tab,.bgdat-frame .ward-tab{padding:6px 14px;border:1px solid var(--pill-bd,#cbd5e1);border-radius:8px;background:var(--pill-bg,#f8fafc);font-family:inherit;font-size:13px;font-weight:600;color:var(--pill-fg,#1a2540);cursor:pointer;margin-right:0;transition:color .15s,background .15s,border-color .15s}
.tab-btn:hover,.im-tab:hover,.tsbd-tab:hover,.bgdat-frame .ward-tab:hover{border-color:var(--pill-active,#1a2540)}
.tab-btn.active,.im-tab.active,.tsbd-tab.active,.btn.tsbd-tab.active,.bgdat-frame .ward-tab.active-ward{background:var(--pill-active,#1a2540);color:#fff;border-color:var(--pill-active,#1a2540)}
"""
    rep(""" style="background:${bgd_currentWard==='__ALL__'?'var(--accent)':'white'};border-color:var(--accent);color:${bgd_currentWard==='__ALL__'?'white':'var(--accent)'};">""", '>')  # style nội tuyến làm nút "Tất cả phường" không đổi trạng thái khi chọn phường khác
    k = s.index('/* ═══════════════════════ TOAST (HM-16c' if 'toast' in only else '/* ═══════════════════════ TOAST ═══')
    s = s[:k] + TAB_CSS + s[k:]

# ───────────── 4. gỡ chế độ tối ─────────────
if 'dark' in only:
    import re as _r3
    n0 = len(_r3.findall(r'[ \t]*html\[data-tdup-theme="dark"\][^{}]*\{[^{}]*\}\n', s)); assert n0 >= 15, n0
    s = _r3.sub(r'[ \t]*html\[data-tdup-theme="dark"\][^{}]*\{[^{}]*\}\n', '', s)
    rep('  <button type="button" data-tdup-act="theme" title="Đổi giao diện (Sáng/Tối/Tự động)">Theme</button>\n', '')
    a = s.index("  var THEMES = ['auto','light','dark'];"); b = s.index("  function applyDensity(d){")
    s = s[:a] + "  // HM-16c: gỡ chế độ tối (tương phản không đạt ở các trang chính) — giao diện chỉ còn sáng\n  var DENS   = ['comfortable','compact','spacious'];\n  function applyTheme(){ document.documentElement.setAttribute('data-tdup-theme', 'light'); }\n" + s[b:]
    a = s.index("  applyTheme((function(){ var t = LS.get('theme','light');"); b = s.index("  applyDensity(LS.get('density','comfortable'));")
    s = s[:a] + "  applyTheme();\n" + s[b:]
    rep("  if (window.matchMedia){\n    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(){\n      if ((LS.get('theme','light'))==='auto') applyTheme('auto');\n    });\n  }\n", '')
    rep("    push('Đổi giao diện Sáng / Tối / Tự động', 'Theme', function(){ cycleTheme(); });\n", '')
    a = s.index("  function cycleTheme(){"); b = s.index("  function cycleDensity(){")
    s = s[:a] + s[b:]
    rep("    else if (act==='theme') cycleTheme();\n", '')
    rep("    theme: { set: applyTheme, cycle: cycleTheme },\n", '')

open(dst, 'w', encoding='utf-8').write(s)
print('token trùng khai báo (lấy giá trị cuối):', dup if 'tokens' in only else '-'); print('OK', len(s), 'phần:', only)
