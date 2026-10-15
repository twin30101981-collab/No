// HM-20 — phiên bản thửa (lưu mỗi lần sửa, khôi phục được), sao lưu tự động, đồng bộ CSDL giả lập: tạo mới/cập nhật/ngoại tuyến→online/xung đột (giữ máy / lấy máy chủ).
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path'); const { report } = require('../lib');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
  const exp = Math.floor(Date.now() / 1000) + 3600; let rows = []; let offline = false; const log = [];
  await p.route(/^https?:/, async r => {
    const q = r.request(), u = q.url(); if (!/supabase\.co/.test(u)) return r.abort();
    const hdr = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'content-type': 'application/json' };
    if (q.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: hdr });
    if (offline) return r.abort();
    if (/rest\/v1\/thua_dat/.test(u)) {
      log.push(q.method() + ' ' + decodeURIComponent(u.split('thua_dat')[1] || ''));
      if (q.method() === 'GET') { const m = /ma_thua=eq\.([^&]+)/.exec(decodeURIComponent(u)); return r.fulfill({ status: 200, headers: hdr, body: JSON.stringify(rows.filter(x => !x.deleted_at && (!m || x.ma_thua === m[1]))) }); }
      if (q.method() === 'POST') { const j = JSON.parse(q.postData()); const row = Object.assign({ id: 'id' + (rows.length + 1) }, j); rows.push(row); return r.fulfill({ status: 201, headers: hdr, body: JSON.stringify([row]) }); }
      if (q.method() === 'PATCH') { const j = JSON.parse(q.postData()), id = /id=eq\.([^&]+)/.exec(u)[1]; rows.forEach(x => { if (x.id === id) Object.assign(x, j); }); return r.fulfill({ status: 200, headers: hdr, body: JSON.stringify(rows) }); }
    }
    return r.abort(); });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(process.argv[2])); await p.waitForTimeout(3500);
  const exp2 = exp;
  const o = await p.evaluate(async (exp) => {
    const P = a => a.map((q, i) => ({ x: q[0], y: q[1], ten: String(i + 1) })), w = ms => new Promise(r => setTimeout(r, ms)), o = {};
    LG172.auth.session = { access_token: 'TOK', refresh_token: 'R', expires_at: exp, email: 'a@b.c' };
    const sq = [[2259300, 568000], [2259300, 568020], [2259350, 568020], [2259350, 568000]];
    drawPlot('V1', P(sq), 105.5, { so_thua: '1' }, true, 3); await LGVersions.scan();
    let vs = await LGVersions.list('V1'); o.v0 = vs.length;
    // sửa mốc → phiên bản mới
    const pl = plots.filter(q => q.id === 'V1')[0]; pl.points[2].x = 2259360; saveToLocalStorage(); await w(4000); vs = await LGVersions.list('V1'); o.v1 = vs.length; o.area1 = vs.map(r => r.snap.points[2].x);
    // sửa lần nữa rồi khôi phục bản đầu
    pl.points[2].x = 2259370; saveToLocalStorage(); await w(4000); vs = await LGVersions.list('V1'); o.v2 = vs.length;
    const first = vs[vs.length - 1]; await LGVersions.restoreVersion(first.k); const pl2 = plots.filter(q => q.id === 'V1')[0]; o.restoredX = pl2.points[2].x; await LGVersions.scan(); vs = await LGVersions.list('V1'); o.v3 = vs.length; o.why = vs.map(r => r.why);
    // không đổi nội dung → không thêm
    await LGVersions.scan(); o.v3b = (await LGVersions.list('V1')).length;
    // nhiều phiên bản bị cắt tối đa 20
    for (let i = 0; i < 25; i++) { const q = plots.filter(z => z.id === 'V1')[0]; q.points[2].x = 2259400 + i; saveToLocalStorage(); await LGVersions.scan(); } o.vmax = (await LGVersions.list('V1')).length;
    // sao lưu tự động
    o.baks = (await LGVersions.backups()).length; await LGVersions.backupNow(); const bs = await LGVersions.backups(); o.baks2 = bs.length;
    // đồng bộ
    localStorage.removeItem('landgis_sync_dirty'); LGVersions.setAuto(true);
    const q1 = plots.filter(z => z.id === 'V1')[0]; q1.points[2].x = 2259601; saveToLocalStorage(); await w(3300); await w(800);
    o.status1 = LGVersions.status();
    return o; }, exp2);
  const rows1 = JSON.parse(JSON.stringify(rows)), log1 = log.slice();
  // sau khi tự đồng bộ: tạo mới 1 dòng
  const st2 = await p.evaluate(async () => { await new Promise(r => setTimeout(r, 1200)); return LGVersions.status(); });
  // cập nhật (máy chủ chưa đổi): sửa tiếp
  await p.evaluate(async () => { plots.filter(z => z.id === 'V1')[0].points[2].x = 2259602; saveToLocalStorage(); await new Promise(r => setTimeout(r, 4500)); });
  const rowsUpd = JSON.parse(JSON.stringify(rows));
  // ngoại tuyến: sửa → chờ; có mạng → tự đồng bộ
  offline = true; await p.evaluate(async () => { plots.filter(z => z.id === 'V1')[0].points[2].x = 2259603; saveToLocalStorage(); await new Promise(r => setTimeout(r, 4500)); });
  const offStatus = await p.evaluate(() => LGVersions.status()); const rowsOff = JSON.parse(JSON.stringify(rows));
  offline = false; await p.evaluate(() => LGVersions.syncNow().then(r => { window.__r = r; })); const rowsOn = JSON.parse(JSON.stringify(rows)); const stOn = await p.evaluate(() => LGVersions.status());
  // xung đột: máy chủ bị sửa nơi khác, máy cũng sửa
  rows.forEach(x => { x.diem[2].x = 2259330; }); await p.evaluate(async () => { plots.filter(z => z.id === 'V1')[0].points[2].x = 2259604; saveToLocalStorage(); await new Promise(r => setTimeout(r, 4500)); });
  const conf = await p.evaluate(() => ({ c: LGVersions.conflicts().map(x => x.id), st: LGVersions.status() })); const rowsC = JSON.parse(JSON.stringify(rows));
  // giữ bản máy
  const keepLocal = await p.evaluate(async () => { const r = await LGVersions.resolve('V1', 'local'); return { r, left: LGVersions.conflicts().length }; }); const rowsKL = JSON.parse(JSON.stringify(rows));
  // xung đột lần hai → lấy máy chủ
  rows.forEach(x => { x.diem[2].x = 2259340; }); await p.evaluate(async () => { plots.filter(z => z.id === 'V1')[0].points[2].x = 2259605; saveToLocalStorage(); await new Promise(r => setTimeout(r, 4500)); });
  const takeSrv = await p.evaluate(async () => { const c0 = LGVersions.conflicts().length; const r = await LGVersions.resolve('V1', 'server'); await new Promise(r => setTimeout(r, 300)); return { c0, r, x: plots.filter(z => z.id === 'V1')[0].points[2].x, left: LGVersions.conflicts().length }; });
  // giao diện
  const ui = await p.evaluate(async () => { const w = ms => new Promise(r => setTimeout(r, ms)); Array.from(document.querySelectorAll('.lg103-dbtn')).filter(x => /Thêm/.test(x.innerText))[0].click(); await w(600);
    const row = document.querySelector('[data-lg103-act="ver-open"]'); if (!row) return { row: false }; row.click(); await w(900); return { row: true, vers: document.querySelectorAll('.lg20-ver').length, baks: document.querySelectorAll('.lg20-bak').length, sw: !!document.querySelector('[data-lg103-act="ver-auto"]'), txt: document.querySelector('.lg103-sheet, #lg103-sheet') ? 1 : 0 }; });
  const x = (arr) => arr.map(r => r.diem[2].x);
  const ok = report('hm20_versions', {
    luu_ban_dau: o.v0 === 1, moi_lan_sua_mot_ban: o.v1 === 2 && o.v2 === 3, khoi_phuc_ban_dau: o.restoredX === 2259350, khoi_phuc_giu_ban_truoc_va_hoan_tac_duoc: o.v3 === 4 && o.why.includes('trước khi khôi phục'), khong_doi_khong_them: o.v3b === o.v3, toi_da_20: o.vmax === 20,
    sao_luu_tu_dong_va_thu_cong: o.baks >= 1 && o.baks2 === o.baks + 1,
    tu_dong_bo_tao_moi: rows1.length === 1 && rows1[0].ma_thua === 'V1' && rows1[0].diem[2].x === 2259601 && st2.cho === 0, cap_nhat_khi_may_chu_khong_doi: rowsUpd.length === 1 && rowsUpd[0].diem[2].x === 2259602,
    ngoai_tuyen_giu_hang_cho: offStatus.cho === 1 && rowsOff[0].diem[2].x === 2259602, co_mang_tu_dong_bo: rowsOn[0].diem[2].x === 2259603 && stOn.cho === 0,
    xung_dot_khong_ghi_de: conf.c.join() === 'V1' && conf.st.xung_dot === 1 && rowsC[0].diem[2].x === 2259330, giu_ban_may_ghi_de: keepLocal.r.ok && keepLocal.left === 0 && rowsKL[0].diem[2].x === 2259604,
    lay_ban_may_chu: takeSrv.c0 === 1 && takeSrv.r.ok && takeSrv.x === 2259340 && takeSrv.left === 0, giao_dien: ui.row && ui.vers >= 1 && ui.baks >= 1 && ui.sw, khong_loi_trang: errs.length === 0 }, { o, st2, offStatus, stOn, conf, keepLocal, takeSrv, ui, errs, log: log.slice(0, 12) });
  await b.close(); process.exit(ok ? 0 : 1);
})();
