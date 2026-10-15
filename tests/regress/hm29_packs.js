// HM-29 — tải gói theo xã: rớt mạng giữa chừng → tiếp tục bằng Range; kiểm sha256; sai sha256 bị loại; báo bản mới; xoá; màn Thêm → Gói dữ liệu; ngoại tuyến vẫn dùng được gói đã tải.
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path'); const crypto = require('crypto'); const { report } = require('../lib');
(async () => {
  const data = crypto.randomBytes(3 * 1024 * 1024 + 123), sha = crypto.createHash('sha256').update(data).digest('hex');
  let cat = { packs: [{ id: 'xa-thu', ten: 'Xã thử', ver: '1', bytes: data.length, sha256: sha, url: 'http://pk.test/xa-thu.bin' }, { id: 'xa-hong', ten: 'Xã hỏng', ver: '1', bytes: 1000, sha256: 'a'.repeat(64), url: 'http://pk.test/hong.bin' }] };
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); const reqs = []; let cut = true, down = false;
  await p.route(/^https?:/, async r => {
    const u = r.request().url(); if (down) return r.abort();
    if (u.startsWith('http://pk.test/catalog.json')) return r.fulfill({ json: cat });
    if (u === 'http://pk.test/hong.bin') return r.fulfill({ body: Buffer.alloc(1000, 1) });
    if (u === 'http://pk.test/xa-thu.bin') {
      const rg = r.request().headers()['range']; reqs.push(rg || '-'); const from = rg ? +/bytes=(\d+)-/.exec(rg)[1] : 0;
      if (cut && from === 0) return r.fulfill({ status: 200, body: data.subarray(0, 1572864) }); // rớt mạng sau 1,5 MB
      return r.fulfill({ status: 206, headers: { 'content-range': `bytes ${from}-${data.length - 1}/${data.length}` }, body: data.subarray(from) });
    } return r.abort();
  });
  await p.goto('file://' + path.resolve(process.argv[2])); await p.waitForTimeout(3500);
  const r = {};
  await p.evaluate(() => LGPacks.config({ catalogUrl: 'http://pk.test/catalog.json' }));
  r.kq1 = await p.evaluate(async () => { const c = await LGPacks.catalog(); return LGPacks.install(c[0]); });
  r.part = await p.evaluate(async () => (await LGPacks.partial('xa-thu')).blob.size);
  cut = false;
  r.kq2 = await p.evaluate(async () => { const c = await LGPacks.catalog(); return LGPacks.install(c[0]); });
  r.inst = await p.evaluate(() => LGPacks.installed());
  r.blobOk = await p.evaluate(async sha => { const bl = await LGPacks.blob('xa-thu'); const d = await crypto.subtle.digest('SHA-256', await bl.arrayBuffer()); return Array.from(new Uint8Array(d)).map(x => x.toString(16).padStart(2, '0')).join('') === sha; }, sha);
  r.hong = await p.evaluate(async () => { const c = await LGPacks.catalog(); return LGPacks.install(c[1]); });
  cat.packs[0].ver = '2'; cat.packs[0].sha256 = 'b'.repeat(64);
  r.st = await p.evaluate(async () => { const c = await LGPacks.catalog(), i = await LGPacks.installed(); return LGPacks.status(c, i).map(s => s.state); });
  r.usage = await p.evaluate(() => LGPacks.usage());
  // giao diện: Thêm → Gói dữ liệu
  await p.evaluate(() => { document.querySelector('[data-lg103-tab="more"],[data-tab="more"]') && document.querySelector('[data-lg103-tab="more"],[data-tab="more"]').click(); });
  await p.waitForTimeout(500);
  r.ui = await p.evaluate(async () => { const btn = Array.from(document.querySelectorAll('.lg103-dbtn')).pop(); btn && btn.click(); await new Promise(r => setTimeout(r, 600)); const row = document.querySelector('[data-lg103-act="packs"]'); if (!row) return { row: false }; row.click(); await new Promise(r => setTimeout(r, 1200)); const q = document.querySelector('.lgpk'); return { row: true, has: !!q, text: q ? q.innerText : '', gauge: !!document.querySelector('.lgpk-gauge') }; });
  await p.evaluate(() => LGPacks.remove('xa-thu')); r.sauXoa = await p.evaluate(() => LGPacks.installed().then(a => a.length));
  down = true; r.offline = await p.evaluate(() => LGPacks.catalog().then(() => 'ok', () => 'fail')); r.offUi = await p.evaluate(() => LGPacksUI.render().then(h => /ngoại tuyến/.test(h)));
  const ok = report('hm29_packs', {
    ngat_giua_chung_con_phan_dang: r.kq1.ok === false && r.kq1.resumable === true && r.part === 1572864,
    tiep_tuc_bang_range: reqs.length === 2 && reqs[0] === '-' && reqs[1] === 'bytes=1572864-',
    xong_va_sha256_khop: r.kq2.ok === true && r.blobOk && r.inst.length === 1 && r.inst[0].bytes === data.length,
    sai_sha256_bi_loai: r.hong.ok === false && r.hong.resumable === false && /sha256/.test(r.hong.error),
    bao_ban_moi: r.st[0] === 'co-ban-moi' && r.st[1] === 'chua',
    dong_ho_dung_luong: r.usage.quota > 0,
    man_goi_du_lieu_hien_trong_them: r.ui.row && r.ui.has && r.ui.gauge && /Xã thử/.test(r.ui.text),
    xoa_goi: r.sauXoa === 0,
    ngoai_tuyen_khong_vo_giao_dien: r.offline === 'fail' && r.offUi === true, khong_loi_trang: errs.length === 0 }, { r, reqs, errs });
  await b.close(); process.exit(ok ? 0 : 1);
})();
