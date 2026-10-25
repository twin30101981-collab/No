/**
 * Bộ chạy thay thế TỐI THIỂU cho `vitest`, chỉ dùng ở môi trường soạn không có bun/node_modules.
 * KHÔNG thay `bunx vitest run`: không DOM, không mock module, chỉ các matcher liệt kê bên dưới.
 * Cách chạy: xem scripts/thay-vitest/README.md.
 */
type Fn = () => unknown | Promise<unknown>;
type Scope = { name: string; before: Fn[]; after: Fn[]; parent?: Scope };
export type Case = { name: string; fn: Fn; scope: Scope };

const root: Scope = { name: "", before: [], after: [] };
let scope: Scope = root;
export const cases: Case[] = [];

export function describe(name: string, fn: () => void): void {
  const prev = scope;
  scope = { name, before: [], after: [], parent: prev };
  try { fn(); } finally { scope = prev; }
}
export function it(name: string, fn: Fn): void { cases.push({ name, fn, scope }); }
export const test = it;
export const beforeEach = (fn: Fn): void => { scope.before.push(fn); };
export const afterEach = (fn: Fn): void => { scope.after.push(fn); };

export const fullName = (c: Case): string => {
  const parts: string[] = [c.name];
  for (let s: Scope | undefined = c.scope; s; s = s.parent) if (s.name) parts.unshift(s.name);
  return parts.join(" › ");
};
export const hooksOf = (c: Case) => {
  const chain: Scope[] = [];
  for (let s: Scope | undefined = c.scope; s; s = s.parent) chain.unshift(s);
  return { before: chain.flatMap((s) => s.before), after: chain.flatMap((s) => [...s.after].reverse()).reverse() };
};

const show = (v: unknown): string => { try { return typeof v === "string" ? JSON.stringify(v) : JSON.stringify(v) ?? String(v); } catch { return String(v); } };

// toEqual: đệ quy, bỏ qua khoá có giá trị undefined (giống vitest).
function eq(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => eq(x, b[i]));
  const A = a as Record<string, unknown>, B = b as Record<string, unknown>;
  const ka = Object.keys(A).filter((k) => A[k] !== undefined), kb = Object.keys(B).filter((k) => B[k] !== undefined);
  return ka.length === kb.length && ka.every((k) => k in B && eq(A[k], B[k]));
}
function subset(a: unknown, e: unknown): boolean {
  if (typeof e !== "object" || e === null || typeof a !== "object" || a === null) return Object.is(a, e);
  if (Array.isArray(e)) return Array.isArray(a) && a.length === e.length && e.every((x, i) => subset(a[i], x));
  return Object.keys(e).every((k) => subset((a as Record<string, unknown>)[k], (e as Record<string, unknown>)[k]));
}

function matchers(actual: unknown, negate: boolean) {
  const check = (pass: boolean, msg: string): void => {
    if (pass === negate) throw new Error(negate ? `không mong đợi: ${msg}` : msg);
  };
  const num = (v: unknown): number => { if (typeof v !== "number") throw new Error(`cần số, nhận ${show(v)}`); return v; };
  return {
    toBe: (e: unknown) => check(Object.is(actual, e), `${show(actual)} phải là ${show(e)}`),
    toEqual: (e: unknown) => check(eq(actual, e), `${show(actual)} phải bằng ${show(e)}`),
    toStrictEqual: (e: unknown) => check(eq(actual, e), `${show(actual)} phải bằng ${show(e)}`),
    toMatchObject: (e: unknown) => check(subset(actual, e), `${show(actual)} phải chứa ${show(e)}`),
    toBeNull: () => check(actual === null, `${show(actual)} phải là null`),
    toBeUndefined: () => check(actual === undefined, `${show(actual)} phải là undefined`),
    toBeDefined: () => check(actual !== undefined, `phải khác undefined`),
    toBeTruthy: () => check(!!actual, `${show(actual)} phải đúng`),
    toBeFalsy: () => check(!actual, `${show(actual)} phải sai`),
    toBeNaN: () => check(Number.isNaN(actual), `${show(actual)} phải là NaN`),
    toBeCloseTo: (e: number, digits = 2) => check(Math.abs(num(actual) - e) < 10 ** -digits / 2, `${show(actual)} phải gần ${e} (${digits} chữ số)`),
    toBeGreaterThan: (e: number) => check(num(actual) > e, `${show(actual)} phải > ${e}`),
    toBeGreaterThanOrEqual: (e: number) => check(num(actual) >= e, `${show(actual)} phải ≥ ${e}`),
    toBeLessThan: (e: number) => check(num(actual) < e, `${show(actual)} phải < ${e}`),
    toBeLessThanOrEqual: (e: number) => check(num(actual) <= e, `${show(actual)} phải ≤ ${e}`),
    toMatch: (e: RegExp | string) => check(typeof actual === "string" && (typeof e === "string" ? actual.includes(e) : e.test(actual)), `${show(actual)} phải khớp ${String(e)}`),
    toContain: (e: unknown) => check((typeof actual === "string" && typeof e === "string" ? actual.includes(e) : Array.isArray(actual) && actual.includes(e)), `${show(actual)} phải chứa ${show(e)}`),
    toHaveLength: (n: number) => check((actual as { length?: number })?.length === n, `độ dài ${show((actual as { length?: number })?.length)} phải là ${n}`),
    toThrow: () => { let threw = false; try { (actual as () => unknown)(); } catch { threw = true; } check(threw, `hàm phải ném lỗi`); },
  };
}
export function expect(actual: unknown) {
  return Object.assign(matchers(actual, false), { not: matchers(actual, true) });
}
