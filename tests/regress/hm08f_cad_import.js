// HM-08f — màn "Nhập CAD / CSV" dựng lại trong sheet (thay tab-import trong sidebar): dán bảng toạ độ, CSV/GeoJSON/KML/DXF/TXT, chọn tỉnh → KTT, Excel bị từ chối, OCR điền sẵn, bản nháp tự lưu.
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path'); const fs = require('fs'); const { report } = require('../lib');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); await p.route(/^https?:/, r => r.abort());
  const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto('file://' + path.resolve(process.argv[2])); await p.waitForTimeout(4000);
  const tmp = '/tmp/hm08f_cad'; fs.mkdirSync(tmp, { recursive: true });
  const ring = [[2259340, 585000], [2259340, 585020], [2259320, 585020], [2259320, 585000]];
  fs.writeFileSync(tmp + '/a.csv', 'ten,x,y\n' + ring.map((q, i) => (i + 1) + ',' + q[0] + ',' + (q[1] + 100)).join('\n') + '\n');
  fs.writeFileSync(tmp + '/a.txt', ring.map((q, i) => (i + 1) + ' ' + q[0] + ' ' + (q[1] + 200)).join('\n') + '\n');
  fs.writeFileSync(tmp + '/a.xlsx', 'PK\u0003\u0004fake');
  const dxf = '0\nSECTION\n2\nENTITIES\n0\nLWPOLYLINE\n8\n0\n90\n4\n70\n1\n' + ring.map(q => '10\n' + (q[1] + 300) + '\n20\n' + q[0] + '\n').join('') + '0\nENDSEC\n0\nEOF\n'; fs.writeFileSync(tmp + '/a.dxf', dxf);
  const gj = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[106.150, 20.420], [106.151, 20.420], [106.151, 20.421], [106.150, 20.421], [106.150, 20.420]]] } }] }; fs.writeFileSync(tmp + '/a.geojson', JSON.stringify(gj));
  const kml = '<?xml version="1.0"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><Placemark><Polygon><outerBoundaryIs><LinearRing><coordinates>106.160,20.420,0 106.161,20.420,0 106.161,20.421,0 106.160,20.421,0 106.160,20.420,0</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark></Document></kml>'; fs.writeFileSync(tmp + '/a.kml', kml);
  const n = () => p.evaluate(() => (window.plots || []).length), openSheet = async () => { await p.evaluate(() => lgOpenImportCad()); await p.waitForTimeout(400); };
  const c = {}; const n0 = await n();
  // lối vào từ menu Nhập sổ
  await p.evaluate(() => { Array.from(document.querySelectorAll('.lg103-dbtn')).filter(x => /Nhập/.test(x.innerText))[0].click(); }); await p.waitForTimeout(500);
  await p.evaluate(() => document.querySelector('[data-lg103-act="import-cad"]').click()); await p.waitForTimeout(500);
  c.sheet = await p.evaluate(() => !!document.getElementById('cad-file') && !!document.getElementById('paste-coords') && !!document.getElementById('lg8g-prov') && document.getElementById('lg8g-prov').options.length > 5);
  c.accept_khong_xlsx = await p.evaluate(() => !/\.xls/.test(document.getElementById('cad-file').accept));
  // dán
  await p.fill('#paste-coords', ring.map((q, i) => (i + 1) + '\t' + q[0] + '\t' + q[1]).join('\n')); await p.waitForTimeout(13000);   // bản nháp tự lưu 12 s
  c.ban_nhap = await p.evaluate(() => /2259340/.test(localStorage.getItem('landgis_v42_draft') || ''));
  await p.evaluate(() => document.querySelector('[data-lg103-act="cad-paste"]').click()); await p.waitForTimeout(3500); c.dan = (await n()) === n0 + 1;
  c.dong_sheet_sau_nhap = await p.evaluate(() => { return !document.getElementById('lg103-sheet').classList.contains('on') || !document.querySelector('#lg103-body #cad-file'); });
  // dán sai
  await openSheet(); await p.fill('#paste-coords', 'khong phai toa do'); await p.evaluate(() => document.querySelector('[data-lg103-act="cad-paste"]').click()); await p.waitForTimeout(600); c.dan_sai_khong_tao = (await n()) === n0 + 1 && await p.evaluate(() => { return document.getElementById('lg103-sheet').classList.contains('on') && !!document.getElementById('cad-file'); });
  // các định dạng file
  let k = n0 + 1;
  for (const [f, name] of [['a.csv', 'csv'], ['a.txt', 'txt'], ['a.dxf', 'dxf'], ['a.geojson', 'geojson'], ['a.kml', 'kml']]) { await openSheet(); await p.setInputFiles('#cad-file', tmp + '/' + f); await p.waitForTimeout(1500); const m = await n(); c['file_' + name] = m === k + 1; k = m; }
  // Excel bị từ chối
  await openSheet(); await p.setInputFiles('#cad-file', tmp + '/a.xlsx'); await p.waitForTimeout(800); c.xlsx_tu_choi = (await n()) === k && /Không hỗ trợ nhập Excel/.test(await p.evaluate(() => [...document.querySelectorAll('[class*=toast]')].map(e => e.innerText).join(' ')));
  // chọn tỉnh đồng bộ với bộ chọn toàn cục
  await openSheet(); const sync = await p.evaluate(async () => { const s = document.getElementById('lg8g-prov'), opt = Array.from(s.options).find(o => o.value !== s.value); s.value = opt.value; s.dispatchEvent(new Event('change', { bubbles: true })); await new Promise(r => setTimeout(r, 200)); return document.getElementById('province-select').value === opt.value; }); c.chon_tinh_dong_bo = sync;
  // OCR điền sẵn
  await p.evaluate(() => lgOpenImportCad({ text: '1\t2259340.000\t568000.000\n2\t2259340.000\t568020.000\n3\t2259320.000\t568020.000' })); await p.waitForTimeout(400); c.ocr_dien_san = await p.evaluate(() => /2259340\.000/.test(document.getElementById('paste-coords').value));
  c.panel_cu_da_go = await p.evaluate(() => !document.getElementById('tab-import') && !document.getElementById('file-upload') && !document.getElementById('btn-import-paste'));
  c.khong_loi_trang = errs.length === 0;
  const ok = report('hm08f_cad_import', c, { errs }); await b.close(); process.exit(ok ? 0 : 1);
})();
