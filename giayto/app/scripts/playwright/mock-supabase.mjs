// Máy chủ Supabase GIẢ cho kiểm TD-34: trả 1 liên kết có mật khẩu "dung-mk-1".
import http from "node:http";
const PORT = Number(process.env.PORT || 54399);
const hex = (b) => Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, "0")).join("");
const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await crypto.subtle.importKey("raw", new TextEncoder().encode("dung-mk-1"), "PBKDF2", false, ["deriveBits"]);
const hash = `pbkdf2$100000$${hex(salt)}$${hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000 }, key, 256))}`;
let n = 0;
http.createServer((req, res) => {
  const u = new URL(req.url, "http://x"); n++;
  const one = (req.headers.accept || "").includes("vnd.pgrst.object");
  let body = null;
  if (u.pathname === "/rest/v1/share_links") body = { document_id: "00000000-0000-4000-8000-000000000001", expires_at: null, revoked_at: null, password_hash: hash };
  else if (u.pathname === "/rest/v1/documents") body = { name: "Tài liệu thử TD-34", deleted_at: null };
  else if (u.pathname === "/rest/v1/pages") body = [];
  console.log(`[mock] ${req.method} ${u.pathname}`);
  res.writeHead(body ? 200 : 404, { "content-type": one ? "application/vnd.pgrst.object+json" : "application/json" });
  res.end(JSON.stringify(body ?? { message: "not found" }));
}).listen(PORT, "127.0.0.1", () => console.log("mock supabase", PORT));
