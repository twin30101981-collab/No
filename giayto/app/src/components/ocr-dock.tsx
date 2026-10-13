import { Loader2, X } from "lucide-react";
import { ocrQueue, useOcrJobs } from "@/lib/ocr-queue";

/** Floating background-OCR status: visible on every screen while pages are being read. */
export function OcrDock() {
  const jobs = useOcrJobs();
  if (!jobs.length) return null;
  const cur = jobs.find((j) => j.status === "running") ?? jobs[0]!;
  const done = ocrQueue().done, total = done + jobs.length;
  const pct = Math.round(((done + cur.progress) / total) * 100);
  return (
    <div role="status" className="fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 mx-auto w-[min(92vw,400px)] rounded-full bg-foreground px-3 py-2 text-background shadow-lg">
      <div className="flex items-center gap-2 text-xs font-semibold">
        <Loader2 className="size-3.5 shrink-0 animate-spin" />
        <span className="min-w-0 flex-1 truncate">Nhận chữ {done + 1}/{total} · {cur.label} · {pct}%</span>
        <button aria-label="Hủy nhận chữ" onClick={() => void ocrQueue().cancel()} className="flex items-center gap-1 rounded-full bg-background/15 px-2 py-0.5"><X className="size-3" /> Hủy</button>
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-background/20"><div className="h-full bg-primary transition-[width]" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}
