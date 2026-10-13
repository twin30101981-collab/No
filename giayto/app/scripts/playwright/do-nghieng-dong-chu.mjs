// HM-13: đo độ nghiêng dòng chữ (lineSkewMap của app) trên ảnh sau "Tự dò góc". Ảnh trong thư mục là tham số 2.
// Chạy: OUT=./out node scripts/playwright/do-nghieng-dong-chu.mjs http://127.0.0.1:4174 de-an-nang-cap-scan/kiem-chung/bo-anh-Q/goc   (cần OUT/shots, playwright-core)
import { chromium } from "playwright-core";
import fs from "node:fs";
const [BASE, dir] = process.argv.slice(2);
const files = fs.readdirSync(dir).filter((f) => /\.jpe?g$/i.test(f)).sort();
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const out = [];
for (const f of files) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => { try { localStorage.setItem("ghi-nhanh-settings", JSON.stringify({ onboarded: true })); } catch {} });
  const p = await ctx.newPage();
  await p.goto(BASE + "/", { waitUntil: "networkidle" });
  const [fc] = await Promise.all([p.waitForEvent("filechooser"), p.getByText("Nhập ảnh", { exact: true }).first().click()]);
  await fc.setFiles([`${dir}/${f}`]);
  await p.waitForURL(/\/doc\//, { timeout: 60000 });
  await p.waitForTimeout(6000);
  await p.getByRole("button", { name: /Tự dò góc/ }).click().catch(() => {});
  await p.waitForTimeout(30000); // chờ dò khung + dựng bản đầy đủ
  const res = await p.evaluate(async () => {
    const imgs = [...document.querySelectorAll("img")].filter((i) => i.naturalWidth > 300).sort((a, b) => b.naturalWidth * b.naturalHeight - a.naturalWidth * a.naturalHeight);
    const im = imgs[0]; if (!im) return { err: "không thấy ảnh" };
    const W = im.naturalWidth, H = im.naturalHeight;
    const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d"); x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, W, H).data; const g = new Uint8Array(W * H);
    for (let i = 0; i < g.length; i++) g[i] = d[i * 4];
    window.__dataurl = c.toDataURL("image/jpeg", 0.6);
    const url = [...document.querySelectorAll("script[type=module],link[rel=modulepreload]")].map((e) => e.src || e.href).find((u) => /line-skew/.test(u));
    const names = [...performance.getEntriesByType("resource")].map((e) => e.name).find((u) => /line-skew/.test(u));
    const mod = await import(names || url || "/assets/" + (await fetch("/").then(() => "")) );
    for (const k of Object.keys(mod)) { try { const r = mod[k](g, W, H); if (r && r.cells) return { W, H, cells: r.cells.map((c) => ({ b: c.band, s: c.side, a: +c.angle.toFixed(2), ink: c.ink })), tilt: r.tilt, curve: r.curve }; } catch {} }
    return { err: "không gọi được lineSkewMap", keys: Object.keys(mod), url: names || url };
  });
  { const u = await p.evaluate(() => window.__dataurl); if (u) fs.writeFileSync(`${process.env.OUT}/shots/hm13_${f.replace(/\W/g, "_")}.jpg`, Buffer.from(u.split(",")[1], "base64")); }
  out.push({ f, ...res }); await ctx.close();
  if (res.cells) {
    const ok = res.cells.filter((c) => c.ink >= 50);
    const half = (lo, hi) => ok.filter((c) => c.b >= lo && c.b < hi).map((c) => Math.abs(c.a));
    const mx = (a) => (a.length ? Math.max(...a).toFixed(2) : "-");
    console.log(`${f}: ${res.W}×${res.H} | nửa trên max|góc|=${mx(half(0, 3))}° | nửa dưới max|góc|=${mx(half(3, 6))}° | ô có mực: ${ok.length}/12`);
    console.log("   " + res.cells.map((c) => `d${c.b}${c.s ? "P" : "T"}:${c.a}(${c.ink})`).join(" "));
  } else console.log(f, JSON.stringify(res));
}
fs.writeFileSync(process.env.OUT + "/hm13-skew-do-lai.json", JSON.stringify(out, null, 1));
await b.close();
