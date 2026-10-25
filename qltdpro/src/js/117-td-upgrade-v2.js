
(function(){
  'use strict';
  if (window.TDUP2) return; // idempotent

  var OFF = /([?&])tdup2=off/.test(location.search);

  // ---------- tiny utils ----------
  function $(sel,root){ return (root||document).querySelector(sel); }
  function toArr(nl){ return Array.prototype.slice.call(nl); }
  function on(el,ev,fn,opt){ el.addEventListener(ev,fn,opt); }
  function txt(el){ return (el.textContent||'').replace(/\s+/g,' ').trim(); }
  function toast(m,o){ if(window.TDUP&&TDUP.toast) return TDUP.toast(m,o); try{(0)&&console.log('[TDUP2]',m);}catch(e){} }
  function idle(fn){ return (window.TDUP&&TDUP.idle)?TDUP.idle(fn):(window.requestIdleCallback||function(f){return setTimeout(f,1);})(fn); }
  function throttle(fn,ms){ return (window.TDUP&&TDUP.throttle)?TDUP.throttle(fn,ms):function(){fn.apply(this,arguments);}; }

  // ---------- storage: IndexedDB (fallback localStorage) ----------
  var IDB = (function(){
    var DBP=null, NAME='tdup2', STORE='views';
    function open(){
      if (DBP) return DBP;
      DBP = new Promise(function(res,rej){
        if(!window.indexedDB){ rej(new Error('no-idb')); return; }
        var r = indexedDB.open(NAME,1);
        r.onupgradeneeded=function(){ r.result.createObjectStore(STORE); };
        r.onsuccess=function(){ res(r.result); };
        r.onerror=function(){ rej(r.error); };
      });
      return DBP;
    }
    function tx(mode){ return open().then(function(db){ return db.transaction(STORE,mode).objectStore(STORE); }); }
    return {
      get:function(k){ return tx('readonly').then(function(s){ return new Promise(function(res,rej){ var r=s.get(k); r.onsuccess=function(){res(r.result);}; r.onerror=function(){rej(r.error);}; }); }); },
      set:function(k,v){ return tx('readwrite').then(function(s){ return new Promise(function(res,rej){ var r=s.put(v,k); r.onsuccess=function(){res();}; r.onerror=function(){rej(r.error);}; }); }); }
    };
  })();
  function storeGet(k){
    return IDB.get(k).catch(function(){
      try{ var v=localStorage.getItem('tdup2.'+k); return v==null?undefined:JSON.parse(v); }catch(e){ return undefined; }
    });
  }
  function storeSet(k,v){
    return IDB.set(k,v).catch(function(){
      try{ localStorage.setItem('tdup2.'+k, JSON.stringify(v)); }catch(e){}
    });
  }

  // ---------- value parsing for sort ----------
  function parseCell(s){
    s = (s||'').trim();
    if (!s) return {t:3, v:''}; // empty last
    // date dd/mm/yyyy or dd-mm-yyyy
    var m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if (m){ var y=+m[3]; if(y<100)y+=2000; return {t:1, v:new Date(y,(+m[2])-1,+m[1]).getTime()}; }
    // number (vi format: '.' thousands, ',' decimal — also plain / en format)
    var raw = s.replace(/[^0-9.,\-]/g,'');
    if (raw && /\d/.test(raw)){
      var n = raw, hasDot = n.indexOf('.')>=0, hasCom = n.indexOf(',')>=0;
      if (hasDot && hasCom){
        // the separator that appears LAST is the decimal separator
        if (n.lastIndexOf(',') > n.lastIndexOf('.')){ n = n.replace(/\./g,'').replace(',', '.'); }
        else { n = n.replace(/,/g,''); }
      } else if (hasDot){
        // pure thousands grouping (e.g. 1.500.000) → strip dots; otherwise keep as decimal
        if (/^-?\d{1,3}(\.\d{3})+$/.test(n)) n = n.replace(/\./g,'');
      } else if (hasCom){
        if (/^-?\d{1,3}(,\d{3})+$/.test(n)) n = n.replace(/,/g,'');
        else n = n.replace(',', '.');
      }
      var f = parseFloat(n);
      // only treat as number when the original is mostly numeric (avoid codes like "A001")
      if (!isNaN(f) && /^[\s\-]*[\d.,]+\s*[%₫$đ]?\s*$/.test(s)) return {t:2, v:f};
    }
    return {t:4, v:s.toLowerCase()};
  }
  function cmp(a,b,dir){
    var pa=parseCell(a), pb=parseCell(b);
    var r;
    if (pa.t===3 && pb.t!==3) return 1;
    if (pb.t===3 && pa.t!==3) return -1;
    if ((pa.t===2&&pb.t===2)||(pa.t===1&&pb.t===1)){ r = pa.v - pb.v; }
    else { r = String(pa.v).localeCompare(String(pb.v),'vi'); }
    return dir==='desc' ? -r : r;
  }

  // ---------- per-table grid controller ----------
  var GID = 0;
  var GRIDS = [];

  function signature(table){
    var ths = headerCells(table);
    var s = ths.map(function(th){ return txt(th); }).join('|') + '#' + ths.length;
    // light hash
    var h=0; for(var i=0;i<s.length;i++){ h=((h<<5)-h+s.charCodeAt(i))|0; }
    return 'sig'+(h>>>0).toString(36)+'_'+ths.length;
  }
  function headerRow(table){
    var thead = table.tHead;
    if (thead && thead.rows.length) return thead.rows[thead.rows.length-1];
    // fallback: first row with th
    var rows = table.rows;
    for (var i=0;i<rows.length;i++){ if (rows[i].querySelector('th')) return rows[i]; }
    return null;
  }
  function headerCells(table){
    var hr = headerRow(table);
    return hr ? toArr(hr.cells) : [];
  }
  function bodyRows(table){
    var tb = table.tBodies[0];
    if (!tb) return [];
    return toArr(tb.rows).filter(function(r){
      return !r.classList.contains('tdup2-spacer') && r.querySelector('td');
    });
  }
  function isComplexTable(table){
    // tables with interactive controls / inline handlers inside body → skip risky features
    var tb = table.tBodies[0]; if(!tb) return true;
    if (tb.querySelector('input,select,textarea,button,a[href],[onclick],[data-act],[contenteditable="true"]')) return true;
    // multiple tbodies / colspan in body
    if (table.tBodies.length>1) return true;
    if (tb.querySelector('td[colspan],td[rowspan]')) return true;
    return false;
  }

  function Grid(table){
    var self = this;
    this.id = 'tdup2-g'+(++GID);
    this.table = table;
    this.sig = signature(table);
    this.sort = [];            // [{col, dir}]
    this.hidden = {};          // origColIndex -> true
    this.widths = {};          // origColIndex -> px
    this.bulk = false;
    this.complex = isComplexTable(table);
    table.id = table.id || this.id;
    table._tdup2 = this;

    // wrap container for absolute gear
    var wrap = table.closest('.table-wrap') || table.parentNode;
    if (wrap && !wrap.classList.contains('tdup2-wrap')) wrap.classList.add('tdup2-wrap');
    this.wrap = wrap;

    // per-table style element for col hide / widths
    this.styleEl = document.createElement('style');
    this.styleEl.id = 'tdup2-style-' + this.id;
    document.head.appendChild(this.styleEl);

    table.classList.add('tdup2-grid');
    this.setupHeaders();
    this.addGear();
    this.restore();
  }

  Grid.prototype.headerCells = function(){ return headerCells(this.table); };
  Grid.prototype.bulkOffset = function(){ return this.bulk ? 1 : 0; };

  Grid.prototype.setupHeaders = function(){
    var self = this;
    this.headerCells().forEach(function(th, idx){
      if (th.querySelector('.tdup2-resizer')) return;
      th.style.position = th.style.position || 'sticky';
      th.classList.add('tdup2-sortable');
      th.setAttribute('data-tdup2-col', idx);
      // sort handler
      on(th, 'click', function(e){
        if (e.target.classList.contains('tdup2-resizer')) return;
        self.toggleSort(idx, e.shiftKey);
      });
      // resizer
      var rz = document.createElement('span');
      rz.className = 'tdup2-resizer';
      th.appendChild(rz);
      self.attachResize(rz, th, idx);
    });
  };

  Grid.prototype.attachResize = function(handle, th, idx){
    var self = this, startX=0, startW=0, active=false;
    on(handle,'mousedown',function(e){
      e.preventDefault(); e.stopPropagation();
      active=true; startX=e.clientX; startW=th.getBoundingClientRect().width;
      document.body.style.userSelect='none';
      function mv(ev){ if(!active)return; var w=Math.max(48, startW + (ev.clientX-startX)); self.widths[idx]=Math.round(w); self.applyStyle(); }
      function up(){ active=false; document.body.style.userSelect=''; document.removeEventListener('mousemove',mv); document.removeEventListener('mouseup',up); self.persist(); }
      document.addEventListener('mousemove',mv);
      document.addEventListener('mouseup',up);
    });
  };

  Grid.prototype.applyStyle = function(){
    var off = this.bulkOffset();
    var css = '';
    var id = '#'+this.table.id;
    // hidden
    for (var k in this.hidden){ if(this.hidden[k]){ var n=(+k)+1+off; css += id+' td:nth-child('+n+'),'+id+' th:nth-child('+n+'){display:none}\n'; } }
    // widths
    for (var w in this.widths){ var nn=(+w)+1+off; var px=this.widths[w]+'px'; css += id+' th:nth-child('+nn+'){width:'+px+';min-width:'+px+';max-width:'+px+'}\n'; }
    this.styleEl.textContent = css;
  };

  // ---- sorting ----
  Grid.prototype.toggleSort = function(col, additive){
    var found = null;
    for (var i=0;i<this.sort.length;i++){ if(this.sort[i].col===col){ found=this.sort[i]; break; } }
    if (!additive){
      if (found && this.sort.length===1){ found.dir = found.dir==='asc'?'desc':'asc'; }
      else { this.sort = [{col:col, dir:'asc'}]; }
    } else {
      if (found){ found.dir = found.dir==='asc'?'desc':'asc'; }
      else { this.sort.push({col:col, dir:'asc'}); }
    }
    this.applySort(); this.renderSortIndicators(); this.persist();
  };

  Grid.prototype.applySort = function(){
    if (!this.sort.length) return;
    var self = this;
    var rows = this.vs ? this.vs.rows.slice() : bodyRows(this.table);
    var off = this.bulkOffset();
    rows.sort(function(ra, rb){
      for (var i=0;i<self.sort.length;i++){
        var s = self.sort[i];
        var ca = ra.cells[s.col+off], cb = rb.cells[s.col+off];
        var r = cmp(ca?txt(ca):'', cb?txt(cb):'', s.dir);
        if (r!==0) return r;
      }
      return 0;
    });
    if (this.vs){ this.vs.rows = rows; this.vs.render(); }
    else {
      var tb = this.table.tBodies[0];
      var frag = document.createDocumentFragment();
      rows.forEach(function(r){ frag.appendChild(r); });
      tb.appendChild(frag);
    }
  };

  Grid.prototype.renderSortIndicators = function(){
    var self = this;
    this.headerCells().forEach(function(th, idx){
      var old = th.querySelector('.tdup2-sarrow,.tdup2-rank');
      var ex = th.querySelectorAll('.tdup2-sarrow,.tdup2-rank');
      for (var i=0;i<ex.length;i++) ex[i].remove();
      var pos = -1, dir=null;
      for (var j=0;j<self.sort.length;j++){ if(self.sort[j].col===idx){ pos=j; dir=self.sort[j].dir; break; } }
      if (pos>=0){
        var ar = document.createElement('span'); ar.className='tdup2-sarrow'; ar.textContent = dir==='asc'?'▲':'▼';
        th.appendChild(ar);
        if (self.sort.length>1){ var rk=document.createElement('span'); rk.className='tdup2-rank'; rk.textContent=(pos+1); th.appendChild(rk); }
      }
    });
  };

  // ---- bulk select ----
  Grid.prototype.enableBulk = function(flag){
    if (flag===this.bulk) return;
    this.bulk = flag;
    var self = this;
    if (flag){
      // header checkbox
      var hr = headerRow(this.table);
      var th = document.createElement('th'); th.className='tdup2-ck';
      var all = document.createElement('input'); all.type='checkbox'; all.title='Chọn tất cả';
      on(all,'change',function(){ self.selectAll(all.checked); });
      th.appendChild(all); hr.insertBefore(th, hr.firstChild); this._allCk = all;
      bodyRows(this.table).forEach(function(r){
        var td=document.createElement('td'); td.className='tdup2-ck';
        var ck=document.createElement('input'); ck.type='checkbox';
        on(ck,'change',function(){ r.classList.toggle('tdup2-selected',ck.checked); updateBulkBar(); });
        td.appendChild(ck); r.insertBefore(td, r.firstChild);
      });
    } else {
      var cks = this.table.querySelectorAll('.tdup2-ck'); for(var i=cks.length-1;i>=0;i--) cks[i].remove();
      bodyRows(this.table).forEach(function(r){ r.classList.remove('tdup2-selected'); });
      this._allCk = null;
    }
    this.applyStyle(); updateBulkBar();
  };
  Grid.prototype.selectAll = function(on){
    bodyRows(this.table).forEach(function(r){
      var ck = r.querySelector('.tdup2-ck input'); if(ck){ ck.checked=on; r.classList.toggle('tdup2-selected',on); }
    });
    updateBulkBar();
  };

  // ---- inline edit (opt-in) ----
  Grid.prototype.setupInlineEdit = function(){
    var self = this;
    var editableAll = this.table.classList.contains('tdup2-editable');
    var tb = this.table.tBodies[0]; if(!tb) return;
    on(tb,'dblclick',function(e){
      var td = e.target.closest('td'); if(!td) return;
      if (!editableAll && !td.hasAttribute('data-tdup2-edit')) return;
      if (td.classList.contains('tdup2-ck') || td.querySelector('input,select,textarea')) return;
      self.editCell(td);
    });
  };
  Grid.prototype.editCell = function(td){
    var prev = td.textContent;
    td.classList.add('tdup2-editing');
    var inp = document.createElement('input');
    inp.type='text'; inp.value=prev;
    inp.style.cssText='width:100%;box-sizing:border-box;border:0;outline:0;background:transparent;color:inherit;font:inherit;';
    td.textContent=''; td.appendChild(inp); inp.focus(); inp.select();
    function commit(save){
      var nv = inp.value;
      td.classList.remove('tdup2-editing');
      td.textContent = save ? nv : prev;
      if (save && nv!==prev){
        toast('Đã cập nhật ô', { action:{ label:'Hoàn tác', onClick:function(){ td.textContent=prev; } } , duration:5000});
        try{ td.dispatchEvent(new CustomEvent('tdup2:celledit',{bubbles:true,detail:{value:nv,prev:prev}})); }catch(e){}
      }
    }
    on(inp,'keydown',function(e){ if(e.key==='Enter'){e.preventDefault();commit(true);} else if(e.key==='Escape'){e.preventDefault();commit(false);} });
    on(inp,'blur',function(){ commit(true); });
  };

  // ---- virtual scroll (static large tables only) ----
  Grid.prototype.enableVirtual = function(){
    if (this.complex) return false;
    var tb = this.table.tBodies[0]; if(!tb) return false;
    var rows = bodyRows(this.table);
    if (rows.length <= 1000) return false;
    var self = this;
    // measure row height
    var rh = rows[0].getBoundingClientRect().height || parseInt(getComputedStyle(document.documentElement).getPropertyValue('--tdup2-row-h')) || 36;
    var scroller = this.wrap;
    // ensure scroller scrolls
    var cs = getComputedStyle(scroller);
    if (cs.overflowY==='visible'){ scroller.style.maxHeight='70vh'; scroller.style.overflow='auto'; }
    var topSp = document.createElement('tr'); topSp.className='tdup2-spacer'; var tdT=document.createElement('td'); tdT.colSpan=999; topSp.appendChild(tdT);
    var botSp = document.createElement('tr'); botSp.className='tdup2-spacer'; var tdB=document.createElement('td'); tdB.colSpan=999; botSp.appendChild(tdB);
    rows.forEach(function(r){ r.parentNode && r.parentNode.removeChild(r); });
    tb.appendChild(topSp); tb.appendChild(botSp);
    var vs = { rows: rows, rh: rh, top: topSp, bot: botSp,
      render: function(){
        var st = scroller.scrollTop;
        var vh = scroller.clientHeight || 600;
        var buffer = 12;
        var start = Math.max(0, Math.floor(st/rh) - buffer);
        var count = Math.ceil(vh/rh) + buffer*2;
        var end = Math.min(vs.rows.length, start+count);
        // clear existing rendered (between spacers)
        var cur = topSp.nextSibling;
        while (cur && cur!==botSp){ var nx=cur.nextSibling; tb.removeChild(cur); cur=nx; }
        var frag=document.createDocumentFragment();
        for (var i=start;i<end;i++) frag.appendChild(vs.rows[i]);
        tb.insertBefore(frag, botSp);
        tdT.style.height = (start*rh)+'px';
        tdB.style.height = ((vs.rows.length-end)*rh)+'px';
      }
    };
    this.vs = vs;
    on(scroller,'scroll', throttle(function(){ vs.render(); }, 16));
    vs.render();
    return true;
  };

  // ---- saved views ----
  Grid.prototype.snapshot = function(){
    return { sort:this.sort, hidden:this.hidden, widths:this.widths, stickcol:this.table.classList.contains('tdup2-stickcol') };
  };
  Grid.prototype.applySnapshot = function(s){
    if (!s) return;
    this.sort = s.sort||[]; this.hidden = s.hidden||{}; this.widths = s.widths||{};
    this.table.classList.toggle('tdup2-stickcol', !!s.stickcol);
    this.applyStyle(); this.applySort(); this.renderSortIndicators();
  };
  Grid.prototype.persist = function(){ storeSet('last.'+this.sig, this.snapshot()); };
  Grid.prototype.restore = function(){
    var self = this;
    storeGet('last.'+this.sig).then(function(s){ if(s) self.applySnapshot(s); });
  };
  Grid.prototype.saveView = function(name){
    var self = this;
    storeGet('views.'+this.sig).then(function(list){
      list = list||[]; list = list.filter(function(v){return v.name!==name;});
      list.push({name:name, snap:self.snapshot()});
      storeSet('views.'+self.sig, list).then(function(){ toast('Đã lưu view: '+name); });
    });
  };

  // ---- gear menu ----
  Grid.prototype.addGear = function(){
    var self = this;
    var btn = document.createElement('button');
    btn.type='button'; btn.className='tdup2-gear'; btn.title='Tuỳ chỉnh bảng (Data Grid v2)'; btn.textContent='⚙';
    on(btn,'click',function(e){ e.stopPropagation(); self.openMenu(btn); });
    this.wrap.appendChild(btn);
    this.gear = btn;
  };
  Grid.prototype.openMenu = function(anchor){
    closeAllPops();
    var self = this;
    var pop = document.createElement('div'); pop.className='tdup2-pop'; pop.setAttribute('data-tdup2-pop','1');
    // sticky col + bulk + virtual toggles
    var h1=document.createElement('h4'); h1.textContent='Hiển thị'; pop.appendChild(h1);
    pop.appendChild(toggleRow('Cố định cột đầu', self.table.classList.contains('tdup2-stickcol'), function(c){ self.table.classList.toggle('tdup2-stickcol',c); self.persist(); }));
    pop.appendChild(toggleRow('Chọn nhiều dòng (bulk)', self.bulk, function(c){ self.enableBulk(c); }));
    // columns
    var hr=document.createElement('hr'); pop.appendChild(hr);
    var h2=document.createElement('h4'); h2.textContent='Cột'; pop.appendChild(h2);
    var list=document.createElement('div'); list.className='tdup2-collist';
    self.headerCells().forEach(function(th,idx){
      var label = txt(th) || ('Cột '+(idx+1));
      list.appendChild(toggleRow(label, !self.hidden[idx], function(c){ if(c) delete self.hidden[idx]; else self.hidden[idx]=true; self.applyStyle(); self.persist(); }));
    });
    pop.appendChild(list);
    // views
    pop.appendChild(document.createElement('hr'));
    var h3=document.createElement('h4'); h3.textContent='Saved views'; pop.appendChild(h3);
    var saveBtn=document.createElement('button'); saveBtn.className='tdup2-mi'; saveBtn.textContent='＋ Lưu view hiện tại…';
    on(saveBtn,'click',function(){ var n=prompt('Tên view:'); if(n){ self.saveView(n.trim()); closeAllPops(); } });
    pop.appendChild(saveBtn);
    var vbox=document.createElement('div'); vbox.className='tdup2-views'; pop.appendChild(vbox);
    storeGet('views.'+self.sig).then(function(listv){
      (listv||[]).forEach(function(v){
        var row=document.createElement('div'); row.className='tdup2-row';
        var b=document.createElement('button'); b.className='tdup2-mi'; b.style.flex='1'; b.textContent=v.name;
        on(b,'click',function(){ self.applySnapshot(v.snap); self.persist(); closeAllPops(); toast('Đã áp dụng view: '+v.name); });
        var del=document.createElement('button'); del.className='tdup2-del'; del.title='Xoá'; del.textContent='🗑';
        on(del,'click',function(){ storeGet('views.'+self.sig).then(function(L){ L=(L||[]).filter(function(x){return x.name!==v.name;}); storeSet('views.'+self.sig,L); row.remove(); }); });
        row.appendChild(b); row.appendChild(del); vbox.appendChild(row);
      });
    });
    // reset
    pop.appendChild(document.createElement('hr'));
    var reset=document.createElement('button'); reset.className='tdup2-mi'; reset.textContent='↺ Đặt lại (xoá sort/ẩn cột/độ rộng)';
    on(reset,'click',function(){ self.sort=[]; self.hidden={}; self.widths={}; self.table.classList.remove('tdup2-stickcol'); self.applyStyle(); self.renderSortIndicators(); var tb=self.table.tBodies[0]; self.persist(); closeAllPops(); toast('Đã đặt lại bảng'); });
    pop.appendChild(reset);

    document.body.appendChild(pop);
    var r = anchor.getBoundingClientRect();
    pop.style.top = (window.scrollY + r.bottom + 6)+'px';
    var left = window.scrollX + r.right - pop.offsetWidth;
    pop.style.left = Math.max(8,left)+'px';
  };

  function toggleRow(label, checked, fn){
    var row=document.createElement('div'); row.className='tdup2-row';
    var lab=document.createElement('label');
    var ck=document.createElement('input'); ck.type='checkbox'; ck.checked=!!checked;
    on(ck,'change',function(){ fn(ck.checked); });
    var sp=document.createElement('span'); sp.textContent=label;
    lab.appendChild(ck); lab.appendChild(sp); row.appendChild(lab);
    return row;
  }
  function closeAllPops(){ toArr(document.querySelectorAll('[data-tdup2-pop]')).forEach(function(p){p.remove();}); }
  on(document,'click',function(e){ if(!e.target.closest('[data-tdup2-pop]') && !e.target.closest('.tdup2-gear')) closeAllPops(); });

  // ---------- bulk bar ----------
  var BULKBAR = document.getElementById('tdup2-bulkbar');
  var BULKCOUNT = document.getElementById('tdup2-bulkcount');
  function selectedRows(){
    var out=[];
    GRIDS.forEach(function(g){ if(!g.bulk)return; bodyRows(g.table).forEach(function(r){ var ck=r.querySelector('.tdup2-ck input'); if(ck&&ck.checked) out.push({grid:g,row:r}); }); });
    return out;
  }
  function updateBulkBar(){
    var sel = selectedRows();
    BULKCOUNT.textContent = sel.length;
    BULKBAR.classList.toggle('open', sel.length>0);
  }
  function rowsToMatrix(){
    var sel = selectedRows(); if(!sel.length) return null;
    var g = sel[0].grid;
    var heads = g.headerCells().map(function(th,idx){ return g.hidden[idx]?null:txt(th); }).filter(function(x){return x!==null && x!=='';});
    var off = g.bulkOffset();
    var data = sel.map(function(s){
      var cells = toArr(s.row.cells);
      var rowOut=[];
      g.headerCells().forEach(function(th,idx){ if(g.hidden[idx])return; var c=cells[idx+off]; rowOut.push(c?txt(c):''); });
      return rowOut;
    });
    return {heads:heads, data:data};
  }
  function exportCsv(){
    var m = rowsToMatrix(); if(!m){ toast('Chưa chọn dòng nào'); return; }
    function esc(v){ v=String(v==null?'':v); return /[",\n;]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; }
    var lines = [m.heads.map(esc).join(',')].concat(m.data.map(function(r){return r.map(esc).join(',');}));
    var blob = new Blob(['\uFEFF'+lines.join('\r\n')], {type:'text/csv;charset=utf-8;'});
    var a = document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download = 'tdup2_selection_'+Date.now()+'.csv';
    document.body.appendChild(a); a.click();
    setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast('Đã xuất '+m.data.length+' dòng ra CSV');
  }
  function printSelection(){
    var m = rowsToMatrix(); if(!m){ toast('Chưa chọn dòng nào'); return; }
    var w = window.open('', '_blank'); if(!w){ toast('Trình duyệt chặn cửa sổ in'); return; }
    var esc = function(s){ return String(s==null?'':s).replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c];}); };
    var html='<!doctype html><meta charset="utf-8"><title>In dòng đã chọn</title>'
      +'<style>body{font:13px Arial;padding:16px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:6px 8px;text-align:left}th{background:#eef2f7}'
      +'.qltd-preview-bar{position:sticky;top:0;background:#1a2540;padding:8px 14px;margin:-16px -16px 16px;text-align:right}'
      +'.qltd-preview-bar button{background:#2e7d32;color:#fff;border:0;border-radius:4px;padding:8px 16px;font-size:13px;font-weight:700;cursor:pointer}'
      +'@media print{.qltd-preview-bar{display:none}}</style>'
      +'<div class="qltd-preview-bar">🔎 Xem trước — kiểm tra dữ liệu trước khi in &nbsp; <button onclick="window.print()">🖨️ In ngay</button></div>'
      +'<h3>Danh sách dòng đã chọn ('+m.data.length+')</h3><table><thead><tr>'
      + m.heads.map(function(h){return '<th>'+esc(h)+'</th>';}).join('') + '</tr></thead><tbody>'
      + m.data.map(function(r){ return '<tr>'+r.map(function(c){return '<td>'+esc(c)+'</td>';}).join('')+'</tr>'; }).join('')
      + '</tbody></table>';
    w.document.write(html); w.document.close();
    // FIX (07/09/2026): không còn tự động gọi w.print() — cửa sổ mở ra ở
    // trạng thái xem trước, người dùng bấm nút "🖨️ In ngay" khi đã kiểm tra.
    try { w.focus(); } catch(e) {}
  }
  function clearSelection(){
    GRIDS.forEach(function(g){ if(!g.bulk)return; if(g._allCk)g._allCk.checked=false; bodyRows(g.table).forEach(function(r){ var ck=r.querySelector('.tdup2-ck input'); if(ck)ck.checked=false; r.classList.remove('tdup2-selected'); }); });
    updateBulkBar();
  }
  on(BULKBAR,'click',function(e){
    var b=e.target.closest('button[data-tdup2-bulk]'); if(!b)return;
    var a=b.getAttribute('data-tdup2-bulk');
    if(a==='csv')exportCsv(); else if(a==='print')printSelection(); else if(a==='clear')clearSelection();
  });

  // ---------- drawer ----------
  var DRAWER = document.getElementById('tdup2-drawer');
  var DRAWER_BD = document.getElementById('tdup2-drawer-backdrop');
  var DRAWER_BODY = DRAWER.querySelector('.tdup2-body');
  var DRAWER_FOOT = DRAWER.querySelector('footer');
  var DRAWER_TITLE = DRAWER.querySelector('.tdup2-title');
  var _drawerDirty=false, _onClose=null;
  function openDrawer(content, opts){
    opts = opts||{};
    DRAWER_TITLE.textContent = opts.title||'Chi tiết';
    DRAWER_BODY.innerHTML='';
    if (typeof content==='string') DRAWER_BODY.innerHTML=content;
    else if (content&&content.nodeType) DRAWER_BODY.appendChild(content);
    if (opts.width) DRAWER.style.width = (typeof opts.width==='number'?opts.width+'px':opts.width);
    DRAWER_FOOT.innerHTML='';
    _drawerDirty=false; _onClose=opts.onClose||null;
    var buttons = opts.buttons || [
      {label:'Đóng', onClick:closeDrawer},
      {label:'Lưu', primary:true, onClick:function(){ if(opts.onSave)opts.onSave(); closeDrawer(true); }}
    ];
    buttons.forEach(function(b){
      var el=document.createElement('button'); el.textContent=b.label; if(b.primary)el.className='tdup2-primary';
      on(el,'click',function(){ b.onClick&&b.onClick(); });
      DRAWER_FOOT.appendChild(el);
    });
    on(DRAWER_BODY,'input',function(){ _drawerDirty=true; });
    DRAWER_BD.classList.add('open'); DRAWER.classList.add('open');
    setTimeout(function(){ var f=DRAWER_BODY.querySelector('input,select,textarea,button'); if(f)f.focus(); },60);
  }
  function closeDrawer(force){
    if (!force && _drawerDirty && !confirm('Có thay đổi chưa lưu. Đóng?')) return;
    DRAWER.classList.remove('open'); DRAWER_BD.classList.remove('open');
    if(_onClose)try{_onClose();}catch(e){}
  }
  DRAWER.querySelector('.tdup2-x').addEventListener('click',function(){ closeDrawer(); });
  DRAWER_BD.addEventListener('click',function(){ closeDrawer(); });
  on(document,'keydown',function(e){ if(e.key==='Escape'&&DRAWER.classList.contains('open')) closeDrawer(); });

  // ---------- init grids ----------
  function enhanceTable(table){
    try{
      if (table._tdup2) return table._tdup2;
      var g = new Grid(table);
      GRIDS.push(g);
      g.setupInlineEdit();
      // virtual scroll only for big static tables
      if (bodyRows(table).length>1000 && !g.complex && !/^table-(qltd|kd|td|denhan|laidong)$/.test(table.id||'')){ try{ g.enableVirtual(); }catch(e){} } // HM-17b
      return g;
    }catch(e){ try{console.warn('[TDUP2] enhance fail',e);}catch(_){ } return null; }
  }

  function autoEnhance(){
    if (OFF) return;
    var tables = document.querySelectorAll('.table-wrap table, table.tdup2-grid');
    toArr(tables).forEach(function(t){
      if (t._tdup2) return;
      var rows = (t.tBodies[0]?t.tBodies[0].rows.length:0);
      if (t.classList.contains('tdup2-grid') || rows>50) enhanceTable(t);
    });
  }

  // ---------- palette commands (Pack v1) ----------
  function registerPaletteCommands(){
    if (!(window.TDUP && TDUP.addCommand)) return;
    TDUP.addCommand('Quản lý cột bảng hiện tại', 'Grid', function(){ var g=GRIDS[0]; if(g)g.openMenu(g.gear); });
    TDUP.addCommand('Lưu view bảng hiện tại', 'Grid', function(){ var g=GRIDS[0]; if(!g)return; var n=prompt('Tên view:'); if(n)g.saveView(n.trim()); });
    TDUP.addCommand('Xuất CSV dòng đã chọn', 'Grid', function(){ exportCsv(); });
    TDUP.addCommand('Bật/tắt cố định cột đầu', 'Grid', function(){ var g=GRIDS[0]; if(g){ g.table.classList.toggle('tdup2-stickcol'); g.persist(); } });
  }

  // ---------- expose ----------
  window.TDUP2 = {
    version: '2.0',
    grids: GRIDS,
    enhance: enhanceTable,
    rescan: autoEnhance,
    drawer: openDrawer,
    closeDrawer: closeDrawer,
    exportSelectedCsv: exportCsv,
    printSelected: printSelection
  };

  // run after layout
  idle(function(){
    autoEnhance();
    registerPaletteCommands();
    // observe future tables (lazy-rendered views)
    if (window.MutationObserver){
      var mo = new MutationObserver(throttle(function(){ autoEnhance(); }, 600));
      try{ mo.observe(document.body,{childList:true,subtree:true}); }catch(e){}
    }
  });

  try{ performance.mark && performance.mark('TDUP2-ready'); }catch(e){}
  (0)&&console.log('%cTD Upgrade Pack v2 (Data Grid v2) đã sẵn sàng.','color:#0F3D73;font-weight:bold');
})();
