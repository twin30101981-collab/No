// BL-00 (GG-01…GG-08): đăng nhập Google khi bộ trung gian OAuth trả về TRANG CHỦ kèm mã phiên.
// Không cần tài khoản Google thật: Supabase GIẢ (cổng 54398) + chặn /~oauth/initiate rồi chuyển về /#access_token=…
// Chuẩn bị:  VITE_SUPABASE_URL=http://127.0.0.1:54398 VITE_SUPABASE_PUBLISHABLE_KEY=test-key npx vite dev --port 8082 --host 127.0.0.1
// Chạy:      node scripts/playwright/kiem-dang-nhap-google.mjs http://127.0.0.1:8082   (playwright-core cài ở thư mục riêng, NODE_PATH trỏ tới đó)
// Mã thoát 0 = đạt hết; khác 0 = có ca lỗi (chạy trên mã cũ P19 thì GG-01/GG-07/GG-03 phải LỖI = tái hiện được).
import http from "node:http";
import { chromium } from "playwright-core";

const BASE = process.argv[2] || "http://127.0.0.1:8082";
const MOCK_PORT = 54398;
const EMAIL = "nguoi.dung@example.com";
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = () => `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: "00000000-0000-4000-8000-0000000000aa", email: EMAIL, aud: "authenticated", role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`;
const USER = { id: "00000000-0000-4000-8000-0000000000aa", aud: "authenticated", role: "authenticated", email: EMAIL, app_metadata: { provider: "google" }, user_metadata: {}, created_at: "2026-10-13T00:00:00Z" };
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };

const hits = [];
const mock = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x"); hits.push(`${req.method} ${u.pathname}`);
  if (req.method === "OPTIONS") { res.writeHead(204, CORS); return res.end(); }
  const json = (code, body) => { res.writeHead(code, { ...CORS, "content-type": "application/json" }); res.end(JSON.stringify(body)); };
  if (u.pathname === "/auth/v1/user") return json(200, USER);
  if (u.pathname === "/auth/v1/token") return json(200, { access_token: jwt(), refresh_token: "r2", token_type: "bearer", expires_in: 3600, user: USER });
  if (u.pathname === "/auth/v1/logout") return json(204, {});
  return json(200, []);
}).listen(MOCK_PORT, "127.0.0.1");

const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
let bad = 0;
const chk = (n, ok, extra = "") => { console.log(`${ok ? "ĐẠT" : "LỖI"}  ${n}${extra ? "  " + extra : ""}`); if (!ok) bad++; };
const errs = [];

async function ctx(ua) {
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, ...(ua ? { userAgent: ua } : {}) });
  await c.addInitScript(() => { try { localStorage.setItem("ghi-nhanh-settings", JSON.stringify({ onboarded: true })); } catch {} });
  return c;
}
const watch = (p, tag) => { p.on("pageerror", (e) => errs.push(`${tag}: ${e.message.slice(0, 140)}`)); };
const bodyText = (p) => p.evaluate(() => document.body.innerText);

// 1) GG-01: bộ trung gian trả về /#access_token → phải thành đăng nhập, tự sang /me, URL sạch, tải lại vẫn đăng nhập
{
  const c = await ctx(); const p = await c.newPage(); watch(p, "gg01");
  await c.route("**/~oauth/initiate**", (r) => r.fulfill({ status: 302, headers: { location: `/#access_token=${jwt()}&refresh_token=r1&expires_in=3600&token_type=bearer` } }));
  await p.goto(BASE + "/auth", { waitUntil: "networkidle" });
  await p.getByRole("button", { name: /Tiếp tục với Google/ }).click();
  const okMe = await p.waitForURL(/\/me(\?|#|$)/, { timeout: 15000 }).then(() => true, () => false);
  chk("GG-01 sau khi quay về trang chủ → tự sang /me", okMe, `url=${p.url()}`);
  await p.waitForTimeout(800);
  chk("GG-01 màn Tôi hiện email đã đăng nhập", (await bodyText(p)).includes(EMAIL));
  chk("GG-01 URL không còn mã phiên", !/access_token|refresh_token/.test(p.url()), p.url());
  await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(800);
  chk("GG-01 tải lại vẫn đăng nhập", (await bodyText(p)).includes(EMAIL));
  await c.close();
}

// 2) GG-01 biến thể: người dùng ở trang chủ (không phải /auth) — mã phiên vẫn được nhận, không mất khi đổi màn
{
  const c = await ctx(); const p = await c.newPage(); watch(p, "gg01b");
  await p.goto(BASE + `/#access_token=${jwt()}&refresh_token=r1&expires_in=3600&token_type=bearer`, { waitUntil: "networkidle" });
  await p.waitForTimeout(2500);
  await p.goto(BASE + "/me", { waitUntil: "networkidle" }).catch(() => {}); await p.waitForTimeout(800);
  chk("GG-01b vào thẳng /#access_token rồi mở Tôi → đã đăng nhập", (await bodyText(p)).includes(EMAIL), `url=${p.url()}`);
  await c.close();
}

// 3) GG-07: bộ trung gian trả lỗi trên URL → thông báo tiếng Việt, URL sạch, không treo
{
  const c = await ctx(); const p = await c.newPage(); watch(p, "gg07");
  await p.goto(BASE + "/?error=access_denied&error_description=User+cancelled", { waitUntil: "networkidle" });
  const toast = await p.locator("[data-sonner-toast]").filter({ hasText: /chưa hoàn tất/ }).first().innerText({ timeout: 6000 }).catch(() => "");
  chk("GG-07 hiện toast lỗi tiếng Việt (không phải tiếng Anh thô)", /chưa hoàn tất/.test(toast) && !/access_denied|User cancelled/i.test(toast), toast.replace(/\n/g, " ").slice(0, 100));
  chk("GG-07 URL không còn error=", !/error=/.test(p.url()), p.url());
  await c.close();
}

// 4) GG-03: trình duyệt nhúng (Zalo/Facebook) → nút Google mờ + hướng dẫn mở bằng Chrome/Safari + sao chép liên kết
{
  const ZALO = "Mozilla/5.0 (Linux; Android 13; SM-A536E) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/118.0.0.0 Mobile Safari/537.36 Zalo/22.1";
  const c = await ctx(ZALO); const p = await c.newPage(); watch(p, "gg03");
  await p.goto(BASE + "/auth", { waitUntil: "networkidle" });
  const g = p.getByRole("button", { name: /Tiếp tục với Google/ });
  chk("GG-03 nút Google bị khoá trong Zalo", await g.isDisabled().catch(() => false));
  const t = await bodyText(p);
  chk("GG-03 có hướng dẫn mở bằng Chrome/Safari", /Chrome|Safari/.test(t) && /Zalo/.test(t));
  chk("GG-03 có nút sao chép liên kết", (await p.getByRole("button", { name: /Sao chép liên kết/ }).count()) > 0);
  // Chrome thường vẫn dùng được
  const c2 = await ctx(); const p2 = await c2.newPage(); await p2.goto(BASE + "/auth", { waitUntil: "networkidle" });
  chk("GG-03 Chrome thường: nút Google dùng được", await p2.getByRole("button", { name: /Tiếp tục với Google/ }).isEnabled());
  await c.close(); await c2.close();
}

chk("không có pageerror", errs.length === 0, errs.slice(0, 3).join(" | "));
await b.close(); mock.close();
console.log(bad === 0 ? "TẤT CẢ ĐẠT" : `${bad} ca lỗi`);
process.exit(bad === 0 ? 0 : 1);
