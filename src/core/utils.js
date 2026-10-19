// ============================================================
// utils.js — Helper murni tanpa efek samping
// ============================================================

export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export const rand = (min, max) => min + Math.random() * (max - min);

export const randInt = (min, max) => Math.floor(rand(min, max + 1));

export const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const chance = (p) => Math.random() < p;

/** Pilih item dengan bobot: items = [{weight, ...}] */
export function weightedChoice(items, weightKey = 'weight') {
  const total = items.reduce((s, it) => s + (it[weightKey] || 1), 0);
  let roll = Math.random() * total;
  for (const it of items) {
    roll -= it[weightKey] || 1;
    if (roll <= 0) return it;
  }
  return items[items.length - 1];
}

export const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const uid = (prefix = 'id') =>
  `${prefix}_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;

export const lerp = (a, b, t) => a + (b - a) * t;

/** 570 menit (09:30) → "09:30" */
export function formatGameTime(simMin) {
  const h = Math.floor(simMin / 60) % 24;
  const m = Math.floor(simMin % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len - 1) + '…' : str;
}

/** Bersihkan teks dari LLM: hapus newline, rapikan spasi, potong panjang */
export function sanitizeLine(str, max = 180) {
  let s = String(str ?? '').replace(/\s+/g, ' ').trim();
  // Buang prefix nama pembicara seperti "Bayu:" / "Bu Maya:" saja.
  // Jangan buang teks non-nama (mis. "MOCK-LLM-OK:") yang mengandung tanda hubung/angka.
  s = s.replace(/^(?:(?:Bu|Pak|Mas|Mbak|Sir|Mr|Mrs|Ms)\s+)?[A-Z][a-z'’-]+(?:\s+[A-Z][a-z'’-]+)?:\s*/, '');
  return truncate(s, max);
}

export const sameTile = (a, b) => a && b && a.x === b.x && a.y === b.y;

export const dist2 = (ax, ay, bx, by) => {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
};

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
