
(function(){
  'use strict';
  if (window.TDUP) return; // idempotent

  // ---------- storage (fallback to localStorage if TD.ls absent) ----------
  var LS = (window.TD && window.TD.ls) ? window.TD.ls : {
    get:function(k,d){ try{ var v=localStorage.getItem('tdup.'+k); return v==null?d:JSON.parse(v); }catch(e){return d;} },
    set:function(k,v){ try{ localStorage.setItem('tdup.'+k, JSON.stringify(v)); }catch(e){} }
  };

  // ---------- helpers ----------
  function debounce(fn,wait){var t;return function(){var a=arguments,c=this;clearTimeout(t);t=setTimeout(function(){fn.apply(c,a);},wait||200);};}
  function throttle(fn,wait){var last=0,t;return function(){var now=Date.now(),a=arguments,c=this;var rem=wait-(now-last);if(rem<=0){clearTimeout(t);t=null;last=now;fn.apply(c,a);}else if(!t){t=setTimeout(function(){last=Date.now();t=null;fn.apply(c,a);},rem);}};}
  function idle(fn){ return (window.requestIdleCallback||function(f){return setTimeout(f,1);})(fn); }
  function sha1(text){
    if (window.crypto && crypto.subtle){
      var buf = new TextEncoder().encode(text);
      return crypto.subtle.digest('SHA-1', buf).then(function(h){
        return Array.prototype.map.call(new Uint8Array(h), function(b){return ('00'+b.toString(16)).slice(-2);}).join('');
      });
    }
    return Promise.reject(new Error('SubtleCrypto unavailable'));
  }

  // ---------- toast ----------
  var TOASTS = document.getElementById('tdup-toasts');
  function toast(msg, opts){ opts = opts || {}; return TD.toast(msg, { duration: opts.duration || 4000, action: opts.action }).el; } // HM-16c: dùng chung TD.toast

  // ---------- theme & density ----------
  // HM-16c: gỡ chế độ tối (tương phản không đạt ở các trang chính) — giao diện chỉ còn sáng
  var DENS   = ['comfortable','compact','spacious'];
  function applyTheme(){ document.documentElement.setAttribute('data-tdup-theme', 'light'); }
  function applyDensity(d){
    document.documentElement.setAttribute('data-tdup-density', d);
    LS.set('density', d);
  }
  applyTheme();
  applyDensity(LS.get('density','comfortable'));

  // ---------- command palette ----------
  var PAL = document.getElementById('tdup-palette-backdrop');
  var PAL_INPUT = PAL.querySelector('input');
  var PAL_LIST  = PAL.querySelector('ul');
  var PAL_ITEMS = [];
  var PAL_ACTIVE = 0;

  function collectCommands(){
    var out = [];
    var seen = Object.create(null);
    function push(label, hint, onRun){
      label = (label||'').replace(/\s+/g,' ').trim();
      if (!label || label.length>80 || seen[label]) return;
      seen[label]=1; out.push({label:label, hint:hint||'', run:onRun});
    }
    // Built-in commands
    push('Đổi mật độ hiển thị (Compact/Comfortable/Spacious)', 'Density', function(){ cycleDensity(); });
    push('Mở Export Center', 'Ctrl+E', function(){ tryExportCenter(); });
    push('In trang hiện tại', 'Ctrl+P', function(){ window.print(); });
    push('Cuộn lên đầu trang', '', function(){ window.scrollTo({top:0,behavior:'smooth'}); });
    push('Hiện phím tắt', 'Ctrl+/', function(){ showHelp(); });

    // QA-FEATURE: tim kiem toan cuc theo ten/ma KH tu DATA.qltd - nhay thang den dung
    // trang phu hop (theo loai vay) va tu dien vao o tim kiem cua trang do.
    try {
      var qseen = Object.create(null);
      var qrows = (window.DATA && DATA.qltd) ? DATA.qltd : [];
      var PAGE_BY_LOAI = function (loai) {
        var s = (loai || '').toLowerCase();
        if (s.indexOf('ngắn') >= 0) return 'kd';
        if (s.indexOf('trung') >= 0 || s.indexOf('dài') >= 0) return 'td';
        if (s.indexOf('thấu chi') >= 0) return 'kd';
        return 'kd';
      };
      for (var qi = 0; qi < qrows.length; qi++) {
        var qr = qrows[qi];
        var qma = String(qr[0] || '').trim();
        if (!qma || qseen[qma]) continue;
        qseen[qma] = 1;
        (function (ma, ten, loai) {
          push('👤 ' + ten + ' — ' + ma, 'Khách hàng · Enter để mở', function () {
            var target = PAGE_BY_LOAI(loai);
            showPage(target);
            setTimeout(function () {
              var inp = document.getElementById('search-' + target);
              if (inp) { inp.value = ten; inp.dispatchEvent(new Event('input')); inp.scrollIntoView({block:'center'}); }
            }, 150);
          });
        })(qma, String(qr[1] || qma), qr[13]);
      }
    } catch (eKH) { console.warn('[palette KH]', eKH); }

    // Scan visible navigation/action elements
    var sels = ['nav a','nav button','aside a','aside button','.menu a','.menu button',
                '[role="tab"]','.tab','.tab-btn','.nav-link','.sidebar a','.sidebar button',
                'header a','header button','.toolbar button','.btn[data-act]','button[data-target]'];
    var nodes = document.querySelectorAll(sels.join(','));
    Array.prototype.forEach.call(nodes, function(el){
      if (el.closest('#tdup-dock,#tdup-palette,#tdup-toasts')) return;
      var rect = el.getBoundingClientRect();
      if (rect.width===0 && rect.height===0) return;
      var label = el.getAttribute('aria-label') || el.title || el.innerText || el.textContent || '';
      push(label, el.tagName.toLowerCase(), function(){ try{ el.click(); el.scrollIntoView({block:'center'}); }catch(e){} });
    });
    return out;
  }

  function renderPalette(filter){
    var q = (filter||'').toLowerCase().trim();
    var list = PAL_ITEMS.filter(function(c){ return !q || c.label.toLowerCase().indexOf(q)>=0; }).slice(0,40);
    PAL_LIST.innerHTML = '';
    if (!list.length){
      var d = document.createElement('div'); d.className='tdup-empty'; d.textContent='Không tìm thấy.';
      PAL_LIST.appendChild(d); return;
    }
    list.forEach(function(c,i){
      var li = document.createElement('li');
      li.textContent = c.label;
      if (c.hint){ var s = document.createElement('small'); s.textContent = c.hint; li.appendChild(s); }
      if (i===PAL_ACTIVE) li.classList.add('active');
      li.addEventListener('click', function(){ closePalette(); c.run(); });
      PAL_LIST.appendChild(li);
    });
    PAL._list = list;
  }
  function openPalette(){
    PAL_ITEMS = collectCommands();
    PAL_ACTIVE = 0;
    PAL_INPUT.value = '';
    renderPalette('');
    PAL.classList.add('open');
    setTimeout(function(){ PAL_INPUT.focus(); }, 10);
  }
  function closePalette(){ PAL.classList.remove('open'); }
  PAL_INPUT.addEventListener('input', debounce(function(){ PAL_ACTIVE=0; renderPalette(PAL_INPUT.value); }, 80));
  PAL_INPUT.addEventListener('keydown', function(e){
    var items = PAL._list || [];
    if (e.key==='ArrowDown'){ e.preventDefault(); PAL_ACTIVE=Math.min(items.length-1,PAL_ACTIVE+1); renderPalette(PAL_INPUT.value); }
    else if (e.key==='ArrowUp'){ e.preventDefault(); PAL_ACTIVE=Math.max(0,PAL_ACTIVE-1); renderPalette(PAL_INPUT.value); }
    else if (e.key==='Enter'){ e.preventDefault(); var c = items[PAL_ACTIVE]; if (c){ closePalette(); c.run(); } }
    else if (e.key==='Escape'){ e.preventDefault(); closePalette(); }
  });
  PAL.addEventListener('click', function(e){ if (e.target===PAL) closePalette(); });

  // ---------- actions ----------
  function cycleDensity(){
    var cur = LS.get('density','comfortable');
    var next = DENS[(DENS.indexOf(cur)+1) % DENS.length];
    applyDensity(next); toast('Mật độ: '+next);
  }
  function tryExportCenter(){
    var fn = window.exportCenterOpen || window.openExportCenter;
    if (typeof fn==='function'){ try{ fn(); return; }catch(e){} }
    // fallback: tìm nút export trong DOM
    var btn = document.querySelector('[data-act*="export" i],[onclick*="export" i],button[title*="Export" i]');
    if (btn) btn.click(); else toast('Không tìm thấy Export Center');
  }
  function showHelp(){
    toast('Ctrl+K: Palette · Ctrl+/: Trợ giúp · Ctrl+E: Export · Esc: Đóng', {duration:6000});
  }

  // ---------- dock buttons ----------
  document.getElementById('tdup-dock').addEventListener('click', function(e){
    var b = e.target.closest('button[data-tdup-act]'); if (!b) return;
    var act = b.getAttribute('data-tdup-act');
    if (act==='palette') openPalette();
    else if (act==='density') cycleDensity();
    else if (act==='help') showHelp();
  });

  // ---------- global shortcuts ----------
  document.addEventListener('keydown', function(e){
    var mod = e.ctrlKey || e.metaKey;
    var tgt = e.target;
    var inField = tgt && (tgt.tagName==='INPUT' || tgt.tagName==='TEXTAREA' || tgt.isContentEditable);

    if (mod && e.key==='/'){ e.preventDefault(); showHelp(); return; }
    // HM-13b: Ctrl+K / Ctrl+E do TD.keys (HM-15) xử lý — đã gỡ (Export Center vẫn mở được từ bảng lệnh)
    if (e.key==='Escape' && PAL.classList.contains('open')){ closePalette(); }
  });

  // ---------- sticky header opt-in: ?tdup=grid hoặc tự bật cho .table-wrap có nhiều dòng ----------
  idle(function(){
    try{
      var auto = /([?&])tdup=grid/.test(location.search);
      if (!auto) return;
      document.querySelectorAll('.table-wrap table').forEach(function(t){
        if (t.tBodies[0] && t.tBodies[0].rows.length>50) t.classList.add('tdup-grid');
      });
    }catch(e){}
  });

  // ---------- web vitals (chỉ khi ?dev=1) ----------
  if (/([?&])dev=1/.test(location.search) && 'PerformanceObserver' in window){
    try{
      new PerformanceObserver(function(list){
        list.getEntries().forEach(function(e){ (0)&&console.log('[TDUP/LCP]', Math.round(e.startTime),'ms', e.element||''); });
      }).observe({type:'largest-contentful-paint', buffered:true});
      new PerformanceObserver(function(list){
        list.getEntries().forEach(function(e){ if (e.duration>50) (0)&&console.log('[TDUP/long-task]', Math.round(e.duration),'ms'); });
      }).observe({type:'longtask', buffered:true});
    }catch(e){}
  }

  // ---------- expose ----------
  window.TDUP = {
    version: '1.0',
    debounce: debounce, throttle: throttle, idle: idle, sha1: sha1,
    toast: toast,
    palette: { open: openPalette, close: closePalette },
    density: { set: applyDensity, cycle: cycleDensity }
  };

  try{ performance.mark && performance.mark('TDUP-ready'); }catch(e){}
  (0)&&console.log('%cTD Upgrade Pack v1 đã sẵn sàng. Nhấn Ctrl+K.','color:#0F3D73;font-weight:bold');
})();
