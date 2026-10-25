/**
 * R2.4 — Xem trước bộ lọc bằng WebGL2 (GPU) với thanh cấp độ 0–100.
 *
 * - filterShaderParams(): phần thuần — ánh xạ (bộ lọc, cấp độ, sáng, tương phản)
 *   sang tham số shader; kiểm thử được không cần DOM.
 * - mixPixels(): trộn ảnh gốc với ảnh đã lọc theo cấp độ (0 = giữ gốc, 100 = lọc full).
 * - filterPreviewGL(): dựng xem trước tức thì trên GPU (một pass, ≤16 ms/khung
 *   trên ảnh ≤1280 px). Trả null khi không có WebGL2 để nơi gọi rơi về đường CPU
 *   (renderPreview). Bản GPU là xấp xỉ nhanh; ảnh đầy đủ vẫn do applyFilter dựng
 *   chính xác khi người dùng thả tay.
 */
import type { Filter } from "./db";
import { normalizeFilter } from "./image";

/** Chế độ shader cho từng nhóm bộ lọc (xấp xỉ một pass trên GPU). */
export const GL_MODE = {
  tone: 0, // original: chỉ sáng/tương phản
  gray: 1, // gray: luma
  mono: 2, // mono/ink: ngưỡng đen trắng
  vivid: 3, // vivid/bright/eco: tăng bão hoà + tone
  magic: 4, // magic/auto/sharp/shadow/denoise: nền trắng + tương phản
} as const;

export type GlParams = {
  mode: number;
  /** 0..1 — tỉ lệ trộn giữa ảnh gốc và ảnh đã lọc. */
  mix: number;
  /** -80..80 chuẩn hoá /255 cho shader. */
  bright: number;
  /** -80..80 → hệ số tương phản quanh 0.5. */
  contrast: number;
  /** Bộ lọc không xấp xỉ được trên GPU (cần Worker nhiều pass) → nơi gọi nên dùng CPU. */
  cpuOnly: boolean;
};

/** Kẹp cấp độ bộ lọc về 0–100 (mặc định 100 khi thiếu/không hợp lệ). */
export function clampFilterLevel(v: number | undefined | null): number {
  if (v === undefined || v === null || !Number.isFinite(v)) return 100;
  return Math.max(0, Math.min(100, Math.round(v)));
}

/** Bộ lọc cần pipeline CPU nhiều pass — GPU chỉ xem trước gần đúng. */
const CPU_ONLY: ReadonlySet<Filter> = new Set(["shadow", "denoise"]);

export function filterShaderParams(
  rawFilter: Filter | string | undefined,
  level: number | undefined,
  brightness = 0,
  contrast = 0,
): GlParams {
  const filter = normalizeFilter(rawFilter);
  const mix = clampFilterLevel(level) / 100;
  const bright = Math.max(-80, Math.min(80, brightness)) / 255;
  const k = Math.max(-80, Math.min(80, contrast));
  let mode: number = GL_MODE.tone;
  if (filter === "gray") mode = GL_MODE.gray;
  else if (filter === "mono" || filter === "ink") mode = GL_MODE.mono;
  else if (filter === "vivid" || filter === "bright" || filter === "eco") mode = GL_MODE.vivid;
  else if (filter !== "original") mode = GL_MODE.magic;
  return { mode, mix, bright, contrast: k, cpuOnly: CPU_ONLY.has(filter) };
}

/** Trộn điểm ảnh: out = orig*(1-mix) + filtered*mix (mix 0..1). Đổi tại chỗ mảng filtered. */
export function mixPixels(orig: Uint8ClampedArray, filtered: Uint8ClampedArray, mix: number): Uint8ClampedArray {
  const m = Math.max(0, Math.min(1, mix));
  if (m >= 1 || orig.length !== filtered.length) return filtered;
  if (m <= 0) { filtered.set(orig); return filtered; }
  for (let i = 0; i < filtered.length; i += 4) {
    filtered[i] = orig[i]! + (filtered[i]! - orig[i]!) * m;
    filtered[i + 1] = orig[i + 1]! + (filtered[i + 1]! - orig[i + 1]!) * m;
    filtered[i + 2] = orig[i + 2]! + (filtered[i + 2]! - orig[i + 2]!) * m;
  }
  return filtered;
}

// ---------------- Phần GPU (chỉ chạy trên trình duyệt) ----------------

const VS300 = `#version 300 es
in vec2 p; out vec2 uv;
void main(){ uv = vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5); gl_Position = vec4(p, 0.0, 1.0); }`;

const FS300 = `#version 300 es
precision highp float;
uniform sampler2D t; uniform int mode; uniform float mixv; uniform float bright; uniform float contrast;
in vec2 uv; out vec4 o;
void main(){
  vec3 c = texture(t, uv).rgb;
  vec3 f = c;
  float y = dot(c, vec3(0.3, 0.59, 0.11));
  if (mode == 1) { f = vec3(y); }
  else if (mode == 2) { f = vec3(step(0.55, y) * 0.98 + 0.02); }
  else if (mode == 3) { f = clamp(y + (c - y) * 1.35 + 0.03, 0.0, 1.0); }
  else if (mode == 4) {
    float w = 0.86;
    float t2 = clamp((y - 0.02) / max(0.12, w - 0.02), 0.0, 1.0);
    float ny = pow(t2, 1.5);
    float sat = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
    f = sat > 0.14 && y < 0.92 ? clamp(y + (c - y) * 1.3, 0.0, 1.0) * (ny / max(y, 0.004)) : vec3(ny);
  }
  f = clamp((f - 0.5) * (1.0 + contrast / 80.0) + 0.5 + bright, 0.0, 1.0);
  o = vec4(mix(c, f, mixv), 1.0);
}`;

export type GlSupport = { ok: boolean; reason?: string };
let cachedSupport: GlSupport | null = null;

/** Kiểm tra WebGL2 (lưu kết quả). */
export function filterGlSupport(): GlSupport {
  if (cachedSupport) return cachedSupport;
  try {
    if (typeof document === "undefined") cachedSupport = { ok: false, reason: "no-dom" };
    else {
      const c = document.createElement("canvas");
      const gl = c.getContext("webgl2");
      cachedSupport = gl ? { ok: true } : { ok: false, reason: "no-webgl2" };
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
      c.width = c.height = 0;
    }
  } catch { cachedSupport = { ok: false, reason: "error" }; }
  return cachedSupport;
}

/** Chỉ dùng cho kiểm thử. */
export function _resetFilterGlSupport() { cachedSupport = null; }

function compile300(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader");
  return s;
}

/** Đếm lượt dựng để kiểm chứng hiệu năng (globalThis.__r24). */
export const r24Stats = { draws: 0, lastMs: 0, fallback: 0 };
if (typeof globalThis !== "undefined") (globalThis as { __r24?: typeof r24Stats }).__r24 = r24Stats;

/**
 * Dựng xem trước bộ lọc trên GPU ra canvas ≤ max px cạnh dài.
 * Trả null khi: không có WebGL2, bộ lọc cpuOnly, hoặc lỗi — nơi gọi rơi về CPU.
 */
export function filterPreviewGL(
  img: TexImageSource & { width?: number; height?: number },
  rawFilter: Filter | string,
  level: number | undefined,
  brightness = 0,
  contrast = 0,
  max = 1280,
): HTMLCanvasElement | null {
  const sup = filterGlSupport();
  if (!sup.ok) { r24Stats.fallback++; return null; }
  const p = filterShaderParams(rawFilter, level, brightness, contrast);
  if (p.cpuOnly) { r24Stats.fallback++; return null; }
  const sw = (img as { width?: number }).width ?? 0, sh = (img as { height?: number }).height ?? 0;
  if (!sw || !sh) return null;
  const s = Math.min(1, max / Math.max(sw, sh));
  const ow = Math.max(1, Math.round(sw * s)), oh = Math.max(1, Math.round(sh * s));
  const c = document.createElement("canvas"); c.width = ow; c.height = oh;
  const gl = c.getContext("webgl2", { preserveDrawingBuffer: true, premultipliedAlpha: false, antialias: false });
  if (!gl) { r24Stats.fallback++; return null; }
  const t0 = performance.now();
  try {
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile300(gl, gl.VERTEX_SHADER, VS300));
    gl.attachShader(prog, compile300(gl, gl.FRAGMENT_SHADER, FS300));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    const u = (n: string) => gl.getUniformLocation(prog, n);
    gl.uniform1i(u("t"), 0);
    gl.uniform1i(u("mode"), p.mode);
    gl.uniform1f(u("mixv"), p.mix);
    gl.uniform1f(u("bright"), p.bright);
    gl.uniform1f(u("contrast"), p.contrast);
    gl.viewport(0, 0, ow, oh);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (gl.getError() !== gl.NO_ERROR) return null;
    r24Stats.draws++; r24Stats.lastMs = Math.round((performance.now() - t0) * 10) / 10;
    return c;
  } catch {
    return null;
  } finally {
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}
