
/* ═══════════════════════════════════════════════════════════════
   MODULE TSBĐ — Tích hợp danh mục Tài sản bảo đảm IPCAS (TS.XLS)
   với trạng thái dư nợ khách hàng (DATA.qltd).  v2026-08-19
   Độc lập: DB riêng QLTDProTSBD, không bump version DB dư nợ.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var TS_DB = 'QLTDProTSBD', TS_VER = 1, ST_KV = 'kv', ST_SNAP = 'snapshots';
  // v14.12: mặc định TSBĐ sắp theo thứ tự CHUẨN CBTD (Hội Sở → PGD HBT → PGD Số 2)
  var S = { rows: [], src: '', importedAt: '', sort: { k: 'cbtd', asc: true }, page: 1, per: 100 };
  window.TSBD = S;

  /* ---------- tiện ích ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function num(v) { var f = parseFloat(String(v == null ? '' : v).replace(/[^\d.-]/g, '')); return isFinite(f) ? f : 0; }
  function money(v) { try { return (Math.round(num(v))).toLocaleString('vi-VN'); } catch (e) { return String(v); } }
  function tr(v) { return String(v == null ? '' : v).replace(/[\u200B-\u200D\uFEFF]/g, '').trim(); }
  function dISO(v) {
    if (v == null || v === '') return '';
    if (v instanceof Date && !isNaN(v)) return v.toISOString().slice(0, 10);
    var s = String(v).trim();
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return m[1] + '-' + m[2] + '-' + m[3];
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
    if (/^\d+(\.\d+)?$/.test(s)) { var d = new Date(Date.UTC(1899, 11, 30) + num(s) * 864e5); if (!isNaN(d)) return d.toISOString().slice(0, 10); }
    return s;
  }
  function dVN(iso) { var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? m[3] + '/' + m[2] + '/' + m[1] : (iso || ''); }
  function toast(m, t) { try { if (window.showToast) showToast(m, t); else console.log(m); } catch (e) { console.log(m); } }
  function $id(i) { return document.getElementById(i); }
  function clean(v) { return tr(v).replace(/^\[|\]$/g, '').trim(); }

  /* ═══ ROOT-FIX 2026-08-19 · CHUẨN HOÁ MÃ KH ═══
     Nguyên nhân gốc: module TSBĐ trước đây so khớp mã KH bằng chuỗi thô
     (tr(r[0]) === t.maKH) nên mọi sai lệch định dạng đều rơi vào "không có
     hồ sơ trong DATA":
       · IPCAS xuất có/không gạch nối:  3201-000000000  vs  3201000000000
       · Excel cắt số 0 đầu:            0201000000001   →  201000000001
       · Ô kiểu số hoá khoa học:        3.2010021354E+12
     Nay mọi so khớp đều đi qua mdig(): bỏ ký tự không phải số, khôi phục số
     khoa học, và bù 0 về đúng 13 chữ số — giống chuẩn normMaDigits/fmtMaKH
     mà các menu Dư nợ / Ngắn hạn / Trung-Dài hạn đang dùng. */
  function mdig(v) {
    var s0 = tr(v);
    if (!s0) return '';
    if (/^[\d.]+e\+?\d+$/i.test(s0)) {                 // 3.2010021354E+12
      var n = Number(s0);
      if (isFinite(n)) s0 = n.toFixed(0);
    }
    var d = s0.replace(/[^0-9]/g, '');
    if (!d) return '';
    if (d.length > 13) d = d.slice(-13);               // dính tiền tố lạ
    if (d.length < 13) d = ('0000000000000' + d).slice(-13); // Excel cắt 0 đầu
    return d;
  }
  var _VN = { 'à':'a','á':'a','ạ':'a','ả':'a','ã':'a','â':'a','ầ':'a','ấ':'a','ậ':'a','ẩ':'a','ẫ':'a','ă':'a','ằ':'a','ắ':'a','ặ':'a','ẳ':'a','ẵ':'a','è':'e','é':'e','ẹ':'e','ẻ':'e','ẽ':'e','ê':'e','ề':'e','ế':'e','ệ':'e','ể':'e','ễ':'e','ì':'i','í':'i','ị':'i','ỉ':'i','ĩ':'i','ò':'o','ó':'o','ọ':'o','ỏ':'o','õ':'o','ô':'o','ồ':'o','ố':'o','ộ':'o','ổ':'o','ỗ':'o','ơ':'o','ờ':'o','ớ':'o','ợ':'o','ở':'o','ỡ':'o','ù':'u','ú':'u','ụ':'u','ủ':'u','ũ':'u','ư':'u','ừ':'u','ứ':'u','ự':'u','ử':'u','ữ':'u','ỳ':'y','ý':'y','ỵ':'y','ỷ':'y','ỹ':'y','đ':'d' };
  function nmKey(v) {
    return tr(v).toLowerCase().replace(/[\u00C0-\u1EF9]/g, function (c) { return _VN[c] || c; })
      .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
  }
  function maShow(v) {                                  // hiển thị 3201-000000000 như các menu khác
    try { if (typeof window.fmtMaKH === 'function') return window.fmtMaKH(mdig(v) || tr(v)); } catch (e) {}
    var d = mdig(v); return d ? d.slice(0, 4) + '-' + d.slice(4) : tr(v);
  }
  window.TSBD_mdig = mdig;
  // QA-FEATURE: cho phep banner nhac no chinh doc so tai san sap het han the chap
  window.TSBD_getExpiringSoonCount = function () {
    try {
      if (!S.rows) return 0;
      return S.rows.filter(function (t) { var d = soonDays(t.ngayHetHan); return d >= 0 && d <= 60; }).length;
    } catch (e) { return 0; }
  };
  window.TSBD_openExpiringSoon = function () {
    showPage('tsbd');
    setTimeout(function () {
      var cb = document.getElementById('tsbd-f-exp');
      if (cb) { cb.checked = true; if (typeof tsbdRender === 'function') tsbdRender(); }
    }, 150);
  };

  /* ---------- IndexedDB riêng ---------- */
  function db() {
    return new Promise(function (res, rej) {
      if (!window.indexedDB) { rej(new Error('Trình duyệt không cho dùng IndexedDB')); return; } // P09: chế độ riêng tư/chính sách chặn ⇒ trước đây TypeError chưa bắt
      var rq = indexedDB.open(TS_DB, TS_VER);
      rq.onupgradeneeded = function (e) {
        var d = e.target.result;
        if (!d.objectStoreNames.contains(ST_KV)) d.createObjectStore(ST_KV);
        if (!d.objectStoreNames.contains(ST_SNAP)) d.createObjectStore(ST_SNAP, { keyPath: 'id' });
      };
      rq.onsuccess = function () { res(rq.result); }; rq.onerror = function () { rej(rq.error); };
    });
  }
  /* P09: lưu sao kê hiện hành; IndexedDB không dùng được ⇒ báo MỘT lần (dữ liệu chỉ còn trong phiên), không để lỗi Promise chưa bắt */
  function saveCurrent() {
    return kvSet('current', { rows: S.rows, src: S.src, importedAt: S.importedAt }).catch(function () {
      if (!S._idbWarned) { S._idbWarned = 1; toast('⚠️ Không lưu được sao kê TSBĐ vào trình duyệt (IndexedDB không dùng được) — dữ liệu chỉ tồn tại đến khi đóng trang', 'err'); }
    });
  }
  function kvSet(k, v) { return db().then(function (d) { return new Promise(function (r, j) { var t = d.transaction(ST_KV, 'readwrite'); t.objectStore(ST_KV).put(v, k); t.oncomplete = function () { r(1); }; t.onerror = function () { j(t.error); }; }); }); }
  function kvGet(k) { return db().then(function (d) { return new Promise(function (r) { var t = d.transaction(ST_KV, 'readonly'), q = t.objectStore(ST_KV).get(k); q.onsuccess = function () { r(q.result || null); }; q.onerror = function () { r(null); }; }); }).catch(function () { return null; }); }
  function snapAll() { return db().then(function (d) { return new Promise(function (r) { var t = d.transaction(ST_SNAP, 'readonly'), q = t.objectStore(ST_SNAP).getAll(); q.onsuccess = function () { r(q.result || []); }; q.onerror = function () { r([]); }; }); }).catch(function () { return []; }); }
  function snapPut(o) { return db().then(function (d) { return new Promise(function (r, j) { var t = d.transaction(ST_SNAP, 'readwrite'); t.objectStore(ST_SNAP).put(o); t.oncomplete = function () { r(1); }; t.onerror = function () { j(t.error); }; }); }); }
  function snapDel(id) { return db().then(function (d) { return new Promise(function (r) { var t = d.transaction(ST_SNAP, 'readwrite'); t.objectStore(ST_SNAP).delete(id); t.oncomplete = function () { r(1); }; }); }); }

  /* ---------- chuẩn hoá TS.XLS ---------- */
  var MAP = { clno: 'soTS', clcustno: 'maChuTS', clcustnm: 'tenChuTS', cltpcd: 'loaiTS', cldtltpcd: 'chiTietTS', clqtysz: 'dienTich', clunittpcd: 'donVi', clloc: 'diaChiTS', clamt: 'giaTriTS', plgno: 'soHDTC', plgdt: 'ngayTheChap', plgtpcd: 'kieuTheChap', exprdt: 'ngayHetHan', avblamtrt: 'tyLeTSBD', plgamt: 'giaTriTC', plgcustno: 'maKH', plgcustnm: 'tenKH', clccycd: 'tienTe', clholdcd: 'giuTS', ntydt: 'ngayDinhGia', rem: 'ghiChu', lnofcnm: 'cbtd', trctcd: 'phong', name_2: 'soGCN' };
  function normalizeRows(aoa) {
    if (!aoa || !aoa.length) return [];
    var hdr = aoa[0].map(function (h) { return tr(h).toLowerCase(); });
    var idx = {}; hdr.forEach(function (h, i) { if (MAP[h] != null && idx[MAP[h]] == null) idx[MAP[h]] = i; });
    if (idx.maChuTS == null && idx.maKH == null) throw new Error('Không tìm thấy cột clcustno/plgcustno — file không đúng mẫu TS IPCAS');
    var out = [];
    for (var r = 1; r < aoa.length; r++) {
      var row = aoa[r]; if (!row) continue;
      var g = function (k) { return idx[k] == null ? '' : row[idx[k]]; };
      var ma1 = tr(g('maChuTS')), ma2 = tr(g('maKH')) || ma1;
      if (!ma1 && !ma2 && !tr(g('soTS'))) continue;
      out.push({
        soTS: tr(g('soTS')), maKH: ma2, maChuTS: ma1,
        tenKH: tr(g('tenKH')) || tr(g('tenChuTS')), tenChuTS: tr(g('tenChuTS')),
        soHDTC: tr(g('soHDTC')), loaiTS: clean(g('loaiTS')), chiTietTS: clean(g('chiTietTS')),
        dienTich: tr(g('dienTich')), donVi: tr(g('donVi')), diaChiTS: tr(g('diaChiTS')),
        giaTriTS: num(g('giaTriTS')), giaTriTC: num(g('giaTriTC')), tyLeTSBD: num(g('tyLeTSBD')),
        ngayTheChap: dISO(g('ngayTheChap')), ngayHetHan: dISO(g('ngayHetHan')), ngayDinhGia: dISO(g('ngayDinhGia')),
        soGCN: tr(g('soGCN')), cbtd: tr(g('cbtd')), phong: tr(g('phong')), ghiChu: tr(g('ghiChu')),
        kieuTheChap: clean(g('kieuTheChap')),
        tienTe: tr(g('tienTe')) || 'VND', giuTS: tr(g('giuTS')), // HM-10
        coBenThu3: !!(ma1 && ma2 && ma1 !== ma2)
      });
    }
    return out;
  }

  window.tsbdImportFile = function (inp) {
    var f = inp && inp.files && inp.files[0]; if (!f) return;
    if (!window.XLSX) { toast('⚠️ Chưa nạp xong thư viện đọc Excel, thử lại sau vài giây', 'err'); return; }
    toast('⏳ Đang đọc file tài sản...', '');
    var fr = new FileReader();
    fr.onload = async function (e) {
      try {
        /* P09: dense + bỏ chuỗi hiển thị (.w) — đầu ra sheet_to_json(raw) y hệt, đọc 19.133 dòng nhanh ~3 lần (6,7 s → 2,3 s).
           P10 (T3): đọc trong Web Worker (TD.xlsrows.aoa, cùng tuỳ chọn) — luồng chính không đơ; không có worker ⇒ đọc tại chỗ */
        var buf = new Uint8Array(e.target.result);
        var aoa = await TD.readRows('aoa', buf, function () { return TD.xlsrows.aoa(XLSX, buf); });
        var rows = normalizeRows(aoa);
        if (!rows.length) { toast('⚠️ Không đọc được dòng tài sản nào', 'err'); return; }
        S.rows = rows; S.src = f.name; S.importedAt = new Date().toISOString(); S.page = 1;
        tsbdReconcile(false);
        saveCurrent();
        toast('✅ Đã nhập ' + rows.length + ' tài sản từ ' + f.name, 'green');
      } catch (err) { console.error(err); toast('❌ Lỗi đọc file: ' + err.message, 'err'); }
      inp.value = '';
    };
    if (f.__tdBuf) f.__tdBuf.then(function (ab) { fr.onload({ target: { result: ab } }); }, function () { fr.readAsArrayBuffer(f); }); // P10 (T10): dùng lại nội dung Trung tâm nhập đã đọc
    else fr.readAsArrayBuffer(f);
  };

  /* ---------- đối chiếu dư nợ ---------- */
  /* Chỉ ĐỌC từ DATA.qltd — không bao giờ ghi đè ngược sang các menu khác. */
  function duNoMap() {
    var byMa = Object.create(null), byTen = Object.create(null), tenDup = Object.create(null),
      q = (window.DATA && DATA.qltd) || [];
    for (var i = 0; i < q.length; i++) {
      var r = q[i]; if (!r) continue;
      var k = mdig(r[0]);
      if (k) { if (!byMa[k]) byMa[k] = { dn: 0, ten: tr(r[1]) }; byMa[k].dn += num(r[11]); }
      var n = nmKey(r[1]);
      if (n) {
        if (!byTen[n]) byTen[n] = { dn: 0, ma: k };
        else if (byTen[n].ma && k && byTen[n].ma !== k) tenDup[n] = 1;   // trùng tên → không dùng
        byTen[n].dn += num(r[11]);
      }
    }
    return { byMa: byMa, byTen: byTen, tenDup: tenDup };
  }

  window.tsbdReconcile = function (notify) {
    var m = duNoMap(), hit = 0, byChu = 0, byTen = 0;
    S.rows.forEach(function (t) {
      var kKH = mdig(t.maKH), kChu = mdig(t.maChuTS), hitRec = null, how = '';
      if (kKH && m.byMa[kKH]) { hitRec = m.byMa[kKH]; how = 'ma'; }
      else if (kChu && m.byMa[kChu]) { hitRec = m.byMa[kChu]; how = 'chu'; byChu++; }   // fallback mã chủ TS (bên thứ 3)
      else {
        var n = nmKey(t.tenKH) || nmKey(t.tenChuTS);
        if (n && m.byTen[n] && !m.tenDup[n]) { hitRec = m.byTen[n]; how = 'ten'; byTen++; }
      }
      if (hitRec) {
        hit++;
        t.duNoHienTai = hitRec.dn;
        t.matchBy = how;
        t.trangThai = hitRec.dn > 0 ? 'con' : 'tt';
      } else {
        t.duNoHienTai = 0; t.matchBy = ''; t.trangThai = 'kct';
      }
    });
    S.matched = hit; S.byChu = byChu; S.byTen = byTen;
    S.qltdRows = ((window.DATA && DATA.qltd) || []).length;
    tsbdRender(); tsbdSummary(); tsbdQC();
    if (notify) {
      if (!S.qltdRows) { toast('⚠️ Chưa có dữ liệu dư nợ (DATA.qltd trống) — hãy nhập file IPCAS dư nợ trước', 'err'); return; }
      var ex = (byChu ? ' · ' + byChu + ' khớp qua mã chủ TS' : '') + (byTen ? ' · ' + byTen + ' khớp qua tên KH' : '');
      toast('🔄 Đã đối chiếu ' + hit + '/' + S.rows.length + ' tài sản với ' + S.qltdRows + ' dòng dư nợ' + ex, 'green');
    }
  };

  /* ---------- lọc / render ---------- */
  var TT = { con: ['Còn dư nợ', 'tsbd-chip-green'], tt: ['Đã tất toán (dư nợ = 0)', 'tsbd-chip-gray'], kct: ['Không có hồ sơ trong DATA', 'tsbd-chip-slate'] };
  function soonDays(iso) { if (!iso) return 1e9; var d = new Date(iso + 'T00:00:00'); if (isNaN(d)) return 1e9; return Math.round((d - todayMidnight()) / 864e5); }
  function filtered() {
    var q = tr(($id('tsbd-q') || {}).value).toLowerCase(),
      ftt = ($id('tsbd-f-tt') || {}).value || '', floai = ($id('tsbd-f-loai') || {}).value || '',
      fcb = ($id('tsbd-f-cbtd') || {}).value || '', fb3 = !!($id('tsbd-f-b3') || {}).checked, fex = !!($id('tsbd-f-exp') || {}).checked;
    var out = S.rows.filter(function (t) {
      if (ftt && t.trangThai !== ftt) return false;
      if (floai && t.loaiTS !== floai) return false;
      if (fcb && t.cbtd !== fcb) return false;
      if (fb3 && !t.coBenThu3) return false;
      if (fex) { var d = soonDays(t.ngayHetHan); if (!(d >= 0 && d <= 60)) return false; }
      if (q && (t.maKH + ' ' + t.maChuTS + ' ' + t.tenKH + ' ' + t.tenChuTS + ' ' + t.soGCN + ' ' + t.diaChiTS + ' ' + t.soHDTC).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    var k = S.sort.k, a = S.sort.asc ? 1 : -1;
    out.sort(function (x, y) {
      if (k === 'cbtd') return window.TD_SXCB.cmp(x.phong, x.cbtd, y.phong, y.cbtd) * a;
      var vx = x[k], vy = y[k];
      if (typeof vx === 'number' || typeof vy === 'number') return (num(vx) - num(vy)) * a;
      return String(vx || '').localeCompare(String(vy || ''), 'vi') * a;
    });
    return out;
  }
  window.tsbdSort = function (k) { if (S.sort.k === k) S.sort.asc = !S.sort.asc; else { S.sort.k = k; S.sort.asc = true; } tsbdRender(); };
  window.tsbdGoPage = function (p) { S.page = p; tsbdRender(); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  function fillSelects() {
    [['tsbd-f-loai', 'loaiTS'], ['tsbd-f-cbtd', 'cbtd']].forEach(function (p) {
      var el = $id(p[0]); if (!el || el.dataset.filled === String(S.rows.length)) return;
      var cur = el.value, vals = {}; S.rows.forEach(function (t) { if (t[p[1]]) vals[t[p[1]]] = 1; });
      var ks = Object.keys(vals).sort(p[1] === 'cbtd'
        ? function (a, b) { return window.TD_SXCB.cmpName(a, b); }
        : function (a, b) { return a.localeCompare(b, 'vi'); });
      el.innerHTML = '<option value="">' + el.options[0].text + '</option>' + ks.map(function (k) { return '<option value="' + esc(k) + '">' + esc(k) + '</option>'; }).join('');
      el.value = cur; el.dataset.filled = String(S.rows.length);
    });
  }

  window.tsbdRender = function () {
    var tb = $id('tsbd-tbody'); if (!tb) return;
    fillSelects();
    var rows = filtered(), total = rows.length, per = S.per;
    var pages = Math.max(1, Math.ceil(total / per)); if (S.page > pages) S.page = pages;
    var start = (S.page - 1) * per, view = rows.slice(start, start + per);
    tb.innerHTML = view.map(function (t, i) {
      var st = TT[t.trangThai] || TT.kct, d = soonDays(t.ngayHetHan);
      var expCls = (d >= 0 && d <= 60) ? ' tsbd-exp-soon' : (d < 0 ? ' tsbd-exp-past' : '');
      return '<tr class="' + (t.coBenThu3 ? 'tsbd-b3' : '') + '">' +
        '<td>' + (start + i + 1) + '</td>' +
        '<td class="tsbd-mono copy-cell" onclick="copyCellValue(this,event)" title="Click để copy MÃ KH">' + esc(maShow(t.maKH || t.maChuTS)) +
        (t.coBenThu3 ? '<span class="tsbd-tag-b3" title="TS của bên thứ 3: chủ TS ' + esc(maShow(t.maChuTS)) + ' — ' + esc(t.tenChuTS) + '">BÊN 3</span>' : '') +
        (t.matchBy === 'chu' ? '<span class="tsbd-tag-alt" title="Khớp dư nợ qua mã chủ tài sản">M.CHỦ TS</span>' : '') +
        (t.matchBy === 'ten' ? '<span class="tsbd-tag-alt" title="Khớp dư nợ theo tên KH — cần kiểm tra lại">THEO TÊN</span>' : '') + '</td>' +
        '<td>' + esc(t.tenKH) + (t.coBenThu3 ? '<div class="tsbd-sub">Chủ TS: ' + esc(t.tenChuTS) + '</div>' : '') + '</td>' +
        '<td>' + esc(t.tenChuTS) + '</td>' +
        '<td class="tsbd-mono">' + esc(maShow(t.maChuTS)) + '</td>' +
        '<td>' + esc(t.loaiTS) + '<div class="tsbd-sub">' + esc(t.chiTietTS) + '</div></td>' +
        '<td>' + esc(t.diaChiTS) + (t.dienTich ? '<div class="tsbd-sub">' + esc(t.dienTich) + ' ' + esc(t.donVi) + '</div>' : '') + '</td>' +
        '<td style="text-align:right" class="tsbd-mono">' + money(t.giaTriTS) + '</td>' +
        '<td style="text-align:right">' + (t.tyLeTSBD ? t.tyLeTSBD : '') + '</td>' +
        '<td class="tsbd-mono">' + esc(t.soGCN) + '</td>' +
        '<td>' + esc(dVN(t.ngayTheChap)) + '</td>' +
        '<td class="' + expCls + '">' + esc(dVN(t.ngayHetHan)) + '</td>' +
        '<td>' + esc(t.cbtd) + '</td>' +
        '<td style="text-align:right" class="tsbd-mono">' + (t.duNoHienTai ? money(t.duNoHienTai) : '—') + '</td>' +
        '<td><span class="tsbd-chip ' + st[1] + '">' + st[0] + '</span></td></tr>';
    }).join('') || '<tr><td colspan="15" style="text-align:center;padding:22px;color:#64748b">Không có tài sản khớp bộ lọc</td></tr>';

    var pg = $id('tsbd-pager');
    if (pg) {
      var h = '<span class="tsbd-pginfo">' + total.toLocaleString('vi-VN') + ' tài sản · Trang ' + S.page + '/' + pages + '</span>';
      if (pages > 1) {
        h += '<button class="btn btn-sm" onclick="tsbdGoPage(1)">«</button>';
        h += '<button class="btn btn-sm" onclick="tsbdGoPage(' + Math.max(1, S.page - 1) + ')">‹</button>';
        h += '<button class="btn btn-sm" onclick="tsbdGoPage(' + Math.min(pages, S.page + 1) + ')">›</button>';
        h += '<button class="btn btn-sm" onclick="tsbdGoPage(' + pages + ')">»</button>';
      }
      pg.innerHTML = h;
    }
    var k = $id('tsbd-kpis');
    if (k) {
      var c = { con: 0, tt: 0, kct: 0, b3: 0, gt: 0 };
      rows.forEach(function (t) { c[t.trangThai]++; if (t.coBenThu3) c.b3++; c.gt += t.giaTriTS; });
      k.innerHTML = kpi('Tài sản (theo lọc)', total.toLocaleString('vi-VN'), '') + kpi('Còn dư nợ', c.con.toLocaleString('vi-VN'), 'green') +
        kpi('Đã tất toán / dư nợ 0', c.tt.toLocaleString('vi-VN'), 'gray') + kpi('Không có hồ sơ trong DATA', c.kct.toLocaleString('vi-VN'), 'slate') +
        kpi('Bên thứ 3', c.b3.toLocaleString('vi-VN'), 'amber') + kpi('Tổng giá trị TS (tr.đ)', money(c.gt / 1e6), 'blue');
    }
    var src = $id('tsbd-src');
    if (src) src.textContent = S.rows.length ? ('Nguồn: ' + (S.src || 'IPCAS TS') + ' · ' + S.rows.length.toLocaleString('vi-VN') + ' TS · đối chiếu ' + ((window.DATA && DATA.qltd) || []).length.toLocaleString('vi-VN') + ' dòng dư nợ') : 'Chưa có dữ liệu tài sản — bấm “Nhập TS từ IPCAS”';
  };
  function kpi(l, v, c) { return '<div class="tsbd-kpi tsbd-kpi-' + (c || 'base') + '"><div class="tsbd-kpi-v">' + v + '</div><div class="tsbd-kpi-l">' + l + '</div></div>'; }

  /* ---------- tổng hợp ---------- */
  function tsbdSummary() {
    var el = $id('tsbd-sum'); if (!el) return;
    var byLoai = {}, byTT = { con: [0, 0], tt: [0, 0], kct: [0, 0] }, byCB = {}, kh = {}, khCon = {};
    // HM-10: mỗi TS (clno) tính một lần; chỉ cộng VND vào giá trị
    var _dd = TD.tsbd.dedupe(S.rows), _dupSet = new Set(_dd.dupRows), _TS = TD.tsbd.summarize(S.rows);
    S.rows.forEach(function (t) {
      kh[t.maKH] = 1; if (t.trangThai === 'con') khCon[t.maKH] = 1;
      if (_dupSet.has(t)) return;
      var gv = TD.tsbd.isVND(t) ? t.giaTriTS : 0;
      byLoai[t.loaiTS] = byLoai[t.loaiTS] || [0, 0]; byLoai[t.loaiTS][0]++; byLoai[t.loaiTS][1] += gv;
      var s = byTT[t.trangThai] || byTT.kct; s[0]++; s[1] += gv;
      byCB[t.cbtd || '(không rõ)'] = byCB[t.cbtd || '(không rõ)'] || [0, 0]; byCB[t.cbtd || '(không rõ)'][0]++; byCB[t.cbtd || '(không rõ)'][1] += gv;
    });
    var _m = duNoMap(), _dn = {}; Object.keys(_m.byMa).forEach(function (k) { _dn[k] = _m.byMa[k].dn; });
    var _cov = TD.tsbd.coverage(S.rows, _dn, mdig), _fxN = 0; Object.keys(_TS.fx).forEach(function (c) { _fxN += _TS.fx[c][0]; });
    var _fxTxt = Object.keys(_TS.fx).map(function (c) { return c + ': ' + _TS.fx[c][0] + ' TS · ' + Math.round(_TS.fx[c][1]).toLocaleString('vi-VN'); }).join(' | ');
    var _holdTxt = Object.keys(_TS.hold).map(function (h) { return (h === 'N' ? 'N (đang giữ)' : h) + ': ' + _TS.hold[h].toLocaleString('vi-VN'); }).join(' · ');
    function tbl(title, obj, c1) {
      var ks = Object.keys(obj).sort(function (a, b) { return obj[b][1] - obj[a][1]; });
      return '<div class="card" style="margin:10px 0"><div class="card-head"><span>' + title + '</span></div>' +
        '<div class="table-wrap" style="max-height:340px"><table class="tsbd-table"><thead><tr><th>' + c1 + '</th><th style="text-align:right">SỐ TS</th><th style="text-align:right">GIÁ TRỊ (tr.đ)</th></tr></thead><tbody>' +
        ks.map(function (k) { return '<tr><td>' + esc(k) + '</td><td style="text-align:right">' + obj[k][0] + '</td><td style="text-align:right" class="tsbd-mono">' + money(obj[k][1] / 1e6) + '</td></tr>'; }).join('') +
        '</tbody></table></div></div>';
    }
    el.innerHTML =
      '<div class="tsbd-kpis">' + kpi('Tổng tài sản (khử trùng clno)', _TS.unique.toLocaleString('vi-VN'), '') +
      kpi('Khách hàng có TS', Object.keys(kh).length.toLocaleString('vi-VN'), 'blue') +
      kpi('KH còn dư nợ (theo hồ sơ vay)', _cov.khCon.toLocaleString('vi-VN'), 'green') + kpi('…trong đó có TS theo mã KH', _cov.khCoTS.toLocaleString('vi-VN'), 'green') + // HM-10: bản cũ đếm khoá phía TS (mã chủ TS/tên) nên lớn hơn số KH thật
      
      kpi('TS của KH đã tất toán', byTT.tt[0].toLocaleString('vi-VN'), 'gray') +
      kpi('TS không khớp DATA', byTT.kct[0].toLocaleString('vi-VN'), 'slate') +
      kpi('Tổng giá trị TS VND (tỷ đ)', money(_TS.giaTriTS_VND / 1e9), 'amber') +
      kpi('Dòng trùng clno đã loại', _TS.dupRows.toLocaleString('vi-VN'), 'slate') + kpi('TS ngoại tệ (tách riêng)', _fxN.toLocaleString('vi-VN'), 'slate') +
      kpi('KH còn dư nợ chưa có TS theo mã KH', _cov.khKhongTS.length.toLocaleString('vi-VN'), 'red') + kpi('Tỷ lệ phủ TS/dư nợ (KH có TS)', (_cov.tyLePhu * 100).toFixed(1) + '%', 'green') + '</div>' +
      '<div class="tsbd-note">Quy tắc: mỗi TS (clno) tính 1 lần (' + _TS.dupKeys + ' clno xuất hiện nhiều dòng vì thế chấp nhiều hợp đồng); giá trị chỉ cộng VND; ' + (_fxTxt ? 'ngoại tệ theo nguyên tệ — ' + esc(_fxTxt) + '; ' : '') + 'dư nợ mỗi KH tính 1 lần. Cột clholdcd: ' + esc(_holdTxt) + ' (HM-25: N = đang giữ TS theo xác nhận 22/10/2026; chỉ thống kê, không dùng để lọc).</div>' +
      tbl('📦 Theo loại tài sản', byLoai, 'LOẠI TÀI SẢN') +
      tbl('🧾 Theo trạng thái dư nợ', { 'Còn dư nợ': byTT.con, 'Đã tất toán / dư nợ = 0': byTT.tt, 'Không có hồ sơ trong DATA': byTT.kct }, 'TRẠNG THÁI') +
      tbl('👤 Theo cán bộ tín dụng', byCB, 'CBTD');
  }

  /* ---------- chất lượng dữ liệu ---------- */
  function tsbdQC() {
    var el = $id('tsbd-qc'); if (!el) return;
    var badDate = S.rows.filter(function (t) { var y = +String(t.ngayHetHan).slice(0, 4); return y && (y > 2100 || y < 1990); });
    var soon = S.rows.filter(function (t) { var d = soonDays(t.ngayHetHan); return d >= 0 && d <= 60; });
    var past = S.rows.filter(function (t) { var d = soonDays(t.ngayHetHan); return d < 0 && t.ngayHetHan; });
    var noGCN = S.rows.filter(function (t) { return !t.soGCN; });
    var zeroVal = S.rows.filter(function (t) { return !t.giaTriTS; });
    var kct = S.rows.filter(function (t) { return t.trangThai === 'kct'; });
    function blk(title, arr, cols) {
      return '<div class="card" style="margin:10px 0"><div class="card-head"><span>' + title + ' — ' + arr.length + ' dòng</span></div>' +
        '<div class="table-wrap" style="max-height:300px"><table class="tsbd-table"><thead><tr><th>MÃ KH</th><th>TÊN KH</th><th>SỐ TS</th><th>' + cols + '</th></tr></thead><tbody>' +
        arr.slice(0, 300).map(function (t) { return '<tr><td class="tsbd-mono">' + esc(maShow(t.maKH)) + '</td><td>' + esc(t.tenKH) + '</td><td class="tsbd-mono">' + esc(t.soTS) + '</td><td>' + esc(dVN(t.ngayHetHan) + ' · ' + t.loaiTS + ' · ' + money(t.giaTriTS)) + '</td></tr>'; }).join('') +
        '</tbody></table></div>' + (arr.length > 300 ? '<div class="tsbd-note">Hiển thị 300 dòng đầu; xuất Excel để xem đầy đủ.</div>' : '') + '</div>';
    }
    el.innerHTML = '<div class="tsbd-note">Các cảnh báo dưới đây <b>không tự động sửa dữ liệu</b> — chỉ liệt kê để chi nhánh rà soát với IPCAS.</div>' +
      '<div class="tsbd-kpis">' + kpi('Ngày hết hạn bất thường', badDate.length, 'amber') + kpi('Sắp hết hạn ≤60 ngày', soon.length, 'amber') +
      kpi('Đã quá hạn thế chấp', past.length, 'red') + kpi('Thiếu số GCN', noGCN.length, 'slate') +
      kpi('Giá trị TS = 0', zeroVal.length, 'slate') + kpi('Mã KH không khớp DATA', kct.length, 'slate') + '</div>' +
      blk('⚠️ Ngày hết hạn thế chấp bất thường (năm >2100)', badDate, 'HẾT HẠN · LOẠI · GIÁ TRỊ') +
      blk('⏰ Sắp hết hạn trong 60 ngày', soon, 'HẾT HẠN · LOẠI · GIÁ TRỊ') +
      blk('🔴 Đã quá hạn thế chấp', past, 'HẾT HẠN · LOẠI · GIÁ TRỊ');
  }

  /* ---------- snapshot ---------- */
  function snapStat(rows) {
    var _d = TD.tsbd.dedupe(rows); rows = _d.unique; // HM-10: khử trùng clno, chỉ cộng VND
    var st = { count: rows.length, gt: 0, con: 0, tt: 0, kct: 0, b3: 0 };
    rows.forEach(function (t) { if (TD.tsbd.isVND(t)) st.gt += t.giaTriTS; st[t.trangThai] = (st[t.trangThai] || 0) + 1; if (t.coBenThu3) st.b3++; });
    return st;
  }
  window.tsbdSaveSnapshot = function () {
    if (!S.rows.length) { toast('⚠️ Chưa có dữ liệu tài sản để lưu mốc', 'err'); return; }
    var kieu = ($id('tsbd-snap-kieu') || {}).value || 'khac';
    var d = new Date(), lbl = tr(($id('tsbd-snap-label') || {}).value);
    if (!lbl) lbl = kieu === 'thang' ? ('T' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear())
      : kieu === 'quy' ? ('Q' + (Math.floor(d.getMonth() / 3) + 1) + '/' + d.getFullYear())
        : kieu === 'nam' ? ('Năm ' + d.getFullYear()) : d.toLocaleDateString('vi-VN');
    var st = snapStat(S.rows);
    var rec = {
      id: 'snap_' + Date.now(), label: lbl, kieu: kieu, ts: Date.now(), src: S.src,
      stat: st,
      keys: S.rows.map(function (t) { return [t.soTS, t.maKH, t.giaTriTS, t.trangThai]; })
    };
    snapPut(rec).then(function () { toast('💾 Đã lưu mốc “' + lbl + '”', 'green'); tsbdRenderSnaps(); }).catch(function (e) { toast('❌ Lỗi lưu snapshot: ' + e.message, 'err'); });
  };
  window.tsbdDelSnapshot = function (id) { if (!confirm('Xoá mốc snapshot này?')) return; snapDel(id).then(function () { tsbdRenderSnaps(); toast('🗑️ Đã xoá mốc', ''); }).catch(function (e) { toast('❌ Không xoá được mốc: ' + e.message, 'err'); }); };
  var KIEU = { thang: 'Tháng', quy: 'Quý', nam: 'Năm', khac: 'Tuỳ chọn' };
  function tsbdRenderSnaps() {
    return snapAll().catch(function () { return []; }).then(function (list) {
      list.sort(function (a, b) { return b.ts - a.ts; });
      S.snaps = list;
      var tb = $id('tsbd-snap-tbody');
      if (tb) tb.innerHTML = list.map(function (s) {
        return '<tr><td><b>' + esc(s.label) + '</b></td><td>' + (KIEU[s.kieu] || s.kieu) + '</td><td>' + new Date(s.ts).toLocaleString('vi-VN') + '</td>' +
          '<td style="text-align:right">' + s.stat.count + '</td><td style="text-align:right" class="tsbd-mono">' + money(s.stat.gt / 1e6) + '</td>' +
          '<td style="text-align:right">' + (s.stat.con || 0) + '</td><td style="text-align:right">' + (s.stat.tt || 0) + '</td><td style="text-align:right">' + (s.stat.b3 || 0) + '</td>' +
          '<td><button class="btn btn-sm" onclick="tsbdDelSnapshot(\'' + s.id + '\')">🗑️</button></td></tr>';
      }).join('') || '<tr><td colspan="9" style="text-align:center;padding:18px;color:#64748b">Chưa có mốc nào được lưu</td></tr>';
      var sel = $id('tsbd-snap-cmp');
      if (sel) { var cur = sel.value; sel.innerHTML = '<option value="">— So sánh hiện tại với mốc —</option>' + list.map(function (s) { return '<option value="' + s.id + '">' + esc(s.label) + ' (' + new Date(s.ts).toLocaleDateString('vi-VN') + ')</option>'; }).join(''); sel.value = cur; }
      return list;
    });
  }
  window.tsbdCompare = function () {
    var id = ($id('tsbd-snap-cmp') || {}).value, box = $id('tsbd-cmp'); if (!box) return;
    if (!id) { box.innerHTML = ''; return; }
    var s = (S.snaps || []).filter(function (x) { return x.id === id; })[0]; if (!s) return;
    var oldMap = {}; s.keys.forEach(function (k) { oldMap[k[0]] = k; });
    var newMap = {}; S.rows.forEach(function (t) { newMap[t.soTS] = t; });
    var them = S.rows.filter(function (t) { return !oldMap[t.soTS]; });
    var mat = s.keys.filter(function (k) { return !newMap[k[0]]; });
    var doiTT = S.rows.filter(function (t) { var o = oldMap[t.soTS]; return o && o[3] !== t.trangThai; });
    var now = snapStat(S.rows);
    function d(a, b) { var v = a - b; return (v > 0 ? '+' : '') + v.toLocaleString('vi-VN'); }
    box.innerHTML = '<div class="card" style="margin-top:12px"><div class="card-head"><span>📈 So sánh: mốc “' + esc(s.label) + '” → hiện tại</span></div>' +
      '<div class="tsbd-kpis">' + kpi('Biến động số TS', d(now.count, s.stat.count), 'blue') + kpi('Biến động giá trị (tr.đ)', d(Math.round(now.gt / 1e6), Math.round(s.stat.gt / 1e6)), 'blue') +
      kpi('TS mới xuất hiện', them.length, 'green') + kpi('TS không còn trong file', mat.length, 'red') + kpi('TS đổi trạng thái dư nợ', doiTT.length, 'amber') + '</div>' +
      '<div class="table-wrap" style="max-height:320px"><table class="tsbd-table"><thead><tr><th>BIẾN ĐỘNG</th><th>SỐ TS</th><th>MÃ KH</th><th>TÊN KH</th><th>CHI TIẾT</th></tr></thead><tbody>' +
      them.slice(0, 200).map(function (t) { return '<tr><td><span class="tsbd-chip tsbd-chip-green">TS mới</span></td><td class="tsbd-mono">' + esc(t.soTS) + '</td><td class="tsbd-mono">' + esc(maShow(t.maKH)) + '</td><td>' + esc(t.tenKH) + '</td><td>' + money(t.giaTriTS) + ' đ</td></tr>'; }).join('') +
      mat.slice(0, 200).map(function (k) { return '<tr><td><span class="tsbd-chip tsbd-chip-red">Đã rút/giải chấp</span></td><td class="tsbd-mono">' + esc(k[0]) + '</td><td class="tsbd-mono">' + esc(k[1]) + '</td><td>—</td><td>' + money(k[2]) + ' đ</td></tr>'; }).join('') +
      doiTT.slice(0, 200).map(function (t) { var o = oldMap[t.soTS]; return '<tr><td><span class="tsbd-chip tsbd-chip-amber">Đổi trạng thái</span></td><td class="tsbd-mono">' + esc(t.soTS) + '</td><td class="tsbd-mono">' + esc(t.maKH) + '</td><td>' + esc(t.tenKH) + '</td><td>' + esc((TT[o[3]] || TT.kct)[0]) + ' → ' + esc((TT[t.trangThai] || TT.kct)[0]) + '</td></tr>'; }).join('') +
      '</tbody></table></div></div>';
  };

  /* ---------- xuất Excel ---------- */
  window.tsbdExportExcel = function () {
    if (!S.rows.length) { toast('⚠️ Chưa có dữ liệu tài sản', 'err'); return; }
    if (!window.XLSX) { toast('⚠️ Thư viện Excel chưa sẵn sàng', 'err'); return; }
    var H = ['Mã KH', 'Tên KH', 'Loại TS', 'Chi tiết TS', 'Địa chỉ/Mô tả', 'Diện tích', 'ĐVT', 'Giá trị TS (đ)', 'Tỷ lệ TSBĐ (%)', 'Số GCN', 'Số TS (clno)', 'Số HĐTC', 'Ngày thế chấp', 'Ngày hết hạn', 'CBTD', 'Dư nợ hiện tại (đ)', 'Trạng thái', 'Bên thứ 3', 'Mã chủ TS', 'Tên chủ TS'];
    function row(t) {
      return [t.maKH, t.tenKH, t.loaiTS, t.chiTietTS, t.diaChiTS, t.dienTich, t.donVi, t.giaTriTS, t.tyLeTSBD, t.soGCN, t.soTS, t.soHDTC, dVN(t.ngayTheChap), dVN(t.ngayHetHan), t.cbtd, t.duNoHienTai || 0, (TT[t.trangThai] || TT.kct)[0], t.coBenThu3 ? 'CÓ' : '', t.maChuTS, t.tenChuTS];
    }
    var wb = XLSX.utils.book_new();
    var con = S.rows.filter(function (t) { return t.trangThai === 'con'; });
    var tt = S.rows.filter(function (t) { return t.trangThai !== 'con'; });
    var b3 = S.rows.filter(function (t) { return t.coBenThu3; });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([H].concat(con.map(row))), '1-Con du no');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([H].concat(tt.map(row))), '2-Da tat toan');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([H].concat(b3.map(row))), '3-Canh bao ben thu 3');
    var st = snapStat(S.rows), kh = {}; S.rows.forEach(function (t) { kh[t.maKH] = 1; });
    var byLoai = {}; S.rows.forEach(function (t) { byLoai[t.loaiTS] = (byLoai[t.loaiTS] || 0) + 1; });
    var sum = [['CHỈ TIÊU', 'GIÁ TRỊ'], ['Nguồn dữ liệu', S.src || 'IPCAS TS'], ['Thời điểm nhập', S.importedAt ? new Date(S.importedAt).toLocaleString('vi-VN') : ''],
    ['Thời điểm xuất báo cáo', new Date().toLocaleString('vi-VN')], ['Tổng số dòng tài sản', st.count], ['Số khách hàng duy nhất', Object.keys(kh).length],
    ['Tổng giá trị tài sản (đ)', st.gt], ['TS của KH còn dư nợ', st.con], ['TS của KH đã tất toán (dư nợ = 0)', st.tt || 0],
    ['TS có mã KH không khớp DATA.qltd', st.kct || 0], ['TS bên thứ 3 bảo lãnh', st.b3], ['Số dòng dư nợ đối chiếu (DATA.qltd)', ((window.DATA && DATA.qltd) || []).length], ['', '']]
      .concat([['PHÂN LOẠI TÀI SẢN', 'SỐ LƯỢNG']]).concat(Object.keys(byLoai).map(function (k) { return [k, byLoai[k]]; }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sum), '4-Tong hop');
    var d = new Date(), nm = 'DoiChieu_TSBD_' + d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2) + '.xlsx';
    XLSX.writeFile(wb, nm);
    toast('📊 Đã xuất ' + nm, 'green');
  };

  /* ---------- tabs & init ---------- */
  window.tsbdSwitchTab = function (t) {
    ['ds', 'th', 'snap', 'qc'].forEach(function (k) { var p = $id('tsbd-pane-' + k); if (p) p.style.display = (k === t ? '' : 'none'); });
    document.querySelectorAll('.tsbd-tab').forEach(function (b) { b.classList.toggle('active', b.dataset.tab === t); });
    if (t === 'th') tsbdSummary(); if (t === 'qc') tsbdQC(); if (t === 'snap') tsbdRenderSnaps();
  };

  window.tsbdInit = function () {
    if (S._init) { tsbdReconcile(false); return; }
    S._init = true;
    kvGet('current').catch(function () { return null; }).then(function (cur) { // P09: IndexedDB lỗi ⇒ vẫn đối chiếu và dựng danh sách mốc
      if (cur && cur.rows && cur.rows.length) { S.rows = cur.rows; S.src = cur.src || ''; S.importedAt = cur.importedAt || ''; }
      else {
        var seed = document.getElementById('tsbd-seed-data');
        if (seed) {
          try {
            S.rows = JSON.parse(seed.textContent);
            S.src = seed.dataset.src || 'IPCAS TS (nhúng sẵn)';
            S.importedAt = seed.dataset.at || '';
            saveCurrent();
          } catch (e) { console.error('TSBD seed parse', e); }
        }
      }
      tsbdReconcile(false);
      tsbdRenderSnaps();
    });
  };
  document.addEventListener('DOMContentLoaded', function () { setTimeout(function () { try { tsbdInit(); } catch (e) { console.error(e); } }, 1200); });
})();

