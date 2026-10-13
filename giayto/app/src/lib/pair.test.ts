import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { deviceLabel, isRoomCode, newRoomCode, pairUrl, parsePair, remaining, roomExpired, ROOM_TTL_MS } from "./pair";

describe("ghép máy", () => {
  it("mã phòng ngẫu nhiên, 22 ký tự an toàn cho đường dẫn", () => {
    const a = newRoomCode(), b = newRoomCode();
    expect(isRoomCode(a)).toBe(true); expect(a).not.toBe(b);
  });
  it("đọc lại mã từ đường dẫn QR", () => {
    const c = newRoomCode();
    expect(parsePair(pairUrl("https://x.app", c, 1000))).toEqual({ code: c, created: 1000 });
    expect(parsePair(c)).toEqual({ code: c, created: null });
    expect(parsePair("https://x.app/doc/abc")).toBeNull();
    expect(parsePair("https://x.app/pair/ngắn")).toBeNull();
    expect(parsePair("xin chào")).toBeNull();
  });
  it("hết hạn sau 10 phút", () => {
    expect(roomExpired(0, ROOM_TTL_MS - 1)).toBe(false);
    expect(roomExpired(0, ROOM_TTL_MS + 1)).toBe(true);
    expect(roomExpired(null, 1e12)).toBe(false);
    expect(remaining(0, 1000)).toBe(ROOM_TTL_MS - 1000);
  });
  it("nhận tên máy", () => { expect(deviceLabel("Mozilla (iPhone; CPU)")).toBe("iPhone"); expect(deviceLabel("Linux; Android 14")).toBe("Điện thoại Android"); });
});
