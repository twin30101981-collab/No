// Tiện ích dùng chung cho tests/regress/*.js
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path');
exports.open = async (app, vp) => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: vp || { width: 390, height: 844 } });
  const p = await ctx.newPage(); await p.route(/^https?:/, r => r.abort());
  const errs = []; p.on('pageerror', e => errs.push(String(e.message).slice(0, 200)));
  await p.goto('file://' + path.resolve(app)); await p.waitForTimeout(3500);
  return { b, p, errs };
};
exports.fx = n => require(path.join(__dirname, 'fixtures', n));
exports.report = (name, checks, extra) => { // checks: {mô_tả: boolean}
  const ok = Object.values(checks).every(Boolean);
  console.log(JSON.stringify({ test: name, checks, ...(extra || {}) }), ok ? 'PASS' : 'FAIL'); return ok;
};
