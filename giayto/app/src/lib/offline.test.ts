import { describe, expect, it } from "vitest";
import { shellAssetUrls, swAllowed } from "./offline";

describe("swAllowed", () => {
  it("bật ở bản xuất bản", () => {
    expect(swAllowed({ hostname: "ghi-nhanh.lovable.app" }, false, true)).toBe(true);
  });
  it("tắt trong khung xem trước, bản dev và localhost", () => {
    expect(swAllowed({ hostname: "ghi-nhanh.lovable.app" }, true, true)).toBe(false);
    expect(swAllowed({ hostname: "id-preview--abc.lovable.app" }, false, true)).toBe(false);
    expect(swAllowed({ hostname: "localhost" }, false, true)).toBe(false);
    expect(swAllowed({ hostname: "ghi-nhanh.lovable.app" }, false, false)).toBe(false);
  });
  it("?sw=on ép bật ở localhost nhưng không vượt qua khung nhúng hay bản dev", () => {
    expect(swAllowed({ hostname: "localhost", search: "?sw=on" }, false, true)).toBe(true);
    expect(swAllowed({ hostname: "localhost", search: "?sw=on" }, true, true)).toBe(false);
    expect(swAllowed({ hostname: "localhost", search: "?sw=on" }, false, false)).toBe(false);
  });
  it("?sw=off luôn tắt", () => {
    expect(swAllowed({ hostname: "ghi-nhanh.lovable.app", search: "?sw=off" }, false, true)).toBe(false);
  });
});

import { watchUpdates } from "./offline";
describe("watchUpdates", () => {
  const mk = (waiting: unknown, controller: unknown) => {
    const msgs: unknown[] = [];
    const w = waiting ? { postMessage: (m: unknown) => msgs.push(m) } : null;
    const reg = { waiting: w, installing: null, update: async () => undefined, addEventListener: () => {} } as never;
    const sw = { controller, addEventListener: () => {} } as never;
    return { reg, sw, msgs };
  };
  it("có bản chờ thì mời cập nhật, bấm gửi skip-waiting", () => {
    const { reg, sw, msgs } = mk(true, {});
    let apply: (() => void) | null = null;
    const stop = watchUpdates(reg, sw, (a) => { apply = a; });
    expect(apply).not.toBeNull();
    apply!();
    expect(msgs).toEqual(["skip-waiting"]);
    stop?.();
  });
  it("lần cài đầu không báo bản mới", () => {
    const { reg, sw } = mk(true, null);
    let called = false;
    watchUpdates(reg, sw, () => { called = true; });
    expect(called).toBe(false);
  });
});

import { offlineOcrReady, prepareOfflineShell } from "./offline";
describe("B13 — mở khi mất mạng", () => {
  it("prepareOfflineShell tải trước các trang chính", async () => {
    const got: string[] = [];
    await prepareOfflineShell(["/", "/scan"], async (u) => { got.push(String(u)); return { ok: true } as Response; });
    expect(got).toEqual(["/", "/scan"]);
  });
  it("prepareOfflineShell báo lỗi khi một trang không tải được", async () => {
    await expect(prepareOfflineShell(["/"], async () => ({ ok: false, status: 500 } as Response))).rejects.toThrow("/");
  });
  it("offlineOcrReady chỉ đúng khi đủ ngôn ngữ + vỏ app", () => {
    localStorage.clear();
    expect(offlineOcrReady("vie")).toBe(false);
    localStorage.setItem("ghi-nhanh-offline-ocr", "vie");
    expect(offlineOcrReady("vie")).toBe(false); // bản cũ thiếu vỏ app
    localStorage.setItem("ghi-nhanh-offline-ocr", "vie|shell");
    expect(offlineOcrReady("vie")).toBe(true);
    expect(offlineOcrReady("eng")).toBe(false);
  });
});

describe("shellAssetUrls", () => {
  it("chỉ lấy tệp /assets/ và /fonts/ cùng nguồn, bỏ trùng", () => {
    const o = "https://a.app";
    expect(shellAssetUrls([
      "https://a.app/assets/react-1.js", "https://a.app/assets/react-1.js", "https://a.app/fonts/DejaVuSans.ttf",
      "https://cdn.x.com/assets/y.js", "https://a.app/api/x", "https://a.app/",
    ], o)).toEqual(["/assets/react-1.js", "/fonts/DejaVuSans.ttf"]);
  });
});
