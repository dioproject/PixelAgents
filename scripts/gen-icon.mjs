// ============================================================
// gen-icon.mjs — Membuat assets/logo.png (pixel art) tanpa dependensi
// Jalankan: bun scripts/gen-icon.mjs
// ============================================================

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const GRID = 32;
const SCALE = 32;
const SIZE = GRID * SCALE;

// ---------- 1. Gambar logo di grid 32x32 ----------
const px = Array.from({ length: GRID }, () => Array(GRID).fill(null));

const set = (x, y, color) => {
  if (x < 0 || y < 0 || x >= GRID || y >= GRID) return;
  px[y][x] = color;
};

const rect = (x0, y0, w, h, color) => {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) set(x, y, color);
  }
};

// Tile gelap dengan sudut membulat
const DARK = '#14151f';
const AMBER = '#ffc857';
const AMBER_DARK = '#e8a52f';
const HIGHLIGHT = '#ffe49a';
const INK = '#14151f';

for (let y = 2; y < 30; y++) {
  for (let x = 2; x < 30; x++) {
    const corner =
      (x < 5 && y < 5) || (x > 26 && y < 5) ||
      (x < 5 && y > 26) || (x > 26 && y > 26);
    if (corner) continue;
    set(x, y, DARK);
  }
}

// Kotak amber (badge perusahaan)
rect(5, 5, 22, 22, AMBER);
rect(24, 6, 2, 20, AMBER_DARK);
rect(6, 24, 18, 2, AMBER_DARK);
rect(6, 6, 16, 1, HIGHLIGHT);

// Mata pixel
rect(9, 11, 4, 4, INK);
rect(19, 11, 4, 4, INK);
set(10, 12, '#ffffff');
set(20, 12, '#ffffff');

// Senyum lebar
rect(11, 20, 10, 2, INK);
set(9, 19, INK);
set(21, 19, INK);
set(10, 21, INK);
set(20, 21, INK);

// Dasi kecil (aksen korporat)
rect(15, 24, 2, 2, INK);

// ---------- 2. Rasterisasi ke RGBA ----------
const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE, 0);
for (let y = 0; y < SIZE; y++) {
  const rowStart = y * (SIZE * 4 + 1);
  raw[rowStart] = 0; // filter type: none
  const gy = Math.floor(y / SCALE);
  for (let x = 0; x < SIZE; x++) {
    const gx = Math.floor(x / SCALE);
    const hex = px[gy][gx];
    const offset = rowStart + 1 + x * 4;
    if (!hex) {
      raw[offset + 3] = 0;
      continue;
    }
    const n = parseInt(hex.slice(1), 16);
    raw[offset] = (n >> 16) & 255;
    raw[offset + 1] = (n >> 8) & 255;
    raw[offset + 2] = n & 255;
    raw[offset + 3] = 255;
  }
}

// ---------- 3. PNG encoder minimal ----------
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8;        // bit depth
ihdr[9] = 6;        // color type RGBA
ihdr[10] = 0;       // compression
ihdr[11] = 0;       // filter
ihdr[12] = 0;       // interlace

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const out = resolve(process.cwd(), 'assets/logo.png');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, png);
console.log(`[icon] ${out} (${SIZE}x${SIZE}, ${png.length} bytes)`);
