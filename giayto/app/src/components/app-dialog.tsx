import { useEffect, useState } from "react";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDialogState } from "@/lib/dialog";

export function AppDialog() {
  const d = useDialogState();
  const [value, setValue] = useState("");
  useEffect(() => { setValue(d?.defaultValue ?? ""); }, [d]);
  if (!d) return null;
  const pinBad = d.kind === "pin" && !/^\d{4,6}$/.test(value);
  const ok = () => { if (d.kind === "confirm") d.resolve(true); else if (!pinBad && (d.kind !== "prompt" || value.trim())) d.resolve(value); };
  return (
    <AlertDialog open onOpenChange={(o) => { if (!o) d.resolve(d.kind === "confirm" ? false : null); }}>
      <AlertDialogContent className="max-w-[92vw] rounded-[20px] sm:max-w-sm">
        <form onSubmit={(e) => { e.preventDefault(); ok(); }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">{d.title}</AlertDialogTitle>
            {d.message && <AlertDialogDescription>{d.message}</AlertDialogDescription>}
          </AlertDialogHeader>
          {d.kind === "prompt" && <Input autoFocus className="mt-4 h-12" value={value} placeholder={d.placeholder} onChange={(e) => setValue(e.target.value)} />}
          {d.kind === "pin" && <Input autoFocus inputMode="numeric" type="password" maxLength={6} className="mt-4 h-14 text-center text-2xl tracking-[0.5em]" value={value} onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))} />}
          <AlertDialogFooter className="mt-5 flex-row gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => d.resolve(d.kind === "confirm" ? false : null)}>Huỷ</Button>
            <Button type="submit" variant={d.danger ? "destructive" : "default"} className="flex-1" disabled={pinBad || (d.kind === "prompt" && !value.trim())}>{d.okText ?? "Đồng ý"}</Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
