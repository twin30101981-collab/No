// HM-12a — đã gỡ các lớp LGCore chạy song song, mặc định tắt, không ai dùng (03-B, 04-B…08-E); giữ Runtime/DataStore/Geometry; tệp nhỏ đi; không lỗi tải trang.
const { open, report } = require('../lib'); const fs = require('fs'), path = require('path');
(async () => {
  const size = fs.statSync(path.resolve(process.argv[2])).size; const { b, p, errs } = await open(process.argv[2]);
  const r = await p.evaluate(() => { const gone = ['StorageAdapter', 'Migration', 'GeometryAudit', 'GeometryBridge', 'GeometryBridge2', 'Export', 'ExportTables', 'ExportExcel', 'AreaError', 'ExportExcelFile', 'ExportColumns', 'Rollout', 'RolloutGuard', 'RolloutBaseline', 'RolloutPanel', 'RolloutReport', 'Timers', 'TimersPanel', 'ReportTimers'].filter(n => window.LGCore && window.LGCore[n]);
    const keep = ['Geometry', 'DataStore', 'Diagnostics', 'EventBus'].filter(n => !(window.LGCore && window.LGCore[n]));
    const a = calcArea([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]);
    return { gone, keepMissing: keep, area: a, validate: typeof LGCore.Geometry.validate, tol: calcPermissibleAreaError(100) }; });
  const ok = report('hm12a_cleanup', { da_go_cac_lop_song_song: r.gone.length === 0, giu_lai_loi_dang_dung: r.keepMissing.length === 0 && r.validate === 'function', ham_tinh_van_dung: Math.abs(r.area - 100) < 1e-6 && Math.abs(r.tol - (0.05 * 10 + 0.03)) < 1e-6,
    tep_nho_di_duoi_3_0MB: size < 3000000, khong_loi_trang: errs.length === 0 }, { r, size, errs });
  await b.close(); process.exit(ok ? 0 : 1);
})();
