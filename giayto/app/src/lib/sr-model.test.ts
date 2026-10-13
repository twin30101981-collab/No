import { describe, it, expect } from "vitest";
import { loadSrModel, isModelCached, SrModelError, type SrModelInfo } from "./sr-model";

const M: SrModelInfo = { id: "t", url: "/m.onnx", bytes: 6, scale: 2 };
function memCaches() {
  const store = new Map<string, Response>();
  const cache = {
    match: async (k: string) => store.get(k)?.clone(),
    put: async (k: string, r: Response) => { store.set(k, r); },
    delete: async (k: string) => store.delete(k),
  };
  return { open: async () => cache as unknown as Cache, store };
}
const body = () => new Response(new Uint8Array([1, 2, 3, 4, 5, 6]), { headers: { "content-length": "6" } });

describe("sr-model", () => {
  it("tải, báo tiến độ, lưu đệm; lần sau không gọi mạng", async () => {
    const caches = memCaches(); let calls = 0; const pct: number[] = [];
    const fetch = (async () => { calls++; return body(); }) as unknown as typeof globalThis.fetch;
    const a = await loadSrModel(M, { onProgress: (p) => pct.push(p) }, { fetch, caches });
    expect(a.byteLength).toBe(6); expect(pct.at(-1)).toBe(100);
    expect(await isModelCached(M, { caches })).toBe(true);
    await loadSrModel(M, {}, { fetch, caches });
    expect(calls).toBe(1);
  });

  it("loại tệp sai SHA-256", async () => {
    const fetch = (async () => body()) as unknown as typeof globalThis.fetch;
    const digest = async () => new Uint8Array(32).buffer;
    await expect(loadSrModel({ ...M, sha256: "ff".repeat(32) }, {}, { fetch, caches: null, digest }))
      .rejects.toMatchObject({ code: "checksum" });
  });

  it("báo lỗi mạng dễ hiểu và hỗ trợ hủy", async () => {
    const bad = (async () => { throw new TypeError("x"); }) as unknown as typeof globalThis.fetch;
    await expect(loadSrModel(M, {}, { fetch: bad, caches: null })).rejects.toBeInstanceOf(SrModelError);
    const ac = new AbortController(); ac.abort();
    await expect(loadSrModel(M, { signal: ac.signal }, { fetch: bad, caches: null })).rejects.toMatchObject({ code: "aborted" });
  });
});
