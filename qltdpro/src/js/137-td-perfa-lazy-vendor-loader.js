
/* PERF-A #1: lazy vendor loader — keeps inline vendor bundles out of the boot path */
(function(){
  var ric = window.requestIdleCallback || function(f){ return setTimeout(f, 1); };
  var pendingVendors = null, pendingBgdat = null;
  /* v14.3.2 FIX B — root cause của toàn bộ cảnh báo "[TD vendor] ... load
     failed" (pizzip/jszip/docxtemplater/filesaver/docx-umd/xlsx/mammoth +
     bgdat-scripts): cơ chế cũ tạo Blob từ nội dung script rồi gán làm
     script.src (URL.createObjectURL). Kỹ thuật này phụ thuộc trình duyệt
     hỗ trợ nạp <script src="blob:..."> — nhiều WebView nhúng trong app
     (ví dụ WebView trong Zalo) không hỗ trợ hoặc chặn việc này, khiến
     script.onerror luôn kích hoạt dù nội dung hoàn toàn hợp lệ (đây là
     lỗi 100% tái lập, không phải lỗi mạng — toàn bộ vendor đã nhúng sẵn
     offline trong chính file HTML, không tải qua CDN).
     Sửa tận gốc: bỏ hẳn Blob/ObjectURL, thực thi trực tiếp nội dung script
     bằng cách gán textContent cho một <script> mới rồi append vào head —
     cách này chạy đồng bộ ngay khi chèn (theo đúng chuẩn HTML) và không
     phụ thuộc Blob/ObjectURL/CSP script-src cho blob: ở bất kỳ WebView nào. */
  function loadQueue(sel){
    var nodes = document.querySelectorAll(sel);
    if (!nodes.length) return Promise.resolve();
    return Array.prototype.reduce.call(nodes, function(p, node){
      return p.then(function(){
        return new Promise(function(res){
          try{
            var s = document.createElement('script');
            s.text = node.textContent;
            document.head.appendChild(s);
            res();
          } catch(e){ try{ console.warn('[TD vendor]', node.id, 'load failed:', e); }catch(_){ } res(); }
        });
      });
    }, Promise.resolve());
  }
  function loadVendors(){
    if (pendingVendors) return pendingVendors;
    pendingVendors = loadQueue('script[type="application/x-td-deferred"][data-vendor="1"]')
      .then(function(){ window.dispatchEvent(new CustomEvent('td-vendors-ready')); });
    return pendingVendors;
  }
  function loadBgdat(){
    if (pendingBgdat) return pendingBgdat;
    pendingBgdat = loadQueue('script[type="application/x-td-deferred"][data-bgdat="1"]')
      .then(function(){ window.dispatchEvent(new CustomEvent('td-bgdat-ready')); });
    return pendingBgdat;
  }
  window.TD_ensureVendors = loadVendors;
  window.TD_ensureBgdat   = loadBgdat;
  /* Bgdat loads as soon as DOM is ready — it owns archive/autoSync/giá-đất modules
     so it must be available before user clicks those menus. */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadBgdat, {once:true});
  else loadBgdat();
  /* Vendors load after first paint, only when idle */
  if (document.readyState === 'complete') ric(loadVendors);
  else window.addEventListener('load', function(){ ric(loadVendors); }, {once:true});
  /* Eager-load vendors on export-ish button hover/click */
  document.addEventListener('click', function(e){
    var t = e.target.closest && e.target.closest('button,[role="button"],a');
    if (!t) return;
    var txt = (t.textContent||'').toLowerCase();
    if (/xuất|export|excel|word|docx|in a4|in bảng|tải/.test(txt)) loadVendors();
  }, true);
  /* Safety stubs: if any inline onclick references a bgdat function before bgdat is parsed,
     queue the call and replay after td-bgdat-ready. */
  var BGDAT_FNS = ['archiveSaveData','archiveLoadFromStorage','archiveSaveToStorage','archiveInit','archiveSwitchTab','archiveRenderDataList','archiveRenderReportList','archiveOpenCompareModal','archiveCloseCompareModal','autoSyncStart','autoSyncStop','autoSyncToggle','autoSyncSaveConfig','autoSyncLoadConfig','autoSyncRenderModal','autoSyncTickCountdown','autoSyncUpdateStatusUI','autoSyncSelectInterval','autoSyncRenderLog','autoSyncClear','openAutoSyncModal','closeAutoSyncModal','closeArchiveDeleteModal','bgd_filterAndRender','bgd_renderTable','bgd_renderPagination','bgd_renderStats','bgd_selectWard','bgd_setVT','bgd_goPage','bgd_tinhGia','bgd_resetForm','bgd_showSection','bgd_buildHeader','bgd_buildWardTabs','kh_tinhGia','kh_liveCalc','kh_reset'];
  var bgdatReady = false;
  window.addEventListener('td-bgdat-ready', function(){ bgdatReady = true; }, {once:true});
  BGDAT_FNS.forEach(function(name){
    if (typeof window[name] === 'function') return;
    window[name] = function(){
      if (bgdatReady) {
        /* The deferred bgdat script declared `function `/`const ` at top level,
           which lives in script lexical scope (NOT on window). So even after load,
           window[name] may still be this stub. Re-resolve via eval. */
        try { return (0,eval)(name).apply(this, arguments); } catch(_){}
      }
      var args = arguments, self = this;
      loadBgdat().then(function(){
        try { (0,eval)(name).apply(self, args); }
        catch(e){ console.warn('[TD bgdat] cannot replay '+name, e); }
      });
    };
  });
})();
