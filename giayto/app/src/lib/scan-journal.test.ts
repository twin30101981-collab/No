import { describe, expect, it } from "vitest";
import { JournalWriter, memoryKV, newJournal, stateCounts } from "./scan-journal";
import type { Page } from "./db";

const pg = (id: string): Page => ({ id, orig: "o" + id, src: "s" + id, edit: { rotation: 0, filter: "auto", brightness: 0, contrast: 0 } });

describe("scan-journal (S8)", () => {
  it("khôi phục đủ trang sau 'tải lại' (writer mới, cùng kho)", async () => {
    const kv = memoryKV(); const w = new JournalWriter(kv); const j = newJournal("doc");
    for (let i = 0; i < 30; i++) { j.pages.push(pg(String(i))); void w.save(j); }
    await w.flush();
    const back = await new JournalWriter(kv).load();
    expect(back?.pages.map((p) => p.id)).toEqual(j.pages.map((p) => p.id));
  });
  it("bản ghi cuối thắng, xoá trang được lưu", async () => {
    const kv = memoryKV(); const w = new JournalWriter(kv); const j = newJournal("doc");
    j.pages = [pg("a"), pg("b"), pg("c")]; void w.save(j);
    j.pages = [pg("a"), pg("c")]; await w.save(j);
    expect((await w.load())?.pages.map((p) => p.id)).toEqual(["a", "c"]);
  });
  it("commit gọi lưu đúng 1 lần với id phiên, sau đó không còn gì để khôi phục", async () => {
    const kv = memoryKV(); const w = new JournalWriter(kv); const j = newJournal("doc"); j.pages = [pg("a")];
    await w.save(j); const ids: string[] = [];
    await w.commit(j, async (cid) => { ids.push(cid); return "doc1"; });
    expect(ids).toEqual([j.id]); expect(await w.load()).toBeUndefined();
  });
  it("phiên rỗng không lưu", async () => {
    const kv = memoryKV(); const w = new JournalWriter(kv); await w.save(newJournal("doc"));
    expect(await kv.get("current")).toBeUndefined();
  });
  it("đếm trạng thái", () => {
    expect(stateCounts({ pages: [pg("a"), pg("b")], states: { b: "error" }, pending: 2 })).toEqual({ queued: 2, running: 0, done: 1, error: 1 });
  });
});
