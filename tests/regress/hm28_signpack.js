// HM-28 — gói riêng tư: (1) lõi Edge Function sign-pack (JWT, mã gói hợp lệ, quyền, TTL, 404, nhật ký); (2) app: gói rieng_tu xin link ký bằng JWT rồi tải (Range); chưa đăng nhập/không quyền → báo rõ; gói công khai vẫn tải thẳng.
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path'); const crypto = require('crypto'); const { pathToFileURL } = require('url'); const { report } = require('../lib');
(async () => {
  const { handle } = await import(pathToFileURL(path.join(__dirname, '..', '..', 'handover/supabase/functions/sign-pack/handler.ts')).href);
  const logs = [], signed = []; const deps = (o) => Object.assign({ env: {}, getUser: async j => j === 'good' ? { id: 'u1' } : null, hasEntitlement: async (u, p) => u === 'u1' && p === 'xa-thu', sign: async (pth, ttl) => { signed.push([pth, ttl]); return pth.includes('khong-co') ? null : 'https://signed.test/' + pth + '?t=1'; }, log: async (u, p) => { logs.push(u + ':' + p); } }, o || {});
  const rq = (tok, body, m) => new Request('http://x/s', { method: m || 'POST', headers: { authorization: tok ? 'Bearer ' + tok : '', 'content-type': 'application/json' }, body: (m === 'OPTIONS' || m === 'GET') ? undefined : JSON.stringify(body) });
  const s = {}; s.noAuth = (await handle(rq(null, { id: 'xa-thu' }), deps())).status; s.badTok = (await handle(rq('bad', { id: 'xa-thu' }), deps())).status;
  s.badId = [(await handle(rq('good', { id: '../etc' }), deps())).status, (await handle(rq('good', { id: 'A B' }), deps())).status, (await handle(rq('good', {}), deps())).status];
  s.noRight = (await handle(rq('good', { id: 'xa-khac' }), deps())).status; const ok = await handle(rq('good', { id: 'xa-thu' }), deps()); s.ok = ok.status; const okj = await ok.json();
  s.ttlDefault = signed[0][1]; await handle(rq('good', { id: 'xa-thu' }), deps({ env: { PACK_URL_TTL: '999999' } })); s.ttlMax = signed[1][1]; await handle(rq('good', { id: 'xa-thu' }), deps({ env: { PACK_URL_TTL: '5' } })); s.ttlMin = signed[2][1];
  s.open = (await handle(rq('good', { id: 'xa-khac' }), deps({ env: { PACK_OPEN_TO_ALL_USERS: '1' } }))).status; s.notFound = (await handle(rq('good', { id: 'khong-co' }), deps({ env: { PACK_OPEN_TO_ALL_USERS: '1' } }))).status; s.opt = (await handle(rq(null, null, 'OPTIONS'), deps())).status; s.get = (await handle(rq('good', null, 'GET'), deps())).status;
  // ---- app ----
  const data = crypto.randomBytes(200000), sha = crypto.createHash('sha256').update(data).digest('hex');
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); const calls = []; let allow = true;
  await p.route(/^https?:/, async r => {
    const q = r.request(), u = q.url(), h = q.headers(); const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
    if (q.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: cors });
    if (/functions\/v1\/sign-pack/.test(u)) { calls.push({ k: 'sign', auth: h['authorization'], body: q.postData() }); if (!allow) return r.fulfill({ status: 403, headers: cors, json: { error: { type: 'lg_forbidden', message: 'Tài khoản chưa được cấp quyền tải gói này' } } }); return r.fulfill({ status: 200, headers: cors, json: { url: 'https://signed.test/goi/xa-thu/pack.lgpk.gz?token=abc', expires_in: 3600 } }); }
    if (u.startsWith('https://signed.test/')) { calls.push({ k: 'file', auth: h['authorization'] || null }); return r.fulfill({ status: 200, headers: cors, body: data }); }
    if (u === 'http://pub.test/open.bin') { calls.push({ k: 'public' }); return r.fulfill({ status: 200, headers: cors, body: data }); }
    return r.abort(); });
  await p.goto('file://' + path.resolve(process.argv[2])); await p.waitForTimeout(3500);
  const priv = { id: 'xa-thu', ten: 'Xã thử', ver: '1', bytes: data.length, sha256: sha, url: '', rieng_tu: true }, pub = { id: 'xa-cong', ten: 'Xã công khai', ver: '1', bytes: data.length, sha256: sha, url: 'http://pub.test/open.bin' };
  const a = {};
  a.noLogin = await p.evaluate(async (it) => { try { await LGPackSign.resolve(it); return 'resolved'; } catch (e) { return e.message; } }, priv);
  await p.evaluate(() => { LG172.auth.session = { access_token: 'JWT-1', refresh_token: 'r', expires_at: Math.floor(Date.now() / 1000) + 3000, email: 'a@b.c' }; });
  a.priv = await p.evaluate((it) => LGPacks.install(it), priv); a.privInst = await p.evaluate(() => LGPacks.installed().then(x => x.map(y => y.id)));
  const n1 = calls.filter(c => c.k === 'sign').length; a.pub = await p.evaluate((it) => LGPacks.install(it), pub); const n2 = calls.filter(c => c.k === 'sign').length;
  allow = false; a.denied = await p.evaluate(async (it) => { try { await LGPackSign.resolve(it); return 'resolved'; } catch (e) { return e.message; } }, priv);
  a.deniedInstall = await p.evaluate((it) => LGPacks.install(Object.assign({}, it, { id: 'xa-thu2' })), priv);
  const sc = calls.filter(c => c.k === 'sign'), fc = calls.filter(c => c.k === 'file');
  const okAll = report('hm28_signpack', {
    may_chu_can_dang_nhap: s.noAuth === 401 && s.badTok === 401, ma_goi_hop_le: s.badId.every(x => x === 400), kiem_quyen: s.noRight === 403 && s.ok === 200 && okj.url.includes('goi/xa-thu/pack.lgpk.gz') && okj.expires_in === 3600, ttl_gioi_han: s.ttlDefault === 3600 && s.ttlMax === 86400 && s.ttlMin === 60,
    mo_cho_moi_nguoi_dung_khi_bat: s.open === 200, khong_co_goi_404: s.notFound === 404, nhat_ky_tai: logs.length >= 4 && logs[0] === 'u1:xa-thu', cors_va_phuong_thuc: s.opt === 204 && s.get === 405,
    app_chua_dang_nhap_bao_ro: /cần đăng nhập/.test(a.noLogin), app_xin_link_bang_JWT: sc.length >= 1 && sc[0].auth === 'Bearer JWT-1' && JSON.parse(sc[0].body).id === 'xa-thu', app_tai_bang_link_ky_khong_gui_JWT_cho_kho: fc.length === 1 && fc[0].auth === null && a.priv.ok === true && a.privInst.includes('xa-thu'),
    goi_cong_khai_tai_thang_khong_xin_link: a.pub.ok === true && calls.some(c => c.k === 'public') && n1 === n2, bi_tu_choi_bao_ro: /chưa được cấp quyền/.test(a.denied) && a.deniedInstall.ok === false, khong_loi_trang: errs.length === 0 }, { s, a, calls: calls.length, errs });
  await b.close(); process.exit(okAll ? 0 : 1);
})();
