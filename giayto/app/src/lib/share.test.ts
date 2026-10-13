import { afterEach, describe, expect, it, vi } from "vitest";
const toast = vi.hoisted(() => Object.assign(vi.fn(), { info: vi.fn(), error: vi.fn(), success: vi.fn() }));
vi.mock("sonner", () => ({ toast }));
import { canShareThisFile, classifyShareError, shareOrSave, tryShare } from "./share";

const err = (name: string) => Object.assign(new Error(name), { name });
const blob = () => new Blob(["x"], { type: "application/pdf" });
const setNav = (share?: unknown, canShare?: unknown) => { Object.defineProperty(navigator, "share", { configurable: true, value: share }); Object.defineProperty(navigator, "canShare", { configurable: true, value: canShare }); };
afterEach(() => { vi.clearAllMocks(); setNav(undefined, undefined); });

describe("TF-01 phân loại lỗi chia sẻ", () => {
  it("AbortError = huỷ; NotAllowedError = hết quyền chạm; còn lại = lỗi", () => {
    expect(classifyShareError(err("AbortError"))).toBe("cancelled");
    expect(classifyShareError(err("NotAllowedError"))).toBe("needs-tap");
    expect(classifyShareError(new TypeError("x"))).toBe("failed");
    expect(classifyShareError(null)).toBe("failed");
  });
});
describe("TF-01 chia sẻ hoặc lưu — không im lặng", () => {
  const save = vi.fn();
  it("canShare false → unsupported, kiểm đúng tệp", () => {
    const cs = vi.fn(() => false); setNav(vi.fn(), cs);
    expect(canShareThisFile(new File(["x"], "a.zip"))).toBe(false); expect(cs).toHaveBeenCalledWith({ files: [expect.any(File)] });
  });
  it("shared → không lưu, không báo", async () => {
    setNav(vi.fn().mockResolvedValue(undefined), () => true);
    expect(await shareOrSave(blob(), "a.pdf", save)).toBe("shared"); expect(save).not.toHaveBeenCalled(); expect(toast).not.toHaveBeenCalled();
  });
  it("AbortError → cancelled, không lưu, không báo", async () => {
    setNav(vi.fn().mockRejectedValue(err("AbortError")), () => true);
    expect(await shareOrSave(blob(), "a.pdf", save)).toBe("cancelled"); expect(save).not.toHaveBeenCalled(); expect(toast.error).not.toHaveBeenCalled();
  });
  it("NotAllowedError → hiện thẻ chạm lần 2 (chưa lưu); chạm 'Chia sẻ' gọi share lại", async () => {
    const share = vi.fn().mockRejectedValueOnce(err("NotAllowedError")).mockResolvedValue(undefined); setNav(share, () => true);
    expect(await shareOrSave(blob(), "a.pdf", save)).toBe("needs-tap");
    expect(save).not.toHaveBeenCalled();
    const opts = toast.mock.calls[0]![1] as { action: { onClick: () => void }; cancel: { onClick: () => void } };
    opts.action.onClick(); await vi.waitFor(() => expect(share).toHaveBeenCalledTimes(2)); expect(save).not.toHaveBeenCalled();
  });
  it("thẻ chạm lần 2: share lại vẫn lỗi → lưu về máy + báo; 'Lưu về máy' lưu ngay", async () => {
    const share = vi.fn().mockRejectedValue(err("NotAllowedError")); setNav(share, () => true);
    await shareOrSave(blob(), "a.pdf", save);
    const opts = toast.mock.calls[0]![1] as { action: { onClick: () => void }; cancel: { onClick: () => void } };
    opts.action.onClick(); await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(1)); expect(toast.info).toHaveBeenCalled();
    opts.cancel.onClick(); expect(save).toHaveBeenCalledTimes(2);
  });
  it("lỗi khác → lưu + toast lỗi; không hỗ trợ loại tệp → lưu + toast; không có API → lưu + 'Đã lưu'", async () => {
    setNav(vi.fn().mockRejectedValue(new TypeError("x")), () => true);
    expect(await shareOrSave(blob(), "a.pdf", save)).toBe("downloaded"); expect(save).toHaveBeenCalledTimes(1); expect(toast.error).toHaveBeenCalled();
    setNav(vi.fn(), () => false); await shareOrSave(blob(), "a.zip", save);
    expect(toast.info).toHaveBeenLastCalledWith(expect.stringMatching(/không chia sẻ được loại tệp/)); expect(save).toHaveBeenCalledTimes(2);
    setNav(undefined, undefined); await shareOrSave(blob(), "a.pdf", save);
    expect(toast.info).toHaveBeenLastCalledWith(expect.stringMatching(/Đã lưu/)); expect(save).toHaveBeenCalledTimes(3);
  });
  it("tryShare không gọi share khi không hỗ trợ", async () => {
    const share = vi.fn(); setNav(share, () => false);
    expect(await tryShare(new File(["x"], "a.pdf"))).toBe("unsupported"); expect(share).not.toHaveBeenCalled();
  });
});
