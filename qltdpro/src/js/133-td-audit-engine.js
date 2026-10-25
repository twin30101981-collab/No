
/* === TD_AUDIT_ENGINE_v1 — GĐ-5 đề án HSV-Pro v13.9.6 (2026-06-20) ===
   Cross-check tổng hợp ↔ chi tiết. KHÔNG sửa số liệu, chỉ đối chiếu.
*/
(function(){
  if (window.TD_AUDIT) return; // idempotent

  function num(v){ v=Number(v); return isFinite(v)?v:0; }

  // Lấy data theo nhiều khả năng đặt tên — giữ defensive vì file gốc rất lớn.
  function getQltd(){
    try{
      if (window.DATA && Array.isArray(window.DATA.qltd)) return window.DATA.qltd;
      if (Array.isArray(window.qltd)) return window.qltd;
    }catch(e){}
    return null;
  }
  function getPdMap(){
    try{
      if (window._pdMap) return window._pdMap;
      if (window.DATA && window.DATA._pdMap) return window.DATA._pdMap;
    }catch(e){}
    return null;
  }

  // Index các cột (dò theo log đã biết: r[0]=CIF, r[1]=tên, r[7]=ngày đến hạn,
  // r[10]=lãi, r[11]=dư QH; field dư nợ gốc tổng đôi khi ở cột khác). Audit chỉ
  // tổng những cột numeric ổn định nhất; nếu cột không có sẽ trả 0.
  function sumCol(rows, idx){
    var s=0; if(!rows) return 0;
    for (var i=0;i<rows.length;i++){ s += num(rows[i] && rows[i][idx]); }
    return s;
  }

  function groupSum(rows, keyIdx, valIdx){
    var m={}; if(!rows) return m;
    for (var i=0;i<rows.length;i++){
      var r=rows[i]; if(!r) continue;
      var k = r[keyIdx]; if (k==null) k='(rỗng)';
      m[k] = (m[k]||0) + num(r[valIdx]);
    }
    return m;
  }

  function sumMap(m){ var s=0; for (var k in m){ if(Object.prototype.hasOwnProperty.call(m,k)) s+=m[k]; } return s; }

  function run(opts){
    opts = opts || {};
    var report = { ts: new Date().toISOString(), checks: [], issues: [] };
    var qltd = getQltd();
    if (!qltd){
      report.issues.push({ code:'NO_DATA', msg:'Không tìm thấy DATA.qltd — hãy mở 1 tab có dữ liệu rồi chạy lại.' });
      finish(report, opts); return report;
    }

    report.totalRows = qltd.length;

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

    // 1) Tổng giữ nguyên qua các group: tổng theo CBTD (giả định cột CBTD ở vị trí phổ biến: r[2] hoặc r[3])
    //    Ta thử nhiều cột rồi chọn cột có nhiều unique key nhất nhưng < 1000.
    function pickGroupCol(){
      var best=-1, bestScore=-1;
      for (var c=2;c<=5;c++){
        var s={}; for (var i=0;i<qltd.length;i++){ var k=qltd[i]&&qltd[i][c]; if(k!=null) s[k]=1; }
        var n=Object.keys(s).length;
        if (n>1 && n<500 && n>bestScore){ bestScore=n; best=c; }
      }
      return best;
    }
    var gCol = pickGroupCol();
    if (gCol>=0){
      // Cột dư nợ: thử r[11] (QH), r[10] (lãi). Audit chỉ check tính cộng dồn.
      [].forEach(function(vCol){ /* HM-09b: bỏ phép Σ nhóm = Σ tất cả (luôn khớp, không kiểm được gì) — đã thay bằng đối soát với tệp ở trên */
        var byG = groupSum(qltd, gCol, vCol);
        var totG = sumMap(byG);
        var totAll = sumCol(qltd, vCol);
        var diff = Math.abs(totG - totAll);
        report.checks.push({
          name:'Σ group(col '+gCol+') vs Σ all (col '+vCol+')',
          groupTotal: totG, allTotal: totAll, diff: diff,
          ok: diff < 1
        });
        if (diff >= 1) report.issues.push({ code:'GROUP_MISMATCH', vCol:vCol, gCol:gCol, diff:diff });
      });
    } else {
      report.issues.push({ code:'NO_GROUP_COL', msg:'Không xác định được cột nhóm hợp lệ.' });
    }

    // 2) Đối chiếu _pdMap (nguồn quá hạn IPCAS) với số dòng QH trong qltd.
    var pdMap = getPdMap();
    if (pdMap){
      var pdKeys = Object.keys(pdMap);
      var qhRowsCount = 0, qhCifSet = {};
      for (var i=0;i<qltd.length;i++){
        var r=qltd[i]; if(!r) continue;
        if (num(r[11])>0){ qhRowsCount++; if (r[0]) qhCifSet[r[0]]=1; }
      }
      var qhCifs = Object.keys(qhCifSet).length;
      report.checks.push({
        name:'_pdMap keys vs QH CIF unique trong qltd',
        pdMapKeys: pdKeys.length, qhUniqueCIF: qhCifs, qhRows: qhRowsCount
      });
      // pdMap key thường = CIF|HĐTD nên >= số CIF
      if (pdKeys.length < qhCifs){
        report.issues.push({ code:'PDMAP_SHORT', msg:'_pdMap ít hơn số CIF có QH trong qltd: ' + pdKeys.length + ' < ' + qhCifs });
      }
    } else {
      report.checks.push({ name:'_pdMap', skipped:true, reason:'không có _pdMap trong scope toàn cục (có thể module-scope).' });
    }

    finish(report, opts);
    return report;
  }

  function finish(report, opts){
    window.__TD_AUDIT_LAST = report;
    try{ console.group('[TD-AUDIT] '+report.ts); (0)&&console.log(report); console.groupEnd(); }catch(e){}
    if (opts.show !== false) showPanel(report);
  }

  function showPanel(report){
    var old = document.getElementById('td-audit-panel');
    if (old) old.remove();
    var bad = report.issues && report.issues.length>0;
    var el = document.createElement('div');
    el.id = 'td-audit-panel';
    el.style.cssText = [
      'position:fixed','top:40px','right:8px','z-index:calc(var(--z-8,100000) + 1)',
      'max-width:420px','max-height:60vh','overflow:auto',
      'font:12px/1.45 -apple-system,Segoe UI,Roboto,Arial,sans-serif',
      'background:'+(bad?'#fef2f2':'#f0fdf4'),
      'color:#0f172a','border:2px solid '+(bad?'#ef4444':'#10b981'),
      'border-radius:8px','padding:10px 12px',
      'box-shadow:0 4px 14px rgba(0,0,0,.18)'
    ].join(';');
    function esc(s){ return String(s).replace(/[&<>]/g, function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c];}); }
    var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'+
               '<b>TD_AUDIT '+(bad?'⚠ LỆCH':'✔ KHỚP')+'</b>'+
               '<button id="td-audit-close" style="border:0;background:transparent;font-size:16px;cursor:pointer">×</button></div>'+
               '<div style="color:#475569;margin-bottom:6px">'+esc(report.ts)+' · '+(report.totalRows||0)+' dòng qltd</div>';
    if (bad){
      html += '<div style="background:#fee2e2;padding:6px 8px;border-radius:4px;margin-bottom:6px"><b>'+report.issues.length+' vấn đề:</b><ul style="margin:4px 0 0 16px;padding:0">';
      report.issues.forEach(function(it){ html += '<li>'+esc(it.code)+': '+esc(it.msg || JSON.stringify(it))+'</li>'; });
      html += '</ul></div>';
    }
    html += '<details><summary style="cursor:pointer">Chi tiết checks ('+report.checks.length+')</summary><pre style="white-space:pre-wrap;font-size:11px;margin:6px 0 0">'+esc(JSON.stringify(report.checks,null,2))+'</pre></details>';
    el.innerHTML = html;
    document.body.appendChild(el);
    var btn = document.getElementById('td-audit-close');
    if (btn) btn.addEventListener('click', function(){ el.remove(); });
  }

  window.TD_AUDIT = { run: run, last: function(){ return window.__TD_AUDIT_LAST||null; } };
  try{ console.info('[TD-AUDIT] engine ready. Chạy: TD_AUDIT.run()'); }catch(e){}
})();
