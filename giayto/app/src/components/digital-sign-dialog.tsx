import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createP12, importP12, isCertValid } from "@/lib/p12";
import { signPdf } from "@/lib/pdf-sign";
import { download, safeName } from "@/lib/files";
import { showError } from "@/lib/errors";

/** Ký số PDF bằng chứng thư .p12 — mọi bước chạy trên máy. */
export function DigitalSignDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [pdf, setPdf] = useState<File | null>(null);
  const [p12, setP12] = useState<Uint8Array | null>(null);
  const [p12Name, setP12Name] = useState("");
  const [pw, setPw] = useState("");
  const [cn, setCn] = useState("");
  const [reason, setReason] = useState("Duyệt tài liệu");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState("");

  const makeCert = async () => {
    setBusy("Đang tạo chứng thư…");
    await new Promise((r) => setTimeout(r, 30));
    try {
      const r = createP12({ commonName: cn, password: pw });
      setP12(r.p12Bytes); setP12Name(`${safeName(cn)}.p12`);
      download(new Blob([r.p12Bytes as BlobPart], { type: "application/x-pkcs12" }), `${safeName(cn)}.p12`);
      toast.success("Đã tạo và lưu tệp chứng thư — hãy giữ cẩn thận cùng mật khẩu.");
    } catch (e) { showError(e, "Không tạo được chứng thư"); } finally { setBusy(""); }
  };

  const sign = async () => {
    if (!pdf || !p12) return;
    setBusy("Đang ký…");
    try {
      const key = importP12(p12, pw);
      if (!isCertValid(key.info)) throw new Error("Chứng thư đã hết hạn hoặc chưa có hiệu lực.");
      const out = await signPdf(new Uint8Array(await pdf.arrayBuffer()), key, { reason, location });
      download(new Blob([out as BlobPart], { type: "application/pdf" }), `${safeName(pdf.name.replace(/\.pdf$/i, ""))}-da-ky.pdf`);
      toast.success(`Đã ký số bởi ${key.info.commonName}`);
      onClose();
    } catch (e) { showError(e, "Không ký được tệp này"); } finally { setBusy(""); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[92vw] rounded-[18px] sm:max-w-[420px]">
        <DialogHeader><DialogTitle className="font-display">Ký số PDF</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <label className="block space-y-1"><span className="font-medium">1. Tệp PDF</span>
            <Input type="file" accept="application/pdf" aria-label="Chọn tệp PDF" onChange={(e) => setPdf(e.target.files?.[0] ?? null)} /></label>
          <div className="space-y-1"><span className="font-medium">2. Chứng thư (.p12)</span>
            <Input type="file" accept=".p12,.pfx" aria-label="Chọn tệp chứng thư" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { setP12(new Uint8Array(await f.arrayBuffer())); setP12Name(f.name); } }} />
            {p12Name && <p className="text-xs text-muted-foreground">Đang dùng: {p12Name}</p>}
          </div>
          <Input type="password" placeholder="Mật khẩu chứng thư (≥ 6 ký tự)" aria-label="Mật khẩu chứng thư" value={pw} onChange={(e) => setPw(e.target.value)} />
          {!p12 && (
            <div className="space-y-2 rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">Chưa có chứng thư? Tạo chứng thư tự ký (dùng nội bộ) bằng mật khẩu ở trên.</p>
              <Input placeholder="Họ tên người ký" aria-label="Họ tên người ký" value={cn} onChange={(e) => setCn(e.target.value)} />
              <Button variant="secondary" size="sm" disabled={!!busy || !cn.trim() || pw.length < 6} onClick={makeCert}>Tạo chứng thư</Button>
            </div>
          )}
          <Input placeholder="Lý do ký" aria-label="Lý do ký" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Input placeholder="Nơi ký (tuỳ chọn)" aria-label="Nơi ký" value={location} onChange={(e) => setLocation(e.target.value)} />
          <Button className="w-full" disabled={!!busy || !pdf || !p12 || !pw} onClick={sign}>
            {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{busy}</> : "Ký và tải về"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
