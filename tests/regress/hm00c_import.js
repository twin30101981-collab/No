// HM-00c — nhập dự án an toàn: 0 thửa hợp lệ → từ chối & giữ dữ liệu; thay thế → tự lưu bản sao + Hoàn tác; báo hợp lệ/không hợp lệ.
const { open, report } = require('../lib'); const fs = require('fs'); const os = require('os'); const path = require('path');
(async () => {
  const { b, p, errs } = await open(process.argv[2]);
  const dlg = []; p.on('dialog', d => { dlg.push(d.message()); d.accept(); });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hm00c-'));
  const P = (dx) => [[2259336.23, 568027.14], [2259334.17, 568027.23], [2259334.42, 568031.07], [2259316.85, 568031.69]].map(a => ({ x: a[0] + dx, y: a[1] }));
  const write = (n, o) => { const f = path.join(tmp, n); fs.writeFileSync(f, JSON.stringify(o)); return f; };
  const fBad = write('bad.landgis', { plots: [{ id: 'X', points: [{ x: 1, y: 2 }] }, { id: 'Y', points: 'abc' }] });
  const fMix = write('mix.landgis', { plots: [{ id: 'N1', points: P(100), lon0: 105.5, zone: 3, meta: {} }, { id: 'N2', points: P(200), lon0: 105.5, zone: 3, meta: {} }, { id: 'Hong', points: [{ x: 1, y: 2 }] }] });
  await p.evaluate(P0 => { drawPlot('Cu1', P0, 105.5, {}, false, 3); drawPlot('Cu2', P0.map(q => ({ x: q.x + 40, y: q.y })), 105.5, {}, false, 3); saveToLocalStorage(); }, P(0));
  const n0 = await p.evaluate(() => plots.length);
  const open_ = () => p.evaluate(() => document.getElementById('btn-backup-project').click());
  const run = async (f, id) => { await open_(); await p.waitForSelector('#lg31-proj-file'); await p.setInputFiles('#lg31-proj-file', f); await p.click(id); await p.waitForTimeout(700); };
  await run(fBad, '#lg31-proj-replace');
  const afterBad = await p.evaluate(() => ({ n: plots.length, ids: plots.map(x => x.id) }));
  await p.evaluate(() => document.querySelectorAll('.lg31-sheet,[id^=lg31-sheet]').forEach(e => e.remove()));
  await run(fMix, '#lg31-proj-replace');
  const afterRep = await p.evaluate(() => ({ n: plots.length, ids: plots.map(x => x.id), undo: !!localStorage.getItem('landgis_undo_import') }));
  const undone = await p.evaluate(() => { const r = lgProjectUndo(); return { r, n: plots.length, ids: plots.map(x => x.id) }; });
  const ok = report('hm00c_import', {
    file_0_thua_hop_le_bi_tu_choi_giu_du_lieu: afterBad.n === n0 && n0 === 2,
    bao_hop_le_khong_hop_le_truoc_xac_nhan: dlg.some(m => /2 thửa hợp lệ/.test(m) && /1 mục KHÔNG hợp lệ/.test(m)),
    thay_the_tu_luu_ban_sao: afterRep.n === 2 && afterRep.ids.join() === 'N1,N2' && afterRep.undo,
    hoan_tac_khoi_phuc: undone.r && undone.n === 2 && undone.ids.join() === 'Cu1,Cu2' }, { n0, afterBad, afterRep, undone, dlg });
  await b.close(); process.exit(ok && !errs.length ? 0 : 1);
})();
