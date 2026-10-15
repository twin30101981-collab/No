// HM-06c — CSDL cần đăng nhập OTP: chưa đăng nhập thì KHÔNG gọi /rest; có token thì dùng token (không dùng khoá công khai); xoá = xoá mềm; khôi phục được.
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path'); const { report } = require('../lib');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext(); const p = await ctx.newPage(); const reqs = [];
  const exp = Math.floor(Date.now() / 1000) + 3600; let db = [{ id: 'r1', ma_thua: 'T1', owner_id: 'u1', deleted_at: null, diem: [], lon0: 105.5, zone: 3 }];
  await p.route(/^https?:/, async r => {
    const q = r.request(), u = q.url(); if (!/supabase\.co/.test(u)) return r.abort();
    reqs.push({ m: q.method(), u, auth: q.headers()['authorization'] || '', body: q.postData() || '' });
    const hdr = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'content-type': 'application/json' };
    if (q.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: hdr });
    if (/auth\/v1\/otp/.test(u)) return r.fulfill({ status: 200, headers: hdr, body: '{}' });
    if (/auth\/v1\/verify/.test(u)) return r.fulfill({ status: 200, headers: hdr, body: JSON.stringify({ access_token: 'TOKEN-USER', refresh_token: 'RT', expires_at: exp, user: { email: 'a@b.c' } }) });
    if (/rest\/v1\/thua_dat/.test(u)) {
      if (q.headers()['authorization'] === 'Bearer TOKEN-USER') {
        if (q.method() === 'GET') return r.fulfill({ status: 200, headers: hdr, body: JSON.stringify(db.filter(x => /deleted_at=is\.null/.test(u) ? !x.deleted_at : !!x.deleted_at)) });
        if (q.method() === 'PATCH') { const j = JSON.parse(q.postData()); db.forEach(x => Object.assign(x, j)); return r.fulfill({ status: 200, headers: hdr, body: JSON.stringify(db) }); }
      }
      return r.fulfill({ status: 401, headers: hdr, body: '{"message":"permission denied"}' });
    }
    return r.abort(); });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(process.argv[2])); await p.waitForTimeout(3500);
  const restBefore = reqs.filter(x => /rest\/v1/.test(x.u)).length;
  const r0 = await p.evaluate(async () => { try { await LG172.db.list(); return 'ok'; } catch (e) { return String(e.message); } });
  const restAfterAnon = reqs.filter(x => /rest\/v1/.test(x.u)).length;
  const r1 = await p.evaluate(async () => { await LG172.auth.sendOtp('a@b.c'); const s = await LG172.auth.verifyOtp('a@b.c', '123456'); const rows = await LG172.db.list(); await LG172.db.remove('r1'); const gone = await LG172.db.list(); const trash = await LG172.db.listDeleted(); await LG172.db.restore('r1'); const back = await LG172.db.list();
    return { tok: s.access_token, n: rows.length, gone: gone.length, trash: trash.length, back: back.length, stored: !!localStorage.getItem('lg172_auth') }; });
  const rest = reqs.filter(x => /rest\/v1/.test(x.u));
  const ok = report('hm06c_auth', {
    chua_dang_nhap_khong_goi_CSDL: restBefore === 0 && restAfterAnon === 0 && /Cần đăng nhập/.test(r0),
    dang_nhap_OTP_gui_ma_va_xac_nhan: reqs.some(x => /auth\/v1\/otp/.test(x.u)) && reqs.some(x => /auth\/v1\/verify/.test(x.u)) && r1.tok === 'TOKEN-USER' && r1.stored,
    dung_token_nguoi_dung_khong_dung_khoa_cong_khai: rest.length > 0 && rest.every(x => x.auth === 'Bearer TOKEN-USER'),
    xoa_mem_khong_DELETE: !rest.some(x => x.m === 'DELETE') && rest.some(x => x.m === 'PATCH' && /deleted_at/.test(x.body)) && r1.n === 1 && r1.gone === 0 && r1.trash === 1,
    khoi_phuc_duoc: r1.back === 1 }, { r0, r1, restBefore });
  await b.close(); process.exit(ok && !errs.length ? 0 : 1);
})();
