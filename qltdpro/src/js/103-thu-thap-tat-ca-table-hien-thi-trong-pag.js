
(function(){
  function getActiveTitle(){
    var nav = document.querySelector('.nav-item.active, .nav-child-item.active');
    var t = document.getElementById('page-title');
    var _t = ((nav && nav.textContent) || (t && t.textContent) || 'Bản in').trim().replace(/\s+/g,' ');
    if(window.TD_PRINT) _t = window.TD_PRINT.stripIcons(_t) || 'Bản in';
    return _t.substring(0,140);
  }
  // Thu thập tất cả <table> hiển thị trong .page.active (và tab-panel.active nếu có)
  function collectTables(){
    var root = document.querySelector('.page.active') || document.body;
    var tabs = root.querySelectorAll('.tab-panel');
    if(tabs.length){
      var active = root.querySelector('.tab-panel.active');
      if(active) root = active;
    }
    var tables = Array.prototype.slice.call(root.querySelectorAll('table'));
    // Chỉ giữ table thực sự hiển thị và có nội dung
    return tables.filter(function(tb){
      if(tb.offsetParent === null && tb.getClientRects().length === 0) return false;
      return tb.rows && tb.rows.length > 0;
    });
  }
  // Đếm số cột tối đa của 1 table
  function maxCols(tb){
    var n = 0;
    for(var i=0;i<tb.rows.length;i++){
      var c = 0;
      for(var j=0;j<tb.rows[i].cells.length;j++) c += (tb.rows[i].cells[j].colSpan||1);
      if(c>n) n = c;
    }
    return n;
  }
  // Lấy CSS hiện hành để giữ định dạng bảng (màu, viền, font...)
  function getDocCSS(){
    var out = [];
    for(var i=0;i<document.styleSheets.length;i++){
      try{
        var rules = document.styleSheets[i].cssRules;
        if(!rules) continue;
        for(var j=0;j<rules.length;j++) out.push(rules[j].cssText);
      }catch(e){}
    }
    return out.join('\n');
  }

  window.printTablesA4 = function(opts){
    opts = opts || {};
    var tables = collectTables();
    if(!tables.length){ alert('Menu hiện tại không có bảng để in.'); return; }
    var title = getActiveTitle();
    // Quyết định portrait/landscape: nếu bất kỳ bảng nào >8 cột → landscape
    var maxC = tables.reduce(function(m,t){return Math.max(m, maxCols(t));},0);
    var orientation = opts.orientation || (maxC > 8 ? 'landscape' : 'portrait');
    // Vùng in của A4 (mm) sau trừ margin 6mm
    var pageW = (orientation === 'landscape' ? 297 : 210) - 12;  // mm
    var pageH = (orientation === 'landscape' ? 210 : 297) - 16;

    var css = getDocCSS();
    var w = window.open('', '_blank', 'width=1200,height=900');
    if(!w){ alert('Trình duyệt chặn popup. Vui lòng cho phép popup rồi thử lại.'); return; }

    // Build HTML
    var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>'+title+'</title>';
    html += '<style>'+css+'</style>';
    html += '<style>'
      + '@page{size:A4 '+orientation+';margin:6mm 6mm 8mm 6mm}'
      + 'html,body{background:#fff !important;margin:0;padding:0;font-family:Arial,"Segoe UI",sans-serif;color:#000}'
      + '.print-header{border-bottom:2px solid #000;padding:2px 0 8px;margin-bottom:10px}'+ '.print-header .ph-branch{font-size:11pt;font-weight:700;color:#000;text-align:left}'+ '.print-header .ph-title{font-size:18pt;font-weight:800;color:#000;text-align:center;margin-top:3px;text-transform:uppercase;letter-spacing:.3px}'+ '.print-header .ph-date{font-size:10.5pt;font-style:italic;color:#000;text-align:center;margin-top:2px;font-weight:400}'+ '.print-footer-sign{display:flex;justify-content:space-around;margin:18mm 0 4mm;font-size:11pt;font-weight:700;page-break-inside:avoid;break-inside:avoid}'+ '.print-footer-sign .cell{width:30%;text-align:center}'+ '.print-footer-sign .cell .role{text-transform:uppercase;letter-spacing:.5px}'+ '.print-footer-sign .cell .sign-space{height:22mm}'
      + '.tbl-block{margin:0 0 10px;page-break-inside:avoid;break-inside:avoid}'
      + '.tbl-caption{font-size:11px;font-weight:700;color:#0d3b66;margin:6px 0 3px}'
      // FIX GỐC RỄ #1B (2026-08-17): .tbl-fit là block RỘNG CỐ ĐỊNH (pageW mm) +
      // overflow:hidden, còn .tbl-scale là inline-block => con inline-block bị
      // "shrink-to-fit" theo bề rộng cha, nên scrollWidth đo được ~= bề rộng khổ
      // giấy, KHÔNG phải bề rộng thật của bảng => hệ số scale luôn = 1 và các cột
      // vượt khổ bị overflow:hidden CẮT MẤT. Sửa gốc: bọc ngoài không cắt
      // (overflow:visible) khi đo, .tbl-scale là block width:max-content và bảng
      // dùng width:max-content để giữ đủ MỌI cột; đồng thời vô hiệu hoá
      // position:sticky / transform copy từ CSS màn hình (nguyên nhân cột dính
      // trái đè lên cột khác hoặc bị mất khi in).
      + '.tbl-fit{width:'+pageW+'mm;overflow:visible}'
      + '.tbl-fit > .tbl-scale{transform-origin:top left;display:block;width:max-content}'
      + 'table{border-collapse:collapse !important;width:max-content !important;min-width:100% !important;max-width:none !important;table-layout:auto !important;font-size:10pt;background:#fff !important;color:#000 !important}'
      + 'table,thead,tbody,tfoot,tr,th,td{position:static !important;left:auto !important;right:auto !important;transform:none !important}'
      + 'th,td{border:1px solid #555 !important;padding:2px 5px !important;background:#fff !important;color:#000 !important;white-space:nowrap;overflow:visible !important;text-overflow:clip !important;max-width:none !important;min-width:0 !important}'
      + 'th *,td *{max-width:none !important;overflow:visible !important;text-overflow:clip !important}'
      + 'thead th{background:#e8eef5 !important;font-weight:700}'
      + 'tr{page-break-inside:avoid}'
      + 'thead{display:table-header-group}'
      + 'tfoot{display:table-footer-group}'
      // FIX GỐC RỄ #2 (2026-08-17): các hàng "Cộng"/"TỔNG CỘNG" dùng nền màu +
      // chữ trắng (định dạng trên màn hình) sẽ MẤT NỀN khi in vì trình duyệt
      // mặc định KHÔNG in màu nền (phải bật "In màu nền" thủ công) — chữ trắng
      // trên nền trắng => không đọc được số. Ép các hàng tổng luôn hiển thị
      // CHỮ ĐEN ĐẬM trên nền xám nhạt (đồng bộ màu bảng) thay vì phụ thuộc nền
      // màu, đồng thời bật print-color-adjust để nền (nếu có) vẫn in được.
      + '*{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;color-adjust:exact !important}'
      + 'tr.km-grand td,tr.sec-title-row td,tr[class*="grand"] td,tr.pr-total-row td'
      + '{background:#eef2f7 !important;color:#0a1a2e !important;font-weight:800 !important;border-top:2px solid #0a1a2e !important}'
      // FIX GỐC RỄ #2B (2026-08-17): ngoài HÀNG tổng, còn có CỘT chốt tổng
      // (ô đơn lẻ nền đậm / chữ trắng) — in ra bị trắng trên trắng. Ép đồng màu
      // bảng + chữ đen đậm ở cấp Ô, không chỉ cấp HÀNG.
      + 'td.pr-total-cell,th.pr-total-cell{background:#dfe7f1 !important;color:#0a1a2e !important;font-weight:800 !important}'
      + 'td.pr-total-cell b,td.pr-total-cell strong,th.pr-total-cell b{color:#0a1a2e !important}'
      + '.no-print,.btn,.btn-print-section,.scroll-nav-btn{display:none !important}'
      + '@media screen{body{padding:96px 10px 14px;background:#f1f5f9}.tbl-fit{box-shadow:0 1px 4px rgba(0,0,0,.1);background:#fff;padding:8px}.toolbar{position:fixed;left:0;right:0;top:0;background:#0d3b66;color:#fff;padding:8px 10px;display:flex;gap:8px;align-items:center;z-index:calc(var(--z-7,99990) + 4);box-shadow:0 2px 10px rgba(0,0,0,.18);min-height:56px}.toolbar strong{font-size:13px;white-space:nowrap}.toolbar button{display:inline-flex !important;align-items:center;justify-content:center;background:#fff;color:#0d3b66;border:0;padding:10px 14px;font-weight:800;border-radius:7px;cursor:pointer;font-size:15px;min-height:38px}.toolbar button.primary{background:#ffd400;color:#07182d}.toolbar button:hover{background:#ffd400;color:#000}.toolbar .meta{margin-left:auto;font-size:12px;opacity:.9;white-space:nowrap}@media(max-width:700px){body{padding-top:136px}.toolbar{flex-wrap:wrap}.toolbar strong{width:100%;font-size:12px}.toolbar button{flex:1;font-size:16px;padding:12px}.toolbar .meta{width:100%;margin-left:0;font-size:11px}}}'
      + '@media print{body{padding:0 !important}.toolbar,.toolbar button{display:none !important}}'
      + '</style></head><body>';
    html += '<div class="toolbar"><strong>Xem trước bản in A4</strong>'
      + '<button class="primary" onclick="window.focus();window.print()">🖨️ IN A4</button>'
      + '<button onclick="window.close()">✖ Đóng</button>'
      + '<span class="meta">'+title+' · A4 '+(orientation==='landscape'?'ngang':'dọc')+' · '+tables.length+' bảng</span>'
      + '</div>';
    html += (window.ufsBuildPrintHeaderHTML ? window.ufsBuildPrintHeaderHTML(title) :
      ('<div class="print-header"><div class="ph-branch">Chi nhánh: Agribank Thiên Trường Nam Định</div>'
      + '<div class="ph-title">'+title+'</div>'
      + '<div class="ph-date">(Đến ngày '+(window.ufsPrintDateStr?window.ufsPrintDateStr():new Date().toLocaleDateString('vi-VN'))+')</div></div>'));

    tables.forEach(function(tb, idx){
      // Tìm caption: caption tag, hoặc heading gần nhất phía trên
      var cap = '';
      var c = tb.querySelector('caption');
      if(c) cap = c.textContent.trim();
      if(!cap){
        var prev = tb.previousElementSibling;
        for(var k=0;k<4 && prev;k++){
          if(prev.matches && prev.matches('h1,h2,h3,h4,.card-title,.section-title,b,strong')){ cap = prev.textContent.trim(); break; }
          prev = prev.previousElementSibling;
        }
        if(!cap){
          var card = tb.closest('.card, section, .panel');
          if(card){
            var h = card.querySelector('h1,h2,h3,h4,.card-title,.section-title');
            if(h) cap = h.textContent.trim();
          }
        }
      }
      // FIX GỐC RỄ #3 (17/08/2026): caption lấy từ heading card THƯỜNG TRÙNG
      // y hệt tiêu đề báo cáo (.ph-title) => bản in hiện lại nội dung ngay dưới
      // tiêu đề, kèm cả icon/emoji. Sửa tận gốc: strip icon rồi so khoá chuẩn
      // hoá; trùng thì BỎ caption, khác thì vẫn in để phân biệt nhiều bảng.
      var capClean = (window.TD_PRINT ? window.TD_PRINT.stripIcons(cap) : cap).replace(/[<>&]/g,'');
      var _dupCap = window.TD_PRINT && capClean &&
        window.TD_PRINT.normKey(capClean) === window.TD_PRINT.normKey(title);
      // FIX GỐC RỄ #4: clone bảng đã chuẩn hoá (bỏ icon trong ô, bỏ cột
      // checkbox/nút, dropdown -> text) thay vì tb.outerHTML thô.
      var tbHTML = (window.TD_PRINT ? window.TD_PRINT.sanitizeTable(tb).outerHTML : tb.outerHTML);
      html += '<div class="tbl-block">';
      if(capClean && !_dupCap) html += '<div class="tbl-caption">'+(idx+1)+'. '+capClean+'</div>';
      html += '<div class="tbl-fit" data-tbl="'+idx+'"><div class="tbl-scale">'+tbHTML+'</div></div>';
      html += '</div>';
    });

    // FIX GỐC RỄ #1C (17/08/2026): trước đây logic "co giãn bảng vừa khổ A4" +
    // "ép màu hàng/cột tổng" được nhúng dưới dạng <script> trong chuỗi HTML của
    // cửa sổ in. Thực tế đo được: đoạn script này KHÔNG chạy (transform rỗng,
    // không ô nào được gắn class) => bảng giữ nguyên bề rộng thật, tràn khổ giấy
    // và bị trình duyệt cắt cột khi in. Sửa tận gốc: cửa sổ con cùng origin nên
    // điều khiển trực tiếp từ cửa sổ cha (không phụ thuộc script nhúng), có
    // fallback theo thời gian nếu sự kiện load đã xảy ra trước khi gắn listener.

    html += '<div class="print-footer-sign">'
      + '<div class="cell"><div class="role">Lập bảng</div><div class="sign-space"></div></div>'
      + '<div class="cell"><div class="role">Kiểm soát</div><div class="sign-space"></div></div>'
      + '<div class="cell"><div class="role">Giám đốc duyệt</div><div class="sign-space"></div></div>'
      + '</div>';
    html += '</body></html>';

    // FIX GỐC RỄ #1 (2026-08-17): trước đây dùng
    //   w.document.documentElement.innerHTML = html
    // — cách này KHÔNG bao giờ thực thi các thẻ <script> bên trong (hành vi
    // chuẩn của DOM: script chèn qua innerHTML luôn bị vô hiệu hoá), nên đoạn
    // script "tự co giãn bảng vừa khổ A4" và "tự bấm in" phía trên KHÔNG BAO
    // GIỜ chạy được. Hệ quả quan sát được: bảng bị cắt mất cột bên phải (do
    // .tbl-fit có overflow:hidden nhưng transform:scale không bao giờ được
    // gán) và cửa sổ in không tự mở hộp thoại in như thiết kế. Đồng thời gán
    // trực tiếp một chuỗi có <!DOCTYPE>/<html>/<head>/<body> vào innerHTML của
    // chính thẻ <html> cũng sai cấu trúc DOM. Sửa triệt để bằng
    // document.write(), cách DUY NHẤT dựng lại toàn bộ document (kể cả DOCTYPE
    // và <script>) và cho script con thực thi bình thường.
    w.document.open();
    w.document.write(html);
    w.document.close();

    var lumOf = function (v) {
      var m = String(v || '').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      return m ? (+m[1] * 299 + +m[2] * 587 + +m[3] * 114) / 1000 : null;
    };
    var applyFit = function () {
      try {
        var d = w.document;
        if (!d || !d.body) return;
        // 1) Đồng màu bảng + chữ đen đậm cho HÀNG tổng và CỘT/Ô chốt tổng
        Array.prototype.forEach.call(d.querySelectorAll('tr'), function (tr) {
          var l = lumOf(tr.style.backgroundColor || w.getComputedStyle(tr).backgroundColor);
          if (l !== null && l < 160) tr.classList.add('pr-total-row');
        });
        Array.prototype.forEach.call(d.querySelectorAll('td,th'), function (c) {
          var cs = w.getComputedStyle(c);
          var lb = lumOf(c.style.backgroundColor || cs.backgroundColor);
          var lf = lumOf(c.style.color || cs.color);
          if ((lb !== null && lb < 170) || (lf !== null && lf > 190)) c.classList.add('pr-total-cell');
        });
        // 2) Fit bề rộng: đo bề rộng THẬT của bảng (max-content) rồi scale
        var maxW = pageW * 3.7795;   // mm -> px @96dpi
        Array.prototype.forEach.call(d.querySelectorAll('.tbl-fit'), function (b) {
          var inner = b.querySelector('.tbl-scale');
          if (!inner) return;
          inner.style.transform = 'none';
          b.style.overflow = 'visible';
          b.style.height = 'auto';
          var tb = inner.querySelector('table');
          var wid = Math.max(inner.scrollWidth || 0,
            tb ? Math.ceil(tb.getBoundingClientRect().width) : 0,
            tb ? (tb.scrollWidth || 0) : 0);
          if (!wid) return;
          var sc = (maxW / wid) * 0.985;   // trừ 1.5% an toàn để không cắt viền cột cuối
          if (sc > 1.25) sc = 1.25;   // bảng hẹp thì GIÃN cho full khổ A4
          inner.style.transform = 'scale(' + sc.toFixed(4) + ')';
          b.style.height = (Math.ceil(inner.scrollHeight * sc) + 8) + 'px';
          b.style.overflow = 'hidden';
          b.setAttribute('data-fit-scale', sc.toFixed(4));
        });
      } catch (e) { console.error('printTablesA4/applyFit', e); }
    };
    w.__ufsApplyFit = applyFit;
    try { w.addEventListener('load', applyFit); } catch (e) {}
    setTimeout(applyFit, 400);
    setTimeout(applyFit, 1200);
    // FIX GỐC RỄ (07/09/2026): trước đây LUÔN tự mở hộp thoại in sau 1.6s
    // (trừ khi ai đó chủ động truyền noAutoPrint — nhưng không nơi nào gọi
    // hàm này từng truyền), khiến người dùng chưa kịp xem trước A4 (dù
    // toolbar phía trên đã có sẵn nút "🖨️ IN A4") đã bị hộp thoại in che
    // mất màn hình xem trước. Đảo ngược mặc định: CHỈ tự in khi có nơi gọi
    // chủ động truyền {autoPrint:true} trong tương lai; mặc định luôn dừng
    // lại ở màn hình xem trước, người dùng tự bấm nút khi đã kiểm tra xong.
    if (opts.autoPrint === true) {
      setTimeout(function () { try { applyFit(); w.focus(); w.print(); } catch (e) {} }, 1600);
    }
  };

  // Gắn nút "🖨️ In bảng (A4)" vào topbar
  function injectTopbarButton(){
    if(document.getElementById('btn-print-tables-a4')) return;
    var bar = document.querySelector('.topbar');
    if(!bar) return;
    var refBtn = bar.querySelector('[data-tipkey="print"]') || bar.querySelector('button');
    var b = document.createElement('button');
    b.id = 'btn-print-tables-a4';
    b.className = 'btn btn-navy btn-sm no-print';
    b.title = 'In CHỈ các bảng của menu hiện tại — tự fit A4';
    b.innerHTML = '📊 In bảng A4';
    b.style.marginLeft = '4px';
    b.onclick = function(){ printTablesA4(); };
    if(refBtn && refBtn.parentNode) refBtn.parentNode.insertBefore(b, refBtn.nextSibling);
    else bar.appendChild(b);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectTopbarButton);
  else injectTopbarButton();
  setTimeout(injectTopbarButton, 800);

  // Phím tắt: Ctrl+Shift+T = in bảng A4
  document.addEventListener('keydown', function(e){
    if((e.ctrlKey||e.metaKey) && e.shiftKey && (e.key==='T'||e.key==='t')){
      e.preventDefault(); printTablesA4();
    }
  });
})();
