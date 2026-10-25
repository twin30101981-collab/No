
/* ===== QA-OPT: Debounce dung chung cho cac o tim kiem/loc (an toan, khong doi ham goc) ===== */
window.__qaDebounceTimers = window.__qaDebounceTimers || {};
window.qaDebounce = function(key, fn, wait) {
  clearTimeout(window.__qaDebounceTimers[key]);
  window.__qaDebounceTimers[key] = setTimeout(fn, wait || 220);
};
