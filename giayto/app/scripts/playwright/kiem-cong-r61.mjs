// HM-11: cổng R6.1 bằng Node/Playwright (tương đương scripts/kiem-chung-r61.py). Cần máy chủ phát triển (vite) đang chạy ở cổng 8081.
// Chạy: node scripts/playwright/kiem-cong-r61.mjs http://127.0.0.1:8081 ket-qua.json de-an-nang-cap-scan/kiem-chung/bo-anh-*/goc/IMG_*.jpg
// Cổng R6.1 bằng Node/Playwright (tương đương scripts/kiem-chung-r61.py): dựng 7 bộ lọc + 6 công cụ qua renderPage thật rồi đo measureGate.
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
const [BASE, outFile, ...imgs] = process.argv.slice(2);
const FILTERS = ["magic", "auto", "sharp", "mono", "gray", "ink", "eco"];
const TOOLS = [1, 2, 3].map((l) => ({ deshadow: l })).concat([1, 2, 3].map((l) => ({ denoise: l })));
const JS = `async (b64)=>{
  const im = await import('/src/lib/image.ts'); const qg = await import('/src/lib/quality-gate.ts');
  const src = URL.createObjectURL(await (await fetch('data:image/jpeg;base64,'+b64)).blob());
  im.releaseRenderCache(); const info = await im.detectQuadInfo(src);
  const filters = ${JSON.stringify(FILTERS)}; const tools = ${JSON.stringify(TOOLS)};
  const cases = filters.map(f=>({k:f,f,t:null})).concat(tools.map(t=>({k:'auto+'+Object.keys(t)[0]+Object.values(t)[0],f:'auto',t})));
  const res = {};
  for (const c of cases) {
    const out = await im.renderPage(src,{quad:info.quad,rotation:0,filter:c.f,brightness:0,contrast:0,tools:c.t},1400);
    const o = await im.loadImg(out); const cv = document.createElement('canvas'); const s = Math.min(1,1200/o.naturalWidth);
    cv.width = Math.round(o.naturalWidth*s); cv.height = Math.round(o.naturalHeight*s);
    const ctx = cv.getContext('2d'); ctx.drawImage(o,0,0,cv.width,cv.height);
    res[c.k] = qg.measureGate(ctx.getImageData(0,0,cv.width,cv.height).data,cv.width,cv.height);
  }
  return res; }`;
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--enable-unsafe-swiftshader"] });
const ctx = await b.newContext({ viewport: { width: 1280, height: 1800 }, serviceWorkers: "block" });
const pg = await ctx.newPage(); const errs = [];
pg.on("pageerror", (e) => errs.push(String(e).slice(0, 160)));
await pg.goto(BASE + "/field-test", { waitUntil: "networkidle", timeout: 120000 });
const res = {};
for (const f of imgs) {
  const ten = path.basename(f).replace(/\.jpe?g$/i, "");
  const b64 = fs.readFileSync(f).toString("base64");
  const r = await pg.evaluate(`(${JS})(${JSON.stringify(b64)})`);
  if (!r) { console.error("evaluate trả về rỗng", errs); continue; }
  for (const [k, v] of Object.entries(r)) res[`${ten}|${k}`] = v;
  process.stderr.write(ten + " xong\n");
}
await b.close();
const all = Object.entries(res); const dat = all.filter(([, v]) => v.pass).length;
const byCfg = {}; for (const [k, v] of all) { const c = k.split("|")[1]; (byCfg[c] ??= { dat: 0, tong: 0 }); byCfg[c].tong++; if (v.pass) byCfg[c].dat++; }
const sample = all[0]?.[1] || {};
fs.writeFileSync(outFile, JSON.stringify({ so_ca: all.length, ca_dat: dat, theo_cau_hinh: byCfg, chi_tiet: res, loi_trang: errs }, null, 1));
console.log(`ca đạt ${dat}/${all.length} | lỗi trang ${errs.length} | khoá số đo: ${Object.keys(sample).join(",")}`);
console.log(JSON.stringify(byCfg));
const fail = all.filter(([, v]) => !v.pass).map(([k]) => k);
if (fail.length) console.log("trượt:", fail.slice(0, 40).join("; "));
