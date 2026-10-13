import { describe, expect, it } from "vitest";
import { OcrQueue } from "./ocr-queue";
import { createAiQueue } from "./ai-queue";
import { setScanActive, isScanActive, whenScanIdle, onScanIdle } from "./priority-gate";

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

describe("B08 — hàng đợi ưu tiên", () => {
  it("cổng quét: bật/tắt và chờ rảnh", async () => {
    setScanActive(true);
    expect(isScanActive()).toBe(true);
    let idle = false;
    void whenScanIdle().then(() => { idle = true; });
    await tick();
    expect(idle).toBe(false);
    setScanActive(false);
    await tick();
    expect(idle).toBe(true);
  });

  it("OCR tạm dừng khi màn hình chụp mở, chạy lại khi đóng", async () => {
    setScanActive(true);
    const ran: string[] = [];
    const q = new OcrQueue(
      () => ({ run: async (src: string) => { ran.push(src); return "txt:" + src; }, abort: async () => {} }),
      () => {},
      1,
    );
    const p = q.add([{ docId: "d", pageId: "p1", label: "t1", src: "a" }]);
    await tick(); await tick();
    expect(ran).toEqual([]); // đang chụp → OCR chưa chạy
    setScanActive(false);
    expect(await p[0]).toBe("txt:a");
    expect(ran).toEqual(["a"]);
  });

  it("OCR chạy bình thường khi không chụp", async () => {
    setScanActive(false);
    const q = new OcrQueue(
      () => ({ run: async () => "ok", abort: async () => {} }),
      () => {},
      1,
    );
    expect(await q.add([{ docId: "d", pageId: "p2", label: "t", src: "b" }])[0]).toBe("ok");
  });

  it("AI xếp hàng khi đang chụp, tự gửi khi đóng màn chụp", async () => {
    setScanActive(true);
    const on = true; let cb = () => {};
    const q = createAiQueue({ online: () => on, onOnline: (f) => { cb = f; }, busy: isScanActive, onIdle: onScanIdle });
    const order: string[] = [];
    const p = q.run("dat-ten", async () => { order.push("ai"); return 1; });
    await tick();
    expect(order).toEqual([]); // bị giữ lại
    expect(q.jobs()).toHaveLength(1);
    setScanActive(false);
    expect(await p).toBe(1);
    expect(order).toEqual(["ai"]);
    expect(q.jobs()).toHaveLength(0);
    void on; void cb;
  });

  it("AI vẫn chạy ngay khi không chụp", async () => {
    setScanActive(false);
    const q = createAiQueue({ online: () => true, onOnline: () => {} });
    expect(await q.run("a", async () => 7)).toBe(7);
    expect(q.jobs()).toHaveLength(0);
  });
});
