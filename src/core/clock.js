// ============================================================
// clock.js — Jam kerja kantor (game time)
// 1 menit game = 1000 ms wall-clock / speed
// ============================================================

export const MS_PER_MIN = 1000;

export const DAY_START_MIN = 8 * 60 + 30;   // 08:30
export const DAY_END_MIN = 18 * 60;         // 18:00

export class Clock {
  constructor({ speed = 2, startMin = DAY_START_MIN } = {}) {
    this.day = 1;
    this.timeMin = startMin;   // menit sejak 00:00, float
    this.speed = speed;
    this.paused = false;
  }

  /** @returns {number} jumlah menit game yang berlalu (float) */
  tick(dtMs) {
    if (this.paused) return 0;
    const advanced = (dtMs / MS_PER_MIN) * this.speed;
    this.timeMin += advanced;
    return advanced;
  }

  get hour() { return Math.floor(this.timeMin / 60); }
  get minute() { return Math.floor(this.timeMin % 60); }

  isWorkHours() { return this.timeMin >= DAY_START_MIN && this.timeMin < DAY_END_MIN; }

  isAfterWork() { return this.timeMin >= DAY_END_MIN; }

  /** Lanjut ke hari berikutnya, reset jam ke awal */
  nextDay() {
    this.day += 1;
    this.timeMin = DAY_START_MIN;
  }

  setSpeed(s) { this.speed = s; }
  setPaused(p) { this.paused = p; }
}
