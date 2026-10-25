
(function(){
  function pad2(n){ return String(n).padStart(2,'0'); }
  window.ufsPrintDateStr = function(){
    var d = new Date();
    return pad2(d.getDate())+'/'+pad2(d.getMonth()+1)+'/'+d.getFullYear();
  };
  window.ufsBuildPrintHeaderHTML = function(title, dateStr){
    dateStr = dateStr || window.ufsPrintDateStr();
    title = (title||'Bản in').replace(/[<>]/g,'');
    // FIX GỐC RỄ: tiêu đề lấy từ menu/card luôn kèm emoji (📅 🆕 📊...) => strip
    if(window.TD_PRINT) title = window.TD_PRINT.stripIcons(title) || 'Bản in';
    return '<div class="print-header">'
      + '<div class="ph-branch">Chi nhánh: Agribank Thiên Trường Nam Định</div>'
      + '<div class="ph-title">'+title+'</div>'
      + '<div class="ph-date">(Đến ngày '+dateStr+')</div>'
      + '</div>';
  };
  // Header cho in trực tiếp Ctrl+P trên trang chính (không qua cửa sổ popup A4)
  var _hdrEl = null;
  function insertNativeHeader(){
    removeNativeHeader();
    var title = document.body.getAttribute('data-print-title') || 'Bản in';
    _hdrEl = document.createElement('div');
    _hdrEl.id = '__native-print-header';
    _hdrEl.innerHTML = window.ufsBuildPrintHeaderHTML(title);
    document.body.insertBefore(_hdrEl, document.body.firstChild);
  }
  function removeNativeHeader(){
    if(_hdrEl && _hdrEl.parentNode) _hdrEl.parentNode.removeChild(_hdrEl);
    _hdrEl = null;
  }
  window.addEventListener('beforeprint', insertNativeHeader);
  window.addEventListener('afterprint', removeNativeHeader);
})();
