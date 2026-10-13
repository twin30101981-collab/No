import { WifiOff, X } from "lucide-react";
import { aiQueue, useAiJobs } from "@/lib/ai-queue";

/** Báo việc AI đang chờ mạng; hiện trên mọi màn hình. */
export function AiQueueDock() {
  const jobs = useAiJobs();
  if (!jobs.length) return null;
  const first = jobs[0]!;
  return (
    <div role="status" className="fixed inset-x-0 top-[calc(2.75rem+env(safe-area-inset-top))] z-50 mx-auto w-[min(92vw,400px)] rounded-full bg-foreground px-3 py-2 text-background shadow-lg">
      <div className="flex items-center gap-2 text-xs font-semibold">
        <WifiOff className="size-3.5 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{jobs.length} việc AI chờ mạng · {first.label}</span>
        <button aria-label="Hủy việc AI đang chờ" onClick={() => aiQueue().cancel(first.id)} className="flex items-center gap-1 rounded-full bg-background/15 px-2 py-0.5"><X className="size-3" /> Hủy</button>
      </div>
    </div>
  );
}
