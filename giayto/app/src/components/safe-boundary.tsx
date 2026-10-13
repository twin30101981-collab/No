import { Component, type ReactNode } from "react";
import { logScan } from "@/lib/scan-log";
import { Button } from "@/components/ui/button";

/** Không để màn hình trắng khi phần AI/OCR gặp lỗi bất ngờ. */
export class SafeBoundary extends Component<{ children: ReactNode }, { err: boolean }> {
  override state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  override componentDidCatch(e: Error) { logScan({ code: "UI_CRASH", message: e.message }); }
  override render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="rounded-[12px] bg-destructive/10 p-4 text-sm text-destructive">
        <p className="font-semibold">Phần AI gặp sự cố.</p>
        <p className="mt-1 text-xs">Tài liệu của bạn vẫn an toàn. Hãy thử lại.</p>
        <Button size="sm" className="mt-3" onClick={() => this.setState({ err: false })}>Thử lại</Button>
      </div>
    );
  }
}
