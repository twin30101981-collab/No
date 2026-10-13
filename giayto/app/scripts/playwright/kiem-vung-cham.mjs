// HM-05: đếm vùng chạm < 40 px (kể cả vùng ::after) trên các màn chính ở 390 px. ROUTES=/me,/compare MIN=40 để đổi.
// Chạy: node scripts/playwright/kiem-vung-cham.mjs http://127.0.0.1:4174 thu   (playwright-core; cần máy chủ chạy bản build)
import { chromium } from "playwright-core";
const [BASE, tag] = process.argv.slice(2);
const routes = (process.env.ROUTES || "/,/documents,/tools,/me,/compare,/auth,/trash,/sync,/receipts,/id-photo,/photo-check,/measure,/field-test,/tools/history").split(",");
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await ctx.addInitScript(() => { try { localStorage.setItem("ghi-nhanh-settings", JSON.stringify({ onboarded: true })); } catch {} });
const MIN = Number(process.env.MIN || 40); let total = 0; const rows = [];
for (const r of routes) {
  const p = await ctx.newPage(); await p.goto(BASE + r, { waitUntil: "networkidle" }); await p.waitForTimeout(1200);
  const small = await p.evaluate((MIN) => {
    const vis = (e) => { const s = getComputedStyle(e); const q = e.getBoundingClientRect(); return q.width > 0 && q.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
    const sel = "button, a[href], [role=button], [role=switch], [role=checkbox], [role=tab], input:not([type=hidden]), select, summary, [role=slider]";
    const out = [];
    for (const e of document.querySelectorAll(sel)) {
      if (!vis(e)) continue;
      let q = e.getBoundingClientRect(); let w = q.width, h = q.height;
      if (e.tagName === "INPUT" || e.getAttribute("role") === "switch") { const l = e.closest("label"); if (l) { const lq = l.getBoundingClientRect(); w = Math.max(w, lq.width); h = Math.max(h, lq.height); } }
      { const a = getComputedStyle(e, "::after"); if (a.position === "absolute" && a.content !== "none") { w = Math.max(w, parseFloat(a.width) || 0); h = Math.max(h, parseFloat(a.height) || 0); } }
      const inline = e.tagName === "A" && getComputedStyle(e).display === "inline" && e.closest("p,li,span:not(.contents)");
      if (w < MIN || h < MIN) out.push({ tag: e.tagName.toLowerCase(), role: e.getAttribute("role") || "", name: (e.getAttribute("aria-label") || e.innerText || e.getAttribute("placeholder") || "").trim().replace(/\s+/g, " ").slice(0, 28), w: Math.round(w), h: Math.round(h), inline: !!inline, cls: String(e.className).slice(0, 50) });
    }
    return out;
  }, MIN);
  total += small.length; rows.push({ r, small });
  await p.close();
}
for (const { r, small } of rows) { console.log(`[${tag}] ${r}: ${small.length} < ${MIN}px`); for (const s of small.slice(0, 14)) console.log(`    ${s.tag}${s.role ? "[" + s.role + "]" : ""} "${s.name}" ${s.w}×${s.h}${s.inline ? " (liên kết trong chữ)" : ""} | ${s.cls}`); }
console.log(`[${tag}] TỔNG ${total}`);
await b.close();
