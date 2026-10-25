
(function(){
  // Dải ký tự pictograph/emoji + variation selector + ZWJ + keycap
  var ICON_RE = /[\u203C-\u3299\uD83C-\uDBFF\uDC00-\uDFFF\u2190-\u21FF\u2300-\u27BF\uFE0E\uFE0F\u200D\u20E3\u2B00-\u2BFF]/g;
  function stripIcons(t){
    var s = String(t==null?'':t)
      // icon dạng "\ud83d\udcc517" (emoji lịch + số ngày dán liền) => bỏ cả số dán liền
      .replace(/(?:\p{Extended_Pictographic}|[\u2190-\u2BFF]|\uFE0F)+\s*\d{1,2}(?=\s*\p{L})/gu,'')
      .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g,'')   // surrogate pair (emoji)
      .replace(ICON_RE,'')
      .replace(/[\u00AD\u200B-\u200F]/g,'')
      .replace(/\s+/g,' ')
      .trim();
    // FIX GỐC RỄ (mất dấu âm khi in A4): chỉ bỏ dấu gạch/chấm đầu dòng khi
    // đó KHÔNG PHẢI dấu âm của số liệu (vd "- 517.088.655" ở cột +/- ĐẦU
    // THÁNG/QUÝ/NĂM của các chỉ tiêu chưa đạt kế hoạch). Nếu sau chuỗi
    // gạch/khoảng trắng đầu dòng là một CHỮ SỐ thì giữ nguyên toàn bộ
    // (không dùng regex 1 bước vì \s* có thể backtrack qua lookahead
    // và vẫn ăn mất dấu "-" đứng trước khoảng trắng + số).
    if(!/^[\-–—·•.,:;|]+\s*\d/.test(s)){
      s = s.replace(/^[\-–—·•.,:;|]+\s*/,'');
    }
    return s.trim();
  }
  function normKey(t){
    return stripIcons(t).toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu,'')                  // bỏ dấu câu/khoảng trắng
      .normalize('NFC');
  }
  // Có phải ô/cột chỉ chứa điều khiển (checkbox / nút / select) ?
  function isControlCell(cell){
    if(!cell) return false;
    if(cell.querySelector('input,select,textarea,button')) {
      // nếu ngoài control còn text dữ liệu thật thì KHÔNG coi là cột điều khiển
      var clone=cell.cloneNode(true);
      clone.querySelectorAll('input,select,textarea,button').forEach(function(n){n.remove();});
      return stripIcons(clone.textContent).length===0;
    }
    return false;
  }
  // Trả về bản CLONE đã chuẩn hoá của 1 <table> để đưa vào bản in
  function sanitizeTable(tb){
    var t = tb.cloneNode(true);
    // 1) select/dropdown -> text của option đang chọn (giữ text badge/trạng thái)
    var _clSelects = Array.prototype.slice.call(t.querySelectorAll('select'));
    Array.prototype.forEach.call(tb.querySelectorAll('select'), function(orig, i){
      var cl = _clSelects[i];
      if(!cl || !cl.parentNode) return;
      var txt = '';
      try { txt = orig.selectedOptions && orig.selectedOptions[0] ? orig.selectedOptions[0].textContent : orig.value; } catch(e){}
      var span = t.ownerDocument.createElement('span');
      span.textContent = stripIcons(txt);
      cl.parentNode.replaceChild(span, cl);
    });
    // 2) bỏ mọi phần tử không in được
    t.querySelectorAll('.no-print,.btn,.btn-print-section,.scroll-nav-btn,button,input,textarea,svg,img,i.icon,.sort-arrow,.sort-indicator').forEach(function(n){ n.remove(); });
    // 3) bỏ icon/emoji trong mọi text node
    var w = t.ownerDocument.createTreeWalker(t, NodeFilter.SHOW_TEXT, null);
    var nodes=[]; while(w.nextNode()) nodes.push(w.currentNode);
    nodes.forEach(function(n){ var v = stripIcons(n.nodeValue); if(v!==n.nodeValue) n.nodeValue = v ? v+' ' : ''; });
    // 4) XOÁ HẲN các cột điều khiển (dựa trên bảng gốc, tính theo chỉ số cột)
    var headRow = tb.tHead ? tb.tHead.rows[tb.tHead.rows.length-1] : (tb.rows[0]||null);
    var bodyRows = Array.prototype.slice.call(tb.rows);
    var colCount = headRow ? headRow.cells.length : 0;
    var drop = [];
    for(var c=0;c<colCount;c++){
      var ctrl=0, filled=0;
      bodyRows.forEach(function(r){
        var cell = r.cells[c]; if(!cell) return;
        if(cell.querySelector('input,select,textarea,button')) ctrl++;
        if(stripIcons(cell.textContent).length) filled++;
      });
      if(ctrl>0 && filled===0) drop.push(c);
      else if(ctrl>=Math.max(2, bodyRows.length-2) && filled<=1) drop.push(c);
    }
    if(drop.length){
      Array.prototype.forEach.call(t.rows, function(r){
        for(var i=drop.length-1;i>=0;i--){ if(r.cells[drop[i]]) r.deleteCell(drop[i]); }
      });
    }
    // 5) bỏ hàng trống hoàn toàn sinh ra sau khi dọn
    Array.prototype.slice.call(t.rows).forEach(function(r){
      if(!stripIcons(r.textContent).length && r.parentNode) r.parentNode.removeChild(r);
    });
    return t;
  }
  window.TD_PRINT = { stripIcons: stripIcons, normKey: normKey, sanitizeTable: sanitizeTable, isControlCell: isControlCell };
})();
