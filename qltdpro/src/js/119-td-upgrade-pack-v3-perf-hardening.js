
/* TD UPGRADE PACK v3 — PERF HARDENING */
(function(){
  if (window.TDUP3) return; // idempotent
  try{
    var q = location.search || '';
    if (/[?&]tdup3=off\b/.test(q)) { (0)&&console.log('[TDUP3] tắt theo ?tdup3=off'); return; }
  }catch(e){}

  var DEV = /[?&]dev=1\b/.test(location.search||'');

  // ---- helpers kế thừa Pack v1/v2 (fallback an toàn) ----
  function toast(m,o){ if(window.TDUP&&TDUP.toast) return TDUP.toast(m,o); try{(0)&&console.log('[TDUP3]',m);}catch(e){} }
  function idle(fn){ return (window.TDUP&&TDUP.idle)?TDUP.idle(fn):(window.requestIdleCallback||function(f){return setTimeout(f,1);})(fn); }
  function throttle(fn,ms){ if(window.TDUP&&TDUP.throttle) return TDUP.throttle(fn,ms); var t=0; return function(){var n=Date.now(); if(n-t>=ms){t=n; fn.apply(this,arguments);}}; }
  function debounce(fn,ms){ var t; return function(){ var a=arguments,s=this; clearTimeout(t); t=setTimeout(function(){ fn.apply(s,a); }, ms); }; }
  function on(el,ev,fn,opt){ if(el&&el.addEventListener) el.addEventListener(ev,fn,opt||false); }
  function el(tag,attrs,html){ var n=document.createElement(tag); if(attrs)for(var k in attrs){ if(k==='class')n.className=attrs[k]; else if(k==='style')n.style.cssText=attrs[k]; else n.setAttribute(k,attrs[k]); } if(html!=null)n.innerHTML=html; return n; }

  /* ======================================================
     1) WEB WORKER HELPER (off-thread compute)
     Worker cố định, hỗ trợ các tác vụ: sha1, gzip, gunzip, aggregate.
     Fallback về main-thread nếu trình duyệt không hỗ trợ.
  ====================================================== */
  var WORKER_SRC = [
    "self.onmessage=function(ev){",
    "  var d=ev.data||{}, id=d.id, op=d.op, p=d.payload;",
    "  function ok(r,t){ self.postMessage({id:id,ok:true,result:r}, t||[]); }",
    "  function err(e){ self.postMessage({id:id,ok:false,error:String(e&&e.message||e)}); }",
    "  try{",
    "    if(op==='sha1'){",
    "      var enc=new TextEncoder().encode(p);",
    "      crypto.subtle.digest('SHA-1',enc).then(function(buf){",
    "        var b=new Uint8Array(buf),h=''; for(var i=0;i<b.length;i++){h+=('0'+b[i].toString(16)).slice(-2);} ok(h);",
    "      }).catch(err); return;",
    "    }",
    "    if(op==='gzip'){",
    "      var u=new TextEncoder().encode(p);",
    "      var cs=new CompressionStream('gzip');",
    "      new Response(new Blob([u]).stream().pipeThrough(cs)).arrayBuffer().then(function(ab){",
    "        ok(ab,[ab]);",
    "      }).catch(err); return;",
    "    }",
    "    if(op==='gunzip'){",
    "      var ds=new DecompressionStream('gzip');",
    "      new Response(new Blob([p]).stream().pipeThrough(ds)).arrayBuffer().then(function(ab){",
    "        ok(new TextDecoder().decode(ab));",
    "      }).catch(err); return;",
    "    }",
    "    if(op==='aggregate'){",
    "      function vnNum(x){ var s=String(x==null?'':x).trim().replace(/[^0-9.,\\-]/g,''); if(/,\\d{1,2}$/.test(s)){ s=s.replace(/\\./g,'').replace(',', '.'); } else { s=s.replace(/,/g,'').replace(/\\.(?=\\d{3}(\\D|$))/g,''); } return parseFloat(s)||0; }",
    "      var rows=p.rows||[], keyIdx=p.keyIdx, valIdx=p.valIdx, map={};",
    "      for(var r=0;r<rows.length;r++){ var row=rows[r]; var key=row[keyIdx]; var v=vnNum(row[valIdx]);",
    "        if(!map[key])map[key]={key:key,count:0,sum:0}; map[key].count++; map[key].sum+=v; }",
    "      var out=[]; for(var k in map)out.push(map[k]); out.sort(function(a,b){return b.sum-a.sum;}); ok(out); return;",
    "    }",
    "    err('unknown op '+op);",
    "  }catch(e){ err(e); }",
    "};"
  ].join("\n");

  var _worker=null, _wq={}, _wid=0, _workerBad=false;
  function getWorker(){
    if(_worker||_workerBad) return _worker;
    try{
      if(!window.Worker||!window.Blob||!window.URL||!URL.createObjectURL){ _workerBad=true; return null; }
      var url=URL.createObjectURL(new Blob([WORKER_SRC],{type:'text/javascript'}));
      _worker=new Worker(url);
      _worker.onmessage=function(ev){ var m=ev.data||{}; var cb=_wq[m.id]; if(cb){ delete _wq[m.id]; if(m.ok)cb.res(m.result); else cb.rej(new Error(m.error)); } };
      _worker.onerror=function(){ _workerBad=true; };
    }catch(e){ _workerBad=true; _worker=null; }
    return _worker;
  }
  function run(op,payload,transfer){
    return new Promise(function(res,rej){
      var w=getWorker();
      if(!w){ rej(new Error('no-worker')); return; }
      var id=++_wid; _wq[id]={res:res,rej:rej};
      try{ w.postMessage({id:id,op:op,payload:payload}, transfer||[]); }
      catch(e){ delete _wq[id]; rej(e); }
    });
  }

  // SHA-1 off-thread, fallback TDUP.sha1 (v1) hoặc main-thread subtle
  function sha1(text){
    return run('sha1',text).catch(function(){
      if(window.TDUP&&TDUP.sha1) return TDUP.sha1(text);
      if(window.crypto&&crypto.subtle) return crypto.subtle.digest('SHA-1',new TextEncoder().encode(text)).then(function(buf){var b=new Uint8Array(buf),h='';for(var i=0;i<b.length;i++)h+=('0'+b[i].toString(16)).slice(-2);return h;});
      return Promise.reject(new Error('no-sha1'));
    });
  }

  /* ======================================================
     2) NÉN (gzip) — sao lưu / phục hồi
  ====================================================== */
  function abToB64(ab){
    var b=new Uint8Array(ab),s='',CH=0x8000;
    for(var i=0;i<b.length;i+=CH){ s+=String.fromCharCode.apply(null,b.subarray(i,i+CH)); }
    return btoa(s);
  }
  function b64ToU8(b64){ var s=atob(b64),u=new Uint8Array(s.length); for(var i=0;i<s.length;i++)u[i]=s.charCodeAt(i); return u; }

  function gzip(str){
    return run('gzip',str).then(function(ab){ return new Uint8Array(ab); }).catch(function(){
      // fallback main-thread CompressionStream
      if(window.CompressionStream){
        var cs=new CompressionStream('gzip');
        return new Response(new Blob([new TextEncoder().encode(str)]).stream().pipeThrough(cs)).arrayBuffer().then(function(ab){return new Uint8Array(ab);});
      }
      return Promise.reject(new Error('no-gzip'));
    });
  }
  function gunzip(u8){
    return run('gunzip',u8.buffer,[u8.buffer.slice(0)]).catch(function(){
      if(window.DecompressionStream){
        var ds=new DecompressionStream('gzip');
        return new Response(new Blob([u8]).stream().pipeThrough(ds)).arrayBuffer().then(function(ab){return new TextDecoder().decode(ab);});
      }
      return Promise.reject(new Error('no-gunzip'));
    });
  }

  function snapshotLocalStorage(){
    var o={}; try{ for(var i=0;i<localStorage.length;i++){ var k=localStorage.key(i); o[k]=localStorage.getItem(k); } }catch(e){}
    return o;
  }
  function downloadBlob(blob,name){
    var a=document.createElement('a'),url=URL.createObjectURL(blob);
    a.href=url; a.download=name; document.body.appendChild(a); a.click();
    setTimeout(function(){ URL.revokeObjectURL(url); a.remove(); },1500);
  }
  function backupCompressed(){
    var data=JSON.stringify({ _tdup3:1, ts:Date.now(), ls:snapshotLocalStorage() });
    var rawKB=Math.round(data.length/1024);
    toast('Đang nén sao lưu…');
    gzip(data).then(function(u8){
      var gzKB=Math.round(u8.length/1024);
      var pct=rawKB?Math.max(0,Math.round((1-gzKB/rawKB)*100)):0;
      downloadBlob(new Blob([u8],{type:'application/gzip'}), 'TD_backup_'+new Date().toISOString().slice(0,10)+'.json.gz');
      toast('Đã nén & tải sao lưu: '+rawKB+'KB → '+gzKB+'KB (-'+pct+'%)', {duration:6000});
    }).catch(function(){
      // fallback: tải JSON thô
      downloadBlob(new Blob([data],{type:'application/json'}), 'TD_backup_'+new Date().toISOString().slice(0,10)+'.json');
      toast('Trình duyệt không hỗ trợ nén — đã tải JSON thô.', {duration:6000});
    });
  }
  function restoreCompressed(){
    var inp=el('input',{type:'file',accept:'.gz,.json,application/gzip,application/json'});
    inp.style.display='none'; document.body.appendChild(inp);
    on(inp,'change',function(){
      var f=inp.files&&inp.files[0]; if(!f){ inp.remove(); return; }
      var done=function(text){
        try{
          var obj=JSON.parse(text); var ls=obj.ls||obj; var n=0;
          if(!confirm('Khôi phục sẽ GHI ĐÈ dữ liệu lưu cục bộ hiện tại. Tiếp tục?')){ inp.remove(); return; }
          for(var k in ls){ try{ localStorage.setItem(k, ls[k]); n++; }catch(e){} }
          toast('Đã khôi phục '+n+' mục. Tải lại trang để áp dụng.', {duration:7000});
        }catch(e){ toast('File sao lưu không hợp lệ.'); }
        inp.remove();
      };
      var fr=new FileReader();
      if(/\.gz$/i.test(f.name)){
        fr.onload=function(){ gunzip(new Uint8Array(fr.result)).then(done).catch(function(){ toast('Không giải nén được file.'); inp.remove(); }); };
        fr.readAsArrayBuffer(f);
      }else{
        fr.onload=function(){ done(String(fr.result)); };
        fr.readAsText(f);
      }
    });
    inp.click();
  }

  /* ======================================================
     3) KV store IndexedDB + migrate localStorage
  ====================================================== */
  var IDBP=null, IDB_NAME='tdup3', IDB_STORE='kv';
  function idbOpen(){
    if(IDBP) return IDBP;
    IDBP=new Promise(function(res,rej){
      if(!window.indexedDB){ rej(new Error('no-idb')); return; }
      var r=indexedDB.open(IDB_NAME,1);
      r.onupgradeneeded=function(){ r.result.createObjectStore(IDB_STORE); };
      r.onsuccess=function(){ res(r.result); };
      r.onerror=function(){ rej(r.error); };
    });
    return IDBP;
  }
  function idbTx(mode){ return idbOpen().then(function(db){ return db.transaction(IDB_STORE,mode).objectStore(IDB_STORE); }); }
  var kv={
    get:function(k){ return idbTx('readonly').then(function(s){ return new Promise(function(res,rej){ var r=s.get(k); r.onsuccess=function(){res(r.result);}; r.onerror=function(){rej(r.error);}; }); }); },
    set:function(k,v){ return idbTx('readwrite').then(function(s){ return new Promise(function(res,rej){ var r=s.put(v,k); r.onsuccess=function(){res(true);}; r.onerror=function(){rej(r.error);}; }); }); },
    del:function(k){ return idbTx('readwrite').then(function(s){ return new Promise(function(res,rej){ var r=s.delete(k); r.onsuccess=function(){res(true);}; r.onerror=function(){rej(r.error);}; }); }); },
    keys:function(){ return idbTx('readonly').then(function(s){ return new Promise(function(res,rej){ var r=s.getAllKeys?s.getAllKeys():null; if(!r){res([]);return;} r.onsuccess=function(){res(r.result||[]);}; r.onerror=function(){rej(r.error);}; }); }); }
  };
  // Di chuyển các key localStorage khớp predicate sang IndexedDB (không xoá bản gốc trừ khi remove=true)
  function migrateLocalStorage(predicate, remove){
    var moved=0, jobs=[];
    try{
      for(var i=0;i<localStorage.length;i++){
        var k=localStorage.key(i);
        if(predicate && !predicate(k)) continue;
        (function(key){ jobs.push(kv.set('ls:'+key, localStorage.getItem(key)).then(function(){ moved++; if(remove){ try{localStorage.removeItem(key);}catch(e){} } })); })(k);
      }
    }catch(e){}
    return Promise.all(jobs).then(function(){ return moved; });
  }

  /* ======================================================
     4) WEB VITALS đầy đủ (LCP / CLS / INP / TTFB / long-task)
  ====================================================== */
  var V={ LCP:null, CLS:0, INP:null, TTFB:null, longTasks:0 };
  function po(type,cb,opt){ try{ var o=new PerformanceObserver(function(l){ l.getEntries().forEach(cb); }); o.observe(Object.assign({type:type,buffered:true},opt||{})); return o; }catch(e){ return null; } }
  function initVitals(){
    try{ var nav=performance.getEntriesByType&&performance.getEntriesByType('navigation')[0]; if(nav)V.TTFB=Math.round(nav.responseStart); }catch(e){}
    po('largest-contentful-paint', function(e){ V.LCP=Math.round(e.startTime); paintVitals(); });
    po('layout-shift', function(e){ if(!e.hadRecentInput)V.CLS+=e.value; paintVitals(); });
    po('longtask', function(){ V.longTasks++; });
    // INP ≈ tương tác chậm nhất (event timing)
    var worst=0;
    po('event', function(e){ if(e.interactionId){ var d=e.duration; if(d>worst){ worst=d; V.INP=Math.round(d); paintVitals(); } } }, {durationThreshold:16});
    if(DEV){ var box=document.getElementById('tdup3-vitals'); if(box)box.classList.add('open'); paintVitals(); }
  }
  function cls(v,good,poor){ if(v==null)return ''; return v<=good?'ok':(v<=poor?'warn':'bad'); }
  function paintVitals(){
    var box=document.getElementById('tdup3-vitals'); if(!box||!box.classList.contains('open'))return;
    var clsScore=Math.round(V.CLS*1000)/1000;
    box.innerHTML='<b>Web Vitals</b>'+
      row('LCP', V.LCP==null?'…':V.LCP+'ms', cls(V.LCP,2500,4000))+
      row('INP', V.INP==null?'…':V.INP+'ms', cls(V.INP,200,500))+
      row('CLS', clsScore, cls(clsScore,0.1,0.25))+
      row('TTFB', V.TTFB==null?'…':V.TTFB+'ms', cls(V.TTFB,800,1800))+
      row('Long tasks', V.longTasks, cls(V.longTasks,2,6));
    function row(k,v,c){ return '<div class="tdup3-row"><span>'+k+'</span><span class="'+c+'">'+v+'</span></div>'; }
  }
  function vitals(){ return { LCP:V.LCP, INP:V.INP, CLS:Math.round(V.CLS*1000)/1000, TTFB:V.TTFB, longTasks:V.longTasks }; }
  function toggleVitals(){ var box=document.getElementById('tdup3-vitals'); if(!box)return; box.classList.toggle('open'); paintVitals(); }

  /* ======================================================
     5) content-visibility cho section ngoài viewport (bật/tắt)
  ====================================================== */
  var CV_ON=false;
  function cvCandidates(){
    var sel='.card,.panel,section,.report-section,.dashboard-card', set=[], seen={};
    var list=document.querySelectorAll(sel);
    for(var i=0;i<list.length;i++){
      var n=list[i];
      if(n.closest('#tdup-palette,#tdup-dock,#tdup3-vitals')) continue;
      if(n.querySelector('table.tdup2-grid')) continue;   // bảng đã virtual-scroll: bỏ qua
      var h=n.offsetHeight||0;
      if(h<400) continue;                                  // chỉ khối lớn
      set.push(n);
    }
    return set;
  }
  function setCV(onoff){
    CV_ON=!!onoff;
    var nodes=cvCandidates();
    for(var i=0;i<nodes.length;i++){
      if(CV_ON){ nodes[i].style.containIntrinsicSize=nodes[i].style.containIntrinsicSize||('auto '+(nodes[i].offsetHeight||600)+'px'); nodes[i].classList.add('tdup3-cv'); }
      else nodes[i].classList.remove('tdup3-cv');
    }
    toast(CV_ON?('content-visibility: BẬT cho '+nodes.length+' khối'):'content-visibility: TẮT');
  }
  function toggleCV(){ setCV(!CV_ON); }

  /* ======================================================
     6) FILTER CHIP + QUICK PRESET cho grid (Pack v2)
  ====================================================== */
  var PRESETS=[]; /* v13.9.2: bỏ chip lọc nhanh Quá hạn / Sắp đáo hạn / Nhóm 2-5 theo yêu cầu */
  function rowsOf(table){ var tb=table.tBodies&&table.tBodies[0]; return tb?Array.prototype.slice.call(tb.rows):[]; }
  function applyFilter(table, terms, qtext){
    var rows=rowsOf(table), q=(qtext||'').toLowerCase().trim();
    var hasTerms=terms&&terms.length;
    for(var i=0;i<rows.length;i++){
      var tr=rows[i]; var txt=(tr.textContent||'').toLowerCase();
      var ok=true;
      if(q && txt.indexOf(q)<0) ok=false;
      if(ok && hasTerms){
        ok=false; for(var t=0;t<terms.length;t++){ if(txt.indexOf(terms[t].toLowerCase())>=0){ ok=true; break; } }
      }
      if(ok) tr.classList.remove('tdup3-hidden'); else tr.classList.add('tdup3-hidden');
    }
  }
  function buildChips(table){
    if(table.__tdup3chips) return;
    var wrap=table.closest('.table-wrap')||table.parentNode; if(!wrap)return;
    var bar=el('div',{class:'tdup3-chips'});
    var active={};
    var q=el('input',{class:'tdup3-q',type:'search',placeholder:'Lọc nhanh…'});
    bar.appendChild(q);
    PRESETS.forEach(function(p){
      var c=el('button',{class:'tdup3-chip',type:'button'},p);
      on(c,'click',function(){ if(active[p]){delete active[p]; c.classList.remove('tdup3-on');} else {active[p]=1; c.classList.add('tdup3-on');} recompute(); });
      bar.appendChild(c);
    });
    var clear=el('button',{class:'tdup3-chip',type:'button'},'✕ Xoá lọc');
    on(clear,'click',function(){ active={}; q.value=''; bar.querySelectorAll('.tdup3-chip.tdup3-on').forEach(function(b){b.classList.remove('tdup3-on');}); recompute(); });
    bar.appendChild(clear);
    function recompute(){ applyFilter(table, Object.keys(active), q.value); }
    on(q,'input', debounce(recompute,180));
    wrap.parentNode.insertBefore(bar, wrap);
    table.__tdup3chips=true;
  }
  function enhanceFilters(){
    var tables=document.querySelectorAll('table.tdup2-grid');
    for(var i=0;i<tables.length;i++){ try{ buildChips(tables[i]); }catch(e){} }
  }

  /* ======================================================
     7) INSPECTOR PANEL — Alt+Click 1 dòng → TDUP2.drawer
  ====================================================== */
  function headerCells(table){
    var ths=table.querySelectorAll('thead th'); var out=[];
    for(var i=0;i<ths.length;i++) out.push((ths[i].textContent||'').trim()||('Cột '+(i+1)));
    return out;
  }
  function openInspector(tr){
    var table=tr.closest('table'); if(!table)return;
    var heads=headerCells(table), cells=tr.cells, html='<table class="tdup3-kv"><tbody>';
    for(var i=0;i<cells.length;i++){
      var v=(cells[i].textContent||'').trim();
      if(v==='' && (cells[i].querySelector('input,select')==null)) {} 
      var k=heads[i]||('Cột '+(i+1));
      html+='<tr><td class="k">'+escapeHtml(k)+'</td><td>'+escapeHtml(v)+'</td></tr>';
    }
    html+='</tbody></table>';
    if(window.TDUP2&&TDUP2.drawer){ TDUP2.drawer(html,{title:'Chi tiết bản ghi', width:560}); }
    else { toast('Cần Pack v2 để mở Inspector.'); }
  }
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];}); }
  function initInspector(){
    on(document, 'click', function(ev){
      if(!ev.altKey) return;
      var tr=ev.target&&ev.target.closest?ev.target.closest('.table-wrap tr, table.tdup2-grid tr'):null;
      if(!tr||!tr.cells||!tr.cells.length) return;
      if(tr.closest('thead')) return;
      ev.preventDefault(); openInspector(tr);
    });
  }

  /* ======================================================
     8) DOCK + COMMAND PALETTE
  ====================================================== */
  function addDockButtons(){
    var dock=document.getElementById('tdup-dock'); if(!dock)return;
    if(dock.querySelector('.tdup3-dock-btn')) return;
    var sep=el('span',{class:'tdup-sep'}); dock.appendChild(sep);
    var b1=el('button',{class:'tdup3-dock-btn',title:'Sao lưu nén (gzip)'},'⤓');
    on(b1,'click',backupCompressed); dock.appendChild(b1);
    var b2=el('button',{class:'tdup3-dock-btn',title:'Web Vitals'},'⚡');
    on(b2,'click',toggleVitals); dock.appendChild(b2);
  }
  function registerPaletteCommands(){
    if(!(window.TDUP&&TDUP.addCommand)) return;
    TDUP.addCommand('Sao lưu (nén gzip)', 'Perf', backupCompressed);
    TDUP.addCommand('Phục hồi từ sao lưu', 'Perf', restoreCompressed);
    TDUP.addCommand('Bật/tắt Web Vitals', 'Perf', toggleVitals);
    TDUP.addCommand('Bật/tắt content-visibility', 'Perf', toggleCV);
    TDUP.addCommand('Di chuyển cache → IndexedDB', 'Perf', function(){
      migrateLocalStorage(function(k){ return /backup|snapshot|cache|view|td_/i.test(k); }, false).then(function(n){ toast('Đã sao chép '+n+' mục sang IndexedDB.'); });
    });
  }

  /* ======================================================
     EXPOSE + KHỞI ĐỘNG
  ====================================================== */
  window.TDUP3 = {
    version:'3.0',
    run:run, sha1:sha1,
    gzip:gzip, gunzip:gunzip, abToB64:abToB64, b64ToU8:b64ToU8,
    backup:backupCompressed, restore:restoreCompressed,
    kv:kv, migrateLocalStorage:migrateLocalStorage,
    vitals:vitals, toggleVitals:toggleVitals,
    setContentVisibility:setCV, toggleContentVisibility:toggleCV,
    enhanceFilters:enhanceFilters, openInspector:openInspector,
    aggregate:function(rows,keyIdx,valIdx){ return run('aggregate',{rows:rows,keyIdx:keyIdx,valIdx:valIdx}); }
  };

  initVitals();
  idle(function(){
    addDockButtons();
    registerPaletteCommands();
    initInspector();
    enhanceFilters();
    if(window.MutationObserver){
      try{ new MutationObserver(throttle(function(){ enhanceFilters(); addDockButtons(); },800)).observe(document.body,{childList:true,subtree:true}); }catch(e){}
    }
  });

  try{ performance.mark && performance.mark('TDUP3-ready'); }catch(e){}
  (0)&&console.log('%cTD Upgrade Pack v3 (Perf Hardening) đã sẵn sàng.','color:#0F3D73;font-weight:bold');
})();
