const E = require('./_realenv.js'); // P10 (T8)
/* HM-17b (P04): chọn cột cho Chuyển HM, TSBĐ, Giá đất — kiểm trên dữ liệu thật (ngoài repo, /tmp/claude-0/real/data).
   node hm17c_real.js <app.html> [thư mục dữ liệu]   ⇒ PASS n FAIL m */
const { chromium } = require('playwright'); const path = require('path');
const APP = path.resolve(process.argv[2]), D = (process.argv[3] || E.DATA) + '/';
let P = 0, F = 0; const ck = (n, c, x) => { if (c) P++; else F++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  → ' + JSON.stringify(x).slice(0, 400))); };
const KEYS = { chlm: { tid: 'table-chlm', gon: 'gon' }, tsbd: { tid: 'tsbd-table', gon: 'gon' }, giadat: { tid: 'main-table', gon: 'ubnd' } };
/* đo: tràn ngang, số cột thân bảng còn hiện, độ lệch (px) giữa ô tiêu đề hàng cuối / ô dòng tổng và ô thân bảng cùng cột logic */
const measure = (p, tid) => p.evaluate(tid => {
  const t = document.getElementById(tid), w = t.closest('.table-wrap') || t.parentElement, C = TD.cols;
  const row = [...t.tBodies[0].rows].find(r => r.cells.length > 3); if (!row) return { empty: true };
  const body = [...row.cells].map((c, i) => ({ i, vis: getComputedStyle(c).display !== 'none', l: Math.round(c.getBoundingClientRect().left), r: Math.round(c.getBoundingClientRect().right) }));
  const sec = s => { if (!s || !s.rows.length) return []; const cells = [...s.rows].map(r => [...r.cells]); const g = C.grid(cells.map(r => r.map(c => ({ cs: +(c.dataset.tdCs || c.colSpan), rs: c.rowSpan }))));
    const out = []; cells.forEach((r, i) => r.forEach((c, j) => { if (getComputedStyle(c).display === 'none') return; const vis = body.filter(b => b.vis && b.i >= g[i][j][0] && b.i < g[i][j][1]); if (!vis.length) { out.push({ bad: 'ô hiện nhưng không còn cột', txt: c.textContent.slice(0, 20) }); return; }
      const bb = c.getBoundingClientRect(); out.push({ d: Math.max(Math.abs(bb.left - vis[0].l), Math.abs(bb.right - vis[vis.length - 1].r)), txt: c.textContent.trim().slice(0, 16) }); })); return out; };
  const h = sec(t.tHead), f = sec(t.tFoot), all = h.concat(f);
  return { sw: t.scrollWidth, cw: w.clientWidth, nvis: body.filter(b => b.vis).length, ncol: body.length, maxOff: Math.max(0, ...all.filter(x => x.d != null).map(x => x.d)), bad: all.filter(x => x.bad), worst: all.sort((a, b) => (b.d || 0) - (a.d || 0))[0], bar: !!document.querySelector('.td-cols-bar[data-key]') };
}, tid);
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } }); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 160))); p.on('dialog', d => d.accept());
  await p.goto('file://' + APP); await p.waitForTimeout(5000);
  await p.evaluate(() => { try { pendingImportRows = null } catch (e) {} }); await p.setInputFiles('#import-file', D + '20.10.2026.XLS');
  for (let i = 0; i < 120; i++) { await p.waitForTimeout(500); if (await p.evaluate(() => { try { return !!pendingImportRows } catch (e) { return false } })) break; }
  await p.evaluate(() => doImport()); await p.waitForTimeout(800); await p.evaluate(() => completeImportToDataArchive()); await p.waitForTimeout(4000);
  await p.evaluate(() => showPage('tsbd')); await p.waitForTimeout(1500); await p.setInputFiles('#tsbd-file', D + 'Sao ke tai san bao dam 20.10.2026.XLS'); await p.waitForTimeout(25000);
  const qltdBefore = await p.evaluate(() => { showPage('qltd'); return null; }); await p.waitForTimeout(2500);
  const q0 = await p.evaluate(() => getComputedStyle(document.querySelector('#table-qltd thead th:nth-child(7)')).display);
  for (const [k, o] of Object.entries(KEYS)) {
    await p.evaluate(k => showPage(k), k); await p.waitForTimeout(3000);
    const has = await p.evaluate(k => !!document.querySelector('.td-cols-bar[data-key="' + k + '"]'), k);
    ck(k + ': có thanh chọn cột', has, k);
    const m0 = await measure(p, o.tid);
    ck(k + ': mặc định Đầy đủ — không ẩn cột nào', !m0.empty && m0.nvis === m0.ncol, m0);
    ck(k + ': mặc định — tiêu đề/dòng tổng thẳng hàng thân bảng (≤1 px)', m0.maxOff <= 1 && !m0.bad.length, m0);
    await p.evaluate(([k, g]) => document.querySelector('.td-cols-bar[data-key="' + k + '"] [data-p="' + g + '"]').click(), [k, o.gon]); await p.waitForTimeout(700);
    const m1 = await measure(p, o.tid);
    ck(k + ': "' + o.gon + '" ⇒ hết tràn ngang ở 1366 (' + m1.sw + '/' + m1.cw + ')', m1.sw <= m1.cw + 1, m1);
    ck(k + ': "' + o.gon + '" ⇒ tiêu đề/dòng tổng thẳng hàng (≤1 px), không ô thừa', m1.maxOff <= 1 && !m1.bad.length, m1);
    // bỏ chọn thêm một cột qua bảng chọn
    const extra = await p.evaluate(k => { const bar = document.querySelector('.td-cols-bar[data-key="' + k + '"]'); const c = [...bar.querySelectorAll('.td-cols-panel input')].find(x => !x.disabled && x.checked); c.checked = false; c.dispatchEvent(new Event('change', { bubbles: true })); return +c.dataset.i; }, k); await p.waitForTimeout(500);
    const m2 = await measure(p, o.tid);
    ck(k + ': tự chọn cột (bỏ cột ' + extra + ') ⇒ ' + (m1.nvis - 1) + ' cột, vẫn thẳng hàng', m2.nvis === m1.nvis - 1 && m2.maxOff <= 1 && !m2.bad.length, m2);
  }
  // lọc lại Chuyển HM (dựng lại tbody + tfoot) ⇒ vẫn thẳng hàng
  await p.evaluate(() => showPage('chlm')); await p.waitForTimeout(2000);
  await p.evaluate(() => { try { renderChlmGrouped(); } catch (e) {} }); await p.waitForTimeout(800);
  const m3 = await measure(p, 'table-chlm'); ck('chlm: dựng lại bảng (lọc) ⇒ dòng tổng vẫn thẳng hàng', m3.maxOff <= 1 && !m3.bad.length, m3);
  // tải lại: giữ lựa chọn từng bảng; bảng Dư nợ (HM-17) không bị ảnh hưởng
  await p.reload(); await p.waitForTimeout(6000);
  for (const [k, o] of Object.entries(KEYS)) { await p.evaluate(k => showPage(k), k); await p.waitForTimeout(3000); const m = await measure(p, o.tid); ck(k + ': tải lại ⇒ giữ lựa chọn (' + m.nvis + '/' + m.ncol + ' cột)', !m.empty && m.nvis < m.ncol && m.maxOff <= 1, m); }
  await p.evaluate(() => showPage('qltd')); await p.waitForTimeout(2500);
  const q1 = await p.evaluate(() => getComputedStyle(document.querySelector('#table-qltd thead th:nth-child(7)')).display);
  ck('Dư nợ (HM-17): hành vi cũ giữ nguyên (cột 7 ở 1366: ' + q0 + ' → ' + q1 + ')', q0 === q1, [q0, q1]);
  ck('không pageerror', errs.length === 0, errs);
  console.log('PASS', P, 'FAIL', F); await b.close(); process.exit(F ? 1 : 0);
})();
