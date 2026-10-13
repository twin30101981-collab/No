import { useEffect, useState } from "react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let deferred: BIPEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e as BIPEvent; listeners.forEach((l) => l()); });
  window.addEventListener("appinstalled", () => { deferred = null; listeners.forEach((l) => l()); });
}

/** Trạng thái nút "Cài ứng dụng": có thể cài trực tiếp, iPhone (hướng dẫn), hoặc đã cài. */
export function useInstall() {
  const [, tick] = useState(0);
  const [env, setEnv] = useState({ installed: false, ios: false });
  useEffect(() => {
    const l = () => tick((n) => n + 1); listeners.add(l);
    setEnv({
      installed: window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true,
      ios: /iphone|ipad|ipod/i.test(navigator.userAgent),
    });
    return () => { listeners.delete(l); };
  }, []);
  return {
    ...env,
    canPrompt: !!deferred,
    async install() {
      if (!deferred) return false;
      await deferred.prompt(); const r = await deferred.userChoice; deferred = null; listeners.forEach((l) => l());
      return r.outcome === "accepted";
    },
  };
}
