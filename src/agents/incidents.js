// ============================================================
// incidents.js — Insiden kantor otomatis (drama tanpa sutradara)
// ============================================================

import { weightedChoice, choice, clamp } from '../core/utils.js';
import {
  scriptKeceplosan,
  scriptAcWar,
  scriptReimburse,
  scriptPrinterJam,
  scriptBsod,
  scriptBirthday,
  scriptKpiReminder,
} from '../llm/fallback.js';

const INCIDENTS = [
  { id: 'keceplosan', weight: 8, cooldown: 180 },
  { id: 'ac_war', weight: 10, cooldown: 130 },
  { id: 'reimburse', weight: 10, cooldown: 130 },
  { id: 'printer', weight: 8, cooldown: 130 },
  { id: 'kpi', weight: 12, cooldown: 110 },
  { id: 'birthday', weight: 4, cooldown: 1440 },
  { id: 'bsod', weight: 6, cooldown: 160 },
];

const ROLL_EVERY_GAME_MIN = 20;
const ROLL_CHANCE = 0.55;

export class IncidentSystem {
  constructor(sim) {
    this.sim = sim;
    this.acc = 0;
    this.cooldownUntil = {};   // id -> total game minutes
    this.lastIncident = null;
    this.count = 0;
  }

  totalMin() {
    return (this.sim.clock.day - 1) * 1440 + this.sim.clock.timeMin;
  }

  update(gameMinutes) {
    if (gameMinutes <= 0) return;
    this.acc += gameMinutes;
    if (this.acc < ROLL_EVERY_GAME_MIN) return;
    this.acc = 0;

    const sim = this.sim;
    const t = sim.clock.timeMin;
    if (t < 555 || t > 1010) return;                       // hanya 09:15–16:50
    if (sim.conversations.active.some((c) => c.kind === 'incident')) return;
    if (Math.random() > ROLL_CHANCE) return;

    const now = this.totalMin();
    const pool = INCIDENTS.filter((inc) => (this.cooldownUntil[inc.id] || 0) <= now);
    if (pool.length === 0) return;

    const inc = weightedChoice(pool);
    this.run(inc.id);
  }

  markRan(id, cooldown) {
    this.cooldownUntil[id] = this.totalMin() + cooldown;
    this.count += 1;
    this.lastIncident = { id, atMin: this.sim.clock.timeMin, day: this.sim.clock.day };
    this.sim.stats.incidents += 1;
  }

  pickActive(filterFn = () => true) {
    return this.sim.agents.filter((a) => !a.isStatic && !a.gone && filterFn(a));
  }

  run(id) {
    switch (id) {
      case 'keceplosan': this.runKeceplosan(); break;
      case 'ac_war': this.runAcWar(); break;
      case 'reimburse': this.runReimburse(); break;
      case 'printer': this.runPrinter(); break;
      case 'kpi': this.runKpi(); break;
      case 'birthday': this.runBirthday(); break;
      case 'bsod': this.runBsod(); break;
      default: break;
    }
  }

  // ---------------- Insiden: KECEPLOSAN ----------------
  runKeceplosan() {
    const sim = this.sim;
    // junior lebih sering typo: level 1 berbobot 3x
    const pool = this.pickActive((a) => a.def.level <= 2);
    if (pool.length === 0) return;
    const weighted = pool.flatMap((a) => (a.def.level === 1 ? [a, a, a] : [a]));
    const culprit = choice(weighted);
    const hr = sim.agentById('maya') || this.pickActive((a) => a.def.division === 'hrd')[0];
    const witnessPool = this.pickActive((a) => a !== culprit && a.def.division !== 'hrd');
    const witness = choice(witnessPool);

    if (!hr || !witness) return;
    this.markRan('keceplosan', 180);

    const script = scriptKeceplosan();
    const firstLine = choice(script.first);

    culprit.setOverrideFrame('shock', 4200);
    sim.sfx?.alert();
    sim.toast(`💀 KECEPLOSAN! ${culprit.def.name} salah kirim chat ke Direktur!`, 'danger');

    sim.conversations.startScripted({
      kind: 'incident',
      members: [culprit, witness],
      channel: 'gosip',
      origin: 'scripted',
      turns: [
        { speakerId: culprit.id, text: firstLine, at: 0, channel: 'gosip' },
        { speakerId: hr.id, text: script.hr(culprit.def.name), at: 4200, channel: 'hr' },
        { speakerId: culprit.id, text: script.apology, at: 9000, channel: 'direksi' },
        { speakerId: witness.id, text: script.gossip(culprit.def.name), at: 14500, channel: 'gosip' },
      ],
      onEnd: () => {
        culprit.stats.stress = clamp(culprit.stats.stress + 30, 0, 100);
        culprit.stats.mood = clamp(culprit.stats.mood - 10, 0, 100);
        hr.stats.stress = clamp(hr.stats.stress + 5, 0, 100);
      },
    });
  }

  // ---------------- Insiden: PERANG AC ----------------
  runAcWar() {
    const sim = this.sim;
    const marketing = this.pickActive((a) => a.def.division === 'marketing');
    const ga = this.pickActive((a) => a.def.division === 'ga');
    if (!marketing.length || !ga.length) return;
    const a = choice(marketing);
    const b = choice(ga);
    this.markRan('ac_war', 130);
    sim.toast('❄️ Perang suhu AC meletus! GA vs Marketing.', 'info');

    sim.conversations.startScripted({
      kind: 'incident',
      members: [a, b],
      channel: 'kerja',
      origin: 'scripted',
      turns: scriptAcWar(),
      onEnd: () => {
        b.stats.stress = clamp(b.stats.stress - 2, 0, 100);
      },
    });
  }

  // ---------------- Insiden: REIMBURSE DITOLAK ----------------
  runReimburse() {
    const sim = this.sim;
    const victims = this.pickActive((a) => a.def.division !== 'finance' && a.def.division !== 'hrd' && a.def.level <= 2);
    if (victims.length === 0) return;
    const victim = choice(victims);
    const finance = this.pickActive((a) => a.def.division === 'finance');
    if (!finance.length) return;
    const fin = choice(finance);
    this.markRan('reimburse', 130);
    sim.sfx?.cash();
    sim.toast(`🧾 Klaim reimburse ${victim.def.name} ditolak Finance. Nota tidak sesuai prosedur.`, 'info');

    sim.conversations.startScripted({
      kind: 'incident',
      members: [victim, fin],
      channel: 'kerja',
      origin: 'scripted',
      turns: scriptReimburse(victim.def.name, victim.def.division),
      onEnd: () => {
        victim.stats.mood = clamp(victim.stats.mood - 6, 0, 100);
      },
    });
  }

  // ---------------- Insiden: PRINTER NYANGKUT ----------------
  runPrinter() {
    const sim = this.sim;
    const fin = this.pickActive((a) => a.def.division === 'finance')[0];
    const ga = this.pickActive((a) => a.def.division === 'ga')[0];
    if (!fin || !ga) return;
    this.markRan('printer', 130);
    sim.toast('🖨️ Mesin fotokopi nyangkut! Mas Joko dipanggil.', 'info');

    sim.conversations.startScripted({
      kind: 'incident',
      members: [fin, ga],
      channel: 'kerja',
      origin: 'scripted',
      turns: scriptPrinterJam(),
      onEnd: () => {
        for (const a of this.pickActive()) {
          a.stats.stress = clamp(a.stats.stress - 3, 0, 100);
        }
      },
    });
  }

  // ---------------- Insiden: KPI REMINDER ----------------
  runKpi() {
    const sim = this.sim;
    const hrAgents = this.pickActive((a) => a.def.division === 'hrd');
    const groaner = choice(this.pickActive((a) => a.def.division !== 'hrd'));
    if (!hrAgents.length || !groaner) return;
    this.markRan('kpi', 110);
    sim.sfx?.alert();
    sim.toast('📢 HRD: Deadline pengisian form KPI tinggal 2 hari!', 'danger');

    sim.conversations.startScripted({
      kind: 'incident',
      members: [hrAgents[0], groaner],
      channel: 'hr',
      origin: 'scripted',
      turns: scriptKpiReminder(),
      onEnd: () => {
        for (const a of this.pickActive()) {
          a.stats.stress = clamp(a.stats.stress + 8, 0, 100);
        }
      },
    });
  }

  // ---------------- Insiden: ULANG TAHUN ----------------
  runBirthday() {
    const sim = this.sim;
    const kevin = sim.agentById('kevin') || this.pickActive((a) => a.def.division === 'hrd')[0];
    if (!kevin) return;
    const pool = this.pickActive((a) => a !== kevin);
    const target = choice(pool);
    if (!target) return;
    this.markRan('birthday', 1440);
    sim.sfx?.chime();
    sim.toast(`🎂 Ulang tahun ${target.def.name}! Kevin menyiapkan kejutan canggung di pantry.`, 'success');

    sim.conversations.startScripted({
      kind: 'incident',
      members: [kevin, target],
      channel: 'gosip',
      origin: 'scripted',
      turns: scriptBirthday(target.def.name),
      onEnd: () => {
        for (const a of this.pickActive()) {
          a.stats.mood = clamp(a.stats.mood + 10, 0, 100);
        }
      },
    });
  }

  // ---------------- Insiden: LAPTOP BSOD ----------------
  runBsod() {
    const sim = this.sim;
    const itPool = this.pickActive((a) => a.def.division === 'it');
    if (itPool.length < 2) return;
    const victim = itPool.find((a) => a.def.level === 1) || itPool[0];
    const helper = itPool.find((a) => a !== victim) || itPool[1];
    this.markRan('bsod', 160);
    sim.toast(`💻 Laptop ${victim.def.name} BSOD di tengah sprint!`, 'danger');

    const script = scriptBsod(victim.def.name)
      .map((turn, i) => (i === 1 ? { ...turn, speakerId: helper.id } : turn));

    sim.conversations.startScripted({
      kind: 'incident',
      members: [victim, helper],
      channel: 'kerja',
      origin: 'scripted',
      turns: script,
      onEnd: () => {
        victim.stats.mood = clamp(victim.stats.mood - 4, 0, 100);
        victim.stats.stress = clamp(victim.stats.stress - 5, 0, 100);
        helper.stats.mood = clamp(helper.stats.mood + 3, 0, 100);
      },
    });
  }
}
