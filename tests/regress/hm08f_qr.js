// HM-08f — màn "Quét QR sổ đỏ" dựng lại trong sheet (thay tab-qr): quét từ ảnh (jsQR), lịch sử, chép mã + mở cổng tra cứu, quét bằng camera (luồng giả lập), đèn, dừng, đóng sheet tự tắt camera.
const { open, report } = require('../lib'); const path = require('path'), fs = require('fs');
(async () => {
  const { b, p, errs } = await open(process.argv[2]);
  await p.addScriptTag({ path: path.join(__dirname, '..', '..', 'app', 'vendor', 'jSQR.js').replace('jSQR', 'jsQR') }).catch(async () => { await p.addScriptTag({ path: path.join(__dirname, '..', '..', 'vendor', 'jsQR.js') }); });
  const code = 'https://tracuuqr.vbdlis.vn/?q=13-69907570';
  const png = await p.evaluate(async (code) => {
    const r = lgMakeQRMatrix(code), sc = 6, q = 4, N = (r.n + 2 * q) * sc, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, N, N); x.fillStyle = '#000';
    for (let y = 0; y < r.n; y++) for (let i = 0; i < r.n; i++) if (r.m[y][i]) x.fillRect((i + q) * sc, (y + q) * sc, sc, sc);
    return c.toDataURL('image/png'); }, code);
  fs.mkdirSync('/tmp/hm08f_qr', { recursive: true }); fs.writeFileSync('/tmp/hm08f_qr/qr.png', Buffer.from(png.split(',')[1], 'base64'));
  const blankUrl = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = c.height = 500; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 500, 500); x.fillStyle = '#ccc'; x.fillRect(100, 100, 300, 40); return c.toDataURL('image/png'); }); fs.writeFileSync('/tmp/hm08f_qr/blank.png', Buffer.from(blankUrl.split(',')[1], 'base64'));
  const c = {};
  await p.evaluate(() => { Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true }); Array.from(document.querySelectorAll('.lg103-dbtn')).filter(x => /Nhập/.test(x.innerText))[0].click(); }); await p.waitForTimeout(500);
  await p.evaluate(() => document.querySelector('[data-lg103-act="import-qr"]').click()); await p.waitForTimeout(500);
  c.panel_cu_da_go = await p.evaluate(() => !document.getElementById('tab-qr') && !document.querySelector('#sidebar #btn-qr-camera'));
  c.sheet = await p.evaluate(() => !!document.getElementById('btn-qr-camera') && !!document.getElementById('btn-qr-file') && !!document.getElementById('qr-file-input') && !!document.getElementById('qr-video'));
  c.co_jsqr = await p.evaluate(() => typeof window.jsQR === 'function' || (window.ensureJsQR && true));
  await p.setInputFiles('#qr-file-input', '/tmp/hm08f_qr/qr.png'); await p.waitForTimeout(4000);
  const res = await p.evaluate(() => (document.getElementById('qr-result') || {}).innerText || '');
  c.quet_anh = /Đã đọc được mã QR/.test(res) && /13-69907570/.test(res); c._res = res.slice(0, 160);
  c.lich_su = await p.evaluate(() => /Lịch sử quét \(\d+\)/.test(document.getElementById('qr-history').innerText));
  await p.evaluate(() => { window.__opened = []; window.open = (u) => { window.__opened.push(u); return null; }; navigator.clipboard && (navigator.clipboard.writeText = () => Promise.resolve()); document.getElementById('qr-open-vbdlis').click(); }); await p.waitForTimeout(400);
  c.mo_cong_tra_cuu = await p.evaluate(() => (window.__opened || []).some(u => /vbdlis/.test(u)));
  await p.setInputFiles('#qr-file-input', '/tmp/hm08f_qr/blank.png'); await p.waitForFunction(() => /Không đọc được mã QR|Chưa có bộ giải mã/.test(document.getElementById('qr-result').innerText), null, { timeout: 120000 });
  c._blank = await p.evaluate(() => document.getElementById('qr-result').innerText.slice(0, 80)); c.anh_khong_co_qr_bao_loi = /Không đọc được mã QR|Chưa có bộ giải mã/.test(c._blank);
  fs.writeFileSync('/tmp/hm08f_qr/tiny.png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));
  await p.setInputFiles('#qr-file-input', '/tmp/hm08f_qr/tiny.png'); await p.waitForTimeout(800); c.anh_qua_nho_khong_treo = await p.evaluate(() => /Ảnh quá nhỏ/.test(document.getElementById('qr-result').innerText));
  // camera giả lập: canvas.captureStream vẽ mã QR
  await p.evaluate(async (dataUrl) => {
    const img = new Image(); img.src = dataUrl; await img.decode(); const cv = document.createElement('canvas'); cv.width = cv.height = img.width; const cx = cv.getContext('2d'); window.__camDraw = setInterval(() => cx.drawImage(img, 0, 0), 50);
    window.__tracks = []; navigator.mediaDevices.getUserMedia = async () => { const st = cv.captureStream(15); st.getTracks().forEach(t => window.__tracks.push(t)); return st; };
    document.getElementById('qr-result').innerHTML = ''; document.getElementById('btn-qr-camera').click(); }, png);
  await p.waitForTimeout(3500);
  c.camera_doc_duoc = await p.evaluate(() => /Đã đọc được mã QR/.test(document.getElementById('qr-result').innerText) && window.__tracks.every(t => t.readyState === 'ended'));
  // mở lại camera rồi đóng sheet → tắt camera
  await p.evaluate(async () => { document.getElementById('qr-result').innerHTML = ''; const blank = document.createElement('canvas'); blank.width = blank.height = 200; clearInterval(window.__camDraw); window.__tracks = []; navigator.mediaDevices.getUserMedia = async () => { const st = blank.captureStream(10); st.getTracks().forEach(t => window.__tracks.push(t)); return st; }; document.getElementById('btn-qr-camera').click(); });
  await p.waitForTimeout(1500); c.camera_dang_chay = await p.evaluate(() => window.__tracks.length > 0 && window.__tracks.every(t => t.readyState === 'live'));
  await p.evaluate(() => LandGIS.ui.closeSheet()); await p.waitForTimeout(300);
  c.dong_sheet_tat_camera = await p.evaluate(() => window.__tracks.every(t => t.readyState === 'ended'));
  c.khong_loi_trang = errs.length === 0;
  const ok = report('hm08f_qr', c, { errs }); await b.close(); process.exit(ok ? 0 : 1);
})();
