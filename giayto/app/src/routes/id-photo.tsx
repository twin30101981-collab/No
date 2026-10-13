import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Printer, Download, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useQueuedServerFn } from "@/lib/ai-queue";
import { aiPersonGreen } from "@/lib/ai.functions";
import { cutoutPerson, type Cutout } from "@/lib/id-photo";
import { BACKGROUNDS, PHOTO_SIZES, SHEETS, renderIdPhoto, renderSheet, tileLayout } from "@/lib/id-photo-layout";
import { pickFiles } from "@/lib/importer";
import { fileToDataUrl, normalize } from "@/lib/image";
import { dataUrlToBlob, download } from "@/lib/files";
import { showError } from "@/lib/errors";

export const Route = createFileRoute("/id-photo")({
  head: () => ({ meta: [
    { title: "Ảnh thẻ — Ghi Nhanh" },
    { name: "description", content: "Tách nền, đổi nền trắng/xanh, cắt ảnh thẻ 3x4, 4x6 và xếp lên khổ in 10x15 hoặc A4." },
    { property: "og:title", content: "Ảnh thẻ — Ghi Nhanh" },
    { property: "og:description", content: "Tách nền, đổi nền, cắt ảnh thẻ 3x4, 4x6 và xếp lên khổ in." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ]}),
  component: IdPhoto,
});

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <Button size="sm" variant={on ? "default" : "outline"} onClick={onClick}>{children}</Button>;
}

function IdPhoto() {
  const aiFn = useQueuedServerFn(aiPersonGreen, "Tách nền ảnh thẻ");
  const [cut, setCut] = useState<Cutout | null>(null);
  const [busy, setBusy] = useState(false);
  const [sizeId, setSizeId] = useState<string>("3x4");
  const [sheetId, setSheetId] = useState<string>("10x15");
  const [bg, setBg] = useState<string>(BACKGROUNDS[0].color);
  const [zoom, setZoom] = useState(1);
  const [shift, setShift] = useState(0);
  const [photo, setPhoto] = useState("");
  const size = PHOTO_SIZES.find((s) => s.id === sizeId)!;
  const sheet = SHEETS.find((s) => s.id === sheetId)!;

  const pick = async () => {
    const [f] = await pickFiles("image/*", false); if (!f) return;
    setBusy(true);
    try {
      const src = await normalize(f);
      const r = await cutoutPerson(src, async (jpeg) => {
        const res = await aiFn({ data: { image: jpeg } });
        if (!res.ok) throw new Error(res.message);
        return res.image;
      });
      setCut(r);
      if (r.via === "local") toast("Đã tách nền không dùng AI — hợp với ảnh chụp trên nền tường phẳng.");
    } catch (e) { showError(e, "Không tách được nền ảnh này"); } finally { setBusy(false); }
  };

  useEffect(() => {
    if (!cut) return; let alive = true;
    renderIdPhoto(cut.png, size, bg, zoom, shift).then((p) => alive && setPhoto(p)).catch((e) => showError(e, "Không dựng được ảnh thẻ"));
    return () => { alive = false; };
  }, [cut, size, bg, zoom, shift]);

  const saveSheet = async (pdf: boolean) => {
    if (!photo) return;
    const r = await renderSheet(photo, sheet, size);
    if (pdf) { const { jsPDF } = await import("jspdf"); const doc = new jsPDF({ unit: "mm", format: [sheet.wMm, sheet.hMm] }); doc.addImage(r.jpeg, "JPEG", 0, 0, sheet.wMm, sheet.hMm); download(doc.output("blob"), `anh-the-${size.id}-${sheet.id}.pdf`); }
    else download(await dataUrlToBlob(r.jpeg), `anh-the-${size.id}-${sheet.id}.jpg`);
    toast.success(`Đã lưu khổ in ${r.count} ảnh`);
  };

  const count = tileLayout(sheet, size).count;

  return (
    <AppShell title="Ảnh thẻ">
      <div className="mx-auto max-w-xl space-y-5 p-4">
        <Button className="w-full" onClick={pick} disabled={busy}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
          {busy ? "Đang tách nền…" : cut ? "Chọn ảnh khác" : "Chọn ảnh chân dung"}
        </Button>

        {photo && (
          <div className="flex justify-center">
            <img src={photo} alt="Ảnh thẻ xem trước" className="max-h-72 rounded-md border border-border shadow-sm" />
          </div>
        )}

        <section className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Cỡ ảnh</h3>
          <div className="flex flex-wrap gap-2">{PHOTO_SIZES.map((s) => <Chip key={s.id} on={s.id === sizeId} onClick={() => setSizeId(s.id)}>{s.label}</Chip>)}</div>
        </section>
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Màu nền</h3>
          <div className="flex flex-wrap gap-2">{BACKGROUNDS.map((b) => (
            <button key={b.id} onClick={() => setBg(b.color)} aria-label={b.label} title={b.label}
              className={`h-10 w-10 rounded-full border-2 ${bg === b.color ? "border-primary" : "border-border"}`} style={{ background: b.color }} />
          ))}</div>
        </section>
        {cut && (
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Phóng to / dời lên xuống</h3>
            <Slider min={0.7} max={1.5} step={0.01} value={[zoom]} onValueChange={([v]) => setZoom(v)} aria-label="Phóng to" />
            <Slider min={-0.2} max={0.2} step={0.01} value={[shift]} onValueChange={([v]) => setShift(v)} aria-label="Dời lên xuống" />
          </section>
        )}
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Khổ in ({count} ảnh)</h3>
          <div className="flex flex-wrap gap-2">{SHEETS.map((s) => <Chip key={s.id} on={s.id === sheetId} onClick={() => setSheetId(s.id)}>{s.label}</Chip>)}</div>
        </section>

        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" disabled={!photo} onClick={async () => photo && download(await dataUrlToBlob(photo), `anh-the-${size.id}.jpg`)}><Download className="mr-1 h-4 w-4" />Ảnh lẻ</Button>
          <Button variant="outline" disabled={!photo} onClick={() => saveSheet(false).catch((e) => showError(e, "Không lưu được"))}><Printer className="mr-1 h-4 w-4" />Khổ in JPG</Button>
          <Button disabled={!photo} onClick={() => saveSheet(true).catch((e) => showError(e, "Không lưu được"))}><Printer className="mr-1 h-4 w-4" />Khổ in PDF</Button>
        </div>
      </div>
    </AppShell>
  );
}
