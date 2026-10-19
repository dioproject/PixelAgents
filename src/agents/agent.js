// ============================================================
// agent.js — Runtime Agent: posisi, path following, stats, sprite state
// ============================================================

import { TILE, tileCenter } from '../world/office.js';
import { findPath, nearestWalkable } from '../engine/pathfinding.js';
import { ensureAgentSprites } from '../engine/sprites.js';
import { clamp } from '../core/utils.js';

const WALK_SPEED = 42;       // pixel/detik (≈2.6 tile/detik)
const ARRIVE_EPS = 2;

export class Agent {
  constructor(def, world) {
    this.def = def;
    this.world = world;
    this.id = def.id;

    const c = tileCenter(def.desk.x, def.desk.y);
    this.px = c.x;
    this.py = c.y;
    this.facing = def.desk.face || 'down';

    this.animT = Math.random() * 1000;
    this.path = [];
    this.onArrive = null;

    this.activity = { type: 'idle', label: 'Baru sampai' };
    this.spriteState = 'idle';
    this.overrideFrame = null;
    this.overrideUntil = 0;

    this.seatedSeat = null;      // seat yang sedang ditempati (untuk release reservasi)
    this.gone = false;
    this.drinking = false;

    this.stats = {
      mood: 65 + Math.round(Math.random() * 20),
      stress: 20 + Math.round(Math.random() * 20),
      coffee: def.coffeeLevel || 1,
      chattedToday: 0,
    };

    this.lastQuotes = [];
    this.dayFlags = {};          // { lunch: 1, break: 1, coffeeTrip: 1 }

    ensureAgentSprites(def);
  }

  get tile() {
    return { x: Math.floor(this.px / TILE), y: Math.floor(this.py / TILE) };
  }

  get isStatic() {
    return !!this.def.isStatic;
  }

  /** Sedang dalam aktivitas yang tidak boleh di-override planner? */
  get busy() {
    return this.path.length > 0 || !!this.activity.forced;
  }

  /** Fokus terakhir untuk feed/inspector */
  pushQuote(text) {
    this.lastQuotes.unshift(text);
    if (this.lastQuotes.length > 3) this.lastQuotes.pop();
  }

  faceTo(px, py) {
    const dx = px - this.px;
    const dy = py - this.py;
    if (Math.abs(dx) > Math.abs(dy)) this.facing = dx > 0 ? 'right' : 'left';
    else this.facing = dy > 0 ? 'down' : 'up';
  }

  faceToTile(tile) {
    const c = tileCenter(tile.x, tile.y);
    this.faceTo(c.x, c.y);
  }

  /**
   * Jalan ke tile / daftar tile. onArrive dipanggil saat sampai.
   * Jika jalur tidak ditemukan → panggil onArrive langsung (fail-safe, tidak macet).
   */
  walkTo(target, onArrive = null, label = 'Berjalan') {
    const to = Array.isArray(target) ? target[target.length - 1] : target;
    const from = this.tile;
    const dest = this.world.isWalkable(to.x, to.y, this.id)
      ? to
      : nearestWalkable(this.world, to, this.id);

    if (!dest) {
      this.activity = { type: 'idle', label };
      if (onArrive) onArrive();
      return false;
    }

    const path = findPath(this.world, from, dest, this.id);
    if (!path) {
      this.activity = { type: 'idle', label };
      if (onArrive) onArrive();
      return false;
    }

    // Sudah berada di tujuan: jangan biarkan status 'walk' menggantung.
    if (path.length === 0) {
      this.path = [];
      this.onArrive = null;
      this.activity = { type: 'idle', label };
      if (onArrive) onArrive();
      return true;
    }

    this.releaseSeat();
    this.path = path;
    this.onArrive = onArrive;
    this.activity = { type: 'walk', label };
    this.spriteState = 'walk';
    return true;
  }

  /** Duduk di seat (dipanggil setelah walk selesai) */
  sitAt(seat, label = 'Duduk santai') {
    this.releaseSeat();
    this.world.reserve(seat.x, seat.y, this.id);
    this.seatedSeat = seat;
    const c = tileCenter(seat.x, seat.y);
    this.px = c.x;
    this.py = c.y;
    this.facing = seat.facing;
    this.activity = { type: seat.kind === 'desk' ? 'work' : 'slack', seat, label };
    this.spriteState = seat.kind === 'desk' ? 'type' : 'sit';
  }

  releaseSeat() {
    if (this.seatedSeat) {
      this.world.release(this.seatedSeat.x, this.seatedSeat.y, this.id);
      this.seatedSeat = null;
    }
  }

  /** Berdiri idle di tempat (misal di depan mesin kopi) */
  standIdle(label, spriteState = 'idle') {
    this.activity = { type: 'idle', label };
    this.spriteState = spriteState;
  }

  /** Paksa frame khusus (mis. shock) selama durasi ms */
  setOverrideFrame(frame, durationMs) {
    this.overrideFrame = frame;
    this.overrideUntil = performance.now() + durationMs;
  }

  /** Set aktivitas terpaksa (dipakai konvoi / rapat / insiden) */
  forceActivity(type, label) {
    this.activity = { type, forced: true, label };
  }

  releaseFromForced(label = 'Kembali kerja') {
    this.activity = { type: 'idle', forced: false, label };
  }

  update(dtMs, speed = 1) {
    this.animT += dtMs;

    if (this.overrideFrame && performance.now() > this.overrideUntil) {
      this.overrideFrame = null;
    }

    if (this.isStatic || this.gone) return;

    this.moveAlongPath(dtMs, speed);
  }

  moveAlongPath(dtMs, speed = 1) {
    if (this.path.length === 0) return;

    const node = this.path[0];
    const target = tileCenter(node.x, node.y);
    const dx = target.x - this.px;
    const dy = target.y - this.py;
    const dist = Math.hypot(dx, dy);
    // Skala kecepatan ikut time-lapse supaya agen tetap sampai tujuan
    // dalam jumlah menit game yang wajar saat simulasi dipercepat.
    const speedMul = Math.min(Math.max(Number(speed) || 1, 1), 8);
    const step = (WALK_SPEED * speedMul * dtMs) / 1000;

    if (dist <= Math.max(step, ARRIVE_EPS)) {
      this.px = target.x;
      this.py = target.y;
      this.path.shift();
      if (Math.abs(dx) > Math.abs(dy)) this.facing = dx > 0 ? 'right' : 'left';
      else if (dy !== 0) this.facing = dy > 0 ? 'down' : 'up';

      if (this.path.length === 0) {
        const cb = this.onArrive;
        this.onArrive = null;
        this.spriteState = 'idle';
        if (cb) cb();
      }
    } else {
      this.px += (dx / dist) * step;
      this.py += (dy / dist) * step;
      if (Math.abs(dx) > Math.abs(dy)) this.facing = dx > 0 ? 'right' : 'left';
      else this.facing = dy > 0 ? 'down' : 'up';
      this.spriteState = 'walk';
    }
  }

  /** Drift statistik per menit game */
  statsTick(gameMinutes, { capek = false, budgetCut = false } = {}) {
    if (this.isStatic || this.gone) return;
    const working = this.activity.type === 'work';
    const walking = this.activity.type === 'walk';
    const resting = ['slack', 'idle', 'coffee', 'lunch', 'meeting'].includes(this.activity.type);

    const stressRate = working ? (capek ? 0.22 : 0.12) : walking ? 0.05 : 0.01;
    this.stats.stress = clamp(this.stats.stress + stressRate * gameMinutes, 0, 100);
    this.stats.coffee = clamp(this.stats.coffee - (working ? 0.008 : 0.003) * gameMinutes, 0, 5);

    // Mood perlahan turun kalau stress tinggi / kopi habis, pulih saat istirahat.
    let moodDelta = 0;
    if (working) moodDelta -= 0.02 * gameMinutes;
    if (this.stats.stress > 70) moodDelta -= 0.08 * gameMinutes;
    if (this.stats.coffee < 0.5 && working) moodDelta -= 0.12 * gameMinutes;
    if (resting) moodDelta += 0.05 * gameMinutes;
    else if (walking) moodDelta += 0.02 * gameMinutes;
    if (moodDelta < 0 && budgetCut && working) moodDelta *= 1.3;
    this.stats.mood = clamp(this.stats.mood + moodDelta, 0, 100);
  }

  drinkCoffee({ budgetCut = false } = {}) {
    this.stats.coffee = clamp(this.stats.coffee + 1.5, 0, 5);
    this.stats.mood = clamp(this.stats.mood + (budgetCut ? 2 : 6), 0, 100);
    this.stats.stress = clamp(this.stats.stress - 6, 0, 100);
  }

  goHome() {
    this.releaseSeat();
    this.walkTo({ x: 60 + Math.floor(Math.random() * 20), y: 58 }, () => {
      this.gone = true;
      this.activity = { type: 'gone', label: 'Sudah pulang' };
    }, 'Pulang ke rumah');
  }

  /** Status singkat untuk daftar karyawan */
  statusLabel() {
    if (this.gone) return '🏠 Sudah pulang';
    const map = {
      work: '⌨️ ' + (this.activity.label || 'Bekerja'),
      walk: '🚶 ' + (this.activity.label || 'Jalan'),
      chat: '💬 ' + (this.activity.label || 'Mengobrol'),
      meeting: '📊 ' + (this.activity.label || 'Meeting'),
      coffee: '☕ ' + (this.activity.label || 'Ngopi'),
      slack: '🛋️ ' + (this.activity.label || 'Santai'),
      idle: '🧍 ' + (this.activity.label || 'Idle'),
      lunch: '🍽️ ' + (this.activity.label || 'Makan siang'),
      gone: '🏠 Sudah pulang',
    };
    return map[this.activity.type] || (this.activity.label || 'Aktif');
  }
}
