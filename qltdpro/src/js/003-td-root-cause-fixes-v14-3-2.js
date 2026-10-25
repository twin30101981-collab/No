
/* ═══════════════════════════════════════════════════════════════
   v14.3.2 — FIX GỐC RỄ (2026-08-11)
   Phải chạy ĐẦU TIÊN trong <head>, trước mọi script khác.
   ═══════════════════════════════════════════════════════════════

   FIX A — "console.info is not a function" (và các TypeError tương tự
   cho console.warn/error/debug) khi chạy trong WebView không có sẵn
   console.info (ví dụ WebView trong app Zalo/Android khi chưa gắn
   remote-debugging — console.log/warn/error tồn tại nhưng console.info
   thì không). Đây là hành vi thật của native console trong môi trường
   đó, không phải do code ở đây — nhưng ~30 lệnh gọi console.info(...)
   rải khắp app (trong loadData(), applyTKSTTMapping(),
   injectTKSTTPlaceholders(), TD-AUDIT, v.v.) không có try/catch riêng,
   nên khi gặp môi trường thiếu console.info sẽ ném lỗi và cắt ngang
   luôn hàm đang chạy — đúng như 3 lỗi "[INIT] ... failed: TypeError:
   console.info is not a function" quan sát được.
   Sửa: đảm bảo console.log/info/warn/error/debug/trace luôn tồn tại
   như hàm (no-op nếu thiếu) TRƯỚC khi bất kỳ code nào khác chạy. */
(function(){
  try{
    var c = window.console;
    if (!c || typeof c !== 'object') c = {};
    var noop = function(){};
    ['log','info','warn','error','debug','trace','group','groupEnd','table','assert','time','timeEnd']
      .forEach(function(m){ if (typeof c[m] !== 'function') c[m] = noop; });
    window.console = c;
  }catch(_){}
})();

/* FIX C — "ReferenceError: buildColumnFilters is not defined".
   3 hàm này (buildColumnFilters/colFilterApply/_colFilterReapply) vốn
   nằm trong script deferred #bgdat-scripts (chỉ tải khi rảnh/khi mở
   menu Bảng giá đất/Lưu trữ/Auto-Sync), nhưng lại được gọi ngay từ
   script lõi (renderTable(), qua setTimeout(...,0)) khi trang vừa tải
   xong lần render bảng đầu tiên — trước khi bgdat kịp tải xong.
   Đây là lỗi "module ownership": tính năng lọc cột dùng chung cho mọi
   bảng dữ liệu chính không phải tính năng riêng của bgdat, nên được
   dời nguyên khối sang đây (script lõi, tải ngay, chạy đầu tiên) thay
   vì chỉ thêm hàm vào danh sách "stub & replay" — cách đó vẫn để lọc
   cột bị trễ một nhịp mỗi lần trang vừa tải xong.
   (Bản thân nội dung 3 hàm giữ nguyên 100% — tính năng lọc theo cột
   đã bị người dùng yêu cầu tắt trước đó qua early-return, không đổi.) */
const _colFilterState = {}; // { tableId: { colIdx: filterValue } }

function buildColumnFilters(tableId) {
  const table = $(tableId);
  if (!table) return;
  const thead = table.querySelector('thead');
  if (!thead) return;

  // Remove old filter row if exists
  const old = thead.querySelector('tr.col-filter-row');
  if (old) old.remove();

  const headerRows = thead.querySelectorAll('tr');
  const lastRow = headerRows[headerRows.length - 1];
  if (!lastRow) return;
  const cells = lastRow.querySelectorAll('th');
  if (!cells.length) return;
  /* DISABLED per-column search filter (user request) */
  const _oldCFR = thead.querySelector('tr.col-filter-row'); if(_oldCFR) _oldCFR.remove();
  return;

  const existing = _colFilterState[tableId] || {};
  const filterRow = document.createElement('tr');
  filterRow.className = 'col-filter-row';

  cells.forEach((th, i) => {
    const td = document.createElement('th');
    td.className = 'col-filter-th';
    const hasColspan = parseInt(th.getAttribute('colspan') || '1') > 1;
    const isChk = th.classList.contains('col-check') || th.classList.contains('col-check-all');
    if (hasColspan || isChk) {
      td.innerHTML = ''; // empty cell for structural columns
    } else {
      const val = existing[i] || '';
      const safeId = tableId.replace(/[^a-z0-9]/gi,'');
      td.innerHTML = `<input type="text" value="${escapeHtml(val)}"
        class="col-filter-inp" data-col="${i}"
        placeholder="🔍" title="Lọc cột này"
        oninput="colFilterApply(event,'${tableId}')"
        onclick="event.stopPropagation()"
        style="width:100%;box-sizing:border-box;padding:2px 5px;font-size:10px;
          background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.28);
          border-radius:3px;color:#fff;font-family:inherit;outline:none;min-width:24px;
          placeholder-color:rgba(255,255,255,.45)">`;
    }
    filterRow.appendChild(td);
  });

  thead.appendChild(filterRow);
  // Re-apply existing filters after rebuild
  _colFilterReapply(tableId);
}

function colFilterApply(event, tableId) {
  const input = event.target;
  const colIdx = parseInt(input.dataset.col);
  if (!_colFilterState[tableId]) _colFilterState[tableId] = {};
  const val = input.value.trim().toLowerCase();
  if (val) _colFilterState[tableId][colIdx] = val;
  else delete _colFilterState[tableId][colIdx];
  _colFilterReapply(tableId);
}

function _colFilterReapply(tableId) {
  const table = $(tableId);
  if (!table) return;
  const filters = _colFilterState[tableId] || {};
  const activeEntries = Object.entries(filters);
  table.querySelectorAll('tbody tr').forEach(tr => {
    if (!activeEntries.length) { tr.style.display = ''; return; }
    const cells = tr.querySelectorAll('td');
    const show = activeEntries.every(([colStr, val]) => {
      const cell = cells[parseInt(colStr)];
      if (!cell) return true;
      return (cell.textContent || '').toLowerCase().includes(val);
    });
    tr.style.display = show ? '' : 'none';
  });
  // Update count badge
  const countEl = $('count-' + tableId.replace('table-',''));
  if (countEl && activeEntries.length) {
    const visible = [...table.querySelectorAll('tbody tr')].filter(r => r.style.display !== 'none').length;
    countEl.textContent = fmtNum(visible);
  }
}
