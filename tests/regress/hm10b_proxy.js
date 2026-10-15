// HM-10b — AI qua máy chủ trung gian: (1) lõi Edge Function (xác thực, model cho phép, hạn mức/giờ, khoá chỉ ở máy chủ);
// (2) app: bật chế độ máy chủ ⇒ không gửi/không giữ khoá, gọi /functions/v1/ai-proxy bằng JWT; hết lượt báo rõ; chế độ khoá cá nhân như cũ.
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path'), http = require('http'), fs = require('fs'); const { pathToFileURL } = require('url'); const { report } = require('../lib');
(async () => {
  const { handle } = await import(pathToFileURL(path.join(__dirname, '..', '..', 'handover/supabase/functions/ai-proxy/handler.ts')).href);
  // ---- (1) lõi máy chủ ----
  let usage = {}, upstream = []; const deps = (over) => ({ env: { ANTHROPIC_API_KEY: 'sk-server-secret', AI_LIMIT_PER_HOUR: '2' }, fetch: async (u, i) => { upstream.push({ u, i }); return new Response(JSON.stringify({ content: [{ type: 'text', text: '{"ok":1}' }], stop_reason: 'end_turn' }), { status: 200 }); },
    getUser: async (j) => j === 'good' ? { id: 'u1' } : null, countLastHour: async (u) => usage[u] || 0, record: async (u) => { usage[u] = (usage[u] || 0) + 1; }, ...(over || {}) });
  const rq = (tok, body, method) => new Request('http://x/ai', { method: method || 'POST', headers: { authorization: tok ? 'Bearer ' + tok : '', 'content-type': 'application/json' }, body: method === 'GET' ? undefined : JSON.stringify(body) });
  const msg = { model: 'claude-opus-5-5', max_tokens: 99999, messages: [{ role: 'user', content: 'x' }] };
  const s = {}; s.noAuth = (await handle(rq(null, msg), deps())).status; s.badTok = (await handle(rq('bad', msg), deps())).status;
  s.badModel = (await handle(rq('good', { ...msg, model: 'gpt-x' }), deps())).status; s.ok = await handle(rq('good', msg), deps()); s.ok2 = (await handle(rq('good', msg), deps())).status; const lim = await handle(rq('good', msg), deps());
  s.limit = lim.status; s.limitType = (await lim.json()).error.type; s.noKey = (await handle(rq('good', msg), deps({ env: {} }))).status; s.opt = (await handle(new Request('http://x', { method: 'OPTIONS' }), deps())).status; s.get = (await handle(rq('good', null, 'GET'), deps())).status;
  const sent = upstream[0]; s.upKey = sent.i.headers['x-api-key']; s.upMax = JSON.parse(sent.i.body).max_tokens; s.upStatus = s.ok.status; s.browserSecretLeak = JSON.stringify(await s.ok.clone().text()).includes('sk-server-secret');
  // ---- (2) app ----
  const html = fs.readFileSync(path.resolve(process.argv[2])); const srv = http.createServer((q, r) => { r.setHeader('content-type', 'text/html; charset=utf-8'); r.end(html); }).listen(0);   // trang phải ở origin http(s) thì chế độ khoá cá nhân mới gọi được Anthropic
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); const calls = [];
  let limitHit = false;
  await p.route(/^https?:/, async r => { const u = r.request().url(), h = r.request().headers(); if (/^http:\/\/localhost/.test(u)) return r.continue();
    if (/\/functions\/v1\/ai-proxy/.test(u)) { calls.push({ kind: 'proxy', auth: h['authorization'], xkey: h['x-api-key'] || null }); if (limitHit) return r.fulfill({ status: 429, json: { error: { type: 'lg_rate_limit', message: 'Hết 30 lượt AI trong giờ này — thử lại sau' } } }); return r.fulfill({ json: { content: [{ type: 'text', text: '{"so_thua":"7"}' }], stop_reason: 'end_turn' } }); }
    if (/api\.anthropic\.com/.test(u)) { calls.push({ kind: 'direct', xkey: h['x-api-key'] }); return r.fulfill({ json: { content: [{ type: 'text', text: '{"so_thua":"8"}' }], stop_reason: 'end_turn' } }); }
    return r.abort(); });
  await ctx.addInitScript(() => { try { localStorage.setItem('lg172_auth', JSON.stringify({ access_token: 'jwt-user-1', refresh_token: 'r', expires_at: Math.floor(Date.now() / 1000) + 3000, email: 'a@b.c' })); localStorage.setItem('claude_api_key', 'sk-ant-personal-123'); } catch (e) { } });
  p.on('dialog', d => d.accept()); await p.goto('http://localhost:' + srv.address().port + '/'); await p.waitForTimeout(3500);
  const r = {};
  r.direct = await p.evaluate(async () => { const o = await callClaudeVisionJSON('hi', 'AAAA'); return { so: o.so_thua, proxyOn: lgAiProxyOn() }; });          // khoá cá nhân như cũ
  r.keyBefore = await p.evaluate(() => lgKeyGet('claude_api_key'));
  r.turnOn = await p.evaluate(async () => { const btn = Array.from(document.querySelectorAll('.lg103-dbtn')).pop(); btn.click(); await new Promise(r => setTimeout(r, 600)); const row = document.querySelector('[data-lg103-act="ai-proxy"]'); row.click(); await new Promise(r => setTimeout(r, 500)); return { on: lgAiProxyOn(), sw: document.querySelector('[data-lg103-act="ai-proxy"]').getAttribute('aria-checked'), key: lgKeyGet('claude_api_key') }; });
  r.prox = await p.evaluate(async () => { const o = await callClaudeVisionJSON('hi', 'AAAA'); return o.so_thua; });
  limitHit = true; r.limit = await p.evaluate(async () => { try { await callClaudeVisionJSON('hi', 'AAAA'); return 'no-error'; } catch (e) { return e.message; } });
  r.anyKeyInStorage = await p.evaluate(() => Object.keys(localStorage).concat(Object.keys(sessionStorage)).some(k => /claude/i.test(k) && /api_key/.test(k) && (localStorage.getItem(k) || sessionStorage.getItem(k))));
  const px = calls.filter(c => c.kind === 'proxy'), dr = calls.filter(c => c.kind === 'direct');
  const ok = report('hm10b_proxy', {
    may_chu_401_khi_khong_dang_nhap: s.noAuth === 401 && s.badTok === 401, may_chu_chan_model_la: s.badModel === 400, may_chu_gioi_han_luot: s.ok2 === 200 && s.limit === 429 && s.limitType === 'lg_rate_limit',
    khoa_chi_o_may_chu: s.upKey === 'sk-server-secret' && !s.browserSecretLeak && s.upMax === 16000, thieu_cau_hinh_500: s.noKey === 500, cors_va_phuong_thuc: s.opt === 204 && s.get === 405,
    che_do_khoa_ca_nhan_nhu_cu: r.direct.so === '8' && r.direct.proxyOn === false && dr.length === 1 && dr[0].xkey === 'sk-ant-personal-123',
    bat_che_do_may_chu_xoa_khoa_may_nay: r.turnOn.on === true && r.turnOn.sw === 'true' && !r.turnOn.key && r.keyBefore === 'sk-ant-personal-123',
    goi_qua_may_chu_bang_jwt_khong_khoa: r.prox === '7' && px.length >= 1 && px[0].auth === 'Bearer jwt-user-1' && !px[0].xkey && dr.length === 1,
    het_luot_bao_ro: /hạn ngạch|lượt AI/.test(r.limit) && r.anyKeyInStorage === false, khong_loi_trang: errs.length === 0 }, { s: { ...s, ok: undefined }, r, calls, errs });
  await b.close(); srv.close(); process.exit(ok ? 0 : 1);
})();
