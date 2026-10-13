/**
 * B7 – Nắn giấy (phẳng lẫn cong) trên GPU bằng lưới ánh xạ.
 * - buildWarpMesh: lấy mẫu makeSrcMap mỗi `step` px đích → lưới toạ độ nguồn (Float32, RG). Thuần, có kiểm thử.
 * - gpuWarpMesh: WebGL2; lưới lưu thành texture RG32F, shader nội suy song tuyến trong lưới rồi lấy mẫu
 *   bicubic Catmull-Rom (16 texelFetch) trên ảnh nguồn – cùng công thức với warpCurved (CPU dự phòng).
 *   Trả null khi máy không có WebGL2 / texture quá lớn / lỗi → gọi nơi khác chạy CPU.
 */
import { makeSrcMap, type Curves } from "./dewarp";

type Pt = [number, number];
export type WarpMesh = { nx: number; ny: number; step: number; data: Float32Array };

export function buildWarpMesh(q: Pt[], ow: number, oh: number, curves: Curves = [], step = 8): WarpMesh {
  const map = makeSrcMap(q, ow, oh, curves);
  const nx = Math.ceil((ow - 1) / step) + 2, ny = Math.ceil((oh - 1) / step) + 2;
  const data = new Float32Array(nx * ny * 2);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const [sx, sy] = map(i * step, j * step); const k = (j * nx + i) * 2;
    data[k] = sx; data[k + 1] = sy;
  }
  return { nx, ny, step, data };
}

/** Tra lưới như shader (song tuyến) – dùng để kiểm thử sai số lưới so với ánh xạ đúng. */
export function meshLookup(m: WarpMesh, x: number, y: number): Pt {
  const gx = x / m.step, gy = y / m.step;
  const i = Math.min(Math.floor(gx), m.nx - 2), j = Math.min(Math.floor(gy), m.ny - 2);
  const fx = gx - i, fy = gy - j;
  const at = (a: number, b: number, c: number) => m.data[((b * m.nx) + a) * 2 + c];
  const v = (c: number) => (at(i, j, c) * (1 - fx) + at(i + 1, j, c) * fx) * (1 - fy) + (at(i, j + 1, c) * (1 - fx) + at(i + 1, j + 1, c) * fx) * fy;
  return [v(0), v(1)];
}

const VS = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const FS = `#version 300 es
precision highp float; precision highp int;
uniform sampler2D img; uniform highp sampler2D mesh;
uniform vec2 src; uniform float step;
out vec4 o;
vec4 cr(vec4 p0, vec4 p1, vec4 p2, vec4 p3, float t){
  return p1 + 0.5*t*(p2 - p0 + t*(2.0*p0 - 5.0*p1 + 4.0*p2 - p3 + t*(3.0*(p1 - p2) + p3 - p0)));
}
vec4 px(int x, int y){ ivec2 m = ivec2(src) - 1; return texelFetch(img, clamp(ivec2(x, y), ivec2(0), m), 0); }
void main(){
  vec2 xy = floor(gl_FragCoord.xy);            // hàng 0 của khung = hàng 0 ảnh đích (readPixels đọc từ dưới)
  vec2 g = xy / step; ivec2 i = ivec2(floor(g)); vec2 f = g - vec2(i);
  vec2 a = texelFetch(mesh, i, 0).xy, b = texelFetch(mesh, i + ivec2(1,0), 0).xy;
  vec2 c = texelFetch(mesh, i + ivec2(0,1), 0).xy, d = texelFetch(mesh, i + ivec2(1,1), 0).xy;
  vec2 s = mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  s = clamp(s, vec2(0.0), src - 1.001);
  ivec2 s0 = ivec2(floor(s)); vec2 t = s - vec2(s0);
  vec4 r[4];
  for (int k = 0; k < 4; k++) {
    int yy = s0.y - 1 + k;
    r[k] = cr(px(s0.x-1,yy), px(s0.x,yy), px(s0.x+1,yy), px(s0.x+2,yy), t.x);
  }
  vec4 v = cr(r[0], r[1], r[2], r[3], t.y);
  o = vec4(clamp(v.rgb, 0.0, 1.0), 1.0);
}`;

export type GpuWarpStats = { ok: boolean; reason?: string | undefined; ms?: number };
export const gpuWarpStats: GpuWarpStats = { ok: false };

function sh(gl: WebGL2RenderingContext, type: number, s: string) {
  const o = gl.createShader(type)!; gl.shaderSource(o, s); gl.compileShader(o);
  if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o) || "shader");
  return o;
}

/** Nắn bằng lưới ánh xạ trên GPU. Trả RGBA ow×oh (hàng trên cùng trước) hoặc null. */
export function gpuWarpMesh(
  img: TexImageSource, W: number, H: number, q: Pt[], ow: number, oh: number, curves: Curves = [],
): Uint8ClampedArray | null {
  if (typeof document === "undefined") { gpuWarpStats.ok = false; gpuWarpStats.reason = "no-dom"; return null; }
  const t0 = performance.now();
  const cv = document.createElement("canvas"); cv.width = ow; cv.height = oh;
  let gl: WebGL2RenderingContext | null = null;
  try { gl = cv.getContext("webgl2", { preserveDrawingBuffer: true, antialias: false, premultipliedAlpha: false }); } catch { gl = null; }
  if (!gl) { gpuWarpStats.ok = false; gpuWarpStats.reason = "no-webgl2"; return null; }
  try {
    const max = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    if (Math.max(W, H, ow, oh) > max) { gpuWarpStats.ok = false; gpuWarpStats.reason = "too-large"; return null; }
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl, gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl, gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link");
    gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const tex = (unit: number) => {
      const t = gl!.createTexture(); gl!.activeTexture(gl!.TEXTURE0 + unit); gl!.bindTexture(gl!.TEXTURE_2D, t);
      for (const [k, v] of [[gl!.TEXTURE_MIN_FILTER, gl!.NEAREST], [gl!.TEXTURE_MAG_FILTER, gl!.NEAREST], [gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE], [gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE]]) gl!.texParameteri(gl!.TEXTURE_2D, k, v);
    };
    tex(0);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, img);
    const m = buildWarpMesh(q, ow, oh, curves);
    tex(1);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, m.nx, m.ny, 0, gl.RG, gl.FLOAT, m.data);
    const u = (n: string) => gl!.getUniformLocation(prog, n);
    gl.uniform1i(u("img"), 0); gl.uniform1i(u("mesh"), 1);
    gl.uniform2f(u("src"), W, H); gl.uniform1f(u("step"), m.step);
    gl.viewport(0, 0, ow, oh);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    const out = new Uint8ClampedArray(ow * oh * 4);
    gl.readPixels(0, 0, ow, oh, gl.RGBA, gl.UNSIGNED_BYTE, out);
    if (gl.getError() !== gl.NO_ERROR) throw new Error("gl");
    gpuWarpStats.ok = true; gpuWarpStats.reason = undefined; gpuWarpStats.ms = Math.round(performance.now() - t0);
    return out;
  } catch (e) {
    gpuWarpStats.ok = false; gpuWarpStats.reason = String((e as Error)?.message ?? e).slice(0, 80);
    return null;
  } finally {
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    cv.width = cv.height = 0;
  }
}
