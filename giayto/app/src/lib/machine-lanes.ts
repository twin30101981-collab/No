/**
 * B06: số làn xử lý song song co theo sức máy.
 * Máy RAM 3–4 GB (deviceMemory ≤ 4) chỉ chạy 1–2 làn để không tràn bộ nhớ;
 * máy mạnh hơn chạy tối đa min(4, cores/2). Công tắc __v8Lanes vẫn ghi đè để đo so sánh.
 */
export function machineLanes(
  cores = (typeof navigator !== "undefined" && navigator.hardwareConcurrency) || 2,
  memGB = (typeof navigator !== "undefined" && (navigator as { deviceMemory?: number }).deviceMemory) || 8,
) {
  const force = (globalThis as { __v8Lanes?: number }).__v8Lanes;
  if (force && force > 0) return Math.floor(force);
  if (memGB <= 4) return cores <= 2 ? 1 : 2;
  return Math.min(4, Math.max(2, Math.floor(cores / 2)));
}
