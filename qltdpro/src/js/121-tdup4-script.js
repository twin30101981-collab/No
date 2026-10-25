
(function(){
  'use strict';
  if (new URLSearchParams(location.search).get('tdup4')==='off') {
    try{ var b=document.createElement('div'); b.className='tdup4-badge off'; b.textContent='Pack v4: off'; document.body.appendChild(b);}catch(_){}
    return;
  }
  var TDUP4 = window.TDUP4 = { version: '4.0.0' };
  var TDUP = window.TDUP || {};
  var TDUP2 = window.TDUP2 || {};
  var TDUP3 = window.TDUP3 || {};
  var toast = (TDUP.toast) ? TDUP.toast : function(m){ try{(0)&&console.log('[toast]',m);}catch(_){} };
  function addCmd(name, run, group){
    try { if (TDUP.palette && TDUP.palette.addCommand) TDUP.palette.addCommand({name:name, run:run, group:group||'Perf v4'}); } catch(_){}
  }

  /* ---------- 7) delegate + TD.bus shim (đặt sớm) ---------- */
  if (!window.TD) window.TD = {};
  if (!window.TD.bus) {
    var _map = {};
    window.TD.bus = {
      on:  function(ev,fn){ (_map[ev]=_map[ev]||[]).push(fn); return function(){ _map[ev]=(_map[ev]||[]).filter(function(f){return f!==fn;}); }; },
      off: function(ev,fn){ _map[ev]=(_map[ev]||[]).filter(function(f){return f!==fn;}); },
      emit:function(ev,p){ (_map[ev]||[]).slice().forEach(function(f){ try{f(p);}catch(e){console.error(e);} }); }
    };
  }
  TDUP4.delegate = function(root, selector, act, handler){
    (root||document).addEventListener('click', function(e){
      var t = e.target.closest(selector);
      if (!t) return;
      if (act && t.getAttribute('data-act') !== act) return;
      try { handler(e, t); } catch(err){ console.error(err); }
    });
  };

  /* ---------- 1) XLSX parse off-thread (giữ chữ ký) ---------- */
  TDUP4.installXlsxWorker = function(){
    if (!window.XLSX || typeof XLSX.read !== 'function') return false;
    if (XLSX.__tdup4Patched) return true;
    var origRead = XLSX.read.bind(XLSX);
    XLSX.read = function(data, opts){
      // Đồng bộ — không thể async hoá an toàn mà không sửa caller.
      // Vẫn giữ main-thread parse nhưng hiển thị toast tiến độ + yield idle.
      try { toast('Đang đọc file Excel...'); } catch(_){}
      var t0 = performance.now();
      var wb = origRead(data, opts);
      var dt = (performance.now()-t0)|0;
      try { toast('Đã đọc Excel ('+dt+'ms)'); } catch(_){}
      return wb;
    };
    // Bản async tuỳ chọn cho code mới: TDUP4.readXlsxAsync(arrayBuffer)
    TDUP4.readXlsxAsync = function(arrayBuffer, opts){
      return new Promise(function(resolve){
        try { TDUP.idle ? TDUP.idle(function(){ resolve(origRead(arrayBuffer, opts)); }) : setTimeout(function(){ resolve(origRead(arrayBuffer, opts)); },0); }
        catch(e){ resolve(origRead(arrayBuffer, opts)); }
      });
    };
    XLSX.__tdup4Patched = true;
    return true;
  };
  TDUP4.installXlsxWorker();
  // Thử lại sau khi DOM load (XLSX có thể load chậm)
  setTimeout(TDUP4.installXlsxWorker, 1500);

  /* ---------- 2) Auto-nén backup tại nguồn ---------- */
  TDUP4.installBackupHook = function(){
    if (typeof window.TD_BACKUP !== 'function') return false;
    if (window.TD_BACKUP.__tdup4Wrapped) return true;
    var orig = window.TD_BACKUP;
    window.TD_BACKUP = function(){
      var ev = (arguments[0] && arguments[0].shiftKey);
      var ret = orig.apply(this, arguments);
      if (ev || !TDUP3.gzip) return ret;
      // Nếu kết quả là chuỗi JSON, nén song song
      Promise.resolve(ret).then(function(r){
        if (typeof r === 'string' && r.length > 4000) {
          TDUP3.gzip(r).then(function(bin){
            var blob = new Blob([bin], {type:'application/gzip'});
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url; a.download = 'TD_backup_'+(new Date().toISOString().slice(0,10))+'.json.gz';
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
            var pct = ((1 - bin.length/r.length)*100).toFixed(0);
            toast('Sao lưu nén: '+(r.length>>10)+'KB → '+(bin.length>>10)+'KB (-'+pct+'%)');
          }).catch(function(){});
        }
      });
      return ret;
    };
    window.TD_BACKUP.__tdup4Wrapped = true;
    return true;
  };
  TDUP4.installBackupHook();
  setTimeout(TDUP4.installBackupHook, 1500);

  /* ---------- 3) Preset filter theo cột thật ---------- */
  function vnDate(s){
    if(!s) return null;
    var m = String(s).match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
    if(!m) return null;
    var y = +m[3]; if(y<100) y+=2000;
    var d = new Date(y, +m[2]-1, +m[1]);
    return isNaN(d) ? null : d;
  }
  function findColIdx(table, regex){
    var ths = table.querySelectorAll('thead th, tr:first-child th, tr:first-child td');
    for (var i=0;i<ths.length;i++){ if (regex.test((ths[i].textContent||'').trim())) return i; }
    return -1;
  }
  TDUP4.enhanceColumnFilters = function(table){
    if (!table || table.__tdup4Enhanced) return;
    table.__tdup4Enhanced = true;
    var wrap = table.closest('.table-wrap') || table.parentNode;
    if (!wrap) return;
    var bar = document.createElement('div');
    bar.className = 'tdup4-filterbar';
    bar.style.cssText = 'padding:4px 6px;display:flex;flex-wrap:wrap;align-items:center;gap:4px';
    var idxNhom = findColIdx(table, /nh[oó]m\s*n[ợo]/i);
    var idxDH   = findColIdx(table, /(ng[aà]y\s*)?[đd][aá]o\s*h[ạa]n/i);
    function applyPreset(name, fn){
      var rows = table.tBodies[0] ? table.tBodies[0].rows : table.querySelectorAll('tr');
      Array.prototype.forEach.call(rows, function(tr){
        var keep = fn(tr);
        tr.style.display = keep ? '' : 'none';
      });
    }
    function chip(label, fn){
      var c = document.createElement('span');
      c.className = 'tdup4-chip'; c.textContent = label;
      c.onclick = function(){
        var was = c.classList.contains('active');
        bar.querySelectorAll('.tdup4-chip').forEach(function(x){x.classList.remove('active');});
        if (was) { applyPreset('off', function(){return true;}); return; }
        c.classList.add('active'); fn();
      };
      bar.appendChild(c); return c;
    }
    chip('Tất cả', function(){ applyPreset('all', function(){return true;}); });
    if (idxNhom>=0) {
      chip('Nhóm 2-5', function(){ applyPreset('n25', function(tr){
        var c = tr.cells[idxNhom]; if(!c) return false;
        var n = parseInt((c.textContent||'').replace(/[^0-9]/g,''),10);
        return n>=2 && n<=5;
      });});
      chip('Nhóm 1', function(){ applyPreset('n1', function(tr){
        var c = tr.cells[idxNhom]; if(!c) return false;
        return (c.textContent||'').trim()==='1';
      });});
    }
    if (idxDH>=0) {
      chip('Quá hạn', function(){ applyPreset('over', function(tr){
        var c = tr.cells[idxDH]; if(!c) return false;
        var d = vnDate(c.textContent); return d && d < todayMidnight();
      });});
      chip('Đáo hạn ≤ 30 ngày', function(){ applyPreset('dh30', function(tr){
        var c = tr.cells[idxDH]; if(!c) return false;
        var d = vnDate(c.textContent); if(!d) return false;
        var diff = (d - todayMidnight())/86400000;
        return diff>=0 && diff<=30;
      });});
      // Custom range
      var dr = document.createElement('span'); dr.className='tdup4-daterange';
      var i1 = document.createElement('input'); i1.type='date';
      var i2 = document.createElement('input'); i2.type='date';
      var go = document.createElement('button'); go.className='tdup4-chip'; go.textContent='Lọc khoảng';
      go.onclick = function(){
        var a = i1.value ? new Date(i1.value) : null;
        var b = i2.value ? new Date(i2.value) : null;
        applyPreset('range', function(tr){
          var c = tr.cells[idxDH]; if(!c) return false;
          var d = vnDate(c.textContent); if(!d) return false;
          if (a && d<a) return false;
          if (b && d>b) return false;
          return true;
        });
      };
      dr.appendChild(i1); dr.appendChild(document.createTextNode('→')); dr.appendChild(i2); dr.appendChild(go);
      bar.appendChild(dr);
    }
    if (bar.childNodes.length>1) wrap.insertBefore(bar, wrap.firstChild);
  };
  TDUP4.rescanFilters = function(){
    document.querySelectorAll('table.tdup2-grid, .table-wrap > table').forEach(function(t){
      try { TDUP4.enhanceColumnFilters(t); } catch(e){ console.warn(e); }
    });
  };
  setTimeout(TDUP4.rescanFilters, 800);

  /* ---------- 4) Unified config export/import ---------- */
  TDUP4.exportConfig = async function(){
    var cfg = { _meta:{ created: new Date().toISOString(), version:'v4' }, ls:{}, kv:{} };
    try {
      for (var i=0;i<localStorage.length;i++){
        var k = localStorage.key(i);
        if (/^tdup/.test(k)) cfg.ls[k] = localStorage.getItem(k);
      }
    } catch(_){}
    try {
      if (TDUP3.kv && TDUP3.kv.keys) {
        var keys = await TDUP3.kv.keys();
        for (var j=0;j<keys.length;j++){ cfg.kv[keys[j]] = await TDUP3.kv.get(keys[j]); }
      }
    } catch(_){}
    var blob = new Blob([JSON.stringify(cfg,null,2)], {type:'application/json'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href=url; a.download='td-config-'+(new Date().toISOString().slice(0,10))+'.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){URL.revokeObjectURL(url);},1000);
    toast('Đã xuất cấu hình');
  };
  TDUP4.importConfig = function(){
    var inp = document.createElement('input'); inp.type='file'; inp.accept='.json,application/json';
    inp.onchange = function(){
      var f = inp.files[0]; if(!f) return;
      var r = new FileReader();
      r.onload = async function(){
        try {
          var cfg = JSON.parse(r.result);
          if (!confirm('Ghi đè cấu hình hiện tại? Các view, theme, density… sẽ được nạp lại.')) return;
          if (cfg.ls) Object.keys(cfg.ls).forEach(function(k){ try{ localStorage.setItem(k, cfg.ls[k]); }catch(_){} });
          if (cfg.kv && TDUP3.kv && TDUP3.kv.set) {
            for (var k in cfg.kv) { await TDUP3.kv.set(k, cfg.kv[k]); }
          }
          toast('Đã nhập cấu hình. Tải lại trang...');
          setTimeout(function(){ location.reload(); }, 600);
        } catch(e){ alert('File cấu hình không hợp lệ: '+e.message); }
      };
      r.readAsText(f);
    };
    inp.click();
  };
  addCmd('Xuất cấu hình (views/theme/KV)', TDUP4.exportConfig, 'Perf v4');
  addCmd('Nhập cấu hình từ file...', TDUP4.importConfig, 'Perf v4');

  /* ---------- 5) Web Vitals ring-buffer + export CSV ---------- */
  TDUP4.vitalsLog = [];
  TDUP4._record = function(metric, value, extra){
    TDUP4.vitalsLog.push({t: Date.now(), metric: metric, value: value, extra: extra||null});
    if (TDUP4.vitalsLog.length > 500) TDUP4.vitalsLog.shift();
    try {
      if (TDUP3.kv && TDUP3.kv.set) { var pr = TDUP3.kv.set('tdup4.vitals', TDUP4.vitalsLog.slice(-200)); if (pr && pr.catch) pr.catch(function(){}); } /* P09: kv.set trả Promise — IndexedDB bị chặn thì từ chối ('no-idb'), try/catch không bắt được ⇒ lỗi chưa bắt liên tục */
    } catch(_){}
    var ep = new URLSearchParams(location.search).get('vitals-endpoint');
    if (ep && navigator.sendBeacon) {
      try { navigator.sendBeacon(ep, JSON.stringify({metric:metric, value:value, t:Date.now(), ua:navigator.userAgent})); } catch(_){}
    }
  };
  try {
    if ('PerformanceObserver' in window) {
      try { new PerformanceObserver(function(l){ l.getEntries().forEach(function(e){ TDUP4._record('LCP', e.renderTime||e.loadTime||e.startTime); }); }).observe({type:'largest-contentful-paint', buffered:true}); } catch(_){}
      try { new PerformanceObserver(function(l){ l.getEntries().forEach(function(e){ if(!e.hadRecentInput) TDUP4._record('CLS', e.value); }); }).observe({type:'layout-shift', buffered:true}); } catch(_){}
      try { new PerformanceObserver(function(l){ l.getEntries().forEach(function(e){ TDUP4._record('long-task', e.duration|0); }); }).observe({type:'longtask', buffered:true}); } catch(_){}
      try { new PerformanceObserver(function(l){ l.getEntries().forEach(function(e){ TDUP4._record('INP', e.duration|0, e.name); }); }).observe({type:'event', buffered:true, durationThreshold:40}); } catch(_){}
    }
  } catch(_){}
  TDUP4.exportVitalsCsv = function(){
    var rows = [['time_iso','metric','value','extra']];
    TDUP4.vitalsLog.forEach(function(r){ rows.push([new Date(r.t).toISOString(), r.metric, r.value, r.extra||'']); });
    var csv = rows.map(function(r){ return r.map(function(c){ return '"'+String(c).replace(/"/g,'""')+'"'; }).join(','); }).join('\n');
    var blob = new Blob([csv], {type:'text/csv'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href=url; a.download='td-vitals-'+Date.now()+'.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){URL.revokeObjectURL(url);},1000);
    toast('Đã xuất '+TDUP4.vitalsLog.length+' bản ghi vitals');
  };
  addCmd('Xuất nhật ký Web Vitals (CSV)', TDUP4.exportVitalsCsv, 'Perf v4');

  /* ---------- 6) Service Worker (chỉ khi http/https, không phải preview) ---------- */
  TDUP4.installSW = function(){
    if (!('serviceWorker' in navigator)) return;
    if (!/^https?:$/.test(location.protocol)) return;
    var host = location.hostname;
    if (/^(id-preview--|preview--)/.test(host)) return;
    if (/lovable(project)?(-dev)?\.com$/.test(host)) return;
    var swSrc = "self.addEventListener('install',e=>self.skipWaiting());" +
      "self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));" +
      "self.addEventListener('fetch',e=>{var r=e.request;if(r.method!=='GET')return;" +
      "var u=new URL(r.url);if(u.origin!==location.origin && !/cdn|fonts|jsdelivr|unpkg/.test(u.hostname))return;" +
      "e.respondWith(caches.open('tdup4-v1').then(c=>c.match(r).then(hit=>{" +
      "var nw=fetch(r).then(res=>{try{c.put(r,res.clone());}catch(_){}return res;}).catch(()=>hit);" +
      "return hit||nw;})));});";
    try {
      var blob = new Blob([swSrc], {type:'application/javascript'});
      var url = URL.createObjectURL(blob);
      navigator.serviceWorker.register(url).then(function(){ toast('Đã bật cache offline'); }).catch(function(){});
    } catch(_){}
  };
  TDUP4.uninstallSW = function(){
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.getRegistrations().then(function(rs){
      rs.forEach(function(r){ r.unregister(); });
      toast('Đã tắt cache offline');
    });
  };
  addCmd('Bật cache offline (Service Worker)', TDUP4.installSW, 'Perf v4');
  addCmd('Tắt cache offline (Service Worker)', TDUP4.uninstallSW, 'Perf v4');

  /* ---------- Badge ---------- */
  try {
    var badge = document.createElement('div');
    badge.className = 'tdup4-badge'; badge.textContent = 'Pack v4 ready';
    document.body.appendChild(badge);
    setTimeout(function(){ badge.style.transition='opacity .6s'; badge.style.opacity='0'; setTimeout(function(){badge.remove();},700); }, 2200);
  } catch(_){}

  (0)&&console.log('%cTD Upgrade Pack v4 ready', 'color:#15803d;font-weight:bold');
})();
