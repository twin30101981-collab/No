import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// TD-46: chữ trên màu thương hiệu phải đạt WCAG AA (4,5) ở sáng và tối.
const css = readFileSync("src/styles.css", "utf8");

function oklchToY([L, C, h]: number[]) {
  const a = C * Math.cos((h * Math.PI) / 180), b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const cl = (x: number) => Math.max(0, Math.min(1, x));
  const r = cl(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  const g = cl(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  const bl = cl(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);
  const lin = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
  const f = (c: number) => { const v = lin(c); return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bl);
}
function token(block: string, name: string) {
  const m = block.match(new RegExp(`--${name}: oklch\\(([\\d.]+) ([\\d.]+) ?([\\d.]*)`));
  if (!m) throw new Error(`thiếu --${name}`);
  return [+m[1], +m[2], +(m[3] || 0)];
}
const ratio = (a: number[], b: number[]) => {
  const [x, y] = [oklchToY(a), oklchToY(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const darkAt = css.indexOf("\n.dark {");
const light = css.slice(0, darkAt);
const dark = css.slice(darkAt, css.indexOf("\n}", darkAt));

describe("TD-46 tương phản màu thương hiệu", () => {
  it("sáng: chữ trên primary và primary trên nền ≥ 4,5", () => {
    expect(ratio(token(light, "primary"), token(light, "primary-foreground"))).toBeGreaterThanOrEqual(4.5);
    expect(ratio(token(light, "primary"), token(light, "background"))).toBeGreaterThanOrEqual(4.5);
  });
  it("tối: chữ trên primary và primary trên nền ≥ 4,5", () => {
    expect(ratio(token(dark, "primary"), token(dark, "primary-foreground"))).toBeGreaterThanOrEqual(4.5);
    expect(ratio(token(dark, "primary"), token(dark, "background"))).toBeGreaterThanOrEqual(4.5);
  });
});
