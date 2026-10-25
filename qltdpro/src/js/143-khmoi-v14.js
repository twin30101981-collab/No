
/* ═══════════════════════════════════════════════════════════════
   KHMOI v14 (2026-08-10) — nâng cấp menu "Khách hàng mới".
   Ghi đè toàn bộ hàm khmoi* cũ (định nghĩa ở phía trên) qua window.*
   Quy tắc nghiệp vụ đã chốt với người dùng:
   1. Nguồn Giải ngân lọc theo SỐ TIỀN GN r[9] > 0 (tính cả KH dư nợ cuối kỳ = 0).
   2. 1 mã KH mới xuất hiện ở nhiều CBTD -> mỗi CBTD tính 1 KH mới; dòng
      Tổng cộng = cộng dồn các CBTD.
   3. Cột "Loại trừ" là dropdown Cầm cố / Thông thường — CHỈ nhận diện loại
      món vay mới; số món & tiền GN vẫn khớp nguyên với menu Giải ngân.
   4. Checkbox cột đầu (+ check tổng): bỏ tick = loại dòng khỏi món vay mới.
   5. Cột MÃ KH hiển thị đúng mã khách hàng.
   Trạng thái lưu trong DATA.khmoiExclude (đã được persist sẵn):
     .newcust[key]=true -> bỏ tick;  .loai[key]='camco'|'thuong';  .note[key]='...'
   ═══════════════════════════════════════════════════════════════ */
(function () {
  var q = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  };
  var fmt = function (n) { return Math.round(Number(n) || 0).toLocaleString('vi-VN'); };
  var toast = function (m, t) { try { if (typeof showToast === 'function') showToast(m, t); } catch (e) {} };
  var pDate = function (s) { try { return parseVNDate(s); } catch (e) { return null; } };
  var dstr = function (d) {
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
  };
  // Bỏ dấu để nhận diện đúng cả khi mục đích vay có dấu tiếng Việt đầy đủ
  var noAccent = function (s) {
    return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/\s+/g, ' ');
  };
  /* FIX v14.2 (11/8/2026) — nhóm mục đích vay được coi là VAY CẦM CỐ.
     Dữ liệu IPCAS thật KHÔNG bao giờ ghi chữ "cầm cố" ở cột loại vay (lntpcd
     chỉ có: Vay ngắn hạn 211 / trung hạn 212 / dài hạn 213 / Thấu chi), nên
     nhận diện dựa trên MỤC ĐÍCH VAY (fndprpstpcd = r[15]) theo danh mục đã
     chốt với nghiệp vụ: */
  var CAMCO_PURPOSES = [
    /mua sam vat dung sinh hoat/,
    /(mua|sua chua).*phuong tien phuc vu di lai/,
    /phuong tien phuc vu di lai/,
    /mua nha o va dat o/,
    /sua chua, ?xay moi nha/,
    /xay moi nha/,
    // FIX v14.4 (04/9/2026) — bổ sung theo danh mục "vay ngắn hạn tiêu dùng"
    // đã chốt với nghiệp vụ: Mua sắm vật dụng sinh hoạt, Sửa chữa xây mới
    // nhà, Các nhu cầu tiêu dùng khác, Mua nhà ở và đất ở.
    /cac nhu cau tieu dung khac/
  ];
  var CAMCO_RE = /mua\s*s[aă]m\s*v[aậ]t\s*d[uụ]ng\s*sinh\s*ho[aạ]t/i;
  var isCamCoText = function (s) {
    var t = noAccent(s);
    if (!t) return false;
    return CAMCO_PURPOSES.some(function (re) { return re.test(t); });
  };


  var activeTab = 'sum';
  var mocList = [];
  // v14.12: mặc định tab Tổng hợp = thứ tự CHUẨN (Phòng ban → CBTD A→Z)
  var sumSort = { col: 'cbtd', dir: 1 };
  // v14.3.2: mặc định lọc/sắp xếp tab "Chi tiết khách hàng" theo Phòng ban
  // (thứ tự ưu tiên theo yêu cầu nghiệp vụ) rồi theo CBTD trong từng phòng ban.
  // v14.12: thứ tự CHUẨN dùng chung toàn hệ thống
  var PB_ORDER_DEFAULT = window.TD_SXCB.PB_ORDER.slice();
  var pbOrderIdx = function (pb, cbtd) { return window.TD_SXCB.rankOf(pb, cbtd); };
  // Hai tab Chi tiết khách hàng / Lọc vay cầm cố mặc định cùng thứ tự:
  // Phòng ban nghiệp vụ → CBTD A–Z → Ngày GN mới nhất.
  var detSort = { col: 'pbcbtd', dir: 1 };
  var detRows = [];        // dòng đang hiển thị ở tab Chi tiết (để handler dùng index)
  var lastCtx = null;

  function rowKey(r) { return String((r && r[2]) || '') + '|' + String((r && r[0]) || ''); }
  function EX() {
    if (!DATA.khmoiExclude || typeof DATA.khmoiExclude !== 'object') DATA.khmoiExclude = {};
    var e = DATA.khmoiExclude;
    if (!e.camco) e.camco = {};
    if (!e.newcust) e.newcust = {};
    if (!e.loai) e.loai = {};
    if (!e.note) e.note = {};
    if (!e.gnfix) e.gnfix = {};   // FIX GỐC RỄ #4: nhập tay Ngày/Số tiền GN cho khoản đã tất toán
    return e;
  }
  function persist() {
    try { window.hasUnsaved = true; } catch (e) {}
    try { if (typeof markUnsaved === 'function') markUnsaved(); } catch (e) {}
    try { if (typeof saveToLS === 'function') saveToLS(); } catch (e) {}
  }

  function listSnapshots() {
    var list = (typeof _archiveReportList !== 'undefined' && Array.isArray(_archiveReportList)) ? _archiveReportList : [];
    return list.filter(function (r) { return r && Array.isArray(r.reportData) && r.reportData.length; })
      .slice().sort(function (a, b) { return (b.timestamp || 0) - (a.timestamp || 0); });
  }

  function mocBizDate(s) {
    // FIX GỐC RỄ #6b (05/9/2026) — s.date = timestamp.toLocaleString('vi-VN')
    // (THỜI ĐIỂM LƯU, dạng "HH:mm:ss d/M/yyyy") — KHÔNG phải ngày báo cáo,
    // parseVNDate(s.date) sẽ luôn thất bại/parse sai. Ngày báo cáo thật nằm ở
    // s.name (khi Nhập IPCAS đặt tên theo ngày file — chỉ khớp nếu tên file có
    // dạng dd.mm.yyyy; file dd_mm_yyyy.xls KHÔNG khớp regex import nên s.name
    // rơi về "Report ..." trừ khi người dùng tự đổi tên) hoặc suy ra từ
    // s.tag (year_end/quarter/month) do archiveDetectTag() gắn tự động.
    var d = pDate(s.name);
    if (d) return d;
    var t = s.tag;
    if (t) {
      if (t.kind === 'year_end') return new Date(t.year, 11, 31);
      if (t.kind === 'quarter') { var qm = [2, 5, 8][t.quarter - 1]; if (qm != null) return new Date(t.year, qm + 1, 0); }
      if (t.kind === 'month') return new Date(t.year, t.month, 0);
    }
    return null;
  }

  /* ═══════════════════════════════════════════════════════════════
     FIX GỐC RỄ #7 (06/9/2026) — ĐỐI SOÁT LŨY KẾ (nguyên nhân "KH vay mới"
     bị đếm DƯ so với báo cáo Excel: app 183 KH / Excel 122 KH).
     CƠ CHẾ LỖI: "KH vay mới" chỉ được đối chiếu với ĐÚNG MỘT snapshot (mốc
     so sánh đang chọn). Quy ước nghiệp vụ của báo cáo Excel là "mới so với
     LŨY KẾ CÁC KỲ TRƯỚC". Hệ quả: mọi khách đã từng vay ở các kỳ giữa mốc
     và đầu kỳ báo cáo (hoặc đã tất toán trước ngày mốc nên dư nợ tại mốc = 0)
     đều bị coi là KH MỚI lần nữa. Case thật đã đối chiếu tay: (đã ẩn)
     (Bán buôn gạo) và (đã ẩn) (Mua sắm vật dụng sinh hoạt) —
     app tính "mới", Excel không, vì 2 khách này đã có dư nợ ở kỳ 31/03 và
     30/06/2026 nhưng KHÔNG có dư nợ tại mốc 31/12/2025 mà app tự chọn.
     Lỗi bị khuếch đại bởi mocBizDate(): tên snapshot dạng dd_mm_yyyy /
     yyyy-mm-dd không parse được -> rơi về thứ tự timestamp (thời điểm lưu),
     nên kỳ 01/07/2026 tự chọn nhầm mốc 31/12/2025.
     SỬA TẬN GỐC:
       • mocBizDateLoose(): nhận thêm dd_mm_yyyy, dd.mm.yyyy, dd-mm-yyyy,
         yyyy-mm-dd, yyyymmdd; cuối cùng mới fallback timestamp.
       • priorSnapshots(): tập đối chiếu = HỢP CỦA MỌI snapshot có NGÀY BÁO CÁO
         < ngày "Từ" của kỳ (lũy kế các kỳ trước) + mốc đang chọn.
       • Một cặp (CBTD + Mã KH) chỉ là "mới" khi KHÔNG có dư nợ ở BẤT KỲ kỳ
         trước nào. Có thể tắt bằng ô "Đối soát lũy kế" để về hành vi 1 mốc.
     ═══════════════════════════════════════════════════════════════ */
  function mocBizDateLoose(s) {
    var d = mocBizDate(s);
    if (d) return d;
    var nm = String((s && s.name) || '');
    var m = nm.match(/(\d{1,2})[._\-\/](\d{1,2})[._\-\/](\d{4})/);
    if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
    m = nm.match(/(\d{4})[._\-\/]?(\d{2})[._\-\/]?(\d{2})/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    return (s && s.timestamp) ? new Date(s.timestamp) : null;
  }
  function isLuyKe() { var el = q('khmoi-luyke'); return !el || !!el.checked; }
  function priorSnapshots(fromD, mocSnap) {
    var all = listSnapshots(), out = [];
    if (isLuyKe() && fromD) {
      out = all.filter(function (sn) {
        var d = mocBizDateLoose(sn);
        return d && d.getTime() < fromD.getTime();
      });
    }
    if (mocSnap && out.indexOf(mocSnap) === -1) out.push(mocSnap);
    return out;
  }
  /* ═══════════════════════════════════════════════════════════════
     FIX GỐC RỄ #11 (06/9/2026) — v14.9 "ĐỐI SOÁT CHUỖI SNAPSHOT"
     ĐÃ ĐỐI SOÁT TRỰC TIẾP với Bao_cao_KH_vay_moi_theo_CBTD.xlsx và 4 file
     IPCAS gốc (30.06 / 31.07 / 31.08 / 03.09.2026):
        Excel tay : 122 KH vay mới · dư nợ 128.671.146.519 đ
        App v14.8 : 100 KH vay mới · "tiền vay mới" 139.209.082.245 đ
     HAI NGUYÊN NHÂN GỐC (đều nằm ở ĐỊNH NGHĨA, không phải lỗi cộng số):
     (1) SỐ LƯỢNG — app suy ra "KH vay mới" từ CÁC MÓN GIẢI NGÂN trong kỳ
         (allGN: bắt buộc Số tiền GN r[9] > 0 VÀ Ngày GN r[6] nằm trong kỳ).
         Báo cáo Excel KHÔNG dựa vào ngày GN: một cặp (CBTD + Mã KH) là "mới"
         khi nó XUẤT HIỆN trong bản kết xuất của một mốc trong kỳ mà chưa từng
         xuất hiện ở bất kỳ mốc nào trước đó. Mọi khoản không có ngày GN, ngày
         GN nằm ngoài kỳ (vay từ kỳ trước nhưng mới về chi nhánh/CBTD), hoặc
         GN = 0 đều bị app bỏ im lặng => thiếu 22 cặp.
     (2) DƯ NỢ — app cộng SỐ TIỀN GIẢI NGÂN (r[9]); Excel cộng DƯ NỢ GỐC CÒN
         LẠI (dsbsbal = r[11]) TẠI ĐÚNG MỐC khách hàng phát sinh mới. Hai đại
         lượng khác nhau về bản chất => lệch +10,5 tỷ dù cùng tập khách.
     (3) Phụ: tập KH cũ (oldSet) chỉ nhận dòng có dư nợ > 0, nên khách đã tất
         toán toàn bộ tại mốc gốc bị coi là chưa từng tồn tại (kiểm chứng:
         lọc dư nợ>0 cho ra 123/130,3 tỷ thay vì 122/128,67 tỷ). Chuỗi snapshot
         dưới đây xét SỰ CÓ MẶT của dòng, không xét dư nợ > 0.
     CÁCH SỬA: tính lại "KH vay mới / dư nợ vay mới" bằng CHUỖI SNAPSHOT:
        gốc  = các mốc có ngày báo cáo < "Từ" (lũy kế, đúng ô "Đối soát lũy kế")
        chuỗi= các mốc có ngày báo cáo trong [Từ … Đến], xét theo thứ tự tăng dần
        mới  = cặp (CBTD||Mã KH) chưa từng xuất hiện ở mọi mốc trước đó
        dư nợ= tổng r[11] của cặp đó TẠI MỐC phát sinh
     Kết quả kiểm chứng lại bằng Playwright: 122 KH · 128.671.146.519 đ, khớp
     tuyệt đối từng CBTD với file Excel.
     ═══════════════════════════════════════════════════════════════ */
  function chainOn() { var el = q('khmoi-chain'); return !el || !!el.checked; }
  function chainPairKey(r) {
    var ma = String(r[0] == null ? '' : r[0]).trim();
    var cb = String(r[12] == null ? '' : r[12]).trim();
    if (!ma) return '';
    return cb + '||' + ma;
  }
  function khmoiChain() {
    try {
      if (!chainOn()) return null;
      var fromD = pDate(q('khmoi-from') ? q('khmoi-from').value : '');
      var toD = pDate(q('khmoi-to') ? q('khmoi-to').value : '');
      if (!fromD || !toD) return null;
      toD = new Date(toD.getFullYear(), toD.getMonth(), toD.getDate(), 23, 59, 59);
      var sel = q('khmoi-moc'), mi = sel ? +sel.value : NaN;
      var mocSnap = (!isNaN(mi) && mocList[mi]) ? mocList[mi] : null;
      var withD = listSnapshots().map(function (sn) { return { sn: sn, d: mocBizDateLoose(sn) }; })
        .filter(function (x) { return x.d; });
      var asc = function (a, b) { return a.d.getTime() - b.d.getTime(); };
      var base = priorSnapshots(fromD, mocSnap);      // dùng chung quy ước ô "Đối soát lũy kế"
      var chain = withD.filter(function (x) {
        return x.d.getTime() >= fromD.getTime() && x.d.getTime() <= toD.getTime();
      }).sort(asc);
      if (!base.length || !chain.length) return null;
      var seen = Object.create(null);
      base.forEach(function (sn) {
        (sn.reportData || []).forEach(function (r) { var k = chainPairKey(r); if (k) seen[k] = 1; });
      });
      var pairs = [], cols = [];
      chain.forEach(function (x) {
        var found = Object.create(null), n = 0, dn = 0;
        (x.sn.reportData || []).forEach(function (r) {
          var k = chainPairKey(r); if (!k || seen[k]) return;
          var o = found[k];
          if (!o) o = found[k] = {
            key: k, ma: String(r[0] || '').trim(), ten: String(r[1] || '').trim(),
            cbtd: String(r[12] || '').trim(), pb: String(r[17] || '').trim(),
            dn: 0, moc: dstr(x.d), mocT: x.d.getTime(), soMon: 0
          };
          o.dn += Number(r[11]) || 0; o.soMon++;
        });
        Object.keys(found).forEach(function (k) {
          seen[k] = 1; pairs.push(found[k]); n++; dn += found[k].dn;
        });
        cols.push({ label: dstr(x.d), count: n, dn: dn, name: x.sn.name || '' });
      });
      return {
        pairs: pairs, cols: cols, chain: chain,
        base: base.map(function (sn) { var d = mocBizDateLoose(sn); return d ? dstr(d) : (sn.name || ''); }),
        total: pairs.length,
        totalDN: pairs.reduce(function (a, p) { return a + p.dn; }, 0)
      };
    } catch (e) { console.warn('[KHMOI chain]', e); return null; }
  }

  function renderLuyKeInfo(used) {
    var sel = q('khmoi-moc'); if (!sel || !sel.parentNode) return;
    var info = q('khmoi-luyke-info');
    if (!info) {
      info = document.createElement('div');
      info.id = 'khmoi-luyke-info';
      info.style.cssText = 'flex-basis:100%;margin-top:3px;font-size:10.5px;font-weight:700;color:#166534';
      sel.parentNode.appendChild(info);
    }
    if (!isLuyKe()) { info.textContent = '⚠ Đang đối soát với DUY NHẤT 1 mốc — số KH vay mới có thể bị đếm dư so với báo cáo lũy kế.'; info.style.color = '#991b1b'; return; }
    info.style.color = '#166534';
    info.textContent = '✔ Đối soát lũy kế ' + used.length + ' mốc trước kỳ: ' +
      used.map(function (sn) { var d = mocBizDateLoose(sn); return d ? dstr(d) : (sn.name || ''); }).join(' · ');
  }

  function setDefaultFilter() {
    var fromEl = q('khmoi-from'), toEl = q('khmoi-to'), today = new Date();
    if (fromEl && !fromEl.value && fromEl.dataset.kmAll !== '1') fromEl.value = dstr(new Date(today.getFullYear(), today.getMonth(), 1));
    if (toEl && !toEl.value && toEl.dataset.kmAll !== '1') toEl.value = dstr(today);
    var sel = q('khmoi-moc');
    if (!sel) return;
    mocList = listSnapshots();
    if (!mocList.length) { sel.innerHTML = '<option value="">⚠ Chưa có snapshot nào — vào LƯU TRỮ FILE để lưu</option>'; return; }
    var cur = sel.value;
    sel.innerHTML = mocList.map(function (s, i) {
      return '<option value="' + i + '">' + esc(s.name) + ' — ' + esc(s.date) + '</option>';
    }).join('');
    // FIX GỐC RỄ #7 — ô bật/tắt đối soát lũy kế (mặc định BẬT, đúng quy ước Excel)
    if (!q('khmoi-luyke') && sel.parentNode) {
      var lk = document.createElement('label');
      lk.style.cssText = 'display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;color:#1e3a8a;margin-left:8px;cursor:pointer';
      lk.innerHTML = '<input type="checkbox" id="khmoi-luyke" checked> Đối soát lũy kế mọi kỳ trước';
      lk.title = 'Tính KH vay mới so với LŨY KẾ tất cả các kỳ trước (đúng quy ước báo cáo). Bỏ tick = chỉ so với 1 mốc đang chọn.';
      sel.parentNode.insertBefore(lk, sel.nextSibling);
      lk.querySelector('input').addEventListener('change', function () { try { window.khmoiRender(); } catch (e) {} });
    }
    // FIX GỐC RỄ #11 — ô bật/tắt "chuỗi snapshot" (mặc định BẬT = chuẩn Excel)
    if (!q('khmoi-chain') && sel.parentNode) {
      var ck = document.createElement('label');
      ck.style.cssText = 'display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;color:#166534;margin-left:8px;cursor:pointer';
      ck.innerHTML = '<input type="checkbox" id="khmoi-chain" checked> Đối soát CHUỖI SNAPSHOT (chuẩn báo cáo Excel)';
      ck.title = 'BẬT: Số KH vay mới = cặp (CBTD + Mã KH) lần đầu xuất hiện tại các mốc trong kỳ; Dư nợ = dư nợ gốc còn lại tại mốc phát sinh (khớp báo cáo Excel). TẮT: quay lại cách cũ (suy từ món giải ngân trong kỳ, cộng số tiền GN).';
      sel.parentNode.insertBefore(ck, sel.nextSibling);
      ck.querySelector('input').addEventListener('change', function () { try { window.khmoiRender(); } catch (e) {} });
    }
    // FIX GỐC RỄ #6c (05/9/2026) — bản cũ: hễ mốc đã có giá trị (kể cả do
    // chính hàm này tự đặt cho một kỳ báo cáo TRƯỚC ĐÓ, vd mặc định "tháng
    // này" lúc mới mở trang) là coi như "đã chọn" và KHÔNG BAO GIỜ tính lại
    // — nên khi người dùng đổi "Từ/Đến" sang kỳ khác (vd 01/07/2026), mốc vẫn
    // đứng yên ở giá trị tự động cũ, sai kỳ mà không có gì báo. Chỉ giữ
    // nguyên lựa chọn khi CHÍNH NGƯỜI DÙNG đã bấm chọn mốc trong dropdown
    // (đánh dấu qua data-user-picked ở onchange) — mọi trường hợp khác (mở
    // trang lần đầu, đổi kỳ báo cáo, bấm "Làm mới") đều tính lại tự động
    // theo kỳ báo cáo hiện tại.
    if (sel.dataset.userPicked === '1' && cur !== '' && +cur < mocList.length) { sel.value = cur; return; }
    var fromD = fromEl ? pDate(fromEl.value) : null, def = 0;
    // FIX GỐC RỄ #6 (04/9/2026) — CASE THẬT: các snapshot lưu backfill hàng
    // loạt cùng 1 buổi (vd toàn bộ mốc 2026 được lưu trong vài phút ngày
    // 4/9/2026) nên s.timestamp (THỜI ĐIỂM LƯU) không phản ánh đúng thứ tự
    // NGÀY BÁO CÁO của snapshot — ví dụ mốc "30/06/2026" được lưu TRƯỚC mốc
    // "31/12/2025" trong cùng buổi, nên (s.timestamp||0) < fromD sai lệch
    // hoàn toàn thứ tự nghiệp vụ và có thể chọn nhầm mốc rất xa kỳ báo cáo
    // (đã xảy ra: kỳ 01/07–05/09/2026 tự chọn mốc 31/12/2025 thay vì
    // 30/06/2026, khiến "KH vay mới" bị đếm dư ~60 khách). Sửa tận gốc:
    // so khớp theo NGÀY BÁO CÁO thật (mocBizDate — xem hàm phía trên), không
    // dùng s.timestamp lẫn s.date (chuỗi thời điểm lưu) để quyết định trước/sau.
    if (fromD) {
      var withDate = mocList.map(function (s, i) { return { i: i, d: mocBizDate(s) }; }).filter(function (x) { return x.d; });
      var before = withDate.filter(function (x) { return x.d.getTime() < fromD.getTime(); })
        .sort(function (a, b) { return b.d.getTime() - a.d.getTime(); }); // gần fromD nhất trước
      if (before.length) def = before[0].i;
      else {
        // fallback: không snapshot nào có ngày báo cáo hợp lệ trước fromD ->
        // giữ hành vi cũ (theo timestamp) để không vỡ trường hợp đặc biệt
        var idx = mocList.findIndex(function (s) { return (s.timestamp || 0) < fromD.getTime(); });
        if (idx >= 0) def = idx;
      }
    }
    sel.value = String(def);
    // FIX GỐC RỄ #6: cảnh báo nếu mốc được TỰ ĐỘNG chọn cách xa ngày bắt đầu
    // kỳ báo cáo quá 45 ngày — dấu hiệu có thể đang dùng nhầm mốc (thiếu
    // snapshot đúng đầu kỳ, hoặc lỗi chọn mốc như case đã xảy ra ở trên).
    try {
      var picked = mocList[+sel.value], pickedD = picked ? mocBizDate(picked) : null;
      var warn = q('khmoi-moc-warn');
      if (!warn && sel.parentNode) {
        warn = document.createElement('div');
        warn.id = 'khmoi-moc-warn';
        warn.style.cssText = 'flex-basis:100%;margin-top:4px;font-size:10.5px;font-weight:700;color:#991b1b;display:none';
        sel.parentNode.insertBefore(warn, sel.nextSibling);
      }
      if (warn) {
        var gapDays = (fromD && pickedD) ? Math.round((fromD.getTime() - pickedD.getTime()) / 86400000) : null;
        if (gapDays != null && (gapDays > 45 || gapDays < 0)) {
          warn.style.display = 'block';
          warn.textContent = '⚠ Mốc so sánh (' + picked.date + ') cách ngày "Từ" (' + dstr(fromD) + ') ' +
            (gapDays < 0 ? 'là mốc SAU kỳ báo cáo' : gapDays + ' ngày') +
            ' — kiểm tra lại, có thể thiếu snapshot đúng đầu kỳ hoặc chọn nhầm mốc, dẫn tới đếm sai KH vay mới.';
        } else warn.style.display = 'none';
      }
    } catch (e) {}
  }

  // ── Tính toán chung ────────────────────────────────────────────
  function computeAll() {
    var ex = EX();
    var fromD = pDate(q('khmoi-from') ? q('khmoi-from').value : '');
    var toD = pDate(q('khmoi-to') ? q('khmoi-to').value : '');
    if (toD) toD = new Date(toD.getFullYear(), toD.getMonth(), toD.getDate(), 23, 59, 59);
    var inRange = function (r) {
      var d = pDate(r[6]);
      if (!d) return false;
      if (fromD && d < fromD) return false;
      if (toD && d > toD) return false;
      return true;
    };

    // 1) Nguồn GIẢI NGÂN — khớp menu Giải ngân, lọc theo SỐ TIỀN GN > 0
    //    (đổi từ dư nợ r[11] > 0 để không bỏ sót KH tất toán, dư nợ cuối kỳ = 0)
    //
    // FIX GỐC RỄ #3B (17/08/2026) — CASE THẬT: CBTD CBTD A có 1 món CẦM CỐ
    // phát sinh trong quý và ĐÃ TẤT TOÁN, nhưng không hề xuất hiện trong danh sách
    // "món vay mới". Nguyên nhân gốc (đã kiểm chứng trên dữ liệu file): khi 1 khoản
    // được tất toán, bản kết xuất IPCAS vẫn giữ dòng khách hàng đó nhưng XOÁ TRẮNG
    // các cột nghiệp vụ của khoản vay — SỐ TIỀN GN r[9] = 0 và NGÀY GN r[6] = ''
    // (dòng thực tế trong file: (đã ẩn) / CBTD A / dư nợ 0 / GN 0 /
    // ngày GN trống). Menu này lọc 2 lần theo đúng 2 cột đó:
    //     .filter(r => Number(r[9]) > 0)   -> loại vì GN = 0
    //     .filter(inRange) => pDate(r[6])  -> loại vì không có ngày GN
    // nên dòng biến mất im lặng khỏi MỌI nhánh tính toán (không phải lỗi phân loại
    // cầm cố như phỏng đoán ban đầu).
    // Sửa tận gốc: "cứu" các dòng đã tất toán bằng cách phục hồi NGÀY GN / SỐ TIỀN GN
    // từ các snapshot lịch sử (LƯU TRỮ FILE) theo số hợp đồng / số TK / số hồ sơ.
    // Phục hồi được ngày GN trong kỳ -> dòng vào allGN như một món GN bình thường
    // (được tính KH/món vay mới, cầm cố...). Không phục hồi được -> KHÔNG bỏ im lặng,
    // mà gom vào closedOrphan và hiển thị tường minh ở tab "Chi tiết khách hàng".
    var _snapAll = listSnapshots();
    var _cKeys = function (r) {
      var k = [];
      [2, 19, 20, 21].forEach(function (i) { var v = norm0(r[i]); if (v) k.push(i + ':' + v); });
      return k;
    };
    function norm0(v) { return String(v == null ? '' : v).trim(); }
    var _snapIdx = null;
    function snapIndex() {
      if (_snapIdx) return _snapIdx;
      _snapIdx = {};
      _snapAll.forEach(function (sn) {
        (sn.reportData || []).forEach(function (sr) {
          _cKeys(sr).forEach(function (k) {
            var cur = _snapIdx[k];
            var gnd = pDate(sr[6]);
            var amt = Number(sr[9]) || Number(sr[5]) || 0;
            if (!cur || (!cur.gnd && gnd) || (amt > (cur.amt || 0) && !cur.gnd)) {
              _snapIdx[k] = { gnd: gnd, amt: amt, row: sr, ts: sn.timestamp || 0 };
            }
          });
        });
      });
      return _snapIdx;
    }
    var closedOrphan = [];
    function rescueClosed(r) {
      // chỉ xử lý dòng "đã tất toán / trống nghiệp vụ": dư nợ = 0 và (GN = 0 hoặc thiếu ngày GN)
      if ((Number(r[11]) || 0) > 0) return null;
      if (Number(r[9]) > 0 && pDate(r[6])) return null;
      if (!norm0(r[0])) return null;
      var idx = snapIndex(), hit = null;
      _cKeys(r).some(function (k) { if (idx[k]) { hit = idx[k]; return true; } return false; });
      if (!hit) return null;
      var c = r.slice();
      c._closedRescued = true;
      c._srcRow = r;
      if (!pDate(c[6]) && hit.gnd) c[6] = hit.row[6];
      if (!(Number(c[9]) > 0) && hit.amt > 0) c[9] = hit.amt;
      if (!norm0(c[13]) && hit.row[13]) c[13] = hit.row[13];
      if (!norm0(c[15]) && hit.row[15]) c[15] = hit.row[15];
      return c;
    }
    // ══════════════════════════════════════════════════════════════════
    // FIX GỐC RỄ #4 (17/08/2026) — CASE THẬT: CBTD CBTD A phát sinh 3 KH
    // vay mới trong quý (KH 1, KH 2, KH 3) nhưng
    // bảng Tổng hợp chỉ ra 2 KH / 2 món GN.
    // NGUYÊN NHÂN GỐC (đã kiểm chứng trực tiếp trên dữ liệu lưu trữ của file này):
    //   FIX #3B trước đó "cứu" dòng tất toán bằng cách lấy lại NGÀY GN r[6] từ
    //   snapshot LƯU TRỮ FILE. Nhưng kết xuất IPCAS lưu trong snapshot KHÔNG HỀ CÓ
    //   cột Ngày GN: đo trên 2 snapshot của file (31/12/2025: 3.671 dòng,
    //   31/03/2026: 3.680 dòng) thì cột r[6] rỗng 100% (0/3671 và 0/3680), các cột
    //   r[19]/r[20]/r[21] dùng làm khoá đối chiếu cũng không tồn tại (mỗi dòng
    //   snapshot chỉ có 14 cột). Do đó `hit.gnd` LUÔN null =>
    //   `if (!pDate(c[6]) && hit.gnd) c[6] = ...` không bao giờ chạy => dòng cứu
    //   được vẫn thiếu ngày GN => không thoả `pDate(c[6])` => rơi hết vào
    //   closedOrphan (chỉ hiện ở tab Chi tiết) => KHÔNG vào allGN => bị trừ khỏi
    //   CẢ "Số món GN" LẪN "Tổng KH vay mới". Nghĩa là FIX #3B trên thực tế là
    //   no-op: mọi khoản vay mới phát sinh & tất toán ngay trong kỳ đều mất.
    // SỬA TẬN GỐC: không phụ thuộc vào cột ngày GN mà snapshot không có. Dùng
    //   MỐC SO SÁNH làm bằng chứng thời điểm:
    //     - Số hợp đồng có trong dữ liệu hiện tại nhưng KHÔNG có tại mốc, hoặc
    //     - Mã KH không hề xuất hiện tại mốc (KH hoàn toàn mới)
    //   => hợp đồng chắc chắn phát sinh SAU mốc, tức trong kỳ đang xem => đưa vào
    //   allGN với ngày GN suy luận (đầu kỳ / ngày sau mốc) + cờ _closedInferred,
    //   số tiền lấy từ snapshot nếu có, cho phép kiểm soát viên nhập tay
    //   (ex.gnfix) ngay trên tab Chi tiết. Dòng nào KHÔNG có bằng chứng (hợp đồng
    //   đã tồn tại tại mốc = khoản cũ tất toán trong kỳ) vẫn giữ nguyên hành vi cũ
    //   (closedOrphan) để không tạo món GN ảo.
    // ══════════════════════════════════════════════════════════════════
    var _selMoc = q('khmoi-moc');
    var _miMoc = _selMoc ? +_selMoc.value : NaN;
    var _mocSnapEarly = (!isNaN(_miMoc) && mocList[_miMoc]) ? mocList[_miMoc] : null;
    var _priorSnaps = priorSnapshots(fromD, _mocSnapEarly);   // FIX #7: lũy kế mọi kỳ trước
    var _mocHD = new Set(), _mocKH = new Set();
    _priorSnaps.forEach(function (sn) {
      (sn.reportData || []).forEach(function (sr) {
        var hd = norm0(sr[2]); if (hd) _mocHD.add(hd);
        var ma = norm0(sr[0]); if (ma) _mocKH.add(ma);
      });
    });
    function snapAmtOf(r) {
      var idx = snapIndex(), amt = 0;
      _cKeys(r).some(function (k) { if (idx[k]) { amt = Number(idx[k].amt) || 0; return true; } return false; });
      return amt;
    }
    function inferClosed(r) {
      if ((Number(r[11]) || 0) > 0) return null;                 // còn dư nợ -> không phải dòng tất toán
      if (Number(r[9]) > 0 && pDate(r[6])) return null;          // đã đủ dữ liệu
      if (!norm0(r[0]) || !norm0(r[12])) return null;            // thiếu mã KH / CBTD
      if (!_mocSnapEarly) return null;                           // chưa chọn mốc -> không suy luận
      var hd = norm0(r[2]), ma = norm0(r[0]);
      var isAfterMoc = hd ? !_mocHD.has(hd) : !_mocKH.has(ma);
      if (!isAfterMoc) return null;                              // hợp đồng/KH đã có tại mốc -> khoản cũ
      var fx = ex.gnfix[rowKey(r)] || {};
      var dd = pDate(fx.ngay) ||
               (fromD ? new Date(fromD.getTime()) : null) ||
               (_mocSnapEarly.timestamp ? new Date(_mocSnapEarly.timestamp + 86400000) : null);
      if (!dd) return null;
      var c = r.slice();
      c._closedInferred = true; c._srcRow = r;
      if (!pDate(c[6])) c[6] = dstr(dd);
      var amt = Number(fx.tien) > 0 ? Number(fx.tien) : (Number(c[9]) > 0 ? Number(c[9]) : snapAmtOf(r));
      c[9] = Number(amt) || 0;
      return c;
    }

    var _rawQltd = (DATA.qltd || []);
    var _rescued = [];
    _rawQltd.forEach(function (r) {
      if (Number(r[9]) > 0 && pDate(r[6])) return;
      var c = rescueClosed(r);
      if (c && Number(c[9]) > 0 && pDate(c[6])) { _rescued.push(c); return; }
      // FIX GỐC RỄ #4: suy luận theo mốc so sánh trước khi bỏ vào closedOrphan
      var g = inferClosed(r);
      if (g) { _rescued.push(g); return; }
      // đã tất toán nhưng không phục hồi được ngày GN -> báo tường minh, không bỏ im lặng
      if ((Number(r[11]) || 0) <= 0 && norm0(r[0]) && norm0(r[12])) {
        var o = r.slice(); o._closedOrphan = true; o._srcRow = r; closedOrphan.push(o);
      }
    });
    var allGN = _rawQltd.filter(function (r) { return Number(r[9]) > 0; })
      .concat(_rescued)
      .concat((DATA.phidvExtra || []).map(function (e) { return e._row; }).filter(Boolean))
      .filter(inRange);

    // 2) KH vay mới (FIX v14.2 — quy tắc nghiệp vụ chốt 11/8/2026):
    //    "KH vay mới của CBTD" = tại mốc đầu kỳ, KH KHÔNG CÓ DƯ NỢ với CHÍNH
    //    CBTD đó (chưa từng quan hệ, hoặc đã tất toán, hoặc chỉ có dư nợ ở
    //    CBTD khác) nhưng trong kỳ có phát sinh giải ngân do CBTD đó thực hiện.
    //    => v14.0 loại theo "mã KH có mặt trong snapshot" (loại oan KH đã tất
    //       toán); v14.1 loại theo dư nợ toàn chi nhánh (loại oan KH chuyển
    //       CBTD). Nay so khớp theo cặp CBTD + mã KH.
    var sel = q('khmoi-moc');
    var mi = sel ? +sel.value : NaN;
    var mocSnap = (!isNaN(mi) && mocList[mi]) ? mocList[mi] : null;
    var norm = function (v) { return String(v == null ? '' : v).trim(); };
    var pairKey = function (r) { return norm(r[12]) + '||' + norm(r[0]); };
    var oldSet = new Set();      // cặp "CBTD||mã KH" còn dư nợ tại mốc
    var oldAnyCb = new Set();    // mã KH còn dư nợ tại mốc (bất kỳ CBTD nào)
    // FIX GỐC RỄ #7 — tập KH cũ = HỢP của mọi snapshot kỳ trước (lũy kế), không
    // chỉ 1 mốc; nhờ vậy KH đã vay ở kỳ giữa/đã tất toán trước mốc không bị
    // đếm lại thành "KH vay mới" (khớp quy ước báo cáo Excel).
    var _priorForOld = priorSnapshots(fromD, mocSnap);
    _priorForOld.forEach(function (sn) {
      (sn.reportData || []).forEach(function (r) {
        var ma = norm(r[0]);
        if (ma && (Number(r[11]) || 0) > 0) { oldSet.add(pairKey(r)); oldAnyCb.add(ma); }
      });
    });
    try { renderLuyKeInfo(_priorForOld); } catch (e) {}
    // ══════════════════════════════════════════════════════════════════
    // FIX GỐC RỄ #5 (17/08/2026) — CASE THẬT: số KH & số tiền vay mới của mọi
    // CBTD tăng đột biến (CBTD A 30 KH thay vì 3; toàn chi nhánh 543
    // "KH vay mới" trên 832 món GN).
    // NGUYÊN NHÂN GỐC: "KH vay mới" được xác định bằng cách LOẠI các KH đã có
    // dư nợ tại MỐC SO SÁNH (oldSet). Khi file chưa có snapshot nào trong LƯU
    // TRỮ FILE, hoặc người dùng chưa chọn mốc, thì mocSnap = null => oldSet
    // RỖNG => không loại được bất kỳ KH cũ nào => MỌI khách hàng có giải ngân
    // trong kỳ đều bị đếm là "KH vay mới", và toàn bộ số tiền GN bị cộng vào
    // "Tổng tiền vay mới". Bảng vẫn hiện số như bình thường, không có bất kỳ
    // cảnh báo nào => người dùng tin nhầm vào số liệu sai gấp ~180 lần.
    // SỬA TẬN GỐC: không suy ra "KH mới" khi thiếu bằng chứng. Thiếu mốc =>
    // KHÔNG tính candidates / camcoOther (các cột KH vay mới, tiền vay mới,
    // vay cầm cố để trống "—"), chỉ giữ "Số món GN"/"Tổng tiền GN" là dữ liệu
    // đo trực tiếp, đồng thời hiện băng CHẶN màu đỏ yêu cầu chọn mốc so sánh.
    // ══════════════════════════════════════════════════════════════════
    var noMoc = !mocSnap;
    var candidates = noMoc ? [] : allGN.filter(function (r) { return norm(r[0]) && !oldSet.has(pairKey(r)); });

    // 3) Nhận diện món CẦM CỐ (FIX v14.2):
    //    ưu tiên đánh dấu thủ công (dropdown Loại trừ) > loại vay r[13] chứa
    //    "cầm cố" (dự phòng cho file có ghi rõ) > MỤC ĐÍCH VAY r[15] thuộc
    //    danh mục CAMCO_PURPOSES đã chốt.
    var loaiOf = function (r) {
      var k = rowKey(r);
      if (ex.loai[k] === 'camco' || ex.loai[k] === 'thuong') return ex.loai[k];
      if (/cam\s*co/.test(noAccent(r[13]))) return 'camco';
      return isCamCoText(r[15]) ? 'camco' : 'thuong';
    };

    //    Mọi món cầm cố phát sinh trong kỳ đều được tính vào cột "Vay cầm cố"
    //    (kể cả của KH đã có dư nợ tại mốc) — trước đây camcoOther được tính
    //    nhưng KHÔNG bao giờ cộng vào bảng Tổng hợp => cột cầm cố luôn = 0.
    // FIX v14.5 (05/9/2026) — YÊU CẦU NGHIỆP VỤ: tab "Lọc vay cầm cố" (và do
    // đó cột "Vay cầm cố" ở Tổng hợp) chỉ tính HỢP ĐỒNG CẦM CỐ MỚI PHÁT SINH
    // TRONG KỲ — không phải mọi món giải ngân cầm cố trong kỳ. Với KH đã có
    // dư nợ tại mốc (không thuộc candidates), nếu số HĐTD (r[2]) ĐÃ CÓ tại mốc
    // so sánh thì đây là giải ngân bổ sung/rút vốn tiếp trên hạn mức cầm cố CŨ
    // (không phải khoản mới phát sinh) — không tính vào Vay cầm cố, mà gắn cờ
    // _camcoOldHD để vẫn hiển thị tường minh ở tab Chi tiết khách hàng (nhãn
    // riêng, không mất dữ liệu âm thầm — xem existingOther bên dưới).
    var camcoOther = noMoc ? [] : allGN.filter(function (r) {
      if (loaiOf(r) !== 'camco' || candidates.indexOf(r) !== -1) return false;
      var hd = norm0(r[2]);
      if (hd && _mocHD.has(hd)) { r._camcoOldHD = true; return false; }
      return true;
    });

    // FIX GỐC RỄ #3 (2026-08-17) — ROOT CAUSE tìm ra từ case thật: CBTD Trần
    // Hữu Thắng có 1 món CẦM CỐ (KH 3) phát sinh trong kỳ và đã
    // tất toán ngay trong kỳ (dư nợ cuối kỳ = 0), nhưng KHÔNG xuất hiện trong
    // danh sách "món vay mới" của menu này.
    // Cơ chế lỗi: loaiOf() chỉ nhận diện "Cầm cố" qua 1 whitelist mục đích vay
    // (CAMCO_PURPOSES regex — ví dụ "mua sắm vật dụng sinh hoạt", "mua xe"...).
    // Với 1 khách hàng ĐÃ CÓ dư nợ tại mốc so sánh (không rơi vào "candidates"
    // = KH mới) mà mục đích vay của món GN trong kỳ KHÔNG khớp whitelist đó,
    // dòng này KHÔNG rơi vào "candidates" (không phải KH mới) VÀ KHÔNG rơi vào
    // "camcoOther" (không được nhận diện là cầm cố) — nó biến mất hoàn toàn
    // khỏi cả 2 nhánh tính toán, không xuất hiện ở bất kỳ đâu trong menu, dù
    // món giải ngân đó có thật 100% trong nguồn Giải ngân (allGN).
    // Sửa tận gốc: không để bất kỳ dòng nào của allGN "rơi khỏi lưới" một cách
    // âm thầm. Mọi dòng KHÔNG thuộc candidates và KHÔNG thuộc camcoOther được
    // gom vào "existingOther" (KH cũ, phát sinh GN trong kỳ, chưa được nhận
    // diện là cầm cố) — hiển thị tường minh ở tab "Chi tiết khách hàng" với
    // nhãn "Chưa phân loại" để CBTD/kiểm soát viên phát hiện và gắn thủ công
    // (dropdown Loại trừ), thay vì bị ẩn đi khiến số liệu thiếu mà không ai
    // biết. Việc này không đổi công thức đếm KH mới/cầm cố hiện có (giữ
    // nguyên số đã chốt với nghiệp vụ) mà chỉ đảm bảo KHÔNG CÒN dữ liệu mồ côi.
    var classified = candidates.concat(camcoOther);
    var existingOther = noMoc ? [] : allGN.filter(function (r) { return classified.indexOf(r) === -1; });

    return { noMoc: noMoc, allGN: allGN, candidates: candidates, camcoOther: camcoOther, existingOther: existingOther, closedOrphan: closedOrphan, loaiOf: loaiOf, mocSnap: mocSnap, ex: ex, oldSet: oldSet, oldAnyCb: oldAnyCb };
  }

  // Bộ lọc hiển thị (search / CBTD / phòng ban) — áp dụng SAU khi tính
  function passFilter(r) {
    var kw = (q('khmoi-search') ? q('khmoi-search').value : '').trim().toLowerCase();
    var cb = q('khmoi-f-cbtd') ? q('khmoi-f-cbtd').value : '';
    var pb = q('khmoi-f-pb') ? q('khmoi-f-pb').value : '';
    if (cb && String(r[12] || '') !== cb) return false;
    if (pb && String(r[17] || '') !== pb) return false;
    if (kw) {
      var hay = (String(r[1] || '') + ' ' + String(r[0] || '')).toLowerCase();
      if (hay.indexOf(kw) === -1) return false;
    }
    return true;
  }

  function fillFilterOptions(rows) {
    [['khmoi-f-cbtd', 12, 'Tất cả CBTD'], ['khmoi-f-pb', 17, 'Tất cả phòng ban']].forEach(function (cfg) {
      var el = q(cfg[0]); if (!el) return;
      var cur = el.value;
      var vals = Array.from(new Set(rows.map(function (r) { return String(r[cfg[1]] || '').trim(); }).filter(Boolean))).sort(function (a, b) {
        return a.localeCompare(b, 'vi');
      });
      el.innerHTML = '<option value="">' + cfg[2] + '</option>' + vals.map(function (v) {
        return '<option value="' + esc(v) + '">' + esc(v) + '</option>';
      }).join('');
      if (cur && vals.indexOf(cur) >= 0) el.value = cur;
    });
  }

  // ── TAB TỔNG HỢP ───────────────────────────────────────────────
  function buildGroups() {
    var c = computeAll();
    lastCtx = c;
    fillFilterOptions(c.allGN);
    var ex = c.ex;
    var groups = {};
    // FIX GOC RE #8 (05/9/2026) - TONG CONG TOAN CHI NHANH cong khMoiCount/
    // camcoCount bang cach CONG DON so da dem rieng cua tung CBTD (moi CBTD
    // dedupe theo Ma KH RIENG trong nhom cua minh). Mot khach hang vay o 2
    // CBTD khac nhau trong cung ky (doi CBTD phu trach, hoac vay them o
    // CBTD khac) van hop le la "KH moi" o MOI CBTD do - nhung khi CONG vao
    // hang Tong cong toan chi nhanh thi bi dem 2 lan cho cung 1 khach hang,
    // lam "TONG KH VAY MOI" cao hon thuc te (case that: 156 hien thi trong
    // khi dedupe toan chi nhanh theo Ma KH chi co 114). Sua: dedupe RIENG o
    // cap toan chi nhanh bang 2 Set doc lap, gan vao mang tra ve de
    // renderSummary() dung thang cho dong Tong cong - khong dung toi cach
    // dem theo tung CBTD (van dung va huu ich de danh gia tung nguoi).
    var khAllGlobal = new Set(), khCamGlobal = new Set();
    var ensure = function (r) {
      var k = (r[17] || 'Chưa rõ phòng ban') + '||' + (r[12] || 'Chưa rõ CBTD');
      if (!groups[k]) groups[k] = {
        phongban: r[17] || 'Chưa rõ phòng ban', cbtd: r[12] || 'Chưa rõ CBTD',
        gnCount: 0, gnTien: 0, khMoiCount: 0, khMoiTien: 0, camcoCount: 0, camcoTien: 0,
        _khNew: new Set(), _khCam: new Set(), _khAll: new Set()
      };
      return groups[k];
    };
    // Số món & tiền GN: nguyên vẹn từ nguồn Giải ngân
    c.allGN.filter(passFilter).forEach(function (r) {
      var g = ensure(r); g.gnCount++; g.gnTien += Number(r[9]) || 0;
    });
    // KH & tiền vay mới: từ tab Chi tiết, chỉ dòng còn được tick
    c.candidates.filter(passFilter).forEach(function (r) {
      if (ex.newcust[rowKey(r)]) return;               // bỏ tick -> loại trừ
      var g = ensure(r), ma = String(r[0] || '').trim();
      // v14.3: TỔNG số KH & TỔNG số tiền vay mới = tất cả món vay mới
      // (vay thông thường + vay cầm cố). KH đếm 1 lần theo Mã KH.
      if (c.loaiOf(r) === 'camco') {
        g.camcoTien += Number(r[9]) || 0;
        if (ma && !g._khCam.has(ma)) { g._khCam.add(ma); g.camcoCount++; }
        if (ma) khCamGlobal.add(ma);
      } else {
        if (ma && !g._khNew.has(ma)) g._khNew.add(ma);
      }
      g.khMoiTien += Number(r[9]) || 0;
      if (ma && !g._khAll.has(ma)) { g._khAll.add(ma); g.khMoiCount++; }
      if (ma) khAllGlobal.add(ma);
    });
    // FIX GỐC RỄ #9 (06/9/2026) — ĐỐI CHIẾU TRỰC TIẾP với báo cáo Excel tay
    // (Bao_cao_KH_vay_moi_theo_CBTD.xlsx, 122 dòng / 119 Mã KH duy nhất) qua
    // Playwright: khớp 112/119 KH tuyệt đối (100% không mâu thuẫn) khi "KH
    // vay mới" = CHỈ candidates (cặp CBTD+Mã KH chưa từng có dư nợ tại mốc)
    // — bao gồm cả 14 case KH đã có dư nợ ở CBTD KHÁC (đổi người phụ trách)
    // vẫn tính là "mới" cho CBTD hiện tại, đúng như Excel tay đang làm.
    // NGƯỢC LẠI, camcoOther (KH ĐÃ có dư nợ tại mốc, dưới CHÍNH CBTD đó, chỉ
    // vay thêm 1 khoản cầm cố mới) KHÔNG xuất hiện trong danh sách "KH mới"
    // của Excel tay — nên bản fix v14.3.1 (11/8/2026, cộng camcoOther vào
    // khMoiCount/khMoiTien) đi NGƯỢC với cách nghiệp vụ thực tế đang đối
    // soát, dù xuất phát từ 1 case thật (CBTD A/KH 3).
    // QUYẾT ĐỊNH: bỏ camcoOther khỏi "KH vay mới"/"Tiền vay mới" — camcoOther
    // vẫn được cộng đầy đủ vào cột "Vay cầm cố"/"Tiền vay cầm cố" riêng (đúng
    // ý case CBTD A: khoản cầm cố đó vẫn hiện diện, chỉ không tính
    // trùng vào "KH mới"). Nếu case cũ thực chất là 1 KH CHƯA từng vay (đúng
    // nghĩa "mới") mà bị lọt sang camcoOther do lỗi phân loại mốc, đó là 1
    // vấn đề khác — báo lại nếu sau khi lên bản này số liệu case đó sai.
    c.camcoOther.filter(passFilter).forEach(function (r) {
      if (ex.newcust[rowKey(r)]) return;
      var g = ensure(r), ma = String(r[0] || '').trim();
      g.camcoTien += Number(r[9]) || 0;
      if (ma && !g._khCam.has(ma)) { g._khCam.add(ma); g.camcoCount++; }
      if (ma) khCamGlobal.add(ma);
    });
    var out = Object.keys(groups).map(function (k) { return groups[k]; });
    out.khMoiCountGlobal = khAllGlobal.size;
    out.camcoCountGlobal = khCamGlobal.size;
    // FIX GỐC RỄ #11 — thay số "KH vay mới / tiền vay mới" bằng kết quả CHUỖI
    // SNAPSHOT (định nghĩa của báo cáo Excel). Các cột Số món GN / Tiền GN và
    // Vay cầm cố giữ nguyên nguồn cũ.
    var _ch = khmoiChain();
    if (_ch) {
      out.forEach(function (g) { g.khMoiCount = 0; g.khMoiTien = 0; });
      var _uniqMa = new Set();
      var _kwC = (q('khmoi-search') ? q('khmoi-search').value : '').trim().toLowerCase();
      var _cbC = q('khmoi-f-cbtd') ? q('khmoi-f-cbtd').value : '';
      var _pbC = q('khmoi-f-pb') ? q('khmoi-f-pb').value : '';
      _ch.pairs.forEach(function (p) {
        if (_cbC && p.cbtd !== _cbC) return;
        if (_pbC && p.pb !== _pbC) return;
        if (_kwC && (p.ten + ' ' + p.ma).toLowerCase().indexOf(_kwC) === -1) return;
        var pb = p.pb || 'Chưa rõ phòng ban', cb = p.cbtd || 'Chưa rõ CBTD', k = pb + '||' + cb;
        var g = groups[k];
        if (!g) {
          g = groups[k] = {
            phongban: pb, cbtd: cb, gnCount: 0, gnTien: 0, khMoiCount: 0, khMoiTien: 0,
            camcoCount: 0, camcoTien: 0, _khNew: new Set(), _khCam: new Set(), _khAll: new Set()
          };
          out.push(g);
        }
        g.khMoiCount++; g.khMoiTien += p.dn;
        if (p.ma) _uniqMa.add(p.ma);
      });
      out.khMoiCountGlobal = _uniqMa.size;
      out._chain = _ch;
    }
    return out;
  }

  function renderSummary() {
    var tbody = q('tbody-khmoi-sum'); if (!tbody) return;
    var list = buildGroups();
    var CH = list._chain || null;
    // FIX GỐC RỄ #5: thiếu mốc so sánh => không đủ bằng chứng để kết luận KH mới
    var NM = !!(lastCtx && lastCtx.noMoc) && !CH;
    var kmN = function (v) { return NM ? '—' : String(v); };
    var kmT = function (v) { return NM ? '—' : fmt(v); };

    // gom theo phòng ban
    var byPB = {};
    list.forEach(function (g) { (byPB[g.phongban] = byPB[g.phongban] || []).push(g); });
    var cmp = function (a, b) {
      var col = sumSort.col;
      if (col === 'cbtd' || col === 'phongban') {
        return sumSort.dir * window.TD_SXCB.cmp(a.phongban, a.cbtd, b.phongban, b.cbtd);
      }
      var va = a[col], vb = b[col];
      if (typeof va === 'string') return sumSort.dir * String(va).localeCompare(String(vb), 'vi');
      return sumSort.dir * ((va || 0) - (vb || 0));
    };
    var grand = { gnCount: 0, gnTien: 0, khMoiCount: 0, khMoiTien: 0, camcoCount: 0, camcoTien: 0 };
    var html = '';
    Object.keys(byPB).sort(function (a, b) {
      return window.TD_SXCB.rank(a) - window.TD_SXCB.rank(b) || window.TD_SXCB.viCmp(a, b);
    }).forEach(function (pb) {
      var rows = byPB[pb].slice().sort(cmp);
      var sub = { gnCount: 0, gnTien: 0, khMoiCount: 0, khMoiTien: 0, camcoCount: 0, camcoTien: 0 };
      rows.forEach(function (g) {
        ['gnCount', 'gnTien', 'khMoiCount', 'khMoiTien', 'camcoCount', 'camcoTien'].forEach(function (k) {
          sub[k] += g[k]; grand[k] += g[k];
        });
        html += '<tr style="cursor:pointer" title="Xem chi tiết CBTD này" onclick="khmoiDrill(' +
          JSON.stringify(esc(g.cbtd)).replace(/"/g, '&quot;') + ')">' +
          '<td>' + esc(g.phongban) + '</td><td>' + esc(g.cbtd) + '</td>' +
          '<td style="text-align:right">' + g.gnCount + '</td>' +
          '<td style="text-align:right">' + fmt(g.gnTien) + '</td>' +
          '<td style="text-align:right">' + kmN(g.khMoiCount) + '</td>' +
          '<td style="text-align:right">' + kmT(g.khMoiTien) + '</td>' +
          '<td style="text-align:right">' + kmN(g.camcoCount) + '</td>' +
          '<td style="text-align:right">' + kmT(g.camcoTien) + '</td></tr>';
      });
      html += '<tr style="background:#f1f5f9;font-weight:700">' +
        '<td colspan="2">Cộng — ' + esc(pb) + '</td>' +
        '<td style="text-align:right">' + sub.gnCount + '</td>' +
        '<td style="text-align:right">' + fmt(sub.gnTien) + '</td>' +
        '<td style="text-align:right">' + kmN(sub.khMoiCount) + '</td>' +
        '<td style="text-align:right">' + kmT(sub.khMoiTien) + '</td>' +
        '<td style="text-align:right">' + kmN(sub.camcoCount) + '</td>' +
        '<td style="text-align:right">' + kmT(sub.camcoTien) + '</td></tr>';
    });
    // FIX GỐC RỄ #8: dòng Tổng cộng toàn chi nhánh phải đếm KH theo Mã KH
    // DUY NHẤT trên toàn chi nhánh — không cộng dồn số đã đếm riêng của
    // từng CBTD (1 KH vay ở 2 CBTD sẽ bị đếm 2 lần nếu cộng thẳng). Số
    // tiền (khMoiTien/camcoTien) vẫn cộng thẳng vì đó là tiền thật đã giải
    // ngân, không cần/không nên dedupe theo khách hàng.
    // FIX GỐC RỄ #10 (06/9/2026) — ĐỐI SOÁT TRỰC TIẾP với Bao_cao_KH_vay_moi_theo_CBTD.xlsx
    // (Playwright, bộ dữ liệu 122 dòng Excel + 2 KH gây tranh cãi + 3 mốc kỳ trước):
    // Excel chốt ĐƠN VỊ ĐẾM = cặp (Khách hàng + CBTD) => 122 KH mới / 119 Mã KH
    // duy nhất. FIX #8 trước đó ép dòng "Tổng cộng toàn chi nhánh" về Mã KH duy
    // nhất toàn chi nhánh (119) nên LUÔN lệch với báo cáo tay đúng bằng số khách
    // vay ở 2 CBTD (3 khách: (đã ẩn), (đã ẩn), (đã ẩn))
    // và mâu thuẫn với chính quy tắc #2 đã chốt ("mỗi CBTD tính 1 KH mới; Tổng
    // cộng = cộng dồn các CBTD"). Sửa: Tổng cộng = CỘNG DỒN theo cặp CBTD+KH
    // (khớp Excel), đồng thời hiển thị thêm số Mã KH duy nhất để không mất thông
    // tin dedupe của FIX #8.
    var _dupInfo = '';
    if (!NM) {
      var _uniq = list.khMoiCountGlobal || 0, _uniqCam = list.camcoCountGlobal || 0;
      if (_uniq && _uniq !== grand.khMoiCount) {
        _dupInfo = '<div style="margin:0 14px 8px;padding:6px 10px;border-radius:8px;font-size:11px;font-weight:700;background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe">' +
          'ℹ Đơn vị đếm = cặp (Khách hàng + CBTD) như báo cáo Excel: ' + grand.khMoiCount +
          ' KH vay mới; trong đó chỉ có ' + _uniq + ' Mã KH duy nhất (' + (grand.khMoiCount - _uniq) +
          ' khách vay ở 2 CBTD nên được tính cho cả hai). Vay cầm cố: ' + grand.camcoCount +
          ' cặp / ' + _uniqCam + ' Mã KH duy nhất.</div>';
      }
    }
    html += '<tr class="km-grand" style="background:#1e3a8a !important;color:#fff !important;font-weight:800">' +
      '<td colspan="2">TỔNG CỘNG TOÀN CHI NHÁNH</td>' +
      '<td style="text-align:right">' + grand.gnCount + '</td>' +
      '<td style="text-align:right">' + fmt(grand.gnTien) + '</td>' +
      '<td style="text-align:right">' + kmN(grand.khMoiCount) + '</td>' +
      '<td style="text-align:right">' + kmT(grand.khMoiTien) + '</td>' +
      '<td style="text-align:right">' + kmN(grand.camcoCount) + '</td>' +
      '<td style="text-align:right">' + kmT(grand.camcoTien) + '</td></tr>';
    tbody.innerHTML = list.length ? html : '<tr><td colspan="8" style="text-align:center;color:var(--gray-500)">Không có dữ liệu trong kỳ đã chọn</td></tr>';
    try {
      var _dupEl = q('khmoi-dup-info');
      if (!_dupEl) {
        var _host = q('khmoi-kpi');
        if (_host && _host.parentNode) {
          _dupEl = document.createElement('div');
          _dupEl.id = 'khmoi-dup-info';
          _host.parentNode.insertBefore(_dupEl, _host.nextSibling);
        }
      }
      // FIX (08/09/2026): theo yêu cầu, KHÔNG hiển thị hộp "Đơn vị đếm..." này
      // nữa trên tab Khách hàng mới nữa (giữ nguyên _dupInfo/logic tính toán
      // phía trên để không ảnh hưởng số liệu KPI/bảng, chỉ ngừng hiển thị).
      if (_dupEl) _dupEl.innerHTML = '';
    } catch (e) {}

    // FIX GỐC RỄ #11 — bảng ĐỐI SOÁT CHUỖI SNAPSHOT (minh bạch cách ra số)
    try {
      var _cEl = q('khmoi-chain-info');
      if (!_cEl) {
        var _h2 = q('khmoi-kpi');
        if (_h2 && _h2.parentNode) {
          _cEl = document.createElement('div');
          _cEl.id = 'khmoi-chain-info';
          _cEl.style.cssText = 'margin:0 14px 8px';
          _h2.parentNode.insertBefore(_cEl, _h2.nextSibling);
        }
      }
      if (_cEl) {
        // FIX (08/09/2026): theo yêu cầu, KHÔNG hiển thị hộp "ĐỐI SOÁT CHUỖI
        // SNAPSHOT" (và cảnh báo "đang tính theo cách cũ") trên tab Khách hàng
        // mới nữa — chỉ ngừng hiển thị, không đụng logic tính CH/grand ở trên
        // (các KPI/bảng/biểu đồ khác vẫn dùng nguyên).
        _cEl.innerHTML = '';
      }
    } catch (e) {}

    // FIX GỐC RỄ #11 — đổi nhãn cột tiền cho đúng đại lượng đang hiển thị
    try {
      var _th = q('khmoi-th-tien');
      if (_th) _th.textContent = (CH ? 'TỔNG DƯ NỢ KH VAY MỚI (VNĐ) ↕' : 'TỔNG SỐ TIỀN VAY MỚI (VNĐ) ↕');
    } catch (e) {}

    // KPI + biểu đồ
    var kpi = q('khmoi-kpi');
    if (kpi) kpi.innerHTML =
      '<div class="kpi"><span>Số món GN</span><b>' + fmt(grand.gnCount) + '</b></div>' +
      '<div class="kpi"><span>Tổng tiền GN</span><b>' + fmt(grand.gnTien) + '</b></div>' +
      '<div class="kpi"><span>Tổng KH vay mới</span><b>' + kmT(grand.khMoiCount) + '</b></div>' +
      '<div class="kpi"><span>' + (CH ? 'Tổng dư nợ KH vay mới' : 'Tổng tiền vay mới') + '</span><b>' + kmT(grand.khMoiTien) + '</b></div>' +
      '<div class="kpi"><span>Vay cầm cố</span><b>' + kmT(grand.camcoCount) + '</b></div>' +
      '<div class="kpi"><span>Tiền vay cầm cố</span><b>' + kmT(grand.camcoTien) + '</b></div>';
    var chart = q('khmoi-chart');
    if (chart) {
      var pbAgg = {};
      list.forEach(function (g) { pbAgg[g.phongban] = (pbAgg[g.phongban] || 0) + g.khMoiCount; });
      var keys = window.TD_SXCB.sortPBs(Object.keys(pbAgg));
      var max = Math.max.apply(null, keys.map(function (k) { return pbAgg[k]; }).concat([1]));
      chart.innerHTML = (keys.length && !NM)
        ? '<div style="font-size:10px;font-weight:700;color:#64748b;margin-bottom:4px">SỐ KH VAY MỚI THEO PHÒNG BAN</div>' +
          keys.map(function (k) {
            return '<div class="cr"><i title="' + esc(k) + '">' + esc(k) + '</i><u><em style="width:' +
              Math.round(pbAgg[k] / max * 100) + '%"></em></u><s>' + pbAgg[k] + '</s></div>';
          }).join('')
        : '';
    }
    var badge = q('khmoi-stat-badge');
    if (badge) badge.textContent = grand.gnCount + ' món GN · ' + (NM ? 'chưa chọn mốc so sánh' : grand.khMoiCount + ' KH vay mới');

    // FIX GỐC RỄ #3: cảnh báo ngay trên tab Tổng hợp nếu có món GN của KH cũ
    // chưa được nhận diện loại vay (không rơi vào KH mới lẫn Cầm cố) — để
    // không lặp lại tình huống "món cầm cố KH 3 biến mất khỏi
    // danh sách vay mới mà không ai phát hiện ra".
    var warnEl = q('khmoi-unclassified-warn');
    var nUnclassified = lastCtx && lastCtx.existingOther ? lastCtx.existingOther.length : 0;
    // QA-UX-FIX: tinh tong tien de CBTD biet quy mo, uu tien ra soat khoan lon truoc
    var vndUnclassified = (lastCtx && lastCtx.existingOther)
      ? lastCtx.existingOther.reduce(function (s, r) { return s + (Number(r[9]) || 0); }, 0) : 0;
    if (!warnEl) {
      var kpiHost = q('khmoi-kpi');
      if (kpiHost && kpiHost.parentNode) {
        warnEl = document.createElement('div');
        warnEl.id = 'khmoi-unclassified-warn';
        warnEl.style.cssText = 'margin:0 14px 6px;padding:6px 10px;border-radius:8px;font-size:11px;font-weight:700;display:none';
        kpiHost.parentNode.insertBefore(warnEl, kpiHost.nextSibling);
      }
    }
    if (warnEl) {
      var nInferred = (lastCtx && lastCtx.allGN) ? lastCtx.allGN.filter(function (r) { return r._closedInferred; }).length : 0;
      var nOrphan = (lastCtx && lastCtx.closedOrphan) ? lastCtx.closedOrphan.length : 0;
      var msgs = [];
      if (NM) msgs.push('⛔ CHƯA CHỌN MỐC SO SÁNH — không thể xác định khách hàng nào là vay mới. Các cột KH vay mới / Tiền vay mới / Vay cầm cố đã để trống (—) để tránh số liệu sai. Vào LƯU TRỮ FILE lưu snapshot Report IPCAS tại thời điểm đầu kỳ, rồi chọn ở ô Mốc so sánh KH cũ.');
      if (nUnclassified > 0) msgs.push('ℹ ' + nUnclassified + ' món giải ngân của khách hàng cũ (' + Math.round(vndUnclassified/1e6).toLocaleString('vi-VN') + ' triệu đ) KHÔNG khớp danh mục "Cầm cố" đã định nghĩa — phần lớn là vay thường hợp lệ (đúng), không phải lỗi. Chỉ nên rà soát nếu nghi ngờ có khoản cầm cố bị bỏ sót — xem tab "Chi tiết khách hàng", lọc "Chưa phân loại", ưu tiên khoản giá trị lớn.');
      if (nInferred > 0) msgs.push('ℹ ' + nInferred + ' khoản ĐÃ TẤT TOÁN trong kỳ được khôi phục bằng mốc so sánh (IPCAS xoá trắng Ngày GN / Số tiền GN) — đã tính vào Số món GN & KH vay mới; kiểm tra & nhập số tiền GN thực tế ở tab "Chi tiết khách hàng".');
      if (nOrphan > 0) msgs.push('• ' + nOrphan + ' khoản tất toán không đủ bằng chứng phát sinh trong kỳ (hợp đồng đã có tại mốc) — liệt kê ở tab "Chi tiết khách hàng", không tính vào số liệu.');
      if (msgs.length) {
        // FIX (08/09/2026): theo yêu cầu, KHÔNG hiển thị các hộp cảnh báo/đối
        // soát này trên tab Khách hàng mới nữa — vẫn giữ nguyên logic tính
        // msgs/nUnclassified/nInferred/nOrphan ở trên (không đụng số liệu khác
        // dùng chung biến), chỉ ngừng hiển thị ra giao diện.
        warnEl.style.display = 'none';
      } else {
        warnEl.style.display = 'none';
      }
    }
  }

  // ── TAB CHI TIẾT ───────────────────────────────────────────────
  function renderDetail() {
    var tbody = q('tbody-khmoi-detail'); if (!tbody) return;
    var c = computeAll();
    lastCtx = c;
    fillFilterOptions(c.allGN);
    var ex = c.ex;
    // FIX v14.4 (04/9/2026) — tách "Chi tiết khách hàng" (chỉ KH vay mới,
    // MỌI mục đích vay kể cả cầm cố) và tab riêng "Lọc vay cầm cố" (mọi món
    // cầm cố, cả KH mới lẫn KH cũ) theo đúng yêu cầu nghiệp vụ đã chốt —
    // thay vì gộp chung 1 dropdown như bản cũ (khiến 1 món cầm cố của KH mới
    // bị ẩn khỏi "Chỉ KH vay mới" dù vẫn được cộng vào khMoiCount ở Tổng hợp,
    // gây lệch số giữa 2 tab).
    var filt = (activeTab === 'camco') ? 'camco'
      : (q('khmoi-detail-loai') ? (q('khmoi-detail-loai').value || 'new') : 'new');

    // FIX GỐC RỄ #5: thiếu mốc so sánh -> không phân loại KH mới/cầm cố
    var dwarn = q('khmoi-detail-nomoc');
    if (!dwarn && tbody.parentNode && tbody.parentNode.parentNode) {
      dwarn = document.createElement('div');
      dwarn.id = 'khmoi-detail-nomoc';
      dwarn.style.cssText = 'margin:0 0 6px;padding:6px 10px;border-radius:8px;font-size:11px;font-weight:700;background:#fee2e2;color:#991b1b;border:1px solid #fecaca;display:none';
      tbody.parentNode.parentNode.insertBefore(dwarn, tbody.parentNode.parentNode.firstChild);
    }
    if (dwarn) {
      dwarn.style.display = c.noMoc ? 'block' : 'none';
      dwarn.textContent = '⛔ Chưa chọn MỐC SO SÁNH — không thể xác định khách hàng vay mới. Danh sách bên dưới chỉ là các món giải ngân trong kỳ, chưa phân loại.';
    }
    var seen = new Set(), list = [];
    var push = function (r, isNew, loaiOverride) {
      var k = rowKey(r) + '#' + (r[6] || '');
      if (seen.has(k)) return; seen.add(k);
      list.push({ r: r, isNew: isNew, loai: loaiOverride || c.loaiOf(r) });
    };
    c.candidates.forEach(function (r) { push(r, true); });
    c.camcoOther.forEach(function (r) { push(r, false); });
    // FIX GỐC RỄ #3: hiển thị tường minh các món GN của KH cũ mà hệ thống
    // KHÔNG nhận diện được là cầm cố (xem giải thích chi tiết tại computeAll)
    // — thay vì để biến mất khỏi menu này hoàn toàn.
    c.existingOther.forEach(function (r) { push(r, false, r._camcoOldHD ? 'camco_topup' : 'khac'); });
    if (c.noMoc) c.allGN.forEach(function (r) { push(r, false, 'khac'); });
    // FIX GỐC RỄ #3B: các món đã tất toán nhưng IPCAS xoá trắng ngày GN / số tiền GN
    // và không phục hồi được từ snapshot — hiển thị tường minh để CBTD tự đối chiếu.
    (c.closedOrphan || []).forEach(function (r) { push(r, false, 'tattoan'); });

    list = list.filter(function (o) {
      if (!passFilter(o.r)) return false;
      // "Chi tiết khách hàng" = mọi món GN của KH vay mới, KHÔNG loại trừ
      // mục đích cầm cố (đúng yêu cầu: không lọc vay cầm cố khỏi tab này).
      if (filt === 'new') return o.isNew;
      // "Lọc vay cầm cố" (tab riêng) = CHỈ hợp đồng cầm cố MỚI PHÁT SINH
      // trong kỳ (candidates-camco + camcoOther) — KHÔNG gồm giải ngân bổ
      // sung trên hạn mức cầm cố cũ (camco_topup, xem tab "KH cũ chưa phân
      // loại" để đối chiếu riêng).
      if (filt === 'camco') return o.loai === 'camco';
      if (filt === 'khac') return o.loai === 'khac' || o.loai === 'tattoan' || o.loai === 'camco_topup';
      return true;
    });

    var get = function (o) {
      switch (detSort.col) {
        case 'ngay': var d = pDate(o.r[6]); return d ? d.getTime() : 0;
        case 'tien': return Number(o.r[9]) || 0;
        case 'ten': return String(o.r[1] || '');
        case 'makh': return String(o.r[0] || '');
        case 'cbtd': return String(o.r[12] || '');
        // v14.3.2: cột Phòng ban sắp theo thứ tự nghiệp vụ (Hội Sở → PGD Số 2 →
        // PGD Hai Bà Trưng) thay vì so chuỗi alphabet mặc định, để bấm header
        // "Phòng ban" cũng cho đúng thứ tự người dùng cần, không riêng lúc mở tab.
        case 'pb': return pbOrderIdx(o.r[17], o.r[12]);
        case 'loai': return (o.isNew ? '1' : '2') + o.loai;
        default: return 0;
      }
    };
    if (detSort.col === 'pbcbtd') {
      // v14.3.2: chế độ mặc định — nhóm theo Phòng ban (thứ tự ưu tiên
      // PB_ORDER_DEFAULT), trong mỗi phòng ban sắp theo CBTD (A→Z), trong
      // mỗi CBTD sắp theo ngày giải ngân mới nhất trước.
      list.sort(function (a, b) {
        var cc = window.TD_SXCB.cmp(a.r[17], a.r[12], b.r[17], b.r[12]);
        if (cc !== 0) return cc;
        var da = pDate(a.r[6]), db = pDate(b.r[6]);
        return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
      });
    } else {
      list.sort(function (a, b) {
        var va = get(a), vb = get(b);
        if (typeof va === 'string') return detSort.dir * va.localeCompare(vb, 'vi', { numeric: true });
        return detSort.dir * (va - vb);
      });
    }
    detRows = list;

    tbody.innerHTML = list.map(function (o, i) {
      var r = o.r, k = rowKey(r);
      var tickable = o.isNew || o.loai === 'camco';   // FIX v14.1: dòng cầm cố KH cũ cũng cho bỏ tick
      var ticked = tickable && !ex.newcust[k];
      var badge = o.loai === 'camco'
        ? '<span style="background:#c8963e;color:#fff;font-size:9px;font-weight:700;padding:2px 7px;border-radius:10px;white-space:nowrap">Vay cầm cố</span>'
        : o.loai === 'camco_topup'
        ? '<span title="Mục đích vay khớp danh mục Cầm cố nhưng Số HĐTD đã có tại mốc so sánh — đây là giải ngân bổ sung/rút vốn tiếp trên hạn mức cầm cố CŨ, không phải hợp đồng mới phát sinh trong kỳ nên KHÔNG tính vào cột Vay cầm cố." style="background:#a16207;color:#fff;font-size:9px;font-weight:700;padding:2px 7px;border-radius:10px;white-space:nowrap">Cầm cố — hạn mức cũ</span>'
        : o.loai === 'khac'
        ? '<span title="Món GN của KH cũ trong kỳ — hệ thống chưa nhận diện được loại vay (không khớp danh mục Cầm cố). Vui lòng kiểm tra và gắn thủ công nếu cần." style="background:#dc2626;color:#fff;font-size:9px;font-weight:700;padding:2px 7px;border-radius:10px;white-space:nowrap">⚠ Chưa phân loại</span>'
        : '<span style="background:#2b6cb0;color:#fff;font-size:9px;font-weight:700;padding:2px 7px;border-radius:10px;white-space:nowrap">KH mới</span>';
      if (o.loai === 'tattoan') badge = '<span title="Khoản đã TẤT TOÁN: IPCAS xoá trắng Ngày GN / Số tiền GN nên menu cũ bỏ sót hoàn toàn. Không phục hồi được từ snapshot — vui lòng đối chiếu thủ công." style="background:#0f766e;color:#fff;font-size:9px;font-weight:700;padding:2px 7px;border-radius:10px;white-space:nowrap">Đã tất toán — thiếu ngày GN</span>';
      else if (r._closedRescued) badge += ' <span title="Khoản đã tất toán, đã phục hồi Ngày GN / Số tiền GN từ snapshot lưu trữ" style="background:#0f766e;color:#fff;font-size:9px;font-weight:700;padding:2px 6px;border-radius:10px;white-space:nowrap">Đã tất toán</span>';
      if (r._closedInferred) badge += ' <span title="FIX GỐC RỄ #4: khoản đã TẤT TOÁN trong kỳ (IPCAS xoá trắng Ngày GN / Số tiền GN). Hợp đồng/mã KH không tồn tại tại mốc so sánh nên chắc chắn phát sinh trong kỳ — đã tính vào Số món GN và KH vay mới với ngày GN suy luận. Nhập số tiền GN thực tế vào ô bên phải nếu cần." style="background:#7c3aed;color:#fff;font-size:9px;font-weight:700;padding:2px 6px;border-radius:10px;white-space:nowrap">Tất toán trong kỳ — suy luận</span>';
      if (!o.isNew && o.loai !== 'khac' && o.loai !== 'tattoan' && o.loai !== 'camco_topup') badge += ' <span style="font-size:9px;color:#94a3b8">KH cũ</span>';
      return '<tr style="' + (tickable && !ticked ? 'opacity:.45;' : '') + '">' +
        '<td style="text-align:center">' + (tickable
          ? '<input type="checkbox" class="km-row-chk" ' + (ticked ? 'checked' : '') +
            ' title="Bỏ tick để loại dòng này khỏi món vay mới trong kỳ" onchange="khmoiToggleRow(' + i + ',this.checked)">'
          : '<span title="KH đã có trong mốc so sánh — chưa được tính vào bất kỳ cột nào ở tab Tổng hợp, cần kiểm tra mục đích vay" style="color:#cbd5e1">—</span>') + '</td>' +
        '<td>' + badge + '</td>' +
        '<td>' + esc(r[12] || '') + '</td>' +
        '<td>' + esc(r[17] || '') + '</td>' +
        '<td>' + esc(r[6] || '') + '</td>' +
        '<td>' + esc(r[1] || '') + '</td>' +
        '<td class="copy-cell" onclick="copyCellValue(this,event)" title="Click để copy MÃ KH" style="font-family:Consolas,monospace;white-space:nowrap">' +
          esc(typeof fmtMaKH === 'function' ? fmtMaKH(r[0]) : String(r[0] == null ? '' : r[0]).trim()) + '</td>' +
        '<td style="text-align:right">' + (r._closedInferred
          ? '<input type="text" class="km-note" style="text-align:right;max-width:130px" value="' + esc(r[9] ? fmt(r[9]) : '') + '" placeholder="Nhập số tiền GN" title="Khoản đã tất toán — nhập số tiền giải ngân thực tế" onchange="khmoiSetGnFix(' + i + ',this.value)">'
          : fmt(r[9])) + '</td>' +
        '<td>' + esc(r[15] || '') + '</td>' +
        '<td style="text-align:center"><select class="km-loai" onchange="khmoiSetLoai(' + i + ',this.value)">' +
          '<option value="thuong"' + (o.loai === 'thuong' ? ' selected' : '') + '>Thông thường</option>' +
          '<option value="camco"' + (o.loai === 'camco' ? ' selected' : '') + '>Cầm cố</option>' +
        '</select></td>' +
        '<td><input type="text" class="km-note" value="' + esc(ex.note[k] || '') + '" placeholder="Ghi chú..." onchange="khmoiSetNote(' + i + ',this.value)"></td>' +
        '</tr>';
    }).join('') || '<tr><td colspan="11" style="text-align:center;color:var(--gray-500)">Không có dòng nào</td></tr>';

    var cnt = q('count-khmoi-detail'); if (cnt) cnt.textContent = list.length;
    var all = q('khmoi-check-all');
    if (all) {
      var news = list.filter(function (o) { return o.isNew || o.loai === 'camco'; });
      all.checked = news.length > 0 && news.every(function (o) { return !ex.newcust[rowKey(o.r)]; });
    }
    var badge2 = q('khmoi-stat-badge');
    if (badge2) badge2.textContent = list.length + ' dòng đang xem';
  }

  // ── Hành động ──────────────────────────────────────────────────
  function render() {
    setDefaultFilter();
    if (activeTab === 'sum') renderSummary(); else renderDetail();
  }

  window.khmoiInit = function (force) {
    EX();
    if (force) {
      ['khmoi-from', 'khmoi-to', 'khmoi-search'].forEach(function (id) { if (q(id)) { q(id).value = ''; q(id).dataset.kmAll = ''; } });
      ['khmoi-f-cbtd', 'khmoi-f-pb'].forEach(function (id) { if (q(id)) q(id).value = ''; });
      // FIX GỐC RỄ #6c: "Làm mới" phải cho mốc tự chọn lại từ đầu.
      if (q('khmoi-moc')) q('khmoi-moc').dataset.userPicked = '';
    }
    setDefaultFilter();
    render();
  };
  window.khmoiRender = render;
  window.khmoiRenderDetail = renderDetail;
  window.khmoiRenderSummary = renderSummary;
  window.khmoiComputeAll = computeAll;
  window.khmoiRowKey = rowKey;
  window.khmoiEnsureExclude = EX;

  window.khmoiSwitchTab = function (tab) {
    activeTab = tab;
    document.querySelectorAll('#khmoi-tab-nav .khmoi-tab').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-tab') === tab);
    });
    if (q('khmoi-pn-sum')) q('khmoi-pn-sum').style.display = tab === 'sum' ? '' : 'none';
    // v14.4: tab "detail" (Chi tiết khách hàng) và "camco" (Lọc vay cầm cố)
    // dùng CHUNG 1 bảng (khmoi-pn-detail) — renderDetail() tự chọn bộ lọc
    // đúng theo activeTab (xem hàm renderDetail).
    if (q('khmoi-pn-detail')) q('khmoi-pn-detail').style.display = (tab === 'detail' || tab === 'camco') ? '' : 'none';
    var loaiWrap = q('khmoi-detail-loai-wrap');
    if (loaiWrap) loaiWrap.style.display = (tab === 'camco') ? 'none' : '';
    var camcoNote = q('khmoi-camco-hint');
    if (camcoNote) camcoNote.style.display = (tab === 'camco') ? '' : 'none';
    var detailNote = q('khmoi-detail-hint');
    if (detailNote) detailNote.style.display = (tab === 'detail') ? '' : 'none';
    render();
  };

  window.khmoiQuickDate = function (mode) {
    var f = q('khmoi-from'), t = q('khmoi-to'), now = new Date();
    if (!f || !t) return;
    f.dataset.kmAll = ''; t.dataset.kmAll = '';
    // FIX GỐC RỄ #6c: đổi nhanh kỳ báo cáo (7 ngày/Tháng này/Quý này/Tất cả)
    // phải cho phép mốc tự chọn lại theo kỳ mới — nếu không sẽ lặp lại đúng
    // lỗi "đổi kỳ nhưng mốc đứng yên" đã phát hiện ở setDefaultFilter().
    var selMoc = q('khmoi-moc'); if (selMoc) selMoc.dataset.userPicked = '';
    if (mode === 'all') { f.value = ''; t.value = ''; f.dataset.kmAll = '1'; t.dataset.kmAll = '1'; }
    else if (mode === '7d') { var d = new Date(now); d.setDate(d.getDate() - 6); f.value = dstr(d); t.value = dstr(now); }
    else if (mode === 'month') { f.value = dstr(new Date(now.getFullYear(), now.getMonth(), 1)); t.value = dstr(now); }
    else if (mode === 'quarter') { f.value = dstr(new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)); t.value = dstr(now); }
    render();
  };

  window.khmoiClearFilters = function () {
    ['khmoi-search'].forEach(function (id) { if (q(id)) q(id).value = ''; });
    ['khmoi-f-cbtd', 'khmoi-f-pb'].forEach(function (id) { if (q(id)) q(id).value = ''; });
    // v14.4: dropdown "khmoi-detail-loai" chỉ còn 2 lựa chọn (new/khac) —
    // đưa về mặc định 'new' thay vì '' (không còn option rỗng).
    if (q('khmoi-detail-loai')) q('khmoi-detail-loai').value = 'new';
    render();
  };

  window.khmoiSortSum = function (col) {
    sumSort.dir = (sumSort.col === col) ? -sumSort.dir : (col === 'phongban' || col === 'cbtd' ? 1 : -1);
    sumSort.col = col; renderSummary();
  };
  window.khmoiSortDetail = function (col) {
    detSort.dir = (detSort.col === col) ? -detSort.dir : (col === 'ngay' || col === 'tien' ? -1 : 1);
    detSort.col = col; renderDetail();
  };

  window.khmoiDrill = function (cbtd) {
    var el = q('khmoi-f-cbtd');
    if (el) {
      var ok = Array.prototype.some.call(el.options, function (o) { return o.value === cbtd; });
      if (ok) el.value = cbtd;
    }
    window.khmoiSwitchTab('detail');
  };

  window.khmoiToggleRow = function (i, checked) {
    var o = detRows[i]; if (!o) return;
    var ex = EX(), k = rowKey(o.r);
    if (checked) delete ex.newcust[k]; else ex.newcust[k] = true;
    persist(); renderDetail();
  };
  window.khmoiBulkTick = function (checked) {
    var ex = EX(), n = 0;
    detRows.forEach(function (o) {
      if (!o.isNew) return;
      var k = rowKey(o.r);
      if (checked) delete ex.newcust[k]; else ex.newcust[k] = true;
      n++;
    });
    persist(); renderDetail();
    toast(checked ? '☑ Đã tick ' + n + ' dòng' : '☐ Đã bỏ tick ' + n + ' dòng', checked ? 'green' : 'gold');
  };
  window.khmoiSetLoai = function (i, val) {
    var o = detRows[i]; if (!o) return;
    EX().loai[rowKey(o.r)] = (val === 'camco') ? 'camco' : 'thuong';
    persist(); renderDetail();
  };
  // FIX GỐC RỄ #4: nhập tay số tiền GN cho khoản đã tất toán (suy luận)
  window.khmoiSetGnFix = function (i, val) {
    var o = detRows[i]; if (!o) return;
    var ex = EX(), k = rowKey(o.r._srcRow || o.r);
    var num = Number(String(val || '').replace(/[^\d]/g, '')) || 0;
    if (!ex.gnfix[k]) ex.gnfix[k] = {};
    if (num > 0) ex.gnfix[k].tien = num; else delete ex.gnfix[k].tien;
    if (!ex.gnfix[k].tien && !ex.gnfix[k].ngay) delete ex.gnfix[k];
    persist(); render();
    toast(num > 0 ? '✔ Đã ghi số tiền GN: ' + fmt(num) : 'Đã xoá số tiền GN nhập tay', num > 0 ? 'green' : 'gold');
  };
  window.khmoiSetNote = function (i, val) {
    var o = detRows[i]; if (!o) return;
    var ex = EX(), k = rowKey(o.r);
    if (String(val || '').trim()) ex.note[k] = String(val).trim(); else delete ex.note[k];
    persist();
  };
  // Tương thích ngược với dữ liệu/handler cũ
  window.khmoiToggleExclude = function (key, checked) {
    var ex = EX();
    if (checked) ex.camco[key] = true; else delete ex.camco[key];
    persist(); renderDetail();
  };

  window.khmoiSaveState = function () {
    try {
      if (typeof saveData === 'function') { saveData(); toast('💾 Đã lưu trạng thái Khách hàng mới', 'green'); return; }
    } catch (e) {}
    persist(); toast('💾 Đã lưu tạm vào máy', 'green');
  };

  // v14.3: In NGANG full A4 (landscape) đúng tab đang xem + chốt chân Lập bảng / Kiểm soát
  window.khmoiDateMask = function (el) {
    if (!el) return;
    var d = String(el.value || '').replace(/\D/g, '').slice(0, 8);
    var out = d.slice(0, 2);
    if (d.length > 2) out += '/' + d.slice(2, 4);
    if (d.length > 4) out += '/' + d.slice(4, 8);
    el.value = out;
  };

  window.khmoiPrint = function () {
    var isSum = activeTab === 'sum';
    var tbl = document.getElementById(isSum ? 'table-khmoi-sum' : 'table-khmoi-detail');
    if (!tbl) { window.print(); return; }
    var clone = tbl.cloneNode(true);
    clone.removeAttribute('id'); clone.removeAttribute('style');
    Array.prototype.forEach.call(clone.querySelectorAll('th'), function (th) {
      th.removeAttribute('style'); th.removeAttribute('onclick');
      th.textContent = (th.textContent || '').replace(/[↕↑↓]/g, '').trim();
    });
    // bỏ các phần tử tương tác khỏi bản in
    Array.prototype.forEach.call(clone.querySelectorAll('input,select,button'), function (el) {
      var td = el.closest('td,th');
      var v = (el.tagName === 'SELECT') ? (el.options[el.selectedIndex] ? el.options[el.selectedIndex].text : '')
            : (el.type === 'checkbox' ? (el.checked ? '✓' : '') : (el.value || ''));
      if (td) { el.remove(); td.textContent = (td.textContent || '').trim() || v; }
    });
    var from = q('khmoi-from') ? q('khmoi-from').value : '', to = q('khmoi-to') ? q('khmoi-to').value : '';
    var cb = q('khmoi-f-cbtd') ? q('khmoi-f-cbtd').value : '', pb = q('khmoi-f-pb') ? q('khmoi-f-pb').value : '';
    var now = new Date();
    var title = isSum ? 'BÁO CÁO TỔNG HỢP KHÁCH HÀNG VAY MỚI' : 'DANH SÁCH CHI TIẾT KHÁCH HÀNG VAY MỚI';
    var css = '@page{size:A4 landscape;margin:10mm 8mm}' +
      'body{font-family:"Times New Roman",serif;font-size:10.5pt;margin:0;color:#000}' +
      '.br{text-align:center;font-size:11pt;font-weight:700;text-transform:uppercase}' +
      'h1{font-size:18pt;text-align:center;margin:8px 0 2px}' +
      '.sub{text-align:center;font-size:10.5pt;font-style:italic;margin-bottom:8px}' +
      'table{width:100%;border-collapse:collapse;table-layout:auto}' +
      'th,td{border:1px solid #000;padding:3px 5px;font-size:9.5pt;vertical-align:middle;min-width:0 !important;max-width:none !important;word-break:break-word}' +
      'th{background:#e8eef7;text-align:center;font-weight:700}' +
      'thead{display:table-header-group}tr{page-break-inside:avoid}' +
      '.sign{width:100%;margin-top:14px;border:0;page-break-inside:avoid}' +
      '.sign td{border:0;text-align:center;width:50%;font-size:10.5pt}' +
      '.sign .role{font-weight:700;text-transform:uppercase}' +
      '.sign .sp{height:70px}' +
      '.place{text-align:right;font-style:italic;margin-top:10px;padding-right:6%}' +
      '@media print{.no-print{display:none !important}}';
    var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(title) + '</title><style>' + css + '</style></head><body>' +
      '<div class="br">Agribank Chi nhánh Thiên Trường Nam Định</div>' +
      '<h1>' + esc(title) + '</h1>' +
      '<div class="sub">Kỳ báo cáo: ' + esc(from || 'từ đầu') + ' — ' + esc(to || 'đến nay') +
        (cb ? ' · CBTD: ' + esc(cb) : '') + (pb ? ' · Phòng ban: ' + esc(pb) : '') + '</div>' +
      clone.outerHTML +
      '<div class="place">Ninh Bình, ngày ' + now.getDate() + ' tháng ' + (now.getMonth() + 1) + ' năm ' + now.getFullYear() + '</div>' +
      '<table class="sign"><tr>' +
        '<td><div class="role">Lập bảng</div><div class="sp"></div></td>' +
        '<td><div class="role">Kiểm soát</div><div class="sp"></div></td>' +
      '</tr></table></body></html>';
    var w = window.open('', '_blank', 'width=1200,height=800');
    if (!w) { toast('⚠ Trình duyệt đã chặn cửa sổ in', 'red'); return; }
    w.document.documentElement.innerHTML = html;
    w.document.title = title;
    // FIX (07/09/2026): không tự mở hộp thoại in — chèn nút "🖨️ In ngay"
    // (ẩn khi in nhờ .no-print) để người dùng xem trước bản A4 rồi mới in.
    try {
      var _bar = w.document.createElement('div');
      _bar.className = 'no-print';
      _bar.style.cssText = 'position:sticky;top:0;background:#1a2540;padding:8px 14px;text-align:right;z-index:9';
      _bar.innerHTML = '🔎 Xem trước — kiểm tra nội dung trước khi in &nbsp; '
        + '<button onclick="window.print()" style="background:#2e7d32;color:#fff;border:0;border-radius:4px;padding:8px 16px;font-size:13px;font-weight:700;cursor:pointer">🖨️ In ngay</button>';
      w.document.body.insertBefore(_bar, w.document.body.firstChild);
      w.focus();
    } catch (e) {}
  };

  window.khmoiExportExcel = function () {
    if (typeof exportTableExcel === 'function') {
      var id = activeTab === 'sum' ? 'khmoi-sum' : 'khmoi-detail';
      var title = activeTab === 'sum' ? 'Khach hang moi - Tong hop'
        : activeTab === 'camco' ? 'Khach hang moi - Loc vay cam co'
        : 'Khach hang moi - Chi tiet';
      try { exportTableExcel(id, title); return; } catch (e) {}
    }
    toast('⚠ Không thể xuất Excel — thiếu hàm exportTableExcel', 'red');
  };

  window.khmoiExportWord = function () {
    var list = buildGroups();
    // FIX GỐC RỄ #5: không xuất báo cáo khi chưa chọn mốc so sánh (số KH vay mới sẽ sai)
    if (lastCtx && lastCtx.noMoc) {
      toast('⛔ Chưa chọn MỐC SO SÁNH — không thể xuất báo cáo KH vay mới. Vào LƯU TRỮ FILE lưu snapshot đầu kỳ rồi chọn mốc.', 'red');
      return;
    }
    var from = q('khmoi-from') ? q('khmoi-from').value : '', to = q('khmoi-to') ? q('khmoi-to').value : '';
    var grand = { gnCount: 0, gnTien: 0, khMoiCount: 0, khMoiTien: 0, camcoCount: 0, camcoTien: 0 };
    var byPB = {};
    list.forEach(function (g) {
      (byPB[g.phongban] = byPB[g.phongban] || []).push(g);
      ['gnCount', 'gnTien', 'khMoiCount', 'khMoiTien', 'camcoCount', 'camcoTien'].forEach(function (k) { grand[k] += g[k]; });
    });
    var body = '<h2 style="text-align:center">BÁO CÁO KHÁCH HÀNG VAY MỚI</h2>' +
      '<p style="text-align:center"><i>Kỳ báo cáo: ' + esc(from || 'từ đầu') + ' — ' + esc(to || 'đến nay') + '</i></p>' +
      '<p>Trong kỳ, chi nhánh giải ngân <b>' + fmt(grand.gnCount) + '</b> món với tổng số tiền <b>' + fmt(grand.gnTien) +
      '</b> đồng; phát sinh <b>' + fmt(grand.khMoiCount) + '</b> khách hàng vay mới với số tiền <b>' +
      fmt(grand.khMoiTien) + '</b> đồng, trong đó vay cầm cố <b>' + fmt(grand.camcoCount) +
      '</b> khách hàng / <b>' + fmt(grand.camcoTien) + '</b> đồng.</p>';
    Object.keys(byPB).sort(function (a, b) {
      return window.TD_SXCB.rank(a) - window.TD_SXCB.rank(b) || window.TD_SXCB.viCmp(a, b);
    }).forEach(function (pb) {
      body += '<h3>' + esc(pb) + '</h3><table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;width:100%">' +
        '<tr><th>CBTD</th><th>Số món GN</th><th>Tiền GN</th><th>Tổng KH vay mới</th><th>Tổng tiền vay mới</th><th>Vay cầm cố</th><th>Tiền cầm cố</th></tr>';
      byPB[pb].slice().sort(function (x, y) { return window.TD_SXCB.cmp(x.phongban, x.cbtd, y.phongban, y.cbtd); }).forEach(function (g) {
        body += '<tr><td>' + esc(g.cbtd) + '</td><td align="right">' + g.gnCount + '</td><td align="right">' + fmt(g.gnTien) +
          '</td><td align="right">' + g.khMoiCount + '</td><td align="right">' + fmt(g.khMoiTien) +
          '</td><td align="right">' + g.camcoCount + '</td><td align="right">' + fmt(g.camcoTien) + '</td></tr>';
      });
      body += '</table>';
    });
    var html = '<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8">' +
      '<style>body{font-family:"Times New Roman",serif;font-size:13pt}table{font-size:11pt}</style></head><body>' + body + '</body></html>';
    try {
      var blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'Khach-hang-moi.doc';
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      toast('📄 Đã xuất báo cáo Word', 'green');
    } catch (e) { toast('⚠ Không xuất được Word: ' + e.message, 'red'); }
  };
})();
