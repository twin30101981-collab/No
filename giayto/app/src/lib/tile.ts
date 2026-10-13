// R2.3: xử lý theo ô cho ảnh rất lớn — giới hạn canvas iPhone (~16 MP, thực tế hay hỏng > 12 MP).
// Thuần toán, không DOM: tính được kế hoạch chia ô để kiểm thử; nơi vẽ (canvas) chỉ cần
// lặp tileRects → xử lý từng ô → ghép lại theo toạ độ ô.

/** Ngưỡng "ảnh lớn": trên 12 megapixel thì chia ô (iPhone Safari trắng canvas khi vượt). */
export const LARGE_IMAGE_MP = 12;
/** Cạnh ô tối đa (px) — khớp giới hạn canvas an toàn trên iPhone. */
export const TILE = 1024;
/** Phần chồng lấn giữa hai ô kề nhau (px) để bộ lọc cục bộ (làm nét, khử nhiễu) không để lại đường nối. */
export const TILE_OVERLAP = 32;

export type TileRect = { x: number; y: number; w: number; h: number };

/** Megapixel của ảnh w×h. */
export function megapixels(w: number, h: number) {
  return (w * h) / 1_000_000;
}

/** Ảnh có cần chia ô không (lớn hơn ngưỡng 12 MP hoặc một cạnh vượt giới hạn canvas an toàn 4096). */
export function needsTiling(w: number, h: number, mpLimit = LARGE_IMAGE_MP) {
  return megapixels(w, h) > mpLimit || Math.max(w, h) > 4096;
}

/** Số ô theo một chiều: đủ để phủ n px với bước nhảy tối đa tile − overlap (đảm bảo lấn ≥ overlap). */
export function tileCount(n: number, tile = TILE, overlap = TILE_OVERLAP) {
  if (n <= tile) return 1;
  return Math.max(2, Math.ceil((n - overlap) / (tile - overlap)));
}

/**
 * Kế hoạch chia ô phủ kín ảnh w×h, mỗi ô ≤ tile px một cạnh, chồng lấn `overlap` px
 * (ô đầu mỗi hàng/cột không lấn về trước). Ảnh nhỏ hơn một ô → đúng một ô toàn ảnh.
 */
export function tileRects(w: number, h: number, tile = TILE, overlap = TILE_OVERLAP): TileRect[] {
  if (w <= 0 || h <= 0) return [];
  const cols = tileCount(w, tile), rows = tileCount(h, tile);
  // Rải đều: ô đầu ở 0, ô cuối kết thúc đúng mép ảnh — phần lấn ≥ overlap, không hở mép.
  const pos = (n: number, count: number, i: number) =>
    count <= 1 ? 0 : Math.round((i * (n - tile)) / (count - 1));
  const out: TileRect[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = pos(w, cols, c), y = pos(h, rows, r);
      out.push({ x, y, w: Math.min(tile, w - x), h: Math.min(tile, h - y) });
    }
  }
  return out;
}

/**
 * Vùng ruột (không tính phần chồng lấn) của ô thứ i — dùng khi ghép: chỉ lấy phần ruột để không ghi đè.
 * Đường nối nằm giữa mép ô trước và mép ô sau, nên đúng cả khi ô cuối bị kẹp vào mép ảnh
 * (kích thước lẻ làm phần lấn lớn hơn TILE_OVERLAP).
 */
export function tileCore(rects: TileRect[], i: number): TileRect {
  const t = rects[i];
  // Ô liền trước cùng hàng (y bằng nhau, x nhỏ hơn gần nhất) và ô liền trên cùng cột.
  let left: TileRect | null = null, up: TileRect | null = null;
  let right: TileRect | null = null, down: TileRect | null = null;
  for (const o of rects) {
    if (o === t) continue;
    if (o.y === t.y && o.x < t.x && (!left || o.x > left.x)) left = o;
    if (o.x === t.x && o.y < t.y && (!up || o.y > up.y)) up = o;
    if (o.y === t.y && o.x > t.x && (!right || o.x < right.x)) right = o;
    if (o.x === t.x && o.y > t.y && (!down || o.y < down.y)) down = o;
  }
  // floor thống nhất hai phía đường nối: ô trái và ô phải tính ra cùng một giá trị, không hở 1 px.
  const x = left ? Math.floor((t.x + left.x + left.w) / 2) : t.x;
  const y = up ? Math.floor((t.y + up.y + up.h) / 2) : t.y;
  const x2 = right ? Math.floor((t.x + t.w + right.x) / 2) : t.x + t.w;
  const y2 = down ? Math.floor((t.y + t.h + down.y) / 2) : t.y + t.h;
  return { x, y, w: x2 - x, h: y2 - y };
}

/** Kiểm chứng: các phần ruột của mọi ô ghép lại phủ kín ảnh, không chồng nhau. */
export function coresCover(w: number, h: number, tile = TILE, overlap = TILE_OVERLAP) {
  const rects = tileRects(w, h, tile, overlap);
  let area = 0;
  for (let i = 0; i < rects.length; i++) {
    const c = tileCore(rects, i);
    area += c.w * c.h;
  }
  return area === w * h;
}
