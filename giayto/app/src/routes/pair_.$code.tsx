import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { pickFiles } from "@/lib/importer";
import { fileToDataUrl, normalize } from "@/lib/image";
import { split } from "@/lib/pair-transfer";
import { Camera, Check, ImagePlus, Laptop, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { deviceLabel, isRoomCode, joinRoom, roomExpired, type PairPeer } from "@/lib/pair";

export const Route = createFileRoute("/pair_/$code")({
  validateSearch: (s: Record<string, unknown>) => ({ t: Number(s["t"]) || undefined }),
  head: () => ({ meta: [
    { title: "Nối với máy tính — Ghi Nhanh" },
    { name: "description", content: "Điện thoại đang nối với máy tính để gửi ảnh giấy tờ vừa chụp." },
    { property: "og:title", content: "Nối với máy tính — Ghi Nhanh" },
    { property: "og:description", content: "Điện thoại đang nối với máy tính để gửi ảnh giấy tờ vừa chụp." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ]}),
  component: PairPhone,
});

function PairPhone() {
  const { code } = Route.useParams();
  const { t } = Route.useSearch();
  const [peers, setPeers] = useState<PairPeer[]>([]);
  const chRef = useRef<{ send: (m: { type: "broadcast"; event: string; payload: unknown }) => Promise<unknown> } | null>(null);
  const acks = useRef(new Map<string, () => void>());
  const [sent, setSent] = useState<{ id: string; state: "sending" | "ok" | "fail"; pct: number }[]>([]);
  const [state, setState] = useState<"checking" | "bad" | "joining" | "joined">("checking");

  useEffect(() => {
    if (!isRoomCode(code) || roomExpired(t ?? null, Date.now())) { setState("bad"); return; }
    setState("joining");
    const r = joinRoom(code, { role: "phone", device: deviceLabel(navigator.userAgent) }, setPeers, (s) => { if (s === "SUBSCRIBED") setState("joined"); }, (ch) => {
      chRef.current = ch as never;
      ch.on("broadcast", { event: "ack" }, ({ payload }) => { const id = (payload as { id?: string })?.id; if (id) acks.current.get(id)?.(); });
    });
    return () => r.leave();
  }, [code, t]);

  const desktop = peers.some((p) => p.role === "desktop");
  const upd = (id: string, patch: Partial<{ state: "sending" | "ok" | "fail"; pct: number }>) => setSent((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  async function sendFiles(capture: boolean) {
    const files = await pickFiles("image/*", !capture, capture ? "environment" : undefined);
    for (const f of files) {
      const id = crypto.randomUUID();
      setSent((l) => [...l, { id, state: "sending", pct: 0 }]);
      try {
        const img = await normalize(f, 2400, 0.85);
        const parts = split(id, img);
        const acked = new Promise<boolean>((res) => { acks.current.set(id, () => res(true)); setTimeout(() => res(false), 20_000); });
        for (const p of parts) { await chRef.current?.send({ type: "broadcast", event: "part", payload: p }); upd(id, { pct: (p.i + 1) / p.n }); }
        upd(id, { state: (await acked) ? "ok" : "fail" });
      } catch { upd(id, { state: "fail" }); }
      finally { acks.current.delete(id); }
    }
  }
  return (
    <AppShell title="Nối với máy tính">
      <div className="mx-auto max-w-md space-y-4 p-6 text-center">
        {state === "bad" ? (
          <>
            <p className="font-medium">Mã này đã hết hạn hoặc không đúng.</p>
            <p className="text-sm text-muted-foreground">Trên máy tính, bấm "Tạo mã mới" rồi quét lại.</p>
          </>
        ) : desktop ? (
          <div role="status" className="space-y-2">
            <Laptop className="mx-auto h-10 w-10 text-primary" aria-hidden />
            <p className="font-medium">Đã nối với máy tính</p>
            <p className="text-sm text-muted-foreground">Giữ trang này mở. Ảnh bạn chụp sẽ được gửi sang máy tính.</p>
            <div className="grid gap-2 pt-2">
              <Button size="lg" onClick={() => sendFiles(true)}><Camera className="mr-2 h-5 w-5" aria-hidden />Chụp và gửi</Button>
              <Button variant="outline" onClick={() => sendFiles(false)}><ImagePlus className="mr-2 h-4 w-4" aria-hidden />Gửi ảnh có sẵn</Button>
            </div>
            {sent.length > 0 && (
              <ul className="space-y-1 pt-2 text-left text-sm" aria-live="polite">
                {sent.map((x, i) => (
                  <li key={x.id} className="flex items-center gap-2">
                    {x.state === "ok" ? <Check className="h-4 w-4 text-primary" aria-hidden /> : x.state === "sending" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <span aria-hidden>!</span>}
                    Ảnh {i + 1}: {x.state === "ok" ? "đã tới máy tính" : x.state === "sending" ? `đang gửi ${Math.round(x.pct * 100)}%` : "chưa tới — kiểm tra mạng rồi gửi lại"}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div role="status" className="space-y-2">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
            <p>{state === "joined" ? "Không thấy máy tính — hãy giữ trang mã QR mở trên máy tính." : "Đang nối…"}</p>
          </div>
        )}
        <Button asChild variant="outline"><Link to="/">Về trang chính</Link></Button>
      </div>
    </AppShell>
  );
}
