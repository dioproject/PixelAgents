// ============================================================
// directives.js — Titah Direksi (aksi pemain)
// ============================================================

import { bus } from '../core/bus.js';
import { uid, choice, clamp } from '../core/utils.js';
import { DIRECTIVE_FORMAL, MEETING_TURNS, pickDirectiveLines } from '../llm/fallback.js';
import { isLlmReady } from '../core/config.js';
import { chat } from '../llm/client.js';
import { buildDirectivePrompt, parseMessages, matchSpeaker } from '../llm/prompts.js';

export const DIRECTIVE_PRESETS = [
  {
    type: 'rapat',
    icon: '📢',
    title: 'Rapat Dadakan 5 Menit Lagi!',
    desc: 'Semua divisi kumpul di Ruang Meeting sekarang. Tidak ada yang boleh telat.',
  },
  {
    type: 'budget',
    icon: '☕',
    title: 'Potong Budget Kopi 50%',
    desc: 'Mulai hari ini, kopi kantor diawasi. Finance senang, tim lain menangis.',
  },
  {
    type: 'lembur',
    icon: '🌙',
    title: 'Lembur Malam Ini, Semangat!',
    desc: 'IT & GA pulang paling akhir. Sisanya pulang biasa sambil merasa bersalah.',
  },
  {
    type: 'pizza',
    icon: '🍕',
    title: 'Pizza Party Jam 3!',
    desc: 'Mood semua naik +25. Pasti ada yang ambil dua slice diam-diam.',
  },
  {
    type: 'batik',
    icon: '👔',
    title: 'Batik Day Besok',
    desc: 'Besok semua wajib batik. HRD antusias, yang lain cek lemari.',
  },
  {
    type: 'bebas',
    icon: '🏖️',
    title: 'Bebas Ngapain Aja Seharian',
    desc: 'Tidak ada tugas hari ini. Semua santai, tapi curiga ini jebakan.',
  },
  {
    type: 'proyek',
    icon: '📋',
    title: 'Tugas Proyek Baru',
    desc: 'Tulis brief; semua divisi kerja, hasilnya paket file nyata (laporan, poster, CSV, kode).',
  },
];

const RESPONDERS_BY_TYPE = {
  rapat: ['hrd', 'it', 'finance', 'marketing'],
  budget: ['finance', 'hrd', 'it', 'ga'],
  lembur: ['it', 'finance', 'hrd', 'ga'],
  pizza: ['hrd', 'it', 'marketing', 'ga'],
  batik: ['hrd', 'marketing', 'it', 'ga'],
  bebas: ['it', 'hrd', 'marketing', 'finance'],
  custom: ['hrd', 'it', 'marketing', 'finance'],
};

export class DirectiveSystem {
  constructor(sim) {
    this.sim = sim;
    this.active = null;
  }

  /**
   * Kirim titah.
   * @param {string} type rapat|budget|lembur|pizza|batik|bebas|custom
   * @param {string} [customText]
   */
  send(type, customText = '') {
    const sim = this.sim;
    const preset = DIRECTIVE_PRESETS.find((p) => p.type === type);
    const rawCustom = String(customText || '').trim();
    const text = (type === 'custom' || type === 'proyek') && rawCustom
      ? rawCustom
      : (preset?.title || 'Titah');
    if (!text) return;

    const directive = {
      id: uid('dir'),
      type,
      text,
      atMin: sim.clock.timeMin,
      day: sim.clock.day,
    };
    sim.lastDirective = directive;
    sim.stats.directives += 1;

    sim.feed.add({
      channel: 'direksi',
      text: `📜 TITAH DIREKSI: "${text}"`,
      meta: { directive: type },
    });
    sim.sfx?.chime();
    sim.toast(`📜 Titah Direksi dikirim ke seluruh kantor!`, 'info');
    bus.emit('directive:sent', directive);

    switch (type) {
      case 'rapat':
        this.effectMeeting(directive);
        break;
      case 'budget': {
        sim.flags.coffeeBudgetCut = true;
        this.respond(directive);
        break;
      }
      case 'lembur': {
        sim.flags.overtime = true;
        for (const a of sim.agents) {
          a.stats.stress = clamp(a.stats.stress + 8, 0, 100);
        }
        this.respond(directive);
        break;
      }
      case 'pizza': {
        sim.flags.pizzaPartyActive = true;
        for (const a of sim.agents) {
          a.stats.mood = clamp(a.stats.mood + 25, 0, 100);
        }
        this.respond(directive);
        break;
      }
      case 'batik': {
        sim.flags.batikDay = true;
        this.respond(directive);
        break;
      }
      case 'bebas': {
        sim.flags.freeDay = true;
        this.respond(directive);
        break;
      }
      case 'proyek': {
        this.sim.projects?.start(text);
        break;
      }
      case 'custom':
      default:
        this.respond(directive, customText);
        break;
    }
  }

  // ---------------- Efek khusus ----------------

  effectMeeting(directive) {
    const sim = this.sim;
    if (this.active === 'rapat') return;
    this.active = 'rapat';
    sim.toast('📢 RAPAT DADAKAN! Semua divisi menuju ruang meeting…', 'danger');

    sim.behavior.gatherMeeting(() => {
      const movers = sim.agents.filter((a) => !a.isStatic && !a.gone);
      const members = movers.slice(0, 6);
      sim.conversations.startScripted({
        kind: 'meeting',
        members,
        turns: MEETING_TURNS,
        channel: 'kerja',
        origin: 'scripted',
        onEnd: () => {
          sim.behavior.releaseMeeting();
          this.active = null;
          sim.toast('✅ Rapat selesai. Semua kembali bekerja (dan mengeluh).', 'info');
        },
      });
    });
    void directive;
  }

  // ---------------- Respons formal ke Direktur ----------------

  async respond(directive, customText = '') {
    const sim = this.sim;

    // Pilih responder per divisi
    const divisions = RESPONDERS_BY_TYPE[directive.type] || RESPONDERS_BY_TYPE.custom;
    const responders = [];
    for (const div of divisions) {
      const agent = sim.agents.find((a) => a.def.division === div && !a.isStatic && !a.gone);
      if (agent && !responders.includes(agent)) responders.push(agent);
      if (responders.length >= 4) break;
    }
    if (responders.length === 0) return;

    const finishWith = (turns) => {
      sim.conversations.startScripted({
        kind: 'directive',
        members: responders,
        turns,
        channel: 'direksi',
        origin: 'fallback',
        onEnd: () => {
          sim.conversations.scheduleDirectiveGossip(directive.type);
        },
      });
    };

    if (isLlmReady()) {
      const typing = responders[0];
      sim.bubbles?.show(typing, { typing: true });
      const res = await chat(
        buildDirectivePrompt(sim, customText || directive.text, responders),
        { timeoutSecs: 22 }
      );
      sim.bubbles?.remove(typing);
      if (res.ok) {
        const parsed = parseMessages(res.text);
        const turns = [];
        let at = 0;
        let lastSpeaker = null;
        for (const item of (parsed || []).slice(0, 6)) {
          const speaker = matchSpeaker(responders, item.speaker)
            || responders.find((r) => r !== lastSpeaker)
            || responders[0];
          const text = item.text?.replace(/\s+/g, ' ').trim();
          if (!text) continue;
          turns.push({ speakerId: speaker.id, text: text.slice(0, 180), at, channel: 'direksi' });
          lastSpeaker = speaker;
          at += 2000 + Math.min(text.length * 28, 2400);
        }
        if (turns.length >= 2) {
          finishWith(turns);
          return;
        }
      }
    }

    // Fallback: bank formal
    const lines = pickDirectiveLines(DIRECTIVE_FORMAL, directive.type, Math.min(3, responders.length));
    const turns = [];
    let at = 0;
    for (const line of lines) {
      const speaker = responders.find((r) => r.def.division === line.division)
        || choice(responders);
      if (!speaker) continue;
      turns.push({ speakerId: speaker.id, text: line.text, at, channel: 'direksi' });
      at += 2200 + Math.min(line.text.length * 28, 2400);
    }
    finishFinal(finishWith, turns);
  }
}

function finishFinal(finishWith, turns) {
  if (!turns || turns.length === 0) return;
  finishWith(turns);
}
