import { describe, expect, it } from "vitest";
import { clearHistory, getQuota, loadHistory, refundQuotaSlot, saveHistory, splitCitations, trimHistory, takeQuotaSlot, type ChatMsg } from "./doc-chat";

const mk = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }; };

describe("doc-chat", () => {
  it("lưu, cắt và xoá lịch sử theo tài liệu", () => {
    const s = mk();
    const list: ChatMsg[] = Array.from({ length: 70 }, (_, i) => ({ role: i % 2 ? "ai" : "user", text: `m${i}`, at: i }));
    expect(saveHistory("a", list, s)).toHaveLength(60);
    expect(loadHistory("a", s)[0].text).toBe("m10");
    expect(loadHistory("b", s)).toEqual([]);
    clearHistory("a", s);
    expect(loadHistory("a", s)).toEqual([]);
    expect(trimHistory(list.slice(0, 3))).toHaveLength(3);
  });

  it("hạn mức theo ngày: chặn khi hết, đặt lại sang ngày mới, hoàn lượt lỗi", () => {
    const s = mk();
    const d1 = new Date(2026, 9, 3, 10).getTime();
    expect(takeQuotaSlot(d1, s, 2)?.left).toBe(1);
    expect(takeQuotaSlot(d1, s, 2)?.left).toBe(0);
    expect(takeQuotaSlot(d1, s, 2)).toBeNull();
    refundQuotaSlot(d1, s, 2);
    expect(getQuota(d1, s, 2).left).toBe(1);
    const d2 = new Date(2026, 9, 4, 0, 1).getTime();
    expect(getQuota(d2, s, 2)).toMatchObject({ used: 0, left: 2 });
  });

  it("tách trích dẫn [Trang N]", () => {
    expect(splitCitations("Số tiền 5 triệu [Trang 2], hạn 30/9 [trang 3]")).toEqual([
      { t: "text", v: "Số tiền 5 triệu " }, { t: "page", v: 2 }, { t: "text", v: ", hạn 30/9 " }, { t: "page", v: 3 },
    ]);
    expect(splitCitations("Không có")).toEqual([{ t: "text", v: "Không có" }]);
  });

  it("lịch sử hỏng trả về rỗng", () => {
    const s = mk(); s.setItem("ghinhanh.chat.x", "{hỏng");
    expect(loadHistory("x", s)).toEqual([]);
  });
});
