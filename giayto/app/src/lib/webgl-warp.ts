/**
 * G2-03 — Nắn phối cảnh bằng WebGL (GPU).
 * - webglWarpSupport(): kiểm tra máy có WebGL và đủ cỡ texture cho ảnh.
 * - webglWarp(): nắn ảnh nguồn theo 4 góc (pixel) ra canvas ow×oh; trả null khi không làm được
 *   để nơi gọi rơi về bản CPU (warpPixels). Phép tính homography dùng chung với pixels.ts nên
 *   kết quả GPU và CPU trùng khung.
 */
import { homography } from "./pixels";

export type WarpSupport = { ok: boolean; maxTex: number; reason?: string };

const VS = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;
const FS = `precision highp float;
uniform sampler2D t; uniform vec2 src; uniform float oh;
uniform vec3 r0; uniform vec3 r1; uniform vec2 r2;
void main(){
  float x = gl_FragCoord.x - 0.5; float y = oh - gl_FragCoord.y - 0.5;
  float d = r2.x * x + r2.y * y + 1.0;
  float u = (r0.x * x + r0.y * y + r0.z) / d;
  float v = (r1.x * x + r1.y * y + r1.z) / d;
  vec2 uv = clamp((vec2(u, v) + 0.5) / src, vec2(0.0), vec2(1.0));
  gl_FragColor = vec4(texture2D(t, uv).rgb, 1.0);
}`;

let cached: WarpSupport | null = null;

function makeCanvas(w: number, h: number) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; return c;
}

function getGL(c: HTMLCanvasElement) {
  const opts = { preserveDrawingBuffer: true, premultipliedAlpha: false, antialias: false } as WebGLContextAttributes;
  return (c.getContext("webgl", opts) || c.getContext("experimental-webgl", opts)) as WebGLRenderingContext | null;
}

/** Kiểm tra máy hỗ trợ (lưu kết quả). Truyền W,H để biết ảnh có vừa giới hạn texture không. */
export function webglWarpSupport(W = 0, H = 0): WarpSupport {
  if (!cached) {
    try {
      if (typeof document === "undefined") cached = { ok: false, maxTex: 0, reason: "no-dom" };
      else {
        const gl = getGL(makeCanvas(1, 1));
        if (!gl) cached = { ok: false, maxTex: 0, reason: "no-webgl" };
        else {
          const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
          cached = maxTex >= 2048 ? { ok: true, maxTex } : { ok: false, maxTex, reason: "small-texture" };
          gl.getExtension("WEBGL_lose_context")?.loseContext();
        }
      }
    } catch { cached = { ok: false, maxTex: 0, reason: "error" }; }
  }
  const s = cached as WarpSupport;
  if (s.ok && Math.max(W, H) > s.maxTex) return { maxTex: s.maxTex, ok: false, reason: "too-large" };
  return s;
}

/** Chỉ dùng cho kiểm thử. */
export function _resetWarpSupport() { cached = null; }

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader");
  return s;
}

/** Nắn phối cảnh trên GPU. Trả canvas 2D ow×oh hoặc null nếu không hỗ trợ / lỗi. */
export function webglWarp(
  img: TexImageSource & { width?: number; height?: number },
  W: number, H: number, q: [number, number][], ow: number, oh: number,
): HTMLCanvasElement | null {
  const sup = webglWarpSupport(W, H);
  if (!sup.ok || ow > sup.maxTex || oh > sup.maxTex) return null;
  const glc = makeCanvas(ow, oh);
  const gl = getGL(glc);
  if (!gl) return null;
  try {
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FS));
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

    const h = homography([[0, 0], [ow, 0], [ow, oh], [0, oh]], q);
    const u = (n: string) => gl.getUniformLocation(prog, n);
    gl.uniform1i(u("t"), 0);
    gl.uniform2f(u("src"), W, H);
    gl.uniform1f(u("oh"), oh);
    gl.uniform3f(u("r0"), h[0], h[1], h[2]);
    gl.uniform3f(u("r1"), h[3], h[4], h[5]);
    gl.uniform2f(u("r2"), h[6], h[7]);
    gl.viewport(0, 0, ow, oh);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (gl.getError() !== gl.NO_ERROR) return null;

    const out = makeCanvas(ow, oh);
    out.getContext("2d")!.drawImage(glc, 0, 0);
    return out;
  } catch {
    return null;
  } finally {
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    glc.width = glc.height = 0;
  }
}
