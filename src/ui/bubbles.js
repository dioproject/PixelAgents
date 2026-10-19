// ============================================================
// bubbles.js — Balon kata DOM di atas kepala karyawan
// ============================================================

import { getSettings } from '../core/config.js';
import { DIVISIONS } from '../world/office.js';
import { clamp } from '../core/utils.js';

function idHash(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export class Bubbles {
  constructor(sim) {
    this.sim = sim;
    this.layer = document.getElementById('bubble-layer');
    this.active = new Map(); // agentId -> { el, agent, until, typing }
  }

  show(agent, { text = '', typing = false } = {}) {
    if (!this.layer || !agent) return;
    if (!getSettings().showBubbles) return;
    if (agent.gone) return;

    this.remove(agent);

    const el = document.createElement('div');
    el.className = `bubble${typing ? ' typing' : ''}`;

    const name = document.createElement('span');
    name.className = 'bubble-name';
    name.textContent = agent.def.name;
    name.style.color = DIVISIONS[agent.def.division]?.color || 'var(--accent)';
    el.appendChild(name);

    if (typing) {
      const dots = document.createElement('span');
      dots.className = 'bubble-dots';
      dots.innerHTML = '<span>.</span><span>.</span><span>.</span>';
      el.appendChild(dots);
    } else {
      const body = document.createElement('span');
      body.textContent = text;
      el.appendChild(body);
    }

    this.layer.appendChild(el);
    const until = performance.now() + (typing ? 30000 : Math.min(11000, 6200 + String(text).length * 28));
    this.active.set(agent.id, { el, agent, until, typing });
    this.position(agent, el);
  }

  remove(agentOrId) {
    const id = typeof agentOrId === 'string' ? agentOrId : agentOrId?.id;
    if (!id) return;
    const entry = this.active.get(id);
    if (!entry) return;
    entry.el.remove();
    this.active.delete(id);
  }

  clear() {
    for (const entry of this.active.values()) entry.el.remove();
    this.active.clear();
  }

  position(agent, el) {
    const camera = this.sim.camera;
    if (!camera) return;
    const p = camera.worldToScreen(agent.px, agent.py - 13);
    const margin = 118;
    const x = clamp(p.x, margin, Math.max(margin, camera.vw - margin));
    const lift = (idHash(agent.id) % 3) * 13;
    el.style.left = `${Math.round(x)}px`;
    el.style.top = `${Math.round(p.y - 3 - lift)}px`;
    const visible =
      p.x > -12 && p.x < camera.vw + 12 &&
      p.y > -30 && p.y < camera.vh + 20;
    el.style.visibility = visible ? 'visible' : 'hidden';
  }

  update() {
    const now = performance.now();
    for (const [id, entry] of [...this.active]) {
      if (entry.agent.gone || now > entry.until) {
        this.remove(id);
        continue;
      }
      this.position(entry.agent, entry.el);
    }
  }
}
