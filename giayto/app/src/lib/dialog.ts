import { useEffect, useState } from "react";

export type DialogReq = {
  kind: "confirm" | "prompt" | "pin" | "choice";
  title: string; message?: string; okText?: string; danger?: boolean; /** kind "choice": nút thứ hai (vd. "Thay thế") */ altText?: string;
  defaultValue?: string; placeholder?: string;
  resolve: (v: string | boolean | null) => void;
};
let current: DialogReq | null = null;
const listeners = new Set<() => void>();
function open(req: Omit<DialogReq, "resolve">) {
  return new Promise<string | boolean | null>((resolve) => {
    current?.resolve(null);
    current = { ...req, resolve: (v) => { current = null; listeners.forEach((l) => l()); resolve(v); } };
    listeners.forEach((l) => l());
  });
}
/** Hộp thoại xác nhận riêng của app (thay window.confirm). */
export const confirmDialog = (title: string, o: { message?: string; okText?: string; danger?: boolean } = {}) =>
  open({ kind: "confirm", title, ...o }).then(Boolean);
/** Hộp thoại hai lựa chọn + Huỷ (BL-01: Gộp / Thay thế). Trả "ok" | "alt" | null khi huỷ. */
export const choiceDialog = (title: string, o: { message?: string; okText: string; altText: string }) =>
  open({ kind: "choice", title, ...o }).then((v) => (v === "ok" || v === "alt" ? v : null));
/** Hộp thoại nhập chữ (thay window.prompt). Trả null khi huỷ. */
export const promptDialog = (title: string, o: { message?: string; defaultValue?: string; placeholder?: string; okText?: string } = {}) =>
  open({ kind: "prompt", title, ...o }).then((v) => (typeof v === "string" ? v.trim() || null : null));
/** Nhập mã PIN dạng số 4–6 chữ số. */
export const pinDialog = (title: string, message?: string) =>
  open({ kind: "pin", title, ...(message ? { message } : {}) }).then((v) => (typeof v === "string" ? v : null));

export function useDialogState() {
  const [, tick] = useState(0);
  useEffect(() => { const l = () => tick((n) => n + 1); listeners.add(l); return () => { listeners.delete(l); }; }, []);
  return current;
}
