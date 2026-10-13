import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, Download, ImagePlus, Loader2, PencilRuler, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { CropEditor } from "@/components/crop-editor";
import { pickFiles } from "@/lib/importer";
import { detectQuadFromSrc, fileToDataUrl, loadImg, normalize } from "@/lib/image";
import { checkQuality } from "@/lib/quality";
import { showError } from "@/lib/errors";
import { download } from "@/lib/files";
import { fieldReport, loadField, saveField, type FieldSample } from "@/lib/field-test";
import type { Quad } from "@/lib/db";

export const Route = createFileRoute("/field-test")({
  head: () => ({ meta: [
    { title: "Thử trên điện thoại thật — Ghi Nhanh" },
    { name: "description", content: "Chọn ảnh chụp thật, xem app dò mép giấy đúng hay sai và xuất báo cáo để hiệu chỉnh." },
    { property: "og:title", content: "Thử trên điện thoại thật — Ghi Nhanh" },
    { property: "og:description", content: "Đo độ chính xác dò mép giấy và chất lượng ảnh trên máy của bạn." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ]}),
  component: FieldTest,
});

const poly = (q: Quad) => q.map(([x, y]) => `${x * 100},${y * 100}`).join(" ");

function FieldTest() {
  const [list, setList] = useState<FieldSample[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(0);
  const [edit, setEdit] = useState<FieldSample | null>(null);
  useEffect(() => { setList(loadField()); }, []);
  const commit = (l: FieldSample[]) => { setList(l); saveField(l); };
  const report = useMemo(() => fieldReport(list, typeof navigator === "undefined" ? "" : navigator.userAgent), [list]);

  const add = async () => {
    const files = await pickFiles("image/*", true); if (!files.length) return;
    setBusy(files.length); let cur = list;
    for (const f of files) {
      try {
        const src = await normalize(f, 2000, 0.9);
        const img = await loadImg(src);
        const t0 = performance.now(); const detected = await detectQuadFromSrc(src); const ms = performance.now() - t0;
        const qr = await checkQuality(src, { cropped: false }); const m = qr.metrics;
        const id = crypto.randomUUID();
        setThumbs((t) => ({ ...t, [id]: src }));
        cur = [{ id, name: f.name, width: img.naturalWidth, height: img.naturalHeight, ms, detected, truth: detected, verdict: "pending",
          quality: { score: qr.score, level: qr.level, blur: m.blur, brightness: m.brightness, contrast: m.contrast, glare: m.glare, skew: m.skew } }, ...cur];
        commit(cur);
      } catch (e) { showError(e, `Không đọc được ảnh ${f.name}`); }
      setBusy((b) => b - 1);
    }
  };
  const set = (id: string, p: Partial<FieldSample>) => commit(list.map((s) => (s.id === id ? { ...s, ...p } : s)));
  const exportReport = () => {
    const body = { report, samples: list.map(({ id: _id, ...s }) => s), createdAt: new Date().toISOString() };
    download(new Blob([JSON.stringify(body, null, 2)], { type: "application/json" }), "bao-cao-thu-thuc-te.json");
  };

  return (
    <AppShell title="Thử trên điện thoại thật">
      <div className="space-y-4 p-4">
        <p className="text-sm text-muted-foreground">Chọn vài ảnh tài liệu chụp bằng máy này (cả ảnh khó: nghiêng, tối, nền rối, và 1–2 ảnh không có giấy). Với mỗi ảnh, bấm Đúng, Sửa khung, hoặc Không có giấy. Ảnh chỉ nằm trên máy; báo cáo chỉ gồm con số.</p>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={add} disabled={busy > 0}>{busy > 0 ? <><Loader2 className="animate-spin" /> Còn {busy} ảnh</> : <><ImagePlus /> Thêm ảnh</>}</Button>
          <Button variant="outline" onClick={exportReport} disabled={!list.length}><Download /> Xuất báo cáo</Button>
        </div>
        {list.length > 0 && (
          <div className="rounded-2xl border bg-card p-3 text-sm">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><p className="text-2xl font-semibold">{Math.round(report.hitRate * 100)}%</p><p className="text-xs text-muted-foreground">Dò đúng</p></div>
              <div><p className="text-2xl font-semibold">{report.judged}/{report.total}</p><p className="text-xs text-muted-foreground">Đã chấm</p></div>
              <div><p className="text-2xl font-semibold">{report.medianMs} ms</p><p className="text-xs text-muted-foreground">Thời gian dò</p></div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Sai lệch góc trung bình {(report.meanError * 100).toFixed(1)}% · lớn nhất {(report.worstError * 100).toFixed(1)}% · thấy khung nhầm {report.falseFind}</p>
            {report.suggestions.map((t) => <p key={t} className="mt-1 text-xs text-destructive">• {t}</p>)}
            <Button size="sm" variant="ghost" className="mt-1" onClick={() => { commit([]); setThumbs({}); }}><Trash2 /> Xoá kết quả thử</Button>
          </div>
        )}
        <ul className="space-y-3">
          {list.map((s) => (
            <li key={s.id} className="flex gap-3 rounded-2xl border bg-card p-2">
              <div className="relative w-24 shrink-0">
                {thumbs[s.id] ? <img src={thumbs[s.id]} alt={s.name} className="block w-full rounded-lg" /> : <div className="grid aspect-[3/4] place-items-center rounded-lg bg-muted text-[0.625rem] text-muted-foreground">Ảnh không lưu</div>}
                {thumbs[s.id] && s.detected && <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full"><polygon points={poly(s.detected)} className="scan-quad" /></svg>}
              </div>
              <div className="min-w-0 flex-1 space-y-1 text-xs">
                <p className="truncate font-medium">{s.name}</p>
                <p className="text-muted-foreground">{s.detected ? "Thấy khung" : "Không thấy khung"} · {Math.round(s.ms)} ms · chất lượng {s.quality.score}</p>
                <p className="font-medium">{{ ok: "✓ Đúng", fixed: "Đã sửa khung", nopaper: "Không có giấy", pending: "Chưa chấm" }[s.verdict]}</p>
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="outline" disabled={!s.detected} onClick={() => set(s.id, { verdict: "ok", truth: s.detected })}><Check /> Đúng</Button>
                  <Button size="sm" variant="outline" disabled={!thumbs[s.id]} onClick={() => setEdit(s)}><PencilRuler /> Sửa</Button>
                  <Button size="sm" variant="outline" onClick={() => set(s.id, { verdict: "nopaper", truth: null })}><X /> Không giấy</Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      {edit && thumbs[edit.id] && (
        <CropEditor src={thumbs[edit.id]} quad={edit.truth ?? undefined} onClose={() => setEdit(null)} applyLabel="Lưu khung đúng"
          onApply={(q) => { set(edit.id, { verdict: "fixed", truth: q }); setEdit(null); toast.success("Đã ghi khung đúng"); }} />
      )}
    </AppShell>
  );
}
