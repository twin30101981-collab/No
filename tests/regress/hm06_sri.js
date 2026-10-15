// HM-06 — thư viện ghim phiên bản + SRI: bản đúng nạp được; bản bị sửa bị trình duyệt từ chối; không dùng nguồn không có SRI.
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const fs = require('fs'); const path = require('path'); const { report } = require('../lib');
(async () => {
  const NM = path.join(__dirname, '..', 'node_modules'); const b = await chromium.launch(); const ctx = await b.newContext(); const p = await ctx.newPage();
  const asked = []; let tamper = false;
  await p.route(/^https?:/, r => {
    const u = r.request().url(); asked.push(u);
    const m = /jsdelivr\.net\/npm\/xlsx@0\.18\.5\/dist\/xlsx\.full\.min\.js$/.exec(u);
    if (m) { let body = fs.readFileSync(path.join(NM, 'xlsx/dist/xlsx.full.min.js'), 'utf8'); if (tamper) body += '\n;window.__PWNED=1;';
      return r.fulfill({ status: 200, contentType: 'application/javascript', headers: { 'access-control-allow-origin': '*' }, body }); }
    return r.abort(); });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(process.argv[2])); await p.waitForTimeout(3000);
  const good = await p.evaluate(async () => { try { await ensureXLSX(); return { ok: !!window.XLSX }; } catch (e) { return { err: String(e.message).slice(0, 80) }; } });
  tamper = true; await p.reload(); await p.waitForTimeout(3000);
  const bad = await p.evaluate(async () => { try { await ensureXLSX(); return { ok: !!window.XLSX, pwned: !!window.__PWNED }; } catch (e) { return { err: String(e.message).slice(0, 80), pwned: !!window.__PWNED }; } });
  const src = fs.readFileSync(path.resolve(process.argv[2]), 'utf8');
  const ok = report('hm06_sri', {
    ban_dung_nap_duoc: good.ok === true,
    ban_bi_sua_bi_tu_choi: !bad.ok && !bad.pwned,
    khong_goi_cdnjs_khong_SRI_cho_xlsx: !asked.some(u => /cdnjs\.cloudflare\.com\/ajax\/libs\/xlsx/.test(u)),
    tesseract_ghim_phien_ban_chinh_xac: !/tesseract\.js@5\//.test(src) && /tesseract\.js@5\.1\.1/.test(src) }, { good, bad });
  await b.close(); process.exit(ok ? 0 : 1);
})();
