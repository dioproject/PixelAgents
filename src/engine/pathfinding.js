// ============================================================
// pathfinding.js — A* 4 arah di grid tile
// ============================================================

const DIRS = [
  { x: 0, y: -1 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
];

const key = (x, y) => x * 100000 + y;

/**
 * Cari jalur dari `from` ke `to`.
 * @param {{isWalkable:(x:number,y:number,agentId?:string)=>boolean, MAP_W:number, MAP_H:number}} world
 * @returns {Array<{x:number,y:number}>|null} jalur TANPA tile awal, atau null jika tidak ada
 */
export function findPath(world, from, to, agentId) {
  if (from.x === to.x && from.y === to.y) return [];
  if (!world.isWalkable(to.x, to.y, agentId)) {
    const alt = nearestWalkable(world, to, agentId);
    if (!alt) return null;
    to = alt;
  }

  const open = new Map();   // key -> node
  const closed = new Set();
  const startNode = { x: from.x, y: from.y, g: 0, f: h(from, to), parent: null };
  open.set(key(from.x, from.y), startNode);

  let iterations = 0;
  const MAX_ITER = 20000;

  while (open.size > 0 && iterations++ < MAX_ITER) {
    // ambil node dengan f terkecil (linear scan — grid kecil, cukup)
    let current = null;
    for (const node of open.values()) {
      if (!current || node.f < current.f) current = node;
    }
    open.delete(key(current.x, current.y));

    if (current.x === to.x && current.y === to.y) {
      return reconstruct(current);
    }
    closed.add(key(current.x, current.y));

    for (const d of DIRS) {
      const nx = current.x + d.x;
      const ny = current.y + d.y;
      const k = key(nx, ny);
      if (closed.has(k)) continue;
      if (!world.isWalkable(nx, ny, agentId)) continue;

      const g = current.g + 1;
      const existing = open.get(k);
      if (!existing) {
        open.set(k, { x: nx, y: ny, g, f: g + h({ x: nx, y: ny }, to), parent: current });
      } else if (g < existing.g) {
        existing.g = g;
        existing.f = g + h(existing, to);
        existing.parent = current;
      }
    }
  }
  return null;
}

function h(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function reconstruct(node) {
  const path = [];
  let n = node;
  while (n.parent) {
    path.push({ x: n.x, y: n.y });
    n = n.parent;
  }
  return path.reverse();
}

/** Cari tile walkable terdekat dari suatu titik (spiral search) */
export function nearestWalkable(world, tile, agentId, maxRadius = 10) {
  if (world.isWalkable(tile.x, tile.y, agentId)) return { x: tile.x, y: tile.y };
  for (let r = 1; r <= maxRadius; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = tile.x + dx;
        const y = tile.y + dy;
        if (world.isWalkable(x, y, agentId)) return { x, y };
      }
    }
  }
  return null;
}
