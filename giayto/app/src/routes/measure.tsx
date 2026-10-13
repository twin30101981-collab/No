import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, RotateCcw, Ruler, Undo2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fileToDataUrl, normalize } from "@/lib/image";
import { pickFiles } from "@/lib/importer";
import { showError } from "@/lib/errors";

export const Route = createFileRoute("/measure")({
  head: () => ({ meta: [
    { title: "Đo độ dài — Ghi Nhanh" },
    { name: "description", content: "Đo độ dài vật trong ảnh bằng một vật mẫu quen thuộc như thẻ CCCD hoặc tờ A4." },
    { property: "og:title", content: "Đo độ dài — Ghi Nhanh" },
    { property: "og:description", content: "Đo độ dài vật trong ảnh bằng một vật mẫu quen thuộc như thẻ CCCD hoặc tờ A4." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ]}),
  component: Measure,
});

const REFS = [
  { id: "card", label: "Thẻ CCCD (cạnh dài)", mm: 85.6 },
  { id: "a4w", label: "A4 (cạnh ngắn)", mm: 210 },
  { id: "a4h", label: "A4 (cạnh dài)", mm: 297 },
  { id: "coin", label: "Đồng xu 5.000đ", mm: 25.5 },
  { id: "custom", label: "Tự nhập", mm: 0 },
] as const;

type Pt = { x: number; y: number };
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const fmt = (mm: number) => (mm >= 1000 ? `${(mm / 1000).toFixed(2)} m` : mm >= 100 ? `${(mm / 10).toFixed(1)} cm` : `${mm.toFixed(1)} mm`);

function Measure() {
  const navigate = useNavigate();
  const [img, setImg] = useState<string | null>(null);
  const [refId, setRefId] = useState<(typeof REFS)[number]["id"]>("card");
  const [customMm, setCustomMm] = useState("100");
  const [pts, setPts] = useState<Pt[]>([]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const image = useRef<HTMLImageElement | null>(null);

  const refMm = refId === "custom" ? Number(customMm.replace(",", ".")) || 0 : REFS.find((r) => r.id === refId)!.mm;
  const scale = pts.length >= 2 && refMm > 0 ? refMm / dist(pts[0], pts[1]) : 0;
  const results: number[] = [];
  for (let i = 2; i + 1 < pts.length; i += 2) results.push(dist(pts[i], pts[i + 1]) * scale);

  const load = async (fromCamera: boolean) => {
    try {
      const [f] = await pickFiles("image/*", false, fromCamera ? "environment" : undefined);
      if (!f) return;
      setImg(await normalize(f, 1600)); setPts([]);
    } catch (e) { showError(e, "Không mở được ảnh"); }
  };

  useEffect(() => {
    if (!img) return;
    const el = new Image();
    el.onload = () => { image.current = el; draw(); };
    el.src = img;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [img]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => draw(), [pts, refMm]);

  function draw() {
    const c = canvas.current, el = image.current; if (!c || !el) return;
    c.width = el.naturalWidth; c.height = el.naturalHeight;
    const ctx = c.getContext("2d")!; ctx.drawImage(el, 0, 0);
    const u = Math.max(c.width, c.height) / 400;
    const css = getComputedStyle(document.documentElement);
    const accent = css.getPropertyValue("--primary").trim() || "currentColor";
    const warn = css.getPropertyValue("--destructive").trim() || "currentColor";
    const segs: [Pt, Pt | undefined, string, string][] = [];
    for (let i = 0; i < pts.length; i += 2) {
      const label = i === 0 ? `Mẫu ${fmt(refMm)}` : scale ? fmt(results[i / 2 - 1] ?? 0) : "";
      segs.push([pts[i], pts[i + 1], i === 0 ? warn : accent, label]);
    }
    for (const [a, b, col, label] of segs) {
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2.5 * u;
      if (b) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      for (const p of [a, b]) if (p) { ctx.beginPath(); ctx.arc(p.x, p.y, 5 * u, 0, Math.PI * 2); ctx.fill(); }
      if (b && label) {
        ctx.font = `bold ${14 * u}px sans-serif`;
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, w = ctx.measureText(label).width + 12 * u;
        ctx.fillRect(mx - w / 2, my - 22 * u, w, 18 * u);
        ctx.fillStyle = css.getPropertyValue("--primary-foreground").trim() || "white";
        ctx.textAlign = "center"; ctx.fillText(label, mx, my - 8 * u);
      }
    }
  }

  const tap = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = e.currentTarget, r = c.getBoundingClientRect();
    setPts((p) => [...p, { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height }]);
    navigator.vibrate?.(10);
  };

  const hint = pts.length < 2
    ? `Bước 1: chạm 2 đầu của vật mẫu (${pts.length}/2)`
    : refMm <= 0 ? "Nhập độ dài vật mẫu để tính"
    : pts.length % 2 === 0 ? "Bước 2: chạm 2 đầu của vật cần đo" : "Chạm điểm cuối của vật cần đo";

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
        <header className="flex items-center gap-3">
          <Button variant="ghost" size="icon" aria-label="Đóng" onClick={() => navigate({ to: "/tools" })}><X /></Button>
          <h1 className="font-display text-lg font-semibold">Đo độ dài</h1>
        </header>

        {!img ? (
          <section className="mt-6 space-y-4">
            <div className="rounded-[18px] bg-secondary p-4 text-sm leading-6">
              <p className="flex items-center gap-2 font-semibold"><Ruler className="size-4 text-primary" /> Cách đo</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
                <li>Đặt một vật mẫu (thẻ CCCD, tờ A4…) nằm sát cạnh vật cần đo, cùng mặt phẳng.</li>
                <li>Chụp thẳng từ trên xuống, không nghiêng.</li>
                <li>Chạm 2 đầu vật mẫu, rồi chạm 2 đầu vật cần đo.</li>
              </ol>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button className="h-14" onClick={() => load(true)}><Camera /> Chụp ảnh</Button>
              <Button variant="secondary" className="h-14" onClick={() => load(false)}><ImagePlus /> Chọn ảnh</Button>
            </div>
          </section>
        ) : (
          <section className="mt-3 space-y-3">
            <label className="block text-xs font-semibold text-muted-foreground">Vật mẫu
              <select value={refId} onChange={(e) => setRefId(e.target.value as typeof refId)}
                className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground">
                {REFS.map((r) => <option key={r.id} value={r.id}>{r.label}{r.mm ? ` — ${r.mm} mm` : ""}</option>)}
              </select>
            </label>
            {refId === "custom" && (
              <label className="block text-xs font-semibold text-muted-foreground">Độ dài vật mẫu (mm)
                <input inputMode="decimal" value={customMm} onChange={(e) => setCustomMm(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground" />
              </label>
            )}
            <p className="rounded-lg bg-secondary px-3 py-2 text-sm font-medium">{hint}</p>
            <canvas ref={canvas} onPointerDown={tap} className="w-full touch-none rounded-[14px]" />
            {results.length > 0 && (
              <ul className="space-y-1 rounded-[14px] bg-card p-3 text-sm">
                {results.map((mm, i) => (
                  <li key={i} className="flex justify-between"><span className="text-muted-foreground">Số đo {i + 1}</span><b>{fmt(mm)}</b></li>
                ))}
              </ul>
            )}
            <div className="grid grid-cols-3 gap-2">
              <Button variant="secondary" disabled={!pts.length} onClick={() => setPts((p) => p.slice(0, -1))}><Undo2 /> Hoàn tác</Button>
              <Button variant="secondary" disabled={!pts.length} onClick={() => setPts([])}><RotateCcw /> Đo lại</Button>
              <Button variant="secondary" onClick={() => load(true)}><Camera /> Ảnh mới</Button>
            </div>
            <p className="text-xs text-muted-foreground">Kết quả ước lượng, sai số khoảng 2–5% tuỳ góc chụp. Ảnh không được lưu.</p>
            {results.length > 0 && <Button variant="ghost" className="w-full" onClick={() => { navigator.clipboard?.writeText(results.map((m, i) => `Số đo ${i + 1}: ${fmt(m)}`).join("\n")); toast.success("Đã sao chép số đo"); }}>Sao chép kết quả</Button>}
          </section>
        )}
      </div>
    </main>
  );
}
