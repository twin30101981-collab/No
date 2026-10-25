
(function(){
  "use strict";
  let _bcnSub = 'kh'; // 'kh' | 'dn'

  function _fmt(n){
    n = Math.round(Number(n)||0);
    if(n===0) return '-';
    if(n<0) return '- ' + Math.abs(n).toLocaleString('vi-VN');
    return n.toLocaleString('vi-VN');
  }
  function _pad(n){ return String(n).padStart(2,'0'); }
  function _ddmmyyyy(d){ return `${_pad(d.getDate())}/${_pad(d.getMonth()+1)}/${d.getFullYear()}`; }

  // ─── BCN snapshot resolver — đồng bộ pipeline với Theo CBTD (TDCMP v2) ───
  // Replicate logic của TDCMP.archiveSnapDate để map snapshot → 'yyyy-mm-dd'
  function _snapDateOf(snap){
    if(!snap) return null;
    const t = snap.tag;
    const last = (y, m0) => new Date(y, m0+1, 0).getDate();
    if(t && t.kind && t.year){
      if(t.kind === 'year_end') return t.year + '-12-31';
      if(t.kind === 'quarter' && t.quarter>=1 && t.quarter<=4){
        const qm = t.quarter*3;
        return `${t.year}-${_pad(qm)}-${_pad(last(t.year, qm-1))}`;
      }
      if(t.kind === 'month' && t.month>=1 && t.month<=12){
        return `${t.year}-${_pad(t.month)}-${_pad(last(t.year, t.month-1))}`;
      }
    }
    const s = String(snap.date || '');
    const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if(m) return `${m[3]}-${_pad(+m[2])}-${_pad(+m[1])}`;
    if(snap.timestamp){
      const d = new Date(snap.timestamp);
      return `${d.getFullYear()}-${_pad(d.getMonth()+1)}-${_pad(d.getDate())}`;
    }
    return null;
  }
  function _hasData(s){ return !!(s && Array.isArray(s.reportData) && s.reportData.length); }

  // Tìm snapshot ĐẦY ĐỦ (loại meta-only) cho 1 ngày — nếu trùng ngày, chọn timestamp mới nhất
  function _findSnapByDate(targetDate){
    if(!targetDate || !Array.isArray(window._archiveReportList)) return null;
    let best = null;
    for(const s of _archiveReportList){
      if(!_hasData(s)) continue;
      if(_snapDateOf(s) !== targetDate) continue;
      if(!best || (s.timestamp||0) > (best.timestamp||0)) best = s;
    }
    return best;
  }

  // Có snapshot tại đúng date nhưng chỉ có meta? (để cảnh báo chuẩn)
  function _hasMetaOnlyAtDate(targetDate){
    if(!targetDate || !Array.isArray(window._archiveReportList)) return false;
    return _archiveReportList.some(s => _snapDateOf(s) === targetDate && !_hasData(s));
  }

  // Local fallback resolver (chỉ chạy khi không có TDCMP) — auto-marker + near ±3 ngày
  function _localResolveDates(today){
    const list = (Array.isArray(window._archiveReportList) ? _archiveReportList : []).filter(_hasData);
    const byDate = {};
    const markers = { eom:{}, eoq:{}, eoy:{} };
    for(const s of list){
      const d = _snapDateOf(s); if(!d) continue;
      if(!byDate[d] || (s.timestamp||0) > (byDate[d].timestamp||0)) byDate[d] = s;
      const t = s.tag;
      if(t && t.kind==='year_end' && t.year) markers.eoy[String(t.year)] = d;
      if(t && t.kind==='quarter' && t.year && t.quarter) markers.eoq[t.year+'-Q'+t.quarter] = d;
      if(t && t.kind==='month'   && t.year && t.month)   markers.eom[t.year+'-'+_pad(t.month)] = d;
      // Auto-marker khi ngày trùng cuối tháng/quý/năm dù chưa tag
      const [Y,M,D] = d.split('-').map(Number);
      const lastDay = new Date(Y, M, 0).getDate();
      if(D===lastDay){
        const km = Y+'-'+_pad(M); if(!markers.eom[km]) markers.eom[km] = d;
        if(M===3||M===6||M===9||M===12){
          const q = M/3, kq = Y+'-Q'+q;
          if(!markers.eoq[kq]) markers.eoq[kq] = d;
        }
        if(M===12 && D===31 && !markers.eoy[String(Y)]) markers.eoy[String(Y)] = d;
      }
    }
    const dates = Object.keys(byDate).sort();
    const findNear = (target, tol) => {
      if(!target) return null;
      let best=null, bestDiff=Infinity;
      const tD = new Date(target);
      for(const ds of dates){
        const diff = Math.abs(Math.round((new Date(ds) - tD)/86400000));
        if(diff<=tol && diff<bestDiff){ best=ds; bestDiff=diff; }
      }
      return best;
    };
    const yr = today.getFullYear();
    const curQ = Math.floor(today.getMonth()/3);
    const prevQ = curQ===0 ? 3 : curQ-1;
    const prevQYear = curQ===0 ? yr-1 : yr;
    const prevMonth = new Date(yr, today.getMonth()-1, 1);
    const eomKey = prevMonth.getFullYear()+'-'+_pad(prevMonth.getMonth()+1);
    const _eomDt = new Date(prevMonth.getFullYear(), prevMonth.getMonth()+1, 0);
    const eomTarget = `${_eomDt.getFullYear()}-${_pad(_eomDt.getMonth()+1)}-${_pad(_eomDt.getDate())}`;
    const eoqKey = prevQYear+'-Q'+(prevQ+1);
    const _eoqDt = new Date(prevQYear, prevQ*3+3, 0);
    const eoqTarget = `${_eoqDt.getFullYear()}-${_pad(_eoqDt.getMonth()+1)}-${_pad(_eoqDt.getDate())}`;
    const prevYear = yr-1;
    const eoyTarget = `${prevYear}-12-31`;

    // v13.9.1-fix: theo yêu cầu user — chỉ khớp ngày tuyệt đối qua marker tag
    // (hoặc auto-marker khi date trùng cuối kỳ). Bỏ findNear ±3 ngày để
    // tránh kéo nhầm snapshot lân cận.
    return {
      EoM1: markers.eom[eomKey] || null,
      EoQ1: markers.eoq[eoqKey] || null,
      EoY1: markers.eoy[String(prevYear)] || null,
    };
  }

  // Trả về { aggNam, aggQuy, aggThang, warns[] } — warns phân biệt 3 trạng thái
  // v13.9.1-fix: ĐỒNG BỘ NGUỒN với các tab Tổng quan/Theo Phòng/Theo loại vay/Khách hàng.
  // Chỉ đọc _archiveReportList (LƯU TRỮ FILE → Báo cáo). Không đi qua TDCMP.snapStore
  // nữa vì kho đó (key TD.snap.*) là riêng của tab Theo CBTD và thường lệch với
  // archive của user → khiến 3 cột Đầu năm/Quý/Tháng trống dù snapshot có sẵn.
  function _resolveMocs(today){
    const local = _localResolveDates(today);
    const EoY1 = local.EoY1, EoQ1 = local.EoQ1, EoM1 = local.EoM1;
    const aggNam   = _aggForDate(EoY1);
    const aggQuy   = _aggForDate(EoQ1);
    const aggThang = _aggForDate(EoM1);
    const warns = [];
    const _w = (label, date, agg) => {
      if(agg && agg._ok) return;
      if(date && _hasMetaOnlyAtDate(date))
        warns.push(`${label} (snapshot CHỈ META — thiếu reportData, cần lưu lại từ file .qltd gốc)`);
      else
        warns.push(label + (date? ` (${date})`:''));
    };
    _w('Đầu năm',   EoY1, aggNam);
    _w('Đầu quý',   EoQ1, aggQuy);
    _w('Đầu tháng', EoM1, aggThang);
    return { aggNam, aggQuy, aggThang, warns };
  }

  // Trả về aggregation chuẩn { rid:{kh,dn}, _ok:bool } cho 1 ngày mốc.
  // v13.9.1-fix: chỉ dùng _archiveReportList — cùng nguồn với các tab khác.
  function _aggForDate(date){
    if(!date) return { _ok:false };
    const arSnap = _findSnapByDate(date);
    if(arSnap && Array.isArray(arSnap.reportData) && arSnap.reportData.length){
      const a = _agg(arSnap.reportData);
      a._ok = true; a._src = 'archive';
      return a;
    }
    return { _ok:false };
  }

  // Aggregate one dataset → { rowId: {kh, dn} }
  function _agg(dataset){
    if(typeof bckhAggregateData !== 'function' || !Array.isArray(dataset)) return {};
    /* v13.9.7 FIX: tôn trọng filter Loại vay từ CTKH */
    let ds = dataset;
    try {
      const f = window.__ctkhFilter;
      if (f && f.loaiVay) {
        ds = dataset.filter(function(r){ return String((r&&r[13])||'').toLowerCase().includes(f.loaiVay); });
      }
    } catch(_e){}
    const a = bckhAggregateData(ds);
    const out = {};
    Object.entries(a).forEach(([rid,v])=>{ if (rid === '__chuaphan') return; out[rid] = { kh: v.khAll||0, dn: (v.dnAll||0) }; }); // HM-09
    return out;
  }


  // Plan from localStorage ctkh_plan_v2 → per-CBTD quarterly
  function _planByRowId(){
    const out = {};
    try{
      const raw = localStorage.getItem('ctkh_plan_v2');
      if(!raw) return out;
      const plan = JSON.parse(raw);
      const map = (typeof bckhBuildCBTDMap==='function') ? bckhBuildCBTDMap() : {};
      Object.entries(plan.keHoachCBTD||{}).forEach(([nameKey, v])=>{
        const norm = (typeof bckhNormName==='function') ? bckhNormName(nameKey) : String(nameKey).toLowerCase();
        const rid = map[norm];
        if(!rid) return;
        out[rid] = {
          khQuy: Math.round((Number(v.slKH)||0)/4),
          dnQuy: Math.round((Number(v.tongDuNo)||0)/4),
          khNam: Math.round(Number(v.slKH)||0),
          dnNam: Math.round(Number(v.tongDuNo)||0),
        };
      });
    }catch(e){ console.warn('[BCN] plan load err', e); }
    return out;
  }

  // Build rows: iterate BCKH_PHONG → CBTD members → phong subtotal → grand total
  function _buildRows(today){
    if(typeof BCKH_PHONG === 'undefined') return { rows:[], warn:'Thiếu cấu hình BCKH_PHONG' };
    const mocs = _resolveMocs(today);
    const live = (typeof DATA!=='undefined' && Array.isArray(DATA.qltd)) ? DATA.qltd : [];
    const aLive   = _agg(live);
    const aNam    = mocs.aggNam   && mocs.aggNam._ok   ? mocs.aggNam   : {};
    const aQuy    = mocs.aggQuy   && mocs.aggQuy._ok   ? mocs.aggQuy   : {};
    const aThang  = mocs.aggThang && mocs.aggThang._ok ? mocs.aggThang : {};
    const plan = _planByRowId();

    const warns = mocs.warns || [];

    const rows = [];
    const totals = { dauNam:0, dauQuy:0, dauThang:0, bc:0, khQuy:0, plan:0,
                     dauNam_kh:0, dauQuy_kh:0, dauThang_kh:0, bc_kh:0 };
    const PK = (typeof BCKH_PHONG_KEYS!=='undefined') ? BCKH_PHONG_KEYS : ['hoiso','hbt','s2'];

    PK.forEach(pk=>{
      const phong = BCKH_PHONG[pk];
      const sub = { kind:'phong', name:phong.label, dauNam_kh:0,dauQuy_kh:0,dauThang_kh:0,bc_kh:0,
                    dauNam:0,dauQuy:0,dauThang:0,bc:0, khQuy:0, dnQuy:0 };
      (phong.members||[]).forEach((m,i)=>{
        const rid = `${pk}_${i}`;
        const ln  = aNam[rid]||{kh:0,dn:0};
        const lq  = aQuy[rid]||{kh:0,dn:0};
        const lt  = aThang[rid]||{kh:0,dn:0};
        const lb  = aLive[rid]||{kh:0,dn:0};
        const pl  = plan[rid]||{khQuy:0,dnQuy:0};
        rows.push({ kind:'cbtd', phong:pk, name:m.name,
          dauNam_kh:ln.kh, dauQuy_kh:lq.kh, dauThang_kh:lt.kh, bc_kh:lb.kh,
          dauNam:ln.dn,    dauQuy:lq.dn,    dauThang:lt.dn,    bc:lb.dn,
          khQuy:pl.khQuy, dnQuy:pl.dnQuy });
        sub.dauNam_kh+=ln.kh; sub.dauQuy_kh+=lq.kh; sub.dauThang_kh+=lt.kh; sub.bc_kh+=lb.kh;
        sub.dauNam+=ln.dn;    sub.dauQuy+=lq.dn;    sub.dauThang+=lt.dn;    sub.bc+=lb.dn;
        sub.khQuy+=pl.khQuy;  sub.dnQuy+=pl.dnQuy;
      });
      rows.push(sub);
      totals.dauNam_kh+=sub.dauNam_kh; totals.dauQuy_kh+=sub.dauQuy_kh; totals.dauThang_kh+=sub.dauThang_kh; totals.bc_kh+=sub.bc_kh;
      totals.dauNam+=sub.dauNam; totals.dauQuy+=sub.dauQuy; totals.dauThang+=sub.dauThang; totals.bc+=sub.bc;
      totals.khQuy+=sub.khQuy; totals.plan+=sub.dnQuy;
    });
    rows.push({ kind:'tong', name:'TỔNG', ...totals, dnQuy: totals.plan });
    return { rows, warn: warns.length? `⚠ Chưa có snapshot mốc: ${warns.join(', ')} — các cột tương ứng sẽ trống.` : '' };
  }

  function _renderTable(sub){
    const today = new Date();
    const built = _buildRows(today);
    const isKH = sub==='kh';
    /* v13.9.2: dùng ngày import IPCAS thay vì ngày hệ thống */
    const importDate = (window._importDateActual || (typeof localStorage!=='undefined' && localStorage.getItem('_currentFileDate')) || '').trim();
    const dateStr = importDate || _ddmmyyyy(today);
    document.getElementById('bcn-header').textContent =
      (isKH ? 'BÁO CÁO KHÁCH HÀNG ĐẾN NGÀY ' : 'BÁO CÁO DƯ NỢ HÀNG NGÀY ĐẾN NGÀY ') + dateStr;
    const warnEl = document.getElementById('bcn-warn');
    warnEl.textContent = built.warn || '';

    const cols = isKH
      ? ['CBTD','Đầu năm','Đầu quý','Đầu tháng','Ngày BC','+/- đầu tháng','+/- đầu quý','+/- đầu năm','+/- KH quý','Kế hoạch']
      : ['CBTD','Đầu năm','Đầu quý','Đầu tháng','Ngày BC','+/- đầu tháng','+/- đầu quý','+/- đầu năm','+/- kế hoạch','Kế hoạch quý'];

    const pick = (r)=> isKH
      ? { dn:r.dauNam_kh, dq:r.dauQuy_kh, dt:r.dauThang_kh, bc:r.bc_kh, plan:r.khQuy }
      : { dn:r.dauNam,    dq:r.dauQuy,    dt:r.dauThang,    bc:r.bc,    plan:r.dnQuy };

    let html = '<table id="bcn-table" style="width:100%;border-collapse:collapse;font-size:12px;background:#fff">';
    html += '<thead><tr>' + cols.map((c,i)=>`<th style="border:1px solid #cbd5e1;padding:6px 8px;background:#1e3a8a;color:#fff;text-align:${i===0?'left':'center'};font-weight:700">${c}</th>`).join('') + '</tr></thead><tbody>';

    built.rows.forEach(r=>{
      const v = pick(r);
      const dBC_dT = v.bc - v.dt;
      const dBC_dQ = v.bc - v.dq;
      const dBC_dN = v.bc - v.dn;
      const dBC_plan = v.bc - v.plan;
      let bg='', fw='400', col='#0f172a';
      if(r.kind==='phong'){ bg='#eff6ff'; fw='700'; col='#1e3a8a'; }
      if(r.kind==='tong'){  bg='#fde68a'; fw='800'; col='#7c2d12'; }
      html += `<tr style="background:${bg};font-weight:${fw};color:${col}">`;
      html += `<td style="border:1px solid #cbd5e1;padding:6px 8px;text-align:left">${(typeof escapeHtml==='function'?escapeHtml(r.name||''):(r.name||''))}</td>`;
      [v.dn, v.dq, v.dt, v.bc, dBC_dT, dBC_dQ, dBC_dN, dBC_plan, v.plan].forEach(x=>{
        html += `<td style="border:1px solid #cbd5e1;padding:6px 8px;text-align:right;font-variant-numeric:tabular-nums">${_fmt(x)}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
    document.getElementById('bcn-table-wrap').innerHTML = html;
    // Cache built rows for export
    window._bcnBuilt = { built, sub, dateStr, cols };
  }

  function bcnRender(){
    /* v13.9.7 FIX: re-render kèm filter CTKH */
    _renderTable(_bcnSub);
    _applyCtkhScopeFilter();
  }
  function _applyCtkhScopeFilter(){
    try {
      var f = window.__ctkhFilter; if (!f) return;
      var tbl = document.getElementById('bcn-table'); if (!tbl) return;
      var rows = tbl.querySelectorAll('tbody tr');
      var PK = (typeof BCKH_PHONG_KEYS!=='undefined') ? BCKH_PHONG_KEYS : ['hoiso','hbt','s2'];
      var phongNames = PK.map(function(pk){ return (BCKH_PHONG[pk]&&BCKH_PHONG[pk].label||'').toLowerCase(); });
      // Build CBTD→phongLabel map
      var cbtdToPhong = {};
      PK.forEach(function(pk){
        var p = BCKH_PHONG[pk]; if (!p) return;
        (p.members||[]).forEach(function(m){ cbtdToPhong[(m.name||'').toLowerCase()] = (p.label||'').toLowerCase(); });
      });
      var scope = f.scope || 'chinhanh';
      var scopeId = (f.scopeId || '').toLowerCase();
      rows.forEach(function(tr){
        var firstCell = tr.cells && tr.cells[0]; if (!firstCell) return;
        var name = (firstCell.textContent||'').trim().toLowerCase();
        var isTong = /^t[ổo]ng/i.test(name);
        var isPhong = phongNames.indexOf(name) >= 0;
        var keep = true;
        if (scope === 'phong') {
          /* chỉ giữ dòng phòng đó + CBTD thuộc phòng đó + dòng tổng */
          if (isTong) keep = true;
          else if (isPhong) keep = (name === scopeId);
          else keep = (cbtdToPhong[name] === scopeId);
        } else if (scope === 'cbtd') {
          /* chỉ giữ 1 CBTD + tổng */
          if (isTong) keep = true;
          else if (isPhong) keep = false;
          else keep = (name === scopeId);
        }
        tr.style.display = keep ? '' : 'none';
      });
    } catch(e){ console.warn('[v13.9.7] BCN scope filter', e); }
  }
  function bcnSwitchSub(sub){
    _bcnSub = sub;
    document.querySelectorAll('#bcn-subtab-nav .ctkh-tab').forEach(b=> b.classList.toggle('active', b.getAttribute('data-bcn')===sub));
    bcnRender();
  }

  function _aoaFor(sub){
    const cached = window._bcnBuilt;
    if(!cached || cached.sub !== sub){
      // build fresh for this sub
      _bcnSub = sub; _renderTable(sub);
    }
    const { built, cols } = window._bcnBuilt;
    const isKH = sub==='kh';
    const aoa = [cols.slice()];
    built.rows.forEach(r=>{
      const v = isKH
        ? { dn:r.dauNam_kh, dq:r.dauQuy_kh, dt:r.dauThang_kh, bc:r.bc_kh, plan:r.khQuy }
        : { dn:r.dauNam,    dq:r.dauQuy,    dt:r.dauThang,    bc:r.bc,    plan:r.dnQuy };
      aoa.push([r.name||'',
        Math.round(v.dn), Math.round(v.dq), Math.round(v.dt), Math.round(v.bc),
        Math.round(v.bc - v.dt), Math.round(v.bc - v.dq), Math.round(v.bc - v.dn),
        Math.round(v.bc - v.plan), Math.round(v.plan)]);
    });
    return aoa;
  }

  function bcnExportExcel(){
    if(typeof XLSX === 'undefined'){ alert('Thư viện XLSX chưa tải'); return; }
    const today = new Date(); const ds = _ddmmyyyy(today).replace(/\//g,'-');
    const wb = XLSX.utils.book_new();
    const aoaKH = _aoaFor('kh'); aoaKH.unshift(['BÁO CÁO KHÁCH HÀNG ĐẾN NGÀY '+_ddmmyyyy(today)]); aoaKH.unshift([]);
    const aoaDN = _aoaFor('dn'); aoaDN.unshift(['BÁO CÁO DƯ NỢ ĐẾN NGÀY '+_ddmmyyyy(today)+' (đồng)']); aoaDN.unshift([]);
    const sKH = XLSX.utils.aoa_to_sheet(aoaKH); sKH['!cols'] = [{wch:24}].concat(Array(9).fill({wch:13}));
    const sDN = XLSX.utils.aoa_to_sheet(aoaDN); sDN['!cols'] = [{wch:24}].concat(Array(9).fill({wch:13}));
    XLSX.utils.book_append_sheet(wb, sKH, 'Khách hàng');
    XLSX.utils.book_append_sheet(wb, sDN, 'Dư nợ');
    XLSX.writeFile(wb, `BaoCaoNgay_${ds}.xlsx`);
  }

  function bcnExportWord(){
    // Simple HTML → .doc (Word opens it). Keeps deps light.
    const today = new Date(); const ds = _ddmmyyyy(today);
    const makeTable = (sub, title)=>{
      const aoa = _aoaFor(sub);
      const head = aoa[0];
      const body = aoa.slice(1);
      let h = `<h3 style="text-align:center">${title} ${ds}${sub==='dn'?' (đồng)':''}</h3>`;
      h += '<table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;width:100%;font-size:11px;font-family:Arial">';
      h += '<tr>' + head.map(c=>`<th style="background:#1e3a8a;color:#fff;text-align:center">${c}</th>`).join('') + '</tr>';
      body.forEach(r=>{
        h += '<tr>' + r.map((c,i)=>{
          const txt = (i===0)? c : (Number(c)===0?'-':Number(c).toLocaleString('vi-VN'));
          return `<td style="text-align:${i===0?'left':'right'}">${txt}</td>`;
        }).join('') + '</tr>';
      });
      h += '</table>';
      return h;
    };
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>Báo cáo ngày</title>
      <xml><w:WordDocument><w:View>Print</w:View><w:Zoom>90</w:Zoom></w:WordDocument></xml>
      <style>@page{size:A4 landscape;margin:1.5cm} body{font-family:Arial}</style></head><body>`
      + makeTable('kh','BÁO CÁO KHÁCH HÀNG ĐẾN NGÀY')
      + '<br style="page-break-before:always">'
      + makeTable('dn','BÁO CÁO DƯ NỢ ĐẾN NGÀY')
      + '</body></html>';
    const blob = new Blob(['\ufeff'+html], { type:'application/msword' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `BaoCaoNgay_${ds.replace(/\//g,'-')}.doc`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
  }

  function bcnPrint(){
    const tbl = document.getElementById('bcn-table');
    if(!tbl){ alert('Chưa có bảng để in'); return; }
    const header = document.getElementById('bcn-header').textContent;
    const w = window.open('', '_blank', 'width=1200,height=800');
    w.document.documentElement.innerHTML = `<head><meta charset="utf-8"><title>${header}</title>
      <style>@page{size:A4 landscape;margin:1cm} body{font-family:Arial;font-size:11px}
      h3{text-align:center;color:#1e3a8a} table{border-collapse:collapse;width:100%}
      th,td{border:1px solid #555;padding:4px 6px} th{background:#1e3a8a;color:#fff}
      td:not(:first-child){text-align:right;font-variant-numeric:tabular-nums}
      tr.phong td{background:#eff6ff;font-weight:700} tr.tong td{background:#fde68a;font-weight:800}
      .qltd-preview-bar{position:sticky;top:0;background:#1a2540;padding:8px 14px;text-align:right}
      .qltd-preview-bar button{background:#2e7d32;color:#fff;border:0;border-radius:4px;padding:8px 16px;font-size:13px;font-weight:700;cursor:pointer}
      @media print{.qltd-preview-bar{display:none}}
      </style></head><body>
      <div class="qltd-preview-bar">🔎 Xem trước — kiểm tra nội dung trước khi in &nbsp; <button onclick="window.print()">🖨️ In ngay</button></div>
      <h3>${header}</h3>${tbl.outerHTML}</body>`;
    // FIX (07/09/2026): không còn tự động gọi w.print() — xem trước rồi bấm nút mới in.
    try { w.focus(); } catch(e) {}
  }

  // expose
  window.bcnRender = bcnRender;
  window.bcnSwitchSub = bcnSwitchSub;
  window.bcnExportExcel = bcnExportExcel;
  window.bcnExportWord = bcnExportWord;
  window.bcnPrint = bcnPrint;
})();
