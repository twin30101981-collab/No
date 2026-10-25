
/* === TD_BOOT_SAFEGUARD_v1 — GĐ-1 đề án HSV-Pro v13.9.6 (2026-06-20) ===
   Snapshot toàn bộ LocalStorage key có prefix td_/hsv_/TD_ vào sessionStorage,
   tính SHA-1 checksum, hiện badge trạng thái. KHÔNG đụng dữ liệu gốc.
*/
(function(){
  if (window.TD_SAFEGUARD) return; // idempotent
  var KEY_RE = /^(td_|hsv_|TD_)/;
  var SNAP_KEY = '__TD_SNAPSHOT_v1';
  var META_KEY = '__TD_SNAPSHOT_META_v1';

  function listKeys(){
    var out=[]; try{
      for (var i=0;i<localStorage.length;i++){
        var k=localStorage.key(i);
        if (k && KEY_RE.test(k)) out.push(k);
      }
    }catch(e){}
    out.sort();
    return out;
  }

  function dumpObj(){
    var keys=listKeys(), o={};
    for (var i=0;i<keys.length;i++){
      try{ o[keys[i]] = localStorage.getItem(keys[i]); }catch(e){ o[keys[i]] = null; }
    }
    return o;
  }

  function toB64(str){
    try{
      // unescape(encodeURIComponent(...)) để giữ UTF-8 chính xác
      return btoa(unescape(encodeURIComponent(str)));
    }catch(e){ return ''; }
  }

  // SHA-1 thuần JS (tránh phụ thuộc SubtleCrypto async cho boot path).
  function sha1(msg){
    function rotl(n,s){return (n<<s)|(n>>>(32-s));}
    function tohex(n){var s='';for(var i=7;i>=0;i--)s+=((n>>>(i*4))&0xF).toString(16);return s;}
    var bytes=[];
    for (var i=0;i<msg.length;i++){
      var c=msg.charCodeAt(i);
      if (c<128) bytes.push(c);
      else if (c<2048){bytes.push(192|(c>>6));bytes.push(128|(c&63));}
      else {bytes.push(224|(c>>12));bytes.push(128|((c>>6)&63));bytes.push(128|(c&63));}
    }
    var l=bytes.length, bl=l*8;
    bytes.push(0x80);
    while (bytes.length%64 !== 56) bytes.push(0);
    for (var i=7;i>=0;i--) bytes.push((bl>>>(i*8))&0xff);
    var H0=0x67452301,H1=0xEFCDAB89,H2=0x98BADCFE,H3=0x10325476,H4=0xC3D2E1F0;
    for (var b=0;b<bytes.length;b+=64){
      var w=new Array(80);
      for (var i=0;i<16;i++) w[i]=(bytes[b+i*4]<<24)|(bytes[b+i*4+1]<<16)|(bytes[b+i*4+2]<<8)|bytes[b+i*4+3];
      for (var i=16;i<80;i++) w[i]=rotl(w[i-3]^w[i-8]^w[i-14]^w[i-16],1);
      var a=H0,bb=H1,c=H2,d=H3,e=H4,f,k,t;
      for (var i=0;i<80;i++){
        if (i<20){f=(bb&c)|((~bb)&d);k=0x5A827999;}
        else if (i<40){f=bb^c^d;k=0x6ED9EBA1;}
        else if (i<60){f=(bb&c)|(bb&d)|(c&d);k=0x8F1BBCDC;}
        else {f=bb^c^d;k=0xCA62C1D6;}
        t=(rotl(a,5)+f+e+k+w[i])|0;
        e=d;d=c;c=rotl(bb,30);bb=a;a=t;
      }
      H0=(H0+a)|0;H1=(H1+bb)|0;H2=(H2+c)|0;H3=(H3+d)|0;H4=(H4+e)|0;
    }
    return tohex(H0)+tohex(H1)+tohex(H2)+tohex(H3)+tohex(H4);
  }

  function snapshot(){
    var t0 = (performance && performance.now)?performance.now():Date.now();
    var obj = dumpObj();
    var keys = Object.keys(obj);
    var json = JSON.stringify(obj);
    var b64  = toB64(json);
    var hash = sha1(json);
    var meta = {
      ts: new Date().toISOString(),
      keys: keys,
      keyCount: keys.length,
      bytesRaw: json.length,
      bytesB64: b64.length,
      sha1: hash,
      ms: Math.round(((performance && performance.now)?performance.now():Date.now()) - t0)
    };
    try{
      sessionStorage.setItem(SNAP_KEY, b64);
      sessionStorage.setItem(META_KEY, JSON.stringify(meta));
    }catch(e){
      meta.error = 'sessionStorage write failed: ' + (e && e.message);
    }
    window.__TD_SAFEGUARD_META = meta;
    try{ console.info('[TD-SAFEGUARD] snapshot OK', meta); }catch(e){}
    return meta;
  }

  function verify(){
    var obj = dumpObj();
    var hash = sha1(JSON.stringify(obj));
    var meta = window.__TD_SAFEGUARD_META || {};
    return { current: hash, boot: meta.sha1 || null, match: hash === meta.sha1 };
  }

  function restore(){
    try{
      var b64 = sessionStorage.getItem(SNAP_KEY);
      if (!b64) return { ok:false, reason:'no snapshot in sessionStorage' };
      var json = decodeURIComponent(escape(atob(b64)));
      var obj = JSON.parse(json);
      var n=0;
      for (var k in obj){ if (Object.prototype.hasOwnProperty.call(obj,k)){
        if (obj[k] === null) { localStorage.removeItem(k); }
        else { localStorage.setItem(k, obj[k]); }
        n++;
      }}
      return { ok:true, restored:n };
    }catch(e){ return { ok:false, reason: e && e.message }; }
  }

  function getMeta(){ return window.__TD_SAFEGUARD_META || null; }

  window.TD_SAFEGUARD = { snapshot: snapshot, verify: verify, restore: restore, getMeta: getMeta };

  // Chạy snapshot ngay lập tức (đồng bộ, trước mọi script khác đụng vào localStorage).
  try { snapshot(); } catch(e){ try{console.error('[TD-SAFEGUARD] snapshot failed', e);}catch(_){} }

  // Badge UI - chèn sau khi body sẵn sàng, không đụng layout hiện có.
  function injectBadge(){
    if (document.getElementById('td-safeguard-badge')) return;
    var meta = window.__TD_SAFEGUARD_META || {};
    var short = (meta.sha1 || '------').slice(0,8);
    var wrap = document.createElement('div');
    wrap.id = 'td-safeguard-badge';
    wrap.setAttribute('data-tag','TD_BOOT_SAFEGUARD_v1');
    var ok = meta && meta.sha1 && !meta.error;
    wrap.innerHTML =
      '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' +
      (ok?'#10b981':'#ef4444') + ';margin-right:6px;vertical-align:middle;flex-shrink:0"></span>' +
      '<b>Backup</b> · ' + (meta.keyCount||0) + ' keys · <code style="color:#93c5fd">' + short + '</code>' +
      ' <span id="td-audit-pill" style="margin-left:6px;padding:1px 6px;border-radius:10px;background:#334155;color:#cbd5e1">audit</span>' +
      ' <span id="td-safeguard-close" title="Ẩn" style="margin-left:6px;opacity:.7;padding:0 3px">✕</span>';
    wrap.title = 'Click để xem chi tiết snapshot & verify checksum. Pill "audit" để chạy đối chiếu nội bộ.';
    wrap.addEventListener('click', function(ev){
      if (ev.target && ev.target.id === 'td-audit-pill'){
        ev.stopPropagation();
        if (window.TD_AUDIT && window.TD_AUDIT.run) window.TD_AUDIT.run({show:true});
        else alert('Audit engine chưa sẵn sàng. Hãy mở 1 tab dữ liệu trước rồi thử lại.');
        return;
      }
      if (ev.target && ev.target.id === 'td-safeguard-close'){
        ev.stopPropagation();
        wrap.style.display = 'none';
        return;
      }
      var v = verify();
      var m = window.__TD_SAFEGUARD_META || {};
      var msg =
        'TD_SAFEGUARD snapshot\n' +
        '─────────────────────\n' +
        'Thời điểm  : ' + (m.ts||'') + '\n' +
        'Số keys    : ' + (m.keyCount||0) + '\n' +
        'Dung lượng : ' + (m.bytesRaw||0) + ' B (raw) / ' + (m.bytesB64||0) + ' B (b64)\n' +
        'SHA-1 boot : ' + (m.sha1||'(N/A)') + '\n' +
        'SHA-1 now  : ' + v.current + '\n' +
        'Trùng khớp : ' + (v.match?'CÓ ✔':'KHÔNG ✘ (dữ liệu đã thay đổi từ lúc mở file)') + '\n\n' +
        'Console: TD_SAFEGUARD.restore() để khôi phục từ sessionStorage.';
      alert(msg);
    });

    // v15.0.2 FIX — badge "Backup" vẫn che nội dung/menu, kể cả trên desktop.
    // NGUYÊN NHÂN GỐC RỄ: bản sửa v14.3.2 trước đây chỉ đưa badge vào làm
    // phần tử tĩnh trong .topbar-right khi màn hình <=900px (mobile); trên
    // desktop nó vẫn dùng position:fixed neo cứng ở toạ độ top:8px;right:8px
    // với z-index gần như tối đa (2147483600) — tức LUÔN nổi trên mọi thứ,
    // vĩnh viễn, bất kể lúc đó khu vực đó có đang hiển thị nút "Toàn màn
    // hình", menu lọc, hay bất kỳ dropdown/panel nào khác của trang hay
    // không. Toạ độ cố định + z-index tối đa là công thức chắc chắn sẽ đè
    // lên UI thật ở một thời điểm nào đó, trên mọi kích thước màn hình.
    // SỬA TẬN GỐC: bỏ hẳn kiểu "nổi đè" (position:fixed) làm mặc định — đưa
    // badge vào làm 1 phần tử THẬT, nằm trong dòng chảy layout bình thường
    // của .topbar-right (giống các nút Lưu/Tiện ích khác), trên MỌI kích
    // thước màn hình. Nhờ vậy nó không bao giờ chồng lên nội dung hay menu,
    // vì nó không còn "nổi" nữa — nó chỉ là một badge nhỏ nằm cạnh các nút
    // khác, tự xuống dòng khi topbar wrap. position:fixed chỉ còn được dùng
    // làm phương án dự phòng cuối cùng, khi thực sự không tìm thấy
    // .topbar-right (rất hiếm), và khi đó z-index cũng hạ xuống mức vừa
    // phải (999, không phải 2147483600) + có nút ✕ để người dùng tự ẩn nếu
    // nó lỡ che thứ gì đó.
    var INLINE_CSS = 'display:inline-flex;align-items:center;position:static;' +
      'font:10px/1.3 -apple-system,Segoe UI,Roboto,Arial,sans-serif;' +
      'background:#0f172a;color:#e2e8f0;padding:4px 8px;border-radius:6px;' +
      'box-shadow:0 1px 4px rgba(0,0,0,.2);cursor:pointer;user-select:none;' +
      'opacity:0.92;margin:2px 0;white-space:nowrap';
    var FALLBACK_FIXED_CSS = 'position:fixed;top:8px;right:8px;z-index:calc(var(--z-1,100) + 11);' +
      'font:11px/1.4 -apple-system,Segoe UI,Roboto,Arial,sans-serif;' +
      'background:#0f172a;color:#e2e8f0;padding:6px 10px;border-radius:6px;' +
      'box-shadow:0 2px 8px rgba(0,0,0,.25);cursor:pointer;user-select:none;opacity:0.92';

    function place(){
      var topbarRight = document.querySelector('.topbar-right') || document.querySelector('.topbar');
      if (topbarRight) {
        wrap.style.cssText = INLINE_CSS;
        if (wrap.parentElement !== topbarRight) topbarRight.appendChild(wrap);
      } else {
        // Không tìm thấy topbar để gắn vào — chỉ khi đó mới dùng fallback nổi,
        // với z-index thấp và có thể tự ẩn, để không khoá chết mọi UI khác.
        wrap.style.cssText = FALLBACK_FIXED_CSS;
        if (wrap.parentElement !== document.body) document.body.appendChild(wrap);
      }
    }
    place();
    window.addEventListener('resize', place);
    window.addEventListener('orientationchange', place);
  }

  // FIX GỐC RỄ v2026-08-19: badge "Backup · X keys · audit" trước đây tự động
  // hiện ngay khi mở file (thấy ở góc trên/topbar), gây rối giao diện ngoài ý
  // muốn người dùng. NGUYÊN NHÂN: injectBadge() được gọi vô điều kiện ở
  // DOMContentLoaded/khi tải trang. SỬA TẬN GỐC: không tự chèn badge khi mở
  // file nữa; toàn bộ engine snapshot/verify/restore (TD_SAFEGUARD) vẫn hoạt
  // động bình thường ở hậu trường — chỉ cần gọi TD_SAFEGUARD_showBadge() từ
  // console nếu thật sự cần xem badge.
  window.TD_SAFEGUARD_showBadge = injectBadge;
})();
