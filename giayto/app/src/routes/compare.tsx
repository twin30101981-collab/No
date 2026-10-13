import { useQueuedServerFn } from "@/lib/ai-queue";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, ImagePlus, Loader2, Play, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { aiExtract } from "@/lib/ai.functions";
import { analyze, buildRows, reportMarkdown, runOcr, textAgreement, type Metrics, type Verdict } from "@/lib/compare";
import { download } from "@/lib/files";
import { compress, fileToDataUrl, normalize } from "@/lib/image";
import { pickFiles } from "@/lib/importer";
import { showError } from "@/lib/errors";

const TITLE = "So sánh với CamScanner — Ghi Nhanh";
const DESC = "Đo độ nét, nghiêng, chói, tương phản, tốc độ và kết quả AI của cùng một biên bản chụp bằng Ghi Nhanh và CamScanner.";

export const Route = createFileRoute("/compare")({
  head: () => ({ meta: [
    { title: TITLE }, { name: "description", content: DESC },
    { property: "og:title", content: TITLE }, { property: "og:description", content: DESC },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ]}),
  component: Compare,
});

const CONDITIONS = ["Ánh sáng tốt", "Ánh sáng yếu", "Đèn chiếu trực tiếp", "Phản sáng/chói", "Giấy nghiêng", "Giấy cong", "Chữ nhỏ", "Chữ viết tay", "Ảnh hơi mờ", "Khoảng cách xa"];
const VERDICT: Record<Verdict, { text: string; cls: string }> = {
  gn: { text: "Ghi Nhanh", cls: "bg-primary/15 text-primary" },
  cs: { text: "CamScanner", cls: "bg-destructive/15 text-destructive" },
  tie: { text: "Ngang", cls: "bg-muted text-muted-foreground" },
  na: { text: "—", cls: "bg-muted text-muted-foreground" },
};

function Compare() {
  const [gn, setGn] = useState<string>(); const [cs, setCs] = useState<string>();
  const [mg, setMg] = useState<Metrics>(); const [mc, setMc] = useState<Metrics>();
  const [cond, setCond] = useState<string[]>([]);
  const [busy, setBusy] = useState("");
  const extract = useQueuedServerFn(aiExtract, "Trích xuất AI");

  const pick = async (set: (s: string) => void) => {
    try { const [f] = await pickFiles("image/*", false); if (!f) return; set(await normalize(f, 2600, 0.92)); setMg(undefined); setMc(undefined); }
    catch (e) { showError(e, "Không mở được ảnh"); }
  };

  const measure = async () => {
    if (!gn || !cs) { toast.error("Hãy chọn đủ 2 ảnh của cùng một tờ biên bản."); return; }
    try {
      setBusy("Đang đo chất lượng ảnh…"); const [a, b] = await Promise.all([analyze(gn), analyze(cs)]);
      setBusy("Đang đọc chữ (OCR) ảnh Ghi Nhanh…"); const oa = await runOcr(gn).catch(() => ({}));
      setBusy("Đang đọc chữ (OCR) ảnh CamScanner…"); const ob = await runOcr(cs).catch(() => ({}));
      setMg({ ...a, ...oa }); setMc({ ...b, ...ob });
    } catch (e) { showError(e, "Không đo được ảnh"); } finally { setBusy(""); }
  };

  const ai = async () => {
    if (!gn || !cs || !mg || !mc) return;
    const one = async (src: string): Promise<Partial<Metrics>> => {
      const t0 = performance.now();
      try { const r = await extract({ data: { images: [await compress(src, 1600, 0.8)] } });
        if (!r.ok) return { aiError: r.message };
        return { aiFields: r.data.fields.filter((f) => f.value.trim()).length, aiConfidence: r.data.confidence, aiMs: Math.round(performance.now() - t0) };
      } catch (e) { return { aiError: e instanceof Error ? e.message : "Không gọi được AI" }; }
    };
    setBusy("AI đang trích xuất ảnh Ghi Nhanh…"); const a = await one(gn);
    if (a.aiError) { setMg({ ...mg, ...a } as Metrics); setBusy(""); toast.error(a.aiError); return; } // không gọi tiếp khi AI đã báo lỗi
    setBusy("AI đang trích xuất ảnh CamScanner…"); const b = await one(cs);
    setMg({ ...mg, ...a } as Metrics); setMc({ ...mc, ...b } as Metrics); setBusy("");
  };

  const rows = mg && mc ? buildRows(mg, mc) : [];
  const save = () => { if (!mg || !mc) return; download(new Blob([reportMarkdown(cond.join(", "), rows, mg, mc)], { type: "text/markdown" }), `so-sanh-camscanner-${Date.now()}.md`); };

  return (
    <AppShell title="So sánh với CamScanner">
      <div className="space-y-4 px-5 pt-4">
        <p className="text-sm text-muted-foreground">Chụp <b>cùng một tờ biên bản</b>, cùng vị trí và ánh sáng bằng Ghi Nhanh và CamScanner, rồi chọn hai ảnh dưới đây.</p>
        <div className="grid grid-cols-2 gap-3">
          {([["Ghi Nhanh", gn, setGn], ["CamScanner", cs, setCs]] as const).map(([label, src, set]) => (
            <button key={label} onClick={() => pick(set)} className="flex aspect-[3/4] flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-dashed border-border bg-card text-sm">
              {src ? <img src={src} alt={`Ảnh ${label}`} className="h-full w-full object-contain" /> : <><ImagePlus className="size-6 text-muted-foreground" /><span>Ảnh {label}</span></>}
            </button>
          ))}
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Điều kiện chụp</p>
          <div className="flex flex-wrap gap-2">
            {CONDITIONS.map((c) => { const on = cond.includes(c); return (
              <button key={c} onClick={() => setCond(on ? cond.filter((x) => x !== c) : [...cond, c])} className={`rounded-full border px-3 min-h-10 text-xs ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{c}</button>
            ); })}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={measure} disabled={!!busy || !gn || !cs}><Play /> Đo & so sánh</Button>
          <Button variant="secondary" onClick={ai} disabled={!!busy || !mg}><Sparkles /> So sánh AI</Button>
        </div>
        {busy && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />{busy}</p>}

        {rows.length > 0 && mg && mc && (
          <section className="space-y-3 pb-6">
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <table className="w-full text-xs">
                <thead className="bg-muted text-left"><tr><th className="p-2">Tiêu chí</th><th className="p-2">Ghi Nhanh</th><th className="p-2">CamScanner</th><th className="p-2">Tốt hơn</th></tr></thead>
                <tbody>{rows.map((r) => (
                  <tr key={r.key} className="border-t border-border align-top">
                    <td className="p-2 font-medium">{r.label}<div className="font-normal text-muted-foreground">{r.target}</div></td>
                    <td className="p-2">{r.gn}</td><td className="p-2">{r.cs}</td>
                    <td className="p-2"><span className={`rounded-full px-2 py-0.5 ${VERDICT[r.verdict].cls}`}>{VERDICT[r.verdict].text}</span></td>
                  </tr>))}</tbody>
              </table>
            </div>
            <p className="text-sm">Ghi Nhanh thắng <b>{rows.filter((r) => r.verdict === "gn").length}</b> · CamScanner thắng <b>{rows.filter((r) => r.verdict === "cs").length}</b> · Hoà <b>{rows.filter((r) => r.verdict === "tie").length}</b> · Trùng khớp chữ <b>{Math.round(textAgreement(mg.ocrText, mc.ocrText) * 100)}%</b></p>
            <Button variant="outline" className="w-full" onClick={save}><Download /> Tải báo cáo so sánh</Button>
          </section>
        )}
      </div>
    </AppShell>
  );
}
