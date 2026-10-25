
(function(){
  'use strict';
  var KEY = 'td.pastDueIPCAS.v1';
  var TD = window.TD_PASTDUE = window.TD_PASTDUE || {};
  TD.map = {};
  TD.asOf = '';

  function normMaKH(s){ return String(s||'').replace(/\D/g,''); }
  function normHD(s){ return String(s||'').replace(/[^A-Za-z0-9]/g,'').toUpperCase(); }
  function k(makh, sohd){ return normMaKH(makh) + '|' + normHD(sohd); }
  function parseNum(s){ return window.TD.num.toNumber(s, 0); } // HM-06: "300,000,000" không còn thành 300

  TD.load = function(){
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) { TD._needReseed = true; return; }
      var obj = JSON.parse(raw);
      TD.map  = obj.map  || {};
      TD.asOf = obj.asOf || '';
      TD._storedVersion = obj.version || '';
    } catch(e){ console.warn('[TD_PASTDUE] load fail', e); }
  };
  TD.SEED_VERSION = 'v13.9.15-20260623';
  TD.save = function(){
    try { localStorage.setItem(KEY, JSON.stringify({ map: TD.map, asOf: TD.asOf, version: TD.SEED_VERSION, savedAt: new Date().toISOString() })); }
    catch(e){ console.warn('[TD_PASTDUE] save fail', e); }
  };

  // ─── Seed mặc định từ IPCAS inpd01 chốt 18/06/2026 (8 khoản) ───
  // Chỉ seed khi localStorage chưa có (giữ nguyên dữ liệu người dùng đã nhập).
  TD.SEED = {
    // HM-05: đã gỡ seed 8 khoản quá hạn ngày 23/06/2026 (dữ liệu khách hàng thật)
    asOf: '',
    rows: []
  };

  TD.seedDefault = function(){
    // HM-05: xoá các khoản seed cũ (source 'inpd01-seed') còn lưu trong trình duyệt; giữ nguyên dữ liệu người dùng tự dán
    var _purged = 0;
    Object.keys(TD.map).forEach(function(k){ if (TD.map[k] && TD.map[k].source === 'inpd01-seed') { delete TD.map[k]; _purged++; } });
    if (_purged) { try { TD.save(); } catch(_e){} }
    // FIX v13.9.15: nếu SEED_VERSION khác với version đã lưu → REPLACE map
    // (giải quyết case KH cũ như (đã ẩn) bị seed từ bản trước vẫn kẹt trong localStorage
    //  dù IPCAS đã thu hết lãi & SEED mới đã loại Khoa)
    var stored = TD._storedVersion || '';
    var hasData = Object.keys(TD.map).length > 0;
    if (hasData && stored === TD.SEED_VERSION) return; // đúng version → giữ
    if (hasData && stored !== TD.SEED_VERSION) {
      console.info('[TD_PASTDUE] SEED version mismatch ('+stored+' → '+TD.SEED_VERSION+'). Resync map.');
      TD.map = {}; // wipe để seed lại snapshot mới
    }
    TD.SEED.rows.forEach(function(r){
      TD.map[k(r.makh, r.sohd)] = {
        ten: r.ten, cbtd: r.cbtd, soNgayQH: r.soNgayQH,
        loaiCV: r.loaiCV, kieuQH: r.kieuQH,
        duNoQH: r.duNoQH, laiQH: r.laiQH, ngayQH: r.ngayQH,
        source: 'inpd01-seed', asOf: TD.SEED.asOf
      };
    });
    TD.asOf = TD.SEED.asOf;
    TD.save();
  };

  // ─── Parse text dán từ IPCAS ───
  // Hỗ trợ phân tách bằng tab hoặc khoảng trắng dài. Lấy các cột theo regex.
  TD.parseText = function(txt){
    if (!txt) return [];
    var lines = String(txt).split(/\r?\n/).map(function(l){ return l.replace(/\s+$/,''); }).filter(Boolean);
    var out = [];
    var reMaKH = /\b32\d{2}-?\d{8,10}\b/;
    var reHD   = /\b3\d{3}-?LAV-?\d{6,10}\b/i;
    var reCT   = /\b3\d{3}-?LDS-?\d{6,10}\b/i;
    var reMoney= /[\d.,]{3,}/g;
    lines.forEach(function(line){
      var mk = line.match(reMaKH); if (!mk) return;
      var hd = line.match(reHD);   if (!hd) return;
      // chia bằng tab nếu có
      var parts = line.indexOf('\t') >= 0 ? line.split('\t').map(function(s){return s.trim();}) : null;
      var rec = { makh: mk[0], sohd: hd[0], ten:'', cbtd:'', soNgayQH:0, loaiCV:'', kieuQH:'', duNoQH:0, laiQH:0, ngayQH:'' };
      if (parts && parts.length >= 11) {
        rec.ten = parts[1]; rec.cbtd = parts[3];
        rec.soNgayQH = parseInt(parts[6],10)||0;
        rec.loaiCV = parts[7]; rec.kieuQH = parts[8];
        rec.duNoQH = parseNum(parts[9]); rec.laiQH = parseNum(parts[10]);
      } else {
        // best-effort khi paste không phải tab
        var nums = line.match(reMoney) || [];
        // 2 số cuối thường là dư nợ QH & lãi QH
        if (nums.length >= 2) {
          rec.duNoQH = parseNum(nums[nums.length-2]);
          rec.laiQH  = parseNum(nums[nums.length-1]);
        }
        if (/l[ãa]i.*interest|^\s*l[ãa]i\b/i.test(line)) rec.kieuQH = 'Lãi';
        else if (/g[ốo]c.*l[ãa]i/i.test(line)) rec.kieuQH = 'Gốc và lãi';
        else if (/g[ốo]c/i.test(line)) rec.kieuQH = 'Gốc';
        var mn = line.match(/(?:^|\s)(\d{1,3})(?:\s)/); if (mn) rec.soNgayQH = +mn[1] || 0;
      }
      // tính ngày QH theo asOf - (soNgayQH-1) nếu chưa có
      if (!rec.ngayQH && TD.asOf) {
        var d = (function(s){ var m = (s||'').match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/); if(!m) return null; var y=+m[3]; if(y<100) y+=2000; return new Date(y,+m[2]-1,+m[1]); })(TD.asOf);
        if (d && rec.soNgayQH > 0) {
          d.setDate(d.getDate() - rec.soNgayQH); // FIX v13.9.14: IPCAS đếm ngày 1 = ngày kế sau ngày đến hạn
          rec.ngayQH = ('0'+d.getDate()).slice(-2)+'/'+('0'+(d.getMonth()+1)).slice(-2)+'/'+d.getFullYear();
        }
      }
      out.push(rec);
    });
    return out;
  };

  TD.parseAndSave = function(){
    var ta = document.getElementById('td-pd-input');
    if (!ta) return;
    var asOfMatch = (ta.value||'').match(/(?:Đến|chốt)[^\d]{0,8}(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
    if (asOfMatch) TD.asOf = asOfMatch[1];
    var recs = TD.parseText(ta.value);
    if (!recs.length){
      alert('Không nhận diện được dòng nào. Hãy dán đủ bảng từ IPCAS inpd01.');
      return;
    }
    // Replace toàn bộ (không merge — IPCAS là snapshot)
    TD.map = {};
    recs.forEach(function(r){
      TD.map[k(r.makh,r.sohd)] = {
        ten: r.ten, cbtd: r.cbtd, soNgayQH: r.soNgayQH,
        loaiCV: r.loaiCV, kieuQH: r.kieuQH,
        duNoQH: r.duNoQH, laiQH: r.laiQH, ngayQH: r.ngayQH,
        source: 'inpd01-paste', asOf: TD.asOf || ''
      };
    });
    TD.save();
    TD.refreshUI();
    try { if (window.renderTable) renderTable('denhan'); } catch(e){}
    try { if (window.renderDashboard) renderDashboard(); else if (window.buildDashboard) buildDashboard(); } catch(e){}
    alert('Đã lưu ' + recs.length + ' khoản Past Due. Bảng VII và Lịch trả nợ đã cập nhật.');
    TD.close();
  };

  // FIX v13.9.15: đánh dấu 1 dòng đã thu — không xoá khỏi map (để track), chỉ ẩn khỏi bảng
  TD.markCleared = function(key){
    if (!TD.map[key]) return;
    if (!confirm('Đánh dấu khoản "' + (TD.map[key].ten||key) + '" đã thu hết và ẩn khỏi Bảng VII?')) return;
    TD.map[key].cleared = true;
    TD.map[key].clearedAt = new Date().toISOString();
    TD.save();
    try { if (window.renderTable) renderTable('denhan'); } catch(e){}
    try { if (window.renderDashboard) renderDashboard(); else if (window.buildDashboard) buildDashboard(); } catch(e){}
  };

  TD.clearAll = function(){
    if (!confirm('Xoá toàn bộ dữ liệu Past Due đã nhập? (Bảng VII / Lịch trả nợ sẽ trở lại logic mặc định msit80.)')) return;
    TD.map = {}; TD.asOf = ''; TD.save();
    TD.refreshUI();
    try { if (window.renderTable) renderTable('denhan'); } catch(e){}
    try { if (window.renderDashboard) renderDashboard(); else if (window.buildDashboard) buildDashboard(); } catch(e){}
  };

  TD.refreshUI = function(){
    var c = document.getElementById('td-pd-count'); if (c) c.textContent = Object.keys(TD.map).length;
    var a = document.getElementById('td-pd-asof'); if (a) a.textContent = TD.asOf || '—';
    var pv = document.getElementById('td-pd-preview');
    if (pv){
      var keys = Object.keys(TD.map);
      if (!keys.length){ pv.innerHTML = ''; return; }
      var rows = keys.slice(0,30).map(function(kk){
        var r = TD.map[kk];
        return '<tr><td>'+(r.ten||'')+'</td><td>'+kk.split('|')[1]+'</td><td>'+(r.kieuQH||'')+'</td><td>'+(r.soNgayQH||0)+'</td><td style="text-align:right">'+(r.duNoQH||0).toLocaleString('vi-VN')+'</td><td style="text-align:right">'+(r.laiQH||0).toLocaleString('vi-VN')+'</td><td>'+(r.ngayQH||'')+'</td></tr>';
      }).join('');
      pv.innerHTML = '<table class="preview"><thead><tr><th>Tên KH</th><th>Số HĐ</th><th>Kiểu QH</th><th>Ngày QH</th><th>Dư nợ QH</th><th>Lãi QH</th><th>Ngày QH</th></tr></thead><tbody>'+rows+'</tbody></table>';
    }
  };

  TD.open = function(){
    var m = document.getElementById('td-pd-modal'); if (m) m.classList.add('show');
    TD.refreshUI();
  };
  TD.close = function(){
    var m = document.getElementById('td-pd-modal'); if (m) m.classList.remove('show');
  };

  // Gắn nút vào menu Tiện ích
  TD.installMenuButton = function(){
    var menu = document.getElementById('util-menu');
    if (!menu || document.getElementById('td-pd-menu-btn')) return;
    var head = document.createElement('div');
    head.className = 'util-head'; head.textContent = 'Past Due (Quá hạn IPCAS)';
    var btn = document.createElement('button');
    btn.className = 'util-item'; btn.id = 'td-pd-menu-btn';
    btn.innerHTML = '<span class="ue">⛔</span> Nhập danh sách Past Due (inpd01)';
    btn.onclick = function(){
      var w = document.getElementById('util-wrap'); if (w) w.classList.remove('open');
      TD.open();
    };
    // chèn trước mục "Khác"
    var heads = menu.querySelectorAll('.util-head');
    var anchor = null;
    heads.forEach(function(h){ if (/^\s*Khác/i.test(h.textContent)) anchor = h; });
    var sep = document.createElement('div'); sep.className='util-sep';
    if (anchor) { menu.insertBefore(sep, anchor); menu.insertBefore(head, anchor); menu.insertBefore(btn, anchor); }
    else { menu.appendChild(sep); menu.appendChild(head); menu.appendChild(btn); }
  };

  // Boot
  TD.load();
  TD.seedDefault();

  function boot(){
    TD.installMenuButton();
    // Re-render dashboard / denhan nếu render đã chạy trước khi seed
    try { if (window.renderTable && document.getElementById('tbody-denhan')) renderTable('denhan'); } catch(e){}
    try { if (window.renderDashboard) renderDashboard(); else if (window.buildDashboard) buildDashboard(); } catch(e){}
    // Tắt banner TDUP5 "Bảng VII bỏ sót N khoản" vì đã hợp nhất
    var b = document.getElementById('tdup5-overdue-banner'); if (b) b.remove();
    var p = document.getElementById('tdup5-overdue-panel'); if (p) p.classList.remove('show');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(boot, 300); });
  else setTimeout(boot, 300);
})();
