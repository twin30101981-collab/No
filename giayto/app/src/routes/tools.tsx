import { pmapOrdered } from "@/lib/pmap";
import { useQueuedServerFn } from "@/lib/ai-queue";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import {
  BookOpen, BookUser, Combine, FileArchive, FileImage, FileLock2, FileSpreadsheet, FileText, FileType2, Hash, Highlighter,
  IdCard, ImagePlus, Languages, ListOrdered, Loader2, PenLine, QrCode, RotateCw, ScanLine, Scissors,
  Sparkles, Stamp, Upload, Wand2,
  ScanText, Ruler, ClipboardList, History, Receipt, Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { showError } from "@/lib/errors";
import { AppShell } from "@/components/app-shell";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { compress, countObjects, fileToDataUrl, normalize } from "@/lib/image";
import { download, imagesToPdf, mergePdfs, parsePages, pdfPageCount, pdfToImages, reorderPdf, rotatePdf, safeName, splitPdf, textToWord, watermarkPdf, dataUrlToBlob } from "@/lib/files";
import { promptDialog } from "@/lib/dialog";
import { readCodeFromDataUrl } from "@/lib/qr";
import { sheetsToXlsx, textToRows } from "@/lib/xlsx";
import { aiLayout, aiTable } from "@/lib/ai.functions";
import { imagesToWord } from "@/lib/word";
import { pickFiles, useImport } from "@/lib/importer";
import { recognize } from "@/lib/ocr";
import { ExportReview } from "@/components/export-review";
import type { Review } from "@/lib/review";
import { pdfPagesToExcel, pdfPagesToWord, readPdf, type ConvertStep } from "@/lib/pdf-convert";
import { imagesToTables } from "@/lib/batch";
import { readXlsx, XlsxError } from "@/lib/xlsx-read";
import { block } from "@/lib/docx";
import { PdfFormFiller } from "@/components/pdf-form-filler";
import { readFormFields, type FormField } from "@/lib/pdf-form";
import { ConvertGuide, ConvertProgress, type ConvertState } from "@/components/convert-progress";
import { PdfAnnotator } from "@/components/pdf-annotator";
// HM-09: ký số kéo theo node-forge + pdf-lib (~0,5 MB) → chỉ nạp khi người dùng mở/kiểm chữ ký.
// Tải trước khi rảnh (không chặn lần hiển thị đầu) để service worker kịp lưu → vẫn dùng được khi mất mạng; bỏ qua nếu bật tiết kiệm dữ liệu.
function prefetchSigning() {
  if ((navigator as { connection?: { saveData?: boolean } }).connection?.saveData) return () => {};
  const id = window.setTimeout(() => { void import("@/components/digital-sign-dialog"); void import("@/lib/pdf-sign"); }, 4000);
  return () => window.clearTimeout(id);
}
const DigitalSignDialog = lazy(() => import("@/components/digital-sign-dialog").then((m) => ({ default: m.DigitalSignDialog })));

export const Route = createFileRoute("/tools")({
  head: () => ({ meta: [
    { title: "Công cụ — Ghi Nhanh" },
    { name: "description", content: "Ghép, tách, nén, ký, đặt mật khẩu PDF; chuyển ảnh sang Word, Excel; quét thẻ, sách, mã QR." },
    { property: "og:title", content: "Công cụ — Ghi Nhanh" },
    { property: "og:description", content: "Ghép, tách, nén, ký, đặt mật khẩu PDF; chuyển ảnh sang Word, Excel; quét thẻ, sách, mã QR." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ]}),
  component: Tools,
});

type Tool = { label: string; icon: React.ComponentType<{ className?: string }>; run?: () => Promise<void> | void; ai?: boolean };

function Tools() {
  useEffect(prefetchSigning, []);
  const navigate = useNavigate();
  const importFiles = useImport();
  const [busy, setBusy] = useState("");
  const [review, setReview] = useState<Review | null>(null);
  const [conv, setConv] = useState<ConvertState | null>(null);
  const startConv = (title: string) => setConv({ title, step: 1, done: 0, total: 1, label: "Đang chuẩn bị…", startedAt: Date.now() });
  const onStep = (s: ConvertStep) => setConv((c) => c && { ...c, step: s.step === "build" ? 3 : 2, done: s.done, total: s.total, label: s.label });
  const building = () => setConv((c) => c && { ...c, step: 3, done: 1, total: 1, label: "Đang dựng tệp…" });
  const [form, setForm] = useState<{ file: File; fields: FormField[] } | null>(null);
  const [digitalSign, setDigitalSign] = useState(false);
  const [annotationFile, setAnnotationFile] = useState<File | null>(null);
  const [result, setResult] = useState<{ title: string; image?: string; text?: string } | null>(null);

  const work = (label: string, fn: () => Promise<void>) => async () => {
    setBusy(label);
    try { await fn(); } catch (e) { console.error(e); showError(e, "Không xử lý được tập tin này"); } finally { setBusy(""); setConv(null); }
  };
  const scan = (mode: "doc" | "id" | "book" | "passport" | "qr") => () => navigate({ to: "/scan", search: { mode } });
  const pdfTool = (tool: string) => () => importFiles("application/pdf,image/*", "PDF", tool);
  const tableFn = useQueuedServerFn(aiTable, "Đọc bảng");
  const layoutFn = useQueuedServerFn(aiLayout, "Đọc bố cục");
  const base = (f: File) => safeName(f.name.replace(/\.[^.]+$/, ""));
  const pickPdf = async () => (await pickFiles("application/pdf", false))[0];
  const ocrFile = async () => { const [f] = await pickFiles("image/*,application/pdf", false); if (!f) return null; const src = f.type === "application/pdf" ? (await pdfToImages(f))[0] : await normalize(f); return { f, text: await recognize(src) }; };

  const groups: { title: string; tools: Tool[] }[] = [
    { title: "Quét", tools: [
      { label: "Tài liệu", icon: ScanLine, run: scan("doc") }, { label: "Thẻ ID", icon: IdCard, run: scan("id") },
      { label: "Sách", icon: BookOpen, run: scan("book") }, { label: "Hộ chiếu", icon: BookUser, run: scan("passport") },
      { label: "Mã QR", icon: QrCode, run: scan("qr") },
      { label: "Ảnh thẻ", icon: IdCard, run: () => navigate({ to: "/id-photo" }) },
      { label: "Hoá đơn / Biên lai", icon: Receipt, run: () => navigate({ to: "/receipts" }) },
      { label: "Đánh giá ảnh chụp", icon: Sparkles, ai: true, run: () => navigate({ to: "/photo-check" }) },
      { label: "So với CamScanner", icon: Combine, run: () => navigate({ to: "/compare" }) },
      { label: "Thử trên điện thoại thật", icon: Smartphone, run: () => navigate({ to: "/field-test" }) },
      { label: "QR từ ảnh", icon: QrCode, run: work("QR từ ảnh", async () => {
        const [f] = await pickFiles("image/*", false); if (!f) return;
        const v = await readCodeFromDataUrl(await fileToDataUrl(f));
        if (!v) { toast("Không tìm thấy mã QR trong ảnh này. Hãy chụp gần và rõ hơn."); return; }
        setResult({ title: "Nội dung mã QR", text: v });
      })},
    ]},
    { title: "Nhập", tools: [
      { label: "Nhập ảnh", icon: ImagePlus, run: () => importFiles("image/*", "Ảnh") },
      { label: "Nhập PDF", icon: Upload, run: () => importFiles("application/pdf", "PDF") },
    ]},
    { title: "Chuyển đổi", tools: [
      { label: "Ảnh → PDF", icon: FileText, run: work("Ảnh → PDF", async () => {
        const files = await pickFiles("image/*"); if (!files.length) return;
        const srcs = await Promise.all(files.map(async (f) => normalize(f)));
        download(await imagesToPdf(srcs, { searchable: true }), "anh-sang-pdf.pdf"); toast.success("Đã tạo PDF");
      })},
      { label: "PDF → Ảnh", icon: FileImage, run: work("PDF → Ảnh", async () => {
        const [f] = await pickFiles("application/pdf", false); if (!f) return;
        const imgs = await pdfToImages(f);
        for (const [i, src] of imgs.entries()) download(await dataUrlToBlob(src), `${safeName(f.name.replace(/\.pdf$/i, ""))}-${i + 1}.jpg`);
        toast.success(`Đã lưu ${imgs.length} ảnh`);
      })},
      { label: "Ảnh → Word", icon: FileType2, run: work("Ảnh → Word", async () => {
        const files = await pickFiles("image/*,application/pdf"); if (!files.length) return;
        const srcs: string[] = [];
        await pmapOrdered(files, 3, (f) => f.type === "application/pdf" ? pdfToImages(f, 1.6) : normalize(f).then((x) => [x]), (r) => { srcs.push(...r); });
        const r = await imagesToWord(srcs, base(files[0]), layoutFn);
        setReview({ kind: "word", title: r.title, blocks: r.blocks, note: r.note, source: { kind: "Ảnh → Word", name: files[0].name, blob: files[0] } });
      })},
      { label: "PDF → Word", icon: FileType2, run: work("PDF → Word", async () => {
        const f = await pickPdf(); if (!f) return; startConv("PDF → Word");
        const pages = await readPdf(f, { onStep, warn: (m) => toast(m) }); const n = pages.filter((p) => p.ocr).length;
        building(); const r = pdfPagesToWord(pages, base(f));
        setReview({ kind: "word", title: base(f), blocks: r.blocks, source: { kind: "PDF → Word", name: f.name, blob: f }, note: n ? `${pages.length} trang · ${n} trang ảnh được nhận chữ` : `${pages.length} trang · lấy chữ trực tiếp từ PDF` });
      })},
      { label: "PDF → Excel", icon: FileSpreadsheet, run: work("PDF → Excel", async () => {
        const f = await pickPdf(); if (!f) return; startConv("PDF → Excel");
        const pages = await readPdf(f, { onStep, table: tableFn, warn: (m) => toast(m) });
        const n = pages.filter((p) => p.ocr).length, ai = pages.filter((p) => p.ai).length;
        building(); const r = pdfPagesToExcel(pages);
        setReview({ kind: "excel", title: base(f), sheets: r.sheets, source: { kind: "PDF → Excel", name: f.name, blob: f }, note: n ? `${pages.length} trang · ${ai ? `${ai} trang ảnh đọc bảng bằng AI` : `${n} trang ảnh được nhận chữ`}` : `${pages.length} trang · lấy chữ trực tiếp từ PDF` });
      })},
      { label: "Ảnh → Excel", icon: FileSpreadsheet, run: work("Ảnh → Excel", async () => {
        const files = await pickFiles("image/*,application/pdf"); if (!files.length) return; startConv("Ảnh → Excel");
        const srcs: string[] = [];
        await pmapOrdered(files, 3, (f) => f.type === "application/pdf" ? pdfToImages(f, 2) : normalize(f, 2400).then((x) => [x]), (r) => { srcs.push(...r); });
        const pages = srcs.slice(0, 12); let title = base(files[0]);
        onStep({ step: "scan", done: 0, total: pages.length, label: `Đang đọc ${pages.length} trang` });
        const tables = await imagesToTables(pages, tableFn, (m) => toast(m), (d, t) => onStep({ step: "scan", done: d, total: t, label: `Đã đọc ${d}/${t} trang` }));
        if (tables[0]?.title) title = tables[0].title;
        building();
        const sheets = tables.map((t, i) => ({ name: pages.length > 1 ? `Trang ${i + 1}` : t.title || "Bang", rows: t.rows }));
        if (srcs.length > pages.length) toast(`Chỉ lấy ${pages.length} trang đầu.`);
        setReview({ kind: "excel", title, sheets, source: { kind: "Ảnh → Excel", name: files[0].name, blob: files[0] } });
      })},
      { label: "Excel → Word", icon: FileType2, run: work("Excel → Word", async () => {
        const [f] = await pickFiles(".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel", false); if (!f) return;
        let sheets;
        try { sheets = await readXlsx(f); } catch (e) { console.error(e); throw e instanceof XlsxError ? e : new XlsxError(String(e)); }
        const full = sheets.filter((s) => s.rows.length), empty = sheets.length - full.length;
        if (!full.length) throw new XlsxError("empty");
        if (empty) toast(`Bỏ qua ${empty} sheet trống.`);
        const blocks = full.flatMap((s) => [block("heading", s.name, { level: 2 }), block("table", "", { rows: s.rows, merges: s.merges, red: s.red })]);
        setReview({ kind: "word", title: base(f), blocks, note: `${full.length} sheet · giữ ô gộp và định dạng số`, source: { kind: "Excel → Word", name: f.name, blob: f } });
      })},
      { label: "Lịch sử chuyển đổi", icon: History, run: () => navigate({ to: "/tools/history" }) },
    ]},
    { title: "Chỉnh sửa PDF", tools: [
      { label: "Ghép PDF", icon: Combine, run: work("Ghép PDF", async () => {
        const files = await pickFiles("application/pdf"); if (files.length < 2) { if (files.length) toast("Chọn ít nhất 2 tập tin PDF"); return; }
        download(await mergePdfs(files), "da-ghep.pdf"); toast.success(`Đã ghép ${files.length} tập tin`);
      })},
      { label: "Tách PDF", icon: Scissors, run: work("Tách PDF", async () => {
        const [f] = await pickFiles("application/pdf", false); if (!f) return;
        const parts = await splitPdf(f); parts.forEach((b, i) => download(b, `${safeName(f.name.replace(/\.pdf$/i, ""))}-trang-${i + 1}.pdf`));
        toast.success(`Đã tách thành ${parts.length} tập tin`);
      })},
      { label: "Nén PDF", icon: FileArchive, run: work("Nén PDF", async () => {
        const [f] = await pickFiles("application/pdf", false); if (!f) return;
        const imgs = await Promise.all((await pdfToImages(f, 1.4, 0.7)).map((s) => compress(s)));
        const out = await imagesToPdf(imgs, { size: "small" }); download(out, `${safeName(f.name.replace(/\.pdf$/i, ""))}-nen.pdf`);
        toast.success(`Đã nén: ${(f.size / 1e6).toFixed(1)} MB → ${(out.size / 1e6).toFixed(1)} MB`);
      })},
      { label: "Xoay trang", icon: RotateCw, run: work("Xoay trang", async () => {
        const f = await pickPdf(); if (!f) return; const n = await pdfPageCount(f);
        const v = await promptDialog("Xoay trang nào?", { message: `Tệp có ${n} trang. Giữ nguyên để xoay tất cả, hoặc nhập ví dụ 1,3-4. Mỗi lần xoay 90° theo chiều kim đồng hồ.`, defaultValue: n > 1 ? `1-${n}` : "1", okText: "Xoay" });
        if (v == null) return;
        download(await rotatePdf(f, 90, parsePages(v, n)), `${base(f)}-xoay.pdf`); toast.success("Đã xoay — chữ vẫn giữ nguyên chất lượng");
      })},
      { label: "Sắp trang", icon: ListOrdered, run: work("Sắp trang", async () => {
        const f = await pickPdf(); if (!f) return; const n = await pdfPageCount(f);
        const v = await promptDialog("Thứ tự trang mới", { message: `Tệp có ${n} trang. Nhập thứ tự mong muốn, ví dụ 3,1,2 hoặc 1-5,8. Trang không ghi sẽ bị bỏ.`, defaultValue: n > 1 ? `1-${n}` : "1", okText: "Tạo tệp" });
        if (v == null) return; const order = parsePages(v, n);
        if (!order.length) { toast("Chưa nhập số trang hợp lệ"); return; }
        download(await reorderPdf(f, order), `${base(f)}-sap-xep.pdf`); toast.success(`Đã tạo tệp ${order.length} trang`);
      })},
      { label: "Mật khẩu", icon: FileLock2, run: pdfTool("export") },
      { label: "Hình mờ", icon: Stamp, run: work("Hình mờ", async () => {
        const f = await pickPdf(); if (!f) return;
        const v = await promptDialog("Chữ hình mờ", { defaultValue: "BẢN SAO", okText: "Đóng dấu" });
        if (!v?.trim()) return;
        download(await watermarkPdf(f, v.trim()), `${base(f)}-hinh-mo.pdf`); toast.success("Đã đóng hình mờ lên mọi trang");
      })},
      { label: "Điền biểu mẫu", icon: ClipboardList, run: work("Điền biểu mẫu", async () => {
        const f = await pickPdf(); if (!f) return;
        const fields = await readFormFields(f);
        setForm({ file: f, fields });
      })},
      { label: "Ký tên", icon: PenLine, run: pdfTool("sign") }, { label: "Ký số", icon: FileLock2, run: () => setDigitalSign(true) }, { label: "Kiểm tra chữ ký", icon: FileLock2, run: work("Kiểm tra chữ ký", async () => {
        const f = await pickPdf(); if (!f) return;
        const { verifyPdfSignature } = await import("@/lib/pdf-sign");
        const r = verifyPdfSignature(new Uint8Array(await f.arrayBuffer()));
        const head = { valid: "✅ HỢP LỆ", modified: "⚠️ ĐÃ BỊ SỬA", invalid: "❌ KHÔNG HỢP LỆ", none: "— KHÔNG CÓ CHỮ KÝ" }[r.status];
        const lines = [head, r.message];
        if (r.signer) lines.push(`Người ký: ${r.signer}`);
        if (r.signedAt) lines.push(`Thời điểm ký: ${r.signedAt.toLocaleString("vi-VN")}`);
        setResult({ title: `Chữ ký số — ${f.name}`, text: lines.join("\n") });
      })}, { label: "Chú thích", icon: Highlighter, run: work("Chú thích", async () => { const f = await pickPdf(); if (f) setAnnotationFile(f); }) },
    ]},
    { title: "Tiện ích", tools: [
      { label: "Đếm số vật", icon: Hash, run: work("Đếm số vật", async () => {
        const [f] = await pickFiles("image/*", false); if (!f) return;
        const r = await countObjects(await normalize(f, 1600));
        setResult({ title: `Đếm được ${r.count} vật`, image: r.image });
      })},
      { label: "Lọc ảnh tự động", icon: Wand2, run: pdfTool("filter") },
      { label: "Đo độ dài", icon: Ruler, run: () => navigate({ to: "/measure" }) },
      { label: "Quét bằng điện thoại", icon: Smartphone, run: () => navigate({ to: "/pair" }) },
    ]},
    { title: "Trợ lý AI", tools: [
      { label: "Trích xuất AI", icon: ScanText, ai: true, run: () => importFiles("image/*,application/pdf", "Ảnh", "ai-extract") },
      { label: "Dịch văn bản", icon: Languages, ai: true, run: () => importFiles("image/*,application/pdf", "Ảnh", "ai-translate") },
      { label: "Giải bài tập", icon: Sparkles, ai: true, run: () => importFiles("image/*", "Bài tập", "ai-solve") },
      { label: "Tóm tắt", icon: FileText, ai: true, run: () => importFiles("image/*,application/pdf", "Ảnh", "ai-summarize") },
    ]},
  ];

  return (
    <AppShell wide title="Công cụ">
      {groups.map((g, gi) => (
        <section key={g.title} className={`rise px-5 pt-5`} style={{ animationDelay: `${gi * 0.04}s` }}>
          <h2 className="font-display text-[0.8125rem] font-semibold text-muted-foreground">{g.title}</h2>
          {g.title === "Chuyển đổi" && <ConvertGuide />}
          <div className="mt-2.5 grid grid-cols-4 gap-2 lg:grid-cols-8">
            {g.tools.map(({ label, icon: Icon, run, ai }) => (
              <button key={label} disabled={!!busy} onClick={() => run?.()}
                className="shortcut-tile relative flex h-[78px] min-w-0 flex-col items-center justify-center gap-1.5 rounded-[14px] px-1 active:scale-95 disabled:opacity-60">
                <span className="grid size-9 place-items-center rounded-[10px] bg-secondary text-primary">{busy === label ? <Loader2 className="size-[18px] animate-spin" /> : <Icon className="size-[18px]" />}</span>
                <span className="w-full truncate text-center text-[0.65625rem] font-semibold">{label}</span>
                {ai && <span className="absolute right-1 top-1 rounded bg-primary px-1 text-[0.5rem] font-bold text-primary-foreground">AI</span>}
              </button>
            ))}
          </div>
        </section>
      ))}
      <ConvertProgress state={conv} />
      {form && <PdfFormFiller file={form.file} fields={form.fields} onClose={() => setForm(null)} />}
      {annotationFile && <PdfAnnotator file={annotationFile} onClose={() => setAnnotationFile(null)} />}
      {digitalSign && <Suspense fallback={null}><DigitalSignDialog open={digitalSign} onClose={() => setDigitalSign(false)} /></Suspense>}
      <ExportReview review={review} onClose={() => setReview(null)} />
      <Dialog open={!!result} onOpenChange={(o) => !o && setResult(null)}>
        <DialogContent className="max-w-[92vw] rounded-[18px] sm:max-w-[400px]">
          <DialogHeader><DialogTitle className="font-display">{result?.title}</DialogTitle></DialogHeader>
          {result?.image && <img src={result.image} alt="Kết quả" className="max-h-[60vh] w-full rounded-lg object-contain" />}
          {result?.text != null && <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 font-sans text-xs leading-5">{result.text || "Không tìm thấy chữ."}</pre>}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
