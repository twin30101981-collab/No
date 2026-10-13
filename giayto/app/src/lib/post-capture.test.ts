import { describe, expect, it } from "vitest";
import { planPostCapture } from "./post-capture";

const pg = (id: string, text?: string) => ({ id, text }) as never;
const on = { autoOcr: true, autoName: true };

describe("planPostCapture (P8)", () => {
  it("tài liệu mới: nhận chữ mọi trang chưa có chữ + đặt tên", () => {
    const r = planPostCapture({ pages: [pg("a"), pg("b", "có chữ")] }, new Set(), true, on, true);
    expect(r).toEqual({ ocrPageIds: ["a"], autoName: true });
  });
  it("thêm trang vào tài liệu cũ: chỉ trang mới, không đổi tên", () => {
    const r = planPostCapture({ pages: [pg("a"), pg("b")] }, new Set(["a"]), false, on, true);
    expect(r).toEqual({ ocrPageIds: ["b"], autoName: false });
  });
  it("ngoại tuyến không đặt tên nhưng vẫn nhận chữ; tắt cài đặt thì bỏ", () => {
    expect(planPostCapture({ pages: [pg("a")] }, new Set(), true, on, false)).toEqual({ ocrPageIds: ["a"], autoName: false });
    expect(planPostCapture({ pages: [pg("a")] }, new Set(), true, { autoOcr: false, autoName: false }, true)).toEqual({ ocrPageIds: [], autoName: false });
  });
  it("tài liệu khoá: không làm gì", () => {
    expect(planPostCapture({ pages: [pg("a")], locked: true } as never, new Set(), true, on, true)).toEqual({ ocrPageIds: [], autoName: false });
  });
});

describe("bgOcrFailure (TD-32)", () => {
  it("đếm lỗi thật, bỏ qua hủy; không lỗi thì null", async () => {
    const { bgOcrFailure } = await import("./post-capture");
    const { CancelledError } = await import("./ocr-queue");
    const boom = new Error("không tải được gói");
    expect(await bgOcrFailure([{ status: "fulfilled", value: "a" }, { status: "rejected", reason: new CancelledError() }])).toBeNull();
    expect(await bgOcrFailure([{ status: "rejected", reason: boom }, { status: "rejected", reason: boom }, { status: "fulfilled", value: "a" }])).toEqual({ count: 2, error: boom });
  });
});
