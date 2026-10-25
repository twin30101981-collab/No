
(function(){
  "use strict";
  const LS_KEY = "ctkh_plan_v2";
  const LS_KEY_V1 = "ctkh_plan_v1";

  // 12 chỉ tiêu
  const CT_DEFS = [
    { id:"nguonVon",   label:"Nguồn vốn",                   unit:"đ",   color:"#0891b2", isInt:true, money:true },
    { id:"tongDuNo",   label:"Tổng dư nợ",                  unit:"đ",   color:"#1e40af", isInt:true, money:true, auto:true },
    { id:"duNoNH",     label:"Dư nợ Ngắn hạn (TK 211)",     unit:"đ",   color:"#10b981", isInt:true, money:true, auto:true },
    { id:"duNoTH",     label:"Dư nợ Trung hạn (TK 212)",    unit:"đ",   color:"#f59e0b", isInt:true, money:true, auto:true },
    { id:"duNoDH",     label:"Dư nợ Dài hạn (TK 213)",      unit:"đ",   color:"#d97706", isInt:true, money:true, auto:true },
    { id:"duNoTC",     label:"Dư nợ Thấu chi",              unit:"đ",   color:"#a855f7", isInt:true, money:true, auto:true },
    { id:"duNoDN",     label:"Dư nợ Doanh nghiệp",          unit:"đ",   color:"#ef4444", isInt:true, money:true, auto:true },
    { id:"slKH",       label:"Số lượng Khách hàng",         unit:"KH",  color:"#0ea5e9", isInt:true, auto:true },
    { id:"theGhiNo",   label:"Thẻ ghi nợ nội địa",          unit:"thẻ", color:"#7c3aed", isInt:true },
    { id:"theLocViet", label:"Thẻ tín dụng Lộc Việt",       unit:"thẻ", color:"#be185d", isInt:true },
    { id:"dichVu",     label:"Doanh thu Dịch vụ",           unit:"đ",   color:"#16a34a", isInt:true, money:true },
    { id:"abic",       label:"Doanh thu ABIC",              unit:"đ",   color:"#ca8a04", isInt:true, money:true },
  ];
  const CT_SHORT = {
    nguonVon:"Nguồn vốn", tongDuNo:"Tổng dư nợ",
    duNoNH:"DN Ngắn hạn", duNoTH:"DN Trung hạn", duNoDH:"DN Dài hạn", duNoTC:"DN Thấu chi",
    duNoDN:"DN Doanh nghiệp", slKH:"SL KH",
    theGhiNo:"Thẻ ghi nợ", theLocViet:"Thẻ Lộc Việt",
    dichVu:"DT Dịch vụ", abic:"DT ABIC"
  };
  const CT_IDS = CT_DEFS.map(x=>x.id);
  const ZERO_KH = ()=> { const o={}; CT_IDS.forEach(k=>o[k]=0); return o; };

  // ── Phòng mapping (use global BCKH_PHONG if available, else fallback) ──
  function _getPhongMap(){
    if(typeof BCKH_PHONG !== "undefined") return BCKH_PHONG;
    return {
      hoiso:{ label:"PHÒNG KHÁCH HÀNG", roman:"I", members:[] },
      hbt:{ label:"PGD HBT", roman:"II", members:[] },
      s2:{ label:"PGD Số 2", roman:"III", members:[] },
    };
  }
  function _phongKeys(){ return (typeof BCKH_PHONG_KEYS!=="undefined") ? BCKH_PHONG_KEYS : ["hoiso","hbt","s2"]; }
  function _allCBTD(){
    const arr=[]; const map=_getPhongMap();
    _phongKeys().forEach(pk=> (map[pk].members||[]).forEach(m=> arr.push({ name:m.name, role:m.role, phong:pk })));
    return arr;
  }
  // Helper: chuẩn hoá tên CBTD + áp alias IPCAS (dùng chung BCKH)
  function ctkhCanonName(name){
    const norm = (typeof bckhNormName === "function")
      ? bckhNormName(name)
      : String(name||"").trim().toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
          .replace(/đ/g,"d").replace(/\./g," ").replace(/\s+/g," ").trim();
    if(typeof BCKH_CBTD_ALIASES !== "undefined" && BCKH_CBTD_ALIASES[norm])
      return BCKH_CBTD_ALIASES[norm];
    // P10 (T6): khớp mờ với danh sách cán bộ (viết tắt / đổi họ) thay bảng bí danh nhúng cứng
    const m = (window.TD_SXCB && TD_SXCB.match) ? TD_SXCB.match(name) : null;
    if(m && m.name && m.name !== name) return ctkhCanonName(m.name);
    return norm;
  }
  function ctkhPhongOfCBTD(name){
    if(!name) return null;
    const n = ctkhCanonName(name);
    const map = _getPhongMap();
    for(const pk of _phongKeys()){
      if((map[pk].members||[]).some(m=> ctkhCanonName(m.name)===n)) return pk;
    }
    return null;
  }

  // ── Persist ──
  function ctkhLoadPlan(){
    try{
      const raw = localStorage.getItem(LS_KEY);
      if(raw){ const p = JSON.parse(raw); _migratePlan(p); return p; }
    }catch(e){}
    // Migrate from v1
    let migrated = null;
    try{
      const raw1 = localStorage.getItem(LS_KEY_V1);
      if(raw1){
        const p1 = JSON.parse(raw1);
        migrated = {
          nam: p1.nam || new Date().getFullYear(),
          keHoachCBTD: {},
          overridePhong: {},
          overrideChiNhanh: (function(){
            const o = ZERO_KH();
            if(p1.keHoachNam){
              o.slKH      = p1.keHoachNam.slKH      || 0;
              o.tongDuNo  = p1.keHoachNam.tongDuNo  || 0;
              o.duNoNH    = p1.keHoachNam.duNoNH    || 0;
              o.duNoTH    = Math.round((p1.keHoachNam.duNoTDH||0)*0.6);
              o.duNoDH    = Math.round((p1.keHoachNam.duNoTDH||0)*0.4);
              o.duNoDN    = p1.keHoachNam.duNoDN    || 0;
            }
            return o;
          })(),
          _history: [],
          capNhatCuoi: p1.capNhatCuoi || null,
          _fromV1: true,
        };
      }
    }catch(e){}
    if(migrated) return migrated;
    return {
      nam: new Date().getFullYear(),
      keHoachCBTD: {},
      overridePhong: {},
      overrideChiNhanh: ZERO_KH(),
      _history: [],
      capNhatCuoi: null,
    };
  }
  function _migratePlan(p){
    p.keHoachCBTD = p.keHoachCBTD || {};
    p.overridePhong = p.overridePhong || {};
    p.overrideChiNhanh = p.overrideChiNhanh || ZERO_KH();
    p._history = p._history || [];
    // ensure all 12 fields exist
    Object.keys(p.keHoachCBTD).forEach(k=>{
      const v = p.keHoachCBTD[k]; CT_IDS.forEach(id=> { if(typeof v[id]!=="number") v[id] = 0; });
    });
    CT_IDS.forEach(id=> { if(typeof p.overrideChiNhanh[id]!=="number") p.overrideChiNhanh[id] = 0; });
  }
  function ctkhSaveToStorage(plan){
    try{ localStorage.setItem(LS_KEY, JSON.stringify(plan)); }catch(e){ console.warn("[CTKH] save failed", e); }
  }

  // ── Helpers ──
  const fmtNum = (v, isInt)=> v==null||isNaN(v) ? "—" : Math.round(v).toLocaleString("vi-VN");
  const fmtPct = v => v==null||!isFinite(v) ? "—" : (v>=0?"+":"") + v.toFixed(1) + "%";
  const fmtDelta = (d, isInt)=> d==null||isNaN(d) ? "—" : (d>0?"+":"") + Math.round(d).toLocaleString("vi-VN");
  function monthsPassed(year){
    const now = new Date(); const cy = now.getFullYear();
    if(year < cy) return 12; if(year > cy) return 0; return now.getMonth() + 1;
  }
  function _quarter(d){ return Math.floor(d.getMonth()/3)+1; }

  // ── Classify loaiVay từ chuỗi r[13] ──
  function _classifyLV(s){
    const x = String(s||"").toLowerCase();
    if(/thấu|thau|\bod\b|overdraft/.test(x)) return "tc";
    if(/ngắn|ngan|\b211\b/.test(x)) return "nh";
    if(/trung|\b212\b/.test(x)) return "th";
    if(/dài|dai|\b213\b/.test(x)) return "dh";
    return "nh"; // default ngắn hạn
  }
  function _isDN(name, ma){
    if(typeof bckhIsKHDN === "function") return bckhIsKHDN(name, ma);
    // Fallback (khi bckhIsKHDN chưa load): dùng tập regex rộng hơn + tín hiệu mã KH
    const s = String(name||"").toLowerCase();
    if(/công ty|cty\.?|c\.ty|tnhh|mtv|ctcp|\bcp\b|dntn|htx|hkd|tht|\bxn\b|xnk|nhà máy|nông trường|lâm trường|trang trại|trung tâm|chi nhánh|quỹ tdnd|ngân hàng tmcp|trường (mn|th|thcs|thpt|cd|cđ|dh|đh)|\bubnd\b|\bbql\b|bệnh viện|trạm y tế|khách sạn|siêu thị|công an|liên doanh|hợp danh|vpcc|chi cục|tổng công ty|tập đoàn|tm&dv|sx-tm|xây dựng|thương mại|dịch vụ|cổ phần|hợp tác xã|doanh nghiệp|hộ kinh doanh|tổ hợp tác/i.test(s)) return true;
    if(ma && /[a-z]/i.test(String(ma))) return true;
    return false;
  }

  // ── Aggregate from DATA.qltd với filter scope + loaiVay ──
  // scope: {kind:"chinhanh"|"phong"|"cbtd", id?:string}, loaiVay: ""|"nh"|"th"|"dh"|"tc"
  function ctkhAggregateBy(dataset, opts){
    opts = opts || {};
    const scope = opts.scope || { kind:"chinhanh" };
    const loaiVay = opts.loaiVay || "";
    const out = ZERO_KH();
    if(!Array.isArray(dataset) || dataset.length===0) return out;
    const mapAll = new Map();
    for(const r of dataset){
      if(!r) continue;
      const cbtd = String(r[12]||"").trim();
      const lv = _classifyLV(r[13]);
      // scope filter
      if(scope.kind === "cbtd" && scope.id && ctkhCanonName(cbtd) !== ctkhCanonName(scope.id)) continue;
      if(scope.kind === "phong" && scope.id){
        const pk = ctkhPhongOfCBTD(cbtd);
        if(pk !== scope.id) continue;
      }
      if(loaiVay && lv !== loaiVay) continue;
      const dn = Number(r[11]) || 0;
      const ma = String(r[0]||"").trim();
      out.tongDuNo += dn;
      if(lv === "nh") out.duNoNH += dn;
      else if(lv === "th") out.duNoTH += dn;
      else if(lv === "dh") out.duNoDH += dn;
      else if(lv === "tc") out.duNoTC += dn;
      if(_isDN(r[1], r[0])) out.duNoDN += dn;
      // FIX v5: đồng bộ với countRealCustomers() — chỉ đếm unique mã KH có dư nợ > 0
      // (bỏ fallback theo TÊN KH gây đếm trùng/đếm ảo)
      if(ma && dn > 0) mapAll.set(ma, (mapAll.get(ma)||0) + dn);
    }
    const slKH = mapAll.size;
    out.slKH = slKH;
    return out;
  }

  // KH theo scope (lấy từ _plan)
  function ctkhGetKH(scope){
    if(!_plan) return ZERO_KH();
    if(scope.kind === "cbtd"){
      const k = _plan.keHoachCBTD[scope.id];
      return k ? Object.assign(ZERO_KH(), k) : ZERO_KH();
    }
    if(scope.kind === "phong"){
      // override or sum CBTD trong phòng
      if(_plan.overridePhong && _plan.overridePhong[scope.id]) return Object.assign(ZERO_KH(), _plan.overridePhong[scope.id]);
      const out = ZERO_KH();
      _allCBTD().filter(c=>c.phong===scope.id).forEach(c=>{
        const k = _plan.keHoachCBTD[c.name]; if(!k) return;
        CT_IDS.forEach(id=> out[id] += (k[id]||0));
      });
      return out;
    }
    // chi nhánh: override or sum tất cả CBTD
    if(_plan.overrideChiNhanh){
      const has = CT_IDS.some(id=> (_plan.overrideChiNhanh[id]||0) > 0);
      if(has) return Object.assign(ZERO_KH(), _plan.overrideChiNhanh);
    }
    const out = ZERO_KH();
    Object.keys(_plan.keHoachCBTD).forEach(name=>{
      const k = _plan.keHoachCBTD[name];
      CT_IDS.forEach(id=> out[id] += (k[id]||0));
    });
    return out;
  }

  // Mốc so sánh + snapshot
  function ctkhListMocSoSanh(year){
    const mocs = [];
    mocs.push({ id:`y${year-1}`, label:`31/12/${year-1} (Đầu năm)`, kind:"year_end", year:year-1 });
    for(let q=1; q<=4; q++) mocs.push({ id:`q${year}_${q}`, label:`Đầu Q${q}/${year}`, kind:"quarter", year:year, quarter:q });
    for(let m=1; m<=12; m++) mocs.push({ id:`m${year}_${m}`, label:`Đầu T${String(m).padStart(2,"0")}/${year}`, kind:"month", year:year, month:m });
    // Cùng kỳ năm trước
    const now = new Date();
    if(year === now.getFullYear()){
      const m = now.getMonth()+1; const q = Math.floor((m-1)/3)+1;
      mocs.push({ id:`yoy_q_${year-1}_${q}`, label:`Cùng kỳ Q${q}/${year-1}`, kind:"quarter", year:year-1, quarter:q, yoy:true });
      mocs.push({ id:`yoy_m_${year-1}_${m}`, label:`Cùng kỳ T${String(m).padStart(2,"0")}/${year-1}`, kind:"month", year:year-1, month:m, yoy:true });
    }
    for(const mo of mocs){
      let snap=null;
      try{
        if(typeof archiveFindByTag==="function"){
          if(mo.kind==="year_end") snap = archiveFindByTag("year_end", mo.year);
          else if(mo.kind==="quarter") snap = archiveFindByTag("quarter", mo.year, mo.quarter);
          else if(mo.kind==="month") snap = archiveFindByTag("month", mo.year, mo.month);
        }
      }catch(e){}
      mo.hasData = !!(snap && Array.isArray(snap.reportData) && snap.reportData.length);
      mo._snap = snap;
    }
    return mocs;
  }

  function ctkhSnapshotAggregate(moc, opts){
    if(!moc || !moc._snap || !Array.isArray(moc._snap.reportData)) return null;
    return ctkhAggregateBy(moc._snap.reportData, opts);
  }

  function ctkhGetLive(opts){
    const ds = (typeof DATA!=="undefined" && Array.isArray(DATA.qltd)) ? DATA.qltd : [];
    return ctkhAggregateBy(ds, opts);
  }

  function ctkhProgress(value, plan, year){
    if(!plan || plan<=0) return { pctHT:null, pctTienDo:null, status:"no-plan" };
    const pctHT = (value/plan)*100;
    const mp = monthsPassed(year);
    const pctTienDo = (mp/12)*100;
    let status = "ok";
    if(pctHT >= 100) status = "green";
    else if(pctHT >= pctTienDo - 5) status = "yellow";
    else if(pctHT >= 0.8 * pctTienDo) status = "yellow";
    else status = "red";
    if(mp===0) status = "ok";
    return { pctHT, pctTienDo, status };
  }

  // ── State ──
  let _plan = null;
  let _filter = { scope:"chinhanh", scopeId:"", loaiVay:"" };
  let _activeTab = "matrix";

  function _currentScope(){
    if(_filter.scope === "cbtd")  return { kind:"cbtd",  id:_filter.scopeId };
    if(_filter.scope === "phong") return { kind:"phong", id:_filter.scopeId || _phongKeys()[0] };
    return { kind:"chinhanh" };
  }

  // ── INIT + Filter wiring ──
  function ctkhInit(){
    _plan = ctkhLoadPlan();
    const sel = document.getElementById("ctkh-year-select");
    if(sel){
      const cy = new Date().getFullYear();
      const years = new Set([cy-1, cy, cy+1, _plan.nam]);
      sel.innerHTML = "";
      Array.from(years).sort((a,b)=>a-b).forEach(y=>{
        const o = document.createElement("option"); o.value=y; o.textContent=y;
        if(y === _plan.nam) o.selected = true; sel.appendChild(o);
      });
    }
    _refreshScopeIdSelect();
    ctkhRender();
  }
  window.ctkhInit = ctkhInit;

  function ctkhChangeYear(y){ _plan.nam = parseInt(y,10); ctkhSaveToStorage(_plan); ctkhRender(); }
  window.ctkhChangeYear = ctkhChangeYear;

  function _refreshScopeIdSelect(){
    const fs = document.getElementById("ctkh-f-scope");
    const fi = document.getElementById("ctkh-f-scope-id");
    if(!fs || !fi) return;
    _filter.scope = fs.value || "chinhanh";
    const map = _getPhongMap();
    if(_filter.scope === "chinhanh"){
      fi.innerHTML = `<option value="">(toàn chi nhánh)</option>`;
      fi.disabled = true; _filter.scopeId = "";
    } else if(_filter.scope === "phong"){
      fi.disabled = false;
      fi.innerHTML = _phongKeys().map(pk=>`<option value="${escapeHtml(pk)}">${escapeHtml(map[pk].label)}</option>`).join("");
      _filter.scopeId = fi.value;
    } else {
      fi.disabled = false;
      const cbtds = _allCBTD();
      fi.innerHTML = cbtds.map(c=>`<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)} — ${escapeHtml(map[c.phong].label)}</option>`).join("");
      _filter.scopeId = fi.value;
    }
  }
  function ctkhOnFilterChange(){
    const fs = document.getElementById("ctkh-f-scope");
    const fi = document.getElementById("ctkh-f-scope-id");
    const fl = document.getElementById("ctkh-f-loaivay");
    const prevScope = _filter.scope;
    _filter.scope = fs.value;
    if(_filter.scope !== prevScope){ _refreshScopeIdSelect(); }
    _filter.scopeId = fi.value || "";
    _filter.loaiVay = fl.value || "";
    /* v13.9.7 FIX: expose filter cho BCN module (IIFE riêng) */
    try { window.__ctkhFilter = Object.assign({}, _filter); } catch(_e){}
    ctkhRender();
  }
  window.ctkhOnFilterChange = ctkhOnFilterChange;

  function ctkhSwitchTab(tab){
    _activeTab = tab;
    document.querySelectorAll("#ctkh-tab-nav .ctkh-tab").forEach(b=> b.classList.toggle("active", b.getAttribute("data-tab")===tab));
    document.querySelectorAll("#page-ctkh .ctkh-panel").forEach(p=> p.classList.remove("active"));
    const el = document.getElementById("ctkh-pn-"+tab); if(el) el.classList.add("active");
    ctkhRender();
  }
  window.ctkhSwitchTab = ctkhSwitchTab;

  // ── RENDER ──
  function ctkhRender(){
    const info = document.getElementById("ctkh-baseline-info");
    if(info){
      const ds = (typeof DATA!=="undefined" && Array.isArray(DATA.qltd)) ? DATA.qltd : [];
      info.textContent = `Baseline live: ${ds.length.toLocaleString("vi-VN")} hồ sơ · Năm KH: ${_plan.nam}`;
    }
    if(_activeTab === "kpi") _renderKPI();
    else if(_activeTab === "matrix") _renderMatrix();
    else if(_activeTab === "cbtd") _renderGridCBTD();
    else if(_activeTab === "phong") _renderGridPhong();
    else if(_activeTab === "loaivay") _renderGridLoaiVay();
    else if(_activeTab === "baocaongay") { if(typeof bcnRender==="function") bcnRender(); }
  }

  function _renderKPI(){
    const year = _plan.nam;
    const scope = _currentScope();
    const opts = { scope, loaiVay:_filter.loaiVay };
    const live = ctkhGetLive(opts);
    const kh = ctkhGetKH(scope);
    const el = document.getElementById("ctkh-kpis"); if(!el) return;
    el.innerHTML = CT_DEFS.map(ct=>{
      const v = live[ct.id] || 0;
      const plan = kh[ct.id] || 0;
      const prog = ctkhProgress(v, plan, year);
      const pctTxt = prog.pctHT==null ? "—" : prog.pctHT.toFixed(1)+"%";
      const tdTxt  = prog.pctTienDo==null ? "" : "Tiến độ năm: "+prog.pctTienDo.toFixed(0)+"%";
      const pillBg = prog.status==="green" ? "#dcfce7" : prog.status==="yellow" ? "#fef9c3" : prog.status==="red" ? "#fee2e2" : "#f3f4f6";
      const pillFg = prog.status==="green" ? "#15803d" : prog.status==="yellow" ? "#a16207" : prog.status==="red" ? "#b91c1c" : "#374151";
      const statusLbl = prog.status==="green" ? "Vượt/đạt KH" : prog.status==="yellow" ? "Theo tiến độ" : prog.status==="red" ? "Cảnh báo" : "Chưa có KH";
      const pctBar = Math.max(0, Math.min(100, prog.pctHT||0));
      return `<div class="ctkh-kpi" style="--c:${ct.color}">
        <div class="lbl">${ct.label}</div>
        <div class="val">${fmtNum(v, ct.isInt)}<span class="unit">${ct.unit}</span></div>
        <div class="pct-bar"><i style="width:${pctBar}%"></i></div>
        <div class="pct-text"><span>%HT: ${pctTxt}</span><span style="color:#6b7280;font-weight:600">${tdTxt}</span></div>
        <div class="status-pill" style="background:${pillBg};color:${pillFg}">${statusLbl} · KH: ${fmtNum(plan, ct.isInt)} ${ct.unit}</div>
      </div>`;
    }).join("");
  }

  function _renderMatrix(){
    const year = _plan.nam;
    const scope = _currentScope();
    const opts = { scope, loaiVay:_filter.loaiVay };
    const live = ctkhGetLive(opts);
    const kh = ctkhGetKH(scope);
    const mocs = ctkhListMocSoSanh(year).filter(m=>m.hasData);
    const el = document.getElementById("ctkh-matrix"); if(!el) return;
    let html = `<table class="ctkh-grid"><thead><tr>
      <th class="first-col" style="text-align:left">Chỉ tiêu</th>
      <th>KH ${year}</th>
      <th>Hiện tại (Live)</th>
      <th>%HT</th>`;
    mocs.forEach(m=>{ html += `<th>${m.label}</th>`; });
    html += `</tr></thead><tbody>`;
    CT_DEFS.forEach(ct=>{
      const v = live[ct.id]||0;
      const plan = kh[ct.id]||0;
      const prog = ctkhProgress(v, plan, year);
      const heat = prog.status==="green"?"heat-green":prog.status==="yellow"?"heat-yellow":prog.status==="red"?"heat-red":"";
      html += `<tr>
        <td class="first-col">${ct.label}</td>
        <td><b>${fmtNum(plan, ct.isInt)}</b></td>
        <td style="background:#eff6ff;font-weight:700;color:#1e40af">${fmtNum(v, ct.isInt)}</td>
        <td class="${heat}" style="font-weight:800">${prog.pctHT==null?"—":prog.pctHT.toFixed(1)+"%"}</td>`;
      mocs.forEach(m=>{
        const snap = ctkhSnapshotAggregate(m, opts);
        const sv = snap ? snap[ct.id] : null;
        if(sv==null){ html += `<td style="color:#9ca3af">—</td>`; return; }
        const delta = v - sv;
        const dPct  = sv!==0 ? (delta/Math.abs(sv))*100 : null;
        const cls = delta>0 ? "delta-pos" : delta<0 ? "delta-neg" : "delta-zero";
        html += `<td><div>${fmtNum(sv, ct.isInt)}</div>
          <div style="font-size:10px" class="${cls}">${fmtDelta(delta, ct.isInt)} (${fmtPct(dPct)})</div></td>`;
      });
      html += `</tr>`;
    });
    html += `</tbody></table>`;
    if(mocs.length===0){
      html = `<div class="ctkh-empty">⚠ Chưa có snapshot nào được gắn nhãn mốc cho năm ${year}.<br>Vào <strong>LƯU TRỮ FILE → Báo cáo</strong> để gắn nhãn (Đầu năm/Đầu quý/Đầu tháng) cho các bản snapshot.</div>` + html;
    }
    el.innerHTML = html;
  }

  // Mốc rút gọn cho grid theo CBTD/Phòng/LoaiVay
  function _mocsCompact(year){
    const all = ctkhListMocSoSanh(year);
    const cy = new Date().getFullYear(); const m = new Date().getMonth()+1; const q = Math.floor((m-1)/3)+1;
    const pick = [];
    const yEnd = all.find(x=>x.kind==="year_end" && x.year===year-1 && x.hasData);
    if(yEnd) pick.push({...yEnd, short:"Đầu năm"});
    // Mốc QUÝ TRƯỚC LIỀN KỀ
    if(q > 1){
      const pq = q - 1;
      const prevQ = all.find(x=>x.kind==="quarter" && x.year===year && x.quarter===pq && x.hasData);
      if(prevQ) pick.push({...prevQ, short:`Đầu Q${pq} (quý trước)`});
      else {
        let snap=null;
        try{ if(typeof archiveFindByTag==="function") snap = archiveFindByTag("quarter", year, pq); }catch(e){}
        if(snap && Array.isArray(snap.reportData) && snap.reportData.length){
          pick.push({ id:`q${year}_${pq}`, label:`Đầu Q${pq}/${year}`, kind:"quarter", year:year, quarter:pq, hasData:true, _snap:snap, short:`Đầu Q${pq} (quý trước)` });
        }
      }
    } else {
      // Đang Q1 → quý trước = Q4 năm liền trước
      let snap=null;
      try{ if(typeof archiveFindByTag==="function") snap = archiveFindByTag("quarter", year-1, 4); }catch(e){}
      if(snap && Array.isArray(snap.reportData) && snap.reportData.length){
        pick.push({ id:`q${year-1}_4`, label:`Đầu Q4/${year-1}`, kind:"quarter", year:year-1, quarter:4, hasData:true, _snap:snap, short:`Đầu Q4/${year-1} (quý trước)` });
      }
    }
    const qStart = all.find(x=>x.kind==="quarter" && x.year===year && x.quarter===q && x.hasData);
    if(qStart) pick.push({...qStart, short:`Đầu Q${q} (quý này)`});
    const mStart = all.find(x=>x.kind==="month" && x.year===year && x.month===m && x.hasData);
    if(mStart) pick.push({...mStart, short:"Đầu tháng"});
    return pick;
  }

  function _gridRow(label, kh, live, year, mocs, opts, cls){
    const tds = [];
    CT_DEFS.forEach(ct=>{
      const v = live[ct.id]||0; const k = kh[ct.id]||0;
      const prog = ctkhProgress(v, k, year);
      tds.push(`<td>${fmtNum(k, ct.isInt)}</td>`);
      tds.push(`<td style="background:#eff6ff;color:#1e40af;font-weight:700">${fmtNum(v, ct.isInt)}</td>`);
      const heat = prog.status==="green"?"heat-green":prog.status==="yellow"?"heat-yellow":prog.status==="red"?"heat-red":"";
      tds.push(`<td class="${heat}" style="font-weight:700">${prog.pctHT==null?"—":prog.pctHT.toFixed(1)+"%"}</td>`);
    });
    mocs.forEach(m=>{
      const snap = ctkhSnapshotAggregate(m, opts);
      CT_DEFS.forEach(ct=>{
        const sv = snap ? snap[ct.id] : null;
        if(sv==null){ tds.push(`<td style="color:#9ca3af">—</td>`); return; }
        const v = live[ct.id]||0; const d = v - sv;
        const c = d>0?"delta-pos":d<0?"delta-neg":"delta-zero";
        tds.push(`<td class="${c}">${fmtDelta(d, ct.isInt)}</td>`);
      });
    });
    return `<tr class="${cls||""}"><td class="first-col">${label}</td>${tds.join("")}</tr>`;
  }

  function _gridHead(mocs){
    let h1 = `<th class="first-col" rowspan="3">CBTD / Đơn vị</th>`;
    let h2 = ""; let h3 = "";
    h1 += `<th colspan="${CT_DEFS.length*3}">KH năm · Live · %HT</th>`;
    CT_DEFS.forEach(ct=>{
      const sl = CT_SHORT[ct.id] || ct.label;
      h2 += `<th colspan="3" title="${ct.label}" style="background:${ct.color};color:#fff">${sl}</th>`;
      h3 += `<th title="Kế hoạch ${ct.label} (${ct.unit})">KH</th><th title="Số liệu Live IPCAS – ${ct.label}">Live</th><th title="% hoàn thành KH">%HT</th>`;
    });
    mocs.forEach(m=>{
      h1 += `<th colspan="${CT_DEFS.length}">Δ so ${m.short}</th>`;
      CT_DEFS.forEach(ct=>{
        const sl = CT_SHORT[ct.id] || ct.label;
        h2 += `<th title="${ct.label} – chênh lệch so ${m.short}" style="background:${ct.color};color:#fff">${sl}</th>`;
        h3 += `<th title="Δ ${ct.label} so ${m.short}">Δ</th>`;
      });
    });
    return `<thead><tr>${h1}</tr><tr>${h2}</tr><tr>${h3}</tr></thead>`;
  }

  function _renderGridCBTD(){
    const year = _plan.nam; const mocs = _mocsCompact(year);
    const el = document.getElementById("ctkh-grid-cbtd"); if(!el) return;
    const map = _getPhongMap();
    let html = `<table class="ctkh-grid">${_gridHead(mocs)}<tbody>`;
    _phongKeys().forEach(pk=>{
      const opts = { scope:{kind:"phong", id:pk}, loaiVay:_filter.loaiVay };
      const phongLive = ctkhGetLive(opts);
      const phongKH = ctkhGetKH({kind:"phong", id:pk});
      html += `<tr class="row-phong"><td class="first-col" colspan="${1 + CT_DEFS.length*3 + mocs.length*CT_DEFS.length}">${map[pk].roman} — ${map[pk].label}</td></tr>`;
      (map[pk].members||[]).forEach(m=>{
        const o = { scope:{kind:"cbtd", id:m.name}, loaiVay:_filter.loaiVay };
        const v = ctkhGetLive(o);
        const k = ctkhGetKH({kind:"cbtd", id:m.name});
        html += _gridRow(m.name + " <span style='font-weight:500;color:#64748b'>("+m.role+")</span>", k, v, year, mocs, o, "");
      });
      html += _gridRow(`Tổng ${map[pk].label}`, phongKH, phongLive, year, mocs, opts, "row-total");
    });
    // FIX v5: TỔNG CHI NHÁNH gọi aggregate unique trên toàn chi nhánh (không cộng SL KH 3 phòng)
    const cnOpts = { scope:{kind:"chinhanh"}, loaiVay:_filter.loaiVay };
    const chiNhanhLive = ctkhGetLive(cnOpts);
    const chiNhanhKH   = ctkhGetKH({kind:"chinhanh"});
    html += _gridRow("TỔNG CHI NHÁNH", chiNhanhKH, chiNhanhLive, year, mocs, cnOpts, "row-total");
    html += `</tbody></table>`;
    if(mocs.length===0) html = `<div class="ctkh-empty">⚠ Chưa có snapshot nào cho mốc đầu năm/quý/tháng — vẫn hiển thị KH/Live/%HT.</div>` + html;
    el.innerHTML = html;
  }

  function _renderGridPhong(){
    const year = _plan.nam; const mocs = _mocsCompact(year);
    const el = document.getElementById("ctkh-grid-phong"); if(!el) return;
    const map = _getPhongMap();
    let html = `<table class="ctkh-grid">${_gridHead(mocs)}<tbody>`;
    _phongKeys().forEach(pk=>{
      const opts = { scope:{kind:"phong", id:pk}, loaiVay:_filter.loaiVay };
      const v = ctkhGetLive(opts); const k = ctkhGetKH({kind:"phong", id:pk});
      html += _gridRow(`${map[pk].roman} — ${map[pk].label}`, k, v, year, mocs, opts, "");
    });
    // FIX v5: aggregate unique trên toàn chi nhánh
    const cnOpts = { scope:{kind:"chinhanh"}, loaiVay:_filter.loaiVay };
    html += _gridRow("TỔNG CHI NHÁNH", ctkhGetKH({kind:"chinhanh"}), ctkhGetLive(cnOpts), year, mocs, cnOpts, "row-total");
    html += `</tbody></table>`;
    el.innerHTML = html;
  }

  function _renderGridLoaiVay(){
    const year = _plan.nam; const mocs = _mocsCompact(year);
    const el = document.getElementById("ctkh-grid-loaivay"); if(!el) return;
    const LVS = [["nh","Ngắn hạn (TK 211)"],["th","Trung hạn (TK 212)"],["dh","Dài hạn (TK 213)"],["tc","Thấu chi"]];
    const scope = _currentScope();
    let html = `<table class="ctkh-grid">${_gridHead(mocs)}<tbody>`;
    LVS.forEach(([lv,lbl])=>{
      const opts = { scope, loaiVay:lv };
      const v = ctkhGetLive(opts);
      // KH theo loại vay = lấy KH gốc tương ứng (tongDuNo chia ko khả thi → dùng KH duNoNH/TH/DH/TC)
      const khFull = ctkhGetKH(scope);
      const khLV = ZERO_KH();
      const lvKey = lv==="nh"?"duNoNH":lv==="th"?"duNoTH":lv==="dh"?"duNoDH":"duNoTC";
      // chỉ map chỉ tiêu dư nợ phù hợp; còn lại bằng 0 (vì kế hoạch không tách theo loại vay)
      khLV.tongDuNo = khFull[lvKey] || 0;
      khLV[lvKey] = khFull[lvKey] || 0;
      html += _gridRow(lbl, khLV, v, year, mocs, opts, "");
    });
    // FIX v5: TỔNG 4 loại vay = aggregate unique (1 KH có cả NH+TH chỉ đếm 1 lần)
    const totalOpts = { scope, loaiVay:"" };
    html += _gridRow("TỔNG (4 loại vay)", ctkhGetKH(scope), ctkhGetLive(totalOpts), year, mocs, totalOpts, "row-total");
    html += `</tbody></table>`;
    el.innerHTML = html;
  }

  // ── MODAL ──
  function ctkhOpenPlanModal(){
    const body = document.getElementById("ctkh-modal-body"); if(!body) return;
    const map = _getPhongMap();
    let html = `<div class="ctkh-mode-tabs">
      <button id="ctkh-md-cbtd" class="active" onclick="ctkhModalSwitch('cbtd')">Nhập theo CBTD (khuyến nghị)</button>
      <button id="ctkh-md-chinhanh" onclick="ctkhModalSwitch('chinhanh')">Nhập tổng chi nhánh (override)</button>
    </div>
    <div class="row-input">
      <label>Năm kế hoạch</label>
      <input type="number" id="ctkh-input-year" value="${_plan.nam}" min="2020" max="2099">
      <span class="unit"></span>
    </div>
    <div id="ctkh-md-pn-cbtd"></div>
    <div id="ctkh-md-pn-chinhanh" style="display:none"></div>
    <div class="note">
      💡 Đơn vị tiền tệ: <strong>đồng (VND)</strong> · SL khách hàng/thẻ là số nguyên. Tổng phòng = Σ CBTD; tổng chi nhánh = Σ phòng (trừ khi có override).
    </div>`;
    body.innerHTML = html;
    // build CBTD grid
    const cbtdPn = document.getElementById("ctkh-md-pn-cbtd");
    let g = `<div style="overflow:auto;max-height:55vh"><table class="ctkh-input"><thead><tr><th class="first-col">CBTD</th>`;
    CT_DEFS.forEach(ct=> g += `<th title="${ct.label}">${ct.label.replace("Doanh thu ","DT ").replace("Dư nợ ","")}<br><span style="font-weight:500;font-size:9px">(${ct.unit})</span></th>`);
    g += `</tr></thead><tbody>`;
    _phongKeys().forEach(pk=>{
      g += `<tr class="row-phong"><td class="first-col" colspan="${1+CT_DEFS.length}">${map[pk].roman} — ${map[pk].label}</td></tr>`;
      (map[pk].members||[]).forEach(m=>{
        const k = _plan.keHoachCBTD[m.name] || ZERO_KH();
        g += `<tr data-cbtd="${m.name}"><td class="first-col">${m.name}</td>`;
        CT_DEFS.forEach(ct=>{
          g += `<td><input type="text" data-ct="${ct.id}" value="${(k[ct.id]||0).toLocaleString("vi-VN")}" onfocus="this.select()" oninput="this.value=this.value.replace(/[^0-9]/g,'').replace(/\\B(?=(\\d{3})+(?!\\d))/g,'.')"></td>`;
        });
        g += `</tr>`;
      });
    });
    g += `</tbody></table></div>`;
    cbtdPn.innerHTML = g;
    // chi nhánh tab
    const cnPn = document.getElementById("ctkh-md-pn-chinhanh");
    let c = `<div style="color:#92400e;background:#fef3c7;padding:10px;border-radius:6px;font-size:11.5px;margin-bottom:10px">⚠ Nhập tổng chi nhánh sẽ <strong>override</strong> giá trị cuộn từ CBTD. Bấm "⚖️ Phân bổ theo tỷ trọng" để rải xuống CBTD.</div>`;
    CT_DEFS.forEach(ct=>{
      const v = (_plan.overrideChiNhanh && _plan.overrideChiNhanh[ct.id]) || 0;
      c += `<div class="row-input">
        <label>${ct.label}</label>
        <input type="text" data-ct-cn="${ct.id}" value="${v.toLocaleString("vi-VN")}" onfocus="this.select()" oninput="this.value=this.value.replace(/[^0-9]/g,'').replace(/\\B(?=(\\d{3})+(?!\\d))/g,'.')">
        <span class="unit">${ct.unit}</span>
      </div>`;
    });
    cnPn.innerHTML = c;
    document.getElementById("ctkh-modal-overlay").classList.add("show");
  }
  window.ctkhOpenPlanModal = ctkhOpenPlanModal;

  function ctkhModalSwitch(m){
    document.getElementById("ctkh-md-cbtd").classList.toggle("active", m==="cbtd");
    document.getElementById("ctkh-md-chinhanh").classList.toggle("active", m==="chinhanh");
    document.getElementById("ctkh-md-pn-cbtd").style.display = m==="cbtd" ? "" : "none";
    document.getElementById("ctkh-md-pn-chinhanh").style.display = m==="chinhanh" ? "" : "none";
  }
  window.ctkhModalSwitch = ctkhModalSwitch;

  function ctkhClosePlanModal(){ document.getElementById("ctkh-modal-overlay").classList.remove("show"); }
  window.ctkhClosePlanModal = ctkhClosePlanModal;

  function ctkhDistributeFromTotal(){
    // Lấy giá trị từ panel chi nhánh, phân bổ xuống CBTD theo tỷ trọng dư nợ live
    const cnInputs = document.querySelectorAll('#ctkh-md-pn-chinhanh input[data-ct-cn]');
    const total = {}; cnInputs.forEach(i=> total[i.getAttribute('data-ct-cn')] = parseInt(i.value.replace(/[^0-9]/g,""),10)||0);
    // tỷ trọng dư nợ live
    const cbtds = _allCBTD();
    const weights = {}; let sumW = 0;
    cbtds.forEach(c=>{
      const live = ctkhGetLive({ scope:{kind:"cbtd", id:c.name} });
      const w = Math.max(1, live.tongDuNo||0); // tránh 0
      weights[c.name] = w; sumW += w;
    });
    cbtds.forEach(c=>{
      const ratio = weights[c.name] / sumW;
      const rowInputs = document.querySelectorAll(`#ctkh-md-pn-cbtd tr[data-cbtd="${c.name}"] input[data-ct]`);
      rowInputs.forEach(i=>{
        const id = i.getAttribute('data-ct');
        const v = Math.round((total[id]||0) * ratio);
        i.value = v.toLocaleString("vi-VN");
      });
    });
    if(typeof showToast==="function") showToast("⚖️ Đã phân bổ xuống CBTD theo tỷ trọng dư nợ", "green");
    ctkhModalSwitch("cbtd");
  }
  window.ctkhDistributeFromTotal = ctkhDistributeFromTotal;

  function ctkhSavePlan(){
    const yearI = document.getElementById("ctkh-input-year");
    const y = parseInt(yearI.value,10) || _plan.nam;
    // CBTD
    const newCBTD = {};
    document.querySelectorAll('#ctkh-md-pn-cbtd tr[data-cbtd]').forEach(tr=>{
      const name = tr.getAttribute('data-cbtd');
      const k = ZERO_KH();
      tr.querySelectorAll('input[data-ct]').forEach(i=>{
        k[i.getAttribute('data-ct')] = parseInt(i.value.replace(/[^0-9]/g,""),10) || 0;
      });
      newCBTD[name] = k;
    });
    // Chi nhánh override
    const newCN = ZERO_KH();
    document.querySelectorAll('#ctkh-md-pn-chinhanh input[data-ct-cn]').forEach(i=>{
      newCN[i.getAttribute('data-ct-cn')] = parseInt(i.value.replace(/[^0-9]/g,""),10) || 0;
    });
    _plan._history = _plan._history || [];
    _plan._history.push({ ts:new Date().toISOString(), nam:_plan.nam, keHoachCBTD:{..._plan.keHoachCBTD}, overrideChiNhanh:{..._plan.overrideChiNhanh} });
    if(_plan._history.length > 30) _plan._history = _plan._history.slice(-30);
    _plan.nam = y;
    _plan.keHoachCBTD = newCBTD;
    _plan.overrideChiNhanh = newCN;
    _plan.capNhatCuoi = new Date().toISOString();
    ctkhSaveToStorage(_plan);
    ctkhClosePlanModal();
    if(typeof showToast==="function") showToast("✅ Đã lưu kế hoạch năm "+y, "green");
    ctkhInit();
  }
  window.ctkhSavePlan = ctkhSavePlan;

  // ── EXPORT EXCEL ──
  async function _ensureXLSX(){
    if(typeof XLSX !== "undefined") return;
    if(typeof loadSheetJS === "function") await loadSheetJS();
    if(typeof XLSX === "undefined") throw new Error("Không tải được thư viện XLSX");
  }

  async function ctkhExportExcel(){
    try{
      await _ensureXLSX();
      const year = _plan.nam;
      const wb = XLSX.utils.book_new();
      const map = _getPhongMap();

      // Sheet 1: Tổng hợp (KPI)
      {
        const scope = _currentScope();
        const live = ctkhGetLive({scope, loaiVay:_filter.loaiVay});
        const kh = ctkhGetKH(scope);
        const rows = [["Chỉ tiêu","Đơn vị","KH "+year,"Live","%HT"]];
        CT_DEFS.forEach(ct=>{
          const prog = ctkhProgress(live[ct.id]||0, kh[ct.id]||0, year);
          rows.push([ct.label, ct.unit, kh[ct.id]||0, Math.round(live[ct.id]||0), prog.pctHT==null?"":Math.round(prog.pctHT*10)/10+"%"]);
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Tổng hợp");
      }
      // Sheet 2: Theo CBTD
      {
        const rows = [["CBTD","Phòng",...CT_DEFS.flatMap(ct=>[`KH ${ct.label}`,`Live ${ct.label}`,`%HT ${ct.label}`])]];
        _allCBTD().forEach(c=>{
          const v = ctkhGetLive({scope:{kind:"cbtd",id:c.name}, loaiVay:_filter.loaiVay});
          const k = ctkhGetKH({kind:"cbtd",id:c.name});
          const r = [c.name, map[c.phong].label];
          CT_DEFS.forEach(ct=>{
            const p = ctkhProgress(v[ct.id]||0, k[ct.id]||0, year);
            r.push(k[ct.id]||0, Math.round(v[ct.id]||0), p.pctHT==null?"":Math.round(p.pctHT*10)/10);
          });
          rows.push(r);
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Theo CBTD");
      }
      // Sheet 3: Theo Phòng
      {
        const rows = [["Phòng",...CT_DEFS.flatMap(ct=>[`KH ${ct.label}`,`Live ${ct.label}`,`%HT ${ct.label}`])]];
        _phongKeys().forEach(pk=>{
          const v = ctkhGetLive({scope:{kind:"phong",id:pk}, loaiVay:_filter.loaiVay});
          const k = ctkhGetKH({kind:"phong",id:pk});
          const r = [map[pk].label];
          CT_DEFS.forEach(ct=>{
            const p = ctkhProgress(v[ct.id]||0, k[ct.id]||0, year);
            r.push(k[ct.id]||0, Math.round(v[ct.id]||0), p.pctHT==null?"":Math.round(p.pctHT*10)/10);
          });
          rows.push(r);
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Theo Phòng");
      }
      // Sheet 4: Theo loại vay
      {
        const rows = [["Loại vay","Tổng dư nợ","Dư nợ NH","Dư nợ TH","Dư nợ DH","Dư nợ TC","SL KH","Dư nợ DN"]];
        [["nh","Ngắn hạn"],["th","Trung hạn"],["dh","Dài hạn"],["tc","Thấu chi"]].forEach(([lv,lbl])=>{
          const v = ctkhGetLive({scope:_currentScope(), loaiVay:lv});
          rows.push([lbl, v.tongDuNo, v.duNoNH, v.duNoTH, v.duNoDH, v.duNoTC, v.slKH, v.duNoDN]);
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Theo loại vay");
      }
      // Sheet 5: Ma trận mốc
      {
        const mocs = ctkhListMocSoSanh(year).filter(m=>m.hasData);
        const header = ["Chỉ tiêu","Đơn vị","KH "+year,"Live","%HT"];
        mocs.forEach(m=> header.push(m.label));
        mocs.forEach(m=> header.push("Δ "+m.label));
        const rows = [header];
        const opts = { scope:_currentScope(), loaiVay:_filter.loaiVay };
        const live = ctkhGetLive(opts);
        const kh = ctkhGetKH(_currentScope());
        CT_DEFS.forEach(ct=>{
          const v = live[ct.id]||0; const k = kh[ct.id]||0;
          const prog = ctkhProgress(v, k, year);
          const r = [ct.label, ct.unit, k, Math.round(v), prog.pctHT==null?"":Math.round(prog.pctHT*10)/10+"%"];
          mocs.forEach(m=>{ const s=ctkhSnapshotAggregate(m, opts); r.push(s? Math.round(s[ct.id]) : ""); });
          mocs.forEach(m=>{ const s=ctkhSnapshotAggregate(m, opts); r.push(s? Math.round(v - s[ct.id]) : ""); });
          rows.push(r);
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Ma trận mốc");
      }
      XLSX.writeFile(wb, `CHI_TIEU_KE_HOACH_${year}_${new Date().toISOString().slice(0,10)}.xlsx`);
      if(typeof showToast==="function") showToast("📊 Đã xuất Excel (5 sheet)", "green");
    }catch(e){
      console.error("[CTKH] export failed", e);
      alert("Lỗi xuất Excel: "+e.message);
    }
  }
  window.ctkhExportExcel = ctkhExportExcel;

  // ── EXPORT WORD (HTML-based .doc) ──
  function ctkhExportWord(){
    try{
      const year = _plan.nam; const map = _getPhongMap();
      const scope = _currentScope();
      const live = ctkhGetLive({scope, loaiVay:_filter.loaiVay});
      const kh = ctkhGetKH(scope);
      let body = `<h2 style="text-align:center;color:#1e3a8a">BÁO CÁO CHỈ TIÊU KẾ HOẠCH NĂM ${year}</h2>
        <p style="text-align:center"><i>Phạm vi: ${_filter.scope==="chinhanh"?"Toàn chi nhánh":_filter.scope==="phong"?("Phòng "+(map[_filter.scopeId]?map[_filter.scopeId].label:"")):"CBTD "+_filter.scopeId}
        ${_filter.loaiVay?" · Loại vay: "+_filter.loaiVay.toUpperCase():""}</i></p>
        <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%;font-family:Arial">
        <tr style="background:#1e3a8a;color:#fff;font-weight:700"><th>Chỉ tiêu</th><th>Đơn vị</th><th>KH ${year}</th><th>Hiện tại</th><th>%HT</th></tr>`;
      CT_DEFS.forEach(ct=>{
        const v = live[ct.id]||0; const k = kh[ct.id]||0;
        const p = ctkhProgress(v, k, year);
        body += `<tr><td>${ct.label}</td><td>${ct.unit}</td><td style="text-align:right">${k.toLocaleString("vi-VN")}</td><td style="text-align:right">${Math.round(v).toLocaleString("vi-VN")}</td><td style="text-align:right"><b>${p.pctHT==null?"—":p.pctHT.toFixed(1)+"%"}</b></td></tr>`;
      });
      body += `</table><p style="margin-top:14px;font-size:11px;color:#64748b">Xuất lúc ${new Date().toLocaleString("vi-VN")} · Agribank Nam Định — Phòng KHKD</p>`;
      const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset="utf-8"><title>CTKH ${year}</title></head><body>${body}</body></html>`;
      const blob = new Blob(['\ufeff'+html], { type:'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `CHI_TIEU_KE_HOACH_${year}_${new Date().toISOString().slice(0,10)}.doc`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      if(typeof showToast==="function") showToast("📄 Đã xuất Word", "green");
    }catch(e){ alert("Lỗi xuất Word: "+e.message); }
  }
  window.ctkhExportWord = ctkhExportWord;

  // ── Hook showPage ──
  TD.onShowPage(function (name) { if (name === "ctkh") { try { ctkhInit(); } catch (e) { console.error("[CTKH] init failed", e); } } }); // HM-13b
})();
