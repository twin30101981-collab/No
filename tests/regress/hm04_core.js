// HM-04 — một lõi hình học: mọi bản diện tích gọi LGCore.Geometry (sai lệch < 0,001 m² so với tính chính xác BigInt);
// Mẫu A/B ra đúng phường; vn2000 đặt tên bắc/đông, nhận lon0/zone, từ chối toạ độ ngoài Việt Nam; chỉ MỘT định nghĩa proj4 VN-2000.
const { open, report, fx } = require('../lib'); const fs = require('fs'); const path = require('path');
(async () => {
  const A = fx('so-mau-A.json'), B = fx('so-mau-B.json'); const { b, p, errs } = await open(process.argv[2]);
  // đa giác thử: toạ độ 2 chữ số thập phân cỡ 10^6 (nhân đôi để dư vòng thử)
  const polys = [A.khoi_chinh, B.khoi_chinh].map(r => r.map(q => ({ x: q[0], y: q[1] })));
  const rnd = []; let seed = 7; const R = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let k = 0; k < 20; k++) { const n = 5 + Math.floor(R() * 8), cx = 2200000 + R() * 400000, cy = 450000 + R() * 200000; rnd.push(Array.from({ length: n }, (_, i) => { const a = i / n * 6.2832, r = 20 + R() * 200; return { x: +(cx + r * Math.cos(a)).toFixed(2), y: +(cy + r * Math.sin(a)).toFixed(2) }; })); }
  const all = polys.concat(rnd);
  const exact = poly => { let s = 0n; const n = poly.length; for (let i = 0; i < n; i++) { const a = poly[i], c = poly[(i + 1) % n]; s += BigInt(Math.round(a.x * 100)) * BigInt(Math.round(c.y * 100)) - BigInt(Math.round(c.x * 100)) * BigInt(Math.round(a.y * 100)); } if (s < 0n) s = -s; return Number(s) / 2e4; };
  const r = await p.evaluate(all => {
    const G = LGCore.Geometry, fns = { core: G.area, calcArea, lg56: LG56.ringArea, lg144: LG144.shoelace, lg184: LG184.shoelace, lg57: LG57.ringAreaSafe && (pts => LG57.ringAreaSafe(pts)), lg60: window.lgCoreArea };
    const out = {}; for (const [k, f] of Object.entries(fns)) { if (!f) continue; out[k] = all.map(pl => f(pl)); }
    const bd = (x, y, lon0, zone) => G.vn2000.bacDongToWGS84(x, y, { lon0, zone });
    return { out, A: bd(2260081.59, 570346.55, 105.5, 3), B: bd(2259336.23, 568027.14, 105.5, 3), swapped: bd(570346.55, 2260081.59, 105.5, 3), far: bd(100, 100, 105.5, 3),
      def: [G.vn2000.def({ ktt: 105.5, mui: 3 }), generateVN2000Proj4(105.5, 3, 'QUOCGIA')], back: G.vn2000.wgs84ToBacDong(20.4307, 106.1760, { lon0: 105.5, zone: 3 }) }; }, all);
  const ex = all.map(exact); let maxErr = 0, worst = '';
  for (const [k, arr] of Object.entries(r.out)) arr.forEach((v, i) => { const e = Math.abs(v - ex[i]); if (e > maxErr) { maxErr = e; worst = k + '#' + i; } });
  const src = fs.readFileSync(path.resolve(process.argv[2]), 'utf8');
  const raw = (src.match(/\.x \* \w+\.y - \w+\.x \* \w+\.y/g) || []).length;
  const defs = (src.match(/'\+proj=tmerc \+lat_0=0 \+lon_0=/g) || []).length + (src.match(/`\+proj=tmerc \+lat_0=0 \+lon_0=/g) || []).length;
  const near = (a, v) => Math.abs(a - v) < 0.0006;
  const ok = report('hm04_core', {
    sai_lech_dien_tich_duoi_0_001: maxErr < 0.001,
    moi_ban_goi_loi: raw === 0,
    mau_A_dung_phuong: r.A && near(r.A.lat, 20.4307) && near(r.A.lng, 106.1760),
    mau_B_dung_phuong: r.B && near(r.B.lat, 20.4241) && near(r.B.lng, 106.1538),
    tu_choi_ngoai_VN_va_dao_XY: r.swapped === null && r.far === null,
    mot_dinh_nghia_proj4: r.def[0] === r.def[1] && defs <= 3 }, { maxErr, worst, raw, defs, A: r.A, B: r.B, back: r.back });
  await b.close(); process.exit(ok && !errs.length ? 0 : 1);
})();
