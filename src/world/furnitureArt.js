// ============================================================
// furnitureArt.js — Painter semua furniture (pixel art prosedural)
// Semua painter digambar relatif terhadap origin furniture (px, py)
// ============================================================

import { TILE } from './office.js';

const INK = '#14151f';
const WOOD = '#8a6a48';
const WOOD_D = '#6b4f34';
const WOOD_L = '#a58862';
const METAL = '#7d8597';
const METAL_D = '#5a6070';
const METAL_L = '#9aa3b5';
const SCREEN = '#101218';
const GLOW = '#3d5a80';
const PAPER = '#e9dfc2';

const r = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

/** outline kotak 1px */
const box = (ctx, x, y, w, h, fill, outline = INK) => {
  r(ctx, x, y, w, h, fill);
  r(ctx, x, y, w, 1, outline);
  r(ctx, x, y + h - 1, w, 1, outline);
  r(ctx, x, y, 1, h, outline);
  r(ctx, x + w - 1, y, 1, h, outline);
};

// ---------------- Individual painters ----------------

function paintDesk(ctx, f, w, h) {
  const y0 = 3;
  // bayangan
  r(ctx, 2, h - 2, w - 4, 2, 'rgba(0,0,0,0.25)');
  box(ctx, 0, y0, w, h - 5, WOOD);
  r(ctx, 1, y0 + 1, w - 2, 2, WOOD_L);
  r(ctx, 1, h - 5, w - 2, 1, WOOD_D);
  // monitor menghadap bawah (ke arah kursi)
  const mx = Math.floor(w / 2) - 3;
  r(ctx, mx + 2, y0 + 7, 2, 2, METAL_D);          // stand
  box(ctx, mx - 1, y0 + 1, 8, 7, SCREEN);
  r(ctx, mx, y0 + 2, 6, 5, GLOW);
  // keyboard & kertas
  r(ctx, mx - 2, h - 6, 12, 2, '#2a2e3d');
  r(ctx, 3, h - 9, 6, 4, PAPER);
  r(ctx, w - 8, h - 9, 4, 4, '#e05d5d');           // mug
  r(ctx, w - 7, h - 5, 2, 1, '#b84747');
}

function paintDeskL(ctx, f, w, h) {
  paintDesk(ctx, f, w, h);
  // tambahan: lampu + notes
  r(ctx, w - 20, 5, 3, 3, '#ffc857');
  r(ctx, w - 21, 8, 1, 3, METAL_D);
  r(ctx, w - 12, 6, 2, 2, '#ff9ec4');
  r(ctx, w - 14, 4, 2, 2, '#7ee787');
}

function paintConferenceTable(ctx, f, w, h) {
  box(ctx, 0, 0, w, h, WOOD_D);
  r(ctx, 2, 2, w - 4, h - 4, WOOD);
  r(ctx, 3, 3, w - 6, 2, WOOD_L);
  // laptop & kertas di tengah
  r(ctx, Math.floor(w / 2) - 16, Math.floor(h / 2) - 6, 12, 3, METAL); // laptop base
  box(ctx, Math.floor(w / 2) - 16, Math.floor(h / 2) - 13, 12, 7, '#232734');
  r(ctx, Math.floor(w / 2) - 15, Math.floor(h / 2) - 12, 10, 5, GLOW);
  r(ctx, Math.floor(w / 2) + 2, Math.floor(h / 2) - 8, 8, 6, PAPER);
  r(ctx, Math.floor(w / 2) + 14, Math.floor(h / 2) + 4, 4, 4, '#e8e8ee'); // gelas
  r(ctx, Math.floor(w / 2) - 22, Math.floor(h / 2) + 8, 4, 4, '#e8e8ee');
  // speakerphone
  r(ctx, Math.floor(w / 2) - 3, Math.floor(h / 2) + 2, 6, 4, '#2a2e3d');
  r(ctx, Math.floor(w / 2) - 2, Math.floor(h / 2) + 3, 4, 1, '#7ee787');
}

function paintLongTable(ctx, f, w, h) {
  box(ctx, 0, 0, w, h, WOOD_D);
  r(ctx, 2, 2, w - 4, h - 4, WOOD_L);
  r(ctx, 3, 3, w - 6, 2, '#bfa078');
  // piring & mangkuk
  const py = Math.floor(h / 2) - 3;
  for (let i = 0; i < 2; i++) {
    const x = 8 + i * 26;
    box(ctx, x, py, 8, 7, '#e8e8ee');
    r(ctx, x + 2, py + 2, 4, 3, '#c9556e');
  }
  // teko
  box(ctx, Math.floor(w / 2) - 4, py - 2, 8, 8, '#6bc5ff');
}

function paintCounter(ctx, f, w, h) {
  box(ctx, 0, 2, w, h - 4, '#6b7280');
  r(ctx, 1, 3, w - 2, 3, METAL_L);
  // pintu kabinet
  for (let x = 4; x < w - 4; x += 14) {
    r(ctx, x, 7, 1, h - 11, METAL_D);
    r(ctx, x + 6, h - 8, 3, 1, METAL_D);
  }
  // wastafel
  box(ctx, 5, 4, 10, 6, '#9aa3b5');
  r(ctx, 9, 3, 2, 3, METAL_D);
  r(ctx, 5, 3, w - 5, 1, METAL_L);
}

function paintCoffeeMachine(ctx, f, w, h) {
  box(ctx, 2, 3, 12, 12, '#232734');
  r(ctx, 3, 4, 10, 3, '#c8553d');
  r(ctx, 5, 9, 6, 4, '#e8e8ee');   // cangkir
  r(ctx, 6, 10, 4, 2, '#6b4f34');
  r(ctx, 4, 8, 1, 1, '#7ee787');   // tombol
  // uap
  r(ctx, 4, 1, 1, 2, 'rgba(255,255,255,0.5)');
  r(ctx, 10, 0, 1, 2, 'rgba(255,255,255,0.4)');
}

function paintFridge(ctx, f, w, h) {
  box(ctx, 2, 2, w - 4, h - 4, '#e8e8ee');
  r(ctx, 3, Math.floor(h / 2), w - 6, 1, METAL_D);
  r(ctx, w - 5, 5, 1, 6, METAL_D);
  r(ctx, w - 5, Math.floor(h / 2) + 4, 1, 7, METAL_D);
  r(ctx, 5, 6, 2, 2, '#ff6b6b');   // magnet
  r(ctx, 8, 9, 2, 2, '#ffc857');
}

function paintDispenser(ctx, f, w, h) {
  box(ctx, 4, 6, 8, 8, '#e8e8ee');
  box(ctx, 5, 1, 6, 5, '#6bc5ff');
  r(ctx, 6, 2, 1, 3, 'rgba(255,255,255,0.6)');
  r(ctx, 8, 8, 2, 2, '#c8553d');
}

function paintVending(ctx, f, w, h) {
  box(ctx, 2, 2, w - 4, h - 4, '#2c3e66');
  box(ctx, 4, 5, w - 8, 14, '#151b2e');
  const snacks = ['#ffc857', '#ff6b6b', '#7ee787', '#6bc5ff', '#ff9ec4'];
  for (let i = 0; i < 8; i++) {
    r(ctx, 5 + (i % 4) * 2, 7 + Math.floor(i / 4) * 4, 1, 2, snacks[i % 5]);
    r(ctx, 5 + (i % 4) * 2 + 0, 7 + Math.floor(i / 4) * 4 + 3, 1, 1, snacks[(i + 2) % 5]);
  }
  r(ctx, 5, 22, w - 10, 2, INK);
  r(ctx, w - 7, 4, 3, 3, '#7ee787');
}

function paintServerRack(ctx, f, w, h) {
  box(ctx, 3, 2, 10, 28, '#232734');
  for (let y = 5; y < 26; y += 4) {
    r(ctx, 4, y, 8, 2, '#2a2e3d');
    r(ctx, 4, y, 1, 1, '#7ee787');
    r(ctx, 10, y, 1, 1, (y % 8 === 5) ? '#ffc857' : '#2a2e3d');
  }
}

function paintCopier(ctx, f, w, h) {
  box(ctx, 2, 2, w - 4, h - 4, '#c9ced6');
  r(ctx, 4, 3, w - 12, 2, INK);
  r(ctx, 10, 4, 8, 3, PAPER);
  r(ctx, 4, h - 7, 6, 3, '#e8e8ee');
  r(ctx, w - 8, h - 7, 4, 3, '#7ee787');
  r(ctx, 4, 7, w - 8, 1, METAL_D);
}

function paintPrinter(ctx, f, w, h) {
  box(ctx, 3, 5, 10, 8, '#c9ced6');
  r(ctx, 5, 2, 6, 3, PAPER);
  r(ctx, 5, 7, 6, 2, INK);
  r(ctx, 5, 10, 2, 2, '#7ee787');
}

function paintFileCabinet(ctx, f, w, h) {
  box(ctx, 3, 1, 10, 14, METAL);
  for (let i = 0; i < 3; i++) {
    const y = 3 + i * 4;
    r(ctx, 4, y, 8, 3, '#6b7280');
    r(ctx, 6, y + 1, 4, 1, METAL_D);
  }
}

function paintSofa(ctx, f, w, h) {
  r(ctx, 2, h - 2, w - 4, 2, 'rgba(0,0,0,0.25)');
  r(ctx, 0, 2, w, 5, '#3a4260');           // sandaran
  box(ctx, 0, 6, w, h - 7, '#4a5474');
  r(ctx, 1, 7, w - 2, 2, '#5a6688');
  r(ctx, 0, 2, 3, h - 4, '#2f3752');        // sandaran tangan kiri
  r(ctx, w - 3, 2, 3, h - 4, '#2f3752');
  r(ctx, Math.floor(w / 2) - 1, 7, 2, h - 9, '#3a4260');
}

function paintArmchair(ctx, f, w, h) {
  r(ctx, 1, h - 2, w - 2, 2, 'rgba(0,0,0,0.25)');
  r(ctx, 2, 2, 12, 5, '#3a4260');
  box(ctx, 2, 6, 12, 8, '#4a5474');
  r(ctx, 3, 7, 10, 2, '#5a6688');
}

function paintBeanbag(ctx, f, w, h) {
  r(ctx, 3, h - 3, 10, 2, 'rgba(0,0,0,0.25)');
  box(ctx, 3, 6, 10, 8, '#d0874a');
  r(ctx, 4, 4, 8, 3, '#d0874a');
  r(ctx, 5, 5, 3, 1, '#e8a96a');
}

function paintCoffeeTable(ctx, f, w, h) {
  box(ctx, 2, 4, 12, 9, WOOD);
  r(ctx, 3, 5, 10, 2, WOOD_L);
  r(ctx, 6, 7, 4, 3, '#e8e8ee');
}

function paintPoolTable(ctx, f, w, h) {
  box(ctx, 0, 0, w, h, WOOD_D);
  r(ctx, 2, 2, w - 4, h - 4, '#2f7a4a');
  r(ctx, 3, 3, w - 6, 1, '#3f9a5f');
  // lubang
  r(ctx, 3, 3, 3, 3, '#1c1c24');
  r(ctx, w - 6, 3, 3, 3, '#1c1c24');
  r(ctx, 3, h - 6, 3, 3, '#1c1c24');
  r(ctx, w - 6, h - 6, 3, 3, '#1c1c24');
  // bola
  r(ctx, 18, 13, 2, 2, '#e8e8ee');
  r(ctx, 24, 11, 2, 2, '#c8553d');
  r(ctx, 30, 16, 2, 2, '#ffc857');
  r(ctx, 27, 19, 2, 2, '#6bc5ff');
}

function paintWorkbench(ctx, f, w, h) {
  box(ctx, 0, 3, w, h - 5, METAL);
  r(ctx, 1, 4, w - 2, 2, METAL_L);
  r(ctx, 1, h - 4, w - 2, 1, METAL_D);
  // alat-alat
  r(ctx, 6, 6, 8, 2, INK);                 // kunci
  r(ctx, 6, 8, 2, 3, INK);
  box(ctx, w - 18, 5, 9, 6, '#c8553d');    // toolbox
  r(ctx, w - 15, 3, 4, 2, METAL_D);
  r(ctx, 20, 7, 2, 2, '#ffc857');          // sekrup
}

function paintBoxes(ctx, f, w, h) {
  box(ctx, 2, 4, 12, 10, '#b08968');
  r(ctx, 2, 8, 12, 2, '#c9a37c');
  r(ctx, 6, 4, 4, 10, 'rgba(255,255,255,0.08)');
}

function paintToolbox(ctx, f, w, h) {
  box(ctx, 4, 7, 8, 6, '#c8553d');
  r(ctx, 6, 4, 4, 3, METAL_D);
  r(ctx, 5, 8, 2, 2, '#e8e8ee');
}

function paintReceptionDesk(ctx, f, w, h) {
  box(ctx, 0, 2, w, h - 4, '#e8e8ee');
  r(ctx, 1, 3, w - 2, 2, '#f6f6f9');
  r(ctx, 1, h - 4, w - 2, 2, '#c9ced6');
  // logo & bel
  r(ctx, Math.floor(w / 2) - 3, 5, 6, 4, '#ffc857');
  r(ctx, Math.floor(w / 2) - 1, 6, 2, 2, INK);
  r(ctx, w - 10, 5, 4, 3, METAL_D);
  r(ctx, 6, 5, 6, 4, SCREEN);
  r(ctx, 7, 6, 4, 2, GLOW);
}

function paintDirectorDesk(ctx, f, w, h) {
  box(ctx, 0, 3, w, h - 5, '#5a3a2a');
  r(ctx, 1, 4, w - 2, 1, '#c9a227');       // trim emas
  r(ctx, 1, h - 5, w - 2, 1, '#3d2718');
  // monitor besar
  box(ctx, Math.floor(w / 2) - 8, 4, 12, 8, SCREEN);
  r(ctx, Math.floor(w / 2) - 7, 5, 10, 6, GLOW);
  // nameplate emas
  r(ctx, 6, h - 9, 12, 3, '#c9a227');
  r(ctx, 8, h - 8, 8, 1, INK);
  // lampu & cangkir
  r(ctx, w - 12, 5, 4, 4, '#ffc857');
  r(ctx, w - 6, 5, 3, 3, '#e8e8ee');
}

function paintTripodCamera(ctx, f, w, h) {
  r(ctx, 7, 7, 2, 8, INK);
  r(ctx, 3, 14, 3, 2, INK);
  r(ctx, 10, 14, 3, 2, INK);
  box(ctx, 4, 3, 8, 5, '#232734');
  r(ctx, 8, 4, 2, 2, GLOW);
  r(ctx, 5, 2, 2, 2, '#ff6b6b');           // REC
}

function paintPlant(ctx, f, w, h) {
  box(ctx, 4, 10, 8, 5, '#b06a4a');
  r(ctx, 3, 3, 4, 5, '#4a8a4a');
  r(ctx, 8, 2, 4, 6, '#4a8a4a');
  r(ctx, 6, 0, 3, 4, '#5aa35a');
  r(ctx, 5, 4, 2, 2, '#6bbf6b');
  r(ctx, 9, 4, 2, 2, '#6bbf6b');
}

function paintPlantBig(ctx, f, w, h) {
  box(ctx, 9, 20, 14, 9, '#b06a4a');
  r(ctx, 10, 21, 12, 2, '#c98a6a');
  r(ctx, 6, 6, 7, 14, '#3f7a3f');
  r(ctx, 17, 3, 8, 15, '#4a8a4a');
  r(ctx, 11, 0, 6, 10, '#5aa35a');
  r(ctx, 8, 10, 3, 3, '#6bbf6b');
  r(ctx, 20, 8, 3, 3, '#6bbf6b');
  r(ctx, 14, 4, 3, 3, '#6bbf6b');
}

function paintRug(ctx, f, w, h) {
  const base = f.meta?.color || '#5a6688';
  r(ctx, 0, 0, w, h, shade(base, -20));
  r(ctx, 2, 2, w - 4, h - 4, base);
  r(ctx, 4, 4, w - 8, h - 8, shade(base, 12));
  // pola tepi putus-putus
  for (let x = 2; x < w - 2; x += 4) {
    r(ctx, x, 2, 2, 1, shade(base, -35));
    r(ctx, x, h - 3, 2, 1, shade(base, -35));
  }
}

function paintCoffeeStain(ctx, f, w, h) {
  r(ctx, 4, 5, 6, 5, 'rgba(58,36,24,0.55)');
  r(ctx, 6, 4, 3, 2, 'rgba(58,36,24,0.45)');
  r(ctx, 3, 8, 3, 2, 'rgba(58,36,24,0.4)');
  r(ctx, 11, 7, 2, 2, 'rgba(58,36,24,0.4)');
}

function paintCableMess(ctx, f, w, h) {
  ctx.fillStyle = '#c8553d';
  ctx.fillRect(2, 6, w - 4, 1);
  ctx.fillRect(6, 3, 1, 6);
  ctx.fillStyle = '#232734';
  ctx.fillRect(3, 9, w - 6, 1);
  ctx.fillRect(12, 7, 1, 4);
}

function paintHazardTape(ctx, f, w, h) {
  for (let x = 0; x < w; x++) {
    const c = (Math.floor(x / 4) % 2 === 0) ? '#ffc857' : '#232734';
    r(ctx, x, 6, 1, 4, c);
  }
}

function paintWhiteboard(ctx, f, w, h) {
  box(ctx, 0, 2, w, 12, '#e8ecf4');
  // coretan marker
  r(ctx, 4, 5, 10, 1, '#c8553d');
  r(ctx, 16, 4, 14, 1, '#2c6ecf');
  r(ctx, 6, 8, 8, 1, '#2c6ecf');
  r(ctx, 18, 9, 10, 1, '#3f9a5f');
  r(ctx, 30, 5, 8, 1, '#c8553d');
  r(ctx, 34, 8, 6, 1, '#3f9a5f');
  r(ctx, 4, 11, 6, 1, '#3f9a5f');
  r(ctx, 2, 14, w - 4, 1, METAL_D);        // tray
}

function paintPosterBoard(ctx, f, w, h) {
  const theme = f.meta?.theme;
  box(ctx, 0, 2, w, 12, '#232734');
  if (theme === 'finance') {
    // grafik batang naik
    const bars = [4, 7, 6, 9, 11];
    bars.forEach((bh, i) => {
      r(ctx, 5 + i * 8, 12 - bh, 5, bh, i === 4 ? '#7ee787' : '#9fe6a0');
    });
    r(ctx, 42, 5, 3, 3, '#ffc857');
  } else {
    // marketing: tren panah + hati
    r(ctx, 4, 10, 30, 2, '#ff9ec4');
    r(ctx, 30, 7, 6, 3, '#ff9ec4');
    r(ctx, 33, 5, 3, 2, '#ff9ec4');
    r(ctx, 40, 6, 4, 4, '#d86b8f');
  }
}

function paintProjectorScreen(ctx, f, w, h) {
  r(ctx, 0, 1, w, 2, METAL_D);
  box(ctx, 2, 3, w - 4, 11, '#d8dee8');
  r(ctx, 4, 5, w - 8, 7, '#8fb3ff');
  r(ctx, 6, 7, 8, 1, '#e8ecf4');
  r(ctx, 6, 9, 12, 1, '#e8ecf4');
}

function paintCctvWall(ctx, f, w, h) {
  box(ctx, 0, 2, w, 12, '#232734');
  const rooms = ['#2f3a4f', '#6b4a56', '#3d4d3f'];
  for (let i = 0; i < 3; i++) {
    const x = 3 + i * 15;
    box(ctx, x, 4, 13, 9, SCREEN);
    r(ctx, x + 1, 5, 11, 7, rooms[i]);
    r(ctx, x + 1, 9, 11, 3, 'rgba(255,255,255,0.12)');
    r(ctx, x + 10, 5, 2, 2, '#ff6b6b');
  }
}

function paintAcUnit(ctx, f, w, h) {
  box(ctx, 0, 4, w, 9, '#e8e8ee');
  for (let y = 6; y < 11; y += 2) r(ctx, 3, y, w - 6, 1, '#c9ced6');
  r(ctx, w - 5, 5, 2, 2, '#7ee787');
}

function paintCompanySign(ctx, f, w, h) {
  box(ctx, 1, 1, w - 2, 13, '#232734');
  r(ctx, 3, 3, w - 6, 9, '#1a1e2a');
  // logo gedung pixel
  const cx = Math.floor(w / 2);
  r(ctx, cx - 8, 5, 7, 7, '#ffc857');
  r(ctx, cx, 4, 8, 8, '#e8a52f');
  for (let i = 0; i < 3; i++) {
    r(ctx, cx - 6, 6 + i * 2, 1, 1, INK);
    r(ctx, cx - 3, 6 + i * 2, 1, 1, INK);
  }
  for (let i = 0; i < 3; i++) {
    r(ctx, cx + 2, 6 + i * 2, 1, 1, INK);
    r(ctx, cx + 4, 6 + i * 2, 1, 1, INK);
  }
}

// ---------------- Dispatcher ----------------

const PAINTERS = {
  desk: paintDesk,
  deskL: paintDeskL,
  conferenceTable: paintConferenceTable,
  longTable: paintLongTable,
  counter: paintCounter,
  coffeeMachine: paintCoffeeMachine,
  fridge: paintFridge,
  dispenser: paintDispenser,
  vendingMachine: paintVending,
  serverRack: paintServerRack,
  copier: paintCopier,
  printer: paintPrinter,
  filecabinet: paintFileCabinet,
  sofa: paintSofa,
  armchair: paintArmchair,
  beanbag: paintBeanbag,
  coffeeTable: paintCoffeeTable,
  poolTable: paintPoolTable,
  workbench: paintWorkbench,
  boxes: paintBoxes,
  toolbox: paintToolbox,
  receptionDesk: paintReceptionDesk,
  directorDesk: paintDirectorDesk,
  tripodCamera: paintTripodCamera,
  plant: paintPlant,
  plantBig: paintPlantBig,
  rug: paintRug,
  coffeeStain: paintCoffeeStain,
  cableMess: paintCableMess,
  hazardTape: paintHazardTape,
  whiteboard: paintWhiteboard,
  posterBoard: paintPosterBoard,
  projectorScreen: paintProjectorScreen,
  cctvWall: paintCctvWall,
  acUnit: paintAcUnit,
  companySign: paintCompanySign,
};

export function paintFurniture(ctx, f) {
  const painter = PAINTERS[f.type];
  if (!painter) return;
  const px = f.x * TILE;
  const py = f.y * TILE;
  const pw = f.w * TILE;
  const ph = f.h * TILE;
  ctx.save();
  ctx.translate(px, py);
  painter(ctx, f, pw, ph);
  ctx.restore();
}

export function hasPainter(type) {
  return !!PAINTERS[type];
}

// ---------------- Kursi (digambar di atas tile seat) ----------------

export function paintChair(ctx, seat, px, py) {
  const wood = seat.kind === 'pantry';
  const main = wood ? WOOD : (seat.kind === 'meeting' ? '#3a4260' : '#4a5474');
  const back = wood ? WOOD_D : '#2f3752';
  const s = 16;
  const t = 3;

  const H = TILE;
  const backT = 4;   // tebal sandaran

  switch (seat.facing) {
    case 'up': {
      r(ctx, px + t, py + H - backT - 2, s - t * 2, 2, 'rgba(0,0,0,0.25)');
      r(ctx, px + t, py + H - backT - 1, s - t * 2, backT, back);
      r(ctx, px + t + 1, py + 6, s - t * 2 - 2, H - backT - 7, main);
      r(ctx, px + t + 2, py + 7, s - t * 2 - 4, 2, shade(main, 14));
      break;
    }
    case 'down': {
      r(ctx, px + t, py + 1, s - t * 2, backT, back);
      r(ctx, px + t + 1, py + 5, s - t * 2 - 2, H - backT - 6, main);
      r(ctx, px + t + 2, py + 6, s - t * 2 - 4, 2, shade(main, 14));
      break;
    }
    case 'left': {
      r(ctx, px + 1, py + t, backT, s - t * 2, back);
      r(ctx, px + 5, py + t + 1, H - backT - 6, s - t * 2 - 2, main);
      r(ctx, px + 6, py + t + 2, 2, s - t * 2 - 4, shade(main, 14));
      break;
    }
    case 'right': {
      r(ctx, px + H - backT - 1, py + t, backT, s - t * 2, back);
      r(ctx, px + 1, py + t + 1, H - backT - 6, s - t * 2 - 2, main);
      r(ctx, px + 2, py + t + 2, 2, s - t * 2 - 4, shade(main, 14));
      break;
    }
  }
}

// ---------------- Color helper ----------------

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let rr = (n >> 16) & 255, gg = (n >> 8) & 255, bb = n & 255;
  rr = Math.max(0, Math.min(255, rr + amt));
  gg = Math.max(0, Math.min(255, gg + amt));
  bb = Math.max(0, Math.min(255, bb + amt));
  return `#${((rr << 16) | (gg << 8) | bb).toString(16).padStart(6, '0')}`;
}
