
/* ═══════════════════════════════════════════════════════════════
   CORE RENDER: getFilteredData
   ═══════════════════════════════════════════════════════════════ */
function getFilteredData(key) {
  let rows = [];
  const q = ($(`search-${key}`)?.value || '').trim().toLowerCase();
  const today = todayMidnight();

  if (key === 'qltd') {
    rows = DATA.qltd.slice();
    const lv = $('filter-qltd-loaivay')?.value;
    const nh = $('filter-qltd-nhomno')?.value;
    const cb = $('filter-qltd-cbtd')?.value;
    const pb = $('filter-qltd-phongban')?.value;
    if (lv) rows = rows.filter(r => String(r[13] || '').toLowerCase().includes(lv));
    if (nh) rows = rows.filter(r => r[18] === nh);
    if (cb) rows = rows.filter(r => r[12] === cb);
    if (pb) rows = rows.filter(r => r[17] === pb);
  } else if (key === 'kd') {
    rows = DATA.qltd.filter(r => isNganHan(r[13]));
    const cb = $('filter-kd-cbtd')?.value;
    const pb = $('filter-kd-phongban')?.value;
    const nh = $('filter-kd-nhomno')?.value;
    if (cb) rows = rows.filter(r => r[12] === cb);
    if (pb) rows = rows.filter(r => r[17] === pb);
    if (nh) rows = rows.filter(r => r[18] === nh);
  } else if (key === 'td') {
    rows = DATA.qltd.filter(r => isTrungHan(r[13]));
    const cb = $('filter-td-cbtd')?.value;
    const pb = $('filter-td-phongban')?.value;
    if (cb) rows = rows.filter(r => r[12] === cb);
    if (pb) rows = rows.filter(r => r[17] === pb);
  } else if (key === 'denhan') {
    rows = DATA.qltd.filter(r => r[7] && Number(r[11]) > 0);
    // FIX v25: Bỏ lọc getDenhanAmt(r) > 0 vì DENHAN_AMT là snapshot cứng —
    // khoản mới nhập IPCAS hoặc dư nợ thay đổi sẽ không có trong bảng → bị lọc mất.
    // Thay bằng: hiện tất cả khoản có ngày T.nợ (r[7]) và dư nợ > 0.
    const from = $('denhan-from')?.value;
    const to = $('denhan-to')?.value;
    const cb = $('filter-denhan-cbtd')?.value;
    const status = $('filter-denhan-status')?.value;
    const lv = $('filter-denhan-lv')?.value;
    const fromD = from ? parseVNDate(from) : null;
    let toD = to ? parseVNDate(to) : null;
    if (toD) toD = new Date(toD.getFullYear(), toD.getMonth(), toD.getDate(), 23, 59, 59);
    // PATCH v13.9.1: Quá hạn Lãi từ IPCAS (inpd01) — gốc HĐ chưa đến hạn nên
    // r[7] còn ở tương lai và bị bộ lọc From/To loại. Đánh dấu các row này
    // để bypass lọc ngày khi đang xem trạng thái "Quá hạn" hoặc không lọc trạng thái.
    const _pdMap2 = (window.TD_PASTDUE && TD_PASTDUE.map) || {};
    const _pdKey2 = (r) => (String(r[0]||'').replace(/\D/g,'') + '|' + String(r[2]||'').replace(/[^A-Za-z0-9]/g,'').toUpperCase());
    rows = rows.filter(r => {
      const pd = _pdMap2[_pdKey2(r)];
      if (pd) {
        // FIX v13.9.15: bỏ qua entry đã cleared / đã thu hết gốc + lãi
        if (pd.cleared) return false;
        const _g = Number(pd.duNoQH)||0, _l = Number(pd.laiQH)||0;
        if (_g <= 0 && _l <= 0) return false;
        r._pastDue = pd; return true;
      }
      const d = parseVNDate(r[7]);
      if (!d) return false;
      if (fromD && d < fromD) return false;
      if (toD && d > toD) return false;
      return true;
    });
    if (cb) rows = rows.filter(r => r[12] === cb);
    const pb_dh = $('filter-denhan-phongban')?.value;
    if (pb_dh) rows = rows.filter(r => r[17] === pb_dh);
    if (lv) rows = rows.filter(r => String(r[13]||'').toLowerCase().includes(lv));
    if (status) {
      rows = rows.filter(r => {
        const s = DATA.denhanStatus[denhanKey(r)] || {};
        const d = parseVNDate(r[7]);
        const overdue = (d && d < today && !s.dathu) || !!r._pastDue;
        if (status === 'dathu') return s.dathu;
        if (status === 'chua') return !s.dathu && !overdue;
        if (status === 'quahan') return overdue;
        return true;
      });
    }
  } else if (key === 'laidong') {
    // LÃI ĐỌNG chỉ chứa KH có tiền lãi phải thu > 0
    rows = DATA.qltd.filter(r => Number(r[10]) > 0);
    const from = $('laidong-from')?.value;
    const to = $('laidong-to')?.value;
    const cb = $('filter-laidong-cbtd')?.value;
    const status = $('filter-laidong-status')?.value;
    const fromD = from ? parseVNDate(from) : null;
    let toD = to ? parseVNDate(to) : null;
    if (toD) toD = new Date(toD.getFullYear(), toD.getMonth(), toD.getDate(), 23, 59, 59);
    if (fromD || toD) {
      // Lọc theo r[23] = "đã thu lãi đến" (lstintchrgprd)
      rows = rows.filter(r => {
        const d = parseVNDate(r[23]);
        if (!d) return !fromD;  // rows thiếu ngày: chỉ hiện khi không có from
        if (fromD && d < fromD) return false;
        if (toD && d > toD) return false;
        return true;
      });
    } else {
      // MẶC ĐỊNH: không có filter từ/đến → vẫn áp dụng quy tắc "chưa thu trong tháng hiện tại"
      // Loại những KH đã thu lãi từ 01/MM/YYYY (đầu tháng hiện tại) trở về sau
      const today = todayMidnight();
      const currentMonthFirst = new Date(today.getFullYear(), today.getMonth(), 1);
      rows = rows.filter(r => {
        const d = parseVNDate(r[23]);
        if (!d) return true;  // rows không có ngày: mặc định hiện (để CBTD rà soát)
        return d < currentMonthFirst;
      });
    }
    if (cb) rows = rows.filter(r => r[12] === cb);
    const pb_ld = $('filter-laidong-phongban')?.value;
    const lv_ld = $('filter-laidong-lv')?.value;
    if (pb_ld) rows = rows.filter(r => r[17] === pb_ld);
    if (lv_ld) rows = rows.filter(r => String(r[13]||'').toLowerCase().includes(lv_ld));
    if (status) {
      rows = rows.filter(r => {
        const s = DATA.laidongStatus[laidongKey(r)] || {};
        return status === 'dathu' ? !!s.dathu : !s.dathu;
      });
    }
  } else if (key === 'chlm') {
    // CHUYỂN HẠN MỨC: lọc theo NGÀY ĐẾN HẠN HMTD (r[24] = apprmatdt)
    // Chỉ dùng r[24] — r[7] là dsbsmatdt (ngày đến hạn giải ngân), KHÔNG phải apprmatdt
    rows = DATA.qltd.filter(r => {
      const loai = String(r[13] || '').toLowerCase();
      return /ngắn hạn|hạn mức|hmtd|thấu chi/i.test(loai) || r[24];
    });
    const from_c = $('chlm-from')?.value;
    const to_c   = $('chlm-to')?.value;
    const cb_c   = $('filter-chlm-cbtd')?.value;
    const st_c   = $('filter-chlm-status')?.value;
    const lv_c   = $('filter-chlm-loaivay')?.value;
    const fromD_c = from_c ? parseVNDate(from_c) : null;
    let toD_c = to_c ? parseVNDate(to_c) : null;
    if (toD_c) toD_c = new Date(toD_c.getFullYear(), toD_c.getMonth(), toD_c.getDate(), 23, 59, 59);
    if (fromD_c || toD_c) {
      rows = rows.filter(r => {
        // ✅ FIX: dùng r[7] (dsbsmatdt) làm fallback nếu r[24] (apprmatdt) chưa có
        const d = parseVNDate(r[24]) || parseVNDate(r[7]);
        if (!d) return false; // thiếu cả hai → ẩn khi lọc ngày
        if (fromD_c && d < fromD_c) return false;
        if (toD_c && d > toD_c) return false;
        return true;
      });
    }
    if (cb_c) rows = rows.filter(r => r[12] === cb_c);
    const pb_c = $('filter-chlm-phongban')?.value;
    if (pb_c) rows = rows.filter(r => r[17] === pb_c);
    if (lv_c) rows = rows.filter(r => String(r[13]||'').toLowerCase().includes(lv_c));
    if (st_c) {
      rows = rows.filter(r => {
        const s = DATA.chlmStatus[chlmKey(r)] || {};
        return st_c === 'dachuyen' ? !!s.dachuyen : !s.dachuyen;
      });
    }
  } else if (key === 'phidv') {
    // Dữ liệu NGÀY GN = r[6] (cột dsbsdt IPCAS) — cùng nguồn với cột NGÀY GN trong QLTD
    const fromIPCAS = DATA.qltd.filter(r => Number(r[11]) > 0);
    const fromExtra = (DATA.phidvExtra || []).map(e => e._row);
    rows = [...fromIPCAS, ...fromExtra];

    const cb  = $('filter-phidv-cbtd')?.value;
    const from = $('phidv-from')?.value;
    const to  = $('phidv-to')?.value;
    // Filter khoảng ngày GN: fromD <= NGÀY GN <= toD
    const q   = ($('search-phidv')?.value || '').trim().toLowerCase();
    let fromD = from ? parseVNDate(from) : null;
    let toD = to ? parseVNDate(to) : null;
    if (toD) toD = new Date(toD.getFullYear(), toD.getMonth(), toD.getDate(), 23, 59, 59);
    if (cb) rows = rows.filter(r => r[12] === cb);
    const pb_p = $('filter-phidv-phongban')?.value;
    const lv_p = $('filter-phidv-lv')?.value;
    if (pb_p) rows = rows.filter(r => r[17] === pb_p);
    if (lv_p) rows = rows.filter(r => String(r[13]||'').toLowerCase().includes(lv_p));
    if (q)  rows = rows.filter(r =>
      [r[0], r[1], r[2], r[12], typeof fmtMaKH === 'function' ? fmtMaKH(r[0]) : '']
        .some(v => String(v||'').toLowerCase().includes(q))
    );
    // Chỉ hiển thị dòng có NGÀY GN (r[6]); lọc theo khoảng từ/đến
    rows = rows.filter(r => {
      const d = parseVNDate(r[6]);
      if (!d) return false;
      if (fromD && d < fromD) return false;
      if (toD && d > toD) return false;
      return true;
    });
  } else if (key === 'macb') {
    rows = DATA.macb.slice();
    const cv = $('filter-macb-cv')?.value;
    const pb = $('filter-macb-pb')?.value;
    if (cv) rows = rows.filter(r => r.chucvu === cv);
    if (pb) rows = rows.filter(r => r.phongban === pb);
  }

  // Text search (except macb and phidv which have own logic inside their blocks)
  if (q && key !== 'macb' && key !== 'phidv') {
    rows = rows.filter(r => [r[0],fmtMaKH(r[0]),r[1],r[2],r[12],r[14],r[17]].some(v => String(v||'').toLowerCase().includes(q)));
  }
  if (q && key === 'macb') {
    rows = rows.filter(r => [r.hoten,r.macb,r.chucvu,r.phongban].some(v => String(v||'').toLowerCase().includes(q)));
  }

  // Sort
  const st = sortState[key];
  /* v14.11: mặc định sắp PHÒNG BAN → CBTD (giống menu Khách hàng mới) khi người dùng chưa bấm tiêu đề cột */
  /* v14.12: thứ tự CHUẨN Hội Sở → PGD Hai Bà Trưng → PGD Số 2, trong phòng ban CBTD A→Z.
     Sau đó mới đến khoá phụ mặc định của từng bảng (số HĐTD / ngày...). */
  if (!(st && st.col != null) && ['qltd','kd','td','denhan','laidong','chlm'].includes(key)) {
    const _sec = (window.TD_DEFSEC || {})[key];
    rows.sort((a, b) => {
      const c = window.TD_SXCB.cmpRow(a, b, 17, 12);
      if (c) return c;
      if (_sec == null) return 0;
      let va = a[_sec], vb = b[_sec];
      if (typeof va === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}/.test(va)) {
        va = parseVNDate(va)?.getTime() || 0; vb = parseVNDate(vb)?.getTime() || 0;
      }
      const na = Number(va), nb = Number(vb);
      if (!isNaN(na) && !isNaN(nb) && va !== '' && vb !== '') return na - nb;
      return (window.__tdColl || (window.__tdColl = new Intl.Collator('vi', { numeric: true }))).compare(String(va || ''), String(vb || '')); // HM-18
    });
  }
  if (st && st.col != null) {
    const col = st.col, asc = st.asc;
    rows.sort((a, b) => {
      let va = a[col], vb = b[col];
      // SỐ HỒ SƠ display = r[19] (số HĐ gốc); r[22] (số tập) chỉ là badge phụ
      if (col === 19 || col === 22) {
        va = a[19] || a[22] || '';
        vb = b[19] || b[22] || '';
      }
      if (typeof va === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}/.test(va)) {
        va = parseVNDate(va)?.getTime() || 0;
        vb = parseVNDate(vb)?.getTime() || 0;
      }
      const na = Number(va), nb = Number(vb);
      if (!isNaN(na) && !isNaN(nb) && va !== '' && vb !== '') return asc ? na - nb : nb - na;
      va = String(va || '').toLowerCase();
      vb = String(vb || '').toLowerCase();
      return asc ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  }
  return rows;
}

/* ═══════════════════════ CHUYỂN HẠN MỨC — GOM THEO MÃ KH ═══════════════════════ */
function renderChlmGrouped() {
  const tbody = $('tbody-chlm');
  if (!tbody) return;
  const rows = getFilteredData('chlm');
  const today = todayMidnight();

  const loaiVayChip = v => {
    if (!v) return '';
    if (/thấu chi/i.test(v)) return '<span class="chip chip-purple">Thấu chi</span>';
    if (/ngắn hạn/i.test(v)) return '<span class="chip chip-blue">Ngắn hạn</span>';
    if (/trung hạn/i.test(v)) return '<span class="chip chip-orange">Trung hạn</span>';
    if (/dài hạn/i.test(v)) return '<span class="chip chip-red">Dài hạn</span>';
    return escapeHtml(v);
  };

  // Gom nhóm theo Mã KH (r[0])
  const khMap = new Map();
  for (const r of rows) {
    const ma = String(r[0] || '').trim();
    if (!ma) continue;
    if (!khMap.has(ma)) {
      khMap.set(ma, {
        ma,
        ten: r[1] || '',
        linkUrl: r[14] || '',
        phongban: r[17] || '',
        cbtd: r[12] || '',
        totalDuno: 0,
        totalHmtd: 0,
        hmtdSet: false, // FIX GỐC RỄ v2026-08-19: HMTD là hạn mức DÙNG CHUNG cho các HĐ con
                        // cùng 1 KH, KHÔNG PHẢI cộng dồn theo từng HĐ — cờ này đảm bảo
                        // chỉ lấy 1 giá trị đại diện (giống logic đã áp dụng ở tra cứu lãi KH)
        hdList: [],
        earliestMatDate: null, // ngày đến hạn sớm nhất (r[24])
        rows: []
      });
    }
    const g = khMap.get(ma);
    g.totalDuno += Number(r[11]) || 0;
    // FIX GỐC RỄ v2026-08-19: KHÔNG cộng dồn HMTD qua các HĐ con của cùng 1 KH
    // (nguyên nhân gốc gây HMTD bị nhân lên nhiều lần, vd 2,5 tỷ x 11 HĐ = 27,5 tỷ).
    // Nhiều HĐTD/khế ước con có thể cùng rút vốn trong 1 hạn mức tín dụng — hạn mức
    // đó chỉ tồn tại DUY NHẤT 1 lần cho cả nhóm KH, nên chỉ lấy 1 giá trị đại diện
    // (giá trị khác 0 đầu tiên gặp được), giống cách xử lý ở khu vực tra cứu lãi KH.
    if (!g.hmtdSet && Number(r[5]) > 0) { g.totalHmtd = Number(r[5]); g.hmtdSet = true; }
    // QA-FIX: phat hien KH co NHIEU gia tri HMTD khac nhau that su giua cac HD
    // (khong phai cung 1 han muc rut nhieu lan) - minh bach hoa thay vi am tham chon 1 gia tri
    else if (g.hmtdSet && Number(r[5]) > 0 && Number(r[5]) !== g.totalHmtd) { g.hmtdAmbiguous = true; }
    // ✅ FIX: dùng r[7] làm fallback khi r[24] (apprmatdt) chưa có
    const matNgay = parseVNDate(r[24]) || parseVNDate(r[7]);
    if (matNgay && (!g.earliestMatDate || matNgay < g.earliestMatDate)) g.earliestMatDate = matNgay;
    g.hdList.push({
      soHD: r[2] || '',
      ngayBD: r[4] || '',   // ngày bắt đầu HĐTD (apprdt)
      ngayDH: r[24] || r[7] || '',  // ✅ FIX: fallback r[7] khi r[24] chưa có
      loaiVay: r[13] || '',
      duno: Number(r[11])||0,
      hmtd: Number(r[5])||0,
      rowRef: r
    });
    g.rows.push(r);
  }

  // Lấy trạng thái tổng hợp: nếu TẤT CẢ HĐ đã chuyển → "đã chuyển"
  const getChlmGroupStatus = (g) => {
    if (!g.rows.length) return false;
    return g.rows.every(r => (DATA.chlmStatus[chlmKey(r)] || {}).dachuyen);
  };

  // Set trạng thái cho tất cả HĐ của 1 KH
  window.setChlmGroupStatus = function(maKH, val) {
    const g = khMap.get(maKH);
    if (!g) return;
    g.rows.forEach(r => {
      const k = chlmKey(r);
      if (!DATA.chlmStatus[k]) DATA.chlmStatus[k] = {};
      DATA.chlmStatus[k].dachuyen = (val === 'dachuyen');
      DATA.chlmStatus[k].ts = Date.now();
    });
    markUnsaved();
    saveData(true);
    renderChlmGrouped();
    updateBadges();
  };

  const groups0 = [...khMap.values()];
  // QA-FEATURE: bo loc "chi hien KH co nhieu HMTD" - dung chinh co da co san (hmtdAmbiguous)
  const onlyAmbig = document.getElementById('chlm-f-ambig');
  const groups = (onlyAmbig && onlyAmbig.checked) ? groups0.filter(g => g.hmtdAmbiguous) : groups0;

  // Sắp xếp nhóm theo ngày ĐẾN HẠN HMTD (apprmatdt) sớm nhất → muộn nhất
  // Nhóm không có apprmatdt (chưa import lại) xếp xuống cuối
  groups.sort((a, b) => {
    const _st = sortState['chlm'];
    if (!(_st && _st.col != null)) {
      const c = window.TD_SXCB.cmp(a.phongban, a.cbtd, b.phongban, b.cbtd);
      if (c) return c;
    } else if (_st.col === 12 || _st.col === 17) {
      const _vi = (x, y) => String(x || '').localeCompare(String(y || ''), 'vi', { sensitivity: 'base' });
      const c = _st.col === 12 ? _vi(a.cbtd, b.cbtd) : _vi(a.phongban, b.phongban);
      if (c) return _st.asc ? c : -c;
    }
    const da = a.earliestMatDate, db = b.earliestMatDate;
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da - db;
  });

  const html = groups.map((g) => {
    const daChuyen = getChlmGroupStatus(g);
    const trCls = daChuyen ? 'row-da-chuyen' : '';
    const selStyle = daChuyen
      ? 'border:1.5px solid var(--red);background:#fde8e6;color:var(--red);font-weight:700'
      : 'border:1.5px solid var(--gray-300);background:#fff;color:var(--gray-700);font-weight:500';

    // ── CỘT ĐẾN HẠN HMTD: ngày apprmatdt (r[24]) sớm nhất trong nhóm ──
    const earliestDH = g.hdList.reduce((best, h) => {
      const d = parseVNDate(h.ngayDH);
      if (!d) return best;
      if (!best.d || d < best.d) return { d, s: h.ngayDH };
      return best;
    }, { d: null, s: '' });
    const denHanDate = earliestDH.d;
    const denHanStr  = earliestDH.s;

    let denHanLabel = denHanStr
      ? escapeHtml(denHanStr)
      : '<span style="color:var(--gray-400);font-style:italic" title="Chưa có apprmatdt — cần import lại IPCAS">—</span>';
    if (denHanDate) {
      const diff = daysDiff(today, denHanDate);
      if (diff < 0)        denHanLabel = `<strong style="color:var(--orange)" title="HĐ HMTD đã hết hiệu lực — cần ký HĐ HMTD mới. KHÔNG phải lãi phạt; các khế ước con (LDS) vẫn theo lãi suất gốc.">${escapeHtml(denHanStr)}</strong><br><small style="color:var(--orange)">HĐ HMTD hết hạn ${-diff} ngày</small>`;
      else if (diff <= 7)  denHanLabel = `<strong style="color:var(--orange)">${escapeHtml(denHanStr)}</strong><br><small style="color:var(--orange)">còn ${diff} ngày</small>`;
      else if (diff <= 30) denHanLabel = `<span style="color:var(--blue)">${escapeHtml(denHanStr)}</span><br><small style="color:var(--gray-500)">còn ${diff} ngày</small>`;
      else                 denHanLabel = `<span style="color:var(--gray-700)">${escapeHtml(denHanStr)}</span>`;
    }

    // ── CỘT NGÀY BĐ HĐ: ngày bắt đầu HĐTD sớm nhất (apprdt = r[4]) ──
    const earliestBD = g.hdList.reduce((best, h) => {
      const d = parseVNDate(h.ngayBD);
      if (!d) return best;
      if (!best.d || d < best.d) return { d, s: h.ngayBD };
      return best;
    }, { d: null, s: '' });
    const ngayBDLabel = earliestBD.s
      ? `<span style="color:var(--gray-600)">${escapeHtml(earliestBD.s)}</span>`
      : '<span style="color:var(--gray-400);font-style:italic">—</span>';

    // ── Danh sách HĐ: nếu nhiều HĐ → tooltip chi tiết ──
    const hdSummary = g.hdList.length === 1
      ? escapeHtml(g.hdList[0].soHD)
      : `<span title="${g.hdList.map(h=>`${h.soHD}\nBĐ: ${h.ngayBD}  ĐH: ${h.ngayDH}\nDư nợ: ${fmtMoney(h.duno)}`).join('\n─────\n')}" style="cursor:help;border-bottom:1px dashed var(--gray-400)">${escapeHtml(g.hdList[0].soHD)} <span style="color:var(--blue);font-size:10px;font-weight:700">+${g.hdList.length-1} HĐ</span></span>`;

    // ── Loại vay (gộp các loại duy nhất) ──
    const loaiVaySet = [...new Set(g.hdList.map(h => h.loaiVay).filter(Boolean))];
    const loaiVayHtml = loaiVaySet.map(v => loaiVayChip(v)).join(' ');

    const maKHEsc = g.ma.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

    return `<tr class="${trCls}">
      <td style="text-align:center"><input type="checkbox" data-makh="${escapeHtml(g.ma)}" onchange="onSelectionChange('chlm')"></td>
      <td style="font-size:11px">${escapeHtml(g.cbtd)}</td>
      <td style="font-size:11px">${escapeHtml(g.phongban)}</td>
      <td class="date" style="min-width:110px">${denHanLabel}</td>
      <td><strong>${khLink(g.ma, g.ten, g.linkUrl)}</strong></td>
      <td class="date copy-cell" onclick="copyCellValue(this,event)" title="Click để copy MÃ KH">${escapeHtml(fmtMaKH(g.ma))}</td>
      <td class="date">${hdSummary}</td>
      <td class="date" style="min-width:100px">${ngayBDLabel}</td>
      <td class="money">${fmtMoney(g.totalHmtd)}${g.hmtdAmbiguous ? ' <span title="Khách hàng này có nhiều giá trị HMTD khác nhau giữa các hợp đồng — số hiển thị chỉ là 1 giá trị đại diện, vui lòng đối chiếu IPCAS trước khi dùng để chuyển hạn mức." style="background:#f59e0b;color:#fff;font-size:9px;font-weight:700;padding:1px 5px;border-radius:8px;cursor:help">⚠ nhiều HMTD</span>' : ''}</td>
      <td>${loaiVayHtml}</td>
      <td class="money big">${fmtMoney(g.totalDuno)}</td>
      <td><select onchange="setChlmGroupStatus('${maKHEsc}',this.value)"
        style="width:100%;padding:5px 8px;border-radius:6px;font-size:11px;font-family:inherit;outline:none;cursor:pointer;${selStyle}">
        <option value="chua"     ${!daChuyen ? 'selected' : ''}>⏳ Chưa chuyển</option>
        <option value="dachuyen" ${daChuyen  ? 'selected' : ''}>✅ Đã chuyển</option>
      </select></td>
    </tr>`;
  }).join('');

  tbody.innerHTML = html ||
    '<tr><td colspan="12" style="text-align:center;padding:20px;color:var(--gray-500)">Không có dữ liệu khớp bộ lọc</td></tr>';

  const countEl = $('count-chlm');
  if (countEl) countEl.textContent = fmtNum(groups.length);

  const allChk = $('chk-all-chlm');
  if (allChk) { allChk.checked = false; allChk.indeterminate = false; }

  const tfoot = $('tfoot-chlm');
  if (tfoot) {
    const totalHmtd = groups.reduce((s, g) => s + g.totalHmtd, 0);
    const totalDuno = groups.reduce((s, g) => s + g.totalDuno, 0);
    const doneCount    = groups.filter(g => getChlmGroupStatus(g)).length;
    const pendingCount = groups.length - doneCount;
    tfoot.innerHTML = `<tr>
      <td colspan="8" style="text-align:right">TỔNG (${fmtNum(groups.length)} KHÁCH HÀNG)</td>
      <td class="money" style="color:var(--gold-light)">${fmtMoney(totalHmtd)}</td>
      <td></td>
      <td class="money">${fmtMoney(totalDuno)}</td>
      <td style="font-size:11px;text-align:center">
        <span style="color:var(--green-dark);font-weight:700">✅ ${doneCount}</span>
        <span style="color:var(--gray-400);margin:0 4px">/</span>
        <span style="color:var(--orange);font-weight:700">⏳ ${pendingCount}</span>
      </td>
    </tr>`;
    const pEl = $('chlm-stat-pending'), dEl = $('chlm-stat-done');
    if (pEl) { pEl.textContent = `⏳ Chưa chuyển: ${pendingCount}`; pEl.style.display = pendingCount ? '' : 'none'; }
    if (dEl) { dEl.textContent = `✅ Đã chuyển: ${doneCount}`;      dEl.style.display = doneCount    ? '' : 'none'; }
  }

  setTimeout(updateTableTopScrollbars, 0);
  setTimeout(() => { buildColumnFilters('table-chlm'); }, 0);
  try { if (window.tdColsBuild) window.tdColsBuild(); } catch (e) {} // HM-17b: dòng tổng vừa dựng lại ⇒ đặt lại colspan theo cột đang ẩn
}

/* ═══════════════════════════════════════════════════════════════
   MAIN TABLE RENDER
   ═══════════════════════════════════════════════════════════════ */
function renderTable(key) {
  if (window.__TD_PAGED && window.__TD_PAGED[key]) return window.__TD_PAGED[key]();
  if (key === 'macb') return renderMaCB();
  if (key === 'phidv') return renderPhiDV();
  if (key === 'chlm') return renderChlmGrouped();
  const tbody = $('tbody-' + key);
  if (!tbody) return;
  /* PATCH 2026-06-14: bỏ sanitize trước render — sprd đã đúng từ import */
  let rows = getFilteredData(key);

  // ── Merge phân kỳ trung hạn vào denhan khi chip bật ──
  if (key === 'denhan' && isPhanKyOn()) {
    const phanKyRows = getPhanKyRows();
    // Lọc theo ngày hiện tại của denhan filter
    const fromEl = $('denhan-from'), toEl = $('denhan-to');
    const fromD = fromEl ? parseVNDate(fromEl.value) : null;
    const toD   = toEl   ? parseVNDate(toEl.value)   : null;
    // FIX 2026-06-16: áp các bộ lọc của màn Nợ đến hạn lên cả dòng phân kỳ
    // (trước đây getPhanKyRows chỉ đọc #phanky-filter-cbtd → khi chọn CBTD ở
    // màn Nợ đến hạn, các món phân kỳ của CBTD khác vẫn lọt vào bảng).
    const _dhCb      = $('filter-denhan-cbtd')?.value || '';
    const _dhPb      = $('filter-denhan-phongban')?.value || '';
    const _dhLv      = ($('filter-denhan-lv')?.value || '').toLowerCase();
    const _dhStatus  = $('filter-denhan-status')?.value || '';
    const _todayMid  = todayMidnight();
    const filtered = phanKyRows.filter(r => {
      const d = parseVNDate(r._ngayTraNo);
      if (!d) return false;
      if (fromD && d < fromD) return false;
      if (toD   && d > toD)   return false;
      if (_dhCb && r[12] !== _dhCb) return false;
      if (_dhPb && r[17] !== _dhPb) return false;
      if (_dhLv && !String(r[13]||'').toLowerCase().includes(_dhLv)) return false;
      if (_dhStatus) {
        const st = DATA.denhanStatus[denhanKey(r)] || {};
        const overdue = d && d < _todayMid && !st.dathu;
        if (_dhStatus === 'dathu'  && !st.dathu) return false;
        if (_dhStatus === 'chua'   && (st.dathu || overdue)) return false;
        if (_dhStatus === 'quahan' && !overdue) return false;
      }
      return true;
    });
    rows = rows.concat(filtered);
    // Sort theo ngày trả nợ: r[7] cho ngắn hạn, r._ngayTraNo cho phân kỳ
    rows.sort((a, b) => {
      const _st = sortState['denhan'];
      if (!(_st && _st.col != null)) {
        const c = window.TD_SXCB.cmpRow(a, b, 17, 12);
        if (c) return c;
      }
      const da = parseVNDate(a._phanky ? a._ngayTraNo : a[7]);
      const db = parseVNDate(b._phanky ? b._ngayTraNo : b[7]);
      if (!da && !db) return 0;
      if (!da) return 1; if (!db) return -1;
      return da - db;
    });
  }

  const today = todayMidnight();
  /* PATCH 2026-06-10: windowed render cho bảng dài (>page size) */
  /* HM-17b: phân trang theo trang trên toàn bộ tập đã lọc */
  const __total = rows.length;
  const __isPg = window.__TD_PG_KEYS.includes(key);
  const __pg = __isPg ? window.__TDPgState(key, __total) : null;
  const __sliced = !!(__pg && __pg.size > 0 && __total > __pg.size);
  const visibleRows = __sliced ? rows.slice((__pg.page - 1) * __pg.size, __pg.page * __pg.size) : rows;

  const loaiVayChip = v => {
    if (!v) return '';
    if (/thấu chi/i.test(v)) return '<span class="chip chip-purple">Thấu chi</span>';
    if (/ngắn hạn/i.test(v)) return '<span class="chip chip-blue">Ngắn hạn</span>';
    if (/trung hạn/i.test(v)) return '<span class="chip chip-orange">Trung hạn</span>';
    if (/dài hạn/i.test(v)) return '<span class="chip chip-red">Dài hạn</span>';
    return escapeHtml(v);
  };

  const __parts = visibleRows.map(r => {
    const realIdx = DATA.qltd.indexOf(r);
    const dueDate = parseVNDate(r[7]);
    let rowCls = '';
    if (dueDate && Number(r[11]) > 0) {
      const diff = daysDiff(today, dueDate);
      if (diff < 0) rowCls = 'due-overdue';
      else if (diff <= 7) rowCls = 'due-soon';
    }
    const statusBucket = key === 'denhan' ? DATA.denhanStatus : (key === 'laidong' ? DATA.laidongStatus : null);
    const statusKey = key === 'denhan' ? denhanKey(r) : (key === 'laidong' ? laidongKey(r) : null);
    const status = statusBucket ? (statusBucket[statusKey] || {}) : {};
    if (status.dathu) rowCls = 'row-da-thu';

    const nhomnoCls = {
      'Nhóm 1':'chip-green','Nhóm 2':'chip-blue','Nhóm 3':'chip-orange',
      'Nhóm 4':'chip-red','Nhóm 5':'chip-red'
    }[r[18]] || 'chip-gray';

    if (key === 'denhan') {
      // PATCH v13.9.1: nếu row có _pastDue → override ngày hiển thị bằng ngày QH thực
      const pd = r._pastDue || null;
      const ngayDisplay = pd && pd.ngayQH
        ? pd.ngayQH
        : (r._phanky ? (r._ngayTraNo || '') : (r[7] || ''));
      const dueDateDisp = parseVNDate(ngayDisplay);
      const daysToDue = dueDateDisp ? daysDiff(today, dueDateDisp) : null;
      let dueLabel = escapeHtml(ngayDisplay);
      if (daysToDue != null) {
        if (daysToDue < 0) dueLabel = `<strong style="color:var(--red)">${escapeHtml(ngayDisplay)}</strong><br><small style="color:var(--red)">quá ${-daysToDue} ngày</small>`;
        else if (daysToDue <= 7) dueLabel = `<strong style="color:var(--orange)">${escapeHtml(ngayDisplay)}</strong><br><small style="color:var(--orange)">còn ${daysToDue} ngày</small>`;
        else dueLabel = `<span style="color:var(--blue)">${escapeHtml(ngayDisplay)}</span><br><small style="color:var(--gray-500)">còn ${daysToDue} ngày</small>`;
      }
      // pastDue luôn coi là quá hạn (đỏ)
      const _rowCls = pd ? 'due-overdue' : rowCls;
      const soTienTra = pd
        ? (pd.laiQH > 0
            ? `<span title="Lãi quá hạn theo IPCAS inpd01" style="color:#b45309;font-weight:700">${fmtMoney(pd.laiQH)}</span><br><small style="color:#b45309;font-size:9px">Lãi QH</small>`
            : (pd.duNoQH > 0 ? fmtMoney(pd.duNoQH) : '<span style="color:var(--gray-400)">—</span>'))
        : (r._phanky
          ? (r._soTienTra ? fmtMoney(r._soTienTra) : '<span style="color:var(--purple);font-size:10px;font-style:italic">Chưa nhập</span>')
          : (getDenhanAmt(r) ? fmtMoney(getDenhanAmt(r)) : '<span style="color:var(--gray-400);font-weight:400;font-size:11px">—</span>'));
      const phankyBadge = r._phanky
        ? '<span style="background:#eef2ff;color:#4338ca;border:1px solid #c7d2fe;border-radius:10px;padding:1px 7px;font-size:9px;font-weight:700;margin-left:4px">PHÂN KỲ</span>'
        : '';
      const pdKieu = pd ? String(pd.kieuQH||'').toLowerCase() : '';
      const pdBadge = pd ? (
        /g[ốo]c.*l[ãa]i|l[ãa]i.*g[ốo]c/.test(pdKieu)
          ? '<span title="IPCAS: Quá hạn cả Gốc và Lãi" style="background:#fee2e2;color:#991b1b;border:1px solid #fecaca;border-radius:10px;padding:1px 7px;font-size:9px;font-weight:800;margin-left:4px">QH GỐC+LÃI</span>'
          : /l[ãa]i/.test(pdKieu)
            ? '<span title="IPCAS: Chỉ quá hạn lãi — gốc HĐ chưa đến hạn" style="background:#fef3c7;color:#92400e;border:1px solid #fde68a;border-radius:10px;padding:1px 7px;font-size:9px;font-weight:800;margin-left:4px">LÃI QH</span>'
            : '<span title="IPCAS: Quá hạn gốc" style="background:#fee2e2;color:#991b1b;border:1px solid #fecaca;border-radius:10px;padding:1px 7px;font-size:9px;font-weight:800;margin-left:4px">QH GỐC</span>'
      ) : '';
      const ngayVayLabel = r._phanky
        ? `<small style="color:var(--gray-400);font-size:9px">Vay: ${escapeHtml(r[3]||'')}</small>`
        : '';
      return `<tr class="${_rowCls}${r._phanky?' row-phanky':''}" style="${r._phanky?'background:#f5f3ff':(pd?'background:#fff7ed':'')}">
        <td style="text-align:center">${r._phanky
          ? '<span title="Phân kỳ TH — tick khi thu" style="color:var(--purple)">📊</span>'
          : `<input type="checkbox" ${status.dathu?'checked':''} onchange="toggleDaThu('denhan',DATA.qltd[${realIdx}],this)">`}</td>
        <td>${escapeHtml(r[12])}</td>
        <td>${escapeHtml(r[17])}</td>
        <td class="date">${dueLabel}${ngayVayLabel}</td>
        <td><strong>${khLink(r[0], r[1], r[14], undefined, r[2])}</strong>${phankyBadge}${pdBadge}</td>
        <td class="date copy-cell" onclick="copyCellValue(this,event)" title="Click để copy MÃ KH">${escapeHtml(fmtMaKH(r[0]))}</td>
        <td class="date">${escapeHtml(r[2])}</td>
        <td>${loaiVayChip(r[13])}</td>
        <td class="money big">${fmtMoney(r[11])}</td>
        <td class="money" style="color:var(--blue);font-weight:600">${soTienTra}</td>
        <td>${r._phanky
          ? '<span style="color:var(--gray-400);font-style:italic;font-size:11px">Phân kỳ</span>'
          : `<select class="denhan-tt" onchange="setDenhanTrangThai(DATA.qltd[${realIdx}],this)"
          style="width:100%;border:1.5px solid ${status.dathu?'var(--red)':'var(--gray-300)'};padding:5px 7px;border-radius:6px;font-size:11px;font-family:inherit;outline:none;cursor:pointer;background:${status.dathu?'#fde8e6':'#fff'};font-weight:${status.dathu?'700':'500'};color:${status.dathu?'var(--red)':'var(--gray-700)'}">
          <option value="chua" ${!status.dathu?'selected':''}>⏳ Chưa thu</option>
          <option value="dathu" ${status.dathu?'selected':''}>✅ Đã thu</option>
        </select>`}</td>
      </tr>`;
    }

    if (key === 'laidong') {
      // Highlight ngày đã thu lãi đến bằng màu tuỳ mức độ đọng lâu
      const lastIntDate = parseVNDate(r[23]);
      let dateHtml = escapeHtml(r[23] || '(chưa có)');
      if (lastIntDate) {
        const daysAgo = daysDiff(lastIntDate, today);
        let cls = 'color:var(--blue)';
        if (daysAgo > 60) cls = 'color:var(--red);font-weight:700';
        else if (daysAgo > 30) cls = 'color:var(--orange);font-weight:700';
        dateHtml = `<span style="${cls}" title="Đã đọng ${daysAgo} ngày">${escapeHtml(r[23])}</span><br><small style="color:var(--gray-500);font-weight:500">đọng ${daysAgo} ngày</small>`;
      } else {
        dateHtml = `<span style="color:var(--gray-500);font-style:italic">(chưa có dữ liệu)</span>`;
      }
      return `<tr class="${rowCls}">
        <td style="text-align:center"><input type="checkbox" data-row="${realIdx}" onchange="onSelectionChange('laidong')"></td>
        <td class="date">${dateHtml}</td>
        <td><strong>${status.dathu ? '✅ ' : ''}${khLink(r[0], r[1], r[14], '<span style="' + (status.dathu ? 'text-decoration:line-through' : '') + '">' + escapeHtml(r[1]) + '</span>', r[2])}</strong></td>
        <td class="date copy-cell" onclick="copyCellValue(this,event)" title="Click để copy MÃ KH">${escapeHtml(fmtMaKH(r[0]))}</td>
        <td class="date">${escapeHtml(r[2])}</td>
        <td>${loaiVayChip(r[13])}</td>
        <td class="money big">${fmtMoney(r[10])}</td>
        <td class="money">${fmtMoney(r[11])}</td>
        <td>${escapeHtml(r[12])}</td>
        <td><select onchange="setLaidongTrangThai(DATA.qltd[${realIdx}],this)" style="width:100%;border:1.5px solid ${status.dathu ? 'var(--red)' : 'var(--gray-300)'};padding:5px 8px;border-radius:6px;font-size:11px;font-family:inherit;outline:none;cursor:pointer;background:${status.dathu ? '#fde8e6' : '#fff'};font-weight:${status.dathu ? '700' : '500'};color:${status.dathu ? 'var(--red)' : 'var(--gray-700)'}">
          <option value="chua" ${!status.dathu ? 'selected' : ''}>⏳ Chưa thu</option>
          <option value="dathu" ${status.dathu ? 'selected' : ''}>✅ Đã thu</option>
        </select></td>
      </tr>`;
    }

    if (key === 'chlm') {
      // NOTE: chlm rows are pre-grouped by Mã KH (see grouping logic below)
      // This branch is intentionally left empty — rendering handled separately
      return '';
    }

    // qltd / kd / td — column order per Lệnh thực thi item 5
    // Numeric columns (HMTD=5, SốTiềnGN=9, DưNợ=11, TiềnLãi=10) are inline-editable
    const apprMatDate = parseVNDate(r[24]);
    let apprMatLabel = r[24] ? escapeHtml(r[24]) : '<span style="color:var(--gray-400);font-style:italic">—</span>';
    if (apprMatDate) {
      const diff24 = daysDiff(today, apprMatDate);
      if (diff24 < 0)        apprMatLabel = `<strong style="color:var(--orange)" title="HĐ HMTD đã hết hiệu lực — cần ký HĐ HMTD mới. KHÔNG phải lãi phạt; các khế ước giải ngân con vẫn áp lãi suất gốc.">${escapeHtml(r[24])}</strong><br><small style="color:var(--orange)">HĐ HMTD hết hạn ${-diff24} ngày</small>`;
      else if (diff24 <= 7)  apprMatLabel = `<strong style="color:var(--orange)">${escapeHtml(r[24])}</strong><br><small style="color:var(--orange)">còn ${diff24} ngày</small>`;
      else if (diff24 <= 30) apprMatLabel = `<span style="color:var(--blue)">${escapeHtml(r[24])}</span><br><small style="color:var(--gray-500)">còn ${diff24} ngày</small>`;
    }
    return `<tr class="${rowCls}">
      <td class="td-chk">
        <input type="checkbox" data-row="${realIdx}" onchange="onSelectionChange('${key}')" style="margin-right:2px">
        <button onclick="editRow(${realIdx})" style="background:none;border:none;cursor:pointer;font-size:13px;padding:1px 3px" title="Sửa">✏️</button>
        <button onclick="deleteRow(${realIdx})" style="background:none;border:none;cursor:pointer;font-size:13px;padding:1px 3px;color:var(--red)" title="Xóa">🗑️</button>
      </td>
      <td>${escapeHtml(r[12])}</td>
      <td>${escapeHtml(r[17])}</td>
      <td class="date" title="Số hồ sơ: ${escapeHtml(r[19]||'')}${r[22]?(' · Số tập: '+escapeHtml(r[22])):''}">${escapeHtml(r[19] || '')}${r[22] ? ` <span style="display:inline-block;margin-left:4px;padding:1px 6px;background:#fef3c7;color:#92400e;border-radius:8px;font-size:10px;font-weight:700" title="Số tập">T${escapeHtml(r[22])}</span>` : ''}</td>
      <td><strong>${khLink(r[0], r[1], r[14], undefined, r[2])}</strong></td>
      <td class="date copy-cell" onclick="copyCellValue(this,event)" title="Click để copy MÃ KH">${escapeHtml(fmtMaKH(r[0]))}</td>
      <td class="date copy-cell" onclick="copyCellValue(this,event)" title="Click để copy SỐ TK">${escapeHtml(r[21] || '')}</td>
      <td class="date">${escapeHtml(r[2])}</td>
      <td class="date">${escapeHtml(r[3])}</td>
      <td class="date" style="min-width:100px">${apprMatLabel}</td>
      <td class="money editable-num" contenteditable="true" spellcheck="false" data-idx="${realIdx}" data-col="5" onblur="saveEditableNum(this)" onkeydown="editableNumKey(event,this)" onfocus="editableNumFocus(this)" title="Click để sửa HMTD/Số tiền vay">${fmtMoney(r[5])}</td>
      <td class="money editable-num" contenteditable="true" spellcheck="false" data-idx="${realIdx}" data-col="9" onblur="saveEditableNum(this)" onkeydown="editableNumKey(event,this)" onfocus="editableNumFocus(this)" title="Click để sửa Số tiền GN">${fmtMoney(r[9])}</td>
      <td class="money big editable-num" contenteditable="true" spellcheck="false" data-idx="${realIdx}" data-col="11" onblur="saveEditableNum(this)" onkeydown="editableNumKey(event,this)" onfocus="editableNumFocus(this)" title="Click để sửa Dư nợ">${fmtMoney(r[11])}</td>
      <td class="date">${escapeHtml(r[6])}</td>
      <td class="date">${escapeHtml(r[7])}</td>
      <td class="date">${escapeHtml(r[20])}</td>
      <td class="rate">${ (function(){ if(window.HSVRate){ var _n=window.HSVRate.normalize(r[8]); if(_n!=='' && _n!==r[8]){ r[8]=_n; } return window.HSVRate.format(r[8], r); } return (typeof r[8]==='number' && isFinite(r[8]) ? r[8].toFixed(1)+'%' : '<span style="color:var(--red,#b91c1c)" title="L/S chưa sẵn sàng — bấm Nhập IPCAS">—</span>'); })() }</td>
      <td>${escapeHtml(r[15])}</td>
      <td title="${escapeHtml(r[14])}">${escapeHtml(r[14])}</td>
      <td style="text-align:center"><span class="chip ${nhomnoCls}">${escapeHtml(r[18] || '')}</span></td>
    </tr>`;
  });
  /* P08 (HM-17b): chế độ "Tất cả" với >600 dòng ⇒ dựng 400 dòng đầu ngay, phần còn lại thêm dần theo đợt (layout bảng lớn ~2,5 ms/dòng, đo P08) */
  const __defer = !!(__pg && __pg.size === 0 && __parts.length > 600 && !window.__TD_NODEFER); // P10: xuất Excel cần đủ dòng ngay
  const html = __defer ? __parts.slice(0, 400).join('') : __parts.join('');

  let infoHtml = '';
  /* HM-17b: thanh trang — luôn hiện số dòng thật của tập đã lọc */
  let __moreHtml = '';
  if (__isPg && __total > window.__TD_PG_SIZES[0]) {
    __moreHtml = window.__TDPgBarHtml(key, __pg, __total, __sliced ? visibleRows.length : 0, 21);
  }
  tbody.innerHTML = (infoHtml + html + __moreHtml) ||
    '<tr><td colspan="21" style="text-align:center;padding:20px;color:var(--gray-500)">Không có dữ liệu khớp bộ lọc</td></tr>';

  window.__TD_CHUNK = window.__TD_CHUNK || {};
  const __tok = window.__TD_CHUNK[key] = (window.__TD_CHUNK[key] || 0) + 1; // mỗi lần dựng lại hủy các đợt còn dở
  if (__defer) {
    const __bar = tbody.querySelector('tr.td-pg-bar'), __inf = __bar && __bar.querySelector('.td-pg-info'), __txt = __inf ? __inf.textContent : '';
    let __i = 400;
    const __step = () => {
      if (window.__TD_CHUNK[key] !== __tok || !__bar || !__bar.isConnected) return;
      __bar.insertAdjacentHTML('beforebegin', __parts.slice(__i, __i + 400).join('')); __i += 400;
      if (__i < __parts.length) { if (__inf) __inf.textContent = __txt + ' · đang dựng ' + fmtNum(__i) + '/' + fmtNum(__parts.length) + '…'; setTimeout(__step, 0); }
      else if (__inf) __inf.textContent = __txt;
    };
    if (__inf) __inf.textContent = __txt + ' · đang dựng 400/' + fmtNum(__parts.length) + '…';
    setTimeout(__step, 30);
  }

  const cnt = $('count-' + key);
  if (cnt) cnt.textContent = fmtNum(rows.length);

  // Reset header checkbox khi render lại bảng
  const allChk = $('chk-all-' + key);
  if (allChk) { allChk.checked = false; allChk.indeterminate = false; }
  // Ẩn bulk bar nếu không có gì được chọn nữa
  if (_bulkActiveKey === key) {
    const bar = $('bulk-bar');
    if (bar) bar.classList.remove('show');
  }

  renderTfoot(key, rows);
  if (['qltd','kd','td'].includes(key)) renderStatChips(key, rows);
  if (key === 'denhan') updateDenhanSummary(rows);
  if (key === 'laidong') updateLaidongSummary(rows);
  if (key === 'chlm') {
    const countEl = $('count-chlm');
    if (countEl) countEl.textContent = fmtNum(rows.length);
  }
  setTimeout(updateTableTopScrollbars, 0);
  // ✅ Rebuild column filters after each render
  setTimeout(() => { buildColumnFilters('table-' + key); }, 0);
}


/* ═══════════════════════════════════════════════════════════════
   STAT CHIPS — Dư nợ & Số KH thực tế trên toolbar
   ═══════════════════════════════════════════════════════════════ */
/**
 * Đếm số KH thực tế:
 *  - Gom theo Mã KH (r[0])
 *  - Chỉ tính mã có tổng dư nợ (r[11]) > 0
 *  - key='td': loại mã KH đã có trong tập Ngắn hạn
 */
function calcRealKH(rows, key) {
  const kdSet = (key === 'td')
    ? new Set(DATA.qltd.filter(r => isNganHan(r[13])).map(r => String(r[0]||'').trim()).filter(Boolean))
    : null;
  const map = new Map();
  for (const r of rows) {
    const ma = String(r[0]||'').trim();
    if (!ma) continue;
    map.set(ma, (map.get(ma)||0) + (Number(r[11])||0));
  }
  let n = 0;
  for (const [ma, dn] of map) {
    if (dn <= 0) continue;
    if (kdSet && kdSet.has(ma)) continue;
    n++;
  }
  return n;
}

function fmtChipMoney(v) {
  const n = Number(v)||0;
  if (!n) return '0 đ';
  return n.toLocaleString('vi-VN') + ' đ';
}

function renderStatChips(key, rows) {
  const el = document.getElementById('sc-' + key);
  if (!el) return;
  // ── Không cộng gộp dư nợ — hiển thị từng dòng đúng file nguồn ──
  // Chỉ hiện số hồ sơ và số KH (đếm unique mã KH có dư nợ > 0)
  const hsCount = rows.length;
  const khSet = new Set(rows.filter(r => Number(r[11]) > 0 && r[0]).map(r => String(r[0]).trim()));
  const totalDN = rows.reduce((s, r) => s + (Number(r[11]) || 0), 0);
  const nXauHs = rows.filter(r => ['Nhóm 3','Nhóm 4','Nhóm 5'].includes(r[18]) && Number(r[11]) > 0).length;
  const chip = (lbl, val, cls='') =>
    `<span class="stat-chip ${cls}" title="${lbl}: ${val}">` +
    `<span class="sc-lbl">${lbl}</span><span class="sc-val">${val}</span></span>`;

  el.innerHTML = chip('SỐ GNN', fmtNum(hsCount) + ' HS', 'sc-dn')
               + chip('SỐ KH', khSet.size + ' KH', 'sc-kh')
               + chip('DƯ NỢ', fmtChipMoney(totalDN), 'sc-dn')
               + (nXauHs > 0 ? chip('HS nợ xấu', fmtNum(nXauHs) + ' HS', 'sc-xau') : '');
}

/* ═══════════════════════════════════════════════════════════════
   TABLE FOOTER (Totals)
   ═══════════════════════════════════════════════════════════════ */
function renderTfoot(key, rows) {
  const tfoot = $('tfoot-' + key);
  if (!tfoot) return;
  const sum = col => rows.reduce((s, r) => s + (Number(r[col]) || 0), 0);

  if (['qltd','kd','td'].includes(key)) {
    // ── Bỏ cộng gộp dư nợ — chỉ đếm số hồ sơ, hiển thị đúng file nguồn ──
    // Mỗi dòng = 1 hợp đồng riêng biệt, không cộng gộp để tránh nhầm lẫn số liệu
    const khSet = new Set(rows.filter(r => r[0]).map(r => String(r[0]).trim()));
    tfoot.innerHTML = `<tr>
      <td colspan="21" style="text-align:center;font-size:11px;letter-spacing:.3px">
        📋 Tổng <strong style="color:var(--gold-light)">${fmtNum(rows.length)} hồ sơ</strong>
        · <strong style="color:#93c5fd">${fmtNum(khSet.size)} khách hàng</strong>
        · Dư nợ <strong style="color:var(--gold-light)">${fmtMoney(sum(11))}</strong> <span style="color:rgba(255,255,255,.6);font-style:italic">(theo bộ lọc đang áp dụng)</span>
      </td>
    </tr>`;
  } else if (key === 'denhan') {
    const sumAmt = rows.reduce((s,r) => s + (getDenhanAmt(r)||0), 0);
    tfoot.innerHTML = `<tr>
      <td colspan="8" style="text-align:right">TỔNG DƯ NỢ ĐẾN HẠN (${fmtNum(rows.length)} khoản)</td>
      <td class="money" style="color:var(--gold-light)">${fmtMoney(sum(11))}</td>
      <td class="money" style="color:var(--blue);font-weight:700">${sumAmt ? fmtMoney(sumAmt) : '—'}</td>
      <td></td>
    </tr>`;
  } else if (key === 'laidong') {
    tfoot.innerHTML = `<tr>
      <td colspan="6" style="text-align:right">TỔNG LÃI PHẢI THU (${fmtNum(rows.length)} khoản)</td>
      <td class="money" style="color:var(--gold-light)">${fmtMoney(sum(10))}</td>
      <td class="money">${fmtMoney(sum(11))}</td>
      <td colspan="2"></td>
    </tr>`;
  } else if (key === 'chlm') {
    const doneCount    = rows.filter(r => (DATA.chlmStatus[chlmKey(r)]||{}).dachuyen).length;
    const pendingCount = rows.length - doneCount;
    tfoot.innerHTML = `<tr>
      <td colspan="8" style="text-align:right">TỔNG HMTD ĐẾN HẠN (${fmtNum(rows.length)} HĐ)</td>
      <td class="money" style="color:var(--gold-light)">${fmtMoney(sum(5))}</td>
      <td></td>
      <td class="money">${fmtMoney(sum(11))}</td>
      <td style="font-size:11px;text-align:center">
        <span style="color:var(--green-dark);font-weight:700">✅ ${doneCount}</span>
        <span style="color:var(--gray-400);margin:0 4px">/</span>
        <span style="color:var(--orange);font-weight:700">⏳ ${pendingCount}</span>
      </td>
    </tr>`;
    // Update summary chips
    const pEl = $('chlm-stat-pending'), dEl = $('chlm-stat-done');
    if (pEl) { pEl.textContent = `⏳ Chưa chuyển: ${pendingCount}`; pEl.style.display = pendingCount ? '' : 'none'; }
    if (dEl) { dEl.textContent = `✅ Đã chuyển: ${doneCount}`;      dEl.style.display = doneCount    ? '' : 'none'; }
  }
}

/* ═══════════════════════════════════════════════════════════════
   SUMMARY BARS
   ═══════════════════════════════════════════════════════════════ */
function updateDenhanSummary(rows) {
  return; // ITEM 7: bỏ theo dõi tóm tắt (lệnh thực thi)
  const today = todayMidnight();
  const sum = (arr, col) => arr.reduce((s,r) => s + (Number(r[col])||0), 0);
  const overdue = rows.filter(r => {
    const d = parseVNDate(r[7]);
    const s = DATA.denhanStatus[denhanKey(r)] || {};
    return d && d < today && !s.dathu;
  });
  const dathu = rows.filter(r => (DATA.denhanStatus[denhanKey(r)]||{}).dathu);
  const chua = rows.filter(r => {
    const s = DATA.denhanStatus[denhanKey(r)]||{};
    const d = parseVNDate(r[7]);
    return !s.dathu && (!d || d >= today);
  });
  $('denhan-summary').innerHTML = `
    <div class="summary-chip"><div class="lbl">Tổng khoản</div><div class="val">${fmtNum(rows.length)}</div></div>
    <div class="summary-chip gold"><div class="lbl">Tổng dư nợ</div><div class="val">${fmtMoneyShort(sum(rows,11))}</div></div>
    <div class="summary-chip red"><div class="lbl">⚠ Quá hạn</div><div class="val">${fmtNum(overdue.length)} · ${fmtMoneyShort(sum(overdue,11))}</div></div>
    <div class="summary-chip blue"><div class="lbl">⏳ Chưa thu</div><div class="val">${fmtNum(chua.length)} · ${fmtMoneyShort(sum(chua,11))}</div></div>
    <div class="summary-chip"><div class="lbl">✅ Đã thu</div><div class="val">${fmtNum(dathu.length)} · ${fmtMoneyShort(sum(dathu,11))}</div></div>
  `;
}
function updateLaidongSummary(rows) {
  return; // ITEM 7: bỏ theo dõi tóm tắt (lệnh thực thi)
  const sum = (arr, col) => arr.reduce((s,r) => s + (Number(r[col])||0), 0);
  const dathu = rows.filter(r => (DATA.laidongStatus[laidongKey(r)]||{}).dathu);
  const chua = rows.filter(r => !(DATA.laidongStatus[laidongKey(r)]||{}).dathu);
  $('laidong-summary').innerHTML = `
    <div class="summary-chip"><div class="lbl">Tổng khoản</div><div class="val">${fmtNum(rows.length)}</div></div>
    <div class="summary-chip gold"><div class="lbl">Tổng lãi phải thu</div><div class="val">${fmtMoneyShort(sum(rows,10))}</div></div>
    <div class="summary-chip red"><div class="lbl">⏳ Chưa thu</div><div class="val">${fmtNum(chua.length)} · ${fmtMoneyShort(sum(chua,10))}</div></div>
    <div class="summary-chip"><div class="lbl">✅ Đã thu</div><div class="val">${fmtNum(dathu.length)} · ${fmtMoneyShort(sum(dathu,10))}</div></div>
  `;
}

/* ═══════════════════════════════════════════════════════════════
   PHIDV – Disbursement fees
   ═══════════════════════════════════════════════════════════════ */
function calcPhi(amount) {
  if (!amount) return { rate: 0, phi: 0, label: '-' };
  if (amount < 500000000) return { rate: 0.00033, phi: Math.round(amount * 0.00033), label: '0.033%' };
  return { rate: 0.00055, phi: Math.round(amount * 0.00055), label: '0.055%' };
}

/* ═══ PRO-31: PHÍ GIẢI NGÂN — HELPER FUNCTIONS ═══════════════════════════ */

// PRO-45: Set filter mặc định cho Phí GN
// - CBTD = CBTD A
// - "Từ ngày GN" = KHÔNG GIỚI HẠN (hiển thị tất cả lịch sử)
// - "Đến ngày GN" = NGÀY HIỆN TẠI (hôm nay) — đồng bộ với K_hien_thi_phi_GN_
// - Filter logic: NGÀY GN <= toDate (hiển thị từ hôm nay TRỞ VỀ TRƯỚC, không bỏ sót GN cũ chưa báo phí)
function phidvSetDefaultFilter() {
  const fmt = d => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;

  // Bước 1: Đặt CBTD mặc định
  const cbEl = $('filter-phidv-cbtd');
  // Theo dõi TẤT CẢ CBTD (không lọc mặc định theo 1 cán bộ)
  if (cbEl) cbEl.value = '';

  // Bước 2: Render lưới tháng trong dropdown (giữ dropdown đầy đủ tháng để user tự chọn)
  phidvRenderMonthGrid();

  // ✅ PRO-45 FIX: Không giới hạn ngày bắt đầu — hiển thị TẤT CẢ GN lịch sử đến hôm nay
  // Tránh bỏ sót GN của tháng trước chưa kịp báo phí (lỗi đồng bộ khi dùng from=01/tháng)
  const fromEl = $('phidv-from');
  const toEl   = $('phidv-to');
  if (fromEl) fromEl.value = '';           // ✅ Không giới hạn từ ngày (bắt đầu từ mãi trước)
  if (toEl)   toEl.value   = fmt(new Date()); // ✅ Đến ngày = hôm nay (hiển thị trở về trước)

  // Reset UI month picker → "Chọn tháng" (không auto-select tháng khi mở mặc định)
  const lbl = $('phidv-mth-label');
  if (lbl) lbl.textContent = 'Chọn tháng';
  const trigger = $('phidv-mth-trigger');
  if (trigger) {
    trigger.className = 'btn btn-outline btn-sm';
    trigger.style.minWidth = '100px';
    trigger.style.fontWeight = '700';
  }
  document.querySelectorAll('.phidv-mth-btn').forEach(btn => btn.classList.remove('active'));
}

// Render lưới tháng trong dropdown — quét tháng có GN + tháng hiện tại
function phidvRenderMonthGrid() {
  const grid = $('phidv-mth-grid');
  if (!grid) return;
  const today = new Date();
  const curY = today.getFullYear(), curM = today.getMonth();

  // ✅ KEY SYNC FIX: Chỉ quét các dòng có dư nợ > 0 (đồng bộ với filter trong getFilteredData)
  // tránh tháng "ma" xuất hiện trong grid khi click vào lại không có dữ liệu
  const allRows = [
    ...(DATA.qltd || []).filter(r => Number(r[11]) > 0),
    ...((DATA.phidvExtra || []).map(e => e._row))
  ];
  const monthSet = new Set();
  for (const r of allRows) {
    if (!r[6]) continue;
    const d = parseVNDate(r[6]);
    if (d) monthSet.add(`${d.getFullYear()}-${d.getMonth()}`);
  }
  // Luôn thêm tháng hiện tại kể cả chưa có GN
  monthSet.add(`${curY}-${curM}`);

  // Sắp xếp mới → cũ
  const months = [...monthSet]
    .map(k => { const [y,m] = k.split('-').map(Number); return {y,m}; })
    .sort((a,b) => b.y - a.y || b.m - a.m);

  grid.innerHTML = months.map(({y,m}) => {
    const label = `T${m+1}/${String(y).slice(2)}`;
    return `<button class="phidv-mth-btn" data-y="${y}" data-m="${m}"
      onclick="phidvApplyMonth(${y},${m})" title="Tháng ${m+1}/${y}">${label}</button>`;
  }).join('');
}

// Áp dụng filter tháng: cập nhật from/to, label nút, highlight
function phidvApplyMonth(y, m) {
  const fmt = d => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  const fromEl = $('phidv-from'), toEl = $('phidv-to');
  if (fromEl) fromEl.value = fmt(new Date(y, m, 1));
  if (toEl)   toEl.value   = fmt(new Date(y, m+1, 0));

  // Cập nhật label nút trigger
  const lbl = $('phidv-mth-label');
  if (lbl) lbl.textContent = `T${m+1}/${y}`;

  // Highlight trong grid
  document.querySelectorAll('.phidv-mth-btn').forEach(btn => {
    const active = +btn.dataset.y === y && +btn.dataset.m === m;
    btn.classList.toggle('active', active);
  });

  // Đổi màu nút trigger → xanh khi đã chọn
  const trigger = $('phidv-mth-trigger');
  if (trigger) {
    trigger.className = 'btn btn-green btn-sm';
    trigger.style.minWidth = '100px';
    trigger.style.fontWeight = '700';
  }

  // Đóng dropdown
  const picker = $('phidv-month-picker');
  if (picker) picker.classList.remove('open');

  filterTable('phidv');
}

// Toggle mở/đóng dropdown
function phidvToggleMonthPicker(e) {
  e.stopPropagation();
  const picker = $('phidv-month-picker');
  if (!picker) return;
  const isOpen = picker.classList.contains('open');
  // Đóng các dropdown khác (nếu có)
  document.querySelectorAll('.phidv-month-picker.open').forEach(el => el.classList.remove('open'));
  if (!isOpen) picker.classList.add('open');
}

// Đóng dropdown khi click ra ngoài
document.addEventListener('click', function(e) {
  if (!e.target.closest('.phidv-month-picker')) {
    document.querySelectorAll('.phidv-month-picker.open').forEach(el => el.classList.remove('open'));
  }
});

// Bỏ toàn bộ filter → xem tất cả lần giải ngân (không giới hạn ngày — đồng bộ K_)
function phidvResetFilter() {
  const cbEl = $('filter-phidv-cbtd'), fromEl = $('phidv-from'), toEl = $('phidv-to'), srEl = $('search-phidv');
  if (cbEl)   cbEl.value   = '';
  if (fromEl) fromEl.value = '';  // ✅ Xóa giới hạn ngày bắt đầu
  if (toEl)   toEl.value   = '';  // ✅ Xóa giới hạn ngày kết thúc
  if (srEl)   srEl.value   = '';
  // Reset label + màu nút trigger về trạng thái ban đầu
  const lbl = $('phidv-mth-label');
  if (lbl) lbl.textContent = 'Chọn tháng';
  const trigger = $('phidv-mth-trigger');
  if (trigger) {
    trigger.className = 'btn btn-outline btn-sm';
    trigger.style.minWidth = '100px';
    trigger.style.fontWeight = '700';
  }
  document.querySelectorAll('.phidv-mth-btn').forEach(btn => btn.classList.remove('active'));
  renderTable('phidv');
  showToast('↺ Đã bỏ lọc — hiển thị tất cả lần giải ngân', 'green');
}

/* ═══════════════════════════════════════════════════════════════
   TRANG: KHÁCH HÀNG MỚI
   — Cột "Số món GN"/"Tổng tiền GN": TẤT CẢ dòng giải ngân (giống nguồn
     dữ liệu trang GIẢI NGÂN — DATA.qltd dư nợ>0 + phidvExtra), lọc theo
     Ngày GN (r[6]) trong kỳ Từ–Đến.
   — "KH vay mới" (PATCH v13.11 — FIX GỐC lệch số KH mới ≠ tiền vay mới):
     CHỈ tính khách hàng có ít nhất 1 dòng GIẢI NGÂN THỰC SỰ trong kỳ
     đang xem (tức nằm trong allGN — đã lọc dư nợ>0 + Ngày GN trong kỳ)
     VÀ Mã KH (r[0]) không có trong snapshot của mốc so sánh đã chọn.
     ⚠ KHÔNG còn quét toàn bộ DATA.qltd hiện tại như bản cũ (bản cũ gây
     lỗi: KH bị đếm "mới" dù GN nằm ngoài kỳ hoặc khoản đã tất toán →
     "Số KH vay mới">0 nhưng "Số tiền vay mới"=0).
     • Tiền vay mới: cộng theo ĐÚNG CBTD của từng dòng GN thực tế (r[12])
       — nếu 1 KH có nhiều lần GN trong kỳ dưới nhiều CBTD khác nhau
       (đổi người quản lý giữa kỳ) thì tiền được tách đúng theo từng CBTD.
     • Đếm "1 KH mới": mỗi Mã KH chỉ được ghi nhận 1 lần, gán cho CBTD của
       dòng có Ngày GN sớm hơn (Số HĐTD cũ hơn) trong nhóm các dòng GN
       của KH đó trong kỳ — theo đúng quy ước nghiệp vụ đã thống nhất.
   — "Vay cầm cố": dòng QLTD có Mục đích (r[15]) chứa "mua sắm vật dụng
     sinh hoạt", Ngày GN trong kỳ. Có thể loại trừ thủ công từng dòng.
   Khóa duy nhất 1 dòng vay: Số HĐTD (r[2]) + '|' + Mã KH (r[0]).
   ═══════════════════════════════════════════════════════════════ */
let _khmoiActiveTab = 'sum';
let _khmoiMocList = [];

function khmoiRowKey(r) {
  return String((r && r[2]) || '') + '|' + String((r && r[0]) || '');
}

function khmoiEnsureExclude() {
  if (!DATA.khmoiExclude || typeof DATA.khmoiExclude !== 'object') DATA.khmoiExclude = { camco:{}, newcust:{} };
  if (!DATA.khmoiExclude.camco) DATA.khmoiExclude.camco = {};
  if (!DATA.khmoiExclude.newcust) DATA.khmoiExclude.newcust = {};
  return DATA.khmoiExclude;
}

// Danh sách mốc so sánh: mọi snapshot báo cáo đã lưu ở LƯU TRỮ FILE, mới nhất trước
function khmoiListSnapshots() {
  const list = (typeof _archiveReportList !== 'undefined' && Array.isArray(_archiveReportList))
    ? _archiveReportList : [];
  return list
    .filter(r => r && Array.isArray(r.reportData) && r.reportData.length)
    .slice()
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

function khmoiSetDefaultFilter() {
  const fromEl = $('khmoi-from'), toEl = $('khmoi-to');
  const fmt = d => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  const today = new Date();
  if (fromEl && !fromEl.value) fromEl.value = fmt(new Date(today.getFullYear(), today.getMonth(), 1));
  if (toEl && !toEl.value)     toEl.value   = fmt(today);

  const sel = $('khmoi-moc');
  if (!sel) return;
  _khmoiMocList = khmoiListSnapshots();
  if (!_khmoiMocList.length) {
    sel.innerHTML = '<option value="">⚠ Chưa có snapshot nào — vào LƯU TRỮ FILE để lưu</option>';
    return;
  }
  const cur = sel.value;
  sel.innerHTML = _khmoiMocList.map((s, i) =>
    `<option value="${i}">${escapeHtml(s.name)} — ${escapeHtml(s.date)}</option>`
  ).join('');
  // Mặc định: mốc gần nhất trước ngày "Từ" của kỳ báo cáo, nếu không có thì lấy mốc mới nhất
  if (cur !== '' && +cur < _khmoiMocList.length) { sel.value = cur; return; }
  const fromD = fromEl ? parseVNDate(fromEl.value) : null;
  let defaultIdx = 0;
  if (fromD) {
    const idx = _khmoiMocList.findIndex(s => (s.timestamp || 0) < fromD.getTime());
    if (idx >= 0) defaultIdx = idx;
  }
  sel.value = String(defaultIdx);
}

function khmoiInit(force) {
  khmoiEnsureExclude();
  if (force) { $('khmoi-from').value = ''; $('khmoi-to').value = ''; }
  khmoiSetDefaultFilter();
  khmoiRender();
}
window.khmoiInit = khmoiInit;

function khmoiSwitchTab(tab) {
  _khmoiActiveTab = tab;
  document.querySelectorAll('#khmoi-tab-nav .khmoi-tab').forEach(b =>
    b.classList.toggle('active', b.getAttribute('data-tab') === tab));
  $('khmoi-pn-sum').style.display    = tab === 'sum'    ? '' : 'none';
  $('khmoi-pn-detail').style.display = tab === 'detail' ? '' : 'none';
  khmoiRender();
}
window.khmoiSwitchTab = khmoiSwitchTab;

// Gom toàn bộ dữ liệu cần cho cả 2 tab, theo kỳ + mốc đang chọn
function khmoiComputeAll() {
  khmoiEnsureExclude();
  const fromD0 = parseVNDate($('khmoi-from')?.value);
  let toD0 = parseVNDate($('khmoi-to')?.value);
  if (toD0) toD0 = new Date(toD0.getFullYear(), toD0.getMonth(), toD0.getDate(), 23, 59, 59);
  const inRange = r => {
    const d = parseVNDate(r[6]);
    if (!d) return false;
    if (fromD0 && d < fromD0) return false;
    if (toD0 && d > toD0) return false;
    return true;
  };

  // 1) Toàn bộ giải ngân trong kỳ (giống nguồn trang GIẢI NGÂN — tất cả dòng, không giới hạn báo phí)
  const allGN = [
    ...(DATA.qltd || []).filter(r => Number(r[11]) > 0),
    ...((DATA.phidvExtra || []).map(e => e._row)),
  ].filter(inRange);

  // 2) Khách hàng vay mới (PATCH v13.11 — fix gốc rễ):
  //    CHỈ những KH có GIẢI NGÂN THỰC SỰ trong kỳ (r ∈ allGN) và Mã KH
  //    không có trong snapshot mốc so sánh mới được tính là "mới".
  const mocSel = $('khmoi-moc');
  const mocIdx = mocSel ? +mocSel.value : NaN;
  const mocSnap = (!isNaN(mocIdx) && _khmoiMocList[mocIdx]) ? _khmoiMocList[mocIdx] : null;
  // ⚠ CHUẨN HÓA Mã KH (String + trim) ở CẢ 2 PHÍA trước khi so sánh — tránh lệch
  // kiểu dữ liệu (số vs chuỗi, khoảng trắng thừa từ IPCAS/Excel) khiến 1 khách bị
  // coi nhầm là "đã tồn tại" trong mốc cũ → bị loại sai khỏi "KH vay mới".
  const normMaKH = v => String(v == null ? '' : v).trim();
  const oldSet = new Set((mocSnap ? mocSnap.reportData : []).map(r => normMaKH(r[0])));

  // Tiền vay mới: LẤY ĐÚNG các dòng GN trong kỳ của KH mới — mỗi dòng giữ
  // nguyên CBTD thực tế của nó (r[12]), để tách đúng tiền nếu KH đổi CBTD giữa kỳ.
  const newCustGNRows = allGN.filter(r => normMaKH(r[0]) && !oldSet.has(normMaKH(r[0])));

  // Đếm "1 KH mới": gom theo Mã KH, mỗi KH chỉ ghi nhận 1 lần — gán cho CBTD
  // của dòng có Ngày GN sớm hơn (Số HĐTD cũ hơn) trong nhóm dòng GN của KH đó.
  const byKHNew = new Map();
  newCustGNRows.forEach(r => {
    const ma = normMaKH(r[0]);
    if (!byKHNew.has(ma)) byKHNew.set(ma, []);
    byKHNew.get(ma).push(r);
  });
  const newCustRows = [];
  byKHNew.forEach(rows => {
    const sorted = rows.slice().sort((a, b) => {
      const da = parseVNDate(a[6]), db = parseVNDate(b[6]);
      const ta = da ? da.getTime() : Infinity, tb = db ? db.getTime() : Infinity;
      if (ta !== tb) return ta - tb; // Ngày GN sớm hơn trước
      return String(a[2] || '').localeCompare(String(b[2] || ''), 'vi', { numeric: true }); // HĐTD cũ hơn trước
    });
    newCustRows.push(sorted[0]); // dòng đại diện — quyết định CBTD được ghi nhận "1 KH mới"
  });

  // 3) Vay cầm cố: Mục đích chứa "mua sắm vật dụng sinh hoạt", trong kỳ, có thể loại trừ thủ công
  const camcoAll = (DATA.qltd || [])
    .filter(r => /mua\s*s[aă]m\s*v[aậ]t\s*d[uụ]ng\s*sinh\s*ho[aạ]t/i.test(String(r[15] || '')))
    .filter(inRange);
  const camcoRows = camcoAll.filter(r => !DATA.khmoiExclude.camco[khmoiRowKey(r)]);

  return { allGN, newCustRows, newCustGNRows, camcoRows, camcoAll, mocSnap };
}

function khmoiGroupKey(r) {
  return (r[17] || 'Chưa rõ phòng ban') + '||' + (r[12] || 'Chưa rõ CBTD');
}

function khmoiRender() {
  if (!$('page-khmoi') || !$('page-khmoi').classList.contains('active')) {
    // Vẫn cho phép gọi từ khmoiInit trước khi trang active — không return sớm
  }
  khmoiSetDefaultFilter();
  if (_khmoiActiveTab === 'sum') khmoiRenderSummary();
  else khmoiRenderDetail();
}
window.khmoiRender = khmoiRender;

function khmoiRenderSummary() {
  const tbody = $('tbody-khmoi-sum');
  if (!tbody) return;
  const { allGN, newCustRows, newCustGNRows, camcoRows } = khmoiComputeAll();

  const groups = {}; // key -> { phongban, cbtd, gnCount, gnTien, khMoiCount, khMoiTien, camcoCount, camcoTien }
  const ensure = (r) => {
    const k = khmoiGroupKey(r);
    if (!groups[k]) groups[k] = { phongban: r[17] || 'Chưa rõ phòng ban', cbtd: r[12] || 'Chưa rõ CBTD',
      gnCount:0, gnTien:0, khMoiCount:0, khMoiTien:0, camcoCount:0, camcoTien:0 };
    return groups[k];
  };
  allGN.forEach(r => { const g = ensure(r); g.gnCount++; g.gnTien += Number(r[9]) || 0; });
  newCustRows.forEach(r => { const g = ensure(r); g.khMoiCount++; });
  newCustGNRows.forEach(r => { const g = ensure(r); g.khMoiTien += Number(r[9]) || 0; });
  camcoRows.forEach(r => { const g = ensure(r); g.camcoCount++; g.camcoTien += Number(r[9]) || 0; });

  // Nhóm theo phòng ban → sắp theo tổng tiền GN giảm dần trong từng phòng
  const byPhong = {};
  Object.values(groups).forEach(g => { (byPhong[g.phongban] = byPhong[g.phongban] || []).push(g); });
  const fmt = n => Math.round(n || 0).toLocaleString('vi-VN');

  let html = '';
  let grand = { gnCount:0, gnTien:0, khMoiCount:0, khMoiTien:0, camcoCount:0, camcoTien:0 };
  Object.keys(byPhong).sort().forEach(pb => {
    const rows = byPhong[pb].sort((a,b) => b.gnTien - a.gnTien);
    let sub = { gnCount:0, gnTien:0, khMoiCount:0, khMoiTien:0, camcoCount:0, camcoTien:0 };
    rows.forEach((g, i) => {
      sub.gnCount += g.gnCount; sub.gnTien += g.gnTien; sub.khMoiCount += g.khMoiCount;
      sub.khMoiTien += g.khMoiTien; sub.camcoCount += g.camcoCount; sub.camcoTien += g.camcoTien;
      html += `<tr>
        ${i===0 ? `<td rowspan="${rows.length+1}" style="font-weight:700;vertical-align:top">${escapeHtml(pb)}</td>` : ''}
        <td>${escapeHtml(g.cbtd)}</td>
        <td style="text-align:right">${g.gnCount}</td>
        <td style="text-align:right">${fmt(g.gnTien)}</td>
        <td style="text-align:right">${g.khMoiCount}</td>
        <td style="text-align:right">${fmt(g.khMoiTien)}</td>
        <td style="text-align:right">${g.camcoCount}</td>
        <td style="text-align:right">${fmt(g.camcoTien)}</td>
      </tr>`;
    });
    html += `<tr class="sec-title-row" style="font-weight:700;background:#f0f4f8">
      <td>Cộng — ${escapeHtml(pb)}</td>
      <td style="text-align:right">${sub.gnCount}</td>
      <td style="text-align:right">${fmt(sub.gnTien)}</td>
      <td style="text-align:right">${sub.khMoiCount}</td>
      <td style="text-align:right">${fmt(sub.khMoiTien)}</td>
      <td style="text-align:right">${sub.camcoCount}</td>
      <td style="text-align:right">${fmt(sub.camcoTien)}</td>
    </tr>`;
    Object.keys(grand).forEach(k => grand[k] += sub[k]);
  });
  html += `<tr style="font-weight:800;background:#1c3a60;color:#fff">
    <td colspan="2">TỔNG CỘNG TOÀN CHI NHÁNH</td>
    <td style="text-align:right">${grand.gnCount}</td>
    <td style="text-align:right">${fmt(grand.gnTien)}</td>
    <td style="text-align:right">${grand.khMoiCount}</td>
    <td style="text-align:right">${fmt(grand.khMoiTien)}</td>
    <td style="text-align:right">${grand.camcoCount}</td>
    <td style="text-align:right">${fmt(grand.camcoTien)}</td>
  </tr>`;
  tbody.innerHTML = html || '<tr><td colspan="8" style="text-align:center;color:var(--gray-500)">Không có dữ liệu trong kỳ đã chọn</td></tr>';
}

function khmoiRenderDetail() {
  const tbody = $('tbody-khmoi-detail');
  if (!tbody) return;
  const { newCustGNRows, camcoAll } = khmoiComputeAll();
  const filt = $('khmoi-detail-loai')?.value || '';

  let rows = [];
  if (filt !== 'camco') rows.push(...newCustGNRows.map(r => ({ r, loai: 'new' })));
  if (filt !== 'new')   rows.push(...camcoAll.map(r => ({ r, loai: 'camco' })));
  rows.sort((a,b) => (parseVNDate(b.r[6])||0) - (parseVNDate(a.r[6])||0));

  const fmt = n => Math.round(n || 0).toLocaleString('vi-VN');
  tbody.innerHTML = rows.map(({r, loai}) => {
    const key = khmoiRowKey(r);
    const excluded = loai === 'camco' && !!DATA.khmoiExclude.camco[key];
    const badge = loai === 'new'
      ? '<span style="background:var(--blue,#2b6cb0);color:#fff;font-size:9px;font-weight:700;padding:2px 7px;border-radius:10px;white-space:nowrap">KH mới</span>'
      : '<span style="background:var(--gold,#c8963e);color:#fff;font-size:9px;font-weight:700;padding:2px 7px;border-radius:10px;white-space:nowrap">Vay cầm cố</span>';
    return `<tr style="${excluded ? 'opacity:.45' : ''}">
      <td></td>
      <td>${badge}</td>
      <td>${escapeHtml(r[6] || '')}</td>
      <td>${escapeHtml(r[1] || '')}</td>
      <td>${escapeHtml(fmtMaKH ? fmtMaKH(r[0]) : (r[0]||''))}</td>
      <td style="text-align:right">${fmt(r[9])}</td>
      <td>${escapeHtml(r[12] || '')}</td>
      <td>${escapeHtml(r[17] || '')}</td>
      <td>${escapeHtml(r[15] || '')}</td>
      <td style="text-align:center">${loai === 'camco'
        ? `<input type="checkbox" ${excluded ? 'checked' : ''} title="Loại trừ khỏi phân loại Vay cầm cố" onchange="khmoiToggleExclude('${key.replace(/'/g,"\\'")}', this.checked)">`
        : ''}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="10" style="text-align:center;color:var(--gray-500)">Không có dòng nào</td></tr>';
  const countEl = $('count-khmoi-detail');
  if (countEl) countEl.textContent = rows.length;
}
window.khmoiRenderDetail = khmoiRenderDetail;

function khmoiToggleExclude(key, checked) {
  khmoiEnsureExclude();
  if (checked) DATA.khmoiExclude.camco[key] = true;
  else delete DATA.khmoiExclude.camco[key];
  hasUnsaved = true;
  try { if (typeof saveToLS === 'function') saveToLS(); } catch(e) {}
  khmoiRenderDetail();
  if (typeof showToast === 'function') showToast(checked ? '✔ Đã loại trừ khỏi Vay cầm cố' : '↺ Đã bỏ loại trừ', 'green');
}
window.khmoiToggleExclude = khmoiToggleExclude;

function khmoiExportExcel() {
  if (typeof exportTableExcel === 'function') {
    const id = _khmoiActiveTab === 'sum' ? 'khmoi-sum' : 'khmoi-detail';
    try { exportTableExcel(id, _khmoiActiveTab === 'sum' ? 'Khach hang moi - Tong hop' : 'Khach hang moi - Chi tiet'); return; } catch(e) {}
  }
  showToast('⚠ Không thể xuất Excel — thiếu hàm exportTableExcel', 'red');
}
window.khmoiExportExcel = khmoiExportExcel;

// Mở modal thêm phí thủ công
function openPhiGNAddModal() {
  $('pgn-ten').value = '';
  $('pgn-makh').value = '';
  $('pgn-sotien').value = '';
  $('pgn-mucphi').value = '';
  $('pgn-phi').value = '';
  $('pgn-note').value = '';
  // Ngày mặc định = hôm nay
  const today = new Date();
  $('pgn-ngaygn').value = `${String(today.getDate()).padStart(2,'0')}/${String(today.getMonth()+1).padStart(2,'0')}/${today.getFullYear()}`;
  // Đổ CBTD từ danh sách hiện có
  const cbEl = $('pgn-cbtd');
  if (cbEl) {
    const cbtdList = window.TD_SXCB.sortNames([...new Set(DATA.qltd.map(r => String(r[12]||'').trim()).filter(Boolean))]);
    cbEl.innerHTML = cbtdList.map(v => `<option value="${escapeHtml(v)}" ${v===DEFAULT_CBTD?'selected':''}>${escapeHtml(v)}</option>`).join('');
    if (!cbtdList.length) cbEl.innerHTML = `<option value="${DEFAULT_CBTD}">${DEFAULT_CBTD}</option>`;
  }
  openModal('modal-phign-add');
}

// Tính phí preview khi nhập số tiền
function pgnCalcPhi() {
  const amt = Number($('pgn-sotien')?.value) || 0;
  const phi = calcPhi(amt);
  if ($('pgn-mucphi')) $('pgn-mucphi').value = phi.label === '-' ? '' : phi.label;
  if ($('pgn-phi'))    $('pgn-phi').value    = phi.phi ? fmtMoney(phi.phi) + ' đ' : '';
}

// Lưu 1 dòng phí thủ công vào DATA.phidvExtra
function savePhiGNExtra() {
  const ten    = ($('pgn-ten')?.value||'').trim();
  const makh   = ($('pgn-makh')?.value||'').trim();
  const cbtd   = ($('pgn-cbtd')?.value||'').trim() || DEFAULT_CBTD;
  const ngaygn = ($('pgn-ngaygn')?.value||'').trim();
  const sotien = Number($('pgn-sotien')?.value) || 0;
  const note   = ($('pgn-note')?.value||'').trim();

  if (!ten)    { showToast('⚠️ Vui lòng nhập Tên Khách Hàng', 'red'); return; }
  if (!ngaygn) { showToast('⚠️ Vui lòng nhập Ngày Giải Ngân', 'red'); return; }
  if (!sotien) { showToast('⚠️ Vui lòng nhập Số Tiền GN', 'red'); return; }

  const id = 'pgn_' + Date.now();
  // ✅ PRO-39 FIX #5: Tạo row giả ĐẦY ĐỦ cùng cấu trúc r[] với DATA.qltd
  // r[0]=makh, r[1]=ten, r[2]=số HĐ, r[6]=ngàyGN, r[7]=ngàyDH, r[9]=số tiền GN,
  // r[11]=dư nợ, r[12]=cbtd, r[13]=loại vay, r[17]=phòng ban, r[99]=id ẩn
  const fakeRow = new Array(24).fill('');
  fakeRow[0]  = makh;
  fakeRow[1]  = ten;
  fakeRow[2]  = '';                       // Số HĐ (không có cho extra)
  fakeRow[6]  = ngaygn;                   // Ngày GN
  fakeRow[7]  = ngaygn;                   // Ngày ĐH (tạm = ngàyGN, user có thể sửa sau)
  fakeRow[9]  = sotien;                   // Số tiền GN
  fakeRow[11] = sotien;                   // Dư nợ (= số tiền GN tại thời điểm thêm)
  fakeRow[12] = cbtd;
  fakeRow[13] = 'Vay ngắn hạn (TK 211)';  // để isNganHan() nhận
  fakeRow[14] = note || '';               // Ghi chú vào cột 14 nếu có
  fakeRow[17] = 'PHÒNG KHÁCH HÀNG';       // Phòng ban mặc định
  fakeRow[99] = id;                       // ID ẩn để xóa

  DATA.phidvExtra = DATA.phidvExtra || [];
  DATA.phidvExtra.push({ id, ten, makh, cbtd, ngaygn, sotien, note, _row: fakeRow });
  markUnsaved();
  clearTimeout(autoSaveTimer);  // P1-2 FIX: clear trước force-save
  saveData(true);  // ✅ PRO-39 + P1-2 FIX
  closeModal('modal-phign-add');
  renderTable('phidv');
  showToast(`✅ Đã thêm: ${ten} — ${fmtMoney(sotien)} đ`, 'green');
}

// Xóa 1 dòng phí thủ công
function deletePhiGNExtra(id) {
  if (!confirm('Xóa dòng phí thủ công này?')) return;
  DATA.phidvExtra = (DATA.phidvExtra || []).filter(e => e.id !== id);
  markUnsaved();
  clearTimeout(autoSaveTimer);  // P1-2 FIX: clear trước force-save
  saveData(true);  // ✅ PRO-39 + P1-2 FIX
  renderTable('phidv');
  showToast('🗑️ Đã xóa dòng phí thủ công', 'gold');
}

function renderPhiDV() {
  const tbody = $('tbody-phidv'); if (!tbody) return;
  const rows = getFilteredData('phidv');

  // Tạo set id của phidvExtra để nhận biết hàng thủ công
  const extraIds = new Set((DATA.phidvExtra || []).map(e => e.id));

  // ✅ PRO-45 SYNC: Sắp xếp NGÀY GN giảm dần (mới nhất lên đầu — đồng bộ K_hien_thi_phi_GN_)
  rows.sort((a, b) => {
    const da = parseVNDate(a[6]), db = parseVNDate(b[6]);
    if (!da && !db) return 0; if (!da) return 1; if (!db) return -1;
    return db - da;  // DESC: mới nhất trước
  });

  // ⚠️ FIX-40: Dùng r[9] (dsbsamt) nếu > 0, fallback sang r[11] (dư nợ) khi r[9]=0
  //   vì dsbsamt không phải cột bắt buộc IPCAS, có thể = 0 khi file thiếu cột này.
  const getAmt = r => Number(r[9]) > 0 ? Number(r[9]) : (Number(r[11]) || 0);
  const totalAmt = rows.reduce((s,r) => s + getAmt(r), 0);
  /* P09: phân trang theo trang (trước đây dựng cả ~3.850 dòng = 69.000 nút DOM, layout ~7 s); tổng/"Đã báo phí" vẫn tính trên toàn bộ tập đã lọc */
  const __pg = window.__TDPgState('phidv', rows.length);
  const __start = __pg.size > 0 ? (__pg.page - 1) * __pg.size : 0;
  const visibleRows = __pg.size > 0 ? rows.slice(__start, __start + __pg.size) : rows;

  // ── Tính summary "Đã báo phí" ──
  let daBaoCount = 0, daBaoTotalPhi = 0;
  rows.forEach(r => {
    const st = phidvGetSt(phidvGetRowKey(r));
    if (st.status === 'da_bao') { daBaoCount++; daBaoTotalPhi += phidvCalcPhi(getAmt(r), st.mucphi).phi; }
  });

  const html = visibleRows.map((r,i0) => {
    const i = __start + i0;
    const amt    = getAmt(r);
    const rowId  = r[99] || '';
    const isExtra = rowId && extraIds.has(rowId);
    const key    = phidvGetRowKey(r);
    const st     = phidvGetSt(key);

    // Mức phí: dùng custom nếu có, ngược lại dùng mặc định
    const phi    = phidvCalcPhi(amt, st.mucphi);
    const isDaBao = st.status === 'da_bao';

    const extraMark = isExtra
      ? `<span title="Thêm thủ công" style="font-size:9px;background:var(--orange);color:#fff;padding:1px 5px;border-radius:8px;margin-left:4px">TC</span>`
      : '';

    // ── Cột GHI CHÚ ──
    let ghichuCell;
    if (isDaBao) {
      ghichuCell = `<td class="phidv-da-bao-cell">
        <select class="phidv-status-sel da-bao" onchange="phidvChangeStatus('${key}',this)">
          <option value="chua_bao">Chưa báo phí</option>
          <option value="da_bao" selected>Đã báo phí</option>
        </select>
        <span class="da-bao-phi">${fmtMoney(phi.phi)} đ</span>
        ${isExtra ? `<button onclick="deletePhiGNExtra('${rowId}')" style="background:none;border:none;cursor:pointer;color:var(--red);font-size:11px;margin-top:2px;display:block;margin-left:auto;margin-right:auto" title="Xóa">🗑️</button>` : ''}
      </td>`;
    } else {
      ghichuCell = `<td style="text-align:center">
        <select class="phidv-status-sel" onchange="phidvChangeStatus('${key}',this)">
          <option value="chua_bao" selected>Chưa báo phí</option>
          <option value="da_bao">Đã báo phí</option>
        </select>
        ${isExtra ? `<button onclick="deletePhiGNExtra('${rowId}')" style="background:none;border:none;cursor:pointer;color:var(--red);font-size:12px;margin-top:3px;display:block;margin-left:auto;margin-right:auto" title="Xóa dòng thủ công">🗑️</button>` : ''}
      </td>`;
    }

    const trClass = isDaBao ? 'phidv-da-bao' : (isExtra ? '' : '');
    const trStyle = isExtra && !isDaBao ? 'background:var(--orange-pale)' : '';

    return `<tr class="${trClass}" style="${trStyle}" data-phidv-key="${key}">
      <td class="td-chk"><input type="checkbox" class="phidv-row-chk" ${st.checked ? 'checked' : ''} onchange="phidvToggleCheck('${key}',this)" style="width:14px;height:14px;cursor:pointer;accent-color:var(--green-accent)"></td>
      <td class="date">${i+1}</td>
      <td class="date" style="font-weight:700;color:var(--blue)">${escapeHtml(r[6])}</td>
      <td><strong>${khLink(r[0], r[1], r[14], undefined, r[2])}</strong>${extraMark}</td>
      <td class="date copy-cell" onclick="copyCellValue(this,event)" title="Click để copy MÃ KH">${escapeHtml(fmtMaKH(r[0]))}</td>
      <td class="money">${fmtMoney(amt)}</td>
      <td style="text-align:center">
        <span class="phidv-mucphi-edit ${amt < 500e6 ? 'chip-blue':'chip-gold'}"
          contenteditable="true"
          title="Click để chỉnh mức phí (%)"
          onblur="phidvEditMucPhi('${key}',this,${amt})"
          onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}"
          >${phi.label}</span>
      </td>
      <td class="money big">${fmtMoney(phi.phi)}</td>
      <td>${escapeHtml(r[12])}</td>
      ${ghichuCell}
    </tr>`;
  }).join('') + (rows.length > window.__TD_PG_SIZES[0] ? window.__TDPgBarHtml('phidv', __pg, rows.length, rows.length > visibleRows.length ? visibleRows.length : 0, 10) : '');

  tbody.innerHTML = html || `<tr><td colspan="10" style="text-align:center;padding:20px;color:var(--gray-500)">Không có dữ liệu giải ngân trong tháng này.<br><span style="font-size:11px">Nhấn ↺ Tất cả để xem toàn bộ, hoặc ➕ Thêm để nhập thủ công.</span></td></tr>`;

  const totalPhi = rows.reduce((s,r) => {
    const k = phidvGetRowKey(r); const st = phidvGetSt(k);
    return s + phidvCalcPhi(getAmt(r), st.mucphi).phi;
  }, 0);

  $('tfoot-phidv').innerHTML = `<tr>
    <td colspan="5" style="text-align:right;font-weight:700">TỔNG (${fmtNum(rows.length)} lần GN)</td>
    <td class="money" style="color:var(--gold-light)">${fmtMoney(totalAmt)}</td>
    <td></td>
    <td class="money" style="color:var(--gold-light)">${fmtMoney(totalPhi)}</td>
    <td colspan="2"></td>
  </tr>`;
  $('count-phidv').textContent = fmtNum(rows.length);
  $('phidv-total').innerHTML = `<span style="color:var(--navy)">Tổng <b>${fmtNum(rows.length)}</b> món · GN: <b>${fmtMoney(totalAmt)}đ</b></span> · <span style="color:var(--red)">Phí: <b>${fmtMoney(totalPhi)}đ</b></span>`;

  // Summary chip Đã báo phí
  const chip = $('phidv-summary-chip');
  if (chip) {
    if (daBaoCount > 0) {
      chip.className = 'phidv-summary-chip';
      chip.innerHTML = `🔴 Đã báo phí: <strong>${daBaoCount}</strong> dòng &nbsp;|&nbsp; <strong>${fmtMoney(daBaoTotalPhi)} đ</strong>`;
    } else {
      chip.className = 'phidv-summary-chip empty';
      chip.innerHTML = `📋 Đã báo phí: 0 dòng`;
    }
  }

  setTimeout(updateTableTopScrollbars, 0);
  setTimeout(() => { buildColumnFilters('table-phidv'); }, 0);
}

/* ════════════════════════════════════════════════════════════
   PRO-32: PHÍ GIẢI NGÂN — STATUS / CHECKBOX / EDIT HELPERS
   ════════════════════════════════════════════════════════════ */

/** Tạo key duy nhất cho mỗi dòng phí */
function phidvGetRowKey(r) {
  return r[99] ? String(r[99]) : `${String(r[0]||'')}_${String(r[6]||'')}_${String(r[9]||'')}`;
}

/** Lấy trạng thái dòng, mặc định là Chưa báo phí */
function phidvGetSt(key) {
  DATA.phidvStatus = DATA.phidvStatus || {};
  return DATA.phidvStatus[key] || { checked: false, status: 'chua_bao', mucphi: null };
}

/** Cập nhật một phần trạng thái dòng */
function phidvSetSt(key, patch) {
  DATA.phidvStatus = DATA.phidvStatus || {};
  DATA.phidvStatus[key] = Object.assign(phidvGetSt(key), patch);
  markUnsaved();
}

/** Tính phí với mức phí tuỳ chỉnh hoặc mặc định */
function phidvCalcPhi(amt, customRate) {
  if (!amt) return { rate: 0, phi: 0, label: '-' };
  if (customRate !== null && customRate !== undefined) {
    const rate = Number(customRate);
    return { rate, phi: Math.round(amt * rate), label: (rate * 100).toFixed(4).replace(/\.?0+$/,'') + '%' };
  }
  return calcPhi(amt);
}

/** Xử lý tick checkbox đầu dòng */
function phidvToggleCheck(key, cb) {
  phidvSetSt(key, { checked: cb.checked });
  clearTimeout(autoSaveTimer);  // P1-2 FIX
  saveData(true);  // ✅ KEY SYNC + P1-2 FIX
}

/** Chọn/bỏ chọn tất cả */
function phidvToggleAll(masterCb) {
  /* P09: dữ liệu phân trang ⇒ chọn/bỏ chọn TOÀN BỘ tập đã lọc, rồi đồng bộ các ô đang hiện */
  getFilteredData('phidv').forEach(r => phidvSetSt(phidvGetRowKey(r), { checked: masterCb.checked }));
  document.querySelectorAll('.phidv-row-chk').forEach(cb => { cb.checked = masterCb.checked; });
  clearTimeout(autoSaveTimer);  // P1-2 FIX
  saveData(true);  // ✅ KEY SYNC + P1-2 FIX
}

/** Đổi trạng thái GHI CHÚ → Chưa/Đã báo phí */
function phidvChangeStatus(key, sel) {
  const isDaBao = sel.value === 'da_bao';
  phidvSetSt(key, { status: sel.value, checked: isDaBao ? true : phidvGetSt(key).checked });
  renderPhiDV();
  // ✅ PRO-39 FIX #3: Refresh badges sidebar + force save (status quan trọng)
  if (typeof refreshBadges === 'function') refreshBadges();
  saveData(true);
}

/** Chỉnh sửa Mức Phí inline */
function phidvEditMucPhi(key, span, amt) {
  const raw = span.textContent.trim().replace('%','').replace(',','.');
  const pct = parseFloat(raw);
  if (isNaN(pct) || pct <= 0 || pct > 10) {
    // Giá trị không hợp lệ → khôi phục mặc định
    phidvSetSt(key, { mucphi: null });
    showToast('↺ Đã khôi phục mức phí mặc định', 'gold');
  } else {
    phidvSetSt(key, { mucphi: pct / 100 });
    showToast(`✏️ Mức phí cập nhật: ${pct}%`, 'green');
  }
  renderPhiDV();
  // ✅ PRO-39 FIX #3: Force save khi sửa mức phí
  saveData(true);
}

/* ═══════════════════════════════════════════════════════════════
   MACB – Officer list (auto-generated from qltd CBTD names)
   ═══════════════════════════════════════════════════════════════ */
function autoGenerateMaCB() {
  if (DATA.macb.length > 0) return;
  const stats = {};
  DATA.qltd.forEach(r => {
    const cb = r[12] || ''; if (!cb) return;
    if (!stats[cb]) stats[cb] = { pb: r[17], n: 0, duno: 0 };
    stats[cb].n++;
    stats[cb].duno += Number(r[11]) || 0;
  });
  const sorted = Object.entries(stats).sort((a,b) => b[1].duno - a[1].duno);
  DATA.macb = sorted.map((e, i) => {
    const [nm, st] = e;
    const rank = i < 3 ? 'A' : i < 10 ? 'B' : 'C';
    const cv = i === 0 ? 'Trưởng phòng' : i < 3 ? 'Phó phòng' : 'CBTD';
    const hscb = 4.5 + Math.random() * 2;
    const hskd = Math.round((st.duno / 10e9) * 100) / 100;
    return {
      hoten: nm,
      macb: 'ND' + String(10000 + i).slice(-4),
      chucvu: cv,
      phongban: st.pb || 'Hội Sở',
      hscb: hscb.toFixed(2),
      hskd: hskd.toFixed(2),
      luongV1: Math.round(hscb * 1800000),
      pccv: cv === 'Trưởng phòng' ? 1500000 : cv === 'Phó phòng' ? 1000000 : 500000,
      xeploai: rank,
    };
  });
}
function renderMaCB() {
  const tbody = $('tbody-macb'); if (!tbody) return;
  // ✅ FIX: tự tạo danh sách CB từ QLTD nếu chưa có dữ liệu
  if (!DATA.macb || DATA.macb.length === 0) autoGenerateMaCB();
  const q  = ($('search-macb')?.value  || '').toLowerCase();
  const cv = ($('filter-macb-cv')?.value || '');
  const filtered = [];
  DATA.macb.forEach((r, realIdx) => {
    if (cv && r.chucvu !== cv) return;
    if (q  && ![r.hoten,r.macb,r.chucvu,r.stk].some(v => String(v||'').toLowerCase().includes(q))) return;
    filtered.push({r, realIdx});
  });
  $('count-macb').textContent = fmtNum(filtered.length);
  const CV_COLOR = {'Giám đốc':'#b71c1c','Phó Giám đốc':'#880e4f','Trưởng phòng':'#1565c0','Phó phòng':'#0d47a1','Nhân viên':'#2e7d32'};
  const fmtN = n => (n===''||n==null) ? '' : Number(n).toLocaleString('vi-VN');
  const bgStripe = i => i%2===0 ? '#ffffff' : '#f0f7f0';
  const inp = (val, field, ridx, style='', type='text') =>
    `<input type="${type}" value="${escapeHtml(String(val??''))}" onchange="macbUpdateField(${ridx},'${field}',this.value)"
      style="width:100%;border:none;background:transparent;font-family:'Times New Roman',serif;font-size:12px;padding:0 2px;box-sizing:border-box;${style}"
      onmouseenter="this.style.background='#fffde7'" onmouseleave="this.style.background='transparent'"
      onfocus="this.style.background='#fffde7';this.style.outline='2px solid #f9a825'"
      onblur="this.style.background='transparent';this.style.outline='none'">`;
  const numInp = (val, field, ridx) => inp(val, field, ridx, 'text-align:right;color:#333', 'number');
  tbody.innerHTML = filtered.map(({r, realIdx}, i) => {
    const cvColor = CV_COLOR[r.chucvu] || '#555';
    const xl = r.xeploai||'';
    const xlChip = xl ? `<span style="display:inline-block;padding:2px 10px;border-radius:4px;font-weight:bold;background:${xl==='A'?'#2e7d32':xl==='B'?'#1565c0':'#e65100'};color:#fff">${escapeHtml(xl)}</span>` : '';
    return `<tr style="background:${bgStripe(i)};font-family:'Times New Roman',serif;font-size:12px">
      <td style="border:1px solid #ccc;padding:3px 6px;text-align:center;color:#777;white-space:nowrap">${i+1}</td>
      <td style="border:1px solid #ccc;padding:2px 4px;min-width:160px">${inp(r.hoten,'hoten',realIdx,'font-weight:600')}</td>
      <td style="border:1px solid #ccc;padding:2px 4px;min-width:95px">${inp(r.macb,'macb',realIdx,'font-style:italic;color:#555;text-align:center')}</td>
      <td style="border:1px solid #ccc;padding:2px 4px;min-width:130px">${inp(r.stk,'stk',realIdx,'font-size:11px;color:#555')}</td>
      <td style="border:1px solid #ccc;padding:2px 4px;min-width:110px">
        <select onchange="macbUpdateField(${realIdx},'chucvu',this.value)"
          style="font-family:'Times New Roman',serif;font-size:12px;border:1px solid #ccc;border-radius:3px;background:#fff;cursor:pointer;width:100%;padding:2px;color:${cvColor};font-weight:600">
          ${['Giám đốc','Phó Giám đốc','Trưởng phòng','Phó phòng','Nhân viên'].map(s =>
            `<option value="${s}"${r.chucvu===s?' selected':''}>${s}</option>`).join('')}
        </select>
      </td>
      <td style="border:1px solid #ccc;padding:2px 4px;min-width:55px">${numInp(r.hscb_v1,'hscb_v1',realIdx)}</td>
      <td style="border:1px solid #ccc;padding:2px 4px;min-width:50px">${numInp(r.pccv,'pccv',realIdx)}</td>
      <td style="border:1px solid #ccc;padding:2px 4px;min-width:65px">${numInp(r.tong_hscb,'tong_hscb',realIdx)}</td>
      <td style="border:1px solid #ccc;padding:2px 4px;min-width:55px">${numInp(r.hskd_v2,'hskd_v2',realIdx)}</td>
      <td style="border:1px solid #ccc;padding:2px 4px;min-width:65px">${numInp(r.tong_hskd,'tong_hskd',realIdx)}</td>
      <td style="border:1px solid #ccc;padding:2px 4px;min-width:45px">${numInp(r.n_luong,'n_luong',realIdx)}</td>
      <td style="border:1px solid #ccc;padding:2px 4px;min-width:100px;text-align:right;font-weight:600;color:#b71c1c">${fmtN(r.chi_luong_v1)}</td>
      <td style="border:1px solid #ccc;padding:2px 4px;min-width:90px;text-align:right">${fmtN(r.chi_pccv)}</td>
      <td style="border:1px solid #ccc;padding:2px 4px;min-width:90px;text-align:right">${fmtN(r.chi_pctn)}</td>
      <td style="border:1px solid #ccc;padding:2px 4px;min-width:90px;text-align:right">${fmtN(r.cb_bhxh)}</td>
      <td style="border:1px solid #ccc;padding:2px 4px;min-width:90px;text-align:right">${fmtN(r.cb_bhyt)}</td>
      <td style="border:1px solid #ccc;padding:2px 4px;min-width:90px;text-align:right">${fmtN(r.cb_bhtn)}</td>
      <td style="border:1px solid #ccc;padding:2px 4px;min-width:100px;text-align:right">${fmtN(r.cq_bhxh)}</td>
      <td style="border:1px solid #ccc;padding:2px 4px;text-align:center;min-width:60px">
        <select onchange="macbUpdateField(${realIdx},'xeploai',this.value)"
          style="font-family:'Times New Roman',serif;font-size:12px;border:1px solid #ccc;border-radius:3px;background:#fff;cursor:pointer;width:100%;padding:2px;font-weight:bold">
          ${['A','B','C','D'].map(s =>
            `<option value="${s}"${r.xeploai===s?' selected':''}>${s}</option>`).join('')}
        </select>
      </td>
      <td style="border:1px solid #ccc;padding:3px 6px;text-align:center;white-space:nowrap">
        <button onclick="macbDeleteRow(${realIdx})" title="Xóa cán bộ này"
          style="background:#e53935;color:#fff;border:none;border-radius:4px;padding:3px 10px;cursor:pointer;font-size:12px;line-height:1.2">🗑</button>
      </td>
    </tr>`;
  }).join('') || '<tr><td colspan="20" style="text-align:center;padding:30px;color:#6b7280;font-family:\'Times New Roman\',serif">Chưa có dữ liệu</td></tr>';
}
function macbUpdateField(realIdx, field, value) {
  if (DATA.macb[realIdx] === undefined) return;
  const numFields = ['hscb_v1','pccv','pckv','pckn','pcdh','pctn','pc_khac','tong_hscb',
    'hskd_v2','dc_cong','dc_tru','dc_nhan','tong_hskd','n_luong','n_anca',
    'pct_v1','chi_luong_v1','chi_pccv','chi_pctn','chi_dhkq',
    'cb_bhxh','cb_bhyt','cb_bhtn','cq_bhxh','cq_bhyt','cq_bhtn'];
  DATA.macb[realIdx][field] = numFields.includes(field) ? (value===''?'':Number(value)) : value;
}
function macbDeleteRow(realIdx) {
  if (!confirm('Xóa cán bộ "' + (DATA.macb[realIdx]?.hoten||'') + '"?')) return;
  DATA.macb.splice(realIdx, 1);
  renderMaCB();
}
function macbAddRow() {
  DATA.macb.push({stt:DATA.macb.length+1,hoten:'Họ và tên mới',macb:'',chucvu:'Nhân viên',stk:'',
    hscb_v1:'',pccv:'',pckv:'',pckn:'',pcdh:'',pctn:'',pc_khac:'',tong_hscb:'',
    hskd_v2:'',dc_cong:'',dc_tru:'',dc_nhan:'',tong_hskd:'',n_luong:'',n_anca:'',
    xeploai:'A',pct_v1:100,chi_luong_v1:'',chi_pccv:'',chi_pctn:'',chi_dhkq:'',
    cb_bhxh:'',cb_bhyt:'',cb_bhtn:'',cq_bhxh:'',cq_bhyt:'',cq_bhtn:''});
  renderMaCB();
  const tw = document.querySelector('#page-macb .table-wrap');
  if (tw) setTimeout(()=>{ tw.scrollTop = tw.scrollHeight; }, 50);
}

/* ═══════════════════════════════════════════════════════════════
   TRANOP
   ═══════════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════
   TRẢ NỢ / XUẤT TÀI SẢN — Bảng 1: Giảm dư nợ | Bảng 2: Hết dư nợ
   ═══════════════════════════════════════════════════════════════ */

const TRANOP_NOTES_KEY = 'tranop_notes_v1';

function tranopLoadNotes() {
  try { return JSON.parse(localStorage.getItem(TRANOP_NOTES_KEY) || '{}'); }
  catch(e) { return {}; }
}
function tranopSaveNote(makh, hd, val) {
  const notes = tranopLoadNotes();
  const key = `${makh}|${hd}`;
  notes[key] = val;
  try { localStorage.setItem(TRANOP_NOTES_KEY, JSON.stringify(notes)); }
  catch(e) {}
}
function tranopGetNote(notes, makh, hd) {
  return notes[`${makh}|${hd}`] || '';
}

function renderTranop() {
  if (!DATA.qltd || !DATA.qltd.length) return;

  // ✅ PRO-TRANO: Đảm bảo có snapshot dư nợ cũ
  _restorePrevDunoSnapshot();
  const prevSnap = window._prevDunoByMa || {}; // { maKH: { totalDN, name, cbtd } }

  // ── Populate CBTD dropdown — mặc định CBTD A ──
  const cbSel = $('tranop-filter-cbtd');
  if (cbSel) {
    const cbtds = window.TD_SXCB.sortNames([...new Set(DATA.qltd.map(r => r[12]).filter(Boolean))]);
    const cur = cbSel.value;
    cbSel.innerHTML = '<option value="">— Tất cả —</option>' +
      cbtds.map(c => `<option value="${escapeHtml(c)}" ${c===cur?'selected':''}>${escapeHtml(c)}</option>`).join('');
    // Theo dõi TẤT CẢ CBTD (không mặc định 1 cán bộ)
  }
  const filterCbtd = cbSel?.value || '';
  const filterPB = $('tranop-filter-phongban')?.value || '';
  const filterLV = $('tranop-filter-lv')?.value || '';
  // v13.9.9 ROOT FIX: snapshot cũ/reportData có thể không lưu cột CBTD (r[12]).
  // Lọc theo CBTD phải suy ra từ mã KH của DATA.qltd hiện tại, nếu không các mốc
  // sẽ rỗng hoặc vẫn lệch tổng khi chọn 1 cán bộ.
  const _normCbtd = v => String(v || '').trim();
  const _curCbtdByMa = (() => {
    const m = {};
    (DATA.qltd || []).forEach(r => {
      const ma = String(r && r[0] || '').trim();
      const cb = _normCbtd(r && r[12]);
      if (ma && cb && !m[ma]) m[ma] = cb;
    });
    return m;
  })();
  // v13.9.10: lookup CBTD từ MỌI snapshot lịch sử — KH đã tất toán vẫn còn map
  const _histCbtdByMa = (() => {
    const m = {};
    try {
      (window._archiveReportList || []).forEach(rep => {
        if (!rep || !Array.isArray(rep.reportData)) return;
        rep.reportData.forEach(r => {
          const ma = String(r && r[0] || '').trim();
          const cb = _normCbtd(r && r[12]);
          if (ma && cb && !m[ma]) m[ma] = cb;
        });
      });
    } catch(e){}
    return m;
  })();
  const _rowCbtd = r => _normCbtd(r && r[12])
    || _curCbtdByMa[String(r && r[0] || '').trim()]
    || _histCbtdByMa[String(r && r[0] || '').trim()]
    || '';
  const _passTranopFilters = r => {
    if (!r) return false;
    if (filterCbtd && _rowCbtd(r) !== filterCbtd) return false;
    if (filterPB && String(r[17]||'').trim() !== filterPB) return false;
    if (filterLV && !String(r[13]||'').toLowerCase().includes(filterLV)) return false;
    return true;
  };

  // ── Lấy snapshot 31/12/năm trước làm mốc so sánh cho cả 2 bảng ──
  const yr = new Date().getFullYear();
  const prevYr = yr - 1;

  const snapBOY = (typeof archiveFindByTag === 'function')
    ? archiveFindByTag('year_end', prevYr)
    : null;
  const snapAvail = !!(snapBOY && snapBOY.reportData);

  const snapLabel = snapAvail
    ? `📌 So sánh với 31/12/${prevYr}: ${snapBOY.name}`
    : `⚠ Chưa có snapshot 31/12/${prevYr} — so sánh với số tiền giải ngân`;

  const snapInfoEl = $('tranop-snap-info');
  if (snapInfoEl) {
    snapInfoEl.textContent = snapLabel;
    snapInfoEl.style.color = snapAvail ? 'var(--green-dark)' : 'var(--orange)';
  }

  // ── Build balance map: "makh" → tổng dư nợ (gộp theo KH, không phải từng món) ──
  const boyByMa = {};
  if (snapAvail) {
    snapBOY.reportData.forEach(r => {
      const ma = String(r[0] || '').trim();
      if (!ma) return;
      const cbtd = _rowCbtd(r);
      if (!_passTranopFilters(r)) return;
      const dn = Number(r[11]) || 0;
      if (!boyByMa[ma]) boyByMa[ma] = { totalDN:0, name:String(r[1]||'').trim(), cbtd,
        hanMuc:Number(r[5])||0, totalGN:0, loaiVay:String(r[13]||'').trim(),
        ngayKT:String(r[7]||'').trim(), hdList:[] };
      boyByMa[ma].totalDN += dn;
      boyByMa[ma].totalGN += Number(r[9])||0;
      const hd = String(r[2]||'').trim();
      if (hd && !boyByMa[ma].hdList.includes(hd)) boyByMa[ma].hdList.push(hd);
    });
  }

  // ── Current data map: "makh" → tổng dư nợ hiện tại ──
  let rows = DATA.qltd.slice();
  rows = rows.filter(_passTranopFilters);
  const currByMa = {};
  rows.forEach(r => {
    const ma = String(r[0]||'').trim(); if (!ma) return;
    if (!currByMa[ma]) currByMa[ma] = { totalDN:0, totalGN:0, hanMuc:Number(r[5])||0,
      loaiVay:String(r[13]||'').trim(), name:String(r[1]||'').trim(), cbtd:String(r[12]||'').trim(),
      ngayKT:String(r[7]||'').trim(), hdList:[] };
    currByMa[ma].totalDN += Number(r[11])||0;
    currByMa[ma].totalGN += Number(r[9])||0;
    const hd = String(r[2]||'').trim();
    if (hd && !currByMa[ma].hdList.includes(hd)) currByMa[ma].hdList.push(hd);
  });

  // ── v13.9.1: 4 mốc so sánh lấy TỪ ARCHIVE BÁO CÁO (IDB) theo tag ──
  //   D1   = snapshot mới nhất trước hôm nay (theo timestamp)
  //   EoM1 = tag month   của tháng (today.month - 1)
  //   EoQ1 = tag quarter của quý  (today.quarter - 1)
  //   EoY1 = tag year_end của năm (today.year - 1)
  // Nguồn duy nhất là _archiveReportList → tránh lệch với BCKH/dashboard.
  const _today = new Date();
  const _todayYmd = `${_today.getFullYear()}-${String(_today.getMonth()+1).padStart(2,'0')}-${String(_today.getDate()).padStart(2,'0')}`;
  const _tsToYmd = (ts) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  // D1: snapshot mới nhất trước hôm nay
  let _d1Snap = null;
  if (Array.isArray(window._archiveReportList)) {
    const cands = _archiveReportList
      .filter(r => r && Array.isArray(r.reportData) && r.timestamp && _tsToYmd(r.timestamp) < _todayYmd)
      .sort((a,b) => b.timestamp - a.timestamp);
    _d1Snap = cands[0] || null;
  }
  // Cuối tháng / quý / năm liền trước
  const _prevMonth = new Date(_today.getFullYear(), _today.getMonth()-1, 1);
  const _eomYear = _prevMonth.getFullYear(), _eomMonth = _prevMonth.getMonth()+1;
  const _curQ = Math.floor(_today.getMonth()/3); // 0..3
  const _prevQ = _curQ === 0 ? 4 : _curQ;        // quarter 1..4
  const _prevQYear = _curQ === 0 ? _today.getFullYear()-1 : _today.getFullYear();
  const _prevYear = _today.getFullYear() - 1;

  const _findFn = (typeof archiveFindByTag === 'function') ? archiveFindByTag : null;
  // archiveFindByTag chỉ hỗ trợ quarter 1..3; với Q4 dùng year_end của năm đó
  const _eomSnap = _findFn ? _findFn('month', _eomYear, _eomMonth) : null;
  const _eoqSnap = _findFn
    ? (_prevQ === 4 ? _findFn('year_end', _prevQYear) : _findFn('quarter', _prevQYear, _prevQ))
    : null;
  const _eoySnap = _findFn ? _findFn('year_end', _prevYear) : null;

  const _snapByKey = { D1: _d1Snap, EoM1: _eomSnap, EoQ1: _eoqSnap, EoY1: _eoySnap };

  const mocKeys = ['D1','EoM1','EoQ1','EoY1'];
  const mocLabel = { D1:'D-1', EoM1:'CT trước', EoQ1:'CQ trước', EoY1:'31/12 N-1' };
  const mocByMa  = { D1:{}, EoM1:{}, EoQ1:{}, EoY1:{} };
  const mocDates = { D1:null, EoM1:null, EoQ1:null, EoY1:null };
  const mocSnapName = { D1:'', EoM1:'', EoQ1:'', EoY1:'' };

  mocKeys.forEach(k => {
    const s = _snapByKey[k];
    if (!s || !Array.isArray(s.reportData)) return;
    mocDates[k]    = s.timestamp ? _tsToYmd(s.timestamp) : (s.date || '');
    mocSnapName[k] = s.name || '';
    s.reportData.forEach(r => {
      const ma = String(r[0]||'').trim(); if (!ma) return;
      if (!_passTranopFilters(r)) return;
      mocByMa[k][ma] = (mocByMa[k][ma]||0) + (Number(r[11])||0);
    });
  });

  // Phát hiện anchor TRÙNG (theo thứ tự ưu tiên D1 → EoM1 → EoQ1 → EoY1)
  const mocDup = { D1:null, EoM1:null, EoQ1:null, EoY1:null };
  const _seen = {};
  mocKeys.forEach(k => {
    const d = mocDates[k]; if (!d) return;
    if (_seen[d]) mocDup[k] = _seen[d]; // tên cột đã chiếm date này trước
    else _seen[d] = mocLabel[k];
  });

  // Cập nhật tooltip cho header
  document.querySelectorAll('th.th-moc').forEach(th => {
    const k = th.getAttribute('data-moc');
    if (!k) return;
    const d = mocDates[k];
    const base = th.getAttribute('title')||'';
    const baseClean = base.split(' · ')[0];
    if (!d) { th.setAttribute('title', baseClean + ' · Chưa có snapshot'); return; }
    let extra = ` · ${d}`;
    if (mocSnapName[k]) extra += ` (${mocSnapName[k]})`;
    if (mocDup[k]) extra += ` · ⚠ TRÙNG với cột ${mocDup[k]}`;
    th.setAttribute('title', baseClean + extra);
  });

  const dnAt = (k, ma) => mocByMa[k][ma] || 0;
  const fmtDelta = (d) => {
    if (!isFinite(d) || d === 0) return '<span style="color:var(--gray-500)">●  0</span>';
    const arrow = d < 0 ? '▼' : '▲';
    const color = d < 0 ? 'var(--green-dark)' : 'var(--red)';
    return `<span style="color:${color};font-weight:600">${arrow} ${fmtMoney(Math.abs(d))}</span>`;
  };
  const fmtMocCell = (k, ma, dnHT) => {
    if (!mocDates[k]) return `<td class="money" style="color:#94a3b8;font-style:italic" title="Chưa có snapshot mốc ${mocLabel[k]} — vào Lưu trữ Báo cáo để gắn tag">—</td>`;
    const v = dnAt(k, ma);
    const delta = dnHT - v;
    const dupNote = mocDup[k] ? `\n⚠ TRÙNG mốc với cột ${mocDup[k]} (cùng snapshot ${mocDates[k]})` : '';
    const dupStyle = mocDup[k] ? 'opacity:.55;' : '';
    const dupBadge = mocDup[k] ? `<span title="Trùng mốc với cột ${mocDup[k]} — cùng snapshot ${mocDates[k]}" style="color:#d97706;font-weight:700;margin-right:3px">⚠</span>` : '';
    return `<td class="money" style="${dupStyle}" title="Snapshot mốc ${mocLabel[k]} (${mocDates[k]}${mocSnapName[k]?' · '+mocSnapName[k]:''}): ${fmtMoney(v)}đ\nHiện tại: ${fmtMoney(dnHT)}đ${dupNote}">${dupBadge}${fmtDelta(delta)}</td>`;
  };


  const allMa = new Set([...Object.keys(boyByMa), ...Object.keys(currByMa)]);
  const notes = tranopLoadNotes();

  // ── Classify: GIẢM (giam < 0, còn dư nợ) vs HẾT (dư nợ = 0) ──
  const giamRows = [], hetRows = [];
  allMa.forEach(ma => {
    const boy = boyByMa[ma], cur = currByMa[ma];
    const dnBOY = snapAvail ? (boy ? boy.totalDN : 0) : (cur ? cur.totalGN : 0);
    const dnHT  = cur ? cur.totalDN : 0;
    const giam  = dnHT - dnBOY; // âm = dư nợ giảm
    const info  = cur || boy; if (!info) return;
    const hdLabel = info.hdList.length === 1 ? info.hdList[0] : `${info.hdList.length} HĐ`;

    // ✅ PRO-TRANO: Kiểm tra có trả gốc kể từ lần import trước không
    const prevInfo = prevSnap[ma];
    const dnPrev   = prevInfo ? prevInfo.totalDN : null;
    // v13.9.0: "Mới" = KH chưa từng có dư nợ ở MỌI mốc snapshot (D-1, cuối tháng, cuối quý, 31/12)
    const isBrandNew = mocKeys.every(k => dnAt(k, ma) === 0);
    const justPaid = (dnPrev !== null && dnHT > 0 && dnHT < dnPrev);
    const isNew = isBrandNew && dnHT > 0; // chỉ tag "Mới" khi thật sự là KH mới phát sinh
    const soTienTraGoc = justPaid ? (dnPrev - dnHT) : 0;

    const base = { ma, dnBOY, dnHT, giam, info, hdLabel, isNew, justPaid, soTienTraGoc, dnPrev };
    if (giam < 0 && dnHT > 0) giamRows.push(base);
    else if (dnHT === 0 && dnBOY > 0) {
      const isNewHet = (dnPrev !== null && dnPrev > 0);
      hetRows.push({ ...base, isNew: false, justPaid: isNewHet, soTienTraGoc: isNewHet ? dnPrev : (dnBOY || 0) });
    }
  });
  giamRows.sort((a,b) => a.giam - b.giam);
  hetRows.sort((a,b) => b.dnBOY - a.dnBOY);

  const b1Count = $('tranop-b1-count');
  if (b1Count) b1Count.textContent = `${giamRows.length} khách hàng giảm dư nợ từ đầu năm đến hiện tại`;

  let totalBOY1=0, totalHT1=0, totalGiam=0;
  const totalMoc1 = { D1:0, EoM1:0, EoQ1:0, EoY1:0 };
  /* P10 (T2): tổng tính trên toàn bộ; bảng phân trang (__TDPagedTbody) — trước đây dựng hết ~1.100 hàng */
  giamRows.forEach(o => {
    totalBOY1+=o.dnBOY; totalHT1+=o.dnHT; totalGiam+=o.giam;
    mocKeys.forEach(k => { if (mocDates[k]) totalMoc1[k] += (o.dnHT - dnAt(k, o.ma)); });
  });
  window.__TDPagedTbody('tranop-giam', 'tbody-giam-duno', giamRows, (o,i) => {
    const pct = o.dnBOY>0 ? (Math.abs(o.giam)/o.dnBOY*100).toFixed(1) : 0;
    const pctC = pct>=80 ? 'var(--red)' : pct>=50 ? 'var(--orange)' : '#d97706';
    // Badge: Mới / Vừa trả gốc / Yesterday
    const isYesterday = o.justPaid && _isYesterdayDiff(window._prevFileDate, window._importDateActual || localStorage.getItem('_currentFileDate'));
    const badges = [];
    if (o.isNew) badges.push(`<span title="KH mới phát sinh dư nợ (chưa có ở 4 mốc snapshot trước)" style="display:inline-block;margin-left:5px;padding:1px 6px;border-radius:10px;background:#dbeafe;color:#1e40af;font-size:10px;font-weight:700;border:1px solid #93c5fd;vertical-align:middle">Mới</span>`);
    if (o.justPaid) badges.push(isYesterday
        ? `<span title="Trả gốc ${fmtMoney(o.soTienTraGoc)}đ trong ngày hôm qua (so với file IPCAS ngày ${window._prevFileDate})" style="display:inline-block;margin-left:5px;padding:1px 6px;border-radius:10px;background:#fef3c7;color:#92400e;font-size:10px;font-weight:700;border:1px solid #fcd34d;vertical-align:middle">Yesterday</span>`
        : `<span title="Vừa trả gốc ${fmtMoney(o.soTienTraGoc)}đ so với file IPCAS trước" style="display:inline-block;margin-left:5px;padding:1px 6px;border-radius:10px;background:#dcfce7;color:#166534;font-size:10px;font-weight:700;border:1px solid #86efac;vertical-align:middle">Vừa trả gốc</span>`);
    const newBadge = badges.join('');
    return `<tr><td class="date">${i+1}</td>
      <td class="copy-cell date" onclick="copyCellValue(this,event)">${escapeHtml(o.ma)}</td>
      <td style="padding-left:8px;font-weight:600">${escapeHtml(o.info.name)}${newBadge}</td>
      <td class="date" style="font-size:10px">${escapeHtml(o.hdLabel)}</td>
      <td><span class="chip ${chipClass(o.info.loaiVay)}">${escapeHtml(o.info.loaiVay)}</span></td>
      <td class="money">${fmtMoney(o.dnBOY)}</td>
      <td class="money" style="color:var(--navy)">${fmtMoney(o.dnHT)}</td>
      <td class="money" style="color:var(--red);font-weight:700">${fmtMoney(Math.abs(o.giam))}</td>
      <td class="rate" style="color:${pctC}">${pct}%</td>
      ${fmtMocCell('D1', o.ma, o.dnHT)}
      ${fmtMocCell('EoM1', o.ma, o.dnHT)}
      ${fmtMocCell('EoQ1', o.ma, o.dnHT)}
      ${fmtMocCell('EoY1', o.ma, o.dnHT)}
      <td>${escapeHtml(o.info.cbtd)}</td></tr>`;
  },
  `<tr><td colspan="14" style="text-align:center;padding:20px;color:var(--gray-500)">${
    snapAvail ? 'Không có khách hàng nào giảm dư nợ từ đầu năm.' : 'Chưa có snapshot 31/12 năm trước.'
  }</td></tr>`, 14);

  const tot1MocCells = mocKeys.map(k => mocDates[k]
    ? `<td class="money">${fmtDelta(totalMoc1[k])}</td>`
    : `<td class="money" style="color:#94a3b8">—</td>`).join('');
  $('tfoot-giam-duno').innerHTML = giamRows.length ? `<tr>
    <td colspan="5" style="text-align:right;font-weight:700">TỔNG CỘNG (${giamRows.length} KH)</td>
    <td class="money">${fmtMoney(totalBOY1)}</td><td class="money">${fmtMoney(totalHT1)}</td>
    <td class="money" style="color:var(--red);font-weight:800">${fmtMoney(Math.abs(totalGiam))}</td>
    <td></td>
    ${tot1MocCells}
    <td></td></tr>` : '';

  // ── Bảng 2 ──
  const b2Count = $('tranop-b2-count');
  if (b2Count) b2Count.textContent = `${hetRows.length} khách hàng đã tất toán hoàn toàn`;
  let totalBOY2=0;
  const totalMoc2 = { D1:0, EoM1:0, EoQ1:0, EoY1:0 };
  hetRows.forEach(o => {
    totalBOY2+=o.dnBOY;
    mocKeys.forEach(k => { if (mocDates[k]) totalMoc2[k] += (0 - dnAt(k, o.ma)); });
  });
  window.__TDPagedTbody('tranop-het', 'tbody-het-duno', hetRows, (o,i) => {
    const note = tranopGetNote(notes, o.ma, o.ma);
    const noteOpts = [
      {v:'',l:'— Chưa xác nhận —'},{v:'trano-khong-xuat',l:'💰 Trả nợ không xuất TS'},{v:'xuat-ts',l:'🏠 Xuất TS'}
    ];
    const noteHtml = `<select class="tranop-note-sel" onchange="tranopSaveNote('${escapeHtml(o.ma)}','${escapeHtml(o.ma)}',this.value)"
      style="width:100%;padding:4px 6px;border-radius:5px;border:1.5px solid var(--gray-300);font-size:11px;font-family:inherit;background:${note==='xuat-ts'?'#dcfce7':note==='trano-khong-xuat'?'#dbeafe':'#fff'}">
      ${noteOpts.map(x=>`<option value="${x.v}"${note===x.v?' selected':''}>${x.l}</option>`).join('')}
    </select>`;
    // Badge: Vừa tất toán / Yesterday (KH "Mới" không áp dụng cho bảng Hết dư nợ)
    const isYesterdayHet = o.justPaid && _isYesterdayDiff(window._prevFileDate, window._importDateActual || localStorage.getItem('_currentFileDate'));
    const newBadgeHet = o.justPaid
      ? (isYesterdayHet
          ? `<span title="Tất toán ${fmtMoney(o.soTienTraGoc)}đ trong ngày hôm qua (so với file IPCAS ngày ${window._prevFileDate})" style="display:inline-block;margin-left:5px;padding:1px 6px;border-radius:10px;background:#fef3c7;color:#92400e;font-size:10px;font-weight:700;border:1px solid #fcd34d;vertical-align:middle">Yesterday</span>`
          : `<span title="Vừa tất toán ${fmtMoney(o.soTienTraGoc)}đ so với file IPCAS trước" style="display:inline-block;margin-left:5px;padding:1px 6px;border-radius:10px;background:#dcfce7;color:#166534;font-size:10px;font-weight:700;border:1px solid #86efac;vertical-align:middle">Vừa tất toán</span>`)
      : '';
    return `<tr class="${note==='xuat-ts'?'tr-xuat-ts':note==='trano-khong-xuat'?'tr-trano':''}">
      <td class="date">${i+1}</td>
      <td class="copy-cell date" onclick="copyCellValue(this,event)">${escapeHtml(o.ma)}</td>
      <td style="padding-left:8px;font-weight:600">${escapeHtml(o.info.name)}${newBadgeHet}</td>
      <td class="date" style="font-size:10px">${escapeHtml(o.hdLabel)}</td>
      <td><span class="chip ${chipClass(o.info.loaiVay)}">${escapeHtml(o.info.loaiVay)}</span></td>
      <td class="money" style="color:var(--green-dark);font-weight:700">${fmtMoney(o.dnBOY)}</td>
      <td class="date">${escapeHtml(o.info.ngayKT)}</td>
      ${fmtMocCell('D1', o.ma, 0)}
      ${fmtMocCell('EoM1', o.ma, 0)}
      ${fmtMocCell('EoQ1', o.ma, 0)}
      ${fmtMocCell('EoY1', o.ma, 0)}
      <td>${escapeHtml(o.info.cbtd)}</td>
      <td style="padding:4px 6px">${noteHtml}</td></tr>`;
  },
  `<tr><td colspan="13" style="text-align:center;padding:20px;color:var(--gray-500)">Không có khách hàng nào tất toán hoàn toàn.</td></tr>`, 13);

  const tot2MocCells = mocKeys.map(k => mocDates[k]
    ? `<td class="money">${fmtDelta(totalMoc2[k])}</td>`
    : `<td class="money" style="color:#94a3b8">—</td>`).join('');
  $('tfoot-het-duno').innerHTML = hetRows.length ? `<tr>
    <td colspan="5" style="text-align:right;font-weight:700">TỔNG CỘNG (${hetRows.length} KH)</td>
    <td class="money" style="color:var(--green-dark);font-weight:800">${fmtMoney(totalBOY2)}</td>
    <td></td>
    ${tot2MocCells}
    <td colspan="2"></td></tr>` : '';


  // ── Stats bar ──
  const xuat = hetRows.filter(o => tranopGetNote(notes,o.ma,o.ma)==='xuat-ts').length;
  const tranoKhong = hetRows.filter(o => tranopGetNote(notes,o.ma,o.ma)==='trano-khong-xuat').length;
  const chuaXN = hetRows.length - xuat - tranoKhong;
  const totalGiamAll = Math.abs(giamRows.reduce((s,o)=>s+o.giam,0));
  const statsBar = $('tranop-stats-bar');
  if (statsBar) statsBar.innerHTML = [
    `<div class="stat-chip sc-dn" style="background:#fff;border:1.5px solid var(--navy);border-radius:8px;padding:8px 14px;font-size:12px">
      <div class="sc-lbl">TỔNG GIẢM DƯ NỢ</div>
      <div class="sc-val" style="font-size:16px;font-weight:800;color:var(--green-main)">${fmtMoney(totalGiamAll)}</div>
    </div>`,
    `<div class="stat-chip" style="background:#fff;border:1.5px solid #1a4a6e;border-radius:8px;padding:8px 14px;font-size:12px">
      <div class="sc-lbl">HẾT DƯ NỢ</div>
      <div class="sc-val" style="font-size:16px;font-weight:800;color:#1a4a6e">${hetRows.length} KH</div>
    </div>`,
    `<div class="stat-chip" style="background:#dcfce7;border:1.5px solid #86efac;border-radius:8px;padding:8px 14px;font-size:12px">
      <div class="sc-lbl">🏠 XUẤT TS</div>
      <div class="sc-val" style="font-size:16px;font-weight:800;color:#166534">${xuat} KH</div>
    </div>`,
    `<div class="stat-chip" style="background:#dbeafe;border:1.5px solid #93c5fd;border-radius:8px;padding:8px 14px;font-size:12px">
      <div class="sc-lbl">💰 KHÔNG XUẤT TS</div>
      <div class="sc-val" style="font-size:16px;font-weight:800;color:#1e40af">${tranoKhong} KH</div>
    </div>`,
    `<div class="stat-chip" style="background:#fef3c7;border:1.5px solid #fcd34d;border-radius:8px;padding:8px 14px;font-size:12px">
      <div class="sc-lbl">⏳ CHƯA XÁC NHẬN</div>
      <div class="sc-val" style="font-size:16px;font-weight:800;color:#92400e">${chuaXN} KH</div>
    </div>`,
  ].join('');
}

/* Chip CSS class cho loại vay */
function chipClass(loai) {
  if (!loai) return 'chip-gray';
  if (/ngắn|211|thấu/i.test(loai)) return 'chip-blue';
  if (/trung|212/i.test(loai))     return 'chip-orange';
  if (/dài|213/i.test(loai))       return 'chip-purple';
  return 'chip-gray';
}

/* Excel export cho trang TRẢ NỢ/XUẤT TÀI SẢN */
async function tranopExportExcel() {
  let XL;
  try { XL = (typeof XLSX !== 'undefined') ? XLSX : null; }
  catch(e) {}
  if (!XL) { showToast('⚠ Thư viện XLSX chưa sẵn sàng', 'gold'); return; }
  const wb = XL.utils.book_new();
  /* P10 (T2): bảng đã phân trang ⇒ xuất từ bản sao đủ mọi dòng */
  const t1 = window.__TDPagedFullClone('tbl-giam-duno', 'tranop-giam');
  const t2 = window.__TDPagedFullClone('tbl-het-duno', 'tranop-het');
  if (t1) XL.utils.book_append_sheet(wb, XL.utils.table_to_sheet(t1), 'Giam Du No');
  if (t2) {
    // Remove select dropdowns before exporting
    const t2clone = t2;
    t2clone.querySelectorAll('select').forEach(sel => {
      const td = sel.closest('td');
      if (td) td.textContent = sel.options[sel.selectedIndex]?.text || '';
    });
    XL.utils.book_append_sheet(wb, XL.utils.table_to_sheet(t2clone), 'Het Du No');
  }
  const d = new Date();
  const stamp = `${String(d.getDate()).padStart(2,'0')}${String(d.getMonth()+1).padStart(2,'0')}${d.getFullYear()}`;
  XL.writeFile(wb, `TraNo_XuatTS_${stamp}.xlsx`);
  showToast('✅ Đã xuất file Excel', 'green');
}

/* ═══════════════════════════════════════════════════════════════
   HDV – Capital mobilization
   ═══════════════════════════════════════════════════════════════ */
const HDV_TKEYS = ['t1','t2','t3','t4','t5','t6','t7','t9','t12','tgtt'];
const HDV_PB_ORDER = ['Hội Sở','PGD Hai Bà Trưng','PGD Số 2'];
const HDV_PB_COLORS = {
  'Hội Sở':           '#1a5c1a',
  'PGD Hai Bà Trưng': '#0f2744',
  'PGD Số 2':         '#5b21b6',
};
const HDV_PB_DEFAULT = '#1c3a60';

function hdvInitPage() {
  if (!window._hdvPType) window._hdvPType = 'month';
  if (!DATA.hdvCurrentPeriod) {
    const d = new Date();
    DATA.hdvCurrentPeriod = `T${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  }
  hdvGenPeriodOptions();
  hdvUpdatePeriodStatus();
}

function hdvSetPType(ptype) {
  window._hdvPType = ptype;
  ['month','quarter','year'].forEach(t => {
    const el = $(`hdv-ptype-${t}`);
    if (el) el.classList.toggle('active', t === ptype);
  });
  hdvGenPeriodOptions();
}

function hdvGenPeriodOptions() {
  const sel = $('hdv-period-sel'); if (!sel) return;
  const ptype = window._hdvPType || 'month';
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth()+1, q = Math.ceil(m/3);
  const options = [];

  if (ptype === 'month') {
    for (let yr = y+1; yr >= y-1; yr--) {
      const maxM = (yr === y+1) ? 3 : (yr === y ? m : 12);
      for (let mo = maxM; mo >= 1; mo--) {
        const key = `T${String(mo).padStart(2,'0')}/${yr}`;
        const saved = !!(DATA.hdvSnapshots?.[key]);
        options.push({ key, label: `Tháng ${String(mo).padStart(2,'0')}/${yr}${saved?' ✓':''}` });
      }
    }
  } else if (ptype === 'quarter') {
    for (let yr = y+1; yr >= y-2; yr--) {
      const maxQ = (yr === y+1) ? 2 : (yr === y ? q : 4);
      for (let qi = maxQ; qi >= 1; qi--) {
        const key = `Q${qi}/${yr}`;
        const saved = !!(DATA.hdvSnapshots?.[key]);
        options.push({ key, label: `Quý ${qi}/${yr}${saved?' ✓':''}` });
      }
    }
  } else {
    for (let yr = y+1; yr >= y-3; yr--) {
      const key = String(yr);
      const saved = !!(DATA.hdvSnapshots?.[key]);
      options.push({ key, label: `Năm ${yr}${saved?' ✓':''}` });
    }
  }

  const cur = DATA.hdvCurrentPeriod;
  sel.innerHTML = options.map(o =>
    `<option value="${o.key}"${o.key===cur?' selected':''}>${o.label}</option>`
  ).join('');
  if (!cur && options[0]) {
    DATA.hdvCurrentPeriod = options[0].key;
    sel.value = options[0].key;
  }
  hdvUpdatePeriodStatus();
}

function hdvUpdatePeriodStatus() {
  const el = $('hdv-period-status');
  const lbl = $('hdv-period-label');
  const info = $('hdv-period-info');
  const key = DATA.hdvCurrentPeriod;
  if (!key) return;
  const snap = DATA.hdvSnapshots?.[key];
  if (el) {
    el.style.display = '';
    if (snap) {
      el.className = 'hdv-period-status saved';
      el.textContent = `✅ Đã lưu ${snap.savedAt}`;
    } else {
      el.className = 'hdv-period-status unsaved';
      el.textContent = '⏳ Chưa lưu';
    }
  }
  if (lbl) lbl.textContent = `${key} · Đơn vị: Triệu đồng`;
  if (info) {
    const n = (DATA.hdv||[]).length;
    info.textContent = n ? `${n} cán bộ` : '';
  }
}

function hdvSwitchPeriod(newKey) {
  if (!newKey) return;
  DATA.hdvCurrentPeriod = newKey;
  const snap = DATA.hdvSnapshots?.[newKey];
  if (snap?.rows) {
    const snapMap = {};
    snap.rows.forEach(r => { snapMap[r.cb] = r; });
    const cbPbMap = {};
    DATA.qltd.forEach(r => { if (r[12] && r[17]) cbPbMap[r[12]] = r[17]; });
    const allCbs = [...new Set([
      ...snap.rows.map(r=>r.cb),
      ...DATA.qltd.map(r=>r[12]).filter(Boolean)
    ])];
    DATA.hdv = allCbs.map(cb => snapMap[cb] || {
      cb, pb: cbPbMap[cb]||'',
      ...Object.fromEntries(HDV_TKEYS.map(k=>[k,0]))
    });
  } else {
    const cbPbMap = {};
    DATA.qltd.forEach(r => { if (r[12] && r[17]) cbPbMap[r[12]] = r[17]; });
    if (!DATA.hdv.length) {
      const cbtds = window.TD_SXCB.sortNames([...new Set(DATA.qltd.map(r=>r[12]).filter(Boolean))]);
      DATA.hdv = cbtds.map(cb => ({ cb, pb: cbPbMap[cb]||'', ...Object.fromEntries(HDV_TKEYS.map(k=>[k,0])) }));
    } else {
      DATA.hdv = DATA.hdv.map(d => ({
        cb: d.cb, pb: d.pb || cbPbMap[d.cb]||'',
        ...Object.fromEntries(HDV_TKEYS.map(k=>[k,0]))
      }));
    }
  }
  hdvUpdatePeriodStatus();
  renderHDV();
}

function hdvSavePeriod() {
  const key = DATA.hdvCurrentPeriod;
  if (!key) { showToast('⚠️ Chưa chọn kỳ theo dõi', 'red'); return; }
  if (!DATA.hdvSnapshots) DATA.hdvSnapshots = {};
  const d = new Date();
  const ts = `${d.toLocaleDateString('vi-VN')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  DATA.hdvSnapshots[key] = {
    rows: JSON.parse(JSON.stringify(DATA.hdv)),
    savedAt: ts, label: key
  };
  markUnsaved();
  saveData();
  hdvUpdatePeriodStatus();
  hdvGenPeriodOptions();
  showToast(`💾 Đã lưu kỳ ${key}`, 'green');
}

function hdvAddCBTD() {
  const cb = prompt('Tên cán bộ:');
  if (!cb?.trim()) return;
  const pb = prompt('Phòng ban (VD: Hội Sở / PGD Hai Bà Trưng / PGD Số 2):') || '';
  if (DATA.hdv.find(d => d.cb.trim().toLowerCase() === cb.trim().toLowerCase())) {
    showToast('⚠️ Cán bộ này đã có trong danh sách', 'red'); return;
  }
  DATA.hdv.push({ cb: cb.trim(), pb: pb.trim(), ...Object.fromEntries(HDV_TKEYS.map(k=>[k,0])) });
  markUnsaved();
  renderHDV();
}

function hdvReorderByPB() {
  const cbPbMap = {};
  DATA.qltd.forEach(r => { if (r[12] && r[17]) cbPbMap[r[12]] = r[17]; });
  DATA.hdv.forEach(d => { if (!d.pb && cbPbMap[d.cb]) d.pb = cbPbMap[d.cb]; });
  DATA.hdv.sort((a, b) => {
    const ia = HDV_PB_ORDER.indexOf(a.pb), ib = HDV_PB_ORDER.indexOf(b.pb);
    const pa = ia === -1 ? 99 : ia, pb2 = ib === -1 ? 99 : ib;
    if (pa !== pb2) return pa - pb2;
    return (a.pb||'').localeCompare(b.pb||'') || (a.cb||'').localeCompare(b.cb||'');
  });
  markUnsaved();
  renderHDV();
  showToast('🔀 Đã sắp xếp cán bộ theo phòng ban', 'green');
}

function hdvDeleteCBTD(idx) {
  const d = DATA.hdv[idx];
  if (!d) return;
  if (!confirm(`Xóa cán bộ "${d.cb}" khỏi kỳ này?`)) return;
  DATA.hdv.splice(idx, 1);
  markUnsaved();
  renderHDV();
}

function hdvShowArchive() {
  const modal = $('hdv-archive-modal');
  const body  = $('hdv-archive-body');
  if (!modal || !body) return;
  const snaps = DATA.hdvSnapshots || {};
  const keys  = Object.keys(snaps).sort((a,b) => b.localeCompare(a));

  if (!keys.length) {
    body.innerHTML = `<div style="text-align:center;padding:40px;color:var(--gray-400);font-size:13px">
      📭 Chưa có kỳ nào được lưu.<br><small style="font-size:11px">Dùng nút <strong>💾 Lưu kỳ này</strong> để lưu dữ liệu.</small>
    </div>`;
  } else {
    const badgeCls = k => k.startsWith('Q') ? 'quarter' : k.length===4 ? 'year' : 'month';
    const rows = keys.map(k => {
      const s = snaps[k];
      const total = (s.rows||[]).reduce((sum,r) => sum + HDV_TKEYS.reduce((a,tk) => a+(Number(r[tk])||0), 0), 0);
      const pbSet = new Set((s.rows||[]).map(r=>r.pb).filter(Boolean));
      return `<tr>
        <td><span class="hdv-arch-badge ${badgeCls(k)}">${k}</span></td>
        <td style="font-size:11px;color:var(--gray-500)">${s.savedAt||''}</td>
        <td style="text-align:right;font-weight:700;color:var(--green-dark)">${fmtNum(total)}</td>
        <td style="text-align:center;font-size:11px">${(s.rows||[]).length} CB · ${pbSet.size} phòng</td>
        <td style="text-align:center">
          <button class="btn btn-outline btn-sm" onclick="hdvLoadArchive('${k}')" style="font-size:10px">📂 Xem</button>
          <button class="btn btn-sm" onclick="hdvDeleteArchive('${k}')" style="background:var(--red);color:#fff;font-size:10px;margin-left:4px">🗑</button>
        </td>
      </tr>`;
    }).join('');
    body.innerHTML = `<table class="hdv-arch-table">
      <thead><tr><th>Kỳ</th><th>Lưu lúc</th><th style="text-align:right">Tổng ĐK</th><th style="text-align:center">Thông tin</th><th style="text-align:center">Thao tác</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }
  modal.style.display = 'flex';
}

function hdvLoadArchive(key) {
  $('hdv-archive-modal').style.display = 'none';
  if (key.startsWith('Q')) hdvSetPType('quarter');
  else if (key.length === 4) hdvSetPType('year');
  else hdvSetPType('month');
  DATA.hdvCurrentPeriod = key;
  hdvGenPeriodOptions();
  hdvSwitchPeriod(key);
}

function hdvDeleteArchive(key) {
  if (!confirm(`Xóa kỳ "${key}" khỏi lưu trữ?`)) return;
  delete DATA.hdvSnapshots[key];
  markUnsaved();
  hdvShowArchive();
}

function hdvExportCSV() {
  const key = DATA.hdvCurrentPeriod || 'hdv';
  const headers = ['STT','Phòng ban','Cán bộ',...HDV_TKEYS.map(k=>k==='tgtt'?'TGTT':k.toUpperCase()),'TỔNG ĐK'];
  const lines = [headers.join(',')];
  DATA.hdv.forEach(d => {
    const total = HDV_TKEYS.reduce((s,k) => s+(Number(d[k])||0), 0);
    lines.push([lines.length, d.pb||'', d.cb, ...HDV_TKEYS.map(k => d[k]||0), total].join(','));
  });
  const blob = new Blob(['\ufeff'+lines.join('\n')], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `HDV_${key.replace('/','_')}.csv`;
  a.click();
}

function renderHDV() {
  const tbody = $('tbody-hdv'); if (!tbody) return;

  if (!DATA.hdv.length) {
    const cbtds = window.TD_SXCB.sortNames([...new Set(DATA.qltd.map(r=>r[12]).filter(Boolean))]);
    const cbPbMap = {};
    DATA.qltd.forEach(r => { if (r[12] && r[17]) cbPbMap[r[12]] = r[17]; });
    DATA.hdv = cbtds.map(nm => ({
      cb: nm, pb: cbPbMap[nm]||'', ...Object.fromEntries(HDV_TKEYS.map(k=>[k,0]))
    }));
  } else {
    const cbPbMap = {};
    DATA.qltd.forEach(r => { if (r[12] && r[17]) cbPbMap[r[12]] = r[17]; });
    DATA.hdv.forEach(d => { if (!d.pb && cbPbMap[d.cb]) d.pb = cbPbMap[d.cb]; });
  }

  const groups = {};
  DATA.hdv.forEach((d, i) => {
    const pb = d.pb || '(Chưa phân phòng)';
    if (!groups[pb]) groups[pb] = [];
    groups[pb].push({ d, i });
  });

  const sortedPbs = Object.keys(groups).sort((a, b) => {
    const ia = HDV_PB_ORDER.indexOf(a), ib = HDV_PB_ORDER.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b);
  });

  sortedPbs.forEach(pb => {
    groups[pb].sort((a,b) => (a.d.cb||'').localeCompare(b.d.cb||''));
  });

  const totals = Object.fromEntries(HDV_TKEYS.map(k=>[k,0]));
  let sttOverall = 0;
  let html = '';

  sortedPbs.forEach(pb => {
    const members = groups[pb];
    const pbTotals = Object.fromEntries(HDV_TKEYS.map(k=>[k,0]));
    members.forEach(({d}) => HDV_TKEYS.forEach(k => {
      pbTotals[k] += Number(d[k])||0;
      totals[k]   += Number(d[k])||0;
    }));
    const pbGrand = HDV_TKEYS.reduce((s,k) => s+pbTotals[k], 0);
    const bgCol = HDV_PB_COLORS[pb] || HDV_PB_DEFAULT;

    html += `<tr class="hdv-pb-row" style="background:${bgCol}">
      <td colspan="2" class="pb-title">🏢 ${escapeHtml(pb)}
        <span style="font-size:10px;font-weight:400;opacity:.65;margin-left:6px">${members.length} cán bộ</span>
      </td>
      ${HDV_TKEYS.map(k => `<td class="money" style="color:#93c5fd;font-size:10.5px;font-weight:700;padding:6px 5px">${pbTotals[k]||''}</td>`).join('')}
      <td class="money" style="color:var(--gold-light);font-weight:800;font-size:12px">${pbGrand ? fmtNum(pbGrand) : ''}</td>
    </tr>`;

    members.forEach(({d, i}) => {
      sttOverall++;
      const rowTotal = HDV_TKEYS.reduce((s,k) => s+(Number(d[k])||0), 0);
      html += `<tr>
        <td class="date" style="text-align:center;color:var(--gray-500);font-size:11px">${sttOverall}</td>
        <td style="padding-left:16px">
          <strong>${escapeHtml(d.cb)}</strong>
          <button onclick="hdvDeleteCBTD(${i})" style="background:none;border:none;cursor:pointer;font-size:11px;opacity:.35;margin-left:4px;vertical-align:middle;padding:1px 2px" title="Xóa cán bộ này">✕</button>
        </td>
        ${HDV_TKEYS.map(k =>
          `<td class="num" style="padding:4px 3px"><span contenteditable="true" oninput="updateHdv(${i},'${k}',this.textContent)" style="display:inline-block;min-width:36px;padding:2px 5px;outline:none;border-radius:4px;text-align:center">${d[k]||''}</span></td>`
        ).join('')}
        <td class="money big" style="font-weight:700;color:${rowTotal?'var(--green-dark)':'var(--gray-400)'}">${rowTotal ? fmtNum(rowTotal) : '—'}</td>
      </tr>`;
    });
  });

  tbody.innerHTML = html || `<tr><td colspan="13" style="text-align:center;padding:30px;color:var(--gray-400)">Không có dữ liệu · Bấm ➕ Thêm cán bộ hoặc nhập dữ liệu IPCAS</td></tr>`;

  const grand = HDV_TKEYS.reduce((s,k) => s+totals[k], 0);
  $('tfoot-hdv').innerHTML = `<tr>
    <td colspan="2" style="text-align:right;font-weight:800;font-size:12px;padding:8px 12px;color:var(--gold-light)">TỔNG CỘNG</td>
    ${HDV_TKEYS.map(k => `<td class="money" style="color:var(--gold-light);font-size:11.5px;font-weight:700">${totals[k]||''}</td>`).join('')}
    <td class="money" style="color:var(--gold-light);font-weight:800;font-size:13px">${grand ? fmtNum(grand) : ''}</td>
  </tr>`;

  hdvUpdatePeriodStatus();
}

function updateHdv(idx, key, val) {
  if (!DATA.hdv[idx]) return;
  if (key === 'pb') {
    DATA.hdv[idx][key] = String(val).trim();
  } else {
    DATA.hdv[idx][key] = parseFloat(String(val).replace(/[^\d.-]/g,'')) || 0;
  }
  markUnsaved();
  clearTimeout(window._hdvT);
  window._hdvT = setTimeout(() => {
    const rows = DATA.hdv;
    const totals = Object.fromEntries(HDV_TKEYS.map(k=>[k,0]));
    rows.forEach(d => HDV_TKEYS.forEach(k => { totals[k] += Number(d[k])||0; }));
    const grand = HDV_TKEYS.reduce((s,k) => s+totals[k], 0);
    const tf = $('tfoot-hdv');
    if (tf) tf.innerHTML = `<tr>
      <td colspan="2" style="text-align:right;font-weight:800;font-size:12px;padding:8px 12px;color:var(--gold-light)">TỔNG CỘNG</td>
      ${HDV_TKEYS.map(k => `<td class="money" style="color:var(--gold-light);font-size:11.5px;font-weight:700">${totals[k]||''}</td>`).join('')}
      <td class="money" style="color:var(--gold-light);font-weight:800;font-size:13px">${grand ? fmtNum(grand) : ''}</td>
    </tr>`;
    renderHDV();
  }, 800);
}


/* ═══════════════════════════════════════════════════════════════
   BAO CAO
   ═══════════════════════════════════════════════════════════════ */
function renderBaoCao() {
  const sys = $('bc-filter-system')?.value || '';
  const ky  = $('bc-filter-ky')?.value  || '';
  const q   = ($('bc-filter-search')?.value || '').toLowerCase();
  const filtered = [];
  DATA.baocao.forEach((r, realIdx) => {
    if (sys && r.system !== sys) return;
    if (ky  && r.ky   !== ky)   return;
    if (q   && ![r.ten,r.ma,r.msstt].some(v => String(v||'').toLowerCase().includes(q))) return;
    filtered.push({r, realIdx});
  });
  $('bc-count').textContent = filtered.length + ' báo cáo';
  const bgStripe = i => i%2===0 ? '#ffffff' : '#f0f7f0';
  const inp = (val, field, ridx, style='') =>
    `<input value="${escapeHtml(String(val||''))}" onchange="bcUpdateField(${ridx},'${field}',this.value)"
      style="width:100%;border:none;background:transparent;font-family:'Times New Roman',serif;font-size:13px;padding:0 2px;box-sizing:border-box;${style}"
      onmouseenter="this.style.background='#fffde7'" onmouseleave="this.style.background='transparent'"
      onfocus="this.style.background='#fffde7';this.style.outline='2px solid #f9a825'"
      onblur="this.style.background='transparent';this.style.outline='none'">`;
  $('bc-list').innerHTML = filtered.map(({r, realIdx}, i) => {
    return `<tr style="background:${bgStripe(i)};font-family:'Times New Roman',serif;font-size:13px">
      <td style="border:1px solid #ccc;padding:5px 8px;text-align:center;color:#777;white-space:nowrap">${i+1}</td>
      <td style="border:1px solid #ccc;padding:2px 4px;text-align:center;min-width:80px">
        <select onchange="bcUpdateField(${realIdx},'system',this.value)"
          style="font-family:'Times New Roman',serif;font-size:12px;border:1px solid #ccc;border-radius:3px;background:#fff;cursor:pointer;width:100%;padding:3px 2px">
          ${['TT31','TT35','TT11','MIS62','MIS64','msgm','Khác'].map(s =>
            `<option value="${s}"${r.system===s?' selected':''}>${s}</option>`).join('')}
        </select>
      </td>
      <td style="border:1px solid #ccc;padding:2px 4px;min-width:150px">${inp(r.ma,'ma',realIdx,'font-weight:600;color:#1a5c1a')}</td>
      <td style="border:1px solid #ccc;padding:2px 4px;min-width:90px">${inp(r.msstt,'msstt',realIdx,'font-style:italic;color:#666')}</td>
      <td style="border:1px solid #ccc;padding:2px 4px;min-width:320px">${inp(r.ten,'ten',realIdx)}</td>
      <td style="border:1px solid #ccc;padding:2px 4px;text-align:center;min-width:80px">
        <select onchange="bcUpdateField(${realIdx},'ky',this.value)"
          style="font-family:'Times New Roman',serif;font-size:12px;border:1px solid #ccc;border-radius:3px;background:#fff;cursor:pointer;width:100%;padding:3px 2px;color:#e65100;font-weight:600">
          ${['','Tháng','Quý','Năm','Đột xuất','x'].map(s =>
            `<option value="${s}"${r.ky===s?' selected':''}>${s||'—'}</option>`).join('')}
        </select>
      </td>
      <td style="border:1px solid #ccc;padding:2px 4px;min-width:140px">${inp(r.link,'link',realIdx,'font-size:11px;color:#1565c0')}</td>
      <td style="border:1px solid #ccc;padding:4px 6px;text-align:center;white-space:nowrap">
        <button onclick="bcDeleteRow(${realIdx})" title="Xóa dòng này"
          style="background:#e53935;color:#fff;border:none;border-radius:4px;padding:3px 10px;cursor:pointer;font-size:12px;line-height:1.2">🗑</button>
      </td>
    </tr>`;
  }).join('') || '<tr><td colspan="8" style="padding:30px;text-align:center;color:#6b7280;font-family:\'Times New Roman\',serif">Không có báo cáo nào khớp</td></tr>';
}
function bcUpdateField(realIdx, field, value) {
  if (DATA.baocao[realIdx] === undefined) return;
  DATA.baocao[realIdx][field] = value;
}
function bcDeleteRow(realIdx) {
  if (!confirm('Xóa dòng báo cáo này?')) return;
  DATA.baocao.splice(realIdx, 1);
  renderBaoCao();
}
function bcAddRow() {
  DATA.baocao.push({system:'TT31',ma:'',msstt:'',ten:'Nhập tên báo cáo...',ky:'',link:''});
  renderBaoCao();
  const tw = document.querySelector('#page-baocao .table-wrap');
  if (tw) setTimeout(()=>{ tw.scrollTop = tw.scrollHeight; }, 50);
}

/* GIA DAT - rendered by bgdat-frame widget */
function renderGiaDat() {
  if (typeof bgd_buildWardTabs === "function") bgd_buildWardTabs();
  if (typeof bgd_filterAndRender === "function") bgd_filterAndRender();
}


/* ═══════════════════════════════════════════════════════════════
   LIST / CATALOG
   ═══════════════════════════════════════════════════════════════ */
function renderList() {
  const el = $('catalog-list'); if (!el) return;
  el.innerHTML = DATA.list.map(it => {
    if (it.group) return `<div class="catalog-item group-hdr">${escapeHtml(it.group)}</div>`;
    return `<div class="catalog-item" onclick="${it.link ? `window.open('${escapeHtml(it.link)}')` : `showToast('🔗 Link chưa cấu hình cho mục này','gold')`}">
      <div class="catalog-icon">${it.icon || '📎'}</div>
      <div class="catalog-info">
        <h4>${escapeHtml(it.ten)}</h4>
        <p>${escapeHtml(it.desc || 'Click để mở')}</p>
      </div>
    </div>`;
  }).join('');
}

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD
   ═══════════════════════════════════════════════════════════════ */
function initDashboardFilters() {
  // ✅ FIX đối chiếu bản gốc: gộp CBTD từ qltd + danh sách cán bộ (DATA.macb)
  // để dropdown luôn hiển thị TỪNG CBTD cụ thể (không chỉ "— Tất cả CBTD —").
  const cbtdFromQltd = (DATA.qltd || []).map(r => String(r[12]||'').trim()).filter(Boolean);
  const cbtdFromMacb = (Array.isArray(DATA.macb) ? DATA.macb : [])
    .map(o => String(o && (o.hoten || o.tenCB || o.cbtd) || '').trim()).filter(Boolean);
  const cbtds = [...new Set([...cbtdFromQltd, ...cbtdFromMacb])]
    .sort((a,b)=>a.localeCompare(b,'vi'));

  // ✅ FIX đối chiếu bản gốc: luôn có sẵn 3 phòng ban
  // Hội Sở / PGD Hai Bà Trưng / PGD Số 2 — kể cả khi dữ liệu trống.
  const REQUIRED_PB = ['Hội Sở', 'PGD Hai Bà Trưng', 'PGD Số 2'];
  const pbFromQltd = (DATA.qltd || []).map(r => String(r[17]||'').trim()).filter(Boolean);
  const pbs = [...new Set([...REQUIRED_PB, ...pbFromQltd])];

  const DEFAULT_FILTERED_IDS = ['db-filter-cbtd','filter-qltd-cbtd','filter-kd-cbtd','filter-td-cbtd','filter-denhan-cbtd','filter-laidong-cbtd','filter-chlm-cbtd'];
  const ALL_CBTD_IDS = [...DEFAULT_FILTERED_IDS, 'filter-phidv-cbtd', 'tranop-filter-cbtd', 'phanky-filter-cbtd', 'sync-filter-cbtd', 'notif-filter-cbtd', 'pgn-cbtd'];
  ALL_CBTD_IDS.forEach(id => {
    const el = $(id); if (!el) return;
    const cur = el.value;
    el.innerHTML = '<option value="">— Tất cả CBTD —</option>' + cbtds.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    el.value = cur;
  });
  if (!window._defaultFiltersInitialized) {
    window._defaultFiltersInitialized = true;
    DEFAULT_FILTERED_IDS.forEach(id => {
      const el = $(id);
      if (el) el.value = '';
    });
  }
  ['db-filter-pb','filter-qltd-phongban','filter-kd-phongban','filter-td-phongban','filter-macb-pb','filter-denhan-phongban','filter-laidong-phongban','filter-chlm-phongban','filter-phidv-phongban','tranop-filter-phongban'].forEach(id => {
    const el = $(id); if (!el) return;
    const cur = el.value;
    el.innerHTML = '<option value="">Tất cả phòng ban</option>' + pbs.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
    el.value = cur;
  });
}

function getDashFilteredData() {
  let rows = DATA.qltd.slice();
  const cb = $('db-filter-cbtd')?.value;
  const pb = $('db-filter-pb')?.value;
  const lv = $('db-filter-lv')?.value;
  const q = ($('db-filter-search')?.value || '').toLowerCase();
  if (cb) rows = rows.filter(r => r[12] === cb);
  if (pb) rows = rows.filter(r => r[17] === pb);
  if (lv) rows = rows.filter(r => String(r[13]||'').toLowerCase().includes(lv));
  if (q) rows = rows.filter(r => [r[0],fmtMaKH(r[0]),r[1],r[2],r[14]].some(v => String(v||'').toLowerCase().includes(q)));
  return rows;
}
function applyDashFilter() { renderDashboard(); }
function resetDashFilter() {
  ['db-filter-cbtd','db-filter-pb','db-filter-lv'].forEach(id => { const e=$(id); if(e) e.value=''; });
  const s = $('db-filter-search'); if (s) s.value = '';
  renderDashboard();
}



/* Dashboard click-through: click KPI card → chuyển sang menu */
function _attachDashboardNav() {
  var kpiMap = {
    'db-kpi-total':   'qltd',
    'db-kpi-duNo':    'qltd',
    'db-kpi-dh':      'dh',
    'db-kpi-lai':     'ld',
    'db-kpi-phi':     'phidv',
    'db-kpi-huy':     'huy'
  };
  Object.entries(kpiMap).forEach(function(entry) {
    var el = document.getElementById(entry[0]);
    if (el && !el._navAttached) {
      el.style.cursor = 'pointer';
      el.title = 'Click để xem chi tiết';
      el.addEventListener('click', function() { showPage(entry[1]); });
      el._navAttached = true;
    }
  });
  // Also attach to .db-kpi-card elements with data-page attribute
  document.querySelectorAll('.db-kpi-card[data-page]').forEach(function(card) {
    if (!card._navAttached) {
      card.style.cursor = 'pointer';
      card.addEventListener('click', function() { showPage(card.dataset.page); });
      card._navAttached = true;
    }
  });
}
function renderDashboard() {
  // QA-OPT: hien/an banner huong dan khi chua co du lieu
  const emptyHintEl = $('db-empty-hint');
  if (emptyHintEl) emptyHintEl.style.display = (!DATA.qltd || !DATA.qltd.filter(isActualCreditRow).length) ? 'flex' : 'none';
  const filteredRows = getDashFilteredData();
  const rows = filteredRows.filter(isActualCreditRow);
  const today = todayMidnight();
  const currentMonthLabel = monthYearLabel(today);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
  const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);

  // ─── Filter label
  const tag = $('db-filter-label');
  const cb = $('db-filter-cbtd')?.value;
  const pb = $('db-filter-pb')?.value;
  const lv = $('db-filter-lv')?.value;
  const q = ($('db-filter-search')?.value || '').trim();
  const hasFilter = cb || pb || lv || q;
  if (tag) {
    if (hasFilter) {
      tag.style.display = 'inline-block';
      const parts = [];
      if (cb) parts.push('CBTD: ' + cb);
      if (pb) parts.push('PB: ' + pb);
      if (lv) parts.push('LV: ' + lv);
      if (q) parts.push('Tìm: "' + q + '"');
      tag.textContent = `🔎 ${fmtNum(rows.length)}/${fmtNum(DATA.qltd.filter(isActualCreditRow).length)} HS thực tế · ` + parts.join(' · ');
    } else tag.style.display = 'none';
  }

  // ─── Tính toán tổng hợp (HM-08: TD.metrics — một engine cho mọi con số)
  const _pdMap0 = (window.TD_PASTDUE && TD_PASTDUE.map) || {};
  const MET = TD.metrics.summarize(rows, { today, pastDue: _pdMap0, parseDate: parseVNDate });
  try { const _e = TD.metrics.check(MET); if (_e.length) console.warn('[TD.metrics] bất biến lệch:', _e); } catch (e) {}
  const totalDuNo = MET.totals.duno;
  const totalLai  = MET.totals.lai;
  const totalKH   = MET.totals.kh;
  const totalHMTD = MET.totals.hmtd;

  // ─── Phân loại theo loại vay
  const CATS = [
    { name: 'Vay ngắn hạn (TK 211)', key: 'nganhan', chip: 'chip-blue', icon: '💼' },
    { name: 'Vay trung hạn (TK 212)', key: 'trunghan', chip: 'chip-orange', icon: '🏠' },
    { name: 'Vay dài hạn (TK 213)', key: 'daihan', chip: 'chip-red', icon: '🏢' },
    { name: 'Thấu chi', key: 'thauchi', chip: 'chip-purple', icon: '💳' },
    { name: 'Khác (chưa phân loại)', key: 'khac', chip: 'chip-gray', icon: '❔' }, // HM-08: chỉ hiện khi có khoản
  ];
  const stats = {};
  MET.byLoai.forEach(g => { stats[g.key] = { rows: g.rows, khCount: g.kh, hsCount: g.hs, duno: g.duno, hmtd: g.hmtd, lai: g.lai }; });

  // ─── Quá hạn & sắp đến hạn
  // PATCH v13.9.1 (2026-06-19): Union với DATA.pastDueIPCAS để không bỏ sót khoản
  // chỉ Quá hạn LÃI (gốc HĐ chưa đến hạn). Dữ liệu nguồn: IPCAS inpd01 (Past Due).
  const _pdMap = (window.TD_PASTDUE && TD_PASTDUE.map) || {};
  const _pdKey = (r) => (String(r[0]||'').replace(/\D/g,'') + '|' + String(r[2]||'').replace(/[^A-Za-z0-9]/g,'').toUpperCase());
  // FIX v13.9.5: dedupe theo CIF+HĐTD. Một HĐTD có thể có N khế ước nhận nợ;
  // _pdMap được khoá ở mức HĐTD nên mọi khế ước con đều match cùng 1 entry past-due
  // → trước đây Bảng VII lặp lại N dòng giống hệt (vd: (đã ẩn) x3, (đã ẩn) x4).
  // Với nhánh legacy (r[7]<today), gộp dư nợ QH/lãi cộng dồn các khế ước thành 1 dòng HĐTD.
  // HM-08: quá hạn/đến hạn do TD.metrics tính (cùng quy tắc cũ; ngày = ngày dữ liệu, HM-07)
  const overdueRows = MET.overdue;
  const duehanRows = MET.duehan;
  const overdueDN = MET.overdueDN;
  const duehanDN  = MET.duehanDN;

  // KPI STRIP đã bỏ theo lệnh thực thi (item 8)

  // ═══════════════════════════════════════════════════════════════
  // BẢNG I — TỔNG HỢP THEO LOẠI VAY
  // ═══════════════════════════════════════════════════════════════
  // ✅ FIX PRO-36: Defensive null-check để tránh TypeError nếu element thiếu
  const bang1Sub = $('db-bang1-sub-ctkh') || $('db-bang1-sub'); /* v14.4.0 FIX: id đã đổi thành -ctkh */
  if (bang1Sub) bang1Sub.textContent = `Đơn vị: đồng · ${fmtNum(rows.length)} hồ sơ dư nợ thực tế · ${fmtNum(totalKH)} khách hàng thực tế`;
  const dueTitle = $('db-title-duehan');
  if (dueTitle) dueTitle.textContent = `📅 BẢNG VI — NỢ ĐẾN HẠN TỪ ĐẦU THÁNG ${currentMonthLabel} ĐẾN NAY`;
  const laiTitle = $('db-title-lai');
  const prevMonthLabel = monthYearLabel(prevMonthEnd);
  if (laiTitle) laiTitle.textContent = `💰 BẢNG VIII — LÃI PHẢI THU ĐẾN CUỐI THÁNG ${prevMonthLabel}`;
  const mainHtml = CATS.filter(c => c.key !== 'khac' || stats.khac.hsCount > 0).map((c, i) => {
    const s = stats[c.key];
    const pct = totalDuNo ? (s.duno / totalDuNo * 100) : 0;
    return `<tr>
      <td class="date">${i+1}</td>
      <td style="text-align:left;padding-left:14px"><span class="chip ${c.chip}">${c.icon} ${escapeHtml(c.name)}</span></td>
      <td style="text-align:center;font-variant-numeric:tabular-nums"><strong>${fmtNum(s.khCount)}</strong></td>
      <td class="money big">${fmtMoney(s.duno)}</td>
      <td class="num"><strong style="color:var(--green-dark)">${pct.toFixed(2)}%</strong></td>
    </tr>`;
  }).join('');
  $('tbody-db-main').innerHTML = mainHtml;
  $('tfoot-db-main').innerHTML = `<tr>
    <td></td>
    <td style="text-align:left;padding-left:14px">TỔNG CỘNG</td>
    <td style="text-align:center;font-variant-numeric:tabular-nums">${fmtNum(totalKH)}</td>
    <td class="money" style="color:var(--gold-light)">${fmtMoney(totalDuNo)}</td>
    <td class="num">100,00%</td>
  </tr>`;

  // ═══════════════════════════════════════════════════════════════
  // BẢNG II — NHÓM NỢ
  // ═══════════════════════════════════════════════════════════════
  const nhomChipCls = {'Nhóm 1':'chip-green','Nhóm 2':'chip-blue','Nhóm 3':'chip-orange','Nhóm 4':'chip-red','Nhóm 5':'chip-red','Không rõ nhóm':'chip-gray'};
  const nhomHtml = MET.byNhom.filter(g => g.key !== TD.metrics.NHOM_UNKNOWN || g.hs > 0).map(g => {
    const n = g.key, s = { duno: g.duno, khSet: { size: g.kh } };
    const pct = totalDuNo ? (s.duno/totalDuNo*100) : 0;
    return `<tr>
      <td style="text-align:center"><span class="chip ${nhomChipCls[n]}">${escapeHtml(n)}</span></td>
      <td style="text-align:center;font-variant-numeric:tabular-nums">${fmtNum(s.khSet.size)}</td>
      <td class="money">${fmtMoney(s.duno)}</td>
      <td class="num">${pct.toFixed(2)}%</td>
    </tr>`;
  }).join('');
  $('tbody-db-nhomno').innerHTML = nhomHtml;
  $('tfoot-db-nhomno').innerHTML = `<tr>
    <td style="text-align:right">TỔNG</td>
    <td style="text-align:center">${fmtNum(totalKH)}</td>
    <td class="money" style="color:var(--gold-light)">${fmtMoney(totalDuNo)}</td>
    <td class="num">100%</td>
  </tr>`;

  // ═══════════════════════════════════════════════════════════════
  // BẢNG III — PHÒNG BAN (item 9: luôn hiện Hội Sở + PGD Hai Bà Trưng + PGD Số 2)
  // ═══════════════════════════════════════════════════════════════
  const pbStats = {};
  rows.forEach(r => {
    const p = r[17] || '(Chưa phân loại)';
    if (!pbStats[p]) pbStats[p] = { rows: [], duno: 0, khSet: new Set() };
    pbStats[p].rows.push(r);
    pbStats[p].duno += (+r[11]||0);
    const ck = customerKey(r);
    if (ck) pbStats[p].khSet.add(ck);
  });
  // Phòng ban theo dõi bắt buộc (Lệnh thực thi item 9)
  const REQUIRED_PB = ['Hội Sở', 'PGD Hai Bà Trưng', 'PGD Số 2'];
  const pbIcon = { 'Hội Sở':'🏛️', 'PGD Hai Bà Trưng':'🏢', 'PGD Số 2':'🏣' };
  // Đảm bảo 3 phòng ban chính luôn xuất hiện (dù đang rỗng)
  REQUIRED_PB.forEach(p => {
    if (!pbStats[p]) pbStats[p] = { rows: [], duno: 0, khSet: new Set() };
  });
  // Sắp xếp: REQUIRED_PB theo thứ tự cố định trước, sau đó các PB khác theo dư nợ
  const requiredRows = REQUIRED_PB.map(p => [p, pbStats[p]]);
  const otherRows = Object.entries(pbStats)
    .filter(([name]) => !REQUIRED_PB.includes(name))
    .sort((a, b) => b[1].duno - a[1].duno);
  const pbSorted = [...requiredRows, ...otherRows];
  const pbHtml = pbSorted.map(([name, s], idx) => {
    const pct = totalDuNo ? (s.duno/totalDuNo*100) : 0;
    const isRequired = REQUIRED_PB.includes(name);
    const icon = pbIcon[name] || '📍';
    return `<tr${isRequired ? ' style="background:#fff8e1 !important"' : ''}>
      <td style="text-align:left;padding-left:12px"><strong>${icon} ${escapeHtml(name)}</strong></td>
      <td class="num">${fmtNum(s.khSet.size)}</td>
      <td class="money">${fmtMoney(s.duno)}</td>
      <td class="num">${pct.toFixed(2)}%</td>
    </tr>`;
  }).join('');
  $('tbody-db-pb').innerHTML = pbHtml || '<tr><td colspan="5" style="text-align:center;padding:18px;color:var(--gray-500)">Không có dữ liệu</td></tr>';
  $('tfoot-db-pb').innerHTML = `<tr>
    <td style="text-align:right;padding-left:12px">TỔNG</td>
    <td class="num">${fmtNum(totalKH)}</td>
    <td class="money" style="color:var(--gold-light)">${fmtMoney(totalDuNo)}</td>
    <td class="num">100%</td>
  </tr>`;

  // ═══════════════════════════════════════════════════════════════
  // BẢNG IV — CBTD (chỉ hiện khi không lọc CBTD cụ thể)
  // ═══════════════════════════════════════════════════════════════
  const cardCBTD = $('db-card-cbtd');
  if (cb) {
    // Đang lọc theo 1 CBTD → ẩn bảng CBTD, không cần xếp hạng
    if (cardCBTD) cardCBTD.style.display = 'none';
  } else {
    if (cardCBTD) cardCBTD.style.display = '';
    const cbStats = {};
    rows.forEach(r => {
      const k = r[12] || '(Chưa phân công)';
      if (!cbStats[k]) cbStats[k] = { pb: r[17] || '', rows: [], nganhan:0, trungdai:0, duno:0, khSet: new Set() };
      cbStats[k].rows.push(r);
      const dn = +r[11]||0;
      cbStats[k].duno += dn;
      if (isNganHan(r[13])) cbStats[k].nganhan += dn;
      else if (isTrungHan(r[13])) cbStats[k].trungdai += dn;
      const ck = customerKey(r);
      if (ck) cbStats[k].khSet.add(ck);
    });
    const cbSorted = Object.entries(cbStats).sort((a,b) => b[1].duno - a[1].duno);
    $('db-cbtd-sub').textContent = `Tổng ${cbSorted.length} CBTD · Sắp xếp theo tổng dư nợ giảm dần`;
    /* P10 (T1): phân trang (trước đây dựng mọi CBTD) — tổng vẫn tính trên toàn bộ */
    window.__TDPagedTbody('db-cbtd', 'tbody-db-cbtd', cbSorted, ([name, s], i) => {
      const pct = totalDuNo ? (s.duno/totalDuNo*100) : 0;
      const rankChip = i === 0 ? 'chip-gold' : i < 3 ? 'chip-green' : i < 10 ? 'chip-blue' : 'chip-gray';
      const rankIcon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i+1);
      const isDefault = name === DEFAULT_CBTD;
      return `<tr${isDefault ? ' style="background:#fff4d4 !important"' : ''}>
        <td><span class="chip ${rankChip}">${rankIcon}</span></td>
        <td style="text-align:left;padding-left:12px"><strong>${escapeHtml(name)}</strong>${isDefault ? ' <span class="chip chip-gold" style="margin-left:4px">📌 Mặc định</span>' : ''}</td>
        <td>${escapeHtml(s.pb)}</td>
        <td class="num">${fmtNum(s.khSet.size)}</td>
        <td class="money">${fmtMoney(s.nganhan)}</td>
        <td class="money">${fmtMoney(s.trungdai)}</td>
        <td class="money big">${fmtMoney(s.duno)}</td>
        <td class="num">${pct.toFixed(2)}%</td>
      </tr>`;
    }, '', 8);
    const totNH = cbSorted.reduce((s, e) => s + e[1].nganhan, 0);
    const totTD = cbSorted.reduce((s, e) => s + e[1].trungdai, 0);
    $('tfoot-db-cbtd').innerHTML = `<tr>
      <td colspan="3" style="text-align:right">TỔNG CỘNG</td>
      <td class="num">${fmtNum(totalKH)}</td>
      <td class="money" style="color:var(--gold-light)">${fmtMoney(totNH)}</td>
      <td class="money" style="color:var(--gold-light)">${fmtMoney(totTD)}</td>
      <td class="money" style="color:var(--gold-light)">${fmtMoney(totalDuNo)}</td>
      <td class="num">100%</td>
    </tr>`;
  }

  // ═══════════════════════════════════════════════════════════════
  // BẢNG V — TOP 10 KH DƯ NỢ LỚN NHẤT
  // ═══════════════════════════════════════════════════════════════
  const topKH = Array.from(rows.reduce((map, r) => {
    const k = customerKey(r);
    if (!k) return map;
    if (!map.has(k)) map.set(k, { name: r[1] || '', ma: r[0] || '', sohd: [], loai: new Set(), nhom: '', nhomRank: 0, duno: 0, lai: 0, cbtd: new Set(), due: null, dueText: '' });
    const item = map.get(k);
    item.duno += Number(r[11]) || 0;
    item.lai += Number(r[10]) || 0;
    if (r[2] && !item.sohd.includes(r[2])) item.sohd.push(r[2]);
    if (r[13]) item.loai.add(r[13]);
    if (r[12]) item.cbtd.add(r[12]);
    const nr = TD.metrics.nhomRank(r[18]); // HM-08: regex cũ /d+/ không khớp chữ số
    if (nr >= item.nhomRank) { item.nhomRank = nr; item.nhom = r[18] || item.nhom; }
    const d = parseVNDate(r[7]);
    if (d && (!item.due || d < item.due)) { item.due = d; item.dueText = r[7]; }
    return map;
  }, new Map()).values()).filter(x => x.duno > 0).sort((a,b) => b.duno - a.duno).slice(0, 10);
  const loaiVayChip = v => {
    if (!v) return '';
    if (/thấu chi/i.test(v)) return '<span class="chip chip-purple">Thấu chi</span>';
    if (/ngắn hạn/i.test(v)) return '<span class="chip chip-blue">Ngắn hạn</span>';
    if (/trung hạn/i.test(v)) return '<span class="chip chip-orange">Trung hạn</span>';
    if (/dài hạn/i.test(v)) return '<span class="chip chip-red">Dài hạn</span>';
    return escapeHtml(v);
  };
  $('tbody-db-topkh').innerHTML = topKH.map((r, i) => {
    const rankChip = i === 0 ? 'chip-gold' : i < 3 ? 'chip-green' : 'chip-blue';
    const loai = Array.from(r.loai).join(', ');
    const cbtd = Array.from(r.cbtd).join(', ');
    const sohd = r.sohd.length > 1 ? `${r.sohd.length} hồ sơ` : (r.sohd[0] || '');
    return `<tr>
      <td><span class="chip ${rankChip}">${i+1}</span></td>
      <td style="text-align:left;padding-left:12px"><strong>${escapeHtml(r.name)}</strong></td>
      <td class="date">${escapeHtml(r.ma)}</td>
      <td class="date" title="${escapeHtml(r.sohd.join(', '))}">${escapeHtml(sohd)}</td>
      <td>${loaiVayChip(loai)}</td>
      <td style="text-align:center"><span class="chip ${nhomChipCls[r.nhom] || 'chip-gray'}">${escapeHtml(r.nhom || '')}</span></td>
      <td class="money big">${fmtMoney(r.duno)}</td>
      <td>${escapeHtml(cbtd)}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--gray-500)">Không có dữ liệu</td></tr>';

  // ═══════════════════════════════════════════════════════════════
  // BẢNG VI & VII — ĐẾN HẠN / QUÁ HẠN
  // ═══════════════════════════════════════════════════════════════
  const duehanSorted = duehanRows.slice().sort((a,b) => parseVNDate(a[7]) - parseVNDate(b[7]));
  /* P10 (T1): Bảng VI/VIII phân trang (trước đây dựng hết: 2.229 hàng/8 bảng trên dữ liệu thật, mở Dashboard 1,4 s) */
  window.__TDPagedTbody('db-duehan', 'tbody-db-duehan', duehanSorted, r => {
    const d = parseVNDate(r[7]);
    const days = daysDiff(today, d);
    const cls = days < 0 ? 'chip-red' : days <= 7 ? 'chip-orange' : 'chip-blue';
    const label = days < 0 ? `quá ${-days}d` : days === 0 ? 'hôm nay' : `còn ${days}d`;
    return `<tr>
      <td class="date"><strong>${escapeHtml(r[7])}</strong></td>
      <td style="text-align:center"><span class="chip ${cls}">${label}</span></td>
      <td style="text-align:left;padding-left:10px"><strong>${khLink(r[0], r[1], r[14], undefined, r[2])}</strong><br><small style="color:var(--gray-500)">${escapeHtml(fmtMaKH(r[0]))} · ${escapeHtml(r[2])}</small></td>
      <td class="money big">${fmtMoney(r[11])}</td>
      <td>${escapeHtml(r[12])}</td>
    </tr>`;
  }, `<tr><td colspan="5" style="text-align:center;padding:22px;color:var(--gray-500)">Không có khoản nợ đến hạn trong tháng ${escapeHtml(currentMonthLabel)}</td></tr>`, 5);

  // PATCH v13.9.1: sort theo ngày QH (pastDue) khi gốc HĐ chưa đến hạn
  const _pdSortDate = (r) => {
    const pd = _pdMap[_pdKey(r)];
    if (pd && pd.ngayQH) { const d = parseVNDate(pd.ngayQH); if (d) return d; }
    return parseVNDate(r[7]) || new Date(8640000000000000);
  };
  const overdueSorted = overdueRows.slice().sort((a,b) => _pdSortDate(a) - _pdSortDate(b)).slice(0, 20);
  // FIX v13.9.14: cảnh báo khi snapshot Past Due (inpd01) cũ hơn ngày hiện tại
  (function(){
    try {
      var titleEl = document.getElementById('db-title-overdue') || document.getElementById('tbl-db-overdue');
      var host = titleEl && titleEl.parentNode;
      var existing = document.getElementById('td-pd-staleness');
      if (existing) existing.remove();
      var asOfTxt = (window.TD_PASTDUE && TD_PASTDUE.asOf) || '';
      var dAsOf = asOfTxt ? parseVNDate(asOfTxt) : null;
      var lag = dAsOf ? Math.max(0, -daysDiff(today, dAsOf)) : 999;
      if (host && lag >= 1) {
        var bn = document.createElement('div');
        bn.id = 'td-pd-staleness';
        bn.style.cssText = 'margin:8px 0;padding:10px 12px;border:1px solid #dc2626;background:#fff5f5;color:#7f1d1d;border-radius:6px;font:600 13px/1.4 system-ui;display:flex;justify-content:space-between;gap:12px;align-items:center';
        bn.innerHTML = '⚠️ Snapshot Past Due (inpd01) đang chốt <b>' + (asOfTxt||'(chưa có)') + '</b>, đã trễ <b>' + lag + ' ngày</b> so với hôm nay. Số liệu Bảng VII có thể KHÔNG khớp IPCAS. <button id="td-pd-open" style="background:#dc2626;color:#fff;border:0;padding:6px 12px;border-radius:4px;cursor:pointer;font:600 12px system-ui">📥 Cập nhật ngay</button>';
        host.insertBefore(bn, titleEl.nextSibling);
        var btn = document.getElementById('td-pd-open');
        if (btn) btn.onclick = function(){ try { TD_PASTDUE.open && TD_PASTDUE.open(); } catch(e){} };
      }
    } catch(e){ console.warn('[pd-staleness]', e); }
  })();

  $('tbody-db-overdue').innerHTML = overdueSorted.length ? overdueSorted.map(r => {
    const pd = _pdMap[_pdKey(r)] || null;
    const ngayQHTxt = pd && pd.ngayQH ? pd.ngayQH : (r[7] || '');
    const dQH = parseVNDate(ngayQHTxt);
    // FIX v13.9.14: tính lại soNgayQH theo today để badge không bị đông cứng theo asOf snapshot
    const days = dQH ? Math.max(0, -daysDiff(today, dQH)) : (pd && pd.soNgayQH != null ? +pd.soNgayQH : 0);
    const duQH = pd && pd.duNoQH != null ? +pd.duNoQH : (+r[11]||0);
    const laiQH = pd && pd.laiQH != null ? +pd.laiQH : 0;
    const kieu = pd ? String(pd.kieuQH||'').toLowerCase() : '';
    const kieuChip = pd ? (
      /g[ốo]c.*l[ãa]i|l[ãa]i.*g[ốo]c/.test(kieu) ? '<span class="chip chip-red" title="Quá hạn cả Gốc và Lãi">Gốc+Lãi</span>'
      : /l[ãa]i/.test(kieu) ? '<span class="chip chip-orange" title="Chỉ quá hạn Lãi (gốc HĐ chưa đến hạn)">Lãi</span>'
      : '<span class="chip chip-red">Gốc</span>'
    ) : '';
    const laiQHCell = laiQH > 0
      ? `<td class="money" style="color:#b45309;font-weight:700" title="Lãi quá hạn (IPCAS inpd01)">${fmtMoney(laiQH)}</td>`
      : `<td class="money" style="color:var(--gray-400)">—</td>`;
    const duCell = duQH > 0
      ? `<td class="money big" style="color:var(--red)">${fmtMoney(duQH)}</td>`
      : `<td class="money" style="color:var(--gray-400);font-style:italic" title="Gốc HĐ chưa đến hạn">— (chỉ QH lãi)</td>`;
    return `<tr class="due-overdue">
      <td class="date"><strong style="color:var(--red)">${escapeHtml(ngayQHTxt)}</strong></td>
      <td style="text-align:center"><span class="chip chip-red">${days}d</span>${kieuChip?'<br>'+kieuChip:''}</td>
      <td style="text-align:left;padding-left:10px"><strong>${khLink(r[0], r[1], r[14], undefined, r[2])}</strong><br><small style="color:var(--gray-500)">${escapeHtml(fmtMaKH(r[0]))} · ${escapeHtml(r[2])}</small></td>
      ${duCell}
      ${laiQHCell}
      <td>${escapeHtml(r[12])}${pd ? `<br><button onclick="window.TD_PASTDUE.markCleared('${_pdKey(r)}')" title="Đánh dấu đã thu hết — ẩn khỏi Bảng VII" style="margin-top:4px;background:#16a34a;color:#fff;border:0;padding:2px 8px;border-radius:3px;cursor:pointer;font:600 10px system-ui">✓ Đã thu</button>` : ''}</td>
    </tr>`;
  }).join('') : '<tr><td colspan="6" style="text-align:center;padding:22px;color:var(--gray-500)">✅ Không có khoản quá hạn</td></tr>';

  // ═══════════════════════════════════════════════════════════════
  // BẢNG VIII — TOP 15 LÃI PHẢI THU
  // ═══════════════════════════════════════════════════════════════
  const topLai = rows.filter(r => {
    if ((Number(r[10]) || 0) <= 0) return false;
    const s = DATA.laidongStatus[laidongKey(r)] || {};
    if (s.dathu) return false;
    const d = parseVNDate(r[23]);
    return !d || d <= prevMonthEnd;
  }).sort((a,b) => (+b[10]||0) - (+a[10]||0));
  window.__TDPagedTbody('db-lai', 'tbody-db-lai', topLai, (r, i) => `
    <tr>
      <td class="date">${i+1}</td>
      <td style="text-align:left;padding-left:12px"><strong>${khLink(r[0], r[1], r[14], undefined, r[2])}</strong></td>
      <td class="date copy-cell" onclick="copyCellValue(this,event)" title="Click để copy MÃ KH">${escapeHtml(fmtMaKH(r[0]))}</td>
      <td class="date">${escapeHtml(r[2])}</td>
      <td>${loaiVayChip(r[13])}</td>
      <td class="date">${escapeHtml(r[23] || '(chưa có)')}</td>
      <td class="money">${fmtMoney(r[11])}</td>
      <td>${escapeHtml(r[12])}</td>
    </tr>
  `, '<tr><td colspan="8" style="text-align:center;padding:22px;color:var(--gray-500)">Không có khách hàng chưa nộp lãi đến cuối tháng trước</td></tr>', 8);
  setTimeout(updateTableTopScrollbars, 0);

  if (typeof _attachDashboardNav === "function") setTimeout(_attachDashboardNav, 150);
  try { tdDoiSoatStrip(); } catch (e) {} // HM-12
  try { tdWarnStrip(); } catch (e) {} // HM-25
  try { tdKpiStrip(); } catch (e) { console.warn('[kpi]', e); } // P06: thẻ KPI đầu trang
}


// ═══════════════════════════════════════════════════════════════
// INLINE-EDITABLE NUMERIC CELLS (HMTD, Số tiền GN, Dư nợ, Tiền lãi)
// Applies to QLTD / NH / TH tables. Click to edit, Enter/Esc/Blur to save.
// ═══════════════════════════════════════════════════════════════
function editableNumFocus(el) {
  // Khi focus: chuyển về số thô (bỏ dấu phân cách) để user gõ dễ
  const raw = String(el.textContent || '').replace(/[.,\s]/g, '');
  el.textContent = raw || '0';
  // Select all text for quick replace
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  el.dataset.orig = raw;
}
function editableNumKey(e, el) {
  if (e.key === 'Enter') {
    e.preventDefault();
    el.blur();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    el.textContent = el.dataset.orig || '0';
    el.blur();
  } else if (e.key === 'Tab') {
    // Allow Tab to move to next editable cell naturally
    // Save current first
    el.blur();
  }
}
function saveEditableNum(el) {
  const idx = parseInt(el.dataset.idx, 10);
  const col = parseInt(el.dataset.col, 10);
  if (isNaN(idx) || isNaN(col) || !DATA.qltd[idx]) return;
  // Parse input: strip everything non-digit/non-minus/non-dot
  const raw = String(el.textContent || '').replace(/[^\d.-]/g, '').trim();
  let val = parseFloat(raw);
  if (isNaN(val) || val < 0) val = 0;
  val = Math.round(val); // Đồng luôn là số nguyên
  const oldVal = Number(DATA.qltd[idx][col]) || 0;
  DATA.qltd[idx][col] = val;
  // Reformat hiển thị
  el.textContent = fmtMoney(val);
  if (val !== oldVal) {
    markUnsaved();
    // Nhẹ nhàng highlight flash để xác nhận đã lưu
    el.style.background = '#d5f5e3';
    setTimeout(() => { el.style.background = ''; }, 500);
    // Re-render tfoot and KPI (costly but ok for occasional edits)
    if (typeof activeTable !== 'undefined' && ['qltd','kd','td'].includes(activeTable)) {
      // Only re-render tfoot (cheap), not entire table to keep focus/selection
      const rows = getFilteredData(activeTable);
      renderTfoot(activeTable, rows);
    }
    // ✅ PRO-39 FIX #1: Mark phidv cần refresh nếu sửa Số tiền GN (col 9) hoặc Dư nợ (col 11)
    // Lazy refresh: chỉ render khi user mở lại page Phí GN (tránh lag mỗi lần edit)
    if (col === 9 || col === 11) {
      window._phidvNeedsRefresh = true;
    }
    // ✅ KEY SYNC FIX: phidvGetRowKey dùng r[9] làm key — khi r[9] thay đổi, key cũ mất trạng thái
    // → Tự động migrate DATA.phidvStatus từ key cũ sang key mới để không mất da_bao / mucphi
    if (col === 9 && val !== oldVal && DATA.phidvStatus) {
      const r = DATA.qltd[idx];
      const oldKey = `${String(r[0]||'')}_${String(r[6]||'')}_${oldVal}`;
      const newKey = `${String(r[0]||'')}_${String(r[6]||'')}_${val}`;
      if (DATA.phidvStatus[oldKey] !== undefined) {
        DATA.phidvStatus[newKey] = DATA.phidvStatus[oldKey];
        delete DATA.phidvStatus[oldKey];
      }
    }
  }
}
