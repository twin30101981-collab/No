import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// HM-15: IndexedDB bị chặn/không có (chế độ riêng tư, chính sách trình duyệt) → app vẫn mở được, báo rõ, không lỗi chưa bắt.
const toastError = vi.fn();
vi.mock("sonner", () => ({ toast: { error: (...a: unknown[]) => toastError(...a), success: vi.fn(), message: vi.fn() } }));

function failingIdb() {
  return { open: () => { const r: { error: DOMException; onerror: null | (() => void) } = { error: new DOMException("blocked", "SecurityError"), onerror: null }; queueMicrotask(() => r.onerror?.()); return r; } };
}
function emptyIdb() {
  const fire = <T,>(result: T) => { const r: { result: T; onsuccess: null | (() => void) } = { result, onsuccess: null }; queueMicrotask(() => r.onsuccess?.()); return r; };
  const store = { getAll: () => fire([] as unknown[]), put: () => fire(undefined), clear: () => fire(undefined) };
  const db = { objectStoreNames: { contains: () => true }, createObjectStore: () => store, transaction: () => ({ objectStore: () => store }) };
  return { open: () => fire(db) };
}

const unhandled: unknown[] = [];
const onUnhandled = (e: unknown) => { unhandled.push(e); };
beforeEach(() => { vi.resetModules(); toastError.mockClear(); unhandled.length = 0; process.on("unhandledRejection", onUnhandled); });
afterEach(() => { process.off("unhandledRejection", onUnhandled); vi.unstubAllGlobals(); });

describe("IndexedDB không dùng được (HM-15)", () => {
  it.each([["open báo lỗi", () => failingIdb()], ["không có indexedDB", () => undefined]])("%s → useDocs ready, rỗng, báo một lần, không unhandled", async (_n, make) => {
    vi.stubGlobal("indexedDB", make());
    const { useDocs } = await import("./db");
    const { result, rerender } = renderHook(() => useDocs());
    await waitFor(() => expect(result.current.ready).toBe(true));
    rerender();
    expect(result.current.docs).toEqual([]);
    expect(toastError).toHaveBeenCalledTimes(1);
    await new Promise((r) => setTimeout(r, 20));
    expect(unhandled).toEqual([]);
  });

  it("lỗi mở không bị cache: mở lại được khi IndexedDB dùng được", async () => {
    vi.stubGlobal("indexedDB", failingIdb());
    const { openDb } = await import("./db");
    await expect(openDb()).rejects.toBeTruthy();
    vi.stubGlobal("indexedDB", emptyIdb());
    await expect(openDb()).resolves.toBeTruthy();
  });
});
