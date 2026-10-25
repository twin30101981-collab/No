
(function(){
  if (new URLSearchParams(location.search).get('tdup5')==='off') return;
  var TDUP5 = window.TDUP5 = {version:'5.0', overdue:[], dataDate:null};

  // ---------- Helpers ----------
  function $$(sel,root){return Array.from((root||document).querySelectorAll(sel))}
  function parseVNDate(s){ return window.TD.date.find(s); } // HM-06: ngày hợp lệ đầu tiên trong văn bản (không còn cắt nhầm "2026-05-31" thành 26/05/2031)
  function parseNum(s){ return window.TD.num.toNumber(s, 0); } // HM-06
  function fmtVND(n){try{return n.toLocaleString('vi-VN')}catch(e){return String(n)}}

  // ---------- 1) Detect data date from page ----------
  TDUP5.detectDataDate = function(){
    // Find headings like "đến cuối tháng 05/2026" or "đến ngày 31/05/2026"
    var txt = document.body.innerText || '';
    var m = txt.match(/(?:đến\s+(?:cuối\s+)?(?:tháng|ngày)\s+)(\d{1,2})[\/\-](\d{1,4})(?:[\/\-](\d{2,4}))?/i);
    if (m){
      if (m[3]){ // dd/mm/yyyy
        return new Date(+m[3], +m[2]-1, +m[1]);
      } else { // mm/yyyy → cuối tháng
        var y=+m[2]; var mo=+m[1];
        return new Date(y, mo, 0); // last day of month
      }
    }
    return null;
  };

  // ---------- 2) Freshness banner ----------
  TDUP5.checkFreshness = function(){
    var dd = TDUP5.dataDate = TDUP5.detectDataDate();
    if (!dd) return;
    var today = new Date(); today.setHours(0,0,0,0);
    var diffDays = Math.floor((today - dd)/86400000);
    if (diffDays <= 7) return;
    if (document.getElementById('tdup5-fresh-banner')) return;
    var b = document.createElement('div');
    b.id='tdup5-fresh-banner';
    b.className = 'tdup5-banner ' + (diffDays>30?'alert':'warn');
    var sev = diffDays>30 ? '⛔' : '⚠️';
    b.innerHTML = sev + ' <b>Dữ liệu đã cũ '+diffDays+' ngày</b> &mdash; ngày chốt: <span class="tdup5-chip">'+
      dd.toLocaleDateString('vi-VN')+'</span> &middot; hôm nay: <span class="tdup5-chip">'+
      today.toLocaleDateString('vi-VN')+'</span>. Hãy nạp lại sao kê EOD gần nhất để Bảng VII/VIII phản ánh đúng.'+
      '<button id="tdup5-fresh-dismiss">Đóng</button>';
    document.body.insertBefore(b, document.body.firstChild);
    document.getElementById('tdup5-fresh-dismiss').onclick = function(){ b.remove(); };
  };

  // ---------- 3) Interest-overdue detector ----------
  // Scan all tables for rows where any of these columns > 0:
  //   "Dư nợ quá hạn", "Lãi QH", "Lãi quá hạn", "Ngày QH" (has date)
  // Even if "Nhóm nợ" = 1 and "Số ngày quá hạn (gốc)" = 0.
  TDUP5.COL_PATTERNS = {
    duNoQH:   /d[ưu]\s*n[ợo]\s*qu[áa]\s*h[ạa]n/i,
    laiQH:    /l[ãa]i\s*(qu[áa]\s*h[ạa]n|qh)/i,
    ngayQH:   /ng[àa]y\s*qh|ng[àa]y\s*qu[áa]\s*h[ạa]n/i,
    duNo:     /^d[ưu]\s*n[ợo]\s*$|d[ưu]\s*n[ợo]\s*g[ốo]c/i,
    tenKH:    /t[êe]n\s*kh|t[êe]n\s*kh[áa]ch/i,
    soHD:     /s[ốo]\s*h[ợđo][pđ]t[dđ]|s[ốo]\s*h[ợđ]\s*đ[ồo]ng|s[ốo]\s*hd/i,
    nhomNo:   /nh[óo]m\s*n[ợo]/i,
    ngayDH:   /ng[àa]y\s*đ[ếe]n\s*h[ạa]n|ng[àa]y\s*đáo\s*h[ạa]n/i
  };
  function mapHeaders(tbl){
    var heads = $$('thead th, tr:first-child th, tr:first-child td', tbl).slice(0,30);
    var map = {};
    heads.forEach(function(h,i){
      var t = (h.innerText||'').trim();
      Object.keys(TDUP5.COL_PATTERNS).forEach(function(k){
        if (map[k]==null && TDUP5.COL_PATTERNS[k].test(t)) map[k]=i;
      });
    });
    return map;
  }
  /* HM-09b: nguồn dữ liệu (DATA.qltd + Past Due) — không phụ thuộc bảng đang mở/đang lọc; DOM chỉ là dự phòng khi chưa có dữ liệu */
  TDUP5.scanFromData = function(){
    var D = (window.DATA && Array.isArray(window.DATA.qltd)) ? window.DATA.qltd : null;
    if (!D || !D.length) return null;
    var pd = (window.TD_PASTDUE && window.TD_PASTDUE.map) || {};
    var key = function(r){ return String(r[0]||'').replace(/\D/g,'') + '|' + String(r[2]||'').replace(/[^A-Za-z0-9]/g,'').toUpperCase(); };
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
    var found = [];
    $$('table').forEach(function(tbl){
      var map = mapHeaders(tbl);
      // need at least one of the QH columns to be meaningful
      if (map.duNoQH==null && map.laiQH==null && map.ngayQH==null) return;
      var rows = $$('tbody tr, tr', tbl);
      rows.forEach(function(tr){
        var cells = $$('td', tr); if (!cells.length) return;
        var duQH = map.duNoQH!=null ? parseNum(cells[map.duNoQH] && cells[map.duNoQH].innerText) : 0;
        var laiQH = map.laiQH!=null ? parseNum(cells[map.laiQH] && cells[map.laiQH].innerText) : 0;
        var nQH = map.ngayQH!=null ? parseVNDate(cells[map.ngayQH] && cells[map.ngayQH].innerText) : null;
        if (duQH>0 || laiQH>0 || nQH){
          // Skip if Nhóm nợ >= 2 (already counted as overdue elsewhere)
          var nhom = map.nhomNo!=null ? parseInt((cells[map.nhomNo].innerText||'').replace(/\D/g,''))||1 : 1;
          var rec = {
            tenKH: map.tenKH!=null ? (cells[map.tenKH].innerText||'').trim() : '',
            soHD:  map.soHD!=null ? (cells[map.soHD].innerText||'').trim() : '',
            duNo:  map.duNo!=null ? parseNum(cells[map.duNo].innerText) : 0,
            duNoQH: duQH, laiQH: laiQH,
            ngayQH: nQH ? nQH.toLocaleDateString('vi-VN') : '',
            nhom: nhom,
            row: tr
          };
          // Only flag as "missed" if nhóm còn 1 (gốc chưa quá hạn) nhưng có QH lãi
          if (nhom<=1 && (duQH>0 || laiQH>0 || nQH)) {
            tr.classList.add('tdup5-overdue-row');
            found.push(rec);
          }
        }
      });
    });
    TDUP5.overdue = found;
    return found;
  };

  TDUP5.renderOverduePanel = function(list){
    var p = document.getElementById('tdup5-overdue-panel');
    if (!list || !list.length){
      if (p) p.classList.remove('show');
      return;
    }
    if (!p){
      p = document.createElement('div'); p.id='tdup5-overdue-panel';
      document.body.appendChild(p);
    }
    {
      var html = '<span class="close" onclick="this.parentNode.classList.remove(\'show\')">×</span>'+
                 '<h4>⚠️ Phát hiện '+list.length+' khoản quá hạn lãi (Nhóm 1, gốc chưa đến hạn)</h4>'+
                 '<table><thead><tr><th>Tên KH</th><th>Số HĐ</th><th>Dư nợ QH</th><th>Lãi QH</th><th>Ngày QH</th></tr></thead><tbody>';
      list.forEach(function(r){
        html += '<tr><td>'+r.tenKH+'</td><td>'+r.soHD+'</td><td>'+fmtVND(r.duNoQH)+'</td><td>'+fmtVND(r.laiQH)+'</td><td>'+r.ngayQH+'</td></tr>';
      });
      html += '</tbody></table><div style="margin-top:8px;font-size:11px;color:#666">Các dòng trên đã được tô đỏ trong bảng gốc. Đây là khoản bị Bảng VII bỏ sót vì logic cũ chỉ lọc theo Nhóm nợ / Số ngày quá hạn gốc.</div>';
      p.innerHTML = html; /* v13.9.2 FIX: trước đây thiếu dòng này → panel hiển thị rỗng (ô đỏ trống) */
    }
    /* v13.9.2: KHÔNG auto-show. Người dùng tự bấm "Xem chi tiết" trên banner. */
  };



  // QA-FEATURE: badge co dinh, khong tu an, de mo lai panel sau khi banner 5s bien mat
  TDUP5.updateBadge = function(list){
    var b = document.getElementById('tdup5-badge');
    if (!list || !list.length){ if (b) b.style.display = 'none'; return; }
    if (!b){
      b = document.createElement('div');
      b.id = 'tdup5-badge';
      b.onclick = function(){ var p = document.getElementById('tdup5-overdue-panel'); if (p) p.classList.add('show'); };
    }
    // FIX GỐC RỄ v22.1: badge này trước đây là position:fixed (góc dưới-trái,
    // z-index 9997) nên LUÔN nổi đè lên bảng/tab nhóm nợ. Nay đưa vào dòng
    // chảy layout của .topbar-right (như badge Backup) — không còn nổi đè.
    var host = document.querySelector('.topbar-right') || document.querySelector('.topbar');
    if (host){
      b.style.cssText = 'display:inline-flex;align-items:center;position:static;background:#dc2626;color:#fff;padding:4px 10px;border-radius:14px;font:600 11px system-ui,sans-serif;cursor:pointer;white-space:nowrap;margin:2px 0';
      if (b.parentElement !== host) host.appendChild(b);
    } else {
      b.style.cssText = 'position:fixed;right:8px;top:8px;z-index:calc(var(--z-1,100) + 11);background:#dc2626;color:#fff;padding:4px 10px;border-radius:14px;font:600 11px system-ui,sans-serif;cursor:pointer';
      if (b.parentElement !== document.body) document.body.appendChild(b);
    }
    b.textContent = '⚠️ ' + list.length + ' khoản lãi QH bị Bảng VII bỏ sót';
    b.style.display = 'block';
  };

  TDUP5.runOverdueScan = function(){
    var list = TDUP5.scanInterestOverdue();
    TDUP5.renderOverduePanel(list);
    TDUP5.updateBadge(list);
    // Auto-banner if hidden overdue found
    if (list.length && !document.getElementById('tdup5-overdue-banner')){
      var b = document.createElement('div');
      b.id='tdup5-overdue-banner';
      b.className='tdup5-banner alert';
      b.innerHTML = '⛔ <b>Bảng VII bỏ sót '+list.length+' khoản quá hạn lãi</b> '+
                    '(gốc chưa đến hạn nhưng đã phát sinh lãi QH theo TT11/TT31). '+
                    '<button id="tdup5-overdue-view">Xem chi tiết</button>';
      var fresh = document.getElementById('tdup5-fresh-banner');
      if (fresh) fresh.after(b); else document.body.insertBefore(b, document.body.firstChild);
      document.getElementById('tdup5-overdue-view').onclick = function(){
        document.getElementById('tdup5-overdue-panel').classList.add('show');
      };
      /* v13.9.7 FIX: tự ẩn banner sau 5 giây */
      setTimeout(function(){
        b.style.transition='opacity .35s ease';
        b.style.opacity='0';
        setTimeout(function(){ if(b && b.parentNode) b.parentNode.removeChild(b); }, 400);
      }, 5000);
    }
  };

  // ---------- 4) Export CSV of hidden overdue ----------
  TDUP5.exportOverdueCsv = function(){
    var rows = TDUP5.overdue;
    if (!rows.length){ alert('Không có khoản quá hạn lãi ẩn để xuất.'); return; }
    var head = ['Tên KH','Số HĐ','Dư nợ','Dư nợ QH','Lãi QH','Ngày QH','Nhóm'];
    var csv = '\uFEFF'+head.join(',')+'\n' + rows.map(function(r){
      return [r.tenKH,r.soHD,r.duNo,r.duNoQH,r.laiQH,r.ngayQH,r.nhom]
        .map(function(v){v=String(v==null?'':v); return /[,"\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}).join(',');
    }).join('\n');
    var blob = new Blob([csv],{type:'text/csv;charset=utf-8'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'qua-han-lai-an_'+new Date().toISOString().slice(0,10)+'.csv';
    a.click();
  };

  // ---------- 5) Register palette commands if Pack v3/v4 palette exists ----------
  function registerCmds(){
    var addCmd = (window.TDUP3 && TDUP3.addCmd) || (window.TDUP4 && TDUP4.addCmd);
    if (!addCmd) return;
    try{
      addCmd({id:'tdup5.scan',  title:'Quét quá hạn lãi ẩn (Bảng VII)', run:TDUP5.runOverdueScan});
      addCmd({id:'tdup5.export',title:'Xuất CSV quá hạn lãi ẩn',        run:TDUP5.exportOverdueCsv});
      addCmd({id:'tdup5.fresh', title:'Kiểm tra độ tươi dữ liệu',       run:TDUP5.checkFreshness});
    }catch(e){}
  }

  // ---------- 6) Boot ----------
  /* v13.9.7 FIX: KHÔNG chạy runOverdueScan tự động lúc boot và KHÔNG re-run qua MutationObserver.
     Chỉ chạy 1 lần sau khi import IPCAS thành công (sự kiện 'td:ipcas-imported'),
     và banner auto-ẩn sau 5 giây (xử lý trong runOverdueScan). */
  function boot(){
    try { TDUP5.checkFreshness(); } catch(e){ console.warn('[TDUP5] fresh',e); }
    registerCmds();
    window.addEventListener('td:ipcas-imported', function(){
      try { TDUP5.runOverdueScan(); } catch(e){ console.warn('[TDUP5] scan',e); }
    });
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
  else setTimeout(boot, 500);

  (0)&&console.log('%cTD Upgrade Pack v5 ready','color:#dc2626;font-weight:bold');
})();
