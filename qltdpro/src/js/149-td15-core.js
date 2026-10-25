
(function(){
  'use strict';
  if (window.TD15) return;
  var TD15 = window.TD15 = { version:'15.0.0', errors:[] };
  var DEV = /[?&]dev=1/.test(location.search);
  function say(msg, color){ try{ (window.toast||window.showToast)(msg, color||'green'); }catch(_){ } }

  /* ── Q5 · Bộ xử lý lỗi tập trung ───────────────────────────── */
  var box = document.getElementById('td15-err'), hideT;
  function report(code, err, silent){
    var rec = { code:code, msg:(err && (err.message||err)) + '', at:new Date().toISOString() };
    TD15.errors.push(rec); if (TD15.errors.length > 200) TD15.errors.shift();
    try{ console.error('[TD15]['+code+']', err); }catch(_){}
    if (silent) return rec;
    if (box){ box.textContent = '⚠️ Lỗi ' + code + ': ' + rec.msg; box.style.display='block';
      clearTimeout(hideT); hideT = setTimeout(function(){ box.style.display='none'; }, 8000); }
    return rec;
  }
  TD15.report = report;
  TD15.wrap = function(code, fn){ return function(){ try{ return fn.apply(this, arguments); }catch(e){ report(code, e); } }; };
  window.addEventListener('error', function(e){ report('JS-RUNTIME', e.error || e.message, true); });
  window.addEventListener('unhandledrejection', function(e){ report('PROMISE', e.reason, true); });

  /* ── Q4 · Một vòng điều phối duy nhất, tự dừng khi tab ẩn ──── */
  var jobs = [], tickId = null, last = 0;
  function loop(ts){
    tickId = requestAnimationFrame(loop);
    if (document.hidden || ts - last < 250) return; last = ts;
    var now = Date.now();
    for (var i=0;i<jobs.length;i++){ var j = jobs[i];
      if (now - j.last >= j.ms){ j.last = now; try{ j.fn(); }catch(e){ report('TIMER:'+j.name, e, true); } } }
  }
  TD15.every = function(name, ms, fn){ jobs.push({name:name, ms:ms, fn:fn, last:Date.now()}); return name; };
  TD15.stop  = function(name){ jobs = jobs.filter(function(j){ return j.name !== name; }); };
  tickId = requestAnimationFrame(loop);

  /* ── Q1 · Kiểm tra ID trùng khi khởi động ──────────────────── */
  TD15.auditIds = function(){
    var m = Object.create(null), dup = [];
    document.querySelectorAll('[id]').forEach(function(e){ m[e.id] = (m[e.id]||0)+1; });
    for (var k in m) if (m[k] > 1) dup.push(k + ' ×' + m[k]);
    if (dup.length) report('DOM-DUP-ID', 'ID trùng: ' + dup.join(', '), !DEV);
    else if (DEV) console.info('[TD15] Không có ID trùng ✔');
    return dup;
  };

  /* ── D2 · Sao lưu / phục hồi JSON có kiểm tra toàn vẹn ─────── */
  function sum(str){ var h = 5381; for (var i=0;i<str.length;i++){ h = ((h<<5)+h+str.charCodeAt(i))>>>0; } return h.toString(16); }
  TD15.backup = function(){
    var data = {};
    try{ for (var i=0;i<localStorage.length;i++){ var k = localStorage.key(i); data[k] = localStorage.getItem(k); } }
    catch(e){ return report('BACKUP-READ', e); }
    var body = JSON.stringify(data);
    var pack = { app:'HSVV-PRO', schema:15, at:new Date().toISOString(), checksum:sum(body), data:data };
    var url = URL.createObjectURL(new Blob([JSON.stringify(pack)], {type:'application/json'}));
    var a = document.createElement('a');
    a.href = url; a.download = 'hsvv-backup-' + new Date().toISOString().slice(0,10) + '.json';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){ URL.revokeObjectURL(url); }, 4000);
    say('💾 Đã tạo tệp sao lưu toàn bộ dữ liệu', 'green');
    return pack;
  };
  TD15.restore = function(file){
    return new Promise(function(res, rej){
      var fr = new FileReader();
      fr.onload = function(){
        try{
          var pack = JSON.parse(fr.result);
          if (!pack || pack.app !== 'HSVV-PRO') throw new Error('Tệp sao lưu không hợp lệ');
          if (pack.checksum && pack.checksum !== sum(JSON.stringify(pack.data))) throw new Error('Tệp sao lưu bị hỏng (sai mã kiểm tra)');
          Object.keys(pack.data).forEach(function(k){ localStorage.setItem(k, pack.data[k]); });
          say('✅ Phục hồi dữ liệu thành công — đang tải lại', 'green');
          setTimeout(function(){ location.reload(); }, 900); res(true);
        }catch(e){ report('RESTORE', e); rej(e); }
      };
      fr.onerror = function(){ rej(report('RESTORE-READ', fr.error)); };
      fr.readAsText(file);
    });
  };
  TD15.pickRestore = function(){
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = function(){ if (inp.files && inp.files[0]) TD15.restore(inp.files[0]); };
    inp.click();
  };

  /* ── D3 · Tự lưu nháp 30 giây, giữ 10 phiên bản gần nhất ───── */
  var SNAP = 'td15.snapshots';
  function snapshot(){
    try{
      var payload = {};
      for (var i=0;i<localStorage.length;i++){ var k = localStorage.key(i);
        if (k.indexOf('td15.') === 0) continue; payload[k] = localStorage.getItem(k); }
      var body = JSON.stringify(payload);
      var list = JSON.parse(localStorage.getItem(SNAP) || '[]');
      if (list.length && list[list.length-1].checksum === sum(body)) return;
      list.push({ at:new Date().toISOString(), checksum:sum(body), body:body });
      while (list.length > 10) list.shift();
      localStorage.setItem(SNAP, JSON.stringify(list));
    }catch(e){ report('AUTOSAVE', e, true); }
  }
  TD15.snapshots = function(){ try{ return JSON.parse(localStorage.getItem(SNAP)||'[]').map(function(s){ return {at:s.at, checksum:s.checksum}; }); }catch(_){ return []; } };
  TD15.rollback = function(idx){
    try{
      var list = JSON.parse(localStorage.getItem(SNAP)||'[]'), s = list[idx == null ? list.length-1 : idx];
      if (!s) throw new Error('Không có bản nháp nào');
      var d = JSON.parse(s.body); Object.keys(d).forEach(function(k){ localStorage.setItem(k, d[k]); });
      say('↩️ Đã khôi phục bản nháp ' + s.at, 'orange'); setTimeout(function(){ location.reload(); }, 900);
    }catch(e){ report('ROLLBACK', e); }
  };
  TD15.every('autosave', 30000, snapshot);

  /* ── D5 · Kiểm tra biểu mẫu trước khi xuất ─────────────────── */
  TD15.validate = function(scope){
    var root = (typeof scope === 'string' ? document.getElementById(scope) : scope) || document.querySelector('.page.active') || document;
    var bad = [];
    root.querySelectorAll('[required],[data-required="1"]').forEach(function(f){
      f.classList.remove('td15-invalid');
      var v = (f.value == null ? '' : String(f.value)).trim();
      if (!v && f.offsetParent !== null){ f.classList.add('td15-invalid'); bad.push(f); }
    });
    if (bad.length){
      report('FORM-INVALID', 'Thiếu ' + bad.length + ' trường bắt buộc');
      bad[0].scrollIntoView({behavior:'smooth', block:'center'});
      try{ bad[0].focus(); }catch(_){}
    }
    return { ok: bad.length === 0, missing: bad.length, fields: bad };
  };

  /* ── U1 · Nhãn trợ năng tự động cho nút biểu tượng ─────────── */
  function labelIcons(){
    var n = 0;
    document.querySelectorAll('button,[role="button"],a').forEach(function(b){
      if (b.getAttribute('aria-label') || b.getAttribute('title')) return;
      var t = (b.textContent||'').trim();
      if (!t) return;
      if (/^[\p{Extended_Pictographic}\p{Emoji_Presentation}\s\u2190-\u27bf\ufe0f×✕✖]+$/u.test(t)){
        b.setAttribute('aria-label', 'Nút ' + t); n++;
      } else if (t.length <= 3){ b.setAttribute('aria-label', t); n++; }
    });
    document.querySelectorAll('img:not([alt])').forEach(function(i){ i.setAttribute('alt',''); i.setAttribute('role','presentation'); });
    document.querySelectorAll('table:not([aria-label])').forEach(function(t){
      var cap = t.querySelector('caption'); if (cap) t.setAttribute('aria-label', cap.textContent.trim().slice(0,80));
    });
    if (DEV) console.info('[TD15] aria-label bổ sung:', n);
    return n;
  }
  TD15.labelIcons = labelIcons;

  /* ── U2 · Phím tắt ─────────────────────────────────────────── */
  document.addEventListener('keydown', function(e){
    var k = (e.key||'').toLowerCase();
    if (e.key === 'Escape'){
      var pal = document.getElementById('td15-pal');
      if (pal && pal.classList.contains('on')){ pal.classList.remove('on'); e.preventDefault(); return; }
      var open = document.querySelector('.modal.show,.modal.active,.overlay.show,dialog[open]');
      if (open){ try{ open.close ? open.close() : open.classList.remove('show','active'); }catch(_){}
        if (open.classList) open.classList.remove('show','active'); }
      return;
    }
    /* HM-13b: Ctrl+S / Ctrl+E / Ctrl+Shift+K do TD.keys (HM-15) xử lý — đã gỡ; bản nháp vẫn tự lưu 30 giây (TD15.every('autosave')) */
  }, true);

  /* ── U3 · Bảng lệnh tìm kiếm nhanh (Ctrl+K) ────────────────── */
  var pal = document.getElementById('td15-pal'), palQ = document.getElementById('td15-pal-q'),
      palL = document.getElementById('td15-pal-l'), items = [], sel = 0;
  function collect(){
    var out = [];
    document.querySelectorAll('.nav-item,.nav-item-parent,.nav-child-item').forEach(function(n){
      var t = (n.textContent||'').replace(/\s+/g,' ').trim(); if (t) out.push({ t:'📄 ' + t, go:function(){ n.click(); } });
    });
    document.querySelectorAll('.page label[for]').forEach(function(l){
      var f = document.getElementById(l.getAttribute('for')); if (!f) return;
      var t = (l.textContent||'').replace(/\s+/g,' ').trim(); if (!t) return;
      out.push({ t:'🔎 ' + t, go:function(){ f.scrollIntoView({block:'center'}); try{ f.focus(); }catch(_){}} });
    });
    return out.slice(0, 400);
  }
  function draw(q){
    var qq = (q||'').toLowerCase();
    var list = items.filter(function(i){ return !qq || i.t.toLowerCase().indexOf(qq) >= 0; }).slice(0, 40);
    palL.textContent = ''; sel = 0;
    list.forEach(function(i, ix){
      var li = document.createElement('li'); li.textContent = i.t; li.setAttribute('role','option');
      if (!ix) li.className = 'sel';
      li.onclick = function(){ pal.classList.remove('on'); i.go(); };
      palL.appendChild(li);
    });
  }
  TD15.palette = function(){
    items = collect(); pal.classList.add('on'); palQ.value = ''; draw(''); setTimeout(function(){ palQ.focus(); }, 30);
  };
  if (palQ){
    palQ.addEventListener('input', function(){ draw(palQ.value); });
    palQ.addEventListener('keydown', function(e){
      var lis = palL.querySelectorAll('li'); if (!lis.length) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp'){
        e.preventDefault(); lis[sel].classList.remove('sel');
        sel = (sel + (e.key === 'ArrowDown' ? 1 : lis.length - 1)) % lis.length;
        lis[sel].classList.add('sel'); lis[sel].scrollIntoView({block:'nearest'});
      } else if (e.key === 'Enter'){ e.preventDefault(); lis[sel].click(); }
    });
  }
  if (pal) pal.addEventListener('click', function(e){ if (e.target === pal) pal.classList.remove('on'); });

  /* ── U4 · Tương phản cao & cỡ chữ lớn (ghi nhớ) ────────────── */
  TD15.setDisplay = function(hc, big){
    document.documentElement.classList.toggle('td15-hc', !!hc);
    document.documentElement.classList.toggle('td15-big', !!big);
    try{ localStorage.setItem('td15.display', JSON.stringify({hc:!!hc, big:!!big})); }catch(_){}
  };
  TD15.toggleContrast = function(){ var d = disp(); TD15.setDisplay(!d.hc, d.big); };
  TD15.toggleBigText  = function(){ var d = disp(); TD15.setDisplay(d.hc, !d.big); };
  function disp(){ try{ return JSON.parse(localStorage.getItem('td15.display')||'{}'); }catch(_){ return {}; } }
  (function(){ var d = disp(); if (d.hc || d.big) TD15.setDisplay(d.hc, d.big); })();

  /* ── U5 · Bố cục đáp ứng dưới 420px ────────────────────────── */
  function responsive(){
    document.documentElement.classList.toggle('td15-mobile', window.innerWidth <= 420);
  }
  window.addEventListener('resize', responsive); responsive();

  /* ── P4/P5 · Hoãn dựng bảng lớn & biểu đồ ngoài vùng nhìn ──── */
  function defer(){
    if (!('IntersectionObserver' in window)) return;
    document.querySelectorAll('table').forEach(function(t){
      if (t.rows && t.rows.length > 200) t.classList.add('td15-defer');
    });
    document.querySelectorAll('canvas,.chart,[data-chart]').forEach(function(c){
      if (c.dataset.td15Seen) return; c.classList.add('td15-defer');
    });
  }

  /* ── Khởi động ─────────────────────────────────────────────── */
  function boot(){
    try{ TD15.auditIds(); labelIcons(); defer(); }catch(e){ report('BOOT', e, true); }
    TD15.every('relabel', 5000, function(){ labelIcons(); defer(); });
    try{ console.info('[TD15 v15.0.0] sẵn sàng — TD15.backup/restore/validate/palette/auditIds'); }catch(_){}
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(boot, 1200);
  else window.addEventListener('DOMContentLoaded', function(){ setTimeout(boot, 1200); });
})();
