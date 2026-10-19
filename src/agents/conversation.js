// ============================================================
// conversation.js — Orkestrasi percakapan antar karyawan
// LLM tidak pernah memblokir: fallback procedural selalu siap.
// ============================================================

import { bus } from '../core/bus.js';
import { uid, sanitizeLine, chance, choice, clamp, dist2, rand } from '../core/utils.js';
import { chat } from '../llm/client.js';
import { isLlmReady } from '../core/config.js';
import { buildConversationPrompt, parseMessages, matchSpeaker } from '../llm/prompts.js';
import { matchPairTemplate, SIDE_REACTIONS, DIRECTIVE_GOSSIP, pickDirectiveLines } from '../llm/fallback.js';
import { blockFor } from './behavior.js';

const LLM_COOLDOWN_MS = 45000;
const CONV_TIMEOUT_SECS = 20;

export class ConversationManager {
  constructor(sim) {
    this.sim = sim;
    this.active = [];
    this.lastStartAt = 0;
    this.lastLlmAt = 0;
    this.llmBusy = false;
    this.intervalMs = 15000;
    this.recentTemplateIds = [];
  }

  update(nowMs) {
    for (const conv of [...this.active]) {
      this.progress(conv, nowMs);
    }
    if (nowMs - this.lastStartAt > this.intervalMs) {
      this.lastStartAt = nowMs;
      if (this.active.length < 2) this.tryStartPair(nowMs);
    }
  }

  /** Tutup paksa semua percakapan aktif (dipakai saat pergantian hari). */
  endAll() {
    for (const conv of [...this.active]) {
      for (const agent of conv.members) this.sim.bubbles?.remove(agent);
      this.finish(conv);
    }
  }

  // ---------------- Percakapan spontan ----------------

  tryStartPair(nowMs) {
    const sim = this.sim;
    const candidates = sim.agents.filter(
      (a) => !a.isStatic && !a.gone && !a.busy
        && !['chat', 'meeting', 'gone', 'walk', 'coffee'].includes(a.activity.type)
    );

    const pairs = [];
    for (let i = 0; i < candidates.length; i++) {
      for (let j = i + 1; j < candidates.length; j++) {
        const a = candidates[i];
        const b = candidates[j];
        const roomA = sim.world.roomAt(a.tile.x, a.tile.y);
        const roomB = sim.world.roomAt(b.tile.x, b.tile.y);
        if (!roomA || !roomB || roomA.id !== roomB.id) continue;
        if (roomA.corridor) continue;
        const d2 = dist2(a.px, a.py, b.px, b.py);
        if (d2 > (7 * 16) ** 2) continue;
        pairs.push([a, b, roomA.id]);
      }
    }
    if (pairs.length === 0) return;

    const [a, b, roomId] = choice(pairs);
    this.startPair(a, b, roomId, nowMs);
  }

  contextFor(roomId) {
    const block = blockFor(this.sim.clock.timeMin);
    if (roomId === 'pantry') return block === 'lunch' ? 'lunch' : 'gosip';
    if (block === 'lunch') return 'lunch';
    if (block === 'capek' || block === 'home' || block === 'end') return 'sore';
    if (roomId === 'meeting') return 'work';
    return 'work';
  }

  startPair(a, b, roomId, nowMs) {
    const sim = this.sim;
    const ctx = this.contextFor(roomId);

    for (const agent of [a, b]) {
      agent.forceActivity('chat', 'Ngobrol sebentar');
      agent.spriteState = agent.seatedSeat ? 'sit' : 'idle';
    }
    a.faceTo(b.px, b.py);
    b.faceTo(a.px, a.py);

    const template = matchPairTemplate(sim, a, b, ctx, roomId);
    const fallbackTurns = template
      ? this.templateToTurns(template, a, b)
      : this.genericTurns(a, b, ctx);

    if (template) {
      this.recentTemplateIds.push(template.id);
      if (this.recentTemplateIds.length > 8) this.recentTemplateIds.shift();
    }

    const channel = ['gosip', 'lunch', 'sore'].includes(ctx) && !(roomId === 'it' || roomId === 'finance' || roomId === 'marketing')
      ? 'gosip'
      : (ctx === 'gosip' || ctx === 'lunch' ? 'gosip' : 'kerja');

    const canLlm = isLlmReady() && !this.llmBusy && nowMs - this.lastLlmAt > LLM_COOLDOWN_MS;

    if (canLlm) {
      this.llmBusy = true;
      this.lastLlmAt = nowMs;
      const typingAgent = chance(0.5) ? a : b;
      sim.bubbles?.show(typingAgent, { typing: true });

      const extra = this.recentEventHint();
      chat(buildConversationPrompt(sim, a, b, ctx, roomId, extra), { timeoutSecs: CONV_TIMEOUT_SECS })
        .then((res) => {
          this.llmBusy = false;
          sim.bubbles?.remove(typingAgent);
          if (res.ok) {
            const parsed = parseMessages(res.text);
            const turns = this.llmToTurns(parsed, [a, b], channel);
            if (turns) {
              this.begin({ kind: 'pair', members: [a, b], turns, channel, origin: 'llm', roomId });
              return;
            }
          }
          this.begin({ kind: 'pair', members: [a, b], turns: fallbackTurns, channel, origin: 'fallback', roomId });
        })
        .catch(() => {
          this.llmBusy = false;
          sim.bubbles?.remove(typingAgent);
          this.begin({ kind: 'pair', members: [a, b], turns: fallbackTurns, channel, origin: 'fallback', roomId });
        });
    } else {
      this.begin({ kind: 'pair', members: [a, b], turns: fallbackTurns, channel, origin: 'fallback', roomId });
    }
  }

  recentEventHint() {
    const sim = this.sim;
    const d = sim.lastDirective;
    if (d && sim.clock.timeMin - d.atMin < 90) {
      return `Direktur baru mengeluarkan titah: "${d.text}". Karyawan masih membicarakannya.`;
    }
    return sim.feed.incidentHint();
  }

  templateToTurns(template, a, b) {
    const turns = [];
    let at = 0;
    for (const line of template.lines) {
      const speaker = this.resolveToken(line.by, a, b);
      const text = sanitizeLine(line.text);
      if (!speaker || !text) continue;
      turns.push({ speakerId: speaker.id, text, at, channel: template.channel });
      at += 1500 + Math.min(text.length * 30, 2600) + rand(0, 700);
    }
    return turns;
  }

  genericTurns(a, b, ctx) {
    const bank = SIDE_REACTIONS[ctx] || SIDE_REACTIONS.gosip;
    const lines = [...bank].sort(() => Math.random() - 0.5).slice(0, 2);
    let at = 0;
    return lines.map((l, i) => {
      const speaker = i % 2 === 0 ? a : b;
      const text = sanitizeLine(l.text);
      const turn = { speakerId: speaker.id, text, at, channel: 'gosip' };
      at += 1800 + text.length * 30;
      return turn;
    });
  }

  llmToTurns(parsed, members, channel) {
    if (!parsed) return null;
    const turns = [];
    let at = 0;
    let lastSpeaker = null;
    for (const item of parsed.slice(0, 6)) {
      let speaker = matchSpeaker(members, item.speaker);
      if (!speaker) speaker = members.find((m) => m !== lastSpeaker) || members[0];
      const text = sanitizeLine(item.text);
      if (!text) continue;
      turns.push({ speakerId: speaker.id, text, at, channel });
      lastSpeaker = speaker;
      at += 1500 + Math.min(text.length * 30, 2600) + rand(0, 700);
    }
    return turns.length >= 2 ? turns : null;
  }

  resolveToken(token, a, b) {
    if (!token) return a;
    if (token === 'A') return a;
    if (token === 'B') return b;
    if (token === 'any') return chance(0.5) ? a : b;
    if (token === 'hr') return this.sim.agentById('maya') || a;
    if (a.def.division === token) return a;
    if (b.def.division === token) return b;
    if (a.def.id === token) return a;
    if (b.def.id === token) return b;
    const byDivision = this.sim.agents.find((x) => x.def.division === token && !x.gone && !x.isStatic);
    return byDivision || a;
  }

  // ---------------- Skrip (insiden, titah, rapat) ----------------

  /**
   * @param {{kind:string, members:Agent[], turns:Array<{by?:string,speakerId?:string,text:string,name?:string}>, channel?:string, origin?:string, onEnd?:Function}} opts
   */
  startScripted(opts) {
    const { members = [], turns: rawTurns = [], channel = 'gosip', kind = 'scripted', origin = 'scripted', onEnd } = opts;

    const turns = [];
    let at = 0;
    const roster = this.sim.agents.filter((x) => !x.gone && !x.isStatic);

    for (const raw of rawTurns) {
      let speaker = null;
      if (raw.speakerId) speaker = this.sim.agentById(raw.speakerId);
      else if (raw.by) {
        if (raw.name) {
          speaker = roster.find((x) => x.def.name.toLowerCase() === String(raw.name).toLowerCase()) || null;
        }
        if (!speaker) speaker = this.resolveToken(raw.by, members[0], members[1] || members[0]);
      }
      if (!speaker) continue;
      const text = sanitizeLine(raw.text);
      if (!text) continue;
      turns.push({ speakerId: speaker.id, text, at, channel: raw.channel || channel });
      at += 1600 + Math.min(text.length * 30, 2600) + rand(0, 600);
    }
    if (turns.length === 0) {
      onEnd?.();
      return null;
    }

    return this.begin({ kind, members, turns, channel, origin, onEnd });
  }

  begin(conv) {
    const finished = {
      id: uid('conv'),
      startedAt: performance.now(),
      cursor: 0,
      ...conv,
    };
    this.active.push(finished);
    // podium: lampu sorot kecil → set bubble state awal
    for (const m of finished.members) {
      if (!finished.turns.some((t) => t.speakerId === m.id)) continue;
      m.forceActivity('chat', 'Mengobrol');
    }
    bus.emit('conversation:start', finished);
    return finished;
  }

  progress(conv, nowMs) {
    const elapsed = nowMs - conv.startedAt;
    while (conv.cursor < conv.turns.length && conv.turns[conv.cursor].at <= elapsed) {
      const turn = conv.turns[conv.cursor++];
      this.playTurn(conv, turn);
    }
    const lastAt = conv.turns.length > 0 ? conv.turns[conv.turns.length - 1].at : 0;
    if (conv.cursor >= conv.turns.length && elapsed > lastAt + 2600) {
      this.finish(conv);
    }
  }

  playTurn(conv, turn) {
    const sim = this.sim;
    const speaker = sim.agentById(turn.speakerId);
    if (speaker && !speaker.gone) {
      const other = conv.members.find((m) => m !== speaker);
      if (other) speaker.faceTo(other.px, other.py);
      speaker.pushQuote(turn.text);
      sim.bubbles?.show(speaker, { text: turn.text });
    }
    sim.feed.add({
      channel: turn.channel,
      from: turn.speakerId,
      text: turn.text,
      meta: { kind: conv.kind },
    });
    sim.sfx?.blip();
  }

  finish(conv) {
    const sim = this.sim;
    this.active = this.active.filter((c) => c !== conv);
    sim.stats.conversations = (sim.stats.conversations || 0) + 1;

    for (const agent of conv.members) {
      if (agent.gone) continue;
      agent.stats.mood = clamp(agent.stats.mood + 3, 0, 100);
      agent.stats.stress = clamp(agent.stats.stress - 3, 0, 100);
      agent.stats.chattedToday += 1;

      if (agent.seatedSeat) {
        const seat = agent.seatedSeat;
        if (seat.kind === 'desk') {
          agent.activity = { type: 'work', seat, label: 'Lanjut kerja' };
          agent.spriteState = 'type';
        } else {
          agent.activity = { type: 'slack', seat, label: 'Lanjut santai' };
          agent.spriteState = 'sit';
        }
      } else if (agent.activity.type === 'chat' || agent.activity.forced) {
        agent.releaseFromForced('Lanjut aktivitas');
        agent.spriteState = 'idle';
        if (conv.kind !== 'meeting') {
          sim.behavior?.returnToDesk(agent, 'Balik ke meja');
        }
      }
      // rapat: biarkan state meeting agar releaseMeeting yang mengatur
      if (conv.kind === 'meeting') {
        // tidak di-reset di sini; releaseMeeting dipanggil via onEnd
      }
    }

    bus.emit('conversation:end', conv);
    conv.onEnd?.();

    // 25% pihak ketiga nyaut
    if (conv.kind === 'pair' && chance(0.25)) {
      const memberIds = new Set(conv.members.map((m) => m.id));
      const near = sim.agents.find(
        (x) => !x.isStatic && !x.gone && !x.busy && !memberIds.has(x.id) &&
          conv.members[0] && dist2(x.px, x.py, conv.members[0].px, conv.members[0].py) < (10 * 16) ** 2
      );
      if (near) {
        const bank = SIDE_REACTIONS.gosip;
        const line = choice(bank);
        sim.after(2400, () => {
          if (near.gone || near.activity.forced) return;
          near.pushQuote(line.text);
          sim.bubbles?.show(near, { text: line.text });
          sim.feed.add({ channel: 'gosip', from: near.id, text: line.text, meta: { kind: 'side' } });
        });
      }
    }
  }

  // ---------------- Titah: gosip lanjutan ----------------

  scheduleDirectiveGossip(type) {
    const sim = this.sim;
    sim.after(5200, () => {
      const pool = sim.agents.filter((x) => !x.isStatic && !x.gone && !x.busy);
      const a = choice(pool);
      const b = choice(pool.filter((x) => x !== a));
      if (!a || !b) return;
      const division = a.def.division;
      const bankLines = DIRECTIVE_GOSSIP[type] || DIRECTIVE_GOSSIP.custom;
      const turns = bankLines.map((l, i) => ({
        speakerId: (i % 2 === 0 ? a : b).id,
        text: l.text,
        at: i * 2600,
        channel: 'gosip',
      }));
      void division;
      this.begin({ kind: 'directive', members: [a, b], turns, channel: 'gosip', origin: 'fallback' });
    });
  }

  pickGossipLines(type) {
    return pickDirectiveLines(DIRECTIVE_GOSSIP, type, 2);
  }
}
