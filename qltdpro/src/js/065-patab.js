
function paTab(btn, panelId){
  document.querySelectorAll('#pa-app .tab-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('#pa-app .tab-panel').forEach(p=>p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(panelId).classList.add('active');
}

function paFmt(n){
  if(n===''||n===null||n===undefined||isNaN(n)) return '';
  return parseFloat(n).toLocaleString('vi-VN');
}

function paRecalc(tblId){
  var tbody = document.getElementById(tblId+'_body');
  if(!tbody) return;
  var total=0;
  var rows = tbody.querySelectorAll('tr');
  rows.forEach(function(tr,ri){
    var slEl = tr.querySelector('input[id$="_sl'+ri+'"]') || document.getElementById(tblId+'_sl'+ri);
    var dgEl = tr.querySelector('input[id$="_dg'+ri+'"]') || document.getElementById(tblId+'_dg'+ri);
    var ttEl = document.getElementById(tblId+'_tt'+ri);
    if(!slEl||!dgEl||!ttEl) return;
    var sl=parseFloat(slEl.value)||0;
    var dg=parseFloat(dgEl.value)||0;
    var tt=sl*dg;
    total+=tt;
    ttEl.textContent=paFmt(tt);
  });
  var sumEl=document.getElementById(tblId+'_sum');
  if(sumEl) sumEl.textContent=paFmt(total);
}

function paSelRow(tr){
  var tbl=tr.closest('table');
  if(!tbl) return;
  tbl.querySelectorAll('tbody tr').forEach(r=>r.classList.remove('sel-row'));
  tr.classList.add('sel-row');
}

function paAddRow(tblId){
  var tbody=document.getElementById(tblId+'_body');
  if(!tbody) return;
  var ri=tbody.querySelectorAll('tr').length;
  var tr=document.createElement('tr');
  tr.id=tblId+'_r'+ri;
  tr.onclick=function(){paSelRow(this);};
  tr.innerHTML='<td style="text-align:center;">'+(ri+1)+'</td>'
    +'<td class="t-cell"><input type="text" placeholder="Tên hàng hóa"></td>'
    +'<td style="text-align:center;"><input type="text" style="width:100%;border:none;font-size:11.5px;text-align:center;" placeholder="ĐV"></td>'
    +'<td class="i-cell"><input type="number" id="'+tblId+'_sl'+ri+'" value="" onchange=\'paRecalc(this.closest(&quot;[id]&quot;).id.split(&quot;_r&quot;)[0])\'></td>'
    +'<td class="i-cell"><input type="number" id="'+tblId+'_dg'+ri+'" value="" onchange=\'paRecalc(this.closest(&quot;[id]&quot;).id.split(&quot;_r&quot;)[0])\'></td>'
    +'<td class="f-cell" id="'+tblId+'_tt'+ri+'"></td>'
    +'<td></td><td class="l-cell"><input type="text" placeholder="Chỉ tiêu"></td>'
    +'<td class="i-cell"><input type="number" placeholder="Giá trị"></td>'
    +'<td></td><td></td>';
  tbody.appendChild(tr);
  paRecalc(tblId);
}

function paDelRow(tblId){
  var tbody=document.getElementById(tblId+'_body');
  if(!tbody) return;
  var sel=tbody.querySelector('tr.sel-row');
  if(!sel){alert('Chọn dòng cần xóa (click vào dòng)!');return;}
  if(!confirm('Xóa dòng này?')) return;
  sel.remove();
  paRecalc(tblId);
  // Renumber
  tbody.querySelectorAll('tr').forEach(function(tr,i){
    var td=tr.cells[0];
    if(td) td.textContent=i+1;
  });
}

function paSave(tblId){
  // Lưu dữ liệu vào localStorage theo tblId
  var tbody=document.getElementById(tblId+'_body');
  if(!tbody) return;
  var rows=[];
  tbody.querySelectorAll('tr').forEach(function(tr){
    var cells=[];
    tr.querySelectorAll('td').forEach(function(td){
      var inp=td.querySelector('input');
      cells.push(inp?inp.value:td.textContent.trim());
    });
    rows.push(cells);
  });
  try{
    localStorage.setItem('pa_'+tblId, JSON.stringify(rows));
    alert('✅ Đã lưu bảng '+tblId.split('_t')[1]+'!');
  }catch(e){
    alert('Không thể lưu: '+e.message);
  }
}

function paLoadSaved(){
  // Restore từ localStorage nếu có
  document.querySelectorAll('.pa-tbl').forEach(function(tbl){
    var id=tbl.id;
    var saved=null;
    try{saved=localStorage.getItem('pa_'+id);}catch(e){}
    if(!saved) return;
    var rows=JSON.parse(saved);
    var tbody=document.getElementById(id+'_body');
    if(!tbody||!rows.length) return;
    var existing=tbody.querySelectorAll('tr');
    rows.forEach(function(cells,ri){
      var tr=existing[ri];
      if(!tr) return;
      tr.querySelectorAll('td').forEach(function(td,ci){
        var inp=td.querySelector('input');
        if(inp) inp.value=cells[ci]||'';
      });
    });
    paRecalc(id);
  });
}

// Init: recalc tất cả bảng & load saved
(function(){
  document.querySelectorAll('.pa-tbl').forEach(function(tbl){
    paRecalc(tbl.id);
  });
  paLoadSaved();
})();
