import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Doc, Page } from "../db";

const { docs, saveDoc, renderPage } = vi.hoisted(() => {
  const docs: { list: Doc[] } = { list: [] };
  return {
    docs,
    saveDoc: vi.fn(async (d: Doc, _touch?: boolean) => { docs.list = docs.list.map((x) => (x.id === d.id ? d : x)); return d; }),
    renderPage: vi.fn(async (_o: string, _e: unknown, _m: number) => "data:image/jpeg;base64,FULL"),
  };
});
vi.mock("../db", () => ({ getDocs: () => docs.list, saveDoc, ensureDocsLoaded: async () => {} }));
vi.mock("../image", () => ({ renderPage, targetLong: () => 3508 }));
vi.mock("../perf-stats", () => ({ timed: (_n: string, f: () => unknown) => f() }));
vi.mock("../settings", () => ({ getSettings: () => ({ quality: "high" }) }));
vi.mock("../bg-queue", () => ({ bgQueue: { setHandler: vi.fn(), resume: vi.fn(async () => 0) } }));
import { _resetPipelineForTest, applyFinished, finishHandler, finishedStore, startPipeline } from "./runner";
import { bgQueue } from "../bg-queue";

const EDIT = { rotation: 0, filter: "auto" as const, brightness: 0, contrast: 0 };
const page = (id: string, extra: Partial<Page> = {}): Page => ({ id, orig: "o-" + id, src: "draft-" + id, edit: EDIT, ...extra });
const doc = (id: string, pages: Page[], extra: Partial<Doc> = {}): Doc => ({ id, name: id, folder: "Chung", kind: "Tài liệu", createdAt: 1, updatedAt: 1, pages, ...extra });
const job = (pageId: string, edit = EDIT) => ({ id: "j", pageId, kind: "finish" as const, state: "running" as const, payload: { orig: "o-" + pageId, edit, targetLong: 3508 }, attempts: 1, createdAt: 1, updatedAt: 1 });

beforeEach(() => { docs.list = []; saveDoc.mockClear(); renderPage.mockClear(); _resetPipelineForTest(); });

describe("CS-02 bộ điều phối nền toàn app", () => {
  it("trang đã nằm trong tài liệu: bản đầy đủ được ghi thẳng vào tài liệu (không cần màn Chụp)", async () => {
    docs.list = [doc("d", [page("a"), page("b")])];
    await finishHandler(job("b"));
    expect(saveDoc).toHaveBeenCalledTimes(1);
    const [saved, touch] = saveDoc.mock.calls[0]!;
    expect(saved.pages.map((p) => p.src)).toEqual(["draft-a", "data:image/jpeg;base64,FULL"]); expect(touch).toBe(false);
    expect(finishedStore.get("b")).toBeUndefined();
  });
  it("trang còn trong khay (chưa lưu): giữ kết quả và báo cho người nghe", async () => {
    const got: string[] = []; const off = finishedStore.subscribe((id, src) => got.push(`${id}:${src}`));
    await finishHandler(job("x"));
    expect(saveDoc).not.toHaveBeenCalled(); expect(finishedStore.get("x")).toBe("data:image/jpeg;base64,FULL"); expect(got).toEqual(["x:data:image/jpeg;base64,FULL"]);
    off(); finishedStore.delete("x"); expect(finishedStore.get("x")).toBeUndefined();
  });
  it("người dùng đã sửa trang (edit khác) → không ghi đè", async () => {
    docs.list = [doc("d", [page("a", { edit: { ...EDIT, filter: "mono" } })])];
    expect(await applyFinished("a", "NEW", EDIT)).toBe(false); expect(saveDoc).not.toHaveBeenCalled();
  });
  it("tài liệu khoá PIN / mã hoá / trong thùng rác → bỏ qua", async () => {
    for (const extra of [{ locked: true }, { enc: { v: 1 } as never }, { deletedAt: 5 }]) {
      docs.list = [doc("d", [page("a")], extra)]; expect(await applyFinished("a", "NEW", EDIT)).toBe(false);
    }
    expect(saveDoc).not.toHaveBeenCalled();
  });
  it("hai trang cùng tài liệu hoàn thiện cùng lúc: cả hai đều được ghi (không đè nhau)", async () => {
    docs.list = [doc("d", [page("a"), page("b")])];
    await Promise.all([applyFinished("a", "A!", EDIT), applyFinished("b", "B!", EDIT)]);
    expect(docs.list[0]!.pages.map((p) => p.src)).toEqual(["A!", "B!"]);
  });
  it("startPipeline chỉ khởi động một lần: đăng ký bộ xử lý + chạy tiếp việc dở", () => {
    expect(startPipeline()).toBe(true); expect(startPipeline()).toBe(false);
    expect(bgQueue.setHandler).toHaveBeenCalledTimes(1); expect(bgQueue.resume).toHaveBeenCalledTimes(1);
  });
});
