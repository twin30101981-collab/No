// HM-27b: dựng 20.000 thửa giả lập -> cadastre_pack.py -> đọc bằng app/lib/lgpack.js; tra < 50 ms; gói ≤ 6 MB; sha256 khớp manifest.
const { spawnSync } = require('child_process'); const fs = require('fs'), os = require('os'), path = require('path'), zlib = require('zlib'), crypto = require('crypto');
const root = path.join(__dirname, '..', '..'); const d = fs.mkdtempSync(path.join(os.tmpdir(), 'pk-'));
const parcels = []; const N = 20000, W = 200;
for (let i = 0; i < N; i++) { const x = 600000 + (i % W) * 22.5, y = 2260000 + Math.floor(i / W) * 31.25, s = 20, t = 15; parcels.push({ to: 1 + Math.floor(i / 2000), thua: 1 + (i % 2000), dt: s * t, dtHH: s * t, ld: i % 3 ? 'ONT' : 'LUC', ring: [[x, y], [x + s, y], [x + s, y + t], [x, y + t], [x, y]] }); }
fs.writeFileSync(d + '/parcels.json', JSON.stringify({ xa: 'Xã thử', crs: 'VN2000', n: N, parcels }));
const r = spawnSync('python3', [root + '/handover/tools/cadastre_pack.py', d + '/parcels.json', d + '/out'], { encoding: 'utf8' });
const fail = m => { console.error('FAIL ' + m + '\n' + r.stderr); process.exit(1); };
if (r.status) fail('pack.py'); const gz = fs.readFileSync(d + '/out/pack.lgpk.gz'), man = JSON.parse(fs.readFileSync(d + '/out/manifest.json'));
if (crypto.createHash('sha256').update(gz).digest('hex') !== man.sha256) fail('sha256');
if (gz.length > 6e6) fail('gói > 6MB: ' + gz.length);
require(root + '/app/lib/lgpack.js'); const raw = zlib.gunzipSync(gz); const pk = globalThis.LGPack.open(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length));
if (pk.n !== N) fail('n=' + pk.n);
const g = pk.get(3, 17); if (!g || Math.abs(g.dt - 300) > 1e-3 || g.ld === undefined) fail('get');
const mid = g.ring; const cx = (mid[0][0] + mid[2][0]) / 2, cy = (mid[0][1] + mid[2][1]) / 2;
const h = pk.at(cx, cy); if (!h || h.to !== 3 || h.thua !== 17) fail('at → ' + JSON.stringify(h && [h.to, h.thua]));
if (pk.at(cx, cy + 10)) fail('điểm ngoài thửa (khe giữa hàng) lại trúng'); // khe y: 31.25-15 → trống
const e = pk.edges(3, 17); if (e.length !== 4 || Math.abs(e[0].len - 20) > 1e-3) fail('edges');
let t0 = process.hrtime.bigint(), bad = 0; for (let k = 0; k < 2000; k++) { const q = pk.get(1 + (k % 10), 1 + ((k * 7) % 2000)); if (!q) bad++; } const getMs = Number(process.hrtime.bigint() - t0) / 2e9;
t0 = process.hrtime.bigint(); for (let k = 0; k < 2000; k++) { const i = (k * 37) % N, x = 600000 + (i % W) * 22.5 + 10, y = 2260000 + Math.floor(i / W) * 31.25 + 7; const q = pk.at(x, y); if (!q || q.to !== 1 + Math.floor(i / 2000) || q.thua !== 1 + (i % 2000)) bad++; } const atMs = Number(process.hrtime.bigint() - t0) / 2e9;
if (bad) fail('sai ' + bad + ' lượt tra'); if (getMs > 50 || atMs > 50) fail('chậm ' + getMs + '/' + atMs);
console.log(`PASS hm27b_pack (gói ${(gz.length / 1e3).toFixed(0)} KB, get ${getMs.toFixed(4)} ms, at ${atMs.toFixed(4)} ms)`);
