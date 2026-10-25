"""HM-17b: MỘT cơ chế phân trang cho 5 bảng dữ liệu (Dư nợ, Ngắn hạn, Trung-dài hạn, Đến hạn, Lãi đọng).
 Trước: 3 cơ chế chồng nhau trên cùng một bảng — (1) renderTable cắt 250 dòng + nút "Hiển thị thêm", (2) desktop-patch setupPagination ẩn dòng bằng display:none (100/trang trên 251 dòng ⇒ "Trang 1/3" dù có 3.848 dòng), (3) tdup2 virtual scroll khi >1000 dòng.
 Sau: renderTable phân trang theo TRANG trên TOÀN BỘ tập đã lọc (50/100/250/500/Tất cả, nhớ lựa chọn), thanh trang nằm trong chính bảng; desktop-patch và tdup2-virtual bỏ qua 5 bảng này (vẫn dùng cho bảng tĩnh khác).
Dùng: python3 apply_hm17b.py <vao.html> <ra.html>"""
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, cnt=1):
    global s
    assert s.count(old) == cnt, ('không đúng số lần', old[:80], s.count(old))
    s = s.replace(old, new)

# 1) trạng thái + hành động phân trang
rep("""window.__TDResetRenderLimit = function(key){
  window.__TD_RENDER_LIMIT[key] = window.__TD_PAGE_SIZE;
};""", """window.__TDResetRenderLimit = function(key){
  window.__TD_RENDER_LIMIT[key] = window.__TD_PAGE_SIZE;
};
/* HM-17b: phân trang theo trang cho 5 bảng dữ liệu — cơ chế duy nhất (thay nút "Hiển thị thêm" + pager ẩn dòng + virtual-scroll) */
window.__TD_PG_KEYS = ['qltd','kd','td','denhan','laidong'];
window.__TD_PG = {};
window.__TD_PG_SIZES = [50, 100, 250, 500, 0]; // 0 = tất cả
window.__TDPgSize = function(){ var v = 100; try { v = parseInt(localStorage.getItem('td_pg_size_v1'), 10); } catch(e){} return window.__TD_PG_SIZES.indexOf(v) >= 0 ? v : 100; };
window.__TDPgState = function(key, total){
  var st = window.__TD_PG[key] || (window.__TD_PG[key] = { page: 1, size: window.__TDPgSize(), last: -1 });
  if (st.last !== total) { st.page = 1; st.last = total; } // bộ lọc đổi số dòng ⇒ về trang 1
  var pages = st.size > 0 ? Math.max(1, Math.ceil(total / st.size)) : 1;
  st.page = Math.max(1, Math.min(st.page, pages)); st.pages = pages;
  return st;
};
window.__TDPgGo = function(key, p){ var st = window.__TD_PG[key]; if (!st) return; st.page = Math.max(1, Math.min(+p || 1, st.pages || 1)); try { renderTable(key); } catch(e){} };
window.__TDPgSetSize = function(key, v){ v = parseInt(v, 10); try { localStorage.setItem('td_pg_size_v1', String(v)); } catch(e){} Object.keys(window.__TD_PG).forEach(function(k){ window.__TD_PG[k].size = v; window.__TD_PG[k].page = 1; }); try { renderTable(key); } catch(e){} };
window.__TDExpandRender = function(key){ var st = window.__TD_PG[key]; window.__TDPgGo(key, (st ? st.page : 1) + 1); }; // tương thích tên cũ""")

# 2) renderTable: cắt theo trang
rep("""  const __pageSize = window.__TD_PAGE_SIZE || 250;
  const __limit = window.__TD_RENDER_LIMIT[key] || __pageSize;
  const __total = rows.length;
  const __sliced = (['qltd','kd','td','denhan','laidong'].includes(key) && __total > __limit);
  const visibleRows = __sliced ? rows.slice(0, __limit) : rows;""", """  /* HM-17b: phân trang theo trang trên toàn bộ tập đã lọc */
  const __total = rows.length;
  const __isPg = window.__TD_PG_KEYS.includes(key);
  const __pg = __isPg ? window.__TDPgState(key, __total) : null;
  const __sliced = !!(__pg && __pg.size > 0 && __total > __pg.size);
  const visibleRows = __sliced ? rows.slice((__pg.page - 1) * __pg.size, __pg.page * __pg.size) : rows;""")

# 3) thanh trang
a = s.index("  /* PATCH 2026-06-10: nút Hiển thị thêm khi đã cắt window */")
b = s.index("  tbody.innerHTML = (infoHtml + html + __moreHtml) ||")
new_bar = r"""  /* HM-17b: thanh trang — luôn hiện số dòng thật của tập đã lọc */
  let __moreHtml = '';
  if (__isPg && __total > window.__TD_PG_SIZES[0]) {
    const bt = (t, p, dis) => `<button type="button" class="td-pg-btn" ${dis ? 'disabled' : ''} onclick="window.__TDPgGo('${key}',${p})" style="padding:3px 10px;border:1px solid #94a3b8;background:${dis ? '#f1f5f9' : '#fff'};border-radius:6px;cursor:${dis ? 'default' : 'pointer'};font-weight:600">${t}</button>`;
    const opts = window.__TD_PG_SIZES.map(n => `<option value="${n}" ${n === __pg.size ? 'selected' : ''}>${n ? n + '/trang' : 'Tất cả (' + fmtNum(__total) + (__total > 1000 ? ', chậm' : '') + ')'}</option>`).join('');
    __moreHtml = `<tr class="row-more td-pg-bar" data-key="${key}"><td colspan="21" style="text-align:center;padding:8px;background:#f8fafc;border-top:1px solid #cbd5e1">
      ${bt('«', 1, __pg.page <= 1)} ${bt('‹', __pg.page - 1, __pg.page <= 1)}
      <span class="td-pg-info" style="margin:0 8px;font-weight:600">Trang ${__pg.page}/${__pg.pages} · ${fmtNum(__total)} dòng${__sliced ? ' (đang xem ' + fmtNum(visibleRows.length) + ')' : ''}</span>
      ${bt('›', __pg.page + 1, __pg.page >= __pg.pages)} ${bt('»', __pg.pages, __pg.page >= __pg.pages)}
      <input type="number" class="td-pg-jump" min="1" max="${__pg.pages}" placeholder="Trang…" style="width:70px;margin-left:8px;padding:3px 6px" onkeydown="if(event.key==='Enter'){window.__TDPgGo('${key}',this.value)}">
      <select class="td-pg-size" style="margin-left:6px;padding:3px 6px" onchange="window.__TDPgSetSize('${key}',this.value)">${opts}</select>
    </td></tr>`;
  }
"""
s = s[:a] + new_bar + s[b:]

# 4) desktop-patch và tdup2-virtual bỏ qua 5 bảng này
rep("if(tbody.querySelectorAll('tr').length>80) setupPagination(tbl);", "if(tbody.querySelectorAll('tr').length>80 && !/^table-(qltd|kd|td|denhan|laidong)$/.test(tbl.id||'')) setupPagination(tbl); // HM-17b: 5 bảng dữ liệu đã có phân trang theo trang trong renderTable")
rep("if (bodyRows(table).length>1000 && !g.complex){ try{ g.enableVirtual(); }catch(e){} }", "if (bodyRows(table).length>1000 && !g.complex && !/^table-(qltd|kd|td|denhan|laidong)$/.test(table.id||'')){ try{ g.enableVirtual(); }catch(e){} } // HM-17b")
open(dst, 'w', encoding='utf-8').write(s)
print('OK')
