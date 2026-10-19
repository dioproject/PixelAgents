// ============================================================
// behavior.js — Planner rutinitas harian agen
// ============================================================

import { SEATS } from '../world/office.js';
import { chance, shuffle } from '../core/utils.js';

export function blockFor(timeMin) {
  if (timeMin < 540) return 'arrival';   // 08:30–09:00
  if (timeMin < 720) return 'work1';     // 09:00–12:00
  if (timeMin < 780) return 'lunch';     // 12:00–13:00
  if (timeMin < 900) return 'work2';     // 13:00–15:00
  if (timeMin < 930) return 'break';     // 15:00–15:30
  if (timeMin < 1020) return 'capek';    // 15:30–17:00
  if (timeMin < 1080) return 'home';     // 17:00–18:00
  return 'end';
}

const LUNCH_SEATS = SEATS.filter((s) => s.kind === 'pantry' || (s.kind === 'sofa' && s.y >= 28 && s.y < 47));
const SOFA_SEATS = SEATS.filter((s) => s.kind === 'sofa');
const MEETING_SEATS = SEATS.filter((s) => s.kind === 'meeting');

const VISIT_SPOTS = {
  it: { x: 18, y: 6 },
  marketing: { x: 40, y: 35 },
  finance: { x: 12, y: 35 },
  hrd: { x: 12, y: 57 },
  ga: { x: 40, y: 57 },
  pantry: { x: 75, y: 35 },
  meeting: { x: 47, y: 13 },
  director: { x: 79, y: 10 },
};

const WORK_LABELS = {
  arrival: 'Baru sampai, nyalain laptop',
  work1: 'Deep work',
  work2: 'Lanjut kerja',
  capek: 'Kerja (capek)',
};

export class Behavior {
  constructor(sim) {
    this.sim = sim;
    this._tripCooldown = new Map();     // agentId -> ms next allowed
    this._visitCooldown = new Map();
  }

  update(_dtMs, gameMinutes = 0) {
    const sim = this.sim;
    const block = blockFor(sim.clock.timeMin);

    for (const agent of sim.agents) {
      if (agent.isStatic || agent.gone) continue;
      this.updateAgent(agent, block, gameMinutes);
    }
  }

  updateAgent(agent, block, gameMinutes) {
    const sim = this.sim;
    const clock = sim.clock;

    if (agent.activity.type === 'chat' || agent.activity.type === 'meeting') {
      if (agent.activity.forced) return;
    }
    if (agent.activity.forced) return;
    if (agent.path.length > 0) return;

    // ==== Pizza party / free day: semua santai ====
    if (sim.flags.freeDay) {
      if (agent.dayFlags.freeDay !== clock.day) {
        agent.dayFlags.freeDay = clock.day;
        this.goSlack(agent);
      }
      return;
    }
    if (sim.flags.pizzaPartyActive && agent.dayFlags.pizza !== clock.day) {
      agent.dayFlags.pizza = clock.day;
      this.goPantryParty(agent);
      return;
    }

    // ==== Blok rutinitas normal ====
    const key = block;
    if (agent.dayFlags[key] !== clock.day) {
      agent.dayFlags[key] = clock.day;
      this.assignForBlock(agent, block);
      return;
    }

    this.maybeSecondary(agent, block, gameMinutes);
  }

  assignForBlock(agent, block) {
    const sim = this.sim;
    switch (block) {
      case 'arrival':
      case 'work1':
      case 'work2':
      case 'capek': {
        const proj = sim.projects?.active;
        if (proj) this.goWork(agent, `Fokus proyek: ${proj.title}`);
        else this.goWork(agent, WORK_LABELS[block] || 'Bekerja');
        break;
      }
      case 'lunch':
        this.goPantry(agent, 'Makan siang', 'lunch');
        break;
      case 'break':
        this.goPantry(agent, 'Coffee break sore', 'break');
        break;
      case 'home': {
        const proj = sim.projects?.active;
        const lembur = ['it', 'ga'].includes(agent.def.division);
        if (proj) {
          this.goWork(agent, `Fokus proyek: ${proj.title}`);
        } else if (sim.flags.overtime) {
          this.goWork(agent, 'Lembur (semua divisi)');
        } else if (lembur && !sim.flags.allGoHome) {
          this.goWork(agent, 'Lembur (pura-pura semangat)');
        } else {
          agent.goHome();
        }
        break;
      }
      default:
        break;
    }
  }

  // ---------------- Aktivitas utama ----------------

  goWork(agent, label) {
    const seat = agent.def.desk;
    agent.walkTo(seat, () => {
      agent.sitAt({ id: `seat.${agent.id}`, kind: 'desk', x: seat.x, y: seat.y, facing: seat.face }, label);
    }, label);
  }

  /** Ke pantry: kursi bebas dulu, kalau penuh berdiri di dekat meja */
  goPantry(agent, label, kind) {
    const pool = kind === 'break' ? [...SOFA_SEATS, ...LUNCH_SEATS] : LUNCH_SEATS;
    const seat = this.findFreeSeat(agent, pool);
    if (seat) {
      agent.walkTo({ x: seat.x, y: seat.y }, () => {
        agent.sitAt(seat, label);
      }, label);
    } else {
      agent.walkTo({ x: 69, y: 36 }, () => {
        agent.standIdle('Antri ngambil makan', 'idle');
      }, label);
    }
  }

  goPantryParty(agent) {
    this.goPantry(agent, 'Pizza party! 🍕', 'break');
  }

  goSlack(agent) {
    const r = Math.random();
    if (r < 0.4) {
      const seat = this.findFreeSeat(agent, [...SOFA_SEATS, ...LUNCH_SEATS]);
      if (seat) {
        agent.walkTo({ x: seat.x, y: seat.y }, () => agent.sitAt(seat, 'Santai (mode bebas)'), 'Cari spot santai');
        return;
      }
    }
    if (r < 0.7) {
      const stand = this.sim.world.findFreeStand('pool', agent.id);
      if (stand) {
        this.sim.world.reserve(stand.x, stand.y, agent.id);
        agent.walkTo(stand, () => {
          agent.standIdle('Nonton biliar kantor', 'idle');
        }, 'Ke area biliar');
        return;
      }
    }
    agent.walkTo({ x: 27, y: 15 }, () => agent.standIdle('Rebahan di beanbag', 'idle'), 'Ke beanbag');
  }

  // ---------------- Aktivitas sekunder ----------------

  maybeSecondary(agent, block, gameMinutes) {
    const sim = this.sim;
    const working = agent.activity.type === 'work';
    const nowMin = (sim.clock.day - 1) * 1440 + sim.clock.timeMin;

    // 1) Trip kopi saat kerja (cooldown & peluang memakai menit game,
    //    supaya tetap konsisten di semua kecepatan simulasi).
    if (working && ['work1', 'work2', 'capek'].includes(block)) {
      const nextOk = this._tripCooldown.get(agent.id) || 0;
      if (nowMin >= nextOk && agent.stats.coffee < 1.6) {
        const p = gameMinutes * 0.02 * (sim.projects?.active ? 0.5 : 1);
        if (chance(p)) {
          this._tripCooldown.set(agent.id, nowMin + 45);
          this.coffeeTrip(agent);
          return;
        }
      }
    }

    // 2) Kunjungan lintas divisi
    if (!sim.projects?.active && working && ['work1', 'work2'].includes(block)) {
      const flagKey = `visit_${block}`;
      if (agent.dayFlags[flagKey] !== sim.clock.day) {
        const p = gameMinutes * 0.002;
        if (chance(p)) {
          agent.dayFlags[flagKey] = sim.clock.day;
          this.crossVisit(agent);
          return;
        }
      }
    }
  }

  /** Ubah durasi game (menit) jadi delay wall-clock yang ikut time-lapse. */
  gameDelay(gameMinutes) {
    const speed = Math.min(Math.max(this.sim.clock.speed || 1, 1), 8);
    return Math.max(400, (gameMinutes * 1000) / speed);
  }

  coffeeTrip(agent) {
    const sim = this.sim;
    const stand = sim.world.findFreeStand('coffee', agent.id);
    if (!stand) return;
    sim.world.reserve(stand.x, stand.y, agent.id);
    agent.forceActivity('coffee', 'Ke mesin kopi');
    agent.walkTo(stand, () => {
      agent.forceActivity('coffee', 'Menyeduh kopi…');
      agent.spriteState = 'drink';
      sim.after(this.gameDelay(2.6), () => {
        if (agent.gone) return;
        agent.drinkCoffee({ budgetCut: sim.flags.coffeeBudgetCut });
        sim.stats.coffeeDrinks += 1;
        sim.sfx?.sip();
        sim.world.release(stand.x, stand.y, agent.id);
        this.returnToDesk(agent, 'Balik ke meja bawa kopi');
      });
    }, 'Ke mesin kopi');
  }

  crossVisit(agent) {
    const sim = this.sim;
    const others = Object.keys(VISIT_SPOTS).filter((d) => d !== agent.def.division && d !== 'director');
    const target = others[Math.floor(Math.random() * others.length)];
    const spot = VISIT_SPOTS[target];
    const label = `Main ke divisi ${target.toUpperCase()}`;
    agent.walkTo(spot, () => {
      agent.forceActivity('idle', label);
      agent.spriteState = 'idle';
      sim.after(this.gameDelay(8), () => {
        if (agent.gone || agent.activity.type === 'chat' || agent.activity.type === 'meeting') return;
        this.returnToDesk(agent, 'Balik ke meja');
      });
    }, label);
  }

  returnToDesk(agent, label) {
    const seat = agent.def.desk;
    const wasForced = agent.activity.forced;
    agent.activity.type = 'walk';   // hentikan status coffee
    agent.walkTo(seat, () => {
      agent.sitAt({ id: `seat.${agent.id}`, kind: 'desk', x: seat.x, y: seat.y, facing: seat.face }, label);
      agent.activity.forced = false;
    }, label);
    if (!wasForced) agent.activity.forced = false;
  }

  // ---------------- Rapat (dipakai directive) ----------------

  /** Kumpulkan semua agen ke kursi meeting. callback saat semua tiba (atau timeout). */
  gatherMeeting(onAllArrived) {
    const sim = this.sim;
    const seats = shuffle(MEETING_SEATS);
    const arrivals = [];
    let arrived = 0;
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      onAllArrived();
    };

    const movers = sim.agents.filter((a) => !a.isStatic && !a.gone);
    if (movers.length === 0) { finish(); return; }

    movers.forEach((agent, i) => {
      const seat = seats[i % seats.length];
      agent.forceActivity('meeting', 'Rapat dadakan!');
      agent.walkTo({ x: seat.x, y: seat.y }, () => {
        agent.sitAt(seat, 'Rapat dadakan!');
        agent.activity.type = 'meeting';
        agent.activity.forced = true;
        arrivals.push(agent.id);
        arrived++;
        if (arrived >= movers.length) finish();
      }, 'Menuju ruang meeting');
    });

    sim.after(30000, () => finish());   // timeout
  }

  /** Lepaskan semua agen dari rapat & kembalikan ke kerja */
  releaseMeeting() {
    const sim = this.sim;
    for (const agent of sim.agents) {
      if (agent.isStatic) continue;
      if (agent.activity.type === 'meeting') {
        agent.activity.forced = false;
        agent.releaseSeat();
        this.goWork(agent, 'Balik kerja setelah rapat');
      }
    }
    void sim;
  }

  findFreeSeat(agent, pool) {
    const candidates = shuffle(pool);
    for (const s of candidates) {
      if (!this.sim.world.isWalkable(s.x, s.y, agent.id)) continue;
      if (this.sim.world.isReservedByOther(s.x, s.y, agent.id)) continue;
      return s;
    }
    return null;
  }
}
