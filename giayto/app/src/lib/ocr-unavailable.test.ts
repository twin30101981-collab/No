import { describe, expect, it, vi } from "vitest";
import { assertOcrReachable, OcrUnavailableError, ocrWorkerUrl } from "./ocr-worker";
import { CancelledError, firstOcrFailure } from "./ocr-queue";
import { friendlyError } from "./errors";

// HM-07: mất mạng/CDN bị chặn lần đầu → báo rõ, không im lặng, không worker lỗi chưa bắt.
describe("assertOcrReachable", () => {
  it("URL worker theo đúng phiên bản tesseract.js đang dùng", () => {
    expect(ocrWorkerUrl("7.0.0")).toBe("https://cdn.jsdelivr.net/npm/tesseract.js@v7.0.0/dist/worker.min.js");
  });
  it("tải được → qua; không tải được → OcrUnavailableError", async () => {
    const ok = vi.fn().mockResolvedValue(new Response("", { status: 200 }));
    await expect(assertOcrReachable(ok, "u")).resolves.toBeUndefined();
    expect(ok).toHaveBeenCalledWith("u", { mode: "no-cors" });
    const bad = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(assertOcrReachable(bad, "u")).rejects.toBeInstanceOf(OcrUnavailableError);
  });
});

describe("firstOcrFailure", () => {
  const rej = (reason: unknown): PromiseRejectedResult => ({ status: "rejected", reason });
  const ok: PromiseFulfilledResult<string> = { status: "fulfilled", value: "x" };
  it("TẤT CẢ trang thất bại vẫn trả lỗi (trước đây bị bỏ qua im lặng)", () => {
    const e = new OcrUnavailableError();
    expect(firstOcrFailure([rej(e), rej(e)])).toBe(e);
  });
  it("có trang thành công, trang khác lỗi → vẫn báo lỗi", () => {
    const e = new Error("x"); expect(firstOcrFailure([ok, rej(e)])).toBe(e);
  });
  it("bỏ qua hủy; không lỗi → undefined", () => {
    expect(firstOcrFailure([rej(new CancelledError())])).toBeUndefined();
    expect(firstOcrFailure([ok])).toBeUndefined();
  });
});

describe("friendlyError cho nhận chữ", () => {
  it("OcrUnavailableError và lỗi importScripts thô đều chỉ cách khắc phục", () => {
    for (const e of [new OcrUnavailableError(), "Failed to execute 'importScripts' on 'WorkerGlobalScope': The script at 'https://cdn.jsdelivr.net/x' failed to load."]) {
      const f = friendlyError(e);
      expect(f.title).toMatch(/gói nhận chữ/); expect(f.hint).toMatch(/Tải sẵn/);
    }
  });
});
