
/* User request: chip Qua han / Sap dao han / Nhom 2-5 phai loc dung bang phan ky TH */
(function(){
  function parseVNDate(s){ return window.TD.date.parse(s); } // HM-06
  function findRowData(makh){
    try{
      if(!window.DATA||!DATA.qltd) return null;
      for(var i=0;i<DATA.qltd.length;i++){ if(String(DATA.qltd[i][0])===String(makh)) return DATA.qltd[i]; }
    }catch(e){}
    return null;
  }
  function rowMatches(tr,label){
    var today=new Date(); today.setHours(0,0,0,0);
    var cells=tr.cells; if(!cells||cells.length<6) return false;
    var dateStr=(cells[5].textContent||'').trim();
    var d=parseVNDate(dateStr);
    if(label.indexOf('Qua h')>=0 || label.indexOf('han')===label.length-3 && label.indexOf('Qu')>=0){}
    if(label==='Qua han' || label.indexOf('Qu')===0){ return d && d<today; }
    if(label.indexOf('Sap')>=0 || label.indexOf('ap dao')>=0){
      if(!d) return false;
      var diff=Math.round((d-today)/86400000);
      return diff>=0 && diff<=30;
    }
    var nm=label.match(/Nh[^\s]*\s*([2-5])/);
    if(nm){
      var makh=(cells[2].textContent||'').trim();
      var row=findRowData(makh);
      if(row){
        for(var i=0;i<row.length;i++){
          var v=String(row[i]||'');
          if(v.indexOf('Nh')>=0 && v.indexOf(nm[1])>=0) return true;
        }
      }
      return false;
    }
    return false;
  }
  function applyPhanKyFilter(table, activeLabels, qtext){
    var tb=table.tBodies&&table.tBodies[0]; if(!tb) return;
    var rows=Array.prototype.slice.call(tb.rows);
    var q=(qtext||'').toLowerCase().trim();
    var hasA=activeLabels && activeLabels.length;
    rows.forEach(function(tr){
      if(tr.classList.contains('col-filter-row')) return;
      var ok=true;
      if(q){
        var txt=(tr.textContent||'').toLowerCase();
        if(txt.indexOf(q)<0) ok=false;
      }
      if(ok && hasA){
        ok=false;
        for(var i=0;i<activeLabels.length;i++){ if(rowMatches(tr,activeLabels[i])){ ok=true; break; } }
      }
      if(ok) tr.classList.remove('tdup3-hidden'); else tr.classList.add('tdup3-hidden');
    });
  }
  function attach(){
    var table=document.getElementById('table-phanky'); if(!table) return;
    var wrap=table.closest('.table-wrap')||table.parentNode;
    var chipBar=null, node=wrap?wrap.previousElementSibling:null;
    while(node){ if(node.classList && node.classList.contains('tdup3-chips')){ chipBar=node; break; } node=node.previousElementSibling; }
    if(!chipBar) return;
    if(chipBar.__phankyFixed) return; chipBar.__phankyFixed=true;
    var q=chipBar.querySelector('input.tdup3-q');
    var chips=chipBar.querySelectorAll('button.tdup3-chip');
    var active={};
    function recompute(){ applyPhanKyFilter(table, Object.keys(active), q?q.value:''); }
    chips.forEach(function(c){
      var label=(c.textContent||'').trim();
      if(label.charAt(0)==='X' || label.indexOf('Xoa')===0 || label.indexOf('Xo')===0){
        c.addEventListener('click', function(){ active={}; if(q)q.value=''; chipBar.querySelectorAll('.tdup3-chip.tdup3-on').forEach(function(b){b.classList.remove('tdup3-on');}); recompute(); }, true);
        return;
      }
      c.addEventListener('click', function(ev){
        ev.stopImmediatePropagation();
        if(active[label]){ delete active[label]; c.classList.remove('tdup3-on'); }
        else { active[label]=1; c.classList.add('tdup3-on'); }
        recompute();
      }, true);
    });
    if(q) q.addEventListener('input', function(){ recompute(); });
  }
  var tries=0;
  var iv=setInterval(function(){
    tries++; attach();
    var t=document.getElementById('table-phanky');
    var wrap=t&&(t.closest('.table-wrap')||t.parentNode);
    var has=false, n=wrap?wrap.previousElementSibling:null;
    while(n){ if(n.classList&&n.classList.contains('tdup3-chips')){ has=true; break; } n=n.previousElementSibling; }
    if(has || tries>60) clearInterval(iv);
  }, 500);
})();
