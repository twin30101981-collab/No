import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useImagePaste } from "./use-image-paste";
function paste(target: Element) {
  const event = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", { value: { files: [new File(["png"], "p.png", { type: "image/png" })], items: [] } });
  target.dispatchEvent(event); return event;
}
describe("scoped image paste", () => {
  it("imports pasted image once and consumes event", async () => {
    const onImages = vi.fn().mockResolvedValue(undefined); const hook = renderHook(() => useImagePaste(onImages));
    let event: Event | undefined; act(() => { event = paste(document.body); });
    await waitFor(() => expect(onImages).toHaveBeenCalledTimes(1)); expect(event?.defaultPrevented).toBe(true); hook.unmount();
  });
  it("leaves text-field paste untouched", () => {
    const onImages = vi.fn(); const hook = renderHook(() => useImagePaste(onImages));
    const input = document.createElement("input"); document.body.append(input);
    const event = paste(input); expect(onImages).not.toHaveBeenCalled(); expect(event.defaultPrevented).toBe(false); input.remove(); hook.unmount();
  });
  it("does not import while disabled", () => {
    const onImages = vi.fn(); const hook = renderHook(() => useImagePaste(onImages, false)); paste(document.body); expect(onImages).not.toHaveBeenCalled(); hook.unmount();
  });
  it("removes listener on unmount", () => {
    const onImages = vi.fn(); const hook = renderHook(() => useImagePaste(onImages)); hook.unmount(); paste(document.body); expect(onImages).not.toHaveBeenCalled();
  });
});
