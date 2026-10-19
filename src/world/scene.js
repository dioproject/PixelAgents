// ============================================================
// scene.js — Pre-render seluruh peta statis ke satu offscreen canvas
// ============================================================

import {
  TILE, MAP_W, MAP_H, WORLD_W, WORLD_H,
  ROOMS, DOORS, FURNITURE, SEATS, roomAtTile,
} from './office.js';
import { floorTileFor, paintWall, paintDoor, isFloor } from './tiles.js';
import { paintFurniture, paintChair } from './furnitureArt.js';

let staticCanvas = null;

export function buildStaticScene() {
  if (staticCanvas) return staticCanvas;

  const canvas = document.createElement('canvas');
  canvas.width = WORLD_W;
  canvas.height = WORLD_H;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // 1) Lantai semua ruangan & pintu
  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      if (!isFloor(tx, ty)) continue;
      const room = roomAtTile(tx, ty);
      const styleId = room ? room.floor : 'corridor';
      ctx.drawImage(floorTileFor(styleId), tx * TILE, ty * TILE);
    }
  }

  // 2) Keset pintu
  for (const d of DOORS) paintDoor(ctx, d, d.x * TILE, d.y * TILE);

  // 3) Dinding
  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      if (!isFloor(tx, ty)) paintWall(ctx, tx, ty, tx * TILE, ty * TILE);
    }
  }

  // 4) Dekorasi lantai (rug, noda kopi, dst.)
  for (const f of FURNITURE) {
    if (f.layer === 'floor') paintFurniture(ctx, f);
  }

  // 5) Furniture utama (non-dinding)
  for (const f of FURNITURE) {
    if (!f.layer && !f.wall) paintFurniture(ctx, f);
  }

  // 6) Kursi pada seat
  for (const s of SEATS) {
    paintChair(ctx, s, s.x * TILE, s.y * TILE);
  }

  // 7) Item dinding (papan tulis, AC, layar, dst.) — paling akhir
  for (const f of FURNITURE) {
    if (f.wall) paintFurniture(ctx, f);
  }

  staticCanvas = canvas;
  return canvas;
}

/**
 * Gambar scene statis dengan transform kamera.
 * Semua koordinat dunia; ctx sudah punya transform (zoom+dpr+smoothing off).
 */
export function drawStaticScene(ctx) {
  const c = buildStaticScene();
  ctx.drawImage(c, 0, 0);
}
