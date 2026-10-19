// ============================================================
// prompts.js — Builder prompt LLM + parser output
// Inti "Tone Engine": gaul ke teman, formal ke atasan.
// ============================================================

import { formatGameTime } from '../core/utils.js';
import { AGENT_DEFS } from '../agents/roster.js';

const LEVEL_NAMES = {
  1: 'Junior/Staff',
  2: 'Senior/Spesialis',
  3: 'Manager/Head Divisi',
  4: 'Direktur Utama',
};

const DIVISION_NAMES = {
  it: 'IT & Engineering',
  marketing: 'Marketing & Creative',
  finance: 'Finance & Accounting',
  hrd: 'HRD & People Ops',
  ga: 'General Affairs',
  exec: 'Direksi',
};

function personaBlock(agent) {
  const d = agent.def;
  return `- ${d.name} | ${d.role} | Divisi ${DIVISION_NAMES[d.division] || d.division} | Level ${d.level} (${LEVEL_NAMES[d.level]}) | Gaya bicara: ${d.style} | Sifat: ${d.traits.join(', ')} | Kebiasaan: ${d.habits}`;
}

/** Tentukan aturan tone pembicara terhadap lawan bicara */
export function toneRule(speaker, listener) {
  const sl = speaker.def.level;
  const ll = listener.def.level;
  if (ll > sl) {
    return `Saat ${speaker.def.name} bicara ke ${listener.def.name}: WAJIB FORMAL — bahasa Indonesia baku, sopan, korporat, panggil "Pak/Bu ${listener.def.name.replace(/^(Bu |Mas |Mbak )/, '')}". Contoh: "Mohon izin menyampaikan, Pak. Progress-nya sedang kami kerjakan."`;
  }
  if (ll === sl) {
    return `Saat ${speaker.def.name} bicara ke ${listener.def.name}: SANTAI/GAUL — bahasa sehari-hari Indonesia, boleh singkatan (wkwk, gmn, udh), istilah kantor, sesuai kepribadian masing-masing. Contoh: "Woy, udah kelar belum? Gue tungguin nih."`;
  }
  const down = speaker.def.downTone;
  const downDesc = {
    sweet: 'sok akrab manis tapi menekan (pakai "dear", "bestie", emoticon :) yang mengancam)',
    bossy: 'tegas, to the point, sedikit galak tapi profesional',
    jaksel: 'campur bahasa Inggris dan buzzword (literally, which is, vibes)',
    chill: 'santai merakyat, logat ngobrol biasa',
    garing: 'datar, kering, jawaban singkat teknis dengan humor tipis',
    casual: 'santai biasa',
  }[down] || 'santai';
  return `Saat ${speaker.def.name} (atasan) bicara ke bawahannya ${listener.def.name}: ${downDesc}. Tetap tidak kasar.`;
}

const OUTPUT_SCHEMA = `Format output WAJIB JSON valid:
{"messages":[{"speaker":"Nama","text":"isi chat"}]}
Aturan output:
- 2 sampai 4 pesan saja, bergantian antar pembicara.
- Tiap pesan maksimal 140 karakter, seperti chat WhatsApp kantor Indonesia.
- Boleh singkatan dan emoticon secukupnya. JANGAN pakai newline.
- speaker HARUS salah satu dari nama pegawai yang terlibat.`;

function systemHeader() {
  return `Kamu adalah mesin penulis dialog untuk "PT Pixel Sinergi Nusantara Tbk", simulasi kantor pixel art Indonesia yang satir dan lucu. Kamu menulis dialog antar karyawan kantor yang realistis, hangat, dan menghibur — seperti potongan chat WhatsApp perusahaan. Semua nama dan kejadian fiktif. Hindari SARA, kasar, dan konten tidak sopan.`;
}

/**
 * Prompt percakapan 2 pegawai.
 * @param {object} sim
 * @param {Agent} a
 * @param {Agent} b
 * @param {string} ctx  'work' | 'gosip' | 'lunch' | 'sore'
 * @param {string} roomId
 * @param {string} [extra] konteks tambahan (titah/insiden terkini)
 */
export function buildConversationPrompt(sim, a, b, ctx, roomId, extra = '') {
  const ctxDesc = {
    work: 'sedang mengerjakan pekerjaan kantor (tiket, desain, laporan, atau koordinasi kerja)',
    gosip: 'sedang mengobrol santai di luar topik inti (gosip kantor ringan, cuitan, keluhan lucu)',
    lunch: 'sedang makan siang bersama di pantry (obrolan bebas, rencana weekend, makanan)',
    sore: 'sudah lelah di penghujung hari (keluhan capek yang lucu, sisa pekerjaan, kopi)',
  }[ctx] || 'sedang ngobrol santai';

  const recentWork = sim.feed.recentSummary(25);

  return [
    { role: 'system', content: systemHeader() },
    {
      role: 'user',
      content: `Tuliskan percakapan pendek antara dua pegawai berikut.

KONTEKS SIMULASI:
- Hari ke-${sim.clock.day}, jam ${formatGameTime(sim.clock.timeMin)}.
- Lokasi: ${roomId}.
- Mereka ${ctxDesc}.
${extra ? '- Situasi terkini: ' + extra : ''}
${recentWork ? '- Rumor/kejadian terakhir di kantor: ' + recentWork : ''}

PARA PEGAWAI:
${personaBlock(a)}
${personaBlock(b)}

ATURAN TONE (PALING PENTING):
${toneRule(a, b)}
${toneRule(b, a)}

Topik obrolan harus natural sesuai lokasi, waktu, kepribadian, dan situasi terkini. Buat sesekali lucu/relatable (deadline, reimburse, AC, kopi, KPI, gaji).

${OUTPUT_SCHEMA}`,
    },
  ];
}

/**
 * Prompt reaksi Titah Direksi. Responder merespons FORMAL ke Direktur.
 */
export function buildDirectivePrompt(sim, directiveText, responders) {
  const list = responders.map(personaBlock).join('\n');
  return [
    { role: 'system', content: systemHeader() },
    {
      role: 'user',
      content: `Bapak Direktur Utama baru saja mengeluarkan Titah Direksi ke seluruh kantor:

"${directiveText}"

Beberapa karyawan berikut memberikan RESPONS LANGSUNG ke Direktur melalui grup kantor:

${list}

ATURAN TONE (WAJIB):
- Semua pembicara berbicara KEPADA DIREKTUR (level 4) → WAJIB FORMAL, baku, sopan, diplomatis.
- Sertakan kepribadian masing-masing (kadang ada yang terlalu antusias, terlalu jujur, atau pasrah tapi formal).
- Tiap orang 1-2 pesan saja. Total maksimal 6 pesan.
- Jam ${formatGameTime(sim.clock.timeMin)}, hari ke-${sim.clock.day}.

${OUTPUT_SCHEMA}`,
    },
  ];
}

/**
 * Prompt insiden. `beats` menjelaskan alur wajib (mis. permintaan maaf formal).
 */
export function buildIncidentPrompt(sim, incidentTitle, description, members, beats) {
  const list = members.map(personaBlock).join('\n');
  return [
    { role: 'system', content: systemHeader() },
    {
      role: 'user',
      content: `Terjadi insiden kantor: ${incidentTitle} — ${description}

Pegawai yang terlibat:
${list}

Alur wajib:
${beats.map((b, i) => `${i + 1}. ${b}`).join('\n')}

ATURAN TONE:
- Obrolan ke sesama = santai/gaul. Jika ada pesan yang ditujukan ke Direktur, WAJIB FORMAL.
- Tetap lucu, relatable, tidak kasar. Maksimal 6 pesan. Jam ${formatGameTime(sim.clock.timeMin)}.

${OUTPUT_SCHEMA}`,
    },
  ];
}

// ---------------- Parser ----------------

export function parseMessages(raw) {
  if (!raw) return null;
  let s = String(raw).trim();
  s = s.replace(/^```(?:json)?/i, '').replace(/```\s*$/, '').trim();

  const starts = ['[', '{'].map((ch) => s.indexOf(ch)).filter((i) => i >= 0);
  if (starts.length === 0) return null;
  const start = Math.min(...starts);
  const end = Math.max(s.lastIndexOf(']'), s.lastIndexOf('}'));
  if (end <= start) return null;

  let data;
  try {
    data = JSON.parse(s.slice(start, end + 1));
  } catch {
    return null;
  }

  const arr = Array.isArray(data)
    ? data
    : (data.messages || data.dialogue || data.turns || data.lines || null);
  if (!Array.isArray(arr)) return null;

  const out = [];
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue;
    const speaker = item.speaker ?? item.from ?? item.name ?? item.character ?? '';
    const text = item.text ?? item.message ?? item.content ?? item.line ?? '';
    if (typeof text === 'string' && text.trim()) {
      out.push({ speaker: String(speaker).trim(), text: text.trim() });
    }
  }
  return out.length ? out : null;
}

/** Cocokkan nama speaker dari LLM ke agent yang ada (fuzzy sederhana) */
export function matchSpeaker(candidates, name) {
  if (!name) return null;
  const n = name.toLowerCase();
  for (const a of candidates) {
    const an = a.def.name.toLowerCase();
    if (an === n || a.def.id === n) return a;
    if (an.includes(n) || n.includes(an)) return a;
    // "Bu Maya" vs "maya"
    const short = an.replace(/^(bu |mas |mbak |pak )/, '');
    if (short === n || n.includes(short)) return a;
  }
  return null;
}

// ============================================================
// Proyek: prompt & parser (paket deliverable)
// ============================================================

function extractJson(raw) {
  const text = String(raw || '');
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    const data = JSON.parse(candidate.slice(start, end + 1));
    return data && typeof data === 'object' && !Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

export function buildProjectContentPrompt(sim, project) {
  const agentLines = AGENT_DEFS.filter((d) => !d.isStatic)
    .map((d) => `- ${d.name} | ${d.role} | Divisi ${DIVISION_NAMES[d.division] || d.division} | Gaya: ${d.style} | Sifat: ${d.traits.join(', ')}`)
    .join('\n');

  return [
    { role: 'system', content: systemHeader() },
    {
      role: 'user',
      content: [
        `Titah proyek dari Direktur: "${project.title}"`,
        `Hari ${sim.clock.day}, jam ${formatGameTime(sim.clock.timeMin)}.`,
        sim.flags?.coffeeBudgetCut ? 'Catatan kantor: anggaran kopi sedang dipotong 50%.' : '',
        '',
        'Karyawan yang terlibat:',
        agentLines,
        '',
        'Susun paket kerja proyek. SEMUA 5 divisi ikut menyumbang bagiannya (gaya kantor: semua ikut campur).',
        'Bahasa Indonesia, boleh satir kantor, tapi deliverable tetap masuk akal dan bisa dipakai.',
        'Balas HANYA JSON valid dengan bentuk:',
        '{',
        '  "sections": [ {"division":"it|marketing|finance|hrd|ga","title":"<=60 char","text":"2-4 kalimat"} ],',
        '  "poster": { "headline":"<=24 char","tagline":"<=60 char","hashtags":["#tag1","#tag2","#tag3"] },',
        '  "caption": "<=240 char",',
        '  "budget": [ {"item":"...","qty":2,"unit":"pcs","price":150000,"note":"..."} ],',
        '  "ga": [ {"category":"...","item":"...","qty":1,"owner":"Joko","status":"siap"} ],',
        '  "memo": { "subject":"<=80 char","body":"<=400 char","closing":"<=120 char" }',
        '}',
        'Aturan: sections wajib 5 item (satu per divisi). budget 4-8 baris angka realistis rupiah (tanpa titik ribuan). ga 4-8 baris.',
      ].filter(Boolean).join('\n'),
    },
  ];
}

export function buildProjectCodePrompt(sim, project) {
  return [
    {
      role: 'system',
      content: `${systemHeader()} Kamu juga senior software engineer Divisi IT & Engineering; kamu menulis kode proyek yang diminta Direktur.`,
    },
    {
      role: 'user',
      content: [
        `Brief proyek: "${project.title}"`,
        '',
        'Buat kode proyek LENGKAP dan runnable sesuai brief (bukan website mini kalau brief meminta aplikasi desktop).',
        'Stack: pilih paling cocok dengan brief (mis. Tauri 2 + Rust + SQLite + vanilla JS + Vite untuk aplikasi desktop; Vite + vanilla JS untuk web).',
        'Skema database: SQLite bila aplikasi butuh data. Manajemen paket: Bun.',
        'Batas: maksimal 14 file, tiap file <=24 KB, total <=160 KB, kedalaman folder <=4.',
        'Wajib sertakan README.md berisi langkah menjalankan (pakai bun). Sertakan file konfigurasi yang diperlukan.',
        'Jangan pernah menulis kode yang menghapus file, mengakses jaringan misterius, atau menjalankan perintah berbahaya.',
        'Balas HANYA JSON valid dengan bentuk:',
        '{',
        '  "stack": "deskripsi singkat stack",',
        '  "run": ["bun install","bun run tauri dev"],',
        '  "files": [ {"path":"package.json","content":"..."} ]',
        '}',
        'Isi "content" adalah isi file apa adanya (boleh multi-baris, escape JSON dengan benar).',
      ].join('\n'),
    },
  ];
}

export function parseProjectContent(raw) {
  return extractJson(raw);
}

export function parseProjectCode(raw) {
  const data = extractJson(raw);
  if (!data || !Array.isArray(data.files)) return null;
  return {
    stack: typeof data.stack === 'string' ? data.stack.slice(0, 120) : '',
    run: Array.isArray(data.run) ? data.run.filter((c) => typeof c === 'string').slice(0, 6) : [],
    files: data.files,
  };
}
