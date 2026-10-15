// HM-23 — hàng đợi nhập sổ ngoại tuyến: chụp khi mất mạng → ảnh lưu IndexedDB (còn sau khi tải lại trang) → có mạng tự đọc lần lượt → báo từng sổ → Dựng thửa mở luồng 3 bước điền sẵn; lỗi → thử lại; tuỳ chọn xoá ảnh.
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path'), zlib = require('zlib'); const { report, fx } = require('../lib');
function png(seed) { const w = 64, h = 64, raw = Buffer.alloc((w * 3 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3, v = ((x * 73856093) ^ (y * 19349663) ^ seed) >>> 0; raw[o] = v & 255; raw[o + 1] = (v >> 8) & 255; raw[o + 2] = (v >> 16) & 255; } }
  const crc = (b) => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let r = 0xffffffff; for (const x of b) r = t[(r ^ x) & 255] ^ (r >>> 8); return (r ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); }; const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]); }
(async () => {
  const B = fx('so-mau-B.json'); const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.route(/^https?:/, r => r.abort());
  await p.goto('file://' + path.resolve(process.argv[2])); await p.waitForTimeout(3500);
  const stub = B2 => p.evaluate(B => { window.__calls = []; window.lgAiExtractRaw = async (b64) => { window.__calls.push(b64.length); if (window.__failNext) { window.__failNext = false; throw new Error('Claude trả lỗi thử nghiệm'); }
    return { so_thua: '131', to_ban_do: '10.1', dien_tich_tong_m2: B.dien_tich_gcn, dien_tich_khong_cap_gcn: B.khong_cap_gcn, diem_moc: B.khoi_chinh.map((q, i) => ({ ten: String(i + 1), x: q[0], y: q[1], s: q[2] })) }; }; }, B2);
  await stub(B); const r = {};
  await ctx.setOffline(true); await p.evaluate(() => window.dispatchEvent(new Event('offline')));
  await p.evaluate(async () => { Array.from(document.querySelectorAll('.lg103-dbtn')).filter(x => /Nhập sổ/.test(x.innerText))[0].click(); await new Promise(r => setTimeout(r, 700)); document.querySelector('[data-lg103-act="queue"]').click(); await new Promise(r => setTimeout(r, 600)); });
  await p.setInputFiles('#lg23-file', [{ name: 'so1.png', mimeType: 'image/png', buffer: png(1) }, { name: 'so2.png', mimeType: 'image/png', buffer: png(2) }]); await p.waitForTimeout(1200);
  r.offlineRows = await p.evaluate(() => Array.from(document.querySelectorAll('.lg23-row')).map(e => e.querySelector('.lg23-st').innerText)); r.calls0 = await p.evaluate(() => window.__calls.length); r.warn = await p.evaluate(() => /ngoại tuyến/.test(document.getElementById('lg103-body').innerText));
  // tải lại trang khi vẫn ngoại tuyến: ảnh còn trong IndexedDB
  await p.reload(); await p.waitForTimeout(3500); r.persist = await p.evaluate(async () => (await LGQueue.list()).map(j => [j.name, j.status, !!j.blob && j.blob.size > 50]));
  await stub(B); await p.evaluate(() => { window.__failNext = true; });   // việc đầu tiên sẽ lỗi (không phải lỗi mạng)
  await ctx.setOffline(false); await p.evaluate(() => window.dispatchEvent(new Event('online'))); await p.waitForTimeout(3500);
  r.after = await p.evaluate(async () => (await LGQueue.list()).map(j => [j.name, j.status, j.error.slice(0, 20), j.tries])); r.calls1 = await p.evaluate(() => window.__calls.length);
  // thử lại việc lỗi (bật xoá ảnh sau khi đọc)
  await p.evaluate(async () => { localStorage.setItem('landgis_queue_autodel', '1'); Array.from(document.querySelectorAll('.lg103-dbtn')).filter(x => /Nhập sổ/.test(x.innerText))[0].click(); await new Promise(r => setTimeout(r, 700)); document.querySelector('[data-lg103-act="queue"]').click(); await new Promise(r => setTimeout(r, 700)); document.querySelector('[data-lg103-act="queue-retry"]').click(); await new Promise(r => setTimeout(r, 2500)); });
  r.final = await p.evaluate(async () => (await LGQueue.list()).map(j => [j.name, j.status, j.blob === null])); r.rows = await p.evaluate(() => document.querySelectorAll('.lg23-row').length);
  r.build = await p.evaluate(async () => { document.querySelector('[data-lg103-act="queue-build"]').click(); await new Promise(r => setTimeout(r, 900)); return { open: !!document.getElementById('lg8d'), text: (document.getElementById('lg8d-text') || {}).value, gcn: (document.getElementById('lg8d-gcn') || {}).value, so: (document.getElementById('lg8d-so') || {}).value, to: (document.getElementById('lg8d-to') || {}).value }; });
  const ok = report('hm23_queue', { chup_ngoai_tuyen_luu_cho: r.offlineRows.length === 2 && r.offlineRows.every(x => x === 'Chờ có mạng') && r.calls0 === 0 && r.warn, con_sau_khi_tai_lai: r.persist.length === 2 && r.persist.every(x => x[1] === 'cho' && x[2]),
    co_mang_doc_lan_luot_loi_khong_chan_viec_sau: r.after.length === 2 && r.after[0][1] === 'loi' && /lỗi thử/.test(r.after[0][2]) && r.after[1][1] === 'xong' && r.calls1 === 2, thu_lai_viec_loi: r.final.every(x => x[1] === 'xong'), xoa_anh_sau_khi_doc_theo_tuy_chon_chi_ap_dung_tu_luc_bat: r.final[0][2] === true && r.final[1][2] === false && r.rows === 2,
    dung_thua_mo_luong_3_buoc_dien_san: r.build.open && /^1 2259336\.23 568027\.14 2\.06/.test(r.build.text) && r.build.text.split('\n').length === 9 && r.build.gcn === '89.9' && r.build.so === '131' && r.build.to === '10.1', khong_loi_trang: errs.length === 0 }, { r, errs });
  await b.close(); process.exit(ok ? 0 : 1);
})();
