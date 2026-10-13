// R3.2 – "Phương án khác": 3 biến thể chỉnh dựng sẵn, người dùng chọn bằng 1 chạm.
// Thuần, kiểm thử được: không chạm DOM/canvas.
import type { Filter, PageEdit } from "./db";
import type { PageMetrics } from "./page-grade";

export type Variant = {
  id: string;
  /** Nhãn ngắn hiển thị trên nút. */
  label: string;
  /** Mô tả một dòng cho người dùng. */
  desc: string;
  /** Phần chỉnh áp vào bản nháp khi chạm chọn. */
  edit: Pick<PageEdit, "filter" | "level" | "brightness" | "contrast">;
};

/** Ba biến thể mặc định: Sắc nét (chữ), Màu đậm (giữ màu), Đen trắng (nhẹ tệp). */
export function buildVariants(m?: PageMetrics | null): Variant[] {
  const dark = m ? m.brightness < 90 : false;
  const lowContrast = m ? m.contrast < 40 : false;
  return [
    {
      id: "sharp",
      label: "Sắc nét",
      desc: "Chữ rõ, nền sạch — hợp giấy tờ thuần chữ.",
      edit: { filter: "sharp" as Filter, level: 100, brightness: dark ? 15 : 0, contrast: lowContrast ? 15 : 5 },
    },
    {
      id: "vivid",
      label: "Màu đậm",
      desc: "Giữ màu con dấu, ảnh — hợp giấy tờ có dấu đỏ.",
      edit: { filter: "vivid" as Filter, level: 100, brightness: dark ? 10 : 0, contrast: 10 },
    },
    {
      id: "mono",
      label: "Đen trắng",
      desc: "Nhẹ tệp nhất, in rõ — hợp hợp đồng, biểu mẫu.",
      edit: { filter: "mono" as Filter, level: 100, brightness: dark ? 20 : 5, contrast: 20 },
    },
  ];
}

/** Biến thể có khớp bản nháp hiện tại không (để tô nút đang chọn). */
export function variantActive(v: Variant, d: Pick<PageEdit, "filter" | "level" | "brightness" | "contrast">): boolean {
  return (
    d.filter === v.edit.filter &&
    (d.level ?? 100) === v.edit.level &&
    d.brightness === v.edit.brightness &&
    d.contrast === v.edit.contrast
  );
}
