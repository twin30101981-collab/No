import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Camera, ImagePlus, Loader2, Trash2, AlertTriangle, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQueuedServerFn } from "@/lib/ai-queue";
import { aiReceipt } from "@/lib/ai.functions";
import { pickFiles } from "@/lib/importer";
import { fileToDataUrl, normalize } from "@/lib/image";
import { showError } from "@/lib/errors";
import { download } from "@/lib/files";
import { sheetsToXlsx } from "@/lib/xlsx";
import { CATEGORIES, expenseSheets, formatVnd, loadReceipts, monthTotals, normalizeReceipt, parseAmount, saveReceipts, type Receipt } from "@/lib/receipt";

export const Route = createFileRoute("/receipts")({
  head: () => ({ meta: [
    { title: "Hoá đơn & Biên lai — Ghi Nhanh" },
    { name: "description", content: "Chụp hoá đơn, biên lai: AI tự đọc tổng tiền, ngày và nhóm chi tiêu, lưu thành sổ chi tiêu theo tháng." },
    { property: "og:title", content: "Hoá đơn & Biên lai — Ghi Nhanh" },
    { property: "og:description", content: "Chụp hoá đơn, tự đọc tổng tiền và ngày, cộng chi tiêu theo tháng." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ]}),
  component: Receipts,
});

type Draft = { merchant: string; total: string; date: string; category: string; thumb: string; unsure: boolean };

function Receipts() {
  const fn = useQueuedServerFn(aiReceipt, "Đọc hoá đơn");
  const [list, setList] = useState<Receipt[]>([]);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  useEffect(() => { setList(loadReceipts()); }, []);
  const commit = (l: Receipt[]) => { setList(l); saveReceipts(l); };

  const take = async (capture?: "environment") => {
    const [f] = await pickFiles("image/*", false, capture); if (!f) return;
    setBusy(true);
    try {
      const src = await normalize(f, 1600, 0.85);
      const thumb = await normalize(src, 160, 0.6);
      const res = await fn({ data: { image: src } });
      if (!res.ok) throw new Error(res.message);
      const n = normalizeReceipt(res.data);
      setDraft({ merchant: n.merchant, total: n.total != null ? String(n.total) : "", date: n.date, category: n.category, thumb, unsure: n.unsure });
    } catch (e) { showError(e, "Không đọc được hoá đơn này"); } finally { setBusy(false); }
  };

  const save = () => {
    if (!draft) return;
    const total = parseAmount(draft.total);
    if (total == null || !draft.date) { toast("Hãy nhập tổng tiền và ngày trước khi lưu."); return; }
    commit([{ id: crypto.randomUUID(), merchant: draft.merchant || "Không rõ", total, date: draft.date, category: draft.category, thumb: draft.thumb, createdAt: Date.now() }, ...list]);
    setDraft(null); toast.success("Đã lưu vào sổ chi tiêu");
  };

  const months = monthTotals(list);
  const exportXlsx = (month?: string) => {
    try {
      download(sheetsToXlsx(expenseSheets(list, month ? [month] : [])), month ? `chi-tieu-${month}.xlsx` : "so-chi-tieu.xlsx");
      toast.success("Đã xuất bảng chi tiêu Excel");
    } catch (e) { showError(e, "Không xuất được Excel"); }
  };

  return (
    <AppShell title="Hoá đơn & Biên lai">
      <div className="mx-auto max-w-xl space-y-5 p-4">
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => take("environment")} disabled={busy}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}{busy ? "Đang đọc…" : "Chụp hoá đơn"}</Button>
          <Button variant="outline" onClick={() => take()} disabled={busy}><ImagePlus className="mr-2 h-4 w-4" />Chọn ảnh</Button>
        </div>

        {draft && (
          <section className="space-y-3 rounded-lg border border-border bg-card p-4">
            <div className="flex gap-3">
              <img src={draft.thumb} alt="Hoá đơn" className="h-20 w-16 rounded object-cover" />
              <div className="flex-1 space-y-2">
                <Input value={draft.merchant} placeholder="Cửa hàng" onChange={(e) => setDraft({ ...draft, merchant: e.target.value })} />
                <Input value={draft.total} inputMode="numeric" placeholder="Tổng tiền (đồng)" onChange={(e) => setDraft({ ...draft, total: e.target.value })} />
                <Input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">{CATEGORIES.map((c) => <Button key={c} size="sm" variant={draft.category === c ? "default" : "outline"} onClick={() => setDraft({ ...draft, category: c })}>{c}</Button>)}</div>
            {draft.unsure && <p className="flex items-center gap-2 text-sm text-destructive"><AlertTriangle className="h-4 w-4" />AI chưa chắc — hãy kiểm tra tổng tiền và ngày.</p>}
            <div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => setDraft(null)}>Bỏ</Button><Button onClick={save}>Lưu</Button></div>
          </section>
        )}

        {list.length > 0 && <Button variant="outline" className="w-full" onClick={() => exportXlsx()}><FileSpreadsheet className="mr-2 h-4 w-4" />Xuất Excel tất cả các tháng</Button>}
        {months.map((m) => (
          <section key={m.month} className="space-y-2">
            <h3 className="flex justify-between text-sm font-medium text-muted-foreground"><span>Tháng {m.month.split("-").reverse().join("/")} · {m.count} hoá đơn</span><span className="flex items-center gap-1">{formatVnd(m.total)}{m.month !== "Không rõ" && <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={`Xuất Excel tháng ${m.month}`} onClick={() => exportXlsx(m.month)}><FileSpreadsheet className="h-4 w-4" /></Button>}</span></h3>
            {list.filter((r) => (r.date.slice(0, 7) || "Không rõ") === m.month).map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-md border border-border p-2">
                {r.thumb && <img src={r.thumb} alt="" className="h-12 w-10 rounded object-cover" />}
                <div className="min-w-0 flex-1"><p className="truncate font-medium">{r.merchant}</p><p className="text-xs text-muted-foreground">{r.date.split("-").reverse().join("/")} · {r.category}</p></div>
                <span className="font-semibold">{formatVnd(r.total)}</span>
                <Button size="icon" variant="ghost" aria-label="Xoá" onClick={() => commit(list.filter((x) => x.id !== r.id))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </section>
        ))}
        {!list.length && !draft && <p className="text-center text-sm text-muted-foreground">Chưa có hoá đơn nào. Chụp hoá đơn để AI tự đọc tổng tiền và ngày.</p>}
      </div>
    </AppShell>
  );
}
