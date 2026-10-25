
/* ═══════════════════════════════════════════════════════════════
   v14.12 SXCB-CHUAN — Thứ tự chuẩn CÁN BỘ TÍN DỤNG theo PHÒNG BAN
   Hội Sở → PGD Hai Bà Trưng → PGD Số 2; trong mỗi phòng ban: TÊN A→Z (vi).
   Dùng cho MỌI bảng, kể cả bảng chỉ có cột CBTD (suy ra phòng ban từ tên).
   API: TD_SXCB.pbOf(name) | .rank(pb) | .cmpName(a,b) | .cmp(pbA,cbA,pbB,cbB)
        .sortNames(arr) | .cmpRow(a,b,iPb,iCb)
   ═══════════════════════════════════════════════════════════════ */
/* P10 (T6): TD.roster — danh sách cán bộ tín dụng theo phòng ban là CẤU HÌNH NGƯỜI DÙNG (lưu ở trình duyệt), không nhúng tên trong tệp phát hành.
   Chưa cấu hình ⇒ tự học từ dữ liệu dư nợ (cột CBTD + phòng ban). Hàm thuần; nhúng nguyên văn + Node test. */
(function (root) {
  'use strict';
  var TD = root.TD = root.TD || {};
  var R = {};
  R.KEY = 'td_roster_v1';
  R.PB_ORDER = ['Hội Sở', 'PGD Hai Bà Trưng', 'PGD Số 2'];
  R.norm = function (s) {
    return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  };
  function clean(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  function pbIndex(pbs, pb) { var k = R.norm(pb); for (var i = 0; i < pbs.length; i++) if (R.norm(pbs[i].pb) === k) return i; return -1; }
  /* cfg = { pbs: [{ pb, members: [{ name, role }] }], def: 'cán bộ mặc định' } */
  R.empty = function () { return { pbs: [], def: '' }; };
  R.count = function (cfg) { return (cfg && cfg.pbs || []).reduce(function (s, p) { return s + p.members.length; }, 0); };
  /* parse(text): mỗi dòng "Phòng ban | Họ tên | vai trò (tuỳ chọn)"; "Mặc định | Họ tên" = cán bộ mặc định; dòng trống / bắt đầu bằng # bỏ qua.
     Trả { cfg, errors: [{ line, msg }] }. Một cán bộ chỉ thuộc MỘT phòng ban (trùng ⇒ báo lỗi, giữ dòng đầu). */
  R.parse = function (text) {
    var cfg = R.empty(), errors = [], seen = {};
    String(text == null ? '' : text).split(/\r?\n/).forEach(function (raw, i) {
      var line = raw.trim(); if (!line || line.charAt(0) === '#') return;
      var p = line.split('|').map(clean);
      if (p.length < 2 || !p[0] || !p[1]) { errors.push({ line: i + 1, msg: 'cần dạng "Phòng ban | Họ tên | vai trò"' }); return; }
      if (R.norm(p[0]) === 'mac dinh') { cfg.def = p[1]; return; }
      var k = R.norm(p[1]); if (!k) { errors.push({ line: i + 1, msg: 'họ tên trống' }); return; }
      if (seen[k]) { errors.push({ line: i + 1, msg: 'trùng cán bộ ở dòng ' + seen[k] }); return; }
      seen[k] = i + 1;
      var j = pbIndex(cfg.pbs, p[0]); if (j < 0) { cfg.pbs.push({ pb: p[0], members: [] }); j = cfg.pbs.length - 1; }
      cfg.pbs[j].members.push({ name: p[1], role: p[2] || 'CBTD' });
    });
    return { cfg: cfg, errors: errors };
  };
  R.format = function (cfg) {
    var out = ['# Phòng ban | Họ tên cán bộ | Vai trò (CBTD, PP.KH…) — mỗi dòng một cán bộ', '# Dòng "Mặc định | Họ tên" (tuỳ chọn): cán bộ được chọn sẵn ở các bộ lọc'];
    (cfg && cfg.pbs || []).forEach(function (p) { p.members.forEach(function (m) { out.push(p.pb + ' | ' + m.name + ' | ' + (m.role || 'CBTD')); }); });
    if (cfg && cfg.def) out.push('Mặc định | ' + cfg.def);
    return out.join('\n') + '\n';
  };
  /* learn(rows, iCb, iPb): mỗi cán bộ ⇒ phòng ban gặp nhiều nhất trong dữ liệu; phòng ban theo PB_ORDER rồi A→Z; cán bộ A→Z (tiếng Việt) */
  R.learn = function (rows, iCb, iPb) {
    iCb = iCb == null ? 12 : iCb; iPb = iPb == null ? 17 : iPb;
    var by = {}, disp = {};
    (rows || []).forEach(function (r) {
      if (!r) return; var cb = clean(r[iCb]), pb = clean(r[iPb]), k = R.norm(cb); if (!k || !pb) return;
      if (!disp[k]) disp[k] = cb; var o = by[k] || (by[k] = {}); o[pb] = (o[pb] || 0) + 1;
    });
    var coll = typeof Intl !== 'undefined' ? new Intl.Collator('vi', { sensitivity: 'base' }) : null, cmp = function (a, b) { return coll ? coll.compare(a, b) : (a < b ? -1 : a > b ? 1 : 0); };
    var cfg = R.empty();
    Object.keys(by).forEach(function (k) {
      var o = by[k], best = Object.keys(o).sort(function (a, b) { return o[b] - o[a] || cmp(a, b); })[0];
      var j = pbIndex(cfg.pbs, best); if (j < 0) { cfg.pbs.push({ pb: best, members: [] }); j = cfg.pbs.length - 1; }
      cfg.pbs[j].members.push({ name: disp[k], role: 'CBTD' });
    });
    var rk = function (pb) { var i = R.PB_ORDER.map(R.norm).indexOf(R.norm(pb)); return i < 0 ? R.PB_ORDER.length : i; };
    cfg.pbs.sort(function (a, b) { return rk(a.pb) - rk(b.pb) || cmp(a.pb, b.pb); });
    cfg.pbs.forEach(function (p) { p.members.sort(function (a, b) { return cmp(a.name, b.name); }); });
    return cfg;
  };
  /* matcher(cfg): name ⇒ { pb, name, role } hoặc null. Khớp đúng (bỏ dấu/hoa-thường) → cùng số chữ cho phép viết tắt 1 ký tự
     (Lê Thị H Mai ~ Lê Thị Hồng Mai) → khác họ nhưng trùng tên đệm + tên (đổi họ). Nhiều kết quả ⇒ không khớp. */
  R.matcher = function (cfg) {
    var exact = {}, mem = [], cache = {};
    (cfg && cfg.pbs || []).forEach(function (p) { p.members.forEach(function (m) { var k = R.norm(m.name); if (!k) return; var e = { pb: p.pb, name: m.name, role: m.role || 'CBTD', key: k, toks: k.split(' ') }; exact[k] = e; mem.push(e); }); });
    var tokOk = function (a, b) { return a === b || (a.length === 1 && b.charAt(0) === a) || (b.length === 1 && a.charAt(0) === b); };
    return function (name) {
      var k = R.norm(name); if (!k) return null;
      if (Object.prototype.hasOwnProperty.call(cache, k)) return cache[k];
      var res = exact[k] || null;
      if (!res) {
        var t = k.split(' '), hits = [];
        mem.forEach(function (m) { if (m.toks.length !== t.length) return; for (var i = 0; i < t.length; i++) if (!tokOk(t[i], m.toks[i])) return; hits.push(m); });
        if (hits.length !== 1 && t.length >= 2) { var tail = t.slice(-2).join(' '); mem.forEach(function (m) { if (m.toks.length >= 2 && m.toks.slice(-2).join(' ') === tail && hits.indexOf(m) < 0) hits.push(m); }); }
        res = hits.length === 1 ? hits[0] : null;
      }
      cache[k] = res; return res;
    };
  };
  R.load = function (storage) { try { var t = storage.getItem(R.KEY); return t ? R.parse(t).cfg : R.empty(); } catch (e) { return R.empty(); } };
  R.save = function (storage, text) { var p = R.parse(text); if (p.errors.length) return p; if (R.count(p.cfg) || p.cfg.def) storage.setItem(R.KEY, R.format(p.cfg)); else storage.removeItem(R.KEY); return p; };
  /* effective(saved, rows): cấu hình người dùng nếu có cán bộ; ngược lại học từ dữ liệu (giữ cán bộ mặc định đã cấu hình). src: 'config' | 'data' */
  R.effective = function (saved, rows) {
    if (R.count(saved)) return { cfg: saved, src: 'config' };
    var l = R.learn(rows); l.def = saved && saved.def || ''; return { cfg: l, src: 'data' };
  };
  TD.roster = R;
  if (typeof module !== 'undefined' && module.exports) module.exports = TD;
})(typeof window !== 'undefined' ? window : globalThis);
(function (w) {
  var PB_ORDER = ['Hội Sở', 'PGD Hai Bà Trưng', 'PGD Số 2'];
  /* P10 (T6): KHÔNG còn danh sách tên cán bộ nhúng cứng. Phòng ban của cán bộ = cấu hình người dùng (Tiện ích → 👥 Danh sách cán bộ, lưu ở
     trình duyệt) hoặc, khi chưa cấu hình, tự học từ dữ liệu dư nợ (cột CBTD r[12] + phòng ban r[17]; dữ liệu hiện hành trước, mốc lưu trữ bổ sung). */
  var RS = { q: null, cfg: null, src: '', match: null }, RAW = null; // RAW: văn bản cấu hình (đọc localStorage MỘT lần; setConfig cập nhật)
  function curRoster() {
    var R = w.TD && w.TD.roster; if (!R) return RS;
    var D = null; try { D = typeof DATA !== 'undefined' ? DATA : w.DATA; } catch (e) {}
    var q = D && D.qltd || [], al = w._archiveReportList || [];
    if (RAW === null) { try { RAW = w.localStorage.getItem(R.KEY) || ''; } catch (e) { RAW = ''; } }
    if (RS.q === q && RS.ql === q.length && RS.al === al.length && RS.raw === RAW) return RS; // đường nóng (sắp xếp): chỉ so sánh
    var raw = RAW;
    var saved = raw ? R.parse(raw).cfg : R.empty(), ef = R.effective(saved, q);
    if (ef.src === 'data') { // bổ sung cán bộ chỉ còn trong mốc lưu trữ (đã chuyển đi/nghỉ) — không đè phòng ban theo dữ liệu hiện hành
      var arch = []; al.forEach(function (x) { if (x && Array.isArray(x.reportData)) arch = arch.concat(x.reportData); });
      var have = {}; ef.cfg.pbs.forEach(function (p) { p.members.forEach(function (m) { have[R.norm(m.name)] = 1; }); });
      R.learn(arch).pbs.forEach(function (p) { p.members.forEach(function (m) { if (have[R.norm(m.name)]) return; var t = ef.cfg.pbs.filter(function (x) { return R.norm(x.pb) === R.norm(p.pb); })[0]; if (!t) { t = { pb: p.pb, members: [] }; ef.cfg.pbs.push(t); } t.members.push(m); }); });
    }
    RS = { q: q, ql: q.length, al: al.length, raw: raw, cfg: ef.cfg, src: ef.src, match: R.matcher(ef.cfg) };
    CACHE = {};
    return RS;
  }
  /* P09: bộ nhớ đệm cho norm/rank — sắp xếp ~20.000 dòng (TSBĐ, Dư nợ) gọi cmp hàng trăm nghìn lần, mỗi lần chuẩn hoá chuỗi NFD nhiều lần (đo: 1.000 ms) */
  var NORM_C = Object.create(null), NORM_N = 0;
  function norm(s) {
    var raw = String(s == null ? '' : s), c = NORM_C[raw];
    if (c !== undefined) return c;
    c = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    if (++NORM_N > 20000) { NORM_C = Object.create(null); NORM_N = 0; }
    NORM_C[raw] = c;
    return c;
  }
  var CACHE = {};
  function pbOf(name) {
    var rs = curRoster(), k = norm(name);
    if (!k) return '';
    if (CACHE.hasOwnProperty(k)) return CACHE[k];
    var m = rs.match ? rs.match(name) : null, res = m ? m.pb : '';
    CACHE[k] = res;
    return res;
  }
  var RANK_C = Object.create(null), RANK_N = 0;
  function rank(pb) {
    var key = String(pb == null ? '' : pb), c = RANK_C[key];
    if (c !== undefined) return c;
    var i = PB_ORDER.indexOf(key.trim()), n;
    if (i < 0) {
      n = norm(pb); i = PB_ORDER.length; // phòng ban lạ / trống → cuối
      for (var j = 0; j < PB_ORDER.length; j++) if (norm(PB_ORDER[j]) === n) { i = j; break; }
    }
    if (++RANK_N > 5000) { RANK_C = Object.create(null); RANK_N = 0; }
    RANK_C[key] = i;
    return i;
  }
  function rankOf(pb, cbtd) {
    var r = rank(pb);
    if (r < PB_ORDER.length) return r;
    var p = pbOf(cbtd);
    return p ? rank(p) : PB_ORDER.length;
  }
  var _viColl = new Intl.Collator('vi', { sensitivity: 'base', numeric: true }); // HM-18: tạo một lần
  function viCmp(a, b) {
    return _viColl.compare(String(a == null ? '' : a), String(b == null ? '' : b));
  }
  function cmp(pbA, cbA, pbB, cbB) {
    var ra = rankOf(pbA, cbA), rb = rankOf(pbB, cbB);
    if (ra !== rb) return ra - rb;
    return viCmp(cbA, cbB);
  }
  function cmpName(a, b) { return cmp('', a, '', b); }
  w.TD_SXCB = {
    PB_ORDER: PB_ORDER.slice(),
    get ROSTER() { var o = {}; (curRoster().cfg || { pbs: [] }).pbs.forEach(function (p) { o[p.pb] = p.members.map(function (m) { return m.name; }); }); return o; }, // tương thích: { phòng: [tên] }
    /* P10 (T6) */
    roster: function () { var rs = curRoster(); return { cfg: rs.cfg, src: rs.src }; },
    match: function (name) { var rs = curRoster(); return rs.match ? rs.match(name) : null; },
    members: function (pb) { var k = norm(pb), p = ((curRoster().cfg || { pbs: [] }).pbs.filter(function (x) { return norm(x.pb) === k; })[0]); return p ? p.members.map(function (m) { return { name: m.name, role: m.role }; }) : []; },
    defaultCbtd: function () { var c = curRoster().cfg; return c && c.def || ''; },
    /* setConfig(text): lưu cấu hình (lỗi cú pháp ⇒ không lưu, trả lỗi); text rỗng ⇒ xoá, quay về tự học */
    setConfig: function (text) { var R = w.TD.roster, r = R.save(w.localStorage, text); if (!r.errors.length) { RAW = null; RS = { q: null }; CACHE = {}; } return r; },
    configText: function () { var rs = curRoster(); return w.TD.roster.format(rs.cfg || w.TD.roster.empty()); },
    pbOf: pbOf,
    rank: rank,
    rankOf: rankOf,
    viCmp: viCmp,
    cmp: cmp,
    cmpName: cmpName,
    sortNames: function (arr) { return (arr || []).slice().sort(cmpName); },
    sortPBs: function (arr) { return (arr || []).slice().sort(function (a, b) { return rank(a) - rank(b) || viCmp(a, b); }); },
    cmpRow: function (a, b, iPb, iCb) {
      iPb = (iPb == null ? 17 : iPb); iCb = (iCb == null ? 12 : iCb);
      return cmp(a && a[iPb], a && a[iCb], b && b[iPb], b && b[iCb]);
    }
  };
})(window);
