// HM-46d — gom CSS: (1) thang tầng chồng --z-* duy nhất: số giá trị z-index khác nhau trong <style> (trừ CSS Leaflet) ≤ 20, lớp nổi chính đọc từ biến;
// (2) thang chữ --fs-1..4 & khoảng cách --sp-1..5 cho khối lg46/lg8c/lg103; thứ tự chồng đúng: bản đồ < nút bản đồ < bảng thửa < tấm trượt < màn mờ < dock < thông báo < lớp toàn màn.
const { open, report } = require('../lib'); const fs = require('fs');
(async () => {
  const app = process.argv[2], s = fs.readFileSync(app, 'utf8'), vals = new Set();
  for (const sm of s.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) for (const rm of sm[1].matchAll(/([^{}]*)\{([^{}]*)\}/g)) { if (/leaflet/.test(rm[1])) continue; for (const m of rm[2].matchAll(/z-index\s*:\s*([0-9]+|var\([^)]*\)|auto)/g)) vals.add(m[1]); }
  const tok = {}; for (const m of s.matchAll(/--z-([a-z]+):(\d+);/g)) tok[m[1]] = m[2];   // giá trị thực sau khi thế biến
  const thuc = new Set([...vals].map(v => { const m = /^var\(--z-([a-z]+)\)$/.exec(v); return m ? tok[m[1]] : v; }));
  const { b, p, errs } = await open(app, { width: 390, height: 844 });
  await p.evaluate(() => { window.lgSnack && lgSnack('Kiểm tra'); }); await p.waitForTimeout(300);
  const z = await p.evaluate(() => {
    const v = n => +getComputedStyle(document.documentElement).getPropertyValue('--z-' + n), q = id => { const e = document.getElementById(id); return e ? +getComputedStyle(e).zIndex : NaN; };
    return { tok: ['map', 'head', 'side', 'fab', 'panel', 'chip', 'sheet', 'scrim', 'dock', 'over', 'dialog', 'toast', 'top', 'modal', 'max'].map(v),
      top: q('lg8c-top'), sheet: q('lg103-sheet'), dock: q('lg103-dock'), snack: q('lg46-snack'), pip: q('plot-info-panel'), stack: q('lg124-stack') };
  });
  const tang = z.tok.every((x, i) => x > 0 && (i === 0 || x > z.tok[i - 1]));
  const ok = report('hm46d_css', {
    z_index_khac_nhau_le_20: thuc.size <= 20,
    thang_z_tang_dan_du_15_bien: tang,
    lop_noi_doc_tu_bien: /#lg103-sheet\{[^}]*z-index:var\(--z-sheet\)|z-index:var\(--z-sheet\)/.test(s) && /#lg46-snack\{[^}]*z-index:var\(--z-toast\)/.test(s) && /#lg8d \{[^}]*z-index:var\(--z-modal\)/.test(s),
    thang_chu_khoang_cach: /--fs-1:13px; --fs-2:15px; --fs-3:17px; --fs-4:20px; --sp-1:4px; --sp-2:8px; --sp-3:12px; --sp-4:16px; --sp-5:24px;/.test(s) && (s.match(/var\(--(fs|sp)-\d\)/g) || []).length >= 20,
    thu_tu_chong_dung: z.top < z.pip && z.stack < z.pip && z.pip < z.sheet && z.sheet < z.dock && z.dock < z.snack,
    khong_loi_trang: errs.length === 0
  }, { so_gia_tri_z: thuc.size, chuoi_khac_nhau: vals.size, z, errs: errs.slice(0, 2) });
  await b.close(); process.exit(ok ? 0 : 1);
})();
