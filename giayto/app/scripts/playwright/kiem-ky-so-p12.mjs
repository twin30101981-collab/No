// TD-33: ký số PDF bằng chứng thư .p12 THẬT (tạo bằng openssl: AES-256/PBES2 mới và 3DES "legacy", có chuỗi CA)
// qua giao diện Ký số ở /tools, tải PDF đã ký về; sau đó kiểm bằng pdfsig (poppler) ngoài app + "Kiểm tra chữ ký" trong app.
// Chạy: npx vite dev --host 127.0.0.1 --port 8081; rồi PDF=thu.pdf P12S="a.p12,b.p12" PW=... OUT=<thư mục> node kiem-ky-so-p12.mjs http://127.0.0.1:8081
import { chromium } from "playwright-core";
import fs from "node:fs";
const [BASE] = process.argv.slice(2);
const { PDF, P12S, PW, OUT } = process.env;
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
let bad = 0; const ok = (c, m) => { console.log(`${c ? "ĐẠT" : "LỖI"} ${m}`); if (!c) bad++; };
for (const p12 of P12S.split(",")) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, acceptDownloads: true });
  await ctx.addInitScript(() => { try { localStorage.setItem("ghi-nhanh-settings", JSON.stringify({ onboarded: true })); } catch {} });
  const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(BASE + "/tools", { waitUntil: "networkidle" });
  await p.getByText("Ký số", { exact: true }).first().click();
  await p.getByLabel("Chọn tệp PDF").setInputFiles(PDF);
  const tao = p12.startsWith("TAO:"); // "TAO:<họ tên>" = tạo chứng thư tự ký ngay trong app (tên có dấu)
  if (tao) {
    await p.getByLabel("Mật khẩu chứng thư").fill(PW);
    await p.getByLabel("Họ tên người ký").fill(p12.slice(4));
    const [d12] = await Promise.all([p.waitForEvent("download", { timeout: 60000 }), p.getByRole("button", { name: "Tạo chứng thư" }).click()]);
    await d12.saveAs(`${OUT}/app-tao-ui.p12`);
  } else {
    await p.getByLabel("Chọn tệp chứng thư").setInputFiles(p12);
    await p.getByLabel("Mật khẩu chứng thư").fill(PW);
  }
  const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 60000 }).catch(() => null), p.getByRole("button", { name: "Ký và tải về" }).click()]);
  await p.waitForTimeout(800);
  const toasts = await p.evaluate(() => [...document.querySelectorAll("[data-sonner-toast]")].map((t) => t.innerText.replace(/\s+/g, " ")).join(" | "));
  const name = tao ? "app-tao-ui" : p12.split("/").pop().replace(/\.p12$/, "");
  const outPdf = `${OUT}/da-ky-${name}.pdf`;
  if (dl) await dl.saveAs(outPdf);
  ok(!!dl && fs.existsSync(outPdf), `${name}: ký và tải về (${toasts.slice(0, 90)})`);
  if (process.env.TEN) ok(toasts.includes(`Đã ký số bởi ${process.env.TEN}`), `${name}: thông báo đúng tên người ký có dấu`);
  if (dl) {
    // Kiểm trong app: Kiểm tra chữ ký
    const [fc] = await Promise.all([p.waitForEvent("filechooser", { timeout: 15000 }), p.getByText("Kiểm tra chữ ký", { exact: true }).first().click()]);
    await fc.setFiles([outPdf]); await p.waitForTimeout(3500);
    const txt = await p.evaluate(() => document.body.innerText.replace(/\s+/g, " "));
    const m = txt.match(/(Chữ ký[^.]{0,140})/); console.log(`   app: ${m ? m[1] : txt.slice(0, 140)}`);
    if (process.env.TEN) ok(txt.includes(process.env.TEN) && /hợp lệ/.test(txt), `${name}: Kiểm tra chữ ký báo hợp lệ + đúng tên`);
  }
  ok(!errs.length, `${name}: không lỗi JS ${errs.join("|").slice(0, 120)}`);
  await ctx.close();
}
await b.close(); console.log(bad ? `TỔNG: ${bad} LỖI` : "TỔNG: ĐẠT"); process.exit(bad ? 1 : 0);
