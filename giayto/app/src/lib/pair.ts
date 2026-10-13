// G4-02: ghép máy tính ↔ điện thoại bằng mã QR. Phòng tạm = kênh thời gian thực theo mã ngẫu nhiên,
// không lưu gì trên máy chủ; mã hết hạn sau ROOM_TTL_MS và chỉ người có mã mới vào được.
import { supabase } from "@/integrations/supabase/client";

export const ROOM_TTL_MS = 10 * 60 * 1000;
const CODE_RE = /^[A-Za-z0-9_-]{22}$/;

export function newRoomCode(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export const isRoomCode = (c: string) => CODE_RE.test(c);
export const pairUrl = (origin: string, code: string, created: number) => `${origin}/pair/${code}?t=${created}`;

/** Đọc mã phòng từ nội dung QR (đường dẫn đầy đủ hoặc chỉ mã). */
export function parsePair(text: string): { code: string; created: number | null } | null {
  const t = text.trim();
  if (isRoomCode(t)) return { code: t, created: null };
  try {
    const u = new URL(t);
    const m = u.pathname.match(/^\/pair\/([^/]+)$/);
    if (!m || !isRoomCode(m[1])) return null;
    const c = Number(u.searchParams.get("t"));
    return { code: m[1], created: Number.isFinite(c) && c > 0 ? c : null };
  } catch { return null; }
}
export const roomExpired = (created: number | null, now: number) => created !== null && (now - created > ROOM_TTL_MS || created - now > 60_000);
export const remaining = (created: number, now: number) => Math.max(0, created + ROOM_TTL_MS - now);

export function deviceLabel(ua: string): string {
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Điện thoại Android";
  return "Điện thoại";
}

export type Role = "desktop" | "phone";
export type PairPeer = { role: Role; device: string };

/** Vào phòng; báo lại danh sách bên đã vào mỗi khi thay đổi. Trả hàm rời phòng. */
export function joinRoom(code: string, me: PairPeer, onPeers: (p: PairPeer[]) => void, onStatus?: (s: string) => void, setup?: (ch: ReturnType<typeof supabase.channel>) => void) {
  const ch = supabase.channel(`pair:${code}`, { config: { presence: { key: `${me.role}-${crypto.randomUUID().slice(0, 8)}` }, broadcast: { self: false } } });
  ch.on("presence", { event: "sync" }, () => {
    const st = ch.presenceState<PairPeer>();
    onPeers(Object.values(st).flat().map((p) => ({ role: p.role, device: p.device })));
  });
  setup?.(ch);
  ch.subscribe(async (s) => { onStatus?.(s); if (s === "SUBSCRIBED") await ch.track(me); });
  return { channel: ch, leave: () => { void ch.untrack(); void supabase.removeChannel(ch); } };
}
