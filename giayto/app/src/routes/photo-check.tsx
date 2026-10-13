import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Camera, ImagePlus, Loader2, Sun, Focus, Sparkle, RectangleHorizontal, Lightbulb } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQueuedServerFn } from "@/lib/ai-queue";
import { aiPhotoCheck } from "@/lib/ai.functions";
import { pickFiles } from "@/lib/importer";
import { fileToDataUrl, normalize } from "@/lib/image";
import { showError } from "@/lib/errors";
import type { PhotoCheck as Result } from "@/lib/ai.server";

export const Route = createFileRoute("/photo-check")({
  head: () => ({ meta: [
    { title: "Đánh giá ảnh chụp — Ghi Nhanh" },
    { name: "description", content: "AI chấm độ rõ, ánh sáng, độ chói và góc chụp của ảnh tài liệu, rồi gợi ý cách chụp lại tốt hơn." },
    { property: "og:title", content: "Đánh giá ảnh chụp — Ghi Nhanh" },
    { property: "og:description", content: "Chấm độ rõ, ánh sáng, độ chói, góc chụp và gợi ý chụp lại." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ]}),
  component: PhotoCheckPage,
});

const ROWS = [
  { k: "sharpness", label: "Độ rõ nét", icon: Focus },
  { k: "lighting", label: "Ánh sáng", icon: Sun },
  { k: "glare", label: "Độ chói (ít loá)", icon: Sparkle },
  { k: "angle", label: "Góc chụp", icon: RectangleHorizontal },
] as const;

const clamp10 = (n: number) => Math.max(0, Math.min(10, Math.round(n * 10) / 10));
const tone = (s: number) => (s >= 7.5 ? "text-primary" : s >= 5 ? "text-foreground" : "text-destructive");

function PhotoCheckPage() {
  const fn = useQueuedServerFn(aiPhotoCheck, "Đánh giá ảnh chụp");
  const [src, setSrc] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);

  const take = async (capture?: "environment") => {
    const [f] = await pickFiles("image/*", false, capture); if (!f) return;
    setBusy(true); setRes(null);
    try {
      const img = await normalize(f, 1600, 0.85);
      setSrc(img);
      const r = await fn({ data: { image: img } });
      if (!r.ok) throw new Error(r.message);
      setRes(r.data);
    } catch (e) { showError(e, "Không đánh giá được ảnh này"); } finally { setBusy(false); }
  };

  return (
    <AppShell title="Đánh giá ảnh chụp">
      <div className="space-y-4 px-4 pb-8">
        <p className="text-sm text-muted-foreground">Tải ảnh tài liệu lên, AI sẽ chấm độ rõ, ánh sáng, độ chói, góc chụp và gợi ý cách chụp lại.</p>
        <div className="grid grid-cols-2 gap-2">
          <Button disabled={busy} onClick={() => take("environment")}><Camera /> Chụp ảnh</Button>
          <Button variant="glass" disabled={busy} onClick={() => take()}><ImagePlus /> Chọn ảnh</Button>
        </div>

        {src && <img src={src} alt="Ảnh đang đánh giá" className="max-h-72 w-full rounded-xl border object-contain" />}
        {busy && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> AI đang xem ảnh…</p>}

        {res && (
          <section className="space-y-4 rounded-2xl border bg-card p-4">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-lg font-semibold">Tổng điểm</h2>
              <span className={`font-display text-3xl font-bold ${tone(res.overall)}`}>{clamp10(res.overall)}<span className="text-base text-muted-foreground">/10</span></span>
            </div>
            <p className="text-sm">{res.verdict}</p>
            <ul className="space-y-3">
              {ROWS.map(({ k, label, icon: Icon }) => {
                const c = res[k]; const s = clamp10(c.score);
                return (
                  <li key={k} className="space-y-1">
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span className="flex items-center gap-2"><Icon className="size-4" /> {label}</span>
                      <span className={tone(s)}>{s}/10</span>
                    </div>
                    <Progress value={s * 10} />
                    <p className="text-xs text-muted-foreground">{c.note}</p>
                  </li>
                );
              })}
            </ul>
            {res.tips.length > 0 && (
              <div className="rounded-xl bg-muted p-3">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Lightbulb className="size-4" /> Cách chụp lại tốt hơn</h3>
                <ol className="list-decimal space-y-1 pl-5 text-sm">{res.tips.map((t, i) => <li key={i}>{t}</li>)}</ol>
              </div>
            )}
            <Button variant="glass" className="w-full" disabled={busy} onClick={() => take("environment")}><Camera /> Chụp lại</Button>
          </section>
        )}
      </div>
    </AppShell>
  );
}
