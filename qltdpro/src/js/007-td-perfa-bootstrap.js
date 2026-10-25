
/* PERF-A #2: skip setInterval ticks while tab is hidden — saves CPU when user is on another tab */
(function(){
  var _si = window.setInterval;
  window.setInterval = function(fn, ms){
    if (typeof fn !== 'function') return _si.apply(this, arguments);
    var rest = Array.prototype.slice.call(arguments, 2);
    return _si(function(){
      if (document.hidden) return;
      try { fn.apply(null, rest); } catch(e){ try{console.error('[TD si]', e);}catch(_){ } }
    }, ms);
  };
  /* PERF-A #6: silence console.log unless ?dev=1 (errors/warns kept) */
  try {
    var dev = /[?&]dev=1\b/.test(location.search) || localStorage.getItem('TD_DEV')==='1';
    if (!dev) { window.console = window.console || {}; window.console.log = function(){}; window.console.debug = function(){}; }
  } catch(_){}
})();
