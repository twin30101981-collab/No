/** G3-30: three-screen first-run guide; re-openable from Tôi > Xem lại hướng dẫn. */
import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Camera, Share2, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { setSettings, useSettings } from "@/lib/settings";
import { isShellHydrated, SHELL_HYDRATED } from "@/components/app-shell";

export const ONBOARDING_STEPS = [
  { icon: Camera, title: "Chụp hoặc nhập giấy tờ", body: "Bấm Quét để chụp. Ứng dụng tự tìm mép giấy và tự chụp khi máy đứng yên. Bạn cũng có thể nhập ảnh hoặc PDF có sẵn." },
  { icon: SlidersHorizontal, title: "Sửa cho rõ nét", body: "Kéo góc để cắt lại, chọn bộ lọc, khử bóng, che thông tin nhạy cảm. Mọi chỉnh sửa đều làm lại được, ảnh gốc luôn được giữ." },
  { icon: Share2, title: "Xuất và chia sẻ", body: "Lưu thành PDF, Word, Excel hoặc ảnh. Tài liệu nằm trên máy bạn; đăng nhập chỉ khi muốn đồng bộ hoặc gửi liên kết." },
] as const;

export function Onboarding() {
  const s = useSettings();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  // useSettings returns defaults before hydration; wait one tick so returning users never see a flash.
  useEffect(() => {
    // Wait for the page frame to hydrate: opening the modal earlier sets aria-hidden on
    // server-rendered markup and React reports a hydration mismatch. 4 s fallback for pages without the frame.
    let t2 = 0;
    const go = () => { window.clearTimeout(t2); t2 = window.setTimeout(() => setReady(true), 500); };
    if (isShellHydrated()) { go(); return; }
    window.addEventListener(SHELL_HYDRATED, go, { once: true });
    const t = window.setTimeout(go, 4000);
    return () => { window.removeEventListener(SHELL_HYDRATED, go); window.clearTimeout(t); window.clearTimeout(t2); };
  }, []);
  if (!ready) return null;
  if (s.onboarded || path.startsWith("/s/")) return null;
  const done = () => { setSettings({ onboarded: true }); setStep(0); };
  const item = ONBOARDING_STEPS[step];
  const Icon = item.icon;
  const last = step === ONBOARDING_STEPS.length - 1;
  return <Dialog open onOpenChange={(open) => !open && done()}>
    <DialogContent className="sm:max-w-md">
      <p className="text-xs font-semibold text-muted-foreground" aria-live="polite">Bước {step + 1} / {ONBOARDING_STEPS.length}</p>
      <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary" aria-hidden="true"><Icon className="size-7" /></div>
      <DialogTitle className="font-display text-xl">{item.title}</DialogTitle>
      <DialogDescription className="text-base leading-relaxed text-foreground/80">{item.body}</DialogDescription>
      {step === 0 && <label className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
        <span><span className="font-semibold">Chữ lớn</span><br /><span className="text-muted-foreground">Dễ đọc hơn, đổi lại được trong mục Tôi.</span></span>
        <Switch aria-label="Chữ lớn" checked={s.largeText} onCheckedChange={(v) => setSettings({ largeText: v })} />
      </label>}
      <div className="flex justify-center gap-1.5" aria-hidden="true">{ONBOARDING_STEPS.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"}`} />)}</div>
      <div className="flex gap-2">
        {step > 0 ? <Button variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>Quay lại</Button> : <Button variant="ghost" className="flex-1" onClick={done}>Bỏ qua</Button>}
        <Button className="flex-1" onClick={() => (last ? done() : setStep(step + 1))}>{last ? "Bắt đầu" : "Tiếp"}</Button>
      </div>
    </DialogContent>
  </Dialog>;
}
