import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { routeTree } from "@/routeTree.gen";

// HM-01: jsdom không có IndexedDB, mà màn chính (useDocs → loadDocs) mở "ghi-nhanh" ngay khi mount.
// Dùng kho rỗng giả để đường mở/đọc chạy thật thay vì ném ReferenceError không ai bắt (làm vitest thoát mã 1).
function emptyIndexedDb() {
  const fire = <T,>(result: T) => {
    const req: { result: T; onsuccess: null | (() => void); onerror: null | (() => void) } = { result, onsuccess: null, onerror: null };
    queueMicrotask(() => req.onsuccess?.());
    return req;
  };
  const store = { getAll: () => fire([] as unknown[]), put: () => fire(undefined), clear: () => fire(undefined), delete: () => fire(undefined) };
  const db = { objectStoreNames: { contains: () => true }, createObjectStore: () => store, transaction: () => ({ objectStore: () => store }) };
  return { open: () => fire(db) };
}

beforeAll(() => { vi.stubGlobal("indexedDB", emptyIndexedDb()); });
afterAll(() => { vi.unstubAllGlobals(); });

function renderAt(path: string) {
  const queryClient = new QueryClient();
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  render(<RouterProvider router={router} />);
  return router;
}

// The root shell renders <html>/<body>. In jsdom React hoists those onto the
// document instead of the test container, so the container div stays empty even
// when the app works. Assert the router resolves every match without error and
// the root route mounted (it injects the toast styles into <head>).
async function expectMounted(router: ReturnType<typeof renderAt>) {
  await waitFor(() => {
    const ms = router.state.matches;
    expect(ms.length).toBeGreaterThan(0);
    expect(ms.every((m) => m.status === "success" || m.status === "notFound")).toBe(true);
    expect(document.head.innerHTML.length).toBeGreaterThan(0);
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("App routing", () => {
  it("renders the index route", async () => {
    await expectMounted(renderAt("/"));
  });

  it("renders the not-found route", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const router = renderAt("/this-route-does-not-exist");
    await expectMounted(router);
  });
});
