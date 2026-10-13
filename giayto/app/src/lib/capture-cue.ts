// G2-07: rung + âm "tách" ngắn khi chụp (theo cài đặt). Âm tạo bằng WebAudio, không cần tệp.
let ctx: AudioContext | null = null;

export function captureCue(opt: { captureSound: boolean; captureVibrate: boolean }) {
  if (opt.captureVibrate) navigator.vibrate?.(25);
  if (!opt.captureSound) return;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    if (ctx.state === "suspended") void ctx.resume();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(500, t + 0.07);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  } catch { /* không phát được âm thì bỏ qua */ }
}
