import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Assembler, type Part } from "@/lib/pair-transfer";
import { newDoc, newPage, saveDoc } from "@/lib/db";
import { showError } from "@/lib/errors";
import QRCode from "qrcode";
import { FileDown, Laptop, RefreshCw, Smartphone, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { joinRoom, newRoomCode, pairUrl, remaining, type PairPeer } from "@/lib/pair";

export const Route = createFileRoute("/pair")({
  head: () => ({ meta: [
    { title: "Quét bằng điện thoại — Ghi Nhanh" },
    { name: "description", content: "Ghép máy tính với điện thoại bằng mã QR để chụp giấy tờ bằng điện thoại." },
    { property: "og:title", content: "Quét bằng điện thoại — Ghi Nhanh" },
    { property: "og:description", content: "Ghép máy tính với điện thoại bằng mã QR để chụp giấy tờ bằng điện thoại." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ]}),
  component: PairDesktop,
});

function PairDesktop() {
  const [room, setRoom] = useState<{ code: string; created: number } | null>(null);
  const [qr, setQr] = useState("");
  const [peers, setPeers] = useState<PairPeer[]>([]);
  const [now, setNow] = useState(Date.now());
  const [shots, setShots] = useState<{ id: string; src: string }[]>([]);
  const [incoming, setIncoming] = useState(0);
  const asm = useRef(new Assembler());
  const navigate = useNavigate();

  useEffect(() => { setRoom({ code: newRoomCode(), created: Date.now() }); }, []);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => {
    if (!room) return;
    void QRCode.toDataURL(pairUrl(location.origin, room.code, room.created), { margin: 1, width: 320 }).then(setQr);
    setPeers([]);
    asm.current = new Assembler();
    const r = joinRoom(room.code, { role: "desktop", device: "Máy tính" }, setPeers, undefined, (ch) => {
      ch.on("broadcast", { event: "part" }, ({ payload }) => {
        const p = payload as Part;
        const done = asm.current.push(p);
        setIncoming(done ? 0 : asm.current.progress(p.id) ?? 0);
        if (!done) return;
        setShots((l) => (l.some((x) => x.id === done.id) ? l : [...l, { id: done.id, src: done.dataUrl }]));
        void ch.send({ type: "broadcast", event: "ack", payload: { id: done.id } });
      });
    });
    return () => r.leave();
  }, [room]);

  const left = room ? remaining(room.created, now) : 0;
  const phone = peers.find((p) => p.role === "phone");
  const expired = !!room && left === 0 && !phone && shots.length === 0;
  const fresh = () => setRoom({ code: newRoomCode(), created: Date.now() });
  async function saveAll() {
    try {
      const doc = await saveDoc(newDoc(shots.map((x) => newPage(x.src)), undefined, "Từ điện thoại"));
      toast.success(`Đã lưu ${shots.length} trang`);
      navigate({ to: "/doc/$id", params: { id: doc.id } });
    } catch (e) { showError(e, "Không lưu được ảnh"); }
  }

  return (
    <AppShell title="Quét bằng điện thoại">
      <div className="mx-auto max-w-md space-y-4 p-4 text-center">
        <p className="text-[0.95rem] text-muted-foreground">Mở camera trên điện thoại, quét mã dưới đây để nối với máy tính này.</p>
        <div className="mx-auto grid aspect-square w-64 place-items-center rounded-xl border bg-card p-3">
          {expired ? <p className="text-sm text-muted-foreground">Mã đã hết hạn</p> : qr ? <img src={qr} alt="Mã QR ghép điện thoại" className="w-full" /> : <p className="text-sm text-muted-foreground">Đang tạo mã…</p>}
        </div>
        {phone ? (
          <div role="status" className="flex items-center justify-center gap-2 rounded-lg bg-primary/10 p-3 font-medium text-primary">
            <Smartphone className="h-5 w-5" aria-hidden /> Đã nối với {phone.device}
          </div>
        ) : (
          <div role="status" className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Laptop className="h-4 w-4" aria-hidden />
            {expired ? "Tạo mã mới để thử lại" : `Đang chờ điện thoại… mã còn ${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, "0")}`}
          </div>
        )}
        {phone && shots.length === 0 && !incoming && <p className="text-sm text-muted-foreground">Chụp trên điện thoại, ảnh sẽ hiện ở đây ngay.</p>}
        {incoming > 0 && <p role="status" className="text-sm">Đang nhận ảnh… {Math.round(incoming * 100)}%</p>}
        {shots.length > 0 && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {shots.map((x, i) => (
                <div key={x.id} className="relative">
                  <img src={x.src} alt={`Trang ${i + 1} từ điện thoại`} className="aspect-[3/4] w-full rounded-md border object-cover" />
                  <button aria-label={`Bỏ trang ${i + 1}`} onClick={() => setShots((l) => l.filter((y) => y.id !== x.id))} className="absolute right-1 top-1 rounded-full bg-background/90 p-1"><X className="h-3.5 w-3.5" aria-hidden /></button>
                </div>
              ))}
            </div>
            <Button className="w-full" onClick={saveAll}><FileDown className="mr-2 h-4 w-4" aria-hidden />Lưu thành tài liệu ({shots.length} trang)</Button>
          </div>
        )}
        <Button variant="outline" onClick={fresh}><RefreshCw className="mr-2 h-4 w-4" aria-hidden />Tạo mã mới</Button>
        <p className="text-xs text-muted-foreground">Không cần đăng nhập. Phòng chỉ tồn tại khi trang này đang mở; ảnh không lưu trên máy chủ.</p>
      </div>
    </AppShell>
  );
}
