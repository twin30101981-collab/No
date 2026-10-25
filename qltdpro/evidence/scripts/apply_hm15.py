"""HM-15: topbar gọn + MỘT bảng lệnh (Ctrl K) + MỘT bộ phím tắt (td_keys.js).
 - Topbar 14 nút → 6 (☰, ngày dữ liệu, Nhập IPCAS, Lưu, 🔍 Ctrl K, ⋯ Tiện ích); các nút còn lại chuyển vào menu Tiện ích (vẫn là nút gốc, chỉ ẩn khỏi topbar) —
   nút Reset (xoá dữ liệu phiên) không còn nằm cạnh nút Lưu.
 - Phím tắt: Ctrl+S / Ctrl+E / Ctrl+K(Ctrl+Shift+K) do một bộ xử lý capture trên window; chặn 4 bộ Ctrl+S, 3 bộ Ctrl+E, 3 bảng lệnh cũ.
Dùng: python3 apply_hm15.py <vao.html> <ra.html>"""
import sys, os
src, dst = sys.argv[1], sys.argv[2]
here = os.path.dirname(os.path.abspath(__file__))
s = open(src, encoding='utf-8').read()
mod = open(os.path.join(here, 'td_keys.js'), encoding='utf-8').read()
def rep(old, new):
    global s
    assert s.count(old) == 1, ('không duy nhất/không thấy', old[:90], s.count(old))
    s = s.replace(old, new)

# 1. module phím tắt: ngay sau <body> thật
i = s.index('\n<body>\n'); assert i < s.index('<nav id="sidebar">')
s = s[:i] + '\n<body>\n<script id="td-keys">\n' + mod.rstrip() + '\ntry { TD.keys.install(window); } catch (e) { console.error("[HM-15 keys]", e); }\n</script>\n' + s[i + len('\n<body>\n'):]

# 2. CSS: ẩn nút khỏi topbar (vẫn còn trong DOM, bấm được qua menu)
rep("a.nav-item,a.nav-item-parent,a.nav-child-item{text-decoration:none}",
    "a.nav-item,a.nav-item-parent,a.nav-child-item{text-decoration:none}\n"
    "/* HM-15: topbar gọn — các nút này chuyển vào menu Tiện ích */\n"
    ".topbar #btn-autosync,.topbar .topbar-right #dp-toggle-btn,#dp-toggle-btn,.topbar #td-audit-actor-chip,.topbar #btn-audit-log,.topbar #btn-print-tables-a4,.topbar #inbox-chip,.topbar button[onclick=\"openLaiCalcModal()\"],.topbar button[onclick=\"resetAllData()\"],#dp-density-bar{display:none!important}\n"
    "#td-cmd-btn{border:1px solid #cbd5e1;background:#fff;color:#0f172a;border-radius:6px;padding:5px 10px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap}\n"
    "#td-cmd-btn kbd{font:600 10px system-ui;background:#e2e8f0;border-radius:3px;padding:1px 4px;margin-left:4px}")
# 3. nút bảng lệnh trên topbar (sau Lưu)
rep("""    <button class="btn btn-green" onclick="saveData()" data-tipkey="save" title="Lưu dữ liệu (Ctrl+S)">💾 Lưu</button>""",
    """    <button class="btn btn-green" onclick="saveData()" data-tipkey="save" title="Lưu dữ liệu (Ctrl+S)">💾 Lưu</button>
    <button type="button" id="td-cmd-btn" onclick="TD.keys.run('palette')" title="Bảng lệnh: tìm trang, khách hàng, thao tác (Ctrl+K)">🔍 Tìm / lệnh <kbd>Ctrl K</kbd></button>""")
# 4. menu Tiện ích: công cụ + nguy hiểm
rep("""        <div class="util-sep"></div>
        <div class="util-head">Khác</div>""", """        <div class="util-sep"></div>
        <div class="util-head">Công cụ</div>
        <button class="util-item" onclick="utilRun(openLaiCalcModal)"><span class="ue">🧮</span> Máy tính lãi (Ctrl+L)</button>
        <button class="util-item" onclick="utilRun(function(){var b=document.getElementById('btn-print-tables-a4'); if(b) b.click();})"><span class="ue">📊</span> In bảng A4</button>
        <button class="util-item" onclick="utilRun(function(){var b=document.getElementById('td-audit-actor-chip'); if(b) b.click();})"><span class="ue">👤</span> Đặt tên người thao tác</button>
        <button class="util-item" onclick="utilRun(function(){var b=document.getElementById('btn-audit-log'); if(b) b.click();})"><span class="ue">📜</span> Nhật ký chỉnh sửa</button>
        <button class="util-item" onclick="utilRun(function(){var b=document.getElementById('dp-toggle-btn'); if(b) b.click();})"><span class="ue">🖥️</span> Chế độ Desktop (bật/tắt)</button>
        <button class="util-item" onclick="utilRun(function(){var b=document.querySelector('#dp-density-bar [data-d=compact]'); if(b) b.click();})"><span class="ue">⊟</span> Mật độ: Compact</button>
        <button class="util-item" onclick="utilRun(function(){var b=document.querySelector('#dp-density-bar [data-d=normal]'); if(b) b.click();})"><span class="ue">⊡</span> Mật độ: Normal</button>
        <button class="util-item" onclick="utilRun(function(){var b=document.querySelector('#dp-density-bar [data-d=comfortable]'); if(b) b.click();})"><span class="ue">⊞</span> Mật độ: Comfortable</button>
        <button class="util-item" onclick="utilRun(function(){alert('PHÍM TẮT\\n\\nCtrl+K  Bảng lệnh (tìm trang, khách hàng, thao tác)\\nCtrl+S  Lưu (hồ sơ đang mở / dữ liệu)\\nCtrl+E  Xuất Excel trang hiện tại\\nCtrl+L  Máy tính lãi\\n/  Tìm kiếm trên trang\\nEsc  Đóng hộp thoại');})"><span class="ue">⌨️</span> Phím tắt</button>
        <div class="util-sep"></div>
        <div class="util-head">Khác</div>""")
rep("""        <button class="util-item danger" onclick="utilRun(hardcoreReset)"><span class="ue">☢️</span> Xóa cứng toàn bộ</button>""",
    """        <button class="util-item danger" onclick="utilRun(resetAllData)"><span class="ue">🔄</span> Reset dữ liệu phiên (giữ cấu hình)</button>
        <button class="util-item danger" onclick="utilRun(hardcoreReset)"><span class="ue">☢️</span> Xóa cứng toàn bộ</button>""")
open(dst, 'w', encoding='utf-8').write(s); print('OK', len(s.encode('utf-8')))
