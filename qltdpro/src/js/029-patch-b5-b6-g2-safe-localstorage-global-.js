
// [PATCH B5/B6/G2] Safe localStorage + global rejection handler
window.safeLSSet = function(k, v){
  try { localStorage.setItem(k, v); return true; }
  catch(e){
    if (e && (e.name === 'QuotaExceededError' || e.code === 22)) console.warn('[LS] Quota exceeded:', k);
    else if (e && e.name === 'SecurityError') console.warn('[LS] Blocked (private mode?):', k);
    else console.error('[LS] setItem failed:', e);
    return false;
  }
};
window.safeLSGet = function(k){ try { return localStorage.getItem(k); } catch(e){ return null; } };
window.addEventListener('unhandledrejection', function(ev){
  console.error('[UnhandledRejection]', ev.reason);
});
