import { useEffect, useState } from "react";
import { Check, FileSearch, Loader2, MousePointerClick, Table2, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

/** 1 chọn tệp · 2 đọc trang · 3 dựng bảng/văn bản · 4 kiểm tra & tải */
export type ConvertState = { title: string; step: 1 | 2 | 3; done: number; total: number; label: string; startedAt: number };

const STEPS = ["Chọn tệp", "Đọc từng trang", "Dựng tệp", "Kiểm tra & tải"];

export function ConvertProgress({ state }: { state: ConvertState | null }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { if (!state) return; const t = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(t); }, [state]);
  if (!state) return null;
  const frac = state.total ? state.done / state.total : 0;
  // overall bar: step 2 spans 10–85%, step 3 85–100%
  const pct = state.step === 1 ? 5 : state.step === 2 ? 10 + frac * 75 : 85 + frac * 15;
  const secs = Math.round((now - state.startedAt) / 1000);
  const eta = state.step === 2 && state.done > 0 && state.done < state.total
    ? Math.max(1, Math.round(((now - state.startedAt) / state.done) * (state.total - state.done) / 1000)) : null;
  return (
    <Dialog open>
      <DialogContent className="max-w-[92vw] rounded-[18px] sm:max-w-[400px] [&>button]:hidden" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="font-display">{state.title}</DialogTitle>
          <DialogDescription>Giữ màn hình này mở. Tệp được xử lý ngay trên máy bạn.</DialogDescription>
        </DialogHeader>
        <ol className="space-y-2.5">
          {STEPS.map((s, i) => {
            const n = i + 1; const active = n === state.step, ok = n < state.step;
            return (
              <li key={s} className="flex items-center gap-3">
                <span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${ok ? "bg-primary text-primary-foreground" : active ? "bg-secondary text-primary ring-2 ring-primary" : "bg-muted text-muted-foreground"}`}>
                  {ok ? <Check className="size-4" /> : active ? <Loader2 className="size-4 animate-spin" /> : n}
                </span>
                <span className={`text-sm ${active ? "font-semibold" : ok ? "" : "text-muted-foreground"}`}>{s}</span>
              </li>
            );
          })}
        </ol>
        <div className="space-y-1.5">
          <Progress value={pct} aria-label="Tiến độ chuyển đổi" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{state.label}</span>
            <span>{eta ? `còn ~${eta}s` : `${secs}s`}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const KEY = "gn-convert-guide-hidden";
/** Hướng dẫn 3 bước cho người dùng lần đầu, ẩn được. */
export function ConvertGuide() {
  const [show, setShow] = useState(false);
  useEffect(() => { setShow(localStorage.getItem(KEY) !== "1"); }, []);
  if (!show) return null;
  const items = [
    { icon: MousePointerClick, t: "Chọn kiểu đổi", d: "Ví dụ PDF → Excel" },
    { icon: FileSearch, t: "Chọn tệp", d: "Xem tiến độ từng trang" },
    { icon: Table2, t: "Kiểm tra rồi tải", d: "Ô vàng là chỗ cần xem lại" },
  ];
  return (
    <div className="relative mt-2.5 rounded-[14px] border bg-secondary/60 p-3">
      <button aria-label="Ẩn hướng dẫn" className="absolute right-0 top-0 rounded p-3 text-muted-foreground" onClick={() => { localStorage.setItem(KEY, "1"); setShow(false); }}>
        <X className="size-4" />
      </button>
      <p className="font-display text-[0.8125rem] font-semibold">Lần đầu chuyển đổi? Chỉ 3 bước</p>
      <ol className="mt-2 grid grid-cols-3 gap-2">
        {items.map(({ icon: Icon, t, d }, i) => (
          <li key={t} className="flex flex-col gap-1">
            <span className="flex items-center gap-1.5 text-[0.6875rem] font-bold text-primary"><Icon className="size-3.5" />{i + 1}. {t}</span>
            <span className="text-[0.65625rem] leading-4 text-muted-foreground">{d}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
