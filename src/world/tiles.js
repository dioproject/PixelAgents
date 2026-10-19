// ============================================================
// tiles.js — Painter lantai & dinding (pixel art prosedural)
// ============================================================

import { TILE, FLOOR_STYLES, ROOMS, DOORS, MAP_W, MAP_H } from './office.js';

export const INK = '#14151f';
const WALL_FACE = '#363b4d';
const WALL_TOP = '#4a4f63';
const WALL_BASE = '#232734';

const rect = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

/** Grid struktur: 1 = lantai/pintu (bisa dilewati secara struktur), 0 = dinding */
const structureGrid = (() => {
  const g = new Uint8Array(MAP_W * MAP_H);
  for (const r of ROOMS) {
    for (let ty = r.y; ty < r.y + r.h; ty++)
      for (let tx = r.x; tx < r.x + r.w; tx++) g[ty * MAP_W + tx] = 1;
  }
  for (const d of DOORS) g[d.y * MAP_W + d.x] = 1;
  return g;
})();

const isFloor = (x, y) => x >= 0 && y >= 0 && x < MAP_W && y < MAP_H && structureGrid[y * MAP_W + x] === 1;

/** Cache tile lantai per style (16x16 offscreen) */
const floorCache = new Map();

function buildFloorTile(styleId) {
  const style = FLOOR_STYLES[styleId] || FLOOR_STYLES.corridor;
  const c = document.createElement('canvas');
  c.width = TILE; c.height = TILE;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  rect(ctx, 0, 0, TILE, TILE, style.base);

  if (style.pattern === 'plank') {
    // papan kayu: garis horizontal + seam vertikal selang-seling
    rect(ctx, 0, 5, TILE, 1, style.checker);
    rect(ctx, 0, 11, TILE, 1, style.checker);
    rect(ctx, 7, 0, 1, 5, style.checker);
    rect(ctx, 3, 6, 1, 5, style.checker);
    rect(ctx, 11, 12, 1, 4, style.checker);
  } else {
    // checker 8x8 halus
    rect(ctx, 0, 0, 8, 8, style.checker);
    rect(ctx, 8, 8, 8, 8, style.checker);
  }
  // tekstur titik jarang biar tidak flat
  rect(ctx, 3, 3, 1, 1, hexA(style.accent, 0.18));
  rect(ctx, 12, 9, 1, 1, hexA(style.accent, 0.14));
  return c;
}

function hexA(hex, alpha) {
  const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return `${hex}${a}`;
}

export function floorTileFor(styleId) {
  if (!floorCache.has(styleId)) floorCache.set(styleId, buildFloorTile(styleId));
  return floorCache.get(styleId);
}

/** Gambar SATU tile dinding pada ctx (koordinat pixel px, py) */
export function paintWall(ctx, tx, ty, px, py) {
  rect(ctx, px, py, TILE, TILE, WALL_FACE);

  const floorAbove = isFloor(tx, ty - 1);
  const floorBelow = isFloor(tx, ty + 1);
  const floorLeft = isFloor(tx - 1, ty);
  const floorRight = isFloor(tx + 1, ty);

  if (floorAbove) {
    // top cap: dinding terlihat dari sisi selatan ruangan atas
    rect(ctx, px, py, TILE, 5, WALL_TOP);
    rect(ctx, px, py + 5, TILE, 1, '#2f3446');
    rect(ctx, px, py, TILE, 1, INK);
  }
  if (floorBelow) {
    rect(ctx, px, py + TILE - 3, TILE, 3, WALL_BASE);
    rect(ctx, px, py + TILE - 1, TILE, 1, INK);
  }
  if (floorLeft) rect(ctx, px, py, 1, TILE, '#2b3040');
  if (floorRight) rect(ctx, px + TILE - 1, py, 1, TILE, '#2b3040');

  // subtle brick lines
  rect(ctx, px, py + 8, TILE, 1, 'rgba(0,0,0,0.12)');
}

/** Pintu: keset + kusen */
export function paintDoor(ctx, tile, px, py) {
  // keset
  rect(ctx, px + 2, py + 3, TILE - 4, TILE - 6, '#2a2e3d');
  rect(ctx, px + 3, py + 4, TILE - 6, TILE - 8, '#3a4260');
  // kusen pada sisi yang menempel dinding
  const wallLeft = !isFloor(tile.x - 1, tile.y);
  const wallRight = !isFloor(tile.x + 1, tile.y);
  if (wallLeft) rect(ctx, px, py, 1, TILE, INK);
  if (wallRight) rect(ctx, px + TILE - 1, py, 1, TILE, INK);
}

export { isFloor };
