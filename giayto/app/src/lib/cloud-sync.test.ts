import { describe, expect, it } from "vitest";
import { fingerprint, imagesToSend, plan } from "./cloud-sync";
import type { Doc } from "./db";

const edit = {} as Doc["pages"][number]["edit"];
const d = (id: string, updatedAt: number): Doc => ({ id, name: id, folder: "", kind: "doc", createdAt: 1, updatedAt, pages: [{ id: "p1", orig: "data:a", src: "data:b", edit }] });

describe("cloud-sync", () => {
  it("chỉ gửi tài liệu mới hoặc đã sửa", () => {
    const st = { docs: { a: 5, b: 9 }, imgs: {} };
    expect(plan([d("a", 6), d("b", 9), d("c", 1)], st).map((x) => x.id)).toEqual(["a", "c"]);
  });
  it("bỏ qua ảnh không đổi", () => {
    const doc = d("a", 1);
    const all = imagesToSend("u", doc, { docs: {}, imgs: {} });
    expect(all).toHaveLength(2);
    const st = { docs: {}, imgs: { [all[0]!.path]: all[0]!.fp } };
    expect(imagesToSend("u", doc, st).map((x) => x.path)).toEqual([all[1]!.path]);
  });
  it("vân tay đổi khi ảnh đổi", () => expect(fingerprint("data:aaa")).not.toBe(fingerprint("data:aab")));
});

import { pullPlan } from "./cloud-sync";
describe("G3-04 pullPlan", () => {
  const r = (local_id: string, t: number) => ({ id: "r" + local_id, local_id, client_updated_at: t, updated_at: "2026-01-01T00:00:00Z" });
  it("tải tài liệu chưa có trên máy", () => expect(pullPlan([], [r("a", 1)]).map((x) => x.local_id)).toEqual(["a"]));
  it("bản mới nhất thắng", () => {
    expect(pullPlan([d("a", 5), d("b", 9)], [r("a", 7), r("b", 3)]).map((x) => x.local_id)).toEqual(["a"]);
  });
  it("bằng giờ thì giữ bản trên máy", () => expect(pullPlan([d("a", 5)], [r("a", 5)])).toEqual([]));
});

import { classify } from "./cloud-sync";
describe("G3-05 classify", () => {
  const d = (id: string, u: number) => ({ id, name: id, updatedAt: u }) as unknown as Doc;
  const r = (id: string, c: number) => ({ id: "x" + id, local_id: id, client_updated_at: c, updated_at: "" });
  it("sửa cả hai nơi sau lần đồng bộ trước là xung đột", () =>
    expect(classify([d("a", 30)], [r("a", 20)], { docs: { a: 10 }, imgs: {} })[0]!.state).toBe("conflict"));
  it("chỉ máy sửa thì máy mới hơn", () =>
    expect(classify([d("a", 30)], [r("a", 10)], { docs: { a: 10 }, imgs: {} })[0]!.state).toBe("local-newer"));
  it("phân loại chỉ trên máy / chỉ trên mây / giống nhau", () =>
    expect(classify([d("a", 1), d("b", 5)], [r("b", 5), r("c", 2)], { docs: {}, imgs: {} }).map((x) => x.state)).toEqual(["local-only", "same", "cloud-only"]));
});
