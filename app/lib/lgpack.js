/* LGPK v1 reader (HM-27b) — xem định dạng ở handover/tools/cadastre_pack.py. Dùng: const pk = LGPack.open(arrayBuffer đã giải nén); pk.at(x,y); pk.get(to,thua) */
(function (g) {
  function open(buf) {
    const dv = new DataView(buf); if (dv.getUint32(0, true) !== 0x4b50474c) throw new Error('Không phải gói LGPK');
    const n = dv.getUint32(8, true), np = dv.getUint32(12, true), nn = dv.getUint32(16, true), nLeaf = dv.getUint32(24, true), nLd = dv.getUint32(44, true);
    const ox = dv.getFloat64(28, true), oy = dv.getFloat64(36, true);
    const P = 64, PTS = P + n * 44, PERM = PTS + np * 8, NODES = PERM + n * 4, LD = NODES + nn * 24;
    const pts = new Int32Array(buf.slice(PTS, PTS + np * 8)), perm = new Uint32Array(buf.slice(PERM, PERM + n * 4)), nd = new Int32Array(buf.slice(NODES, NODES + nn * 24));
    const ndu = new Uint32Array(nd.buffer);
    const ld = []; for (let i = 0; i < nLd; i++) { let s = ''; for (let j = 0; j < 8; j++) { const c = dv.getUint8(LD + i * 8 + j); if (c) s += String.fromCharCode(c); } ld.push(s); }
    const row = i => { const o = P + i * 44; return { to: dv.getUint32(o, true), thua: dv.getUint32(o + 4, true), dt: dv.getFloat32(o + 8, true), dtHH: dv.getFloat32(o + 12, true), ld: ld[dv.getUint16(o + 16, true)], s: dv.getUint32(o + 20, true), l: dv.getUint32(o + 24, true) }; };
    const ring = r => { const a = []; for (let k = 0; k < r.l; k++) a.push([ox + pts[(r.s + k) * 2] / 1000, oy + pts[(r.s + k) * 2 + 1] / 1000]); return a; };
    const pip = (r, x, y) => { let c = false; for (let a = r.s, b = r.s + r.l - 1, k = r.s; k < r.s + r.l; b = k++) { const xi = pts[k * 2], yi = pts[k * 2 + 1], xj = pts[b * 2], yj = pts[b * 2 + 1]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
    const out = r => ({ to: r.to, thua: r.thua, dt: r.dt, dtHH: r.dtHH, ld: r.ld, ring: ring(r) });
    return {
      n, ld,
      get(to, thua) { let lo = 0, hi = n - 1; while (lo <= hi) { const m = (lo + hi) >> 1, o = P + m * 44, t = dv.getUint32(o, true), h = dv.getUint32(o + 4, true); if (t === to && h === thua) return out(row(m)); (t < to || (t === to && h < thua)) ? lo = m + 1 : hi = m - 1; } return null; },
      at(x, y) { const X = Math.round((x - ox) * 1000), Y = Math.round((y - oy) * 1000), st = [nn - 1]; while (st.length) { const k = st.pop(), o = k * 6; if (X < nd[o] || Y < nd[o + 1] || X > nd[o + 2] || Y > nd[o + 3]) continue; const f = ndu[o + 4], c = ndu[o + 5]; if (k < nLeaf) { for (let j = 0; j < c; j++) { const r = row(perm[f + j]); if (pip(r, X, Y)) return out(r); } } else for (let j = 0; j < c; j++) st.push(f + j); } return null; },
      bbox() { const k = (nn - 1) * 6; return [ox + nd[k] / 1000, oy + nd[k + 1] / 1000, ox + nd[k + 2] / 1000, oy + nd[k + 3] / 1000]; },
      edges(to, thua) { const p = this.get(to, thua); if (!p) return null; const e = []; for (let i = 1; i < p.ring.length; i++) { const [x1, y1] = p.ring[i - 1], [x2, y2] = p.ring[i]; e.push({ dx: x2 - x1, dy: y2 - y1, len: Math.hypot(x2 - x1, y2 - y1) }); } return e; }
    };
  }
  g.LGPack = { open };
})(typeof window !== 'undefined' ? window : globalThis);
