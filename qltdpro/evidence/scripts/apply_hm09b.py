"""HM-09b: TDCMP / TD_AUDIT / TDUP5 dùng chung nguồn số liệu với TD.metrics / TD.doisoat.
 - TDCMP.captureToday bỏ im lặng dòng không có mã KH và số HĐ ⇒ tổng "hôm nay" thấp hơn Dashboard; nay giữ dòng có dư nợ và hiện dải app/tệp/chênh lệch (vàng khi lệch).
 - TD_AUDIT: phép "Σ nhóm vs Σ tất cả" luôn khớp (tự so với chính nó) ⇒ thay bằng các chỉ tiêu của TD.doisoat (app / tệp / chênh lệch).
 - TDUP5.scanInterestOverdue đọc DOM (phụ thuộc bảng đang mở/lọc) ⇒ đọc DATA.qltd + Past Due; DOM chỉ còn là phương án dự phòng.
Dùng: python3 apply_hm09b.py <vao.html> <ra.html>"""
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, cnt=1):
    global s
    assert s.count(old) == cnt, ('không đúng số lần', old[:80], s.count(old))
    s = s.replace(old, new)

# ---- TDCMP ----
rep("""    if(!ma && !hd) continue;
    rows.push({
      ma, hd,""", """    const dnx = Number(r[C.duNo])||0;
    if(!ma && !hd && !dnx) continue; // HM-09b: giữ dòng có dư nợ dù thiếu mã/HĐ (trước đây bỏ im lặng ⇒ lệch Dashboard)
    rows.push({
      ma, hd: hd || (ma ? '' : '~' + String(r[C.ten]||'').trim()),""")
rep("""  document.getElementById('tdcmp-status').textContent = `Hôm nay: ${dmy(ymd(new Date()))} · ${today.length.toLocaleString('vi-VN')} dòng · Tổng dư nợ: ${fmtN(todayTotal)} đ`;
};""", """  document.getElementById('tdcmp-status').textContent = `Hôm nay: ${dmy(ymd(new Date()))} · ${today.length.toLocaleString('vi-VN')} dòng · Tổng dư nợ: ${fmtN(todayTotal)} đ`;
  TDCMP.renderRecon(todayTotal, !(TDCMP.state.cbtd||'').trim()); // HM-09b
};

/* HM-09b: đối chiếu tổng "hôm nay" của so sánh kỳ với TD.metrics (cùng nguồn Dashboard): app / tệp / chênh lệch */
TDCMP.renderRecon = function(appTotal, unfiltered){
  try{
    let el = document.getElementById('tdcmp-recon');
    const st = document.getElementById('tdcmp-status'); if(!st) return;
    if(!el){ el = document.createElement('div'); el.id = 'tdcmp-recon'; st.parentNode.insertBefore(el, st.nextSibling); }
    if(!unfiltered){ el.style.display = 'none'; return; }
    const D = (window.DATA && Array.isArray(window.DATA.qltd)) ? window.DATA.qltd : [];
    const file = TD.metrics.summarize(D.filter(r => r && (Number(r[11])||0) > 0)).totals.duno;
    const diff = Math.round(appTotal - file);
    el.style.cssText = 'display:block;margin:6px 0;padding:6px 10px;border-radius:6px;font:600 12px/1.4 system-ui;border:1px solid ' + (diff ? '#f59e0b' : '#86efac') + ';background:' + (diff ? '#fffbeb' : '#f0fdf4') + ';color:' + (diff ? '#78350f' : '#166534');
    el.textContent = (diff ? '⚠️ Lệch: ' : '✅ Khớp: ') + 'So sánh kỳ ' + fmtN(appTotal) + ' · Tệp/Dashboard ' + fmtN(file) + ' · chênh lệch ' + fmtN(diff) + ' đ';
  }catch(e){ console.warn('[HM-09b] recon', e); }
};""")

# ---- TD_AUDIT ----
rep("""    report.totalRows = qltd.length;
""", """    report.totalRows = qltd.length;

    // HM-09b: đối chiếu với TỆP (tính lại độc lập trong TD.doisoat) thay vì tự so với chính nó — mỗi chỉ tiêu: app / tệp / chênh lệch
    try{
      if (typeof window.tdDoiSoatCompute === 'function'){
        window.tdDoiSoatCompute().checks.forEach(function(c){
          var diff = (c.actual==null||c.expected==null) ? null : c.actual - c.expected;
          report.checks.push({ name:'[Đối soát '+c.id+'] '+c.name, app:c.actual, file:c.expected, diff:diff, ok: c.status!=='lech', skipped: c.status==='bo_qua' });
          if (c.status==='lech') report.issues.push({ code:'DOISOAT_'+c.id, msg:c.name+' — app '+c.actual+' / tệp '+c.expected+' / chênh '+diff });
        });
      }
    }catch(e){ report.issues.push({ code:'DOISOAT_ERR', msg:String(e && e.message || e) }); }
""")
rep("      [10,11].forEach(function(vCol){", "      [].forEach(function(vCol){ /* HM-09b: bỏ phép Σ nhóm = Σ tất cả (luôn khớp, không kiểm được gì) — đã thay bằng đối soát với tệp ở trên */")

# ---- TDUP5 ----
rep("""  TDUP5.scanInterestOverdue = function(){
    var found = [];""", """  /* HM-09b: nguồn dữ liệu (DATA.qltd + Past Due) — không phụ thuộc bảng đang mở/đang lọc; DOM chỉ là dự phòng khi chưa có dữ liệu */
  TDUP5.scanFromData = function(){
    var D = (window.DATA && Array.isArray(window.DATA.qltd)) ? window.DATA.qltd : null;
    if (!D || !D.length) return null;
    var pd = (window.TD_PASTDUE && window.TD_PASTDUE.map) || {};
    var key = function(r){ return String(r[0]||'').replace(/\\D/g,'') + '|' + String(r[2]||'').replace(/[^A-Za-z0-9]/g,'').toUpperCase(); };
    var seen = {}, found = [];
    D.forEach(function(r){
      if (!r) return;
      var k = key(r), p = pd[k]; if (!p || p.cleared || seen[k]) return;
      var duQH = +p.duNoQH || 0, laiQH = +p.laiQH || 0; if (!(duQH>0 || laiQH>0)) return;
      var nhom = window.TD.metrics.nhomRank(r[18]) || 1; if (nhom > 1) return; // nhóm ≥2 đã được tính quá hạn ở nơi khác
      seen[k] = 1;
      found.push({ tenKH:String(r[1]||''), soHD:String(r[2]||''), duNo:+r[11]||0, duNoQH:duQH, laiQH:laiQH,
                   ngayQH: p.ngayQH ? String(p.ngayQH) : '', nhom:nhom, row:null });
    });
    return found;
  };
  TDUP5.scanInterestOverdue = function(){
    var fd = TDUP5.scanFromData();
    if (fd){ TDUP5.overdue = fd; return fd; }
    var found = [];""")
open(dst, 'w', encoding='utf-8').write(s)
print('OK', len(s))
