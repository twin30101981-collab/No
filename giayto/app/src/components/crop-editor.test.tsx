import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// R1.5 (TD-05/TD-06): màn Cắt tô mờ vùng sắp bị cắt + cảnh báo cam khi chữ vắt mép.
// Mock các phần nặng (dò mép, AI, OCR) để tập trung vào lớp hiển thị.
const mocks = vi.hoisted(() => ({
  ocrMock: vi.fn(async () => ({ words: [] as { text: string; conf: number; x0: number; y0: number; x1: number; y1: number }[], size: { w: 1000, h: 1000 } })),
}));
vi.mock("@/lib/ocr", () => ({ recognizeWordBoxes: mocks.ocrMock }));
vi.mock("@/lib/image", () => ({
  compress: vi.fn(async () => "data:,"),
  detectQuadInfo: vi.fn(async () => null),
  refineQuadOnSrc: vi.fn(async (s: unknown, q: unknown) => q),
}));
vi.mock("@/lib/ai.functions", () => ({ aiPaperCorners: vi.fn() }));
vi.mock("@/lib/ai-queue", () => ({ useQueuedServerFn: () => vi.fn(async () => null) }));

import { CropEditor } from "./crop-editor";

const QUAD: [[number, number], [number, number], [number, number], [number, number]] = [[0.04, 0.04], [0.96, 0.04], [0.96, 0.96], [0.04, 0.96]];

afterEach(cleanup);

describe("CropEditor R1.5", () => {
  it("tô mờ vùng ngoài khung cắt (lớp dim evenodd)", () => {
    const { container } = render(<CropEditor src="data:," quad={QUAD} onClose={() => {}} onApply={() => {}} />);
    const dim = container.querySelector("[data-crop-dim]");
    expect(dim).toBeTruthy();
    // lớp dim phủ toàn ảnh rồi khoét lỗ theo khung cắt (path evenodd)
    expect(dim!.getAttribute("d")).toContain("M0,0 H100 V100 H0 Z");
    expect(dim!.getAttribute("d")).toContain("M4,4 L96,4 L96,96 L4,96 Z");
  });

  it("không cảnh báo khi chữ nằm gọn trong khung", async () => {
    mocks.ocrMock.mockResolvedValueOnce({ words: [{ text: "hoá", conf: 90, x0: 400, y0: 400, x1: 500, y1: 430 }], size: { w: 1000, h: 1000 } });
    render(<CropEditor src="data:," quad={QUAD} onClose={() => {}} onApply={() => {}} />);
    await waitFor(() => expect(mocks.ocrMock).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });

  it("cảnh báo cam + tô đỏ từ vắt mép phải khung cắt", async () => {
    mocks.ocrMock.mockResolvedValueOnce({ words: [{ text: "đơn", conf: 90, x0: 940, y0: 400, x1: 990, y1: 430 }], size: { w: 1000, h: 1000 } });
    const { container } = render(<CropEditor src="data:," quad={QUAD} onClose={() => {}} onApply={() => {}} />);
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("1 từ"));
    expect(container.querySelectorAll("[data-cut]").length).toBe(1);
  });
});
