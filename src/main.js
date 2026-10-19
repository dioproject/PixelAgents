// ============================================================
// main.js — Entry point: wiring dunia, agen, UI, dan loop
// PT Pixel Sinergi Nusantara Tbk
// ============================================================

import './style.css';

import { bus } from './core/bus.js';
import { loadSettings, getSettings } from './core/config.js';
import { Clock, DAY_END_MIN } from './core/clock.js';
import { Camera } from './engine/camera.js';
import { GameLoop } from './engine/loop.js';
import { buildStaticScene, drawStaticScene } from './world/scene.js';
import {
  createWorld, WORLD_W, WORLD_H, tileCenter,
} from './world/office.js';
import { AGENT_DEFS } from './agents/roster.js';
import { Agent } from './agents/agent.js';
import { Behavior, blockFor } from './agents/behavior.js';
import { ConversationManager } from './agents/conversation.js';
import { IncidentSystem } from './agents/incidents.js';
import { DirectiveSystem } from './agents/directives.js';
import { ProjectManager } from './agents/projects.js';
import {
  drawAgent, ensureAgentSprites, setAgentLookOverride,
} from './engine/sprites.js';
import { clamp, formatGameTime } from './core/utils.js';
import { ToastUI } from './ui/toast.js';
import { Sfx } from './ui/sfx.js';
import { FeedUI } from './ui/feed.js';
import { Bubbles } from './ui/bubbles.js';
import { Inspector } from './ui/inspector.js';
import { HUD } from './ui/hud.js';
import { Modals } from './ui/modals.js';

const SUPPORTED_SPEEDS = [1, 2, 4, 8, 16];

const stage = document.getElementById('stage');
const canvas = document.getElementById('world');
const ctx = canvas.getContext('2d');

const BATIK_TOPS = [
  '#7a5a3a', '#8a4a3a', '#5a4a6a', '#4a6a4a', '#8a6a2a',
  '#6a3a4a', '#3a5a6a', '#7a6a4a', '#5a3a2a', '#4a4a6a', '#6b4a2f',
];

let renderDpr = 1;

const sim = {
  agents: [],
  world: createWorld(),
  clock: null,
  camera: null,
  loop: null,
  flags: {
    coffeeBudgetCut: false,
    overtime: false,
    pizzaPartyActive: false,
    freeDay: false,
    batikActive: false,
    batikNext: false,
  },
  stats: {
    coffeeDrinks: 0,
    directives: 0,
    incidents: 0,
    conversations: 0,
    projects: 0,
    projectsToday: [],
  },
  lastDirective: null,
  lastReport: null,
  daySnapshot: { coffeeDrinks: 0, directives: 0, incidents: 0, conversations: 0, projects: 0 },
  _timers: [],
  _timerSeq: 0,

  agentById(id) {
    return this.agents.find((a) => a.id === id) || null;
  },

  selectAgent(id) {
    this.inspector?.select(id);
  },

  togglePause() {
    const paused = !this.clock.paused;
    this.clock.setPaused(paused);
    this.hud?.syncPause();
    this.toast(paused ? '⏸️ Simulasi dijeda. Waktu kantor berhenti.' : '▶️ Simulasi dilanjutkan.', 'info', 1700);
    this.sfx?.click();
  },

  toast(text, kind = 'info', duration = 4200) {
    this.toastUI?.show(text, kind, duration);
  },

  /** Timer helper (ms wall-clock). Dipakai behavior, conversation, directive. */
  after(ms, fn) {
    const id = ++this._timerSeq;
    this._timers.push({ id, at: performance.now() + Math.max(0, ms), fn });
    return id;
  },

  openSettings() {
    this.modals?.openSettings();
  },
  openDirective() {
    this.modals?.openDirective();
  },
  openAbout() {
    this.modals?.openAbout();
  },
  openReport() {
    const report = this.lastReport || this.buildReport();
    this.modals?.openReport(report);
  },
  openProject(project = null) {
    const target = project || this.projects?.active || this.projects?.archive?.[0] || null;
    if (!target) {
      this.toast('Belum ada proyek. Kirim 📜 Titah "Tugas Proyek Baru" dulu.', 'info');
      return;
    }
    this.modals?.openProject(target);
  },
  buildReport() {
    return buildReport(this.clock.day, true);
  },
};

// ---------- Boot ----------

async function boot() {
  await loadSettings();
  const settings = getSettings();
  const initialSpeed = SUPPORTED_SPEEDS.includes(Number(settings.defaultSpeed))
    ? Number(settings.defaultSpeed)
    : 2;

  sim.clock = new Clock({ speed: initialSpeed });
  sim.camera = new Camera({ worldW: WORLD_W, worldH: WORLD_H, zoom: 1 });

  buildAgents();
  resizeCanvas();
  sim.camera.centerOn(WORLD_W / 2, 900);

  // ---- UI dasar ----
  sim.toastUI = new ToastUI();
  sim.sfx = new Sfx(settings.soundEnabled);
  sim.feed = new FeedUI(sim);
  sim.bubbles = new Bubbles(sim);
  sim.modals = new Modals(sim);

  // ---- Sistem simulasi ----
  sim.behavior = new Behavior(sim);
  sim.conversations = new ConversationManager(sim);
  sim.incidents = new IncidentSystem(sim);
  sim.projects = new ProjectManager(sim);
  sim.directives = new DirectiveSystem(sim);

  // ---- UI lanjutan (butuh agents & stats) ----
  sim.inspector = new Inspector(sim);
  sim.hud = new HUD(sim);

  bindBus();
  bindCanvas();
  bindKeyboard();

  if (!SUPPORTED_SPEEDS.includes(Number(sim.hud.speedSelect?.value))) {
    if (sim.hud.speedSelect) sim.hud.speedSelect.value = String(initialSpeed);
  }

  buildStaticScene();
  sim.loop = new GameLoop(update, render);
  sim.loop.start();

  sim.feed.add({
    channel: 'sistem',
    text: '☀️ Hari 1 dibuka. Selamat pagi, Pak Direktur. Karyawan mulai berdatangan ke lobby.',
  });
  sim.toast('👋 Selamat pagi, Pak Direktur. Pantau kantor, klik karyawan, atau kirim Titah Direksi.', 'success', 6000);

  // debugging ramah developer
  if (import.meta.env?.DEV) window.__PIXEL_SIM__ = sim;
  console.info('[Pixel Sinergi] siap. Settings LLM:', settings.offlineMode ? 'offline (prosedural)' : (settings.baseUrl || 'belum diatur'));
}

function buildAgents() {
  for (const def of AGENT_DEFS) {
    const agent = new Agent(def, sim.world);
    sim.agents.push(agent);

    if (def.isStatic) {
      agent.sitAt(
        { id: `seat.${agent.id}`, kind: 'desk', x: def.desk.x, y: def.desk.y, facing: def.desk.face },
        'Mengawasi CCTV',
      );
    }
  }

  spawnAllInLobby();
}

function spawnAllInLobby() {
  const candidates = [];
  for (let ty = 61; ty >= 53; ty--) {
    for (let tx = 53; tx <= 79; tx++) {
      if (sim.world.isWalkable(tx, ty)) candidates.push({ x: tx, y: ty });
    }
  }

  const used = new Set();
  let cursor = 0;

  for (const agent of sim.agents) {
    if (agent.isStatic) continue;

    agent.gone = false;
    agent.path = [];
    agent.onArrive = null;
    agent.releaseSeat();
    agent.overrideFrame = null;
    agent.overrideUntil = 0;
    agent.dayFlags = {};
    agent.stats.chattedToday = 0;
    agent.activity = { type: 'idle', label: 'Baru datang' };
    agent.spriteState = 'idle';

    let spot = null;
    while (cursor < candidates.length) {
      const c = candidates[cursor++];
      const key = `${c.x},${c.y}`;
      if (used.has(key)) continue;
      if (!sim.world.isWalkable(c.x, c.y, agent.id)) continue;
      used.add(key);
      spot = c;
      break;
    }
    if (!spot) spot = { x: 73, y: 58 };

    const center = tileCenter(spot.x, spot.y);
    agent.px = center.x;
    agent.py = center.y;
  }
}

function bindBus() {
  bus.on('config:changed', (s) => {
    sim.sfx?.setEnabled(s.soundEnabled);
    if (!s.showBubbles) sim.bubbles?.clear();
  });

  bus.on('directive:sent', (directive) => {
    if (directive.type === 'batik') {
      sim.flags.batikNext = true;
      sim.flags.batikActive = true;
      applyBatik(true);
    }
  });
}

// ---------- Batik Day ----------

function applyBatik(on) {
  let i = 0;
  for (const agent of sim.agents) {
    if (on) {
      const top = BATIK_TOPS[i % BATIK_TOPS.length];
      setAgentLookOverride(agent.id, {
        top,
        accent: '#e8c15a',
        bottom: '#2f2a24',
      });
    } else {
      setAgentLookOverride(agent.id, null);
    }
    ensureAgentSprites(agent.def);
    i++;
  }
}

// ---------- Siklus hari ----------

function endDay() {
  const finishedDay = sim.clock.day;

  // Proyek yang belum kelar: dikejar deadline (paket template + disclaimer).
  sim.projects?.finalizeLate();

  // Rapikan percakapan yang masih jalan agar tidak menyeberang hari.
  sim.conversations.endAll();
  sim.bubbles?.clear();

  const report = buildReport(finishedDay, false);
  sim.lastReport = report;
  sim.stats.projectsToday = [];

  sim.feed.add({
    channel: 'sistem',
    text: `🌙 Kantor tutup. Hari ${finishedDay} selesai. Laporan harian tersedia di panel statistik.`,
  });
  sim.toast(`🌙 Hari ${finishedDay} selesai! Laporan harian siap dibuka.`, 'success', 5200);
  sim.sfx?.chime();

  // snapshot untuk delta laporan hari berikutnya
  sim.daySnapshot = { ...sim.stats };
  sim._timers = [];

  sim.clock.nextDay();
  sim.world.clearReservations();

  // flag harian
  sim.flags.coffeeBudgetCut = false;
  sim.flags.overtime = false;
  sim.flags.pizzaPartyActive = false;
  sim.flags.freeDay = false;

  // Batik: dipakai hari ini + besok, lalu kembali normal
  if (sim.flags.batikNext) {
    sim.flags.batikNext = false;
    sim.flags.batikActive = true;
    applyBatik(true);
  } else if (sim.flags.batikActive) {
    sim.flags.batikActive = false;
    applyBatik(false);
  }

  for (const agent of sim.agents) {
    if (agent.isStatic) continue;
    agent.stats.stress = clamp(agent.stats.stress - 26, 0, 100);
    agent.stats.mood = clamp(agent.stats.mood + 3, 0, 100);
    agent.stats.coffee = clamp(agent.stats.coffee + 1.5, 0, 5);
  }

  spawnAllInLobby();

  const director = sim.agentById('director');
  if (director) {
    director.releaseSeat();
    director.sitAt(
      { id: 'seat.director', kind: 'desk', x: director.def.desk.x, y: director.def.desk.y, facing: director.def.desk.face },
      'Mengawasi CCTV',
    );
  }

  sim.feed.add({
    channel: 'sistem',
    text: `☀️ Hari ${sim.clock.day} dimulai. Semua karyawan kembali ke lobby (sebagian pura-pura semangat).`,
  });
}

function buildReport(day, live) {
  const snap = sim.daySnapshot || { coffeeDrinks: 0, directives: 0, incidents: 0, conversations: 0 };
  const active = sim.agents.filter((a) => !a.isStatic);
  const avgMood = active.length ? active.reduce((s, a) => s + a.stats.mood, 0) / active.length : 0;
  const avgStress = active.length ? active.reduce((s, a) => s + a.stats.stress, 0) / active.length : 0;

  const topChatty = [...active]
    .sort((a, b) => b.stats.chattedToday - a.stats.chattedToday)
    .slice(0, 3)
    .map((a) => ({ name: a.def.name, count: a.stats.chattedToday }));

  const topStress = [...active]
    .sort((a, b) => b.stats.stress - a.stats.stress)
    .slice(0, 3)
    .map((a) => ({ name: a.def.name, stress: Math.round(a.stats.stress) }));

  const directive = sim.lastDirective && sim.lastDirective.day === day
    ? { text: sim.lastDirective.text, atMin: sim.lastDirective.atMin }
    : null;

  return {
    day,
    live: !!live,
    closedAt: live ? null : '18:00',
    counters: {
      conversations: Math.max(0, sim.stats.conversations - (snap.conversations || 0)),
      coffee: Math.max(0, sim.stats.coffeeDrinks - (snap.coffeeDrinks || 0)),
      incidents: Math.max(0, sim.stats.incidents - (snap.incidents || 0)),
      directives: Math.max(0, sim.stats.directives - (snap.directives || 0)),
      projects: Math.max(0, sim.stats.projects - (snap.projects || 0)),
    },
    avgMood: Math.round(avgMood),
    avgStress: Math.round(avgStress),
    topChatty,
    topStress,
    notable: sim.feed ? sim.feed.recentNotable(5, day) : [],
    lastDirective: directive,
    projectsList: [...(sim.stats.projectsToday || [])],
  };
}

// ---------- Update & render ----------

function update(dt, now) {
  sim.camera.update(dt);

  const gameMinutes = sim.clock.tick(dt);
  const paused = sim.clock.paused;

  if (!paused) {
    if (gameMinutes > 0) {
      const block = blockFor(sim.clock.timeMin);
      for (const agent of sim.agents) {
        agent.statsTick(gameMinutes, {
          capek: block === 'capek',
          budgetCut: sim.flags.coffeeBudgetCut,
        });
      }
    }

    sim.behavior.update(dt, gameMinutes);
    const speedMul = Math.min(Math.max(sim.clock.speed, 1), 8);
    for (const agent of sim.agents) agent.update(dt, speedMul);
    sim.incidents.update(gameMinutes);
    sim.projects.update(gameMinutes);
    runTimers(now);
  }

  // Percakapan berbasis wall-clock tetap boleh selesai walau waktu dijeda.
  sim.conversations.update(now);

  if (sim.clock.timeMin >= DAY_END_MIN) endDay();

  sim.hud.update(now);
  sim.bubbles.update();
  sim.inspector.update(now);
}

function runTimers(now) {
  if (sim._timers.length === 0) return;
  const due = [];
  const keep = [];
  for (const timer of sim._timers) {
    if (timer.at <= now) due.push(timer);
    else keep.push(timer);
  }
  if (due.length === 0) return;
  sim._timers = keep;
  for (const timer of due) {
    try {
      timer.fn();
    } catch (err) {
      console.error('[timer] error:', err);
    }
  }
}

function render() {
  const w = sim.camera.vw;
  const h = sim.camera.vh;
  const z = sim.camera.zoom;

  ctx.setTransform(renderDpr, 0, 0, renderDpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#0b0d13';
  ctx.fillRect(0, 0, w, h);

  ctx.setTransform(
    renderDpr * z, 0,
    0, renderDpr * z,
    -sim.camera.x * renderDpr * z,
    -sim.camera.y * renderDpr * z,
  );

  drawStaticScene(ctx);
  drawSelection(ctx);

  const visible = sim.agents.filter((a) => !a.gone).sort((a, b) => a.py - b.py);
  for (const agent of visible) drawAgent(ctx, agent);
}

function drawSelection(c) {
  const id = sim.inspector?.selectedId;
  if (!id) return;
  const agent = sim.agentById(id);
  if (!agent || agent.gone) return;

  const pulse = 0.55 + Math.sin(performance.now() / 260) * 0.25;
  c.save();
  c.strokeStyle = `rgba(255, 200, 87, ${pulse.toFixed(3)})`;
  c.lineWidth = 1.5;
  c.setLineDash([3, 2]);
  c.beginPath();
  c.ellipse(agent.px, agent.py + 7, 8, 4, 0, 0, Math.PI * 2);
  c.stroke();
  c.restore();
}

// ---------- Canvas: resize, pan, zoom, pick ----------

function resizeCanvas() {
  if (!stage || !canvas) return;
  const rect = stage.getBoundingClientRect();
  const w = Math.max(1, Math.floor(rect.width));
  const h = Math.max(1, Math.floor(rect.height));
  renderDpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  canvas.width = Math.max(1, Math.floor(w * renderDpr));
  canvas.height = Math.max(1, Math.floor(h * renderDpr));
  sim.camera?.setViewport(w, h);
}

let drag = null;

function bindCanvas() {
  if (!canvas) return;

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    canvas.setPointerCapture?.(e.pointerId);
    drag = {
      lastX: e.clientX,
      lastY: e.clientY,
      moved: 0,
    };
    canvas.classList.add('dragging');
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.lastX;
    const dy = e.clientY - drag.lastY;
    drag.lastX = e.clientX;
    drag.lastY = e.clientY;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    if (drag.moved > 2) sim.camera.panByScreen(dx, dy);
  });

  canvas.addEventListener('pointerup', (e) => {
    if (!drag) return;
    const wasClick = drag.moved <= 6;
    drag = null;
    canvas.classList.remove('dragging');
    if (wasClick && e.button === 0) pickAt(e.clientX, e.clientY);
  });

  canvas.addEventListener('pointercancel', () => {
    drag = null;
    canvas.classList.remove('dragging');
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (e.deltaY < 0) sim.camera.zoomIn();
    else if (e.deltaY > 0) sim.camera.zoomOut();
  }, { passive: false });

  window.addEventListener('resize', resizeCanvas);
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => resizeCanvas());
    ro.observe(stage);
  }
}

function pickAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const sx = clientX - rect.left;
  const sy = clientY - rect.top;
  const world = sim.camera.screenToWorld(sx, sy);

  let best = null;
  let bestScore = Infinity;
  for (const agent of sim.agents) {
    if (agent.gone) continue;
    const dx = world.x - agent.px;
    const dy = world.y - (agent.py - 4);
    if (Math.abs(dx) > 11) continue;
    if (dy < -16 || dy > 13) continue;
    const score = Math.hypot(dx, dy);
    if (score < bestScore) {
      best = agent;
      bestScore = score;
    }
  }

  if (best) {
    sim.selectAgent(best.id);
  } else {
    sim.inspector?.close();
    sim.camera.follow = null;
  }
}

// ---------- Keyboard ----------

function isInteractiveTarget(el) {
  if (!el || !(el instanceof HTMLElement)) return false;
  return !!el.closest('input, textarea, select, button, [contenteditable="true"]');
}

function bindKeyboard() {
  window.addEventListener('keydown', (e) => {
    if (sim.modals?.current) return;
    if (isInteractiveTarget(e.target)) return;

    if (e.code === 'Space') {
      e.preventDefault();
      sim.togglePause();
      return;
    }
    if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      sim.camera.zoomIn();
      return;
    }
    if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      sim.camera.zoomOut();
      return;
    }
    if (e.key === 'Escape') {
      sim.inspector?.close();
    }
  });
}

// ---------- Go ----------

boot().catch((err) => {
  console.error('[Pixel Sinergi] gagal boot:', err);
  const pre = document.createElement('pre');
  pre.style.cssText = 'position:fixed;inset:20px;z-index:9999;background:#1a1e2a;color:#ffb3b3;padding:20px;border:1px solid #ff6b6b;overflow:auto;font:12px monospace;';
  pre.textContent = `Gagal memuat PT Pixel Sinergi Nusantara.\n\n${err?.stack || err}`;
  document.body.appendChild(pre);
});

// util kecil dipakai console/QA
export { sim, formatGameTime };
