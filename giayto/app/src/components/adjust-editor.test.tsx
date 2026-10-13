import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { newPage, type Page } from "@/lib/db";

// TD-03: kiểm thử giao diện màn Chỉnh tay. Mock các phần nặng (dựng ảnh, OCR,
// CropEditor, hộp thoại xác nhận) để tập trung vào hành vi Hủy/Lưu/Hoàn tác.
const mocks = vi.hoisted(() => ({
  renderPreviewMock: vi.fn(async () => "preview://mock"),
  renderPageMock: vi.fn(async () => "full://mock"),
  confirmMock: vi.fn(async () => true),
}));
const { renderPreviewMock, renderPageMock, confirmMock } = mocks;
vi.mock("@/lib/image", () => ({
  renderPreview: mocks.renderPreviewMock,
  renderPage: mocks.renderPageMock,
}));

vi.mock("@/lib/dialog", () => ({
  confirmDialog: mocks.confirmMock,
}));

vi.mock("@/components/crop-editor", () => ({
  CropEditor: () => null,
}));

vi.mock("@/lib/ocr", () => ({
  recognizeWordBoxes: vi.fn(async () => ({ words: [], size: { w: 1, h: 1 } })),
}));

// TD-23: AdjustEditor dùng useBlocker để chặn rời màn khi có nháp — kiểm thử
// thành phần không có router nên giả lập ở mức props.
const blockerState = vi.hoisted(() => ({ status: "idle" as "idle" | "blocked", proceed: vi.fn(), reset: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({
  useBlocker: () => blockerState,
}));

// Giả lập Slider ở mức props để kiểm đúng ràng buộc: kéo (onValueChange) chỉ đổi
// nhãn tạm, thả tay (onValueCommit) mới ghi lịch sử — không phụ thuộc nội bộ Radix/jsdom.
type SliderProps = { min: number; max: number; step: number; value: number[]; onValueChange: (v: number[]) => void; onValueCommit: (v: number[]) => void; onPointerCancel?: () => void };
const sliderProps: SliderProps[] = [];
vi.mock("@/components/ui/slider", () => ({
  Slider: (p: SliderProps) => {
    sliderProps.push(p);
    return <div data-testid="slider-mock" />;
  },
}));

import { AdjustEditor } from "@/components/adjust-editor";

function makePage(edit?: Partial<Page["edit"]>): Page {
  return newPage("orig://a4", "src://a4", edit);
}

beforeEach(() => {
  sliderProps.length = 0;
  // ZoomView đo khung bằng ResizeObserver — jsdom không có sẵn.
  class RO {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(window, "ResizeObserver", { writable: true, value: RO });
  Object.defineProperty(globalThis, "ResizeObserver", { writable: true, value: RO });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AdjustEditor (TD-03)", () => {
  it("Hủy khi chưa thay đổi: đóng thẳng, không hỏi xác nhận", () => {
    const onClose = vi.fn();
    render(<AdjustEditor page={makePage()} onClose={onClose} onApply={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Hủy/ }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(confirmMock).not.toHaveBeenCalled();
  });

  it("Hủy khi đã thay đổi: hỏi xác nhận; đồng ý thì đóng, từ chối thì ở lại", async () => {
    const onClose = vi.fn();
    render(<AdjustEditor page={makePage()} onClose={onClose} onApply={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Xoay 90°/ }));

    confirmMock.mockResolvedValueOnce(false);
    fireEvent.click(screen.getByRole("button", { name: /Hủy/ }));
    await waitFor(() => expect(confirmMock).toHaveBeenCalledTimes(1));
    expect(onClose).not.toHaveBeenCalled();

    confirmMock.mockResolvedValueOnce(true);
    fireEvent.click(screen.getByRole("button", { name: /Hủy/ }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("Lưu khi chưa thay đổi: KHÔNG gọi onApply, chỉ đóng", () => {
    const onClose = vi.fn();
    const onApply = vi.fn();
    render(<AdjustEditor page={makePage()} onClose={onClose} onApply={onApply} />);
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    expect(onApply).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Lưu khi đã thay đổi: gọi onApply đúng 1 lần với bản nháp", () => {
    const onApply = vi.fn();
    const onClose = vi.fn();
    render(<AdjustEditor page={makePage()} onClose={onClose} onApply={onApply} />);
    fireEvent.click(screen.getByRole("button", { name: /Xoay 90°/ }));
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply.mock.calls[0]![0]).toMatchObject({ rotation: 90 });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("Hoàn tác/Làm lại/Đặt lại bật-tắt đúng theo lịch sử", () => {
    render(<AdjustEditor page={makePage()} onClose={vi.fn()} onApply={vi.fn()} />);
    const undoBtn = screen.getByRole("button", { name: "Hoàn tác" });
    const redoBtn = screen.getByRole("button", { name: "Làm lại" });
    const resetBtn = screen.getByRole("button", { name: "Đặt lại" });
    expect(undoBtn).toBeDisabled();
    expect(redoBtn).toBeDisabled();
    expect(resetBtn).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /Xoay 90°/ }));
    expect(undoBtn).toBeEnabled();
    expect(resetBtn).toBeEnabled();
    expect(redoBtn).toBeDisabled();

    fireEvent.click(undoBtn);
    expect(undoBtn).toBeDisabled();
    expect(redoBtn).toBeEnabled();

    fireEvent.click(redoBtn);
    expect(redoBtn).toBeDisabled();
    expect(undoBtn).toBeEnabled();

    fireEvent.click(resetBtn);
    expect(undoBtn).toBeEnabled();
    expect(resetBtn).toBeDisabled();
  });

  it("Thanh trượt chỉ ghi lịch sử khi thả tay", () => {
    const onApply = vi.fn();
    render(<AdjustEditor page={makePage()} onClose={vi.fn()} onApply={onApply} />);
    const brightness = sliderProps[0]!;
    expect(brightness.min).toBe(-80);
    expect(brightness.max).toBe(80);
    // Kéo (chưa thả): nhãn đổi ngay nhưng lịch sử chưa ghi → Hoàn tác vẫn tắt.
    act(() => brightness.onValueChange([40]));
    expect(screen.getByText("Độ sáng (40)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hoàn tác" })).toBeDisabled();
    // Thả tay: ghi đúng 1 mục lịch sử → Hoàn tác bật, Lưu gửi brightness mới.
    act(() => brightness.onValueCommit([40]));
    expect(screen.getByRole("button", { name: "Hoàn tác" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply.mock.calls[0]![0]).toMatchObject({ brightness: 40 });
  });

  it("Kéo bị hủy giữa chừng (pointercancel) vẫn ghi giá trị đang hiện (TD-14)", () => {
    const onApply = vi.fn();
    render(<AdjustEditor page={makePage()} onClose={vi.fn()} onApply={onApply} />);
    act(() => sliderProps[0]!.onValueChange([40]));
    act(() => sliderProps.at(-3)!.onPointerCancel?.());
    expect(screen.getByText("Độ sáng (40)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hoàn tác" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    expect(onApply.mock.calls[0]![0]).toMatchObject({ brightness: 40 });
  });

  it("Nút bật-tắt So sánh/Xem chữ nhỏ có aria-pressed (TD-24)", () => {
    render(<AdjustEditor page={makePage()} onClose={vi.fn()} onApply={vi.fn()} />);
    expect(screen.getByRole("button", { name: "So sánh" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Xem chữ nhỏ" })).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(screen.getByRole("button", { name: "Xem chữ nhỏ" }));
    expect(screen.getByRole("button", { name: "Xem chữ nhỏ" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "So sánh" })).toHaveAttribute("aria-pressed", "false");
  });

  it("Bị chặn rời màn khi có nháp: hỏi xác nhận, đồng ý thì proceed, từ chối thì reset (TD-23)", async () => {
    render(<AdjustEditor page={makePage()} onClose={vi.fn()} onApply={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Xoay 90°/ }));

    blockerState.status = "blocked";
    confirmMock.mockResolvedValueOnce(false);
    fireEvent.click(screen.getByRole("button", { name: "Xem chữ nhỏ" })); // kích render lại để effect chạy
    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    await waitFor(() => expect(blockerState.reset).toHaveBeenCalledTimes(1));
    expect(blockerState.proceed).not.toHaveBeenCalled();

    // Lần chặn thứ hai: đưa trạng thái về idle rồi blocked lại để effect chạy lần nữa.
    blockerState.status = "idle";
    fireEvent.click(screen.getByRole("button", { name: "So sánh" }));
    blockerState.status = "blocked";
    confirmMock.mockResolvedValueOnce(true);
    fireEvent.click(screen.getByRole("button", { name: "Xem chữ nhỏ" }));
    await waitFor(() => expect(blockerState.proceed).toHaveBeenCalledTimes(1));
    blockerState.status = "idle";
  });
});
