import { Component, type ReactNode } from "react";
import { logScan } from "@/lib/scan-log";
import { Button } from "@/components/ui/button";

type Props = {
  children: ReactNode;
  /** Câu báo lỗi theo ngữ cảnh; mặc định nói về phần AI (TD-13). */
  title?: string;
  /** Có thì hiện nút "Đóng" (dùng cho lớp phủ toàn màn như Chỉnh tay). */
  onClose?: () => void;
  /** Hiện thẻ lỗi thành lớp phủ toàn màn thay vì khối tại chỗ. */
  overlay?: boolean;
};

/** Không để màn hình trắng khi một phần giao diện gặp lỗi bất ngờ. */
export class SafeBoundary extends Component<Props, { err: boolean }> {
  override state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  override componentDidCatch(e: Error) { logScan({ code: "UI_CRASH", message: e.message }); }
  override render() {
    if (!this.state.err) return this.props.children;
    const { title = "Phần AI gặp sự cố.", onClose, overlay } = this.props;
    const card = (
      <div role="alert" className="rounded-[12px] bg-destructive/10 p-4 text-sm text-destructive">
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-xs">Tài liệu của bạn vẫn an toàn. Hãy thử lại.</p>
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={() => this.setState({ err: false })}>Thử lại</Button>
          {onClose && <Button size="sm" variant="outline" onClick={onClose}>Đóng</Button>}
        </div>
      </div>
    );
    return overlay ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-4">{card}</div> : card;
  }
}
