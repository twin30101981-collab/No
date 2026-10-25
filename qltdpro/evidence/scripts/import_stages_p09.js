/* P09 — đo từng giai đoạn nhập 1 tệp dư nợ thật (đọc tệp → doImport → lưu trữ mốc). node import_stages_p09.js <app.html> [tệp] */
const { chromium } = require('playwright'); const path = require('path');
const APP = path.resolve(process.argv[2]), FILE = process.argv[3] || '/tmp/claude-0/real/data/20.10.2026.XLS';
(async () => { const b = await chromium.launch({ args: ['--no-sandbox'] }); const ctx = await b.newContext({ viewport: { width: 1500, height: 900 } }); const p = await ctx.newPage(); p.on('dialog', d => d.accept().catch(() => {}));
  await p.addInitScript(() => { window.__lt = []; try { new PerformanceObserver(l => l.getEntries().forEach(e => window.__lt.push([Math.round(e.startTime), Math.round(e.duration)]))).observe({ entryTypes: ['longtask'] }); } catch (e) {} });
  await p.goto('file://' + APP); await p.waitForTimeout(5000);
  const cdp = await ctx.newCDPSession(p); await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 });
  const st = {}; const T = () => p.evaluate(() => Math.round(performance.now()));
  let t = await T(); await cdp.send('Profiler.start');
  await p.evaluate(() => { try { pendingImportRows = null } catch (e) {} }); const a0 = Date.now(); await p.setInputFiles('#import-file', FILE);
  for (let i = 0; i < 200; i++) { await p.waitForTimeout(100); if (await p.evaluate(() => { try { return !!pendingImportRows } catch (e) { return false } })) break; } st.docFile = Date.now() - a0;
  const a1 = Date.now(); await p.evaluate(() => doImport()); await p.waitForTimeout(300); st.doImport = Date.now() - a1;
  const a2 = Date.now(); await p.evaluate(() => completeImportToDataArchive()); await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))); st.archive = Date.now() - a2; await p.waitForTimeout(4000);
  const { profile } = await cdp.send('Profiler.stop'); const lt = await p.evaluate(() => window.__lt.filter(x => x[1] >= 100));
  const self = {}, byId = {}; profile.nodes.forEach(n => byId[n.id] = n); profile.samples.forEach((id, i) => { const cf = byId[id].callFrame, k = (cf.functionName || '(anon)') + ':' + (cf.lineNumber + 1) + (cf.url ? '' : ' [native]'); self[k] = (self[k] || 0) + (profile.timeDeltas[i] || 0); });
  const top = Object.entries(self).filter(x => !/idle|program|garbage/.test(x[0])).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => Math.round(v / 1000) + 'ms ' + k);
  console.log(JSON.stringify({ stagesMs: st, longtasks100: lt, top }, null, 1)); await b.close(); })();
