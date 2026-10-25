
(function(){
'use strict';

// ─── Namespace ──────────────────────────────────────────────────
const TDCMP = window.TDCMP = {
  v: '1.1', // v13.9.0
  COL: { ma:0, ten:1, hd:2, duNo:11, cbtd:12, loaiVay:13, phong:17 },
  PREFIX: 'TD.snap.',
  IDX_KEY: 'TD.snap.index',
  MARK_KEY: 'TD.snap.markers',
  state: { level:'branch', anchor:'D1', customAnchor:null, cbtd:'' }
};

// ─── Utils ──────────────────────────────────────────────────────
const $$ = (s,r)=>(r||document).querySelector(s);
const fmtN = n => {
  if(n==null||isNaN(n)) return '—';
  const s = Math.abs(Math.round(n)).toLocaleString('vi-VN');
  return (n<0?'-':'')+s;
};
const fmtPct = (p) => {
  if(p==null||!isFinite(p)) return '—';
  return (p>0?'+':'')+p.toFixed(2)+'%';
};
const ymd = d => {
  if(typeof d==='string') return d.slice(0,10);
  const p = n => String(n).padStart(2,'0');
  return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());
};
const dmy = s => { if(!s) return '—'; const [y,m,d]=s.split('-'); return `${d}/${m}/${y}`; };
const parseYmd = s => { const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); };
const daysBetween = (a,b) => Math.round((parseYmd(a)-parseYmd(b))/86400000);
const lastDayOfMonth = (y,m) => new Date(y,m+1,0).getDate();

// ─── Snapshot Store ─────────────────────────────────────────────
TDCMP.snapStore = {
  index(){
    try{ return JSON.parse(localStorage.getItem(TDCMP.IDX_KEY)||'[]'); }catch(e){ return []; }
  },
  markers(){
    try{ return JSON.parse(localStorage.getItem(TDCMP.MARK_KEY)||'{"eom":{},"eoq":{},"eoy":{}}'); }
    catch(e){ return {eom:{},eoq:{},eoy:{}}; }
  },
  saveMarkers(m){ localStorage.setItem(TDCMP.MARK_KEY, JSON.stringify(m)); },
  get(date){
    try{ const raw = localStorage.getItem(TDCMP.PREFIX+date); return raw?JSON.parse(raw):null; }
    catch(e){ return null; }
  },
  save(date, rows){
    const totals = { duNo:0, byPhong:{}, byLoai:{}, count:rows.length };
    for(const r of rows){
      totals.duNo += r.duNo;
      totals.byPhong[r.phong] = (totals.byPhong[r.phong]||0) + r.duNo;
      totals.byLoai[r.loaiVay] = (totals.byLoai[r.loaiVay]||0) + r.duNo;
    }
    const snap = { date, source:'msit80', schemaVersion:42, savedAt: new Date().toISOString(), rows, totals };
    try{
      localStorage.setItem(TDCMP.PREFIX+date, JSON.stringify(snap));
    }catch(e){
      alert('⚠️ localStorage đầy. Vui lòng xoá snapshot cũ trong "Quản lý snapshot".');
      throw e;
    }
    const idx = this.index();
    if(!idx.includes(date)){ idx.push(date); idx.sort(); localStorage.setItem(TDCMP.IDX_KEY, JSON.stringify(idx)); }
    // Đánh dấu mốc tự động
    const d = parseYmd(date), y=d.getFullYear(), m=d.getMonth(), dd=d.getDate();
    const markers = this.markers();
    if(dd === lastDayOfMonth(y,m)){
      markers.eom[`${y}-${String(m+1).padStart(2,'0')}`] = date;
      if(m===2||m===5||m===8||m===11) markers.eoq[`${y}-Q${Math.floor(m/3)+1}`] = date;
      if(m===11&&dd===31) markers.eoy[String(y)] = date;
    }
    this.saveMarkers(markers);
    this.gc();
    return snap;
  },
  remove(date){
    localStorage.removeItem(TDCMP.PREFIX+date);
    const idx = this.index().filter(x=>x!==date);
    localStorage.setItem(TDCMP.IDX_KEY, JSON.stringify(idx));
    const m = this.markers();
    for(const k of ['eom','eoq','eoy']){
      for(const key of Object.keys(m[k])) if(m[k][key]===date) delete m[k][key];
    }
    this.saveMarkers(m);
  },
  gc(){
    // Giữ 90 snapshot gần nhất + tất cả mốc (eom/eoq/eoy)
    const idx = this.index();
    if(idx.length <= 90) return;
    const m = this.markers();
    const protectedDates = new Set([
      ...Object.values(m.eom), ...Object.values(m.eoq), ...Object.values(m.eoy)
    ]);
    const sorted = idx.slice().sort();
    const recent = new Set(sorted.slice(-90));
    for(const d of sorted){
      if(!recent.has(d) && !protectedDates.has(d)) this.remove(d);
    }
  },
  exportJson(){
    const all = { v: TDCMP.v, exportedAt: new Date().toISOString(), markers: this.markers(), snapshots: {} };
    for(const d of this.index()){ all.snapshots[d] = this.get(d); }
    return JSON.stringify(all);
  },
  importJson(text){
    const obj = JSON.parse(text);
    if(!obj.snapshots) throw new Error('File không hợp lệ');
    let n=0;
    for(const d of Object.keys(obj.snapshots)){
      const s = obj.snapshots[d];
      if(s && s.rows){
        localStorage.setItem(TDCMP.PREFIX+d, JSON.stringify(s));
        n++;
      }
    }
    if(obj.markers) this.saveMarkers(obj.markers);
    const idx = Object.keys(obj.snapshots).sort();
    const merged = Array.from(new Set([...this.index(), ...idx])).sort();
    localStorage.setItem(TDCMP.IDX_KEY, JSON.stringify(merged));
    return n;
  }
};

// ─── Đọc dữ liệu hiện tại từ DATA.qltd ──────────────────────────
TDCMP.captureToday = function(){
  const D = window.DATA && Array.isArray(window.DATA.qltd) ? window.DATA.qltd : [];
  const rows = [];
  const C = TDCMP.COL;
  for(const r of D){
    if(!r) continue;
    const ma = String(r[C.ma]||'').trim();
    const hd = String(r[C.hd]||'').trim();
    const dnx = Number(r[C.duNo])||0;
    if(!ma && !hd && !dnx) continue; // HM-09b: giữ dòng có dư nợ dù thiếu mã/HĐ (trước đây bỏ im lặng ⇒ lệch Dashboard)
    rows.push({
      ma, hd: hd || (ma ? '' : '~' + String(r[C.ten]||'').trim()),
      cbtd: String(r[C.cbtd]||'').trim(),
      ten: String(r[C.ten]||'').trim(),
      phong: String(r[C.phong]||'(Chưa rõ)').trim(),
      loaiVay: String(r[C.loaiVay]||'(Khác)').trim(),
      duNo: Number(r[C.duNo])||0
    });
  }
  return rows;
};

// v13.9.0: lọc rows theo CBTD đang chọn (rows phải có .cbtd)
TDCMP.applyCbtdFilter = function(rows){
  const f = (TDCMP.state.cbtd||'').trim();
  if(!f) return rows;
  // v13.9.8 FIX: snapshot cũ có thể thiếu r.cbtd → tra cứu theo mã KH từ DATA.qltd hiện tại
  let maMap = null;
  const buildMap = () => {
    const m = {};
    const D = window.DATA && Array.isArray(window.DATA.qltd) ? window.DATA.qltd : [];
    const C = TDCMP.COL;
    for(const x of D){
      if(!x) continue;
      const ma = String(x[C.ma]||'').trim();
      const cb = String(x[C.cbtd]||'').trim();
      if(ma && cb && !m[ma]) m[ma] = cb;
    }
    return m;
  };
  return rows.filter(r => {
    const c = (r.cbtd||'').trim();
    if(c) return c === f;
    if(!maMap) maMap = buildMap();
    return (maMap[r.ma]||'') === f;
  });
};

// v13.9.0: Danh sách CBTD có trong DATA.qltd hiện tại + tất cả snapshots
TDCMP.listCbtd = function(){
  const s = new Set();
  const D = window.DATA && Array.isArray(window.DATA.qltd) ? window.DATA.qltd : [];
  const C = TDCMP.COL;
  for(const r of D){ if(!r) continue; const c = String(r[C.cbtd]||'').trim(); if(c) s.add(c); }
  try{
    for(const d of TDCMP.snapStore.index()){
      const snap = TDCMP.snapStore.get(d);
      if(snap && Array.isArray(snap.rows)){
        for(const r of snap.rows){ if(r && r.cbtd) s.add(String(r.cbtd).trim()); }
      }
    }
  }catch(e){}
  return [...s].filter(Boolean).sort((a,b)=>a.localeCompare(b,'vi'));
};

// ─── Resolve 4 mốc anchor ───────────────────────────────────────
TDCMP.resolveAnchors = function(todayStr){
  const today = todayStr || ymd(new Date());
  const idx = TDCMP.snapStore.index().filter(d => d < today);
  const m = TDCMP.snapStore.markers();
  const t = parseYmd(today);

  // D-1: snapshot gần nhất trước hôm nay
  const D1 = idx.length ? idx[idx.length-1] : null;

  // EoM-1: cuối tháng liền trước — chỉ chấp nhận snapshot NẰM TRONG tháng đó
  const prevMonth = new Date(t.getFullYear(), t.getMonth()-1, 1);
  const eomKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth()+1).padStart(2,'0')}`;
  let EoM1 = m.eom[eomKey] || null;
  if(!EoM1){
    // snapshot mới nhất nằm trong [đầu tháng, cuối tháng] của prevMonth
    const monthStart = `${eomKey}-01`;
    const monthEnd   = ymd(new Date(prevMonth.getFullYear(), prevMonth.getMonth()+1, 0));
    const inMonth = idx.filter(d => d >= monthStart && d <= monthEnd);
    EoM1 = inMonth.length ? inMonth[inMonth.length-1] : null;
  }

  // EoQ-1: cuối quý liền trước — chỉ chấp nhận snapshot NẰM TRONG quý đó
  const curQ = Math.floor(t.getMonth()/3); // 0..3
  const prevQ = curQ === 0 ? 3 : curQ-1;
  const prevQYear = curQ === 0 ? t.getFullYear()-1 : t.getFullYear();
  const eoqKey = `${prevQYear}-Q${prevQ+1}`;
  let EoQ1 = m.eoq[eoqKey] || null;
  if(!EoQ1){
    const qStart = ymd(new Date(prevQYear, prevQ*3, 1));
    const qEnd   = ymd(new Date(prevQYear, prevQ*3+3, 0));
    const inQ = idx.filter(d => d >= qStart && d <= qEnd);
    EoQ1 = inQ.length ? inQ[inQ.length-1] : null;
  }

  // EoY-1: 31/12 năm liền trước — chỉ chấp nhận snapshot trong năm đó
  const prevYear = t.getFullYear()-1;
  let EoY1 = m.eoy[String(prevYear)] || null;
  if(!EoY1){
    const yStart = `${prevYear}-01-01`;
    const yEnd   = `${prevYear}-12-31`;
    const inY = idx.filter(d => d >= yStart && d <= yEnd);
    EoY1 = inY.length ? inY[inY.length-1] : null;
  }


  return {
    today,
    D1:   { date:D1,   label:'vs Hôm qua (D-1)',         target:null },
    EoM1: { date:EoM1, label:'vs Cuối tháng trước',      target:ymd(new Date(prevMonth.getFullYear(), prevMonth.getMonth()+1, 0)) },
    EoQ1: { date:EoQ1, label:'vs Cuối quý trước (đầu quý này)', target:ymd(new Date(prevQYear, prevQ*3+3, 0)) },
    EoY1: { date:EoY1, label:'vs 31/12 năm trước',       target:`${prevYear}-12-31` }
  };
};

function findNear(idx, target, tol){
  let best=null, bestDiff=Infinity;
  for(const d of idx){
    const diff = Math.abs(daysBetween(d, target));
    if(diff <= tol && diff < bestDiff){ best = d; bestDiff = diff; }
  }
  return best;
}

// ─── Diff Engine ────────────────────────────────────────────────
TDCMP.diff = function(anchorDate, level){
  const today = TDCMP.applyCbtdFilter(TDCMP.captureToday()); // v13.9.0: lọc CBTD
  const snap  = anchorDate ? TDCMP.snapStore.get(anchorDate) : null;
  const anchorRows = TDCMP.applyCbtdFilter(snap ? snap.rows : []);


  // v13.9.0: KH gộp theo brcd (mã KH) để tránh "Đã tất toán" + "Mới" khi đảo HĐ
  const key = level==='phong'    ? r=>r.phong
            : level==='loaiVay'  ? r=>r.loaiVay
            : level==='khachHang'? r=>r.ma
            : ()=>'__BRANCH__';

  const agg = (rows) => {
    const map = new Map();
    for(const r of rows){
      const k = key(r);
      const cur = map.get(k) || { key:k, label:label(level, r), duNo:0, items:[] };
      cur.duNo += r.duNo;
      cur.items.push(r);
      map.set(k, cur);
    }
    return map;
  };
  const aT = agg(today), aA = agg(anchorRows);
  const keys = new Set([...aT.keys(), ...aA.keys()]);
  const out = [];
  for(const k of keys){
    const t = aT.get(k), a = aA.get(k);
    const duNoT = t?t.duNo:0, duNoA = a?a.duNo:0;
    const delta = duNoT - duNoA;
    const pct = duNoA ? (delta/duNoA*100) : (duNoT?100:0);
    out.push({
      key:k,
      label: (t?t.label:a.label) || k,
      duNoToday: duNoT,
      duNoAnchor: duNoA,
      delta, pct,
      isNew: !a && !!t,
      isGone: !t && !!a
    });
  }
  return out;
};

function label(level, r){
  if(level==='branch')   return 'Toàn chi nhánh';
  if(level==='phong')    return r.phong;
  if(level==='loaiVay')  return r.loaiVay;
  if(level==='khachHang')return `${r.ten || r.ma} (${r.ma})`;
  return '';
}

// ─── UI: Build panel ────────────────────────────────────────────
TDCMP.mount = function(){
  const page = document.getElementById('page-tranop');
  if(!page){ console.warn('[TDCMP] page-tranop not found'); return; }
  if(document.getElementById('tdcmp-root')) return;

  const root = document.createElement('div');
  root.id = 'tdcmp-root';
  root.innerHTML = `
    <div class="tdcmp-tools">
      <strong>📊 So sánh dư nợ:</strong>
      <button class="btn primary" data-tdcmp="save">💾 Lưu snapshot hôm nay</button>
      <button class="btn" data-tdcmp="manage">🗂️ Quản lý snapshot</button>
      <button class="btn" data-tdcmp="export-json">⬇️ Export JSON</button>
      <button class="btn" data-tdcmp="import-json">⬆️ Import JSON</button>
      <button class="btn" data-tdcmp="export-report">📄 Xuất báo cáo so sánh</button>
      <label style="font-size:12px;color:#475569;margin-left:8px">CBTD</label>
      <select id="tdcmp-filter-cbtd" style="padding:4px 8px;border:1px solid #cbd5e1;border-radius:6px;font-size:12px;background:#fff;cursor:pointer">
        <option value="">— Tất cả CBTD —</option>
      </select>
      <span style="flex:1"></span>
      <span id="tdcmp-status" style="color:#64748b"></span>
    </div>
    <div id="tdcmp-bar"></div>
    <div id="tdcmp-banner"></div>
    <div class="tdcmp-level">
      <button data-lvl="branch" class="on">Toàn CN</button>
      <button data-lvl="phong">Phòng</button>
      <button data-lvl="loaiVay">Loại vay</button>
      <button data-lvl="khachHang">Khách hàng</button>
    </div>
    <div id="tdcmp-table-wrap"></div>
    <div class="tdcmp-top-wrap" id="tdcmp-top-wrap"></div>
  `;
  // Đặt khối ngay đầu page (trên bảng cũ)
  const firstChild = page.firstElementChild;
  if(firstChild && firstChild.nextSibling){
    page.insertBefore(root, firstChild.nextSibling);
  } else {
    page.appendChild(root);
  }

  // Event delegation
  root.addEventListener('click', e => {
    const t = e.target.closest('[data-tdcmp]'); if(t){ TDCMP.actions[t.dataset.tdcmp](); return; }
    const lvl = e.target.closest('[data-lvl]');
    if(lvl){
      root.querySelectorAll('[data-lvl]').forEach(b=>b.classList.toggle('on', b===lvl));
      TDCMP.state.level = lvl.dataset.lvl;
      TDCMP.renderTable();
      return;
    }
    const kpi = e.target.closest('.tdcmp-kpi');
    if(kpi && kpi.dataset.anchor){
      TDCMP.state.anchor = kpi.dataset.anchor;
      root.querySelectorAll('.tdcmp-kpi').forEach(k=>k.classList.toggle('active', k===kpi));
      TDCMP.renderTable();
    }
  });

  // v13.9.0: CBTD filter change
  const cbSel = root.querySelector('#tdcmp-filter-cbtd');
  if(cbSel){
    cbSel.addEventListener('change', e => {
      const v = e.target.value || '';
      TDCMP.state.cbtd = v;
      TDCMP.render();
      /* v13.9.7 FIX: sync sang #tranop-filter-cbtd để Bảng I/II/4 mốc cùng lọc */
      try {
        const lower = document.getElementById('tranop-filter-cbtd');
        if (lower && lower.value !== v) {
          /* đảm bảo option tồn tại */
          if (v && !Array.from(lower.options).some(o=>o.value===v)) {
            const op = document.createElement('option'); op.value=v; op.textContent=v; lower.appendChild(op);
          }
          lower.value = v;
          if (typeof renderTranop === 'function') renderTranop();
        }
      } catch(_e){ console.warn('[v13.9.7] sync tdcmp→tranop', _e); }
    });
  }

  TDCMP.render();
};

// ─── Render KPI bar + table ─────────────────────────────────────
TDCMP.render = function(){
  TDCMP.renderKpi();
  TDCMP.renderTable();
};

TDCMP.renderKpi = function(){
  const bar = document.getElementById('tdcmp-bar'); if(!bar) return;
  const banner = document.getElementById('tdcmp-banner');
  const anchors = TDCMP.resolveAnchors();
  const today = TDCMP.applyCbtdFilter(TDCMP.captureToday()); // v13.9.0
  const todayTotal = today.reduce((s,r)=>s+r.duNo,0);

  // v13.9.0: refresh CBTD dropdown options
  const cbSel = document.getElementById('tdcmp-filter-cbtd');
  if(cbSel){
    const cur = TDCMP.state.cbtd || '';
    const list = TDCMP.listCbtd();
    cbSel.innerHTML = '<option value="">— Tất cả CBTD —</option>' +
      list.map(c => `<option value="${escapeHtml(c)}" ${c===cur?'selected':''}>${escapeHtml(c)}</option>`).join('');
  }

  const keys = ['D1','EoM1','EoQ1','EoY1'];
  const missing = [];
  let html = '';
  for(const k of keys){
    const a = anchors[k];
    const snap = a.date ? TDCMP.snapStore.get(a.date) : null;
    // v13.9.0: tổng dư nợ mốc tính sau khi lọc CBTD (không dùng snap.totals.duNo)
    const anchorTotal = snap ? TDCMP.applyCbtdFilter(snap.rows).reduce((s,r)=>s+(Number(r.duNo)||0),0) : null;
    const delta = anchorTotal!=null ? (todayTotal - anchorTotal) : null;
    const pct = anchorTotal ? (delta/anchorTotal*100) : null;
    const cls = delta==null ? 'missing' : (delta<0?'down':(delta>0?'up':'flat'));
    const arrow = delta==null ? '⚠️' : (delta<0?'▼':(delta>0?'▲':'●'));
    const isActive = TDCMP.state.anchor===k ? ' active' : '';
    if(!a.date) missing.push(`<b>${a.label}</b> ${a.target?`(cần snapshot quanh ${dmy(a.target)})`:''}`);

    let approxTag = '';
    if(a.date && a.target && a.date !== a.target){
      approxTag = `<span class="tdcmp-tag eom" title="Lệch ${daysBetween(a.date,a.target)} ngày so với mốc gốc">~${dmy(a.date)}</span>`;
    }

    html += `
      <div class="tdcmp-kpi ${cls}${isActive}" data-anchor="${k}">
        <div class="lbl">${a.label}</div>
        <div class="anchor">Mốc: ${a.date?dmy(a.date):'<span style="color:#b45309">Chưa có snapshot</span>'} ${approxTag}</div>
        <div class="val">${delta==null?'Chưa đủ dữ liệu':(arrow+' '+fmtN(delta)+' đ')}</div>
        <div class="pct">${pct!=null?fmtPct(pct):''}</div>
      </div>`;
  }
  bar.innerHTML = html;

  if(missing.length){
    banner.innerHTML = `<div class="tdcmp-banner">⚠️ Thiếu snapshot cho: ${missing.join(' · ')}. Sử dụng nút <b>Lưu snapshot hôm nay</b> sau mỗi lần nhập IPCAS. Các ngày cuối tháng/quý/năm sẽ được tự đánh dấu mốc.</div>`;
  } else {
    banner.innerHTML = '';
  }

  document.getElementById('tdcmp-status').textContent = `Hôm nay: ${dmy(ymd(new Date()))} · ${today.length.toLocaleString('vi-VN')} dòng · Tổng dư nợ: ${fmtN(todayTotal)} đ`;
  TDCMP.renderRecon(todayTotal, !(TDCMP.state.cbtd||'').trim()); // HM-09b
};

/* HM-09b: đối chiếu tổng "hôm nay" của so sánh kỳ với TD.metrics (cùng nguồn Dashboard): app / tệp / chênh lệch */
TDCMP.renderRecon = function(appTotal, unfiltered){
  try{
    let el = document.getElementById('tdcmp-recon');
    const st = document.getElementById('tdcmp-status'); if(!st) return;
    if(!el){ el = document.createElement('div'); el.id = 'tdcmp-recon'; st.parentNode.insertBefore(el, st.nextSibling); }
    if(!unfiltered){ el.style.display = 'none'; return; }
    const D = (window.DATA && Array.isArray(window.DATA.qltd)) ? window.DATA.qltd : [];
    const file = TD.metrics.summarize(D.filter(r => r && (Number(r[11])||0) > 0)).totals.duno;
    const diff = Math.round(appTotal - file);
    el.style.cssText = 'display:block;margin:6px 0;padding:6px 10px;border-radius:6px;font:600 12px/1.4 system-ui;border:1px solid ' + (diff ? '#f59e0b' : '#86efac') + ';background:' + (diff ? '#fffbeb' : '#f0fdf4') + ';color:' + (diff ? '#78350f' : '#166534');
    el.textContent = (diff ? '⚠️ Lệch: ' : '✅ Khớp: ') + 'So sánh kỳ ' + fmtN(appTotal) + ' · Tệp/Dashboard ' + fmtN(file) + ' · chênh lệch ' + fmtN(diff) + ' đ';
  }catch(e){ console.warn('[HM-09b] recon', e); }
};

TDCMP.renderTable = function(){
  const wrap = document.getElementById('tdcmp-table-wrap'); if(!wrap) return;
  const anchors = TDCMP.resolveAnchors();
  const anchor = anchors[TDCMP.state.anchor];
  if(!anchor.date){
    wrap.innerHTML = `<div style="padding:20px;text-align:center;color:#64748b">Chưa có snapshot mốc <b>${escapeHtml(anchor.label)}</b>.</div>`;
    document.getElementById('tdcmp-top-wrap').innerHTML = '';
    return;
  }
  const level = TDCMP.state.level;
  const rows = TDCMP.diff(anchor.date, level)
    .sort((a,b)=> Math.abs(b.delta) - Math.abs(a.delta));

  const lvlLabel = {branch:'Đối tượng',phong:'Phòng',loaiVay:'Loại vay',khachHang:'Khách hàng'}[level];
  let html = `<table><thead><tr>
    <th>${lvlLabel}</th>
    <th class="num">Dư nợ hôm nay</th>
    <th class="num">Dư nợ ${dmy(anchor.date)}</th>
    <th class="num">Δ tuyệt đối (đ)</th>
    <th class="num">Δ %</th>
    <th>Trạng thái</th>
  </tr></thead><tbody>`;
  for(const r of rows){
    const cls = r.delta<0?'delta-down':(r.delta>0?'delta-up':'');
    const arrow = r.delta<0?'▼':(r.delta>0?'▲':'●');
    const tag = r.isNew?'<span class="tdcmp-badge new">Mới</span>':(r.isGone?'<span class="tdcmp-badge gone">Đã tất toán</span>':'');
    html += `<tr>
      <td>${escapeHtml(r.label)} ${tag}</td>
      <td class="num">${fmtN(r.duNoToday)}</td>
      <td class="num">${fmtN(r.duNoAnchor)}</td>
      <td class="num ${cls}">${arrow} ${fmtN(r.delta)}</td>
      <td class="num ${cls}">${fmtPct(r.pct)}</td>
      <td>${r.delta<0?'Giảm':(r.delta>0?'Tăng':'Không đổi')}</td>
    </tr>`;
  }
  html += '</tbody></table>';
  wrap.innerHTML = html;

  // Top biến động (chỉ khi level = khachHang hoặc luôn dùng KH)
  TDCMP.renderTop(anchor.date);
};

// v13.9.0: Bỏ Top 20 KH GIẢM/TĂNG ở cả 4 tab (Toàn CN, Phòng, Loại vay, Khách hàng) theo yêu cầu.
// Giữ hàm rỗng để các nơi gọi không bị lỗi.
TDCMP.renderTop = function(){
  const w = document.getElementById('tdcmp-top-wrap');
  if(w) w.innerHTML = '';
};

function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]); }

// ─── Actions ────────────────────────────────────────────────────
TDCMP.actions = {
  save(){
    const def = ymd(new Date());
    const date = prompt('Lưu snapshot dư nợ cho ngày (YYYY-MM-DD):', def);
    if(!date) return;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){ alert('Định dạng sai. Vd: 2026-06-16'); return; }
    const rows = TDCMP.captureToday();
    if(!rows.length){ alert('Chưa có dữ liệu DATA.qltd để lưu. Hãy nhập IPCAS / msit80 trước.'); return; }
    if(TDCMP.snapStore.get(date) && !confirm(`Snapshot ${dmy(date)} đã tồn tại. Ghi đè?`)) return;
    TDCMP.snapStore.save(date, rows);
    alert(`✅ Đã lưu snapshot ${dmy(date)} — ${rows.length.toLocaleString('vi-VN')} dòng`);
    TDCMP.render();
  },
  manage(){
    const idx = TDCMP.snapStore.index().sort().reverse();
    const m = TDCMP.snapStore.markers();
    const tagFor = d => {
      const tags = [];
      for(const k of Object.keys(m.eom)) if(m.eom[k]===d) tags.push('<span class="tdcmp-tag eom">EoM '+k+'</span>');
      for(const k of Object.keys(m.eoq)) if(m.eoq[k]===d) tags.push('<span class="tdcmp-tag eoq">'+k+'</span>');
      for(const k of Object.keys(m.eoy)) if(m.eoy[k]===d) tags.push('<span class="tdcmp-tag eoy">EoY '+k+'</span>');
      return tags.join(' ');
    };
    const html = `
      <div class="tdcmp-modal-bd" data-tdcmp-close>
        <div class="tdcmp-modal" onclick="event.stopPropagation()">
          <h3>🗂️ Quản lý snapshot (${idx.length})</h3>
          <p style="font-size:12px;color:#64748b;margin:4px 0">Giữ tối đa 90 snapshot gần nhất + tất cả mốc EoM/EoQ/EoY vĩnh viễn.</p>
          <table><thead><tr><th>Ngày</th><th>Số dòng</th><th>Tổng dư nợ (đ)</th><th>Mốc</th><th></th></tr></thead>
          <tbody>${idx.map(d=>{
            const s = TDCMP.snapStore.get(d);
            return `<tr>
              <td><b>${dmy(d)}</b></td>
              <td>${s.totals.count.toLocaleString('vi-VN')}</td>
              <td style="text-align:right;font-variant-numeric:tabular-nums">${fmtN(s.totals.duNo)}</td>
              <td>${tagFor(d)}</td>
              <td><button class="btn" data-tdcmp-del="${d}" style="color:#dc2626">Xoá</button></td>
            </tr>`;
          }).join('') || '<tr><td colspan=5 style="text-align:center;color:#94a3b8;padding:20px">— Chưa có snapshot —</td></tr>'}</tbody></table>
          <div style="text-align:right;margin-top:12px"><button class="btn" data-tdcmp-close>Đóng</button></div>
        </div>
      </div>`;
    const el = document.createElement('div'); el.innerHTML = html;
    const modal = el.firstElementChild;
    document.body.appendChild(modal);
    modal.addEventListener('click', e=>{
      if(e.target.matches('[data-tdcmp-close]')){ modal.remove(); return; }
      const del = e.target.closest('[data-tdcmp-del]');
      if(del){
        if(confirm(`Xoá snapshot ${dmy(del.dataset.tdcmpDel)}?`)){
          TDCMP.snapStore.remove(del.dataset.tdcmpDel);
          modal.remove(); TDCMP.actions.manage(); TDCMP.render();
        }
      }
    });
  },
  'export-json'(){
    const blob = new Blob([TDCMP.snapStore.exportJson()], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `TDCMP-snapshots-${ymd(new Date())}.json`;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
  },
  'import-json'(){
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = e => {
      const f = e.target.files[0]; if(!f) return;
      const fr = new FileReader();
      fr.onload = () => {
        try{
          const n = TDCMP.snapStore.importJson(fr.result);
          alert(`✅ Đã nhập ${n} snapshot.`);
          TDCMP.render();
        }catch(err){ alert('❌ Lỗi: '+err.message); }
      };
      fr.readAsText(f);
    };
    input.click();
  },
  'export-report'(){
    const a = TDCMP.resolveAnchors();
    const today = TDCMP.captureToday();
    const totalT = today.reduce((s,r)=>s+r.duNo,0);
    let csv = '\uFEFF'; // BOM
    csv += `BÁO CÁO SO SÁNH DƯ NỢ - Ngày báo cáo: ${dmy(ymd(new Date()))}\n\n`;
    csv += `Mốc so sánh,Ngày mốc,Tổng dư nợ mốc (đ),Tổng dư nợ hôm nay (đ),Δ tuyệt đối (đ),Δ %\n`;
    for(const k of ['D1','EoM1','EoQ1','EoY1']){
      const x = a[k]; const s = x.date?TDCMP.snapStore.get(x.date):null;
      const ta = s?s.totals.duNo:0;
      const d = ta?totalT-ta:0;
      const p = ta?(d/ta*100):0;
      csv += `"${x.label}",${x.date?dmy(x.date):'—'},${ta},${totalT},${d},${p.toFixed(2)}\n`;
    }
    csv += `\nCHI TIẾT THEO PHÒNG (vs ${a[TDCMP.state.anchor].date?dmy(a[TDCMP.state.anchor].date):'—'})\n`;
    csv += `Phòng,Dư nợ hôm nay,Dư nợ mốc,Δ,Δ %\n`;
    if(a[TDCMP.state.anchor].date){
      for(const r of TDCMP.diff(a[TDCMP.state.anchor].date,'phong').sort((x,y)=>x.delta-y.delta)){
        csv += `"${r.label}",${r.duNoToday},${r.duNoAnchor},${r.delta},${r.pct.toFixed(2)}\n`;
      }
    }
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
    const a2 = document.createElement('a');
    a2.href = URL.createObjectURL(blob);
    a2.download = `BaoCao-SoSanhDuNo-${ymd(new Date())}.csv`;
    a2.click();
    setTimeout(()=>URL.revokeObjectURL(a2.href),1000);
  }
};

// ─── Bootstrap ──────────────────────────────────────────────────
function boot(){
  if(document.getElementById('page-tranop')){ TDCMP.mount(); }
  else { setTimeout(boot, 300); }
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

// Auto-refresh khi đổi sang menu tranop
TD.onShowPage(function(name){ if(name==='tranop'){ setTimeout(()=>{ TDCMP.mount(); TDCMP.render(); }, 50); } }); // HM-13b

(0)&&console.log('[TDCMP] v'+TDCMP.v+' loaded. Snapshots:', TDCMP.snapStore.index().length);
})();
