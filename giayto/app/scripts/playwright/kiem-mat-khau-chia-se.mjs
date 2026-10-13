// TD-34: kiểm giới hạn số lần nhập SAI mật khẩu liên kết chia sẻ (/s/<mã>) trên bản build chạy wrangler + Supabase GIẢ.
// Chạy: node mock-supabase.mjs (PORT=54399); wrangler dev -c <.output>/server/wrangler.json --port 4192 --ip 127.0.0.1
//   --var SUPABASE_URL:http://127.0.0.1:54399 SUPABASE_SERVICE_ROLE_KEY:sb_secret_fake ; rồi node kiem-mat-khau-chia-se.mjs http://127.0.0.1:4192
import { chromium } from "playwright-core";
const [BASE] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
let bad = 0; const ok = (c, m) => { console.log(`${c ? "ĐẠT" : "LỖI"} ${m}`); if (!c) bad++; };
await p.goto(BASE + "/s/AAAAAAAAAAAAAAAAAAAAAA", { waitUntil: "networkidle" });
ok(await p.getByText("Nhập mật khẩu để xem tài liệu.").isVisible(), "liên kết có mật khẩu hỏi mật khẩu");
const tryPw = async (pw) => {
  await p.getByPlaceholder("Mật khẩu").fill(pw); await p.getByRole("button", { name: "Mở" }).click();
  await p.waitForFunction(() => !document.querySelector("form button svg.animate-spin"), null, { timeout: 20000 }); await p.waitForTimeout(300);
  return (await p.locator("main p").first().textContent())?.trim();
};
const msgs = [];
for (let i = 1; i <= 11; i++) msgs.push(await tryPw("sai-" + i));
console.log(msgs.map((m, i) => `${i + 1}: ${m}`).join("\n"));
ok(msgs.slice(0, 10).every((m) => m === "Sai mật khẩu, thử lại."), "10 lần sai đầu: báo sai mật khẩu");
ok(/Thử sai quá nhiều lần/.test(msgs[10] ?? ""), "lần thứ 11: bị chặn, báo chờ");
const right = await tryPw("dung-mk-1");
ok(/Thử sai quá nhiều lần/.test(right ?? ""), "đang bị chặn thì mật khẩu đúng cũng phải chờ (không lộ đúng/sai)");
await b.close(); console.log(bad ? `TỔNG: ${bad} LỖI` : "TỔNG: ĐẠT"); process.exit(bad ? 1 : 0);
