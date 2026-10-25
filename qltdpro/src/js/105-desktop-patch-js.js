
/* === DESKTOP PATCH JS START === */
(function() {
  'use strict';

  var LS_DM     = 'qltd_desktop_mode';
  var LS_DENS   = 'qltd_dp_density';
  var LS_PGSZ   = 'qltd_dp_pagesize';
  var UNDO_MAX  = 50;
  var IS_DESKTOP = !!(window.matchMedia && window.matchMedia('(min-width:1024px) and (pointer:fine)').matches);

  var dpEnabled  = IS_DESKTOP && (localStorage.getItem(LS_DM) !== 'off');
  var dpDensity  = localStorage.getItem(LS_DENS) || 'normal';
  var _undoStack = [];
  var _redoStack = [];
  var _autoSaveTimer = null;
  var _siTimer   = null;
  var _ctxRow    = null;
  var _lastSel   = null;
  var _selRows   = new Set();
  var _cmdOpen   = false;
  var _ctxOpen   = false;
  var _paging    = {};
  var _patchedTables = new WeakSet();
  var _patchedRows   = new WeakSet();
  var _cmdList   = null;

  /* ─── helpers ─────────────────────────────────────────────────── */
  function esc(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function si(msg,cls,ms){
    var el=document.getElementById('dp-save-indicator'); if(!el) return;
    clearTimeout(_siTimer);
    el.textContent=msg;
    el.className='dp-si-visible '+(cls||'');
    if(ms){ _siTimer=setTimeout(function(){ el.classList.remove('dp-si-visible'); },ms); }
  }

  /* ─── init ─────────────────────────────────────────────────────── */
  function init(){
    buildToggle();
    buildFAB();
    buildSaveIndicator();
    buildDensityBar();
    buildCmdPalette();
    buildCtxMenu();
    buildBulkBar();
    buildUndoBar();
    buildHelpModal();
    buildDropOverlay();
    buildMinimap();

    if(dpEnabled) activateDesktop();
    bindGlobalKeys();
    bindScroll();
    bindDragDrop();
    scanTables();

    TD.onShowPage(function(){ setTimeout(function(){ scanTables(true); },200); }); // HM-13b
    setInterval(function(){ if(dpEnabled && !document.hidden) scanTables(); }, 2500); // P06: không quét khi tab bị ẩn (tiết kiệm CPU nền)
  }

  /* ─── desktop toggle ───────────────────────────────────────────── */
  function buildToggle(){
    // v13.9.10 guard: tránh tạo trùng nút nếu hàm chạy 2 lần
    if (document.getElementById('dp-toggle-btn')) { setToggleLabel(); return; }
    var b=document.createElement('button');
    b.id='dp-toggle-btn';
    b.title='Bật/tắt Chế độ Desktop';
    b.onclick=toggleDM;
    setToggleLabel(b);
    // v13.9.8 FIX: gắn vào taskbar trên cùng, không float che nội dung
    var host=document.querySelector('.topbar-right')||document.querySelector('.topbar');
    // Fallback: nếu topbar bị ẩn → quay lại floating ở góc dưới
    if (!host) host = document.body;
    host.appendChild(b);
  }
  function setToggleLabel(b){
    b=b||document.getElementById('dp-toggle-btn');
    if(!b) return;
    b.textContent=dpEnabled?'🖥️ Desktop ON':'🖥️ Desktop OFF';
    b.style.opacity=dpEnabled?'1':'0.55';
  }
  function toggleDM(){
    dpEnabled=!dpEnabled;
    localStorage.setItem(LS_DM,dpEnabled?'on':'off');
    dpEnabled ? activateDesktop() : deactivateDesktop();
    setToggleLabel();
    si(dpEnabled?'🖥️ Desktop Mode: BẬT':'🖥️ Desktop Mode: TẮT','dp-si-saving',2200);
  }
  function activateDesktop(){
    document.body.classList.add('desktop-mode');
    setDensity(localStorage.getItem(LS_DENS)||'normal',true);
    scanTables();
    patchScrolls();
  }
  function deactivateDesktop(){
    document.body.classList.remove('desktop-mode');
    ['compact','normal','comfortable'].forEach(function(d){ document.body.classList.remove('dp-density-'+d); });
    document.querySelectorAll('tbody tr[tabindex]').forEach(function(r){ r.removeAttribute('tabindex'); });
  }

  /* ─── density ──────────────────────────────────────────────────── */
  function buildDensityBar(){
    var bar=document.createElement('div'); bar.id='dp-density-bar';
    [['compact','⊟'],['normal','⊡'],['comfortable','⊞']].forEach(function(d){
      var b=document.createElement('button');
      b.className='dp-dens-btn'+(d[0]===dpDensity?' dp-active':'');
      b.dataset.d=d[0]; b.textContent=d[1]+' '+d[0].charAt(0).toUpperCase()+d[0].slice(1);
      b.title='Mật độ bảng: '+d[0];
      b.onclick=function(){ setDensity(d[0]); };
      bar.appendChild(b);
    });
    var h=document.querySelector('.topbar-right')||document.querySelector('.topbar')||document.body;
    h.appendChild(bar);
  }
  function setDensity(d,silent){
    dpDensity=d;
    ['compact','normal','comfortable'].forEach(function(x){ document.body.classList.remove('dp-density-'+x); });
    document.body.classList.add('dp-density-'+d);
    document.querySelectorAll('#dp-density-bar .dp-dens-btn').forEach(function(b){ b.classList.toggle('dp-active',b.dataset.d===d); });
    if(!silent) localStorage.setItem(LS_DENS,d);
  }

  /* ─── back to top ──────────────────────────────────────────────── */
  function buildFAB(){
    var b=document.createElement('button');
    b.id='dp-back-top'; b.title='Về đầu trang'; b.innerHTML='▲';
    b.onclick=function(){ window.scrollTo({top:0,behavior:'smooth'}); };
    document.body.appendChild(b);
  }
  function bindScroll(){
    window.addEventListener('scroll',function(){
      var f=document.getElementById('dp-back-top');
      if(f) f.classList.toggle('visible',window.scrollY>400);
      updateMinimap();
    },{passive:true});
  }

  /* ─── scroll fix ───────────────────────────────────────────────── */
  function patchScrolls(){
    var sels=['.table-scroll-wrap','.tbl-scroll','.hsv-list-body','.hsv-col-form','.hsv-col-preview'];
    sels.forEach(function(s){
      try{ document.querySelectorAll(s).forEach(function(el){ el.style.overscrollBehavior='contain'; }); }catch(e){}
    });
  }

  /* ─── table scan & patch ───────────────────────────────────────── */
  function scanTables(force){
    if(!dpEnabled) return;
    if(force !== true && !window.__tdDirty) return; // HM-18: chỉ quét khi DOM đã đổi (cờ do MutationObserver đặt) hoặc vừa đổi trang
    window.__tdDirty = 0;
    patchScrolls();
    document.querySelectorAll('.desktop-mode table').forEach(function(tbl){
      if(tbl.closest('.page:not(.active)')) return; // HM-18: bảng của trang ẩn quét khi vào trang
      var tbody=tbl.querySelector('tbody'); if(!tbody) return;
      // Add tabindex to rows
      tbody.querySelectorAll('tr').forEach(function(tr){
        if(!_patchedRows.has(tr)){
          _patchedRows.add(tr);
          tr.setAttribute('tabindex','0');
          tr.addEventListener('contextmenu',function(e){ showCtx(e,tr); });
          tr.addEventListener('keydown',function(e){ rowKey(e,tr); });
          tr.addEventListener('click',function(e){ rowClick(e,tr); });
        }
      });
      // Resize handles
      if(!_patchedTables.has(tbl)){
        _patchedTables.add(tbl);
        tbl.querySelectorAll('thead th').forEach(function(th){
          var h=document.createElement('div'); h.className='dp-col-resize';
          h.addEventListener('mousedown',function(e){ colResizeStart(e,th); });
          th.appendChild(h);
        });
        // Auto-paginate large tables (>80 visible rows)
        if(tbody.querySelectorAll('tr').length>80 && !/^table-(qltd|kd|td|denhan|laidong)$/.test(tbl.id||'')) setupPagination(tbl); // HM-17b: 5 bảng dữ liệu đã có phân trang theo trang trong renderTable
      }
    });
  }

  /* ─── row keyboard nav ─────────────────────────────────────────── */
  function rowKey(e,tr){
    var rows=Array.from(tr.closest('tbody').querySelectorAll('tr'));
    var i=rows.indexOf(tr);
    if(e.key==='ArrowDown'){ e.preventDefault(); focusRow(rows[Math.min(i+1,rows.length-1)]); }
    else if(e.key==='ArrowUp'){ e.preventDefault(); focusRow(rows[Math.max(i-1,0)]); }
    else if(e.key==='PageDown'){ e.preventDefault(); focusRow(rows[Math.min(i+10,rows.length-1)]); }
    else if(e.key==='PageUp'){ e.preventDefault(); focusRow(rows[Math.max(i-10,0)]); }
    else if(e.key==='Home'){ e.preventDefault(); focusRow(rows[0]); }
    else if(e.key==='End'){ e.preventDefault(); focusRow(rows[rows.length-1]); }
    else if(e.key==='Enter'){ e.preventDefault(); tr.click(); }
    else if(e.key==='Delete'){
      e.preventDefault();
      var db=tr.querySelector('[onclick*="delete"],[onclick*="Delete"],[onclick*="xoa"],[onclick*="Xoa"]');
      if(db && confirm('Xóa dòng này?')) db.click();
    }
  }
  function focusRow(row){
    if(!row) return;
    document.querySelectorAll('tbody tr.dp-row-focus').forEach(function(r){ r.classList.remove('dp-row-focus'); });
    row.classList.add('dp-row-focus');
    row.focus();
    row.scrollIntoView({block:'nearest',behavior:'smooth'});
  }

  /* ─── bulk select ──────────────────────────────────────────────── */
  function rowClick(e,tr){
    if(!e.ctrlKey && !e.shiftKey){
      if(!e.target.closest('button,a,input,select,textarea')){
        _selRows.forEach(function(r){ r.classList.remove('dp-row-selected'); });
        _selRows.clear(); updateBulkBar();
      }
      return;
    }
    e.preventDefault();
    if(e.ctrlKey){
      if(_selRows.has(tr)){ _selRows.delete(tr); tr.classList.remove('dp-row-selected'); }
      else{ _selRows.add(tr); tr.classList.add('dp-row-selected'); }
    } else if(e.shiftKey && _lastSel){
      var tbody=tr.closest('tbody'); if(!tbody) return;
      var rows=Array.from(tbody.querySelectorAll('tr'));
      var a=rows.indexOf(_lastSel), b=rows.indexOf(tr);
      if(a>b){var tmp=a;a=b;b=tmp;}
      for(var i=a;i<=b;i++){ _selRows.add(rows[i]); rows[i].classList.add('dp-row-selected'); }
    }
    _lastSel=tr; updateBulkBar();
  }

  /* ─── bulk bar ─────────────────────────────────────────────────── */
  function buildBulkBar(){
    var bar=document.createElement('div'); bar.id='dp-bulk-bar';
    bar.innerHTML='<span id="dp-bulk-count"></span>';
    function mk(txt,cls,fn){ var b=document.createElement('button'); b.className='dp-bulk-btn'+(cls?' '+cls:''); b.textContent=txt; b.onclick=fn; bar.appendChild(b); }
    mk('📋 Sao chép mã','',bulkCopy);
    mk('📊 Xuất CSV','',bulkExport);
    mk('✕ Bỏ chọn','',bulkClear);
    document.body.appendChild(bar);
  }
  function updateBulkBar(){
    var bar=document.getElementById('dp-bulk-bar');
    var cnt=document.getElementById('dp-bulk-count');
    if(!bar||!cnt) return;
    var n=_selRows.size;
    bar.classList.toggle('dp-visible',n>0);
    cnt.textContent='Đã chọn '+n+' dòng';
  }
  function bulkClear(){ _selRows.forEach(function(r){ r.classList.remove('dp-row-selected'); }); _selRows.clear(); updateBulkBar(); }
  function bulkCopy(){
    var vals=[]; _selRows.forEach(function(r){ var td=r.querySelector('td'); if(td) vals.push(td.textContent.trim()); });
    if(vals.length){ try{ navigator.clipboard.writeText(vals.join('\n')); }catch(ex){} si('📋 Đã sao chép '+vals.length+' mã','dp-si-saved',1500); }
  }
  function bulkExport(){
    var rows=Array.from(_selRows); if(!rows.length) return;
    var tbl=rows[0].closest('table'); if(!tbl) return;
    var hdr=Array.from(tbl.querySelectorAll('thead th')).map(function(th){ return '"'+th.textContent.replace(/"/g,'""').trim()+'"'; });
    var csv=[hdr.join(',')];
    rows.forEach(function(r){ csv.push(Array.from(r.querySelectorAll('td')).map(function(td){ return '"'+td.textContent.replace(/"/g,'""').trim()+'"'; }).join(',')); });
    var blob=new Blob(['\uFEFF'+csv.join('\r\n')],{type:'text/csv;charset=utf-8;'});
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a'); a.href=url; a.download='xuat_'+rows.length+'_dong.csv'; a.click(); URL.revokeObjectURL(url);
    si('📊 Xuất '+rows.length+' dòng thành công','dp-si-saved',2000); bulkClear();
  }

  /* ─── right-click context menu ─────────────────────────────────── */
  function buildCtxMenu(){
    var m=document.createElement('div'); m.id='dp-ctx-menu';
    document.body.appendChild(m);
    document.addEventListener('click',function(e){ if(!e.target.closest('#dp-ctx-menu')) hideCtx(); });
    document.addEventListener('scroll',hideCtx,{passive:true});
  }
  function showCtx(e,tr){
    e.preventDefault(); hideCtx(); _ctxRow=tr;
    var m=document.getElementById('dp-ctx-menu'); if(!m) return;
    var firstTd=tr.querySelector('td');
    var lbl=firstTd?firstTd.textContent.trim().substring(0,28):'';
    var items=[
      {ico:'👁️',txt:'Xem chi tiết',fn:function(){ var b=tr.querySelector('[onclick*="load"],[onclick*="open"],[onclick*="view"],[onclick*="detail"]'); if(b) b.click(); else{ var a=tr.querySelector('a'); if(a) a.click(); } }},
      {ico:'✏️',txt:'Sửa dòng',fn:function(){ var b=tr.querySelector('[onclick*="edit"],[onclick*="Edit"]'); if(b) b.click(); }},
      {ico:'📋',txt:'Sao chép: '+lbl,fn:function(){ try{ navigator.clipboard.writeText(lbl); }catch(ex){} si('📋 Đã sao chép: '+lbl,'dp-si-saved',1500); }},
      {sep:1},
      {ico:'📌',txt:'Thêm vào lựa chọn',fn:function(){ _selRows.add(tr); tr.classList.add('dp-row-selected'); updateBulkBar(); }},
      {sep:1},
      {ico:'🗑️',txt:'Xóa dòng',cls:'dp-ctx-danger',fn:function(){ var b=tr.querySelector('[onclick*="delete"],[onclick*="Delete"],[onclick*="Xoa"],[onclick*="xoa"]'); if(b){ if(confirm('Xác nhận xóa?')) b.click(); } else alert('Không tìm thấy nút xóa.'); }}
    ];
    m.innerHTML='';
    items.forEach(function(it){
      if(it.sep){ var s=document.createElement('div'); s.className='dp-ctx-sep'; m.appendChild(s); return; }
      var d=document.createElement('div'); d.className='dp-ctx-item'+(it.cls?' '+it.cls:'');
      d.innerHTML='<span class="dp-ctx-ico">'+it.ico+'</span>'+esc(it.txt);
      d.onclick=function(){ hideCtx(); it.fn(); };
      m.appendChild(d);
    });
    var x=Math.min(e.clientX,window.innerWidth-215), y=Math.min(e.clientY,window.innerHeight-250);
    m.style.cssText='display:block;left:'+x+'px;top:'+y+'px';
    _ctxOpen=true;
    requestAnimationFrame(function(){ var h=m.offsetHeight; if(e.clientY+h>window.innerHeight-10) m.style.top=Math.max(10,e.clientY-h)+'px'; });
  }
  function hideCtx(){ var m=document.getElementById('dp-ctx-menu'); if(m) m.style.display='none'; _ctxOpen=false; }

  /* ─── command palette ──────────────────────────────────────────── */
  function buildCmdPalette(){
    var ov=document.createElement('div'); ov.id='dp-cmd-overlay';
    ov.innerHTML='<div id="dp-cmd-box"><div id="dp-cmd-input-wrap"><span class="dp-cmd-icon">⌘</span><input id="dp-cmd-input" placeholder="Tìm lệnh, menu, hồ sơ…" autocomplete="off" spellcheck="false"><span class="dp-cmd-hint">Esc đóng · ↑↓ chọn · Enter thực thi</span></div><div id="dp-cmd-results"></div></div>';
    ov.addEventListener('click',function(e){ if(e.target===ov) closeCmd(); });
    document.body.appendChild(ov);
    var inp=document.getElementById('dp-cmd-input');
    if(inp){
      inp.addEventListener('input',function(){ renderCmd(inp.value.trim()); });
      inp.addEventListener('keydown',cmdKey);
    }
  }
  function buildCmdList(){
    var cmds=[];
    // Menu navigation
    document.querySelectorAll('[data-page]').forEach(function(el){
      var txt=el.textContent.replace(/[▸▾►▼⟨⟩]/g,'').trim().replace(/\s+/g,' ');
      if(txt.length<2) return;
      var pg=el.dataset.page;
      (function(capturedEl, capturedPg){ cmds.push({ico:'📄',lbl:'Mở: '+txt,grp:'Điều hướng',fn:function(){ if(typeof window.showPage==='function') window.showPage(capturedPg,capturedEl); else capturedEl.click(); }}); })(el, pg);
    });
    var acts=[
      {ico:'💾',lbl:'Lưu dữ liệu',grp:'Hành động',sc:'Ctrl+S',fn:dpSave},
      {ico:'🆕',lbl:'Tạo hồ sơ mới',grp:'Hành động',sc:'Ctrl+N',fn:function(){ var b=document.querySelector('[onclick*="hosoNew"],[onclick*="hsvNew"]'); if(b) b.click(); }},
      {ico:'🔍',lbl:'Mở tìm kiếm KH',grp:'Hành động',sc:'Ctrl+F',fn:function(){ var inp=document.querySelector('#fhs-inline-input,#search-inline,input[placeholder*="Tìm"]'); if(inp){ inp.focus(); inp.select(); } }},
      {ico:'🖨️',lbl:'In / Xuất PDF',grp:'Hành động',sc:'Ctrl+P',fn:function(){ window.print(); }},
      {ico:'📊',lbl:'In bảng A4',grp:'Hành động',sc:'Ctrl+Shift+T',fn:function(){ if(typeof window.printTablesA4==='function') window.printTablesA4(); }},
      {ico:'⊟',lbl:'Mật độ: Compact',grp:'Hiển thị',fn:function(){ setDensity('compact'); }},
      {ico:'⊡',lbl:'Mật độ: Normal',grp:'Hiển thị',fn:function(){ setDensity('normal'); }},
      {ico:'⊞',lbl:'Mật độ: Comfortable',grp:'Hiển thị',fn:function(){ setDensity('comfortable'); }},
      {ico:'🖥️',lbl:'Tắt Desktop Mode',grp:'Cài đặt',fn:toggleDM},
      {ico:'⬆',lbl:'Về đầu trang',grp:'Điều hướng',fn:function(){ window.scrollTo({top:0,behavior:'smooth'}); }},
      {ico:'❓',lbl:'Bảng phím tắt',grp:'Trợ giúp',sc:'F1',fn:openHelp},
    ];
    cmds=cmds.concat(acts);
    // QA-FEATURE: tim kiem toan cuc theo ten/ma KH - nhay dung trang + dien vao o tim kiem
    try {
      var qseen2 = Object.create(null);
      var qrows2 = (window.DATA && DATA.qltd) ? DATA.qltd : [];
      var pageByLoai2 = function (loai) {
        var s = (loai || '').toLowerCase();
        if (s.indexOf('trung') >= 0 || s.indexOf('dài') >= 0) return 'td';
        return 'kd';
      };
      for (var qi2 = 0; qi2 < qrows2.length; qi2++) {
        var qr2 = qrows2[qi2];
        var qma2 = String(qr2[0] || '').trim();
        if (!qma2 || qseen2[qma2]) continue;
        qseen2[qma2] = 1;
        (function (ma, ten, loai) {
          cmds.push({ ico:'👤', lbl: ten + ' — ' + ma, grp:'Khách hàng', fn:function () {
            if (typeof window.tdKh360Open === 'function') { window.tdKh360Open(ma, ten); return; } // HM-26
            var target = pageByLoai2(loai);
            if (typeof window.showPage === 'function') window.showPage(target);
            setTimeout(function () {
              var inp = document.getElementById('search-' + target);
              if (inp) { inp.value = ten; inp.dispatchEvent(new Event('input')); inp.scrollIntoView({block:'center'}); }
            }, 150);
          }});
        })(qma2, String(qr2[1] || qma2), qr2[13]);
      }
    } catch (eKH2) { console.warn('[dp-cmd KH]', eKH2); }
    return cmds;
  }
  function openCmd(){
    var ov=document.getElementById('dp-cmd-overlay');
    var inp=document.getElementById('dp-cmd-input');
    if(!ov||!inp) return;
    _cmdList=buildCmdList();
    ov.classList.add('open'); inp.value=''; renderCmd('');
    setTimeout(function(){ inp.focus(); },80);
    _cmdOpen=true;
  }
  function closeCmd(){ var ov=document.getElementById('dp-cmd-overlay'); if(ov) ov.classList.remove('open'); _cmdOpen=false; }
  function renderCmd(q){
    var res=document.getElementById('dp-cmd-results'); if(!res||!_cmdList) return;
    var list=_cmdList;
    if(q){
      var qn=q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
      list=list.filter(function(c){
        var ln=(c.lbl||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
        return ln.includes(qn)||(c.sc||'').toLowerCase().includes(qn);
      });
    }
    if(!list.length){ res.innerHTML='<div class="dp-cmd-no-result">Không có kết quả cho "'+esc(q)+'"</div>'; return; }
    var grps={};
    list.forEach(function(c){ var g=c.grp||'Khác'; if(!grps[g]) grps[g]=[]; if(grps[g].length<8) grps[g].push(c); });
    var flat=[], html='';
    Object.keys(grps).forEach(function(g){
      html+='<div class="dp-cmd-group">'+esc(g)+'</div>';
      grps[g].forEach(function(c){
        html+='<div class="dp-cmd-item"><span class="dp-cmd-ico">'+esc(c.ico||'○')+'</span><span class="dp-cmd-label">'+esc(c.lbl)+'</span>'+(c.sc?'<span class="dp-cmd-badge">'+esc(c.sc)+'</span>':'')+'</div>';
        flat.push(c);
      });
    });
    res.innerHTML=html;
    res.querySelectorAll('.dp-cmd-item').forEach(function(item,i){
      item.addEventListener('click',function(){ closeCmd(); if(flat[i]&&flat[i].fn) flat[i].fn(); });
    });
  }
  function cmdKey(e){
    var res=document.getElementById('dp-cmd-results'); if(!res) return;
    var items=res.querySelectorAll('.dp-cmd-item');
    var act=res.querySelector('.dp-cmd-item.dp-active');
    var idx=act?Array.from(items).indexOf(act):-1;
    if(e.key==='ArrowDown'){ e.preventDefault(); var n=Math.min(idx+1,items.length-1); items.forEach(function(x){ x.classList.remove('dp-active'); }); if(items[n]){ items[n].classList.add('dp-active'); items[n].scrollIntoView({block:'nearest'}); } }
    else if(e.key==='ArrowUp'){ e.preventDefault(); var p=Math.max(idx-1,0); items.forEach(function(x){ x.classList.remove('dp-active'); }); if(items[p]){ items[p].classList.add('dp-active'); items[p].scrollIntoView({block:'nearest'}); } }
    else if(e.key==='Enter'){ e.preventDefault(); var a=res.querySelector('.dp-cmd-item.dp-active')||items[0]; if(a) a.click(); }
    else if(e.key==='Escape'){ closeCmd(); }
  }

  /* ─── global keyboard ──────────────────────────────────────────── */
  function bindGlobalKeys(){
    document.addEventListener('keydown',function(e){
      var tag=document.activeElement?document.activeElement.tagName:'';
      var inInp=/INPUT|TEXTAREA|SELECT/.test(tag);

      if(e.key==='Escape'){
        if(_cmdOpen){ closeCmd(); e.preventDefault(); return; }
        if(_ctxOpen){ hideCtx(); e.preventDefault(); return; }
        var hm=document.getElementById('dp-help-modal');
        if(hm && hm.classList.contains('dp-open')){ hm.classList.remove('dp-open'); e.preventDefault(); return; }
        var om=document.querySelector('.modal-overlay.open');
        if(om){ var cb=om.querySelector('.modal-close,[onclick*="closeModal"]'); if(cb) cb.click(); e.preventDefault(); return; }
        return;
      }

      if(e.key==='F1'){ e.preventDefault(); openHelp(); return; }
      if(e.key==='?'&&!inInp){ e.preventDefault(); openHelp(); return; }

      if(e.ctrlKey||e.metaKey){
        switch(e.key.toLowerCase()){
          // HM-13b: Ctrl+S / Ctrl+K do TD.keys (HM-15) xử lý — đã gỡ
          case 'n': if(!inInp){ e.preventDefault(); var nb=document.querySelector('[onclick*="hosoNew"],[onclick*="hsvNew"]'); if(nb) nb.click(); else openCmd(); } break;
          case 'p': if(!inInp){ e.preventDefault(); window.print(); } break;
          case 'z': if(!inInp){ e.preventDefault(); e.shiftKey?dpRedo():dpUndo(); } break;
          case 'y': if(!inInp){ e.preventDefault(); dpRedo(); } break;
        }
      }

      if(e.altKey&&!e.ctrlKey&&!inInp){
        var n=parseInt(e.key);
        if(n>=1&&n<=9){
          e.preventDefault();
          var navs=document.querySelectorAll('#sidebar .nav-item-parent,[id^="nav-"] [data-page]');
          var navArr=Array.from(navs).filter(function(el,i,arr){ return arr.indexOf(el)===i; });
          if(navArr[n-1]) navArr[n-1].click();
        }
      }
    });
  }

  /* ─── save ─────────────────────────────────────────────────────── */
  function dpSave(){
    si('⟳ Đang lưu…','dp-si-saving',0);
    try{
      if(typeof window.hosoSaveCurrent==='function') window.hosoSaveCurrent();
      var ltEl=document.querySelector('.lt-tab.active');
      if(typeof window.hsvSaveCurrent==='function'){ window.hsvSaveCurrent(ltEl?ltEl.dataset.lt:null); }
      if(typeof window.saveData==='function') window.saveData(true);
      setTimeout(function(){ si('✓ Đã lưu lúc '+new Date().toLocaleTimeString('vi-VN'),'dp-si-saved',2500); },350);
    } catch(ex){ si('⚠ Lỗi: '+ex.message,'dp-si-unsaved',3000); }
  }

  /* ─── save indicator ───────────────────────────────────────────── */
  function buildSaveIndicator(){
    var el=document.createElement('div'); el.id='dp-save-indicator';
    document.body.appendChild(el);
  }

  // Track form input for auto-save
  document.addEventListener('input',function(e){
    if(!dpEnabled) return;
    if(e.target.closest('#dp-cmd-overlay,#dp-help-modal,#dp-ctx-menu')) return;
    si('● Chưa lưu — Ctrl+S để lưu','dp-si-unsaved',0);
    clearTimeout(_autoSaveTimer);
    _autoSaveTimer=setTimeout(function(){
      if(typeof window.saveData==='function'){
        window.saveData(true);
        si('✓ Tự động lưu '+new Date().toLocaleTimeString('vi-VN'),'dp-si-saved',3000);
      }
    },3000);
    // Undo tracking
    var t=e.target;
    if((t.tagName==='INPUT'||t.tagName==='TEXTAREA')&&(t.id||t.name)){
      dpPushUndo(t);
    }
  },{capture:false});

  /* ─── undo/redo ────────────────────────────────────────────────── */
  function buildUndoBar(){
    var bar=document.createElement('div'); bar.id='dp-undo-bar';
    var u=document.createElement('button'); u.id='dp-undo-btn'; u.className='dp-undo-btn'; u.title='Hoàn tác Ctrl+Z'; u.textContent='↶'; u.onclick=dpUndo;
    var r=document.createElement('button'); r.id='dp-redo-btn'; r.className='dp-undo-btn'; r.title='Làm lại Ctrl+Y'; r.textContent='↷'; r.onclick=dpRedo;
    bar.appendChild(u); bar.appendChild(r);
    var tr=document.querySelector('.topbar-right'); // P05: nằm TRONG topbar (trước đây định vị cố định đè lên nút Lưu)
    if(tr) tr.insertBefore(bar,tr.firstChild); else document.body.appendChild(bar);
    updUndo();
  }
  function dpPushUndo(el){
    var prev=el._dpPrev!==undefined?el._dpPrev:el.defaultValue||'';
    _undoStack.push({id:el.id,name:el.name,val:prev});
    el._dpPrev=el.value;
    if(_undoStack.length>UNDO_MAX) _undoStack.shift();
    _redoStack=[];
    updUndo();
  }
  function dpUndo(){
    if(!_undoStack.length){ si('↶ Không có gì để hoàn tác','',1500); return; }
    var snap=_undoStack.pop();
    var el=snap.id?document.getElementById(snap.id):document.querySelector('[name="'+snap.name+'"]');
    if(el){ _redoStack.push({id:snap.id,name:snap.name,val:el.value}); el.value=snap.val; el.dispatchEvent(new Event('input',{bubbles:true})); el.focus(); si('↶ Đã hoàn tác','',1500); }
    updUndo();
  }
  function dpRedo(){
    if(!_redoStack.length){ si('↷ Không có gì để làm lại','',1500); return; }
    var snap=_redoStack.pop();
    var el=snap.id?document.getElementById(snap.id):document.querySelector('[name="'+snap.name+'"]');
    if(el){ _undoStack.push({id:snap.id,name:snap.name,val:el.value}); el.value=snap.val; el.dispatchEvent(new Event('input',{bubbles:true})); el.focus(); si('↷ Đã làm lại','',1500); }
    updUndo();
  }
  function updUndo(){
    var u=document.getElementById('dp-undo-btn'), r=document.getElementById('dp-redo-btn');
    if(u) u.disabled=!_undoStack.length;
    if(r) r.disabled=!_redoStack.length;
  }

  /* ─── help modal ───────────────────────────────────────────────── */
  function buildHelpModal(){
    var m=document.createElement('div'); m.id='dp-help-modal';
    var shortcuts=[
      ['Ctrl+S','Lưu hồ sơ/dữ liệu hiện tại','GĐ1'],
      ['Ctrl+K','Mở Command Palette','GĐ2'],
      ['Ctrl+N','Tạo hồ sơ mới','GĐ1'],
      ['Ctrl+P','In / Xuất PDF','GĐ1'],
      ['Ctrl+Z','Hoàn tác (Undo)','GĐ4'],
      ['Ctrl+Y','Làm lại (Redo)','GĐ4'],
      ['Ctrl+Shift+T','In bảng A4','GĐ1'],
      ['Esc','Đóng modal / palette / menu','GĐ1'],
      ['F1 hoặc ?','Hiện bảng phím tắt này','GĐ2'],
      ['Alt + 1..9','Chuyển sang menu thứ N','GĐ1'],
      ['↑ / ↓','Di chuyển giữa dòng bảng','GĐ1'],
      ['PgUp / PgDn','Nhảy 10 dòng bảng','GĐ1'],
      ['Home / End','Về dòng đầu / cuối bảng','GĐ1'],
      ['Enter','Mở chi tiết dòng đang focus','GĐ1'],
      ['Delete','Xóa dòng focus (có xác nhận)','GĐ1'],
      ['Ctrl+Click','Chọn thêm / bỏ chọn 1 dòng','GĐ4'],
      ['Shift+Click','Chọn dải nhiều dòng','GĐ4'],
      ['Click phải','Menu ngữ cảnh trên dòng','GĐ2'],
    ];
    var rows=shortcuts.map(function(s){ return '<div class="dp-help-row"><span class="dp-help-key">'+esc(s[0])+'</span><span class="dp-help-desc">'+esc(s[1])+'</span><span class="dp-help-phase">'+s[2]+'</span></div>'; }).join('');
    m.innerHTML='<div id="dp-help-box"><h2>⌨️ Bảng phím tắt — Desktop Mode v4</h2>'+rows+'<div style="margin-top:14px;text-align:right"><button class="dp-dens-btn dp-active" onclick="document.getElementById(\'dp-help-modal\').classList.remove(\'dp-open\')">✕ Đóng (Esc)</button></div></div>';
    m.addEventListener('click',function(e){ if(e.target===m) m.classList.remove('dp-open'); });
    document.body.appendChild(m);
  }
  function openHelp(){ var m=document.getElementById('dp-help-modal'); if(m) m.classList.add('dp-open'); }

  /* ─── column resize ────────────────────────────────────────────── */
  function colResizeStart(e,th){
    e.preventDefault(); e.stopPropagation();
    var sx=e.clientX, sw=th.offsetWidth;
    function mv(ev){ th.style.width=Math.max(40,sw+ev.clientX-sx)+'px'; th.style.minWidth=th.style.width; }
    function up(){ document.removeEventListener('mousemove',mv); document.removeEventListener('mouseup',up); }
    document.addEventListener('mousemove',mv);
    document.addEventListener('mouseup',up);
  }

  /* ─── minimap ──────────────────────────────────────────────────── */
  function buildMinimap(){
    var mm=document.createElement('div'); mm.className='dp-minimap';
    mm.innerHTML='<div class="dp-minimap-thumb"></div>';
    mm.title='Click để nhảy vị trí';
    mm.addEventListener('click',function(e){
      var rect=mm.getBoundingClientRect();
      var pct=(e.clientY-rect.top)/rect.height;
      window.scrollTo({top:(document.documentElement.scrollHeight-window.innerHeight)*pct,behavior:'smooth'});
    });
    document.body.appendChild(mm);
  }
  function updateMinimap(){
    var mm=document.querySelector('.dp-minimap'); if(!mm) return;
    var h=document.documentElement.scrollHeight-window.innerHeight;
    if(h<=0){ mm.style.opacity='0'; return; }
    mm.style.opacity='1';
    var thumb=mm.querySelector('.dp-minimap-thumb'); if(!thumb) return;
    var pct=window.scrollY/h;
    var mmH=mm.offsetHeight;
    var tH=Math.max(20,mmH*(window.innerHeight/document.documentElement.scrollHeight));
    thumb.style.height=tH+'px';
    thumb.style.top=((mmH-tH)*pct)+'px';
  }

  /* ─── pagination ───────────────────────────────────────────────── */
  function setupPagination(tbl){
    if(tbl._dpPaged) return; tbl._dpPaged=true;
    var tbody=tbl.querySelector('tbody'); if(!tbody) return;
    var allRows=Array.from(tbody.querySelectorAll('tr'));
    if(allRows.length<80) return;

    var tblId='dp-tbl-'+(tbl.id||Math.random().toString(36).substr(2,8));
    tbl._dpId=tblId;
    if(!_paging[tblId]) _paging[tblId]={page:1,size:parseInt(localStorage.getItem(LS_PGSZ)||'100')};

    function render(){
      var st=_paging[tblId];
      var total=allRows.length;
      var pages=Math.max(1,Math.ceil(total/st.size));
      st.page=Math.max(1,Math.min(st.page,pages));
      allRows.forEach(function(r,i){
        r.style.display=(i>=(st.page-1)*st.size && i<st.page*st.size)?'':'none';
      });
      // remove old bar
      var old=document.getElementById('dpbar-'+tblId); if(old) old.remove();
      var bar=document.createElement('div'); bar.className='dp-page-bar'; bar.id='dpbar-'+tblId;
      function mkb(txt,ttl,fn,dis,act){
        var b=document.createElement('button'); b.className='dp-page-btn'+(act?' dp-active':'');
        b.textContent=txt; b.title=ttl||txt; if(dis) b.disabled=true; b.onclick=fn; return b;
      }
      bar.appendChild(mkb('«','Trang đầu',function(){st.page=1;render();},st.page<=1));
      bar.appendChild(mkb('‹','Trang trước',function(){st.page--;render();},st.page<=1));
      var inf=document.createElement('span'); inf.className='dp-page-info';
      inf.textContent='Trang '+st.page+'/'+pages+' ('+total+' dòng)'; bar.appendChild(inf);
      bar.appendChild(mkb('›','Trang sau',function(){st.page++;render();},st.page>=pages));
      bar.appendChild(mkb('»','Trang cuối',function(){st.page=pages;render();},st.page>=pages));
      var jlbl=document.createElement('span'); jlbl.className='dp-page-info'; jlbl.textContent='Trang:'; bar.appendChild(jlbl);
      var jinp=document.createElement('input'); jinp.className='dp-page-jump'; jinp.type='number'; jinp.min=1; jinp.max=pages; jinp.placeholder=st.page;
      jinp.addEventListener('keydown',function(e){ if(e.key==='Enter'){var v=parseInt(this.value); if(v>=1&&v<=pages){st.page=v;render();} this.value='';} });
      bar.appendChild(jinp);
      var sel=document.createElement('select'); sel.className='dp-page-size';
      [50,100,200].forEach(function(n){ var o=document.createElement('option'); o.value=n; o.textContent=n+'/trang'; if(n===st.size) o.selected=true; sel.appendChild(o); });
      var oa=document.createElement('option'); oa.value=99999; oa.textContent='Tất cả'; if(st.size===99999) oa.selected=true; sel.appendChild(oa);
      sel.onchange=function(){ st.size=parseInt(this.value); st.page=1; localStorage.setItem(LS_PGSZ,st.size); render(); };
      bar.appendChild(sel);
      tbl.parentNode.insertBefore(bar,tbl.nextSibling);
    }
    render();
  }

  /* ─── drag & drop import ───────────────────────────────────────── */
  function buildDropOverlay(){
    var ov=document.createElement('div'); ov.id='dp-drop-overlay';
    ov.innerHTML='<div class="dp-drop-ico">📂</div><div class="dp-drop-txt">Thả file Excel / JSON vào đây để import</div>';
    document.body.appendChild(ov);
  }
  function bindDragDrop(){
    var ctr=0;
    document.addEventListener('dragenter',function(e){
      if(!dpEnabled) return;
      var hasFile=e.dataTransfer&&Array.from(e.dataTransfer.items||[]).some(function(i){return i.kind==='file';});
      if(!hasFile) return;
      ctr++; var ov=document.getElementById('dp-drop-overlay'); if(ov) ov.classList.add('dp-drop-active'); e.preventDefault();
    });
    document.addEventListener('dragleave',function(){ ctr--; if(ctr<=0){ctr=0; var ov=document.getElementById('dp-drop-overlay'); if(ov) ov.classList.remove('dp-drop-active');} });
    document.addEventListener('dragover',function(e){e.preventDefault();});
    document.addEventListener('drop',function(e){
      e.preventDefault(); ctr=0; var ov=document.getElementById('dp-drop-overlay'); if(ov) ov.classList.remove('dp-drop-active');
      if(!dpEnabled) return;
      var files=e.dataTransfer&&e.dataTransfer.files; if(!files||!files.length) return;
      var file=files[0];
      var ext=file.name.split('.').pop().toLowerCase();
      if(ext==='json'){
        var rd=new FileReader();
        rd.onload=function(ev){ try{ var d=JSON.parse(ev.target.result); if(typeof window.hosoImportJSON==='function') window.hosoImportJSON(d); else{ alert('📂 '+file.name+'\nKhông tìm thấy hàm xử lý JSON.'); } } catch(er){ alert('❌ Lỗi JSON: '+er.message); } };
        rd.readAsText(file,'utf-8');
      } else if(ext==='xlsx'||ext==='xls'){
        si('📂 '+file.name+' — Dùng nút Import để tải Excel','dp-si-saving',4000);
      } else {
        si('⚠ Chỉ hỗ trợ file .xlsx, .xls, .json','dp-si-unsaved',3000);
      }
    });
  }

  /* ─── expose ───────────────────────────────────────────────────── */
  window.dpToggle=toggleDM;
  window.dpOpenCmd=openCmd;
  window.dpHelp=openHelp;

  /* ─── boot ─────────────────────────────────────────────────────── */
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else setTimeout(init,60);

})();
/* === DESKTOP PATCH JS END === */
