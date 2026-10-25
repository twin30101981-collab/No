"""HM-14: cây menu mới — 6 nhóm, đưa Hồ sơ vay (HMTD/Tiêu dùng/Cầm cố/Form hồ sơ vay vốn/FHS) và Cầm cố vào menu (trước đây không có lối vào),
 nhãn menu = tiêu đề trang (PAGE_TITLES), mỗi mục là <a href="#/…"> (Tab/Enter, mở tab mới, trùng địa chỉ router HM-13), gỡ lối vào trùng.
Dùng: python3 apply_hm14.py <vao.html> <ra.html>"""
import sys, os, re
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
rt = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'td_router.js'), encoding='utf-8').read()
SLUG = dict(re.findall(r"(\w+): '([a-z0-9-]+)'", re.search(r'var SLUG = \{(.*?)\};', rt, re.S).group(1)))
def rep(old, new):
    global s
    assert s.count(old) == 1, ('không duy nhất/không thấy', old[:90], s.count(old))
    s = s.replace(old, new)

# (nhóm, [(trang, icon, nhãn=tiêu đề, onclick thêm, badge id|None, badge class)])
def it(page, icon, label, extra='', badge=None, bcls='', child=False):
    return dict(page=page, icon=icon, label=label, extra=extra, badge=badge, bcls=bcls, child=child)
MENU = [
 ('TỔNG QUAN', [it('dashboard','📊','TỔNG QUAN'), it('ctkh','🎯','CHỈ TIÊU KẾ HOẠCH'), it('doisoat','🔎','ĐỐI SOÁT SỐ LIỆU')]),
 ('DƯ NỢ & THEO DÕI', [it('qltd','📋','DƯ NỢ',badge='badge-qltd'), it('kd','📃','DƯ NỢ NGẮN HẠN',badge='badge-kd',child=True), it('td','💳','DƯ NỢ TRUNG-DÀI HẠN',badge='badge-td',child=True), it('qcamco','🔒','DƯ NỢ CẦM CỐ',child=True),
   it('denhan','📅','NỢ ĐẾN HẠN',badge='badge-denhan',bcls='red'), it('laidong','💰','LÃI ĐỌNG',badge='badge-laidong',bcls='red'), it('chlm','🔄','CHUYỂN HẠN MỨC',badge='badge-chlm',bcls='blue'),
   it('tranop','📤','TRẢ NỢ / XUẤT TÀI SẢN'), it('khmoi','🆕','KHÁCH HÀNG MỚI',extra="if(typeof khmoiInit==='function') khmoiInit();")]),
 ('TÀI SẢN & GIÁ ĐẤT', [it('tsbd','🏠','TÀI SẢN BẢO ĐẢM',extra="if(typeof tsbdInit==='function') tsbdInit();",badge='badge-tsbd',bcls='blue'), it('giadat','🏗️','GIÁ ĐẤT & HỆ SỐ K, H')]),
 ('HỒ SƠ VAY', [it('hsvv','📝','FORM HỒ SƠ VAY VỐN'), it('hmtd','📃','HỒ SƠ HẠN MỨC TÍN DỤNG'), it('tieudung','💳','HỒ SƠ TIÊU DÙNG'), it('camco','🔒','HỒ SƠ CẦM CỐ'), it('fhs','🗂️','FORM HỒ SƠ (FHS)')]),
 ('NGHIỆP VỤ', [it('phidv','🧾','GIẢI NGÂN'), it('baocao','📰','BÁO CÁO IPCAS')]),
]
out = ['  <div class="sidebar-section">%s</div>']
html = []
for grp, items in MENU:
    html.append('  <div class="sidebar-section">%s</div>' % grp)
    for i, x in enumerate(items):
        href = '#/' + SLUG.get(x['page'], x['page'])
        badge = ('\n    <span class="badge%s" id="%s">0</span>' % ((' ' + x['bcls']) if x['bcls'] else '', x['badge'])) if x['badge'] else ''
        onclick = "showPage('%s',this); %sreturn false;" % (x['page'], x['extra'] + ' ' if x['extra'] else '')
        if x['page'] == 'qltd':
            html.append('  <a class="nav-item-parent active-able" id="nav-qltd-parent" data-page="qltd" href="%s" onclick="%s">\n    <span class="icon">%s</span><span class="label">%s</span>%s\n  </a>\n  <div class="nav-children open" id="nav-qltd-children" style="max-height:none">' % (href, onclick, x['icon'], x['label'], badge))
        elif x['child']:
            html.append('    <a class="nav-child-item" data-page="%s" href="%s" onclick="%s">\n      <span class="icon">%s</span><span>%s</span>%s\n    </a>' % (x['page'], href, onclick, x['icon'], x['label'], badge.replace('\n    ', '\n      ')))
            nxt = items[i + 1] if i + 1 < len(items) else None
            if not nxt or not nxt['child']: html.append('  </div>')
        else:
            act = ' active' if x['page'] == 'dashboard' else ''
            html.append('  <a class="nav-item%s" data-page="%s" href="%s" onclick="%s">\n    <span class="icon">%s</span><span class="label">%s</span>%s\n  </a>' % (act, x['page'], href, onclick, x['icon'], x['label'], badge))
html.append('  <div class="sidebar-section">HỆ THỐNG</div>')
html.append('''  <a class="nav-item" data-page="archive" href="#/%s" onclick="showPage('archive',this); return false;">
    <span class="icon">💾</span><span class="label">LƯU TRỮ FILE</span>
  </a>
  <div class="nav-item" onclick="openAutoSyncModal()" style="cursor:pointer" tabindex="0" role="button" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openAutoSyncModal();}">
    <span class="icon">🔄</span><span class="label">AUTO-SYNC IPCAS</span>
    <span class="badge blue" id="badge-autosync" style="display:none">ON</span>
  </div>
  <div class="nav-item" onclick="openNotifDetail()" style="cursor:pointer" tabindex="0" role="button" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openNotifDetail();}">
    <span class="icon">🔔</span><span class="label">THÔNG BÁO NỢ</span>
    <span class="badge red" id="badge-notif" style="display:none">0</span>
  </div>
''' % SLUG['archive'])
newmenu = '\n'.join(html) + '\n\n'
a = s.index('  <div class="sidebar-section">TỔNG HỢP</div>')
b = s.index('  <div class="sidebar-footer">', a)
s = s[:a] + newmenu + s[b:]

# CSS cho <a>
rep(".nav-item{display:flex;align-items:center;gap:10px;padding:9px 18px;cursor:pointer;transition:all .15s;color:rgba(255,255,255,.72);position:relative}",
    ".nav-item{display:flex;align-items:center;gap:10px;padding:9px 18px;cursor:pointer;transition:all .15s;color:rgba(255,255,255,.72);position:relative}\na.nav-item,a.nav-item-parent,a.nav-child-item{text-decoration:none}\n#sidebar>*{flex-shrink:0}\n.nav-item:focus-visible,.nav-item-parent:focus-visible,.nav-child-item:focus-visible{outline:2px solid #86efac;outline-offset:-2px}")
rep('<h1 id="page-title">Dashboard – Tổng quan</h1>', '<h1 id="page-title">TỔNG QUAN</h1>')
# tiêu đề trang = nhãn menu
T = {'dashboard': ('TỔNG QUAN','Phòng KHKD · Agribank Nam Định'), 'qltd': ('DƯ NỢ','Dữ liệu IPCAS msit80 — toàn bộ hồ sơ tín dụng'),
 'kd': ('DƯ NỢ NGẮN HẠN','Vay ngắn hạn (TK 211) + Thấu chi — quản lý hạn mức tín dụng'), 'td': ('DƯ NỢ TRUNG-DÀI HẠN','Vay trung hạn (TK 212) + dài hạn (TK 213) — tiêu dùng'),
 'qcamco': ('DƯ NỢ CẦM CỐ','Vay cầm cố sổ tiết kiệm từ IPCAS'), 'denhan': ('NỢ ĐẾN HẠN','Theo dõi các khoản đến hạn thu nợ'), 'tranop': ('TRẢ NỢ / XUẤT TÀI SẢN','Theo dõi giảm dư nợ và tất toán tài sản đảm bảo'),
 'phidv': ('GIẢI NGÂN','Tính phí trên các lần giải ngân'), 'khmoi': ('KHÁCH HÀNG MỚI','Tổng hợp khách hàng vay mới & vay cầm cố theo phòng/CBTD'),
 'hmtd': ('HỒ SƠ HẠN MỨC TÍN DỤNG','Tạo hồ sơ vay vốn hạn mức tín dụng'), 'tieudung': ('HỒ SƠ TIÊU DÙNG','Tạo hồ sơ vay tiêu dùng'), 'camco': ('HỒ SƠ CẦM CỐ','Tạo hồ sơ vay cầm cố sổ tiết kiệm'),
 'hsvv': ('FORM HỒ SƠ VAY VỐN','APC Credit Application Form — Agribank Nam Định'), 'giadat': ('GIÁ ĐẤT & HỆ SỐ K, H','Bảng giá đất Nam Định 2026'), 'archive': ('LƯU TRỮ FILE','Quản lý lưu trữ dữ liệu và báo cáo'),
 'tsbd': ('TÀI SẢN BẢO ĐẢM','Danh mục TSBĐ từ IPCAS đối chiếu trạng thái dư nợ khách hàng'), 'fhs': ('FORM HỒ SƠ (FHS)','Chọn loại hồ sơ → Nhập → Xuất Word')}
i = s.index('const PAGE_TITLES = {'); j = s.index('};', i)
blk = s[i:j]
for k, (t, sub) in T.items():
    m = re.search(r"^  %s:\s*\[.*?\],?\s*$" % k, blk, re.M)
    line = "  %s: ['%s', '%s']," % (k, t, sub.replace("'", "\\'"))
    if m: blk = blk[:m.start()] + line + blk[m.end():]
    else: blk = blk.rstrip('\n') + '\n' + line + '\n'
s = s[:i] + blk + s[j:]
open(dst, 'w', encoding='utf-8').write(s); print('OK', len(s.encode('utf-8')))
