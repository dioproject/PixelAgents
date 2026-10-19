// ============================================================
// hud.js — Topbar, CCTV navigator, label ruangan, statistik kantor
// ============================================================

import { ROOMS, FLOOR_STYLES, WORLD_W, WORLD_H, tileCenter, roomCenter } from '../world/office.js';
import { formatGameTime } from '../core/utils.js';
import { saveSettings } from '../core/config.js';

function statBar(label, value, max, color) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return `
    <div class="stat-row">
      <span class="stat-label">${label}</span>
      <div class="stat-bar"><div class="stat-fill" style="width:${pct.toFixed(1)}%;background:${color}"></div></div>
      <span class="stat-value">${value}</span>
    </div>`;
}

function statCount(label, value, color = 'var(--accent)') {
  return `
    <div class="stat-row">
      <span class="stat-label">${label}</span>
      <span class="stat-value" style="width:auto;margin-left:auto;color:${color};font-size:12px">${value}</span>
    </div>`;
}

export class HUD {
  constructor(sim) {
    this.sim = sim;
    this.dayEl = document.getElementById('clock-day');
    this.timeEl = document.getElementById('clock-time');
    this.fpsEl = document.getElementById('clock-fps');
    this.pauseBtn = document.getElementById('btn-pause');
    this.speedSelect = document.getElementById('speed-select');
    this.roomNav = document.getElementById('room-nav');
    this.statsEl = document.getElementById('office-stats');
    this.labelLayer = document.getElementById('room-labels');

    this.roomCounts = new Map();
    this.labels = [];
    this._last = 0;
    this._statsAt = 0;
    this._countAt = 0;

    this.buildRoomNav();
    this.buildRoomLabels();
    this.bindControls();

    if (this.speedSelect) this.speedSelect.value = String(sim.clock.speed);
    this.syncPause();
    this.renderStats();
  }

  bindControls() {
    this.pauseBtn?.addEventListener('click', () => {
      this.sim.togglePause?.();
      this.syncPause();
    });

    this.speedSelect?.addEventListener('change', () => {
      const speed = Number(this.speedSelect.value) || 2;
      this.sim.clock.setSpeed(speed);
      void saveSettings({ defaultSpeed: speed });
      this.sim.toast?.(`⏩ Kecepatan waktu ${speed}x`, 'info', 1800);
    });

    document.getElementById('btn-directive')?.addEventListener('click', () => {
      this.sim.openDirective?.();
    });
    document.getElementById('btn-settings')?.addEventListener('click', () => {
      this.sim.openSettings?.();
    });
    document.getElementById('btn-help')?.addEventListener('click', () => {
      this.sim.openAbout?.();
    });
  }

  buildRoomNav() {
    if (!this.roomNav) return;
    this.roomNav.innerHTML = '';

    const allBtn = document.createElement('button');
    allBtn.innerHTML = '<span class="swatch" style="background:#4a5474"></span><span>Semua Kantor</span>';
    allBtn.addEventListener('click', () => {
      this.sim.camera?.centerOn(WORLD_W / 2, WORLD_H / 2);
      this.sim.camera?.setZoom(1);
      this.sim.sfx?.click();
    });
    this.roomNav.appendChild(allBtn);

    for (const room of ROOMS) {
      if (!room.label) continue;
      const btn = document.createElement('button');
      const accent = FLOOR_STYLES[room.floor]?.accent || '#8b93a7';
      btn.innerHTML = `<span class="swatch" style="background:${accent}"></span><span>${room.label}</span><span class="count">0</span>`;
      btn.title = `Fokus CCTV ke ${room.label}`;
      btn.addEventListener('click', () => {
        const c = roomCenter(room);
        this.sim.camera?.focusOn(c.x, c.y, 2);
        this.sim.sfx?.click();
      });
      this.roomNav.appendChild(btn);
      this.roomCounts.set(room.id, btn.querySelector('.count'));
    }
  }

  buildRoomLabels() {
    if (!this.labelLayer) return;
    this.labelLayer.innerHTML = '';
    for (const room of ROOMS) {
      if (!room.label || !room.labelAnchor) continue;
      const el = document.createElement('div');
      el.className = 'room-label';
      el.textContent = room.label.replace('Divisi ', '');
      this.labelLayer.appendChild(el);
      this.labels.push({ room, el, anchor: tileCenter(room.labelAnchor.x, room.labelAnchor.y) });
    }
  }

  positionLabels() {
    const camera = this.sim.camera;
    if (!camera) return;
    for (const { el, anchor } of this.labels) {
      const p = camera.worldToScreen(anchor.x, anchor.y);
      el.style.left = `${Math.round(p.x)}px`;
      el.style.top = `${Math.round(p.y)}px`;
      const visible =
        p.x > -120 && p.x < camera.vw + 120 &&
        p.y > -60 && p.y < camera.vh + 60;
      el.style.visibility = visible ? 'visible' : 'hidden';
    }
  }

  syncPause() {
    if (!this.pauseBtn) return;
    const paused = this.sim.clock.paused;
    this.pauseBtn.textContent = paused ? '▶' : '⏸';
    this.pauseBtn.title = paused ? 'Lanjut (Space)' : 'Jeda (Space)';
    this.pauseBtn.classList.toggle('gold-btn', paused);
  }

  update(now) {
    this.positionLabels();

    if (now - this._last > 120) {
      this._last = now;
      if (this.dayEl) this.dayEl.textContent = `Hari ${this.sim.clock.day}`;
      if (this.timeEl) this.timeEl.textContent = formatGameTime(this.sim.clock.timeMin);
      if (this.fpsEl) this.fpsEl.textContent = `${this.sim.loop?.fps || 60}fps`;
    }

    if (now - this._statsAt > 900) {
      this._statsAt = now;
      this.renderStats();
    }

    if (now - this._countAt > 900) {
      this._countAt = now;
      this.updateCounts();
    }
  }

  updateCounts() {
    const counts = new Map();
    for (const id of this.roomCounts.keys()) counts.set(id, 0);
    for (const agent of this.sim.agents) {
      if (agent.gone || agent.isStatic) continue;
      const room = this.sim.world.roomAt(agent.tile.x, agent.tile.y);
      if (room && counts.has(room.id)) counts.set(room.id, counts.get(room.id) + 1);
    }
    for (const [id, el] of this.roomCounts) {
      const n = counts.get(id) || 0;
      el.textContent = n > 0 ? String(n) : '–';
    }
  }

  renderStats() {
    if (!this.statsEl) return;
    const active = this.sim.agents.filter((a) => !a.isStatic);
    const mood = active.length ? active.reduce((s, a) => s + a.stats.mood, 0) / active.length : 0;
    const stress = active.length ? active.reduce((s, a) => s + a.stats.stress, 0) / active.length : 0;

    const reportLabel = this.sim.lastReport
      ? `📋 Laporan Hari ${this.sim.lastReport.day}`
      : '📋 Laporan Hari Ini';

    this.statsEl.innerHTML = [
      statBar('Mood rata²', Math.round(mood), 100, 'linear-gradient(90deg,#38a169,#7ee787)'),
      statBar('Stress rata²', Math.round(stress), 100, 'linear-gradient(90deg,#c53030,#ff6b6b)'),
      statCount('☕ Kopi diminum', this.sim.stats.coffeeDrinks),
      statCount('💬 Percakapan', this.sim.stats.conversations),
      statCount('🚨 Insiden', this.sim.stats.incidents),
      statCount('📜 Titah', this.sim.stats.directives),
      `<button id="btn-report" class="btn" style="width:100%;margin-top:2px">${reportLabel}</button>`,
    ].join('');

    document.getElementById('btn-report')?.addEventListener('click', () => {
      this.sim.openReport?.();
    });
  }
}
