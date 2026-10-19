// ============================================================
// sprites.js — Sprite karakter pixel (12x18) + pre-render per agen
// Matriks string: '. '=transparan, lihat FRAME & PALETTE_MAP
// ============================================================

const INK = '#14151f';

// ---------- Definisi frame (semua baris HARUS 12 char) ----------

const IDLE = [
  '....oooo....',
  '...ohhhho...',
  '..ohhhhhho..',
  '..ohssssho..',
  '..ohseseho..',
  '..ohssssho..',
  '..ohsmmsho..',
  '...ohssho...',
  '..obbbbbbo..',
  '..obbbbbbo..',
  '..obbaabbo..',
  '..obbbbbbo..',
  '..obbbbbbo..',
  '..oppppppo..',
  '..opo..opo..',
  '..opo..opo..',
  '..oxo..oxo..',
  '..oxo..oxo..',
];

const WALK_A = [
  ...IDLE.slice(0, 14),
  '..opo..opo..',
  '..opo..opo..',
  '.oxo....oxo.',
  '.oxo....oxo.',
];

const WALK_B = [
  ...IDLE.slice(0, 14),
  '...opo.opo..',
  '...opo.opo..',
  '...oxo.oxo..',
  '...oxo.oxo..',
];

const TYPE_UP = [
  '....oooo....',
  '...ohhhho...',
  '..ohhhhhho..',
  '..ohhhhhho..',
  '..ohhhhhho..',
  '..ohhhhHho..',
  '..ohhhhhho..',
  '...ohhhho...',
  '..obbbbbbo..',
  '..obbbbbbo..',
  '..obbbbbbo..',
  '..obbbbbbo..',
  '.obbbbbbbbo.',
  '.obbbbbbbbo.',
  '..oppppppo..',
  '..oppppppo..',
];

const TYPE_UP_B = [
  ...TYPE_UP.slice(0, 12),
  '.obbbbbbbbo.',
  '..obbbbbbo..',
  '..oppppppo..',
  '..oppppppo..',
];

const SIT_DOWN = [
  '....oooo....',
  '...ohhhho...',
  '..ohhhhhho..',
  '..ohssssho..',
  '..ohseseho..',
  '..ohssssho..',
  '..ohsmmsho..',
  '...ohssho...',
  '..obbbbbbo..',
  '..obbbbbbo..',
  '..obbaabbo..',
  '..obbbbbbo..',
  '..oppppppo..',
  '..oppppppo..',
  '..oppppppo..',
  '..oppppppo..',
];

const DRINK = [
  ...IDLE.slice(0, 6),
  '..ohskksho..',
  ...IDLE.slice(7),
];

const SHOCK = [
  '....oooo....',
  '...ohhhho...',
  '..ohhhhhho..',
  '..ohsssshod.',
  '..ohseseho..',
  '..ohssssho..',
  '..ohsOOsho..',
  '...ohssho...',
  '.obbbbbbbbo.',
  's.obbbbbbo.s',
  '..obbaabbo..',
  '..obbbbbbo..',
  '..obbbbbbo..',
  '..oppppppo..',
  '..opo..opo..',
  '..opo..opo..',
  '..oxo..oxo..',
  '..oxo..oxo..',
];

export const FRAMES = {
  idle: IDLE,
  walkA: WALK_A,
  walkB: WALK_B,
  type1: TYPE_UP,
  type2: TYPE_UP_B,
  sit: SIT_DOWN,
  drink: DRINK,
  shock: SHOCK,
};

const SPRITE_W = 12;
const SPRITE_H = 18;

// ---------- Palet ----------

function mix(hex, target, ratio) {
  const n = parseInt(hex.slice(1), 16);
  const t = parseInt(target.slice(1), 16);
  const r1 = (n >> 16) & 255, g1 = (n >> 8) & 255, b1 = n & 255;
  const r2 = (t >> 16) & 255, g2 = (t >> 8) & 255, b2 = t & 255;
  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

const lighten = (hex) => mix(hex, '#ffffff', 0.28);
const darken = (hex) => mix(hex, '#000000', 0.25);

function buildPalette(lookup) {
  const { skin, hair, top, bottom, accent, shoes } = lookup;
  return {
    '.': null,
    o: INK,
    h: hair,
    H: lighten(hair),
    s: skin,
    S: darken(skin),
    e: INK,
    m: '#8a5a4a',
    O: '#7a3b3b',
    b: top,
    B: darken(top),
    a: accent,
    p: bottom,
    P: darken(bottom),
    x: shoes || '#2a2e3d',
    k: '#e8e8ee',
    d: '#6bc5ff',
    w: '#ffffff',
  };
}

// ---------- Cache frame per agen ----------

const frameCache = new Map(); // agentId -> {frameName: canvas}
const lookOverrides = new Map(); // agentId -> partial lookup (mis. Batik Day)

/**
 * Override warna pakaian tanpa mengubah roster.
 * Panggil ensureAgentSprites() lagi (cache otomatis dihapus) untuk rebuild.
 */
export function setAgentLookOverride(agentId, lookupOverride) {
  if (lookupOverride) lookOverrides.set(agentId, { ...lookupOverride });
  else lookOverrides.delete(agentId);
  frameCache.delete(agentId);
}

export function getAgentLookOverride(agentId) {
  return lookOverrides.get(agentId) || null;
}

function buildFrameCanvas(rows, palette) {
  const c = document.createElement('canvas');
  c.width = SPRITE_W;
  c.height = SPRITE_H;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const offsetY = SPRITE_H - rows.length;

  rows.forEach((row, y) => {
    if (row.length !== SPRITE_W) {
      console.warn(`[sprites] baris sprite tidak 12 char: "${row}" (${row.length})`);
    }
    for (let x = 0; x < row.length; x++) {
      const color = palette[row[x]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x, y + offsetY, 1, 1);
    }
  });
  return c;
}

export function ensureAgentSprites(agentDef) {
  if (frameCache.has(agentDef.id)) return frameCache.get(agentDef.id);
  const lookup = { ...agentDef.lookup, ...(lookOverrides.get(agentDef.id) || {}) };
  const palette = buildPalette(lookup);
  const frames = {};
  for (const [name, rows] of Object.entries(FRAMES)) {
    frames[name] = buildFrameCanvas(rows, palette);
  }
  frameCache.set(agentDef.id, frames);
  return frames;
}

export function getFrame(agentId, frameName) {
  const frames = frameCache.get(agentId);
  return frames?.[frameName] || frames?.idle || null;
}

/** Pilih nama frame berdasar state agen */
export function pickFrameName(agent) {
  if (agent.overrideFrame) return agent.overrideFrame;
  switch (agent.spriteState) {
    case 'walk':
      return (Math.floor(agent.animT / 180) % 2 === 0) ? 'walkA' : 'walkB';
    case 'type':
      return (Math.floor(agent.animT / 420) % 2 === 0) ? 'type1' : 'type2';
    case 'sit':
      return 'sit';
    case 'drink':
      return 'drink';
    case 'shock':
      return 'shock';
    default:
      return 'idle';
  }
}

/**
 * Gambar agen. ctx harus sudah dalam transform dunia (zoom aktif, smoothing off).
 * Anchor: px = tengah tile, py = pusat tile; kaki menggantung 6px di bawah pusat.
 */
export function drawAgent(ctx, agent) {
  const frameName = pickFrameName(agent);
  const canvas = getFrame(agent.def.id, frameName);
  if (!canvas) return;

  const bob = (frameName === 'idle' && Math.floor(agent.animT / 650) % 2 === 1) ? 1 : 0;
  const flip = agent.facing === 'left';

  ctx.save();
  ctx.translate(Math.round(agent.px), Math.round(agent.py + 6));
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(canvas, -SPRITE_W / 2, -SPRITE_H + bob);
  ctx.restore();
}

/** Avatar kecil untuk panel inspector (data URL) */
export function avatarDataUrl(agentDef, frame = 'idle', scale = 3) {
  const frames = ensureAgentSprites(agentDef);
  const src = frames[frame] || frames.idle;
  const c = document.createElement('canvas');
  c.width = SPRITE_W * scale;
  c.height = SPRITE_H * scale;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, c.width, c.height);
  return c.toDataURL();
}

export { SPRITE_W, SPRITE_H };
