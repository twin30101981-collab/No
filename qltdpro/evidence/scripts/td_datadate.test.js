const TD = require('./td_datadate.js').dataDate; let p = 0, f = 0;
const ok = (n, c, x) => { if (c) p++; else { f++; console.log('FAIL', n, x); } };
const mem = {}; TD._store = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
const cases = [['30.06.2026.XLS','30/06/2026'],['30_06_2026.XLS','30/06/2026'],['DUNO_18.08.2026.xlsx','18/08/2026'],['msit80_30_06_2026.xlsx','30/06/2026'],
 ['msit80-2026-06-30.csv','30/06/2026'],['DUNO 20260630.xls','30/06/2026'],['DUNO 30062026.xls','30/06/2026'],['31.05.2026 (1).xlsx','31/05/2026'],
 ['5.6.2026.xls','05/06/2026'],['31.02.2026.xls',null],['bao cao.xls',null],['msit80_12345_2026.xls',null],['',null],[null,null],['20.10.2026.XLS','20/10/2026'],['DUNO_18.08.2026_v2.xls','18/08/2026']];
cases.forEach(([n, e]) => ok('fn ' + n, TD.fromFileName(n) === e, TD.fromFileName(n)));
// chưa có ngày -> hôm nay
ok('eff-none', TD.effective().getTime() === TD.realToday().getTime());
TD.set('18/08/2026');
ok('get', TD.get() && TD.get().getFullYear() === 2026 && TD.get().getMonth() === 7 && TD.get().getDate() === 18);
ok('eff-data', TD.key() === '18/08/2026');
ok('label-data', TD.label().mode === 'data' && TD.label().stale === true);
TD.setMode('today');
ok('eff-today', TD.effective().getTime() === TD.realToday().getTime() && TD.label().mode === 'today');
TD.setMode('data'); ok('mode-back', TD.mode() === 'data');
TD.set('31/02/2026'); ok('bad-date', TD.get() === null);
TD.set('30/06/2026'); ok('two-days-two-keys', TD.key() === '30/06/2026'); TD.set('01/07/2026'); ok('key2', TD.key() === '01/07/2026');
TD.set(null); ok('clear', TD.get() === null);
console.log('PASS', p, 'FAIL', f); process.exit(f ? 1 : 0);
