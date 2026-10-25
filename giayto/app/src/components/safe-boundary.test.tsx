import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/scan-log", () => ({ logScan: vi.fn() }));
import { SafeBoundary } from "./safe-boundary";

function Boom(): never { throw new Error("hỏng"); }

// TD-13: thông điệp theo ngữ cảnh + nút Đóng cho lớp phủ Chỉnh tay.
describe("SafeBoundary", () => {
  afterEach(() => cleanup());

  it("mặc định vẫn báo phần AI, không có nút Đóng", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<SafeBoundary><Boom /></SafeBoundary>);
    expect(screen.getByText("Phần AI gặp sự cố.")).toBeTruthy();
    expect(screen.queryByText("Đóng")).toBeNull();
  });

  it("nhận câu báo riêng và gọi onClose khi bấm Đóng", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const onClose = vi.fn();
    render(<SafeBoundary overlay title="Màn chỉnh sửa gặp sự cố." onClose={onClose}><Boom /></SafeBoundary>);
    expect(screen.getByRole("alert").textContent).toContain("Màn chỉnh sửa gặp sự cố.");
    fireEvent.click(screen.getByText("Đóng"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
