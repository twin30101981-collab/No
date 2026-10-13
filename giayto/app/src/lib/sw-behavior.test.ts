import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

// HM-08: chạy public/sw.js trong sandbox Node với CacheStorage/fetch giả để kiểm hành vi cài đặt, dọn cache, ngoại tuyến.
type Handler = (e: Record<string, unknown>) => void;
function loadSw(opts: { url?: string; fetchImpl?: (u: string) => Promise<Response>; caches?: Map<string, Map<string, Response>> } = {}) {
  const store = opts.caches ?? new Map<string, Map<string, Response>>();
  const handlers: Record<string, Handler> = {};
  const key = (r: string | Request) => new URL(typeof r === "string" ? r : r.url, "https://app.test").pathname;
  const mkCache = (m: Map<string, Response>) => ({
    add: async (r: string) => { const res = await fetchImpl(r); if (!res.ok) throw new Error("bad " + res.status); m.set(key(r), res.clone()); },
    put: async (r: string | Request, res: Response) => { m.set(key(r), res); },
    match: async (r: string | Request) => m.get(key(r))?.clone(),
    keys: async () => [...m.keys()].map((k) => new Request("https://app.test" + k)),
  });
  const fetchImpl = opts.fetchImpl ?? (async () => new Response("ok"));
  const warn = vi.fn();
  const self = {
    location: new URL(opts.url ?? "https://app.test/sw.js?v=B1"),
    addEventListener: (t: string, h: Handler) => { handlers[t] = h; },
    clients: { claim: async () => {} }, skipWaiting: () => {},
  };
  const caches = {
    open: async (n: string) => { if (!store.has(n)) store.set(n, new Map()); return mkCache(store.get(n)!); },
    keys: async () => [...store.keys()], delete: async (n: string) => store.delete(n),
  };
  vm.runInNewContext(readFileSync("public/sw.js", "utf8"), { self, caches, fetch: fetchImpl, URL, Response, Request, console: { warn, log: () => {}, error: () => {} }, Promise });
  const run = async (type: string, extra: Record<string, unknown> = {}) => { let p: Promise<unknown> = Promise.resolve(); await new Promise<void>((ok) => { handlers[type]!({ waitUntil: (x: Promise<unknown>) => { p = x; }, respondWith: (x: Promise<Response>) => { p = x; }, ...extra }); ok(); }); return p; };
  return { store, run, warn };
}
const okAll = async () => new Response("ok");

describe("public/sw.js — cài đặt", () => {
  it("một tệp phụ lỗi không làm mất cả bộ precache; có ghi nhận cảnh báo", async () => {
    const sw = loadSw({ fetchImpl: async (u) => (String(u).includes("icon-512") ? new Response("", { status: 404 }) : new Response("ok")) });
    await sw.run("install");
    const shell = [...sw.store.get("gn-B1-shell")!.keys()];
    expect(shell).toContain("/"); expect(shell).toContain("/icon-192.png"); expect(shell).not.toContain("/icon-512.png");
    expect(sw.warn).toHaveBeenCalled();
  });
  it("thiếu trang chủ (bắt buộc) → cài đặt thất bại, không cài SW hỏng", async () => {
    const sw = loadSw({ fetchImpl: async (u) => (String(u) === "/" ? new Response("", { status: 500 }) : new Response("ok")) });
    await expect(sw.run("install")).rejects.toBeTruthy();
  });
});

describe("public/sw.js — phiên bản theo bản build", () => {
  it("tên bộ nhớ đệm lấy từ ?v= của địa chỉ SW", async () => {
    const sw = loadSw({ url: "https://app.test/sw.js?v=XYZ" });
    await sw.run("install");
    expect([...sw.store.keys()].some((k) => k === "gn-XYZ-shell")).toBe(true);
  });
  it("kích hoạt bản mới: xoá bộ đệm vỏ bản cũ nhưng GIỮ gói OCR và tệp chia sẻ", async () => {
    const caches = new Map<string, Map<string, Response>>([
      ["gn-B0-shell", new Map([["/old", new Response("o")]])],
      ["gn-ocr-v1", new Map([["/vie.traineddata", new Response("big")]])],
      ["gn-share", new Map([["/__share/1", new Response("f")]])],
    ]);
    const sw = loadSw({ url: "https://app.test/sw.js?v=B1", caches });
    await sw.run("activate");
    expect([...caches.keys()].sort()).toEqual(["gn-ocr-v1", "gn-share"]);
  });
  it("nâng cấp từ bản cũ: chuyển gói OCR từ gn-v6-ocr sang gn-ocr-v1 rồi mới xoá", async () => {
    const caches = new Map<string, Map<string, Response>>([
      ["gn-v6-shell", new Map()], ["gn-v6-ocr", new Map([["/vie.traineddata", new Response("big")]])],
    ]);
    const sw = loadSw({ caches });
    await sw.run("activate");
    expect([...caches.keys()]).toEqual(["gn-ocr-v1"]);
    expect([...caches.get("gn-ocr-v1")!.keys()]).toEqual(["/vie.traineddata"]);
  });
});

describe("public/sw.js — ngoại tuyến", () => {
  it("tệp /assets chưa có trong bộ đệm + mất mạng → trả lỗi mạng bình thường (không để respondWith(undefined))", async () => {
    const sw = loadSw({ fetchImpl: async () => { throw new TypeError("offline"); } });
    const res = await sw.run("fetch", { request: new Request("https://app.test/assets/x-abc.js") }) as Response | undefined;
    expect(res).toBeInstanceOf(Response);
  });
});
void okAll;

describe("public/sw.js — tiền tố phiên bản", () => {
  it("bản B1 không giữ nhầm bộ đệm của bản B10", async () => {
    const caches = new Map<string, Map<string, Response>>([["gn-B10-shell", new Map()], ["gn-B1-shell", new Map()]]);
    await loadSw({ url: "https://app.test/sw.js?v=B1", caches }).run("activate");
    expect([...caches.keys()]).toEqual(["gn-B1-shell"]);
  });
});
