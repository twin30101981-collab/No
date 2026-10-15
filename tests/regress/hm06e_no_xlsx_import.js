// HM-06e — không còn đường nhập/đọc Excel (.xlsx/.xls); vẫn xuất Excel; CSV/DXF không hồi quy.
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path'); const fs = require('fs'); const { report, fx } = require('../lib');
(async () => {
  const src = fs.readFileSync(process.argv[2], 'utf8'); const checks = {};
  checks['khong_con_XLSX_read_nguoi_dung'] = !/XLSX\.readFile|XLSX\.read\(evt/.test(src) && !/ensureXLSX\(\);\s*const wb = XLSX\.read/.test(src);
  checks['o_chon_file_khong_nhan_xlsx'] = !/id="file-upload"[^>]*accept="[^"]*\.xls/.test(src);
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); await p.route(/^https?:/, r => r.abort());
  const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto('file://' + path.resolve(process.argv[2])); await p.waitForTimeout(4500);
  const tmp = '/tmp/hm06e'; fs.mkdirSync(tmp, { recursive: true }); fs.writeFileSync(tmp + '/a.xlsx', 'PK\u0003\u0004fake'); fs.writeFileSync(tmp + '/a.csv', 'ten,x,y\n1,2259336.5,585000.1\n2,2259340.5,585000.1\n3,2259340.5,585008.1\n4,2259336.5,585008.1\n');
  const n0 = await p.evaluate(() => (window.plots || []).length);
  await p.setInputFiles('#file-upload', tmp + '/a.xlsx'); await p.waitForTimeout(800);
  const t1 = await p.evaluate(() => document.body.innerText + [...document.querySelectorAll('[class*=toast]')].map(e => e.innerText).join(' '));
  checks['bao_khong_ho_tro_nhap_excel'] = /Không hỗ trợ nhập Excel/.test(t1); checks['xlsx_khong_tao_thua'] = (await p.evaluate(() => (window.plots || []).length)) === n0;
  await p.setInputFiles('#file-upload', tmp + '/a.csv'); await p.waitForTimeout(1500);
  checks['csv_van_nhap_duoc'] = (await p.evaluate(() => (window.plots || []).length)) === n0 + 1;
  checks['van_xuat_Excel'] = await p.evaluate(() => typeof exportPlotsToExcel === 'function' && !!document.getElementById('btn-export-xlsx'));
  checks['khong_loi_trang'] = errs.length === 0;
  const ok = report('hm06e_no_xlsx_import', checks, { errs }); await b.close(); process.exit(ok ? 0 : 1);
})();
