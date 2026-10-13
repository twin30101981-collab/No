/**
 * G3-22 — Thứ tự dự phòng khi tự dò mép giấy (thuần, test được):
 * 1) bộ dò trên máy chắc chắn → dùng luôn; 2) mất mạng → không hỏi AI (tránh treo chờ hàng đợi);
 * 3) AI trả 4 góc hợp lệ → dùng AI; 4) AI lỗi/sai → quay về kết quả trên máy dù chưa chắc; 5) không có gì → kéo tay.
 */
import type { Quad } from "./db";

export type LocalPick = { quad: Quad | null; sure: boolean };
export type QuadHow = "local" | "ai" | "none";

export const shouldAskAi = (local: LocalPick, online: boolean) => !(local.quad && local.sure) && online;

export function pickQuad(local: LocalPick, ai: Quad | null): { q: Quad | null; how: QuadHow } {
  if (local.quad && local.sure) return { q: local.quad, how: "local" };
  if (ai) return { q: ai, how: "ai" };
  return { q: local.quad, how: local.quad ? "local" : "none" };
}
