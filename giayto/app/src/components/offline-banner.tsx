import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

/** G2-10: báo mất mạng; có mạng lại thì báo ngắn rồi ẩn. */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    setOffline(navigator.onLine === false);
    const off = () => setOffline(true);
    const on = () => { setOffline(false); toast.success("Đã có mạng trở lại."); };
    window.addEventListener("offline", off); window.addEventListener("online", on);
    return () => { window.removeEventListener("offline", off); window.removeEventListener("online", on); };
  }, []);
  if (!offline) return null;
  return (
    <div role="status" className="fixed inset-x-0 top-0 z-50 flex pt-[calc(0.375rem+env(safe-area-inset-top))] items-center justify-center gap-2 bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground">
      <WifiOff className="size-3.5" /> Đang mất mạng — vẫn quét, sửa được; việc AI sẽ chờ.
    </div>
  );
}
