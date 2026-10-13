import { describe, expect, it } from "vitest";
import { hiResSampleSet } from "@/lib/crop-bench";
import { warpCurved, cleanBorder } from "@/lib/dewarp";
import { darkBorderRegions, paperMaskFill } from "@/lib/paper-mask";
import { runJob } from "@/lib/pixels";

// Khung lệch có chủ đích: mỗi góc đẩy ra ngoài/vào trong vài % → sinh nêm nền tối ở góc kết quả.
const jitter = [[-0.025, -0.02], [0.02, -0.03], [0.03, 0.015], [-0.015, 0.025]];
const OW = 620, OH = 877; // A4 (~75 dpi) cho nhanh; tỉ lệ mm như bản thật

let SET: ReturnType<typeof hiResSampleSet> | null = null;
const set = () => (SET ??= hiResSampleSet());
const cache = new Map<number, Uint8ClampedArray>();
function warped(i: number) {
  const hit = cache.get(i); if (hit) return hit.slice();
  const s = set()[i];
  const q = s.truth.map(([x, y], k) => [(x + jitter[k][0] * 0.6) * s.w, (y + jitter[k][1] * 0.6) * s.h] as [number, number]);
  const out = warpCurved(new Uint8ClampedArray(s.rgba), s.w, s.h, q, OW, OH, []); cache.set(i, out.slice()); return out;
}

describe.sequential("B4 mặt nạ giấy + xoá nêm góc", () => {
  const n = 8;
  it("khung lệch tạo nêm tối > 3 mm trước khi xử lý", () => {
    const worst = Math.max(...Array.from({ length: n }, (_, i) => darkBorderRegions(warped(i), OW, OH)[0]?.mm ?? 0));
    expect(worst).toBeGreaterThan(3);
  }, 180_000);
  it("sau mặt nạ giấy: 0 vùng tối > 3 mm trên cả bộ đo B3", () => {
    for (let i = 0; i < n; i++) {
      const d = paperMaskFill(cleanBorder(warped(i), OW, OH), OW, OH);
      const big = darkBorderRegions(d, OW, OH).filter((r) => r.mm > 3);
      expect(big, set()[i].name).toEqual([]);
    }
  }, 60_000);
  it("không chạm vào nội dung giữa trang", () => {
    const d = warped(0); for (let y = 400; y < 440; y++) for (let x = 250; x < 370; x++) { const j = (y * OW + x) * 4; d[j] = d[j + 1] = d[j + 2] = 20; }
    const before = d.slice(); const out = runJob({ op: "clean", d, W: OW, H: OH });
    for (let y = 400; y < 440; y++) for (let x = 250; x < 370; x++) expect(out[(y * OW + x) * 4]).toBe(before[(y * OW + x) * 4]);
  });
  it("ảnh giấy tối/lạ: không đoán", () => {
    const d = new Uint8ClampedArray(100 * 140 * 4).fill(40); const c = d.slice();
    expect(paperMaskFill(d, 100, 140)).toEqual(c);
  });
});
