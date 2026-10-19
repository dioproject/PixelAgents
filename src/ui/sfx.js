// ============================================================
// sfx.js — Efek suara chiptune kecil (WebAudio, tanpa file aset)
// ============================================================

export class Sfx {
  constructor(enabled = true) {
    this.enabled = !!enabled;
    this.ctx = null;
    this._lastBlip = 0;
    this._unlockBound = false;
    this.bindUnlock();
  }

  bindUnlock() {
    if (this._unlockBound || typeof window === 'undefined') return;
    this._unlockBound = true;
    const unlock = () => {
      this.ensureCtx();
      if (this.ctx?.state === 'suspended') this.ctx.resume().catch(() => {});
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
  }

  ensureCtx() {
    if (this.ctx) return this.ctx;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    try {
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.6;
      this.master.connect(this.ctx.destination);
    } catch (err) {
      console.warn('[sfx] WebAudio tidak tersedia:', err);
      this.ctx = null;
    }
    return this.ctx;
  }

  setEnabled(v) {
    this.enabled = !!v;
  }

  tone(freq, duration = 0.08, { type = 'square', gain = 0.025, slide = 0, delay = 0 } = {}) {
    if (!this.enabled) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(40, freq), t0);
    if (slide) osc.frequency.linearRampToValueAtTime(Math.max(40, freq + slide), t0 + duration);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  /** Obrolan baru */
  blip() {
    const now = performance.now();
    if (now - this._lastBlip < 90) return;
    this._lastBlip = now;
    this.tone(620, 0.045, { type: 'triangle', gain: 0.018, slide: 160 });
  }

  /** Insiden / peringatan */
  alert() {
    this.tone(320, 0.09, { type: 'square', gain: 0.03, slide: -80 });
    this.tone(240, 0.12, { type: 'square', gain: 0.028, slide: -40, delay: 0.1 });
  }

  /** Titah / event penting */
  chime() {
    this.tone(660, 0.14, { type: 'sine', gain: 0.03 });
    this.tone(880, 0.22, { type: 'sine', gain: 0.026, delay: 0.1 });
  }

  /** Menyeruput kopi */
  sip() {
    this.tone(420, 0.07, { type: 'sine', gain: 0.02, slide: -200 });
  }

  /** Reimburse / uang */
  cash() {
    this.tone(980, 0.05, { type: 'square', gain: 0.018 });
    this.tone(1320, 0.08, { type: 'square', gain: 0.016, delay: 0.06 });
  }

  click() {
    this.tone(500, 0.025, { type: 'triangle', gain: 0.012 });
  }
}
