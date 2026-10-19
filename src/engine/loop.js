// ============================================================
// loop.js — RequestAnimationFrame game loop
// ============================================================

export class GameLoop {
  /**
   * @param {(dtMs:number, now:number)=>void} update
   * @param {(dtMs:number, now:number)=>void} render
   */
  constructor(update, render) {
    this.update = update;
    this.render = render;
    this.running = false;
    this.last = 0;
    this.fps = 60;
    this._fpsAcc = 0;
    this._fpsFrames = 0;
    this._raf = null;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const tick = (now) => {
      if (!this.running) return;
      let dt = now - this.last;
      this.last = now;
      // clamp dt agar lompatan besar (tab tidak aktif) tidak merusak simulasi
      if (dt > 250) dt = 250;

      this._fpsAcc += dt;
      this._fpsFrames++;
      if (this._fpsAcc >= 500) {
        this.fps = Math.round((this._fpsFrames * 1000) / this._fpsAcc);
        this._fpsAcc = 0;
        this._fpsFrames = 0;
      }

      try {
        this.update(dt, now);
        this.render(dt, now);
      } catch (err) {
        console.error('[loop] error:', err);
      }
      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  }

  stop() {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
  }
}
