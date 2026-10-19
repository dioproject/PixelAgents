// ============================================================
// office.js — Definisi peta kantor PT Pixel Sinergi Nusantara
// Satu-satunya sumber kebenaran: rooms, furniture, seats, hotspot.
// ============================================================

export const TILE = 16;
export const MAP_W = 96;
export const MAP_H = 63;
export const WORLD_W = MAP_W * TILE;
export const WORLD_H = MAP_H * TILE;

// ---------- Divisi ----------
export const DIVISIONS = {
  it:        { id: 'it',        name: 'IT & Engineering',   short: 'IT',        color: '#8fb3ff' },
  marketing: { id: 'marketing', name: 'Marketing & Creative', short: 'Marketing', color: '#ff9ec4' },
  finance:   { id: 'finance',   name: 'Finance & Accounting', short: 'Finance',   color: '#9fe6a0' },
  hrd:       { id: 'hrd',       name: 'HRD & People Ops',    short: 'HRD',       color: '#7ce0d6' },
  ga:        { id: 'ga',        name: 'General Affairs',     short: 'GA',        color: '#ffd98a' },
  exec:      { id: 'exec',      name: 'Direksi',             short: 'Direksi',   color: '#ffc857' },
};

// ---------- Gaya Lantai ----------
export const FLOOR_STYLES = {
  it:        { base: '#2f3a4f', checker: '#283245', accent: '#c8553d', pattern: 'plain' },
  marketing: { base: '#6b4a56', checker: '#5f414c', accent: '#d87a9b', pattern: 'plain' },
  finance:   { base: '#3d4d3f', checker: '#354438', accent: '#e9dfc2', pattern: 'plain' },
  hrd:       { base: '#2f4a4a', checker: '#284040', accent: '#4a8a8a', pattern: 'plain' },
  ga:        { base: '#4d4733', checker: '#443f2d', accent: '#d0a139', pattern: 'plain' },
  pantry:    { base: '#5a4632', checker: '#4e3c2b', accent: '#8a7355', pattern: 'plank' },
  meeting:   { base: '#454a5e', checker: '#3d4254', accent: '#6bc5ff', pattern: 'plain' },
  director:  { base: '#5c2f3a', checker: '#522a34', accent: '#c9a227', pattern: 'plain' },
  lobby:     { base: '#4a4f63', checker: '#424759', accent: '#ffc857', pattern: 'plain' },
  corridor:  { base: '#3a3f52', checker: '#343948', accent: '#4a5474', pattern: 'plain' },
};

// ---------- Ruangan (rect interior, dinding otomatis di sekeliling) ----------
export const ROOMS = [
  { id: 'it',        label: 'Divisi IT & Engineering',  x: 1,  y: 1,  w: 30, h: 20, floor: 'it',        labelAnchor: { x: 16, y: 8 } },
  { id: 'meeting',   label: 'Ruang Meeting «Sinergi»',  x: 33, y: 1,  w: 29, h: 20, floor: 'meeting',   labelAnchor: { x: 47, y: 14 } },
  { id: 'director',  label: 'Ruang Direktur Utama',     x: 64, y: 1,  w: 31, h: 20, floor: 'director',  labelAnchor: { x: 71, y: 15 } },
  { id: 'corridor1', label: null,                       x: 1,  y: 22, w: 94, h: 5,  floor: 'corridor',  corridor: true },
  { id: 'finance',   label: 'Finance & Accounting',     x: 1,  y: 28, w: 25, h: 19, floor: 'finance',   labelAnchor: { x: 13, y: 38 } },
  { id: 'marketing', label: 'Marketing & Creative',     x: 28, y: 28, w: 28, h: 19, floor: 'marketing', labelAnchor: { x: 42, y: 38 } },
  { id: 'pantry',    label: 'Pantry & Lounge',          x: 58, y: 28, w: 37, h: 19, floor: 'pantry',    labelAnchor: { x: 70, y: 43 } },
  { id: 'corridor2', label: null,                       x: 1,  y: 48, w: 94, h: 4,  floor: 'corridor',  corridor: true },
  { id: 'hrd',       label: 'HRD & People Ops',         x: 1,  y: 53, w: 29, h: 9,  floor: 'hrd',       labelAnchor: { x: 15, y: 57 } },
  { id: 'ga',        label: 'General Affairs',          x: 32, y: 53, w: 18, h: 9,  floor: 'ga',        labelAnchor: { x: 40, y: 57 } },
  { id: 'lobby',     label: 'Lobby & Reception',        x: 52, y: 53, w: 43, h: 9,  floor: 'lobby',     labelAnchor: { x: 66, y: 58 } },
];

// ---------- Pintu (gap di dinding, koordinat tile) ----------
export const DOORS = [
  { x: 15, y: 21 }, { x: 16, y: 21 },   // IT → koridor
  { x: 47, y: 21 }, { x: 48, y: 21 },   // Meeting → koridor
  { x: 79, y: 21 }, { x: 80, y: 21 },   // Direktur → koridor
  { x: 13, y: 27 }, { x: 14, y: 27 },   // Finance ↔ koridor
  { x: 41, y: 27 }, { x: 42, y: 27 },   // Marketing ↔ koridor
  { x: 76, y: 27 }, { x: 77, y: 27 },   // Pantry ↔ koridor
  { x: 13, y: 47 }, { x: 14, y: 47 },   // Finance ↔ koridor2
  { x: 41, y: 47 }, { x: 42, y: 47 },   // Marketing ↔ koridor2
  { x: 76, y: 47 }, { x: 77, y: 47 },   // Pantry ↔ koridor2
  { x: 15, y: 52 }, { x: 16, y: 52 },   // HRD ↔ koridor2
  { x: 40, y: 52 }, { x: 41, y: 52 },   // GA ↔ koridor2
  { x: 73, y: 52 }, { x: 74, y: 52 },   // Lobby ↔ koridor2
];

// ---------- Helper pembuat furniture ----------
const F = (type, x, y, w, h, extra = {}) => ({ type, x, y, w, h, blocking: extra.blocking ?? true, ...extra });

// ---------- Furniture ----------
export const FURNITURE = [
  // ===== IT & Engineering (x1..30, y1..20) =====
  F('desk', 4, 3, 2, 1, { meta: { owner: 'bayu' } }),
  F('desk', 8, 3, 2, 1, { meta: { owner: 'rian' } }),
  F('desk', 12, 3, 2, 1, { meta: { owner: 'salsa' } }),
  F('deskL', 17, 3, 3, 1, { meta: { label: 'Meja Insiden' } }),
  F('serverRack', 1, 3, 1, 2),
  F('beanbag', 27, 16, 1, 1),
  F('beanbag', 28, 17, 1, 1),
  F('whiteboard', 16, 0, 3, 1, { blocking: false, wall: true }),
  F('acUnit', 24, 0, 2, 1, { blocking: false, wall: true }),
  F('plant', 1, 19, 1, 1),
  F('plantBig', 29, 18, 2, 2),
  F('cableMess', 6, 8, 2, 1, { blocking: false, layer: 'floor' }),
  F('coffeeStain', 22, 10, 1, 1, { blocking: false, layer: 'floor' }),

  // ===== Meeting «Sinergi» (x33..61, y1..20) =====
  F('conferenceTable', 44, 8, 5, 3),
  F('projectorScreen', 45, 0, 3, 1, { blocking: false, wall: true }),
  F('whiteboard', 57, 0, 3, 1, { blocking: false, wall: true }),
  F('dispenser', 59, 1, 1, 1),
  F('plantBig', 33, 18, 2, 2),
  F('plant', 61, 1, 1, 1),
  F('acUnit', 36, 0, 2, 1, { blocking: false, wall: true }),

  // ===== Ruang Direktur (x64..94, y1..20) =====
  F('directorDesk', 71, 4, 4, 1),
  F('cctvWall', 69, 0, 3, 1, { blocking: false, wall: true }),
  F('acUnit', 88, 0, 2, 1, { blocking: false, wall: true }),
  F('sofa', 86, 6, 2, 1),
  F('coffeeTable', 87, 9, 1, 1),
  F('armchair', 89, 7, 1, 1),
  F('filingCabinet', 64, 5, 1, 1),
  F('filingCabinet', 64, 6, 1, 1),
  F('plantBig', 64, 1, 2, 2),
  F('plant', 93, 19, 1, 1),
  F('rug', 77, 11, 6, 4, { blocking: false, layer: 'floor' }),

  // ===== Finance (x1..25, y28..46) =====
  F('desk', 4, 31, 2, 1, { meta: { owner: 'endang' } }),
  F('desk', 9, 31, 2, 1, { meta: { owner: 'dimas' } }),
  F('copier', 1, 33, 2, 1),
  F('filecabinet', 1, 29, 1, 1),
  F('filecabinet', 1, 30, 1, 1),
  F('posterBoard', 4, 27, 3, 1, { blocking: false, wall: true, meta: { theme: 'finance' } }),
  F('plantBig', 24, 44, 2, 2),
  F('coffeeStain', 8, 40, 1, 1, { blocking: false, layer: 'floor' }),

  // ===== Marketing (x28..55, y28..46) =====
  F('deskL', 31, 31, 3, 1, { meta: { owner: 'jessica' } }),
  F('deskL', 36, 31, 3, 1, { meta: { owner: 'fajar' } }),
  F('tripodCamera', 44, 34, 1, 1),
  F('posterBoard', 31, 27, 3, 1, { blocking: false, wall: true, meta: { theme: 'marketing' } }),
  F('rug', 47, 38, 5, 3, { blocking: false, layer: 'floor', meta: { color: '#8a4a5e' } }),
  F('beanbag', 53, 44, 1, 1),
  F('plant', 28, 29, 1, 1),
  F('plant', 54, 45, 1, 1),

  // ===== Pantry & Lounge (x58..94, y28..46) =====
  F('counter', 80, 29, 4, 1),
  F('coffeeMachine', 83, 29, 1, 1, { meta: { hotspot: 'coffee' } }),
  F('fridge', 78, 29, 1, 2),
  F('dispenser', 84, 29, 1, 1),
  F('vendingMachine', 92, 29, 1, 2),
  F('longTable', 70, 36, 4, 2),
  F('poolTable', 85, 40, 4, 2),
  F('sofa', 60, 42, 2, 1),
  F('armchair', 63, 43, 1, 1),
  F('coffeeTable', 62, 45, 1, 1),
  F('plantBig', 58, 28, 2, 2),
  F('plant', 93, 45, 1, 1),
  F('acUnit', 68, 27, 2, 1, { blocking: false, wall: true }),
  F('coffeeStain', 72, 32, 1, 1, { blocking: false, layer: 'floor' }),
  F('coffeeStain', 66, 40, 1, 1, { blocking: false, layer: 'floor' }),

  // ===== HRD (x1..29, y53..61) =====
  F('desk', 4, 55, 2, 1, { meta: { owner: 'maya' } }),
  F('desk', 8, 55, 2, 1, { meta: { owner: 'kevin' } }),
  F('sofa', 20, 58, 2, 1),
  F('filecabinet', 1, 54, 1, 1),
  F('plant', 28, 60, 1, 1),
  F('acUnit', 22, 52, 2, 1, { blocking: false, wall: true }),

  // ===== GA (x32..49, y53..61) =====
  F('workbench', 36, 55, 3, 1),
  F('boxes', 33, 59, 1, 1),
  F('boxes', 35, 59, 1, 1),
  F('boxes', 48, 54, 1, 1),
  F('toolbox', 44, 58, 1, 1, { blocking: false, layer: 'floor' }),
  F('hazardTape', 34, 60, 6, 1, { blocking: false, layer: 'floor' }),
  F('plant', 47, 60, 1, 1),

  // ===== Lobby (x52..94, y53..61) =====
  F('receptionDesk', 80, 56, 4, 1),
  F('companySign', 69, 62, 3, 1, { blocking: false, wall: true }),
  F('sofa', 60, 54, 2, 1),
  F('armchair', 63, 55, 1, 1),
  F('plantBig', 52, 53, 2, 2),
  F('plant', 94, 53, 1, 1),
  F('plant', 94, 61, 1, 1),
  F('coffeeStain', 75, 58, 1, 1, { blocking: false, layer: 'floor' }),
  F('acUnit', 85, 52, 2, 1, { blocking: false, wall: true }),

  // ===== Koridor =====
  F('plant', 1, 22, 1, 1),
  F('plant', 94, 26, 1, 1),
  F('coffeeStain', 48, 24, 1, 1, { blocking: false, layer: 'floor' }),
  F('plant', 1, 49, 1, 1),
  F('plant', 94, 50, 1, 1),
];

// ---------- Kursi / Seat ----------
export const SEATS = [
  // Meja kerja
  { id: 'seat.bayu',    kind: 'desk', x: 5,  y: 4,  facing: 'up' },
  { id: 'seat.rian',    kind: 'desk', x: 9,  y: 4,  facing: 'up' },
  { id: 'seat.salsa',   kind: 'desk', x: 13, y: 4,  facing: 'up' },
  { id: 'seat.jessica', kind: 'desk', x: 32, y: 32, facing: 'up' },
  { id: 'seat.fajar',   kind: 'desk', x: 37, y: 32, facing: 'up' },
  { id: 'seat.endang',  kind: 'desk', x: 5,  y: 32, facing: 'up' },
  { id: 'seat.dimas',   kind: 'desk', x: 10, y: 32, facing: 'up' },
  { id: 'seat.maya',    kind: 'desk', x: 5,  y: 56, facing: 'up' },
  { id: 'seat.kevin',   kind: 'desk', x: 9,  y: 56, facing: 'up' },
  { id: 'seat.joko',    kind: 'desk', x: 37, y: 56, facing: 'up' },
  { id: 'seat.director', kind: 'desk', x: 72, y: 5, facing: 'up' },

  // Kursi meeting (mengelilingi meja x44..48, y8..10)
  { id: 'seat.meet.0', kind: 'meeting', x: 44, y: 7,  facing: 'down' },
  { id: 'seat.meet.1', kind: 'meeting', x: 45, y: 7,  facing: 'down' },
  { id: 'seat.meet.2', kind: 'meeting', x: 46, y: 7,  facing: 'down' },
  { id: 'seat.meet.3', kind: 'meeting', x: 47, y: 7,  facing: 'down' },
  { id: 'seat.meet.4', kind: 'meeting', x: 48, y: 7,  facing: 'down' },
  { id: 'seat.meet.5', kind: 'meeting', x: 44, y: 11, facing: 'up' },
  { id: 'seat.meet.6', kind: 'meeting', x: 45, y: 11, facing: 'up' },
  { id: 'seat.meet.7', kind: 'meeting', x: 46, y: 11, facing: 'up' },
  { id: 'seat.meet.8', kind: 'meeting', x: 47, y: 11, facing: 'up' },
  { id: 'seat.meet.9', kind: 'meeting', x: 48, y: 11, facing: 'up' },
  { id: 'seat.meet.10', kind: 'meeting', x: 43, y: 9, facing: 'right' },
  { id: 'seat.meet.11', kind: 'meeting', x: 49, y: 9, facing: 'left' },

  // Makan siang & lounge
  { id: 'seat.lunch.0', kind: 'pantry', x: 70, y: 35, facing: 'down' },
  { id: 'seat.lunch.1', kind: 'pantry', x: 71, y: 35, facing: 'down' },
  { id: 'seat.lunch.2', kind: 'pantry', x: 72, y: 35, facing: 'down' },
  { id: 'seat.lunch.3', kind: 'pantry', x: 73, y: 35, facing: 'down' },
  { id: 'seat.lunch.4', kind: 'pantry', x: 70, y: 38, facing: 'up' },
  { id: 'seat.lunch.5', kind: 'pantry', x: 71, y: 38, facing: 'up' },
  { id: 'seat.lunch.6', kind: 'pantry', x: 72, y: 38, facing: 'up' },
  { id: 'seat.lunch.7', kind: 'pantry', x: 73, y: 38, facing: 'up' },
  { id: 'seat.sofa.0',  kind: 'sofa',   x: 60, y: 43, facing: 'up' },
  { id: 'seat.sofa.1',  kind: 'sofa',   x: 61, y: 43, facing: 'up' },
  { id: 'seat.lobby.0', kind: 'lobby',  x: 60, y: 55, facing: 'up' },
  { id: 'seat.lobby.1', kind: 'lobby',  x: 61, y: 55, facing: 'up' },
  { id: 'seat.hr.0',    kind: 'sofa',   x: 20, y: 59, facing: 'up' },
  { id: 'seat.hr.1',    kind: 'sofa',   x: 21, y: 59, facing: 'up' },
];

export function seatById(id) {
  return SEATS.find((s) => s.id === id) || null;
}

// ---------- Hotspot interaksi ----------
export const HOTSPOTS = {
  coffee:      { label: 'Mesin Kopi',      stands: [{ x: 83, y: 30 }, { x: 82, y: 30 }] },
  dispenser:   { label: 'Dispenser Air',   stands: [{ x: 84, y: 30 }] },
  fridge:      { label: 'Kulkas',          stands: [{ x: 77, y: 29 }, { x: 77, y: 30 }] },
  vending:     { label: 'Vending Machine', stands: [{ x: 92, y: 31 }, { x: 91, y: 30 }] },
  copier:      { label: 'Mesin Fotokopi',  stands: [{ x: 1, y: 34 }, { x: 2, y: 34 }] },
  workbench:   { label: 'Meja Kerja GA',   stands: [{ x: 36, y: 56 }, { x: 37, y: 56 }, { x: 38, y: 56 }] },
  reception:   { label: 'Resepsionis',     stands: [{ x: 81, y: 57 }, { x: 82, y: 57 }] },
  directorDesk:{ label: 'Meja Direktur',   stands: [{ x: 72, y: 6 }, { x: 73, y: 6 }] },
  pool:        { label: 'Meja Biliar',     stands: [{ x: 84, y: 40 }, { x: 89, y: 40 }, { x: 85, y: 42 }, { x: 87, y: 42 }] },
  dispenserMeeting: { label: 'Dispenser Meeting', stands: [{ x: 59, y: 2 }] },
};

// ---------- Util peta ----------
export function roomAtTile(tx, ty) {
  for (const r of ROOMS) {
    if (tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h) return r;
  }
  return null;
}

export function roomCenter(room) {
  return { x: (room.x + room.w / 2) * TILE, y: (room.y + room.h / 2) * TILE };
}

/** Titik pusat tile (pixel) */
export function tileCenter(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

// ---------- Grid walkability (statis) ----------
function buildStaticGrid() {
  const grid = new Uint8Array(MAP_W * MAP_H); // 0 = blocked

  const carve = (x, y, w, h, val = 1) => {
    for (let ty = y; ty < y + h; ty++) {
      for (let tx = x; tx < x + w; tx++) {
        if (tx >= 0 && ty >= 0 && tx < MAP_W && ty < MAP_H) grid[ty * MAP_W + tx] = val;
      }
    }
  };

  // 1) Carve interior semua ruangan
  for (const r of ROOMS) carve(r.x, r.y, r.w, r.h, 1);
  // 2) Carve pintu
  for (const d of DOORS) carve(d.x, d.y, 1, 1, 1);
  // 3) Terapkan furniture blocking
  for (const f of FURNITURE) {
    if (!f.blocking) continue;
    carve(f.x, f.y, f.w, f.h, 0);
  }
  // 4) Seat selalu bisa ditempati (meski tumpang tindih visual kursi)
  for (const s of SEATS) {
    if (s.x >= 0 && s.y >= 0 && s.x < MAP_W && s.y < MAP_H) grid[s.y * MAP_W + s.x] = 1;
  }
  return grid;
}

// ---------- World runtime (grid + reservasi dinamis) ----------
export function createWorld() {
  const grid = buildStaticGrid();
  const reserved = new Map(); // "x,y" -> agentId

  const k = (x, y) => `${x},${y}`;

  return {
    MAP_W,
    MAP_H,
    grid,

    isWalkable(x, y, agentId = null) {
      if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return false;
      if (!grid[y * MAP_W + x]) return false;
      const owner = reserved.get(k(x, y));
      return !owner || owner === agentId;
    },

    reserve(x, y, agentId) {
      reserved.set(k(x, y), agentId);
    },

    release(x, y, agentId) {
      const kk = k(x, y);
      if (reserved.get(kk) === agentId) reserved.delete(kk);
    },

    clearReservations() {
      reserved.clear();
    },

    isReservedByOther(x, y, agentId) {
      const owner = reserved.get(k(x, y));
      return !!owner && owner !== agentId;
    },

    roomAt: roomAtTile,

    /** Cari stand bebas dari daftar stand hotspot */
    findFreeStand(hotspotId, agentId) {
      const hs = HOTSPOTS[hotspotId];
      if (!hs) return null;
      for (const s of hs.stands) {
        if (this.isWalkable(s.x, s.y, agentId)) return { x: s.x, y: s.y };
      }
      // semua terisi → pakai stand pertama apa pun
      return hs.stands[0] ? { ...hs.stands[0] } : null;
    },
  };
}
