// P18: kiểm V3 các nợ TD-37 (gợi ý Tự dò góc khi nhập ảnh chụp), TD-14 (kéo thanh trượt bị pointercancel vẫn ghi giá trị),
// TD-13 (màn Chỉnh tay vẫn mở bình thường khi được bọc SafeBoundary).
// Chạy: npx vite dev --host 127.0.0.1 --port 8081; rồi (playwright-core ở thư mục riêng) IMG=<ảnh chụp> node scripts/playwright/kiem-no-p18.mjs http://127.0.0.1:8081
import { chromium } from "playwright-core";
const [BASE] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await ctx.addInitScript(() => { try { localStorage.setItem("ghi-nhanh-settings", JSON.stringify({ onboarded: true, autoOcr: false })); } catch {} });
const p = await ctx.newPage(); const errs = []; let bad = 0;
p.on("pageerror", (e) => errs.push(String(e)));
const ok = (c, m) => { console.log(`${c ? "ĐẠT" : "LỖI"} ${m}`); if (!c) bad++; };
await p.goto(BASE + "/", { waitUntil: "networkidle" });
const [fc] = await Promise.all([p.waitForEvent("filechooser"), p.getByText("Nhập ảnh", { exact: true }).first().click()]);
await fc.setFiles([process.env.IMG]);
await p.waitForURL(/\/doc\//, { timeout: 30000 }); await p.waitForTimeout(2500);
const kind = await p.evaluate(async () => {
  const id = location.pathname.split("/").pop();
  const { getDocs } = await import("/src/lib/db.ts"); const d = getDocs().find((x) => x.id === id);
  return { kind: d?.pages[0]?.importKind, quad: !!d?.pages[0]?.edit.quad };
});
const hint = await p.getByTestId("corner-hint").count();
console.log(`ảnh nhập: importKind=${kind.kind} quad=${kind.quad} gợi ý=${hint}`);
ok(hint === (kind.kind === "photo" && !kind.quad ? 1 : 0), "TD-37 gợi ý khớp loại ảnh nhập");
if (hint) {
  await p.getByRole("button", { name: "Tự dò góc" }).click(); await p.waitForTimeout(500);
  await p.getByRole("button", { name: "Tự dò góc" }).waitFor({ timeout: 60000 }); await p.waitForTimeout(800); // hết "Đang dò góc…"
  const q2 = await p.evaluate(async () => { const id = location.pathname.split("/").pop(); const { getDocs } = await import("/src/lib/db.ts"); return !!getDocs().find((x) => x.id === id)?.pages[0]?.edit.quad; });
  ok((await p.getByTestId("corner-hint").count()) === (q2 ? 0 : 1), `TD-37 sau Tự dò góc (quad=${q2}) gợi ý ẩn/hiện đúng`);
}
// TD-13/TD-14: mở Chỉnh tay qua nút Lọc, kéo thanh Độ sáng bằng chạm rồi phát pointercancel.
await p.getByText("Lọc", { exact: true }).first().click(); await p.waitForTimeout(1200);
ok(await p.getByText(/Độ sáng \(/).isVisible(), "TD-13 màn Chỉnh tay mở bình thường");
// Chạm thật qua CDP (PointerEvent tổng hợp không setPointerCapture được); touchCancel → pointercancel.
await p.locator('[aria-labelledby="adj-brightness-label"]').scrollIntoViewIfNeeded();
const box = await p.locator('[aria-labelledby="adj-brightness-label"]').boundingBox();
console.log(`thanh Độ sáng: x=${Math.round(box.x)} y=${Math.round(box.y)} w=${Math.round(box.width)}`);
const cdp = await ctx.newCDPSession(p); const y = box.y + box.height / 2;
const touch = (type, x) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchCancel" ? [] : [{ x, y, id: 1 }] });
await touch("touchStart", box.x + box.width * 0.5); await p.waitForTimeout(80);
for (const f of [0.6, 0.7, 0.8, 0.85]) { await touch("touchMove", box.x + box.width * f); await p.waitForTimeout(40); }
const lab1 = await p.locator("#adj-brightness-label").textContent();
await touch("touchCancel"); await p.waitForTimeout(400);
const r = { lab1, lab2: await p.locator("#adj-brightness-label").textContent(), undoOn: await p.getByRole("button", { name: "Hoàn tác" }).isEnabled() };
console.log(`nhãn khi kéo: ${r.lab1} → sau pointercancel: ${r.lab2}; Hoàn tác bật=${r.undoOn}`);
ok(r.lab1 !== "Độ sáng (0)" && r.lab1 === r.lab2 && r.undoOn === true, "TD-14 pointercancel ghi giá trị đang hiện vào bản nháp (Hoàn tác bật)");
await p.getByRole("button", { name: "Lưu", exact: true }).click();
let br;
for (let t = 0; t < 30 && br !== Number(r.lab2.match(/-?\d+/)?.[0]); t++) {
  await p.waitForTimeout(500);
  br = await p.evaluate(async () => { const id = location.pathname.split("/").pop(); const { getDocs } = await import("/src/lib/db.ts"); return getDocs().find((x) => x.id === id)?.pages[0]?.edit.brightness; });
}
ok(`Độ sáng (${br})` === r.lab2, `TD-14 Lưu ghi brightness=${br} khớp nhãn`);
ok(!errs.length, `không lỗi JS (${errs.join(" | ").slice(0, 200)})`);
await p.screenshot({ path: process.env.SHOT ?? "/dev/null", type: "jpeg", quality: 45 }).catch(() => {});
await b.close(); console.log(bad ? `TỔNG: ${bad} LỖI` : "TỔNG: ĐẠT"); process.exit(bad ? 1 : 0);
