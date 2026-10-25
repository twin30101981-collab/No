const { chromium } = require('playwright'); const fs = require('fs');
const OLD = process.argv[2], NEW = process.argv[3], PART = process.argv[4] || 'all';
(async () => { const b = await chromium.launch(); const res = []; const ck = (n, c, x) => res.push((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : ' ' + JSON.stringify(x).slice(0, 500)));
  const names = [...new Set((fs.readFileSync(OLD, 'utf8').match(/--[\w-]+(?=\s*:)/g) || []))];
  async function snap(file, w) { const p = await (await b.newContext({ viewport: { width: w, height: 900 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 120))); p.on('dialog', d => d.accept());
    await p.goto('file://' + file, { waitUntil: 'load' }); await p.waitForTimeout(4500);
    const r = await p.evaluate(ns => { const cs = getComputedStyle(document.documentElement); const o = {}; ns.forEach(n => o[n] = cs.getPropertyValue(n).trim()); return { vars: o, roots: [...document.querySelectorAll('style')].map(s => (s.textContent.match(/:root\s*\{/g) || []).length).reduce((a, b) => a + b, 0) }; }, names);
    r.errs = errs; await p.context().close(); return r; }
  for (const w of [1500, 800, 390]) { const o = await snap(OLD, w), n = await snap(NEW, w);
    const diff = names.filter(k => o.vars[k] !== n.vars[k]);
    ck('token @' + w + 'px: giá trị tính ra của ' + names.length + ' biến CSS giống hệt bản cũ', diff.length === 0, diff.slice(0, 6).map(k => [k, o.vars[k], n.vars[k]]));
    if (w === 1500) { ck('số khối :root giảm (' + o.roots + ' → ' + n.roots + ')', n.roots < o.roots, [o.roots, n.roots]); ck('không pageerror', n.errs.length === 0, n.errs); } }
  console.log(res.join('\n')); console.log('PASS', res.filter(x => x[0] === 'P').length, 'FAIL', res.filter(x => x[0] === 'F').length); await b.close(); })();
