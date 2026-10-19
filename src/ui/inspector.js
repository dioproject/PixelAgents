// ============================================================
// inspector.js — Daftar karyawan + panel profil (God Mode)
// ============================================================

import { escapeHtml, formatGameTime } from '../core/utils.js';
import { DIVISIONS } from '../world/office.js';
import { avatarDataUrl } from '../engine/sprites.js';

const LEVEL_LABEL = {
  1: 'Junior / Staff',
  2: 'Senior / Specialist',
  3: 'Manager / Head',
  4: 'Direktur Utama',
};

const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

function bar(label, value, max, color) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return `
    <div class="stat-row">
      <span class="stat-label">${label}</span>
      <div class="stat-bar"><div class="stat-fill" style="width:${pct.toFixed(1)}%;background:${color}"></div></div>
      <span class="stat-value">${Math.round(value * 10) / 10}</span>
    </div>`;
}

export class Inspector {
  constructor(sim) {
    this.sim = sim;
    this.list = document.getElementById('agent-list');
    this.agentPanel = document.getElementById('agent-panel');
    this.panel = document.getElementById('inspector-panel');
    this.body = document.getElementById('inspector-body');
    this.countEl = document.getElementById('agent-count');
    this.selectedId = null;
    this.rows = new Map();
    this._listAt = 0;
    this._renderAt = 0;

    document.getElementById('inspector-close')?.addEventListener('click', () => this.close());
    this.buildList();
  }

  buildList() {
    if (!this.list) return;
    this.list.innerHTML = '';
    this.rows.clear();

    const agents = this.sim.agents.filter((a) => !a.isStatic);
    if (this.countEl) this.countEl.textContent = String(agents.length);

    for (const agent of agents) {
      const div = agent.def.division;
      const color = DIVISIONS[div]?.color || '#8b93a7';

      const row = document.createElement('div');
      row.className = 'agent-row';
      row.dataset.id = agent.id;

      const dot = document.createElement('span');
      dot.className = 'dot';
      dot.style.background = color;
      dot.style.color = color;

      const name = document.createElement('span');
      name.className = 'agent-name';
      name.textContent = agent.def.name;

      const status = document.createElement('span');
      status.className = 'agent-status';
      status.textContent = agent.statusLabel();

      row.append(dot, name, status);
      row.addEventListener('click', () => this.select(agent.id));
      this.list.appendChild(row);
      this.rows.set(agent.id, { row, status });
    }
  }

  select(agentId) {
    const agent = this.sim.agentById(agentId);
    if (!agent) return;
    this.selectedId = agent.id;

    this.agentPanel?.classList.add('hidden');
    this.panel?.classList.remove('hidden');

    for (const [id, entry] of this.rows) {
      entry.row.classList.toggle('selected', id === agent.id);
    }

    this.render();
    this.sim.sfx?.click();

    if (!agent.gone && this.sim.camera) {
      const zoom = Math.max(2, Math.min(this.sim.camera.zoom, 3));
      this.sim.camera.focusOn(agent.px, agent.py, zoom);
    }
  }

  close() {
    this.selectedId = null;
    this.panel?.classList.add('hidden');
    this.agentPanel?.classList.remove('hidden');
    this.body.innerHTML = '';
    for (const entry of this.rows.values()) entry.row.classList.remove('selected');
    this.sim.camera.follow = null;
  }

  render() {
    if (!this.selectedId || !this.body) return;
    const agent = this.sim.agentById(this.selectedId);
    if (!agent) return;

    const scroller = this.body;
    const prevScroll = scroller.scrollTop;
    const div = agent.def.division;
    const division = DIVISIONS[div];
    const mood = Math.round(agent.stats.mood);
    const stress = Math.round(agent.stats.stress);
    const coffee = Math.round(agent.stats.coffee * 10) / 10;
    const level = LEVEL_LABEL[agent.def.level] || 'Karyawan';

    const quotes = agent.lastQuotes.length
      ? agent.lastQuotes
          .map((q) => `<div class="inspector-quote">“${escapeHtml(q)}”</div>`)
          .join('')
      : '<div class="inspector-quote">Belum ada obrolan yang terekam. Coba dekatkan CCTV ke pantry…</div>';

    const tags = agent.def.traits
      .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
      .join('');

    this.body.innerHTML = `
      <div class="inspector-head">
        <img class="inspector-avatar" alt="Avatar ${escapeHtml(agent.def.name)}" src="${avatarDataUrl(agent.def)}" />
        <div class="inspector-names">
          <strong>${escapeHtml(agent.def.name)}</strong>
          <span>${escapeHtml(agent.def.role)} · ${escapeHtml(division?.name || div)}</span>
        </div>
      </div>

      <div class="inspector-tags">
        <span class="tag" style="border-color:${division?.color || '#3a4260'};color:${division?.color || '#e8ecf4'}">${escapeHtml(division?.short || div)}</span>
        <span class="tag">${escapeHtml(level)}</span>
        <span class="tag">${escapeHtml(agent.statusLabel())}</span>
      </div>

      <div class="stat-row"><span class="stat-label">Gaji (satir)</span><span class="stat-value" style="width:auto;margin-left:auto;color:var(--accent)">${rupiah.format(agent.def.salary)}</span></div>

      ${bar('Mood', mood, 100, 'linear-gradient(90deg,#38a169,#7ee787)')}
      ${bar('Stress', stress, 100, 'linear-gradient(90deg,#c53030,#ff6b6b)')}
      ${bar('Kafein', coffee, 5, 'linear-gradient(90deg,#8a5a3a,#d0a139)')}

      <div>
        <div class="panel-title" style="margin-bottom:4px">🗣️ Kutipan Terakhir</div>
        ${quotes}
      </div>

      <div>
        <div class="panel-title" style="margin-bottom:4px">🏷️ Sifat</div>
        <div class="inspector-tags">${tags}</div>
      </div>

      <div class="inspector-tags">
        <button class="btn tiny-btn" id="inspector-focus" style="margin-left:0">👁️ Fokus CCTV</button>
        <button class="btn tiny-btn" id="inspector-directive" style="margin-left:0">📜 Kirim Titah</button>
      </div>
      <div class="hint" style="font-size:10px;color:var(--text-dim)">
        CCTV aktif · Hari ${this.sim.clock.day} ${formatGameTime(this.sim.clock.timeMin)}
      </div>
    `;

    document.getElementById('inspector-focus')?.addEventListener('click', () => {
      if (!agent.gone) this.sim.camera?.focusOn(agent.px, agent.py, Math.max(2, this.sim.camera.zoom));
    });
    document.getElementById('inspector-directive')?.addEventListener('click', () => {
      this.sim.openDirective?.();
    });

    scroller.scrollTop = prevScroll;
  }

  update(now) {
    if (now - this._listAt > 1200) {
      this._listAt = now;
      for (const [id, entry] of this.rows) {
        const agent = this.sim.agentById(id);
        if (!agent) continue;
        entry.status.textContent = agent.statusLabel();
        entry.row.classList.toggle('selected', id === this.selectedId);
      }
    }

    if (this.selectedId && now - this._renderAt > 900) {
      this._renderAt = now;
      this.render();
    }
  }
}
