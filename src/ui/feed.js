// ============================================================
// feed.js — Live Office Feed (maks 400 entri, filter tab)
// ============================================================

import { formatGameTime, truncate } from '../core/utils.js';
import { AGENT_DEFS } from '../agents/roster.js';
import { DIVISIONS } from '../world/office.js';

const MAX_ITEMS = 400;
const CHANNELS = new Set(['kerja', 'gosip', 'hr', 'direksi', 'sistem', 'proyek']);

const CHANNEL_LABEL = {
  kerja: 'kerja',
  gosip: 'gosip',
  hr: 'HR',
  direksi: 'direksi',
  sistem: 'sistem',
  proyek: 'proyek',
};

const defById = (id) => AGENT_DEFS.find((d) => d.id === id) || null;

function normalizeChannel(ch) {
  if (ch === 'lunch' || ch === 'sore') return 'gosip';
  return CHANNELS.has(ch) ? ch : 'kerja';
}

export class FeedUI {
  constructor(sim) {
    this.sim = sim;
    this.list = document.getElementById('feed-list');
    this.tabRoot = document.querySelector('.feed-tabs');
    this.countEl = document.getElementById('feed-count');
    this.items = [];
    this.activeTab = 'all';
    this.lastNotable = null;
    this._seq = 0;

    this.bindTabs();
    this.render();
  }

  bindTabs() {
    if (!this.tabRoot) return;
    this.tabRoot.querySelectorAll('.tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeTab = btn.dataset.tab || 'all';
        this.tabRoot.querySelectorAll('.tab').forEach((b) => {
          b.classList.toggle('active', b === btn);
        });
        this.render();
      });
    });
  }

  matchesTab(item) {
    if (this.activeTab === 'all') return true;
    if (this.activeTab === 'kerja') return item.channel === 'kerja';
    if (this.activeTab === 'gosip') return item.channel === 'gosip';
    if (this.activeTab === 'hr') return item.channel === 'hr';
    return true;
  }

  add(ev = {}) {
    const clock = this.sim.clock;
    const channel = normalizeChannel(ev.channel);
    const text = truncate(String(ev.text ?? '').replace(/\s+/g, ' ').trim(), 240);
    if (!text) return null;

    const item = {
      id: `feed_${++this._seq}`,
      t: Number.isFinite(ev.t) ? ev.t : clock.timeMin,
      day: Number.isFinite(ev.day) ? ev.day : clock.day,
      channel,
      from: ev.from || null,
      text,
      meta: ev.meta || {},
    };

    this.items.push(item);
    if (this.items.length > MAX_ITEMS) {
      this.items.shift();
      this.render();
    } else if (this.matchesTab(item)) {
      this.appendItem(item);
    }

    this.updateCount();
    this.trackNotable(item);
    return item;
  }

  trackNotable(item) {
    const from = defById(item.from);
    if (item.channel === 'hr' || item.channel === 'direksi' || item.meta?.incident || item.meta?.project) {
      this.lastNotable = {
        text: item.text,
        from: from?.name || (item.channel === 'direksi' ? 'Direksi' : 'Sistem'),
        day: item.day,
        t: item.t,
      };
    }
  }

  /** Hint untuk prompt percakapan: insiden terakhir masih hangat? */
  incidentHint() {
    const n = this.lastNotable;
    if (!n) return '';
    const now = (this.sim.clock.day - 1) * 1440 + this.sim.clock.timeMin;
    const then = (n.day - 1) * 1440 + n.t;
    if (now - then > 180) return '';
    return `Baru saja terjadi: ${n.from} — "${n.text}".`;
  }

  recentNotable(limit = 5, day = null) {
    const out = [];
    for (let i = this.items.length - 1; i >= 0 && out.length < limit; i--) {
      const it = this.items[i];
      if (day != null && it.day !== day) continue;
      if (!(it.channel === 'hr' || it.channel === 'direksi' || it.meta?.incident || it.meta?.project)) continue;
      if (out.some((x) => x.text === it.text)) continue;
      const from = defById(it.from);
      out.push({
        text: it.text,
        from: from?.name || (it.channel === 'direksi' ? 'Direksi' : 'Sistem'),
        channel: it.channel,
        time: formatGameTime(it.t),
      });
    }
    return out;
  }

  updateCount() {
    if (this.countEl) this.countEl.textContent = String(this.items.length);
  }

  render() {
    if (!this.list) return;
    this.list.innerHTML = '';
    const fragment = document.createDocumentFragment();
    for (const item of this.items) {
      if (this.matchesTab(item)) fragment.appendChild(this.buildItem(item));
    }
    this.list.appendChild(fragment);
    this.list.scrollTop = this.list.scrollHeight;
  }

  appendItem(item) {
    if (!this.list) return;
    const nearBottom = this.list.scrollHeight - this.list.scrollTop - this.list.clientHeight < 90;
    this.list.appendChild(this.buildItem(item));
    if (nearBottom) this.list.scrollTop = this.list.scrollHeight;
  }

  buildItem(item) {
    const def = defById(item.from);
    const division = def ? DIVISIONS[def.division] : null;

    const el = document.createElement('div');
    el.className = `feed-item chan-${item.channel}`;
    el.dataset.id = item.id;

    const head = document.createElement('div');
    head.className = 'feed-head';

    const time = document.createElement('span');
    time.className = 'feed-time';
    time.textContent = formatGameTime(item.t);
    head.appendChild(time);

    const from = document.createElement('span');
    from.className = 'feed-from';
    from.textContent = def?.name || (item.channel === 'direksi' ? 'DIREKSI' : 'Sistem');
    if (division) from.style.color = division.color;
    if (item.channel === 'direksi') from.style.color = 'var(--accent)';
    head.appendChild(from);

    if (division) {
      const to = document.createElement('span');
      to.className = 'feed-to';
      to.textContent = `· ${division.short}`;
      head.appendChild(to);
    } else if (item.channel === 'hr') {
      const to = document.createElement('span');
      to.className = 'feed-to';
      to.textContent = '· HR';
      head.appendChild(to);
    }

    const text = document.createElement('div');
    text.className = 'feed-text';
    text.textContent = item.text;
    text.title = `${CHANNEL_LABEL[item.channel] || item.channel} · Hari ${item.day}`;

    el.appendChild(head);
    el.appendChild(text);

    if (def) {
      el.addEventListener('click', () => {
        this.sim.selectAgent?.(def.id);
      });
    } else {
      el.style.cursor = 'default';
    }

    return el;
  }
}
