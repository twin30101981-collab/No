import { useEffect, useState } from "react";

export type Settings = {
  quality: "normal" | "high"; paper: "a4" | "letter"; ocrLang: "vie+eng" | "vie" | "eng";
  dark: boolean; pin: string; pinSalt?: string; vaultWrap?: import("./vault").VaultWrap; autoLock: number; autoCapture: boolean; maxQuality: boolean; captureSound: boolean; captureVibrate: boolean; defaultFilter: "magic" | "auto" | "sharp" | "original"; autoName: boolean; autoOcr?: boolean; /** P8.4 */ autoRecipe?: boolean; /** CS-02: bộ điều phối nền toàn app (mặc định bật; false = bộ xử lý cục bộ trong màn Chụp như cũ). */ globalPipeline?: boolean;
  largeText: boolean; onboarded: boolean; voiceGuide: boolean; guideVibrate: boolean;
  nameTemplate: string; folderRules: import("./name-rules").FolderRule[];
};
const DEFAULTS: Settings = { quality: "high", paper: "a4", ocrLang: "vie+eng", dark: false, pin: "", autoLock: 1, autoCapture: true, maxQuality: false, captureSound: true, captureVibrate: true, defaultFilter: "auto", autoName: true, autoOcr: true, nameTemplate: "{ten}", folderRules: [], largeText: false, onboarded: false, voiceGuide: false, guideVibrate: true };
const KEY = "ghi-nhanh-settings";
const listeners = new Set<() => void>();

export function getSettings(): Settings {
  if (typeof window === "undefined") return DEFAULTS;
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") }; } catch { return DEFAULTS; }
}
export function setSettings(patch: Partial<Settings>) {
  localStorage.setItem(KEY, JSON.stringify({ ...getSettings(), ...patch }));
  listeners.forEach((l) => l());
}
export function useSettings() {
  const [s, set] = useState<Settings>(DEFAULTS);
  useEffect(() => {
    const l = () => set(getSettings());
    l(); listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return s;
}
export async function hashPin(pin: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("gn:" + pin));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
export const unlocked = new Set<string>();

/** Khoá lại mọi tài liệu đã mở; các màn hình đang mở sẽ hiện lại ô nhập PIN. */
let lockTick = 0;
const lockListeners = new Set<() => void>();
export function lockNow() { unlocked.clear(); lockTick++; lockListeners.forEach((l) => l()); void import("./db").then((m) => m.lockVault()); }
/** Muối PBKDF2 cho khoá mã hoá; tạo một lần cho máy có PIN từ trước khi có mã hoá. */
export function getPinSalt() {
  const s = getSettings(); if (s.pinSalt) return s.pinSalt;
  const salt = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16)))); setSettings({ pinSalt: salt }); return salt;
}
export function useLockTick() {
  const [t, set] = useState(lockTick);
  useEffect(() => { const l = () => set(lockTick); lockListeners.add(l); return () => { lockListeners.delete(l); }; }, []);
  return t;
}
/** Tự khoá sau N phút không thao tác hoặc khi rời ứng dụng quá N phút (0 = khoá ngay khi rời). */
export function installAutoLock() {
  let last = Date.now(); let hiddenAt = 0;
  const active = () => { last = Date.now(); };
  const limit = () => { const s = getSettings(); return s.pin && s.autoLock >= 0 ? s.autoLock * 60000 : Infinity; };
  const vis = () => {
    if (document.hidden) { hiddenAt = Date.now(); if (limit() === 0) lockNow(); }
    else if (hiddenAt && Date.now() - hiddenAt >= limit()) lockNow();
  };
  const t = setInterval(() => { const l = limit(); if (l > 0 && unlocked.size && Date.now() - last >= l) lockNow(); }, 10000);
  const evs = ["pointerdown", "keydown", "scroll"] as const;
  evs.forEach((e) => window.addEventListener(e, active, { passive: true }));
  document.addEventListener("visibilitychange", vis);
  return () => { clearInterval(t); evs.forEach((e) => window.removeEventListener(e, active)); document.removeEventListener("visibilitychange", vis); };
}
