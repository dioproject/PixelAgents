# Rencana Implementasi: Tugas Proyek & Paket Deliverable

> **Untuk pelaksana:** kerjakan task berurutan. Tiap task punya langkah verifikasi; JANGAN lanjut sebelum verifikasi hijau. Setelah semua task selesai, jalankan Task 10 (QA akhir).
>
> **Spec sumber (source of truth):** `docs/superpowers/specs/2026-10-19-tugas-proyek-deliverable-design.md` (rev 2 + refinement §10: `save_project_package`).
>
> **Sasaran akhir:** Direktur menulis satu brief bebas → semua divisi kelihatan bekerja ±20–40 menit kantor → paket file nyata tersimpan di `Documents\PixelSinergi\<tanggal> - Hari <n> - <slug>\` (termasuk `kode/` = kode proyek sesuai brief, bukan mini website) + bisa dibaca ulang di aplikasi. Selalu playable offline via template.

---

## Konteks Teknis (baca dulu, 1 menit)

- Stack: Tauri 2 + Vite + Vanilla JS, **Bun satu-satunya package manager**. Tanpa git saat ini (Task 0 opsional).
- Jalur dev: `bun run tauri dev` (Vite auto-start lewat `beforeDevCommand`). Build cek: `bun run build`, `cargo check` (dari `src-tauri/`).
- Test: **Bun test bawaan** (`bun test`) — tanpa dependency baru. Test hidup di `tests/`.
- Clock: `sim.clock.timeMin` (menit 0–1439), `sim.clock.day`, progres game pakai `gameMinutes` dari `sim.clock.tick(dt)`. Kantor tutup 18:00 → `endDay()` di `src/main.js` baris ~271.
- Feed: `sim.feed.add({ channel, text, meta })`. Channel valid ada di `Set` `src/ui/feed.js` baris 10.
- Modal: `Modals.open(html)` mengembalikan backdrop element; handler `[data-close]` + `this.close()`. Modal aktif tersimpan di `this.current`.
- LLM: `chat(messages, { maxTokens, timeoutSecs })` dari `src/llm/client.js` → `{ ok, text?, error? }`. Tauri diproxy Rust (bebas CORS). `isLlmReady()` dari `src/core/config.js`.
- Dev hook QA: `window.__PIXEL_SIM__` = objek `sim` (tersedia di mode dev).
- Behavior: `Behavior.assignForBlock(agent, block)` memetakan blok waktu → aktivitas; `goWork(agent, label)` duduk di meja. Blok: `arrival/work1/lunch/work2/break/capek/home`.
- Data divisi: `DIVISIONS` (`src/world/office.js`): `it, marketing, finance, hrd, ga` — `{ name, short, color }`.

---

## Batasan Global (semua task)

1. Semua teks user-facing **Bahasa Indonesia** (gaya kantor satir, konsisten dengan game).
2. **Tanpa dependency JS baru.** Satu dependency Rust baru: `base64 = "0.22"`.
3. App **tidak pernah** mengeksekusi/compile kode hasil LLM. Batas keamanan keras.
4. Batas paket kode: maks **14 file**, maks **24 KB/file**, maks **160 KB total**, kedalaman folder **≤4**, whitelist ekstensi; README dijamin ada.
5. LLM: maks 1 panggilan jalan bersamaan (pakai `sim.conversations.llmBusy`); panggilan A konten `maxTokens: 2000`, `timeoutSecs: 60`; panggilan B kode `maxTokens: 8000`, `timeoutSecs: 90`.
6. Offline-first: setiap jalur LLM punya fallback yang **selalu** menghasilkan paket. Badge sumber: `LLM` / `LLM + Template` / `Template offline`.
7. Paket 8 item: `laporan.md`, `poster.png`, `ikon-app.png`, `caption-sosmed.txt`, `anggaran.csv`, `memo-sdm.md`, `checklist-ga.csv`, `kode/**`.
8. Jangan commit rahasia; jangan pakai `bun install` paket baru di JS.
9. CSS pakai variabel yang sudah ada (`--panel-2`, `--border`, `--border-2`, `--ink`, `--accent`, `--text-dim`, `--font-mono`, `--danger`, `--success`, `--info`).

## Fokus Review (yang paling gampang salah)

1. **Sanitasi path** (JS `code.js` + Rust): tolak `..`, absolut, segmen aneh; reserved name Windows (`CON`, `NUL`, …) di-prefix; tidak boleh bisa nulis keluar folder paket.
2. **Merge parsial JSON LLM**: `mergeProjectContent` harus mengisi SEMUA bagian yang kosong dari fallback dan menghitung badge dengan benar (0 bagian → template, semua → LLM, sisanya mixed).
3. **Race lifecycle**: `complete()` yang sedang jalan harus dibatalkan token saat `finalizeLate()` (rollover 18:00) — tidak boleh dobel-simpan / zombie state. Satu proyek aktif.
4. **CSV/Excel & karakter khusus**: BOM UTF-8, delimiter `;`, escape kutip/`;`/newline; brief berisi emoji/kutip tidak boleh merusak `laporan.md`.
5. **Dua mode simpan**: Tauri (folder nyata via Rust) vs browser dev (unduhan Blob) — semua error harus tampil di manifest per-file + toast, tidak boleh throw ke UI.

---

## Struktur File

| File | Aksi | Tanggung jawab |
|---|---|---|
| `src/artifacts/files.js` | **baru** | Builder teks murni (md/csv/txt) + slug. Tanpa DOM. |
| `src/artifacts/code.js` | **baru** | Sanitasi & normalisasi file kode + pilih template fallback. Murni. |
| `src/artifacts/templates.js` | **baru** | 2 scaffold fallback valid: `tauri-sqlite-starter`, `vite-vanilla-starter`. |
| `src/artifacts/poster.js` | **baru** | Render `poster.png` (1080²) & `ikon-app.png` (512²) → dataURL. Canvas. |
| `src/agents/projects.js` | **baru** | Orkestrator: start/update/complete/finalizeLate/save/arsip/focus. |
| `src/llm/prompts.js` | edit | `buildProjectContentPrompt` (A), `buildProjectCodePrompt` (B), parser JSON toleran. |
| `src/llm/fallback.js` | edit | Bank fallback konten proyek (5 divisi, poster, caption, budget, ga, memo). |
| `src/main.js` | edit | Wiring `sim.projects`, stats `projects/projectsToday`, `update`, `endDay`, `buildReport`, `openProject`. |
| `src/agents/directives.js` | edit | Preset `📋 Tugas Proyek Baru` + `case 'proyek'`. |
| `src/agents/behavior.js` | edit | Mode fokus proyek (kerja di meja, kopi −50%, tanpa kunjungan, blok pulang tetap kerja). |
| `src/ui/modals.js` | edit | Kartu + textarea proyek di modal Titah; modal `📁 Proyek` (poster, laporan, manifest, tombol); KPI + daftar proyek di laporan harian. |
| `src/ui/hud.js` | edit | Widget progres + tombol `📄 Lihat Hasil` / `📁 Arsip Proyek`. |
| `src/ui/feed.js` | edit | Channel `proyek` + masuk "catatan penting" laporan. |
| `src/style.css` | edit | Style widget, modal proyek, manifest, chip poster, channel feed. |
| `src-tauri/Cargo.toml` | edit | `base64 = "0.22"`. |
| `src-tauri/src/lib.rs` | edit | `save_project_package`, `open_path` + unit test sanitasi. |
| `package.json` | edit | Script `"test": "bun test"`. |
| `tests/artifacts-files.test.js` | **baru** | Test builder teks. |
| `tests/artifacts-code.test.js` | **baru** | Test sanitasi/normalisasi kode. |
| `tests/llm-project.test.js` | **baru** | Test parser & bank fallback. |
| `tests/projects-merge.test.js` | **baru** | Test merge konten parsial. |
| `README.md`, `docs/{PRD,RULES,SCHEMA,ARCHITECTURE}.md` | edit | Dokumentasi fitur. |

---

## Task 0 — Git init + baseline (OPSIONAL, tanyakan user dulu)

Tanpa git, lewati task ini dan abaikan semua langkah "Commit" di task lain.

- [ ] Pastikan `.gitignore` ada dan berisi minimal:
  ```
  node_modules/
  dist/
  src-tauri/target/
  ```
- [ ] Jalankan:
  ```bash
  git init
  git add -A
  git commit -m "chore: baseline sebelum fitur Tugas Proyek"
  ```

---

## Task 1 — `src/artifacts/files.js` + test

- [ ] **1a. Tulis test dulu** — buat `tests/artifacts-files.test.js`:

```js
import { describe, expect, test } from 'bun:test';
import {
  slugifyTitle, csvCell, buildBudgetCsv, buildGaChecklistCsv,
  buildCaptionTxt, buildMemoMd, buildReportMd,
} from '../src/artifacts/files.js';

const project = {
  id: 'prj_abc123',
  title: 'Buat Aplikasi Desktop Tauri',
  day: 3,
  status: 'done',
  content: {
    sections: [
      { division: 'it', title: 'Rencana Teknis', text: 'Stack dipilih.' },
      { division: 'marketing', title: 'Kampanye', text: 'Poster siap.' },
      { division: 'finance', title: 'Anggaran', text: 'Rapi.' },
      { division: 'hrd', title: 'SDM', text: 'Aman.' },
      { division: 'ga', title: 'Logistik', text: 'Siap.' },
    ],
  },
  code: { fallback: true },
  files: [{ relPath: 'kode/package.json' }],
};

describe('slugifyTitle', () => {
  test('lowercase & dash', () => {
    expect(slugifyTitle('Buat Aplikasi Desktop Tauri!')).toBe('buat-aplikasi-desktop-tauri');
  });
  test('fallback kosong', () => {
    expect(slugifyTitle('   ')).toBe('proyek');
  });
});

describe('csv', () => {
  test('escape ; dan kutip', () => {
    expect(csvCell('a;b')).toBe('"a;b"');
    expect(csvCell('kata "penting"')).toBe('"kata ""penting"""');
  });
  test('budget csv: BOM, delimiter, TOTAL', () => {
    const csv = buildBudgetCsv([{ item: 'Kopi; tim', qty: 2, unit: 'gelas', price: 15000, note: '' }]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('"Kopi; tim";2;gelas;15000;30000;');
    expect(csv).toContain('TOTAL;;;;30000;Dalam Rupiah');
  });
});

describe('report & memo', () => {
  test('report memuat 5 divisi + ACC + QA', () => {
    const md = buildReportMd(project, { timeLabel: '10:30', sourceLabel: 'LLM', fileList: ['laporan.md'] });
    expect(md).toContain('# Buat Aplikasi Desktop Tauri');
    expect(md).toContain('IT & Engineering — Rencana Teknis');
    expect(md).toContain('General Affairs — Logistik');
    expect(md).toContain('Menunggu ACC Direktur');
    expect(md).toContain('Salsa');
  });
  test('late memuat disclaimer', () => {
    const md = buildReportMd(project, { late: true, fileList: [] });
    expect(md).toContain('DIKEJAR DEADLINE');
  });
  test('memo berkop', () => {
    const md = buildMemoMd(project, { subject: 'Dukungan', body: 'Isi memo', closing: 'Salam' }, { timeLabel: '09:00' });
    expect(md).toContain('PT PIXEL SINERGI NUSANTARA Tbk');
    expect(md).toContain('MEMORANDUM INTERNAL');
    expect(md).toContain('Perihal: Dukungan');
  });
  test('caption + hashtag', () => {
    const txt = buildCaptionTxt({ caption: 'Halo', poster: { hashtags: ['#a', '#b'] } });
    expect(txt).toBe('Halo\n\n#a #b\n');
  });
});
```

- [ ] **1b.** Jalankan `bun test` → GAGAL (module belum ada). OK.
- [ ] **1c. Tambah script test** ke `package.json` (setelah baris `"icons"`):
  ```json
      "icons": "bun scripts/gen-icon.mjs",
      "test": "bun test"
  ```
- [ ] **1d. Implementasi** `src/artifacts/files.js`:

```js
// ============================================================
// files.js — Builder artefak teks paket proyek (murni, tanpa DOM)
// ============================================================

import { DIVISIONS } from '../world/office.js';

const DIVISION_ORDER = ['it', 'marketing', 'finance', 'hrd', 'ga'];

export function slugifyTitle(title) {
  const slug = String(title || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || 'proyek';
}

export function csvCell(value) {
  const s = String(value ?? '').replace(/[\r\n\t]+/g, ' ').trim();
  if (s.includes(';') || s.includes('"')) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

export function buildCsv(headers, rows) {
  const lines = [headers, ...rows].map((row) => row.map(csvCell).join(';'));
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

export function buildBudgetCsv(rows) {
  const body = [];
  let total = 0;
  for (const row of rows) {
    const qty = Math.max(1, Math.round(Number(row.qty) || 1));
    const price = Math.max(0, Math.round(Number(row.price) || 0));
    const sum = qty * price;
    total += sum;
    body.push([row.item, qty, row.unit || 'pcs', price, sum, row.note || '']);
  }
  body.push(['TOTAL', '', '', '', total, 'Dalam Rupiah']);
  return buildCsv(['Item', 'Qty', 'Satuan', 'Harga Satuan', 'Total', 'Catatan'], body);
}

export function buildGaChecklistCsv(rows) {
  const body = rows.map((row) => [
    row.category || 'Umum',
    row.item,
    Math.max(1, Math.round(Number(row.qty) || 1)),
    row.owner || 'GA',
    row.status || 'proses',
  ]);
  return buildCsv(['Kategori', 'Item', 'Qty', 'PIC', 'Status'], body);
}

export function buildCaptionTxt(content) {
  const tags = (content?.poster?.hashtags || []).join(' ');
  return `${content?.caption || ''}\n\n${tags}\n`;
}

export function buildMemoMd(project, memo, { timeLabel = '09:00' } = {}) {
  return [
    'PT PIXEL SINERGI NUSANTARA Tbk',
    'MEMORANDUM INTERNAL',
    `No: HRD-${project.day}/${project.id.slice(-4).toUpperCase()}`,
    '',
    'Kepada : Seluruh Karyawan',
    'Dari   : Bu Maya — HR Manager',
    `Perihal: ${memo.subject}`,
    `Waktu  : Hari ${project.day}, ${timeLabel} WIB`,
    '',
    memo.body,
    '',
    memo.closing || 'Demikian disampaikan. Mohon kerja samanya ya, bestie :)',
    '',
    'Bu Maya — HR Manager',
    'PT Pixel Sinergi Nusantara Tbk',
    '',
  ].join('\n');
}

export function buildReportMd(project, { timeLabel = '18:00', late = false, sourceLabel = '—', fileList = [] } = {}) {
  const lines = [];
  lines.push(`# ${project.title}`);
  lines.push('');
  lines.push(`Proyek internal · Hari ${project.day} · ${timeLabel} WIB`);
  lines.push(`Sumber konten: ${sourceLabel}`);
  if (late) lines.push('Status: DIKEJAR DEADLINE — sebagian bagian belum matang, tetap dilaporkan selesai.');
  lines.push('');
  for (const division of DIVISION_ORDER) {
    const section = (project.content?.sections || []).find((s) => s.division === division);
    if (!section) continue;
    lines.push(`## ${DIVISIONS[division]?.name || division} — ${section.title}`);
    lines.push(section.text);
    lines.push('');
  }
  lines.push('## Status');
  lines.push('Menunggu ACC Direktur.');
  if (late) {
    lines.push('');
    lines.push('> Catatan: proyek dikejar deadline kantor. Sebagian bagian belum matang namun tetap dilaporkan selesai. (Budaya perusahaan, bukan bug.)');
  }
  lines.push('');
  lines.push('## Lampiran Paket');
  const list = fileList.length ? fileList : (project.files || []).map((f) => f.relPath);
  for (const relPath of list) lines.push(`- ${relPath}`);
  lines.push('');
  lines.push('## Catatan QA');
  lines.push(`Kode di folder kode/ ${project.code?.fallback ? 'berasal dari kerangka bawaan (mode offline/template)' : 'dihasilkan AI'} dan belum diuji otomatis. Silakan buka README, jalankan, lalu review sebelum dipakai. — Salsa (QA)`);
  lines.push('');
  return lines.join('\n');
}
```

- [ ] **1e.** `bun test` → semua hijau. `bun run build` → tanpa error.
- [ ] **1f. Commit** (bila git aktif): `feat(artifacts): builder teks paket proyek + test`

---

## Task 2 — `src/artifacts/templates.js` + `src/artifacts/code.js` + test

- [ ] **2a. Tulis test dulu** — buat `tests/artifacts-code.test.js`:

```js
import { describe, expect, test } from 'bun:test';
import {
  sanitizeRelPath, normalizeCodeFiles, pickFallbackTemplate, withGuaranteedReadme,
  MAX_FILE_BYTES,
} from '../src/artifacts/code.js';

describe('sanitizeRelPath', () => {
  test('tolak path keluar & absolut', () => {
    expect(sanitizeRelPath('../rahasia.txt')).toBeNull();
    expect(sanitizeRelPath('/etc/passwd')).toBeNull();
    expect(sanitizeRelPath('C:\\Windows\\x.txt')).toBeNull();
  });
  test('normalisasi backslash & reserved windows', () => {
    expect(sanitizeRelPath('src-tauri\\src\\main.rs')).toBe('src-tauri/src/main.rs');
    expect(sanitizeRelPath('CON.txt')).toBe('proj-CON.txt');
  });
  test('tolak node_modules & terlalu dalam', () => {
    expect(sanitizeRelPath('node_modules/x.js')).toBeNull();
    expect(sanitizeRelPath('a/b/c/d/e.js')).toBeNull();
  });
});

describe('normalizeCodeFiles', () => {
  test('whitelist, duplikat, kapasitas', () => {
    const { files, dropped } = normalizeCodeFiles([
      { path: 'package.json', content: '{}' },
      { path: 'app.exe', content: 'MZ' },
      { path: 'package.json', content: '{}' },
      { path: 'src/main.js', content: 'console.log(1)' },
    ]);
    expect(files.map((f) => f.path)).toEqual(['package.json', 'src/main.js']);
    expect(dropped).toBe(2);
  });
  test('json rusak → warn', () => {
    const { files } = normalizeCodeFiles([{ path: 'rusak.json', content: '{bukan json' }]);
    expect(files[0].warn).toBe(true);
  });
  test('file kebesaran dibuang', () => {
    const big = 'x'.repeat(MAX_FILE_BYTES + 10);
    const { files, dropped } = normalizeCodeFiles([{ path: 'big.js', content: big }]);
    expect(files.length).toBe(0);
    expect(dropped).toBe(1);
  });
});

describe('pickFallbackTemplate', () => {
  test('tauri vs vite', () => {
    expect(pickFallbackTemplate('Buat aplikasi desktop Tauri + Rust + SQLite')).toBe('tauri-sqlite-starter');
    expect(pickFallbackTemplate('Landing page vite vanilla')).toBe('vite-vanilla-starter');
  });
});

describe('withGuaranteedReadme', () => {
  test('menambah README bila tidak ada', () => {
    const out = withGuaranteedReadme([{ path: 'index.html', content: '<h1>x</h1>', bytes: 13, warn: false, ok: true }], { title: 'X' }, []);
    expect(out[0].path).toBe('README.md');
    expect(out.length).toBe(2);
  });
  test('tidak dobel bila sudah ada', () => {
    const out = withGuaranteedReadme([{ path: 'README.md', content: '# x', bytes: 3, warn: false, ok: true }], { title: 'X' }, []);
    expect(out.length).toBe(1);
  });
});
```

- [ ] **2b.** `bun test` → GAGAL (module belum ada). OK.
- [ ] **2c. Implementasi** `src/artifacts/code.js`:

```js
// ============================================================
// code.js — Sanitasi & normalisasi file kode proyek (murni)
// ============================================================

export const MAX_CODE_FILES = 14;
export const MAX_FILE_BYTES = 24 * 1024;
export const MAX_TOTAL_BYTES = 160 * 1024;
const MAX_SEGMENTS = 4;
const SKIP_DIRS = new Set(['node_modules', 'target', 'dist', '.git']);
const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;
const ALLOWED_EXT = new Set([
  '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.html', '.css', '.json',
  '.md', '.rs', '.toml', '.yaml', '.yml', '.sql', '.txt', '.example',
]);
const ALLOWED_BASENAME = new Set(['.gitignore', '.env.example']);

export function sanitizeRelPath(raw) {
  const norm = String(raw || '').replaceAll('\\', '/').trim();
  if (!norm || norm.startsWith('/') || /^[a-zA-Z]:/.test(norm)) return null;
  const out = [];
  for (const segRaw of norm.split('/')) {
    const seg = segRaw.trim();
    if (!seg || seg === '.') continue;
    if (seg === '..') return null;
    if (SKIP_DIRS.has(seg.toLowerCase())) return null;
    const cleaned = seg.replace(/[<>:"|?*]/g, '').replace(/[. ]+$/g, '');
    if (!cleaned) return null;
    out.push(RESERVED.test(cleaned) ? `proj-${cleaned}` : cleaned);
  }
  if (!out.length || out.length > MAX_SEGMENTS) return null;
  return out.join('/');
}

function isAllowedPath(path) {
  const base = path.split('/').pop().toLowerCase();
  if (ALLOWED_BASENAME.has(base)) return true;
  const dot = base.lastIndexOf('.');
  if (dot <= 0) return false;
  return ALLOWED_EXT.has(base.slice(dot));
}

function isValidJson(text) {
  try { JSON.parse(text); return true; } catch { return false; }
}

export function normalizeCodeFiles(rawFiles) {
  const files = [];
  const seen = new Set();
  let totalBytes = 0;
  let dropped = 0;
  for (const raw of Array.isArray(rawFiles) ? rawFiles : []) {
    const path = sanitizeRelPath(raw?.path);
    const content = typeof raw?.content === 'string' ? raw.content : '';
    if (!path || !content.trim()) { dropped += 1; continue; }
    const key = path.toLowerCase();
    if (seen.has(key) || !isAllowedPath(path)) { dropped += 1; continue; }
    const bytes = new TextEncoder().encode(content).length;
    if (bytes > MAX_FILE_BYTES || totalBytes + bytes > MAX_TOTAL_BYTES || files.length >= MAX_CODE_FILES) {
      dropped += 1;
      continue;
    }
    seen.add(key);
    totalBytes += bytes;
    const warn = key.endsWith('.json') && !isValidJson(content);
    files.push({ path, content, bytes, warn, ok: !warn });
  }
  return { files, dropped, totalBytes };
}

export function pickFallbackTemplate(brief) {
  const t = String(brief || '').toLowerCase();
  return /(tauri|rust|desktop|aplikasi desktop|\bexe\b|sqlite)/.test(t)
    ? 'tauri-sqlite-starter'
    : 'vite-vanilla-starter';
}

export function withGuaranteedReadme(files, project, run = []) {
  if (files.some((f) => f.path.toLowerCase().endsWith('readme.md'))) return files;
  const steps = run.length
    ? run.map((cmd, i) => `${i + 1}. \`${cmd}\``)
    : ['1. Buka `index.html` di browser.'];
  const content = [
    `# ${project.title}`,
    '',
    'Proyek ini dihasilkan oleh Divisi IT PT Pixel Sinergi Nusantara Tbk untuk Bapak Direktur.',
    '',
    '## Cara menjalankan',
    ...steps,
    '',
    '> Catatan: kode belum melalui QA otomatis. Review dulu sebelum dipakai.',
    '',
  ].join('\n');
  return [{ path: 'README.md', content, bytes: new TextEncoder().encode(content).length, warn: false, ok: true }, ...files];
}
```

- [ ] **2d. Implementasi** `src/artifacts/templates.js` (hindari backtick & `${` di dalam string konten):

```js
// ============================================================
// templates.js — Scaffold fallback valid (dipakai saat offline/gagal)
// ============================================================

const VITE_MAIN = [
  "const app = document.getElementById('app');",
  "let count = 0;",
  "const btn = document.createElement('button');",
  "btn.textContent = 'Klik saya (0)';",
  "btn.addEventListener('click', () => {",
  "  count += 1;",
  "  btn.textContent = 'Klik saya (' + count + ')';",
  "});",
  "app.appendChild(btn);",
  '',
].join('\n');

const VITE_HTML = [
  '<!doctype html>',
  '<html lang="id">',
  '  <head>',
  '    <meta charset="UTF-8" />',
  '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
  '    <title>Proyek Pixel</title>',
  '    <link rel="stylesheet" href="/src/style.css" />',
  '  </head>',
  '  <body>',
  '    <h1>Proyek Pixel Sinergi</h1>',
  '    <div id="app"></div>',
  '    <script type="module" src="/src/main.js"></script>',
  '  </body>',
  '</html>',
  '',
].join('\n');

const VITE_STYLE = 'body { font-family: system-ui, sans-serif; margin: 2rem; background: #14151f; color: #f2f4ff; }\nbutton { padding: 8px 14px; }\n';

const VITE_PKG = JSON.stringify({
  name: 'proyek-pixel',
  private: true,
  version: '0.1.0',
  type: 'module',
  scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
  devDependencies: { vite: '^5.0.0' },
}, null, 2) + '\n';

const VITE_CONFIG = [
  "import { defineConfig } from 'vite';",
  '',
  'export default defineConfig({',
  '  server: { port: 1420, strictPort: true },',
  '});',
  '',
].join('\n');

const VITE_RUN = ['bun install', 'bun run dev'];

// ---------------- Tauri + SQLite starter ----------------

const TAURI_MAIN = [
  "import { invoke } from '@tauri-apps/api/core';",
  '',
  "const listEl = document.getElementById('list');",
  "const inputEl = document.getElementById('note');",
  '',
  'async function refresh() {',
  "  const notes = await invoke('list_notes');",
  "  listEl.innerHTML = '';",
  '  for (const n of notes) {',
  "    const li = document.createElement('li');",
  '    li.textContent = n;',
  '    listEl.appendChild(li);',
  '  }',
  '}',
  '',
  "document.getElementById('add').addEventListener('click', async () => {",
  '  const text = inputEl.value.trim();',
  '  if (!text) return;',
  "  await invoke('add_note', { text });",
  "  inputEl.value = '';",
  '  refresh();',
  '});',
  '',
  'refresh();',
  '',
].join('\n');

const TAURI_HTML = [
  '<!doctype html>',
  '<html lang="id">',
  '  <head>',
  '    <meta charset="UTF-8" />',
  '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
  '    <title>Catatan Pixel</title>',
  '    <link rel="stylesheet" href="/src/style.css" />',
  '  </head>',
  '  <body>',
  '    <h1>Catatan Pixel</h1>',
  '    <input id="note" placeholder="Tulis catatan..." />',
  '    <button id="add">Tambah</button>',
  '    <ul id="list"></ul>',
  '    <script type="module" src="/src/main.js"></script>',
  '  </body>',
  '</html>',
  '',
].join('\n');

const TAURI_PKG = JSON.stringify({
  name: 'catatan-pixel',
  private: true,
  version: '0.1.0',
  type: 'module',
  scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview', tauri: 'tauri' },
  dependencies: { '@tauri-apps/api': '^2.0.0' },
  devDependencies: { '@tauri-apps/cli': '^2.0.0', vite: '^5.0.0' },
}, null, 2) + '\n';

const TAURI_CONFIG = JSON.stringify({
  $schema: 'https://schema.tauri.app/config/2',
  productName: 'Catatan Pixel',
  version: '0.1.0',
  identifier: 'com.pixelsinergi.catatan',
  build: {
    frontendDist: '../dist',
    devUrl: 'http://localhost:1420',
    beforeDevCommand: 'bun run dev',
    beforeBuildCommand: 'bun run build',
  },
  app: {
    windows: [{ title: 'Catatan Pixel', width: 900, height: 640 }],
    security: { csp: null },
  },
}, null, 2) + '\n';

const TAURI_CARGO = [
  '[package]',
  'name = "catatan-pixel"',
  'version = "0.1.0"',
  'edition = "2021"',
  '',
  '[build-dependencies]',
  'tauri-build = { version = "2", features = [] }',
  '',
  '[dependencies]',
  'tauri = { version = "2", features = [] }',
  'serde = { version = "1", features = ["derive"] }',
  'serde_json = "1"',
  'rusqlite = { version = "0.31", features = ["bundled"] }',
  '',
].join('\n');

const TAURI_BUILD_RS = 'fn main() {\n    tauri_build::build()\n}\n';

const TAURI_MAIN_RS = [
  'use std::sync::Mutex;',
  'use rusqlite::Connection;',
  'use tauri::Manager;',
  '',
  'struct Db(Mutex<Connection>);',
  '',
  '#[tauri::command]',
  'fn list_notes(db: tauri::State<Db>) -> Result<Vec<String>, String> {',
  '    let conn = db.0.lock().map_err(|e| e.to_string())?;',
  '    let mut stmt = conn.prepare("SELECT text FROM notes ORDER BY id DESC").map_err(|e| e.to_string())?;',
  '    let rows = stmt.query_map([], |row| row.get::<_, String>(0)).map_err(|e| e.to_string())?;',
  '    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())',
  '}',
  '',
  '#[tauri::command]',
  'fn add_note(db: tauri::State<Db>, text: String) -> Result<(), String> {',
  '    let conn = db.0.lock().map_err(|e| e.to_string())?;',
  '    conn.execute("INSERT INTO notes (text) VALUES (?1)", [text]).map_err(|e| e.to_string())?;',
  '    Ok(())',
  '}',
  '',
  'fn main() {',
  '    tauri::Builder::default()',
  '        .setup(|app| {',
  '            let dir = app.path().app_data_dir()?;',
  '            std::fs::create_dir_all(&dir)?;',
  '            let conn = Connection::open(dir.join("notes.db"))?;',
  '            conn.execute("CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT NOT NULL)", [])?;',
  '            app.manage(Db(Mutex::new(conn)));',
  '            Ok(())',
  '        })',
  '        .invoke_handler(tauri::generate_handler![list_notes, add_note])',
  '        .run(tauri::generate_context!())',
  '        .expect("error menjalankan aplikasi");',
  '}',
  '',
].join('\n');

const GITIGNORE = 'node_modules/\ndist/\nsrc-tauri/target/\n';

export const TEMPLATES = {
  'vite-vanilla-starter': {
    run: VITE_RUN,
    files: [
      { path: 'package.json', content: VITE_PKG },
      { path: 'index.html', content: VITE_HTML },
      { path: 'vite.config.js', content: VITE_CONFIG },
      { path: 'src/main.js', content: VITE_MAIN },
      { path: 'src/style.css', content: VITE_STYLE },
    ],
  },
  'tauri-sqlite-starter': {
    run: ['bun install', 'bun run tauri dev'],
    files: [
      { path: 'package.json', content: TAURI_PKG },
      { path: 'index.html', content: TAURI_HTML },
      { path: 'vite.config.js', content: VITE_CONFIG },
      { path: 'src/main.js', content: TAURI_MAIN },
      { path: 'src/style.css', content: VITE_STYLE },
      { path: 'src-tauri/Cargo.toml', content: TAURI_CARGO },
      { path: 'src-tauri/build.rs', content: TAURI_BUILD_RS },
      { path: 'src-tauri/src/main.rs', content: TAURI_MAIN_RS },
      { path: 'src-tauri/tauri.conf.json', content: TAURI_CONFIG },
      { path: '.gitignore', content: GITIGNORE },
    ],
  },
};
```

Catatan: scaffold memakai pola import `@tauri-apps/api/core` (Tauri 2) — Vite yang membundel. Komentar JS tidak pakai backtick agar aman di template literal.

- [ ] **2e.** `bun test` → hijau. `bun run build` → hijau.
- [ ] **2f. Commit:** `feat(artifacts): normalisasi kode + scaffold fallback`

---

## Task 3 — `src/artifacts/poster.js`

Tidak ada unit test (butuh canvas). Verifikasi: build hijau + cek visual di Task 6 E2E.

- [ ] **3a. Implementasi** `src/artifacts/poster.js`:

```js
// ============================================================
// poster.js — Render poster & ikon paket proyek (canvas → PNG dataURL)
// ============================================================

import { DIVISIONS } from '../world/office.js';

const DIVISION_ORDER = ['it', 'marketing', 'finance', 'hrd', 'ga'];

function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext('2d') };
}

function wrapLines(ctx, text, maxWidth, maxLines) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) break;
    } else {
      line = test;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawPixelGrid(ctx, w, h) {
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#ffffff';
  for (let y = 20; y < h; y += 40) {
    for (let x = 20; x < w; x += 40) {
      if ((x / 40 + y / 40) % 2 === 0) ctx.fillRect(x, y, 6, 6);
    }
  }
  ctx.restore();
}

export function renderPoster(project) {
  const W = 1080;
  const H = 1080;
  const { canvas, ctx } = makeCanvas(W, H);
  const poster = project.content?.poster || {};

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#101828');
  bg.addColorStop(0.6, '#141b2e');
  bg.addColorStop(1, '#231436');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  drawPixelGrid(ctx, W, H);

  ctx.strokeStyle = '#ffc857';
  ctx.lineWidth = 6;
  ctx.strokeRect(28, 28, W - 56, H - 56);

  ctx.fillStyle = '#ffc857';
  ctx.fillRect(34, 34, W - 68, 72);
  ctx.fillStyle = '#14151f';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 30px "Courier New", monospace';
  ctx.fillText('PT PIXEL SINERGI NUSANTARA Tbk', 54, 71);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 84px "Courier New", monospace';
  const headLines = wrapLines(ctx, poster.headline || project.title, W - 160, 3);
  let y = 300;
  for (const line of headLines) {
    ctx.fillText(line, W / 2, y);
    y += 104;
  }

  ctx.fillStyle = '#9fb0d8';
  ctx.font = '36px "Courier New", monospace';
  const tagLines = wrapLines(ctx, poster.tagline || '', W - 220, 2);
  y += 24;
  for (const line of tagLines) {
    ctx.fillText(line, W / 2, y);
    y += 50;
  }

  const chipW = 168;
  const chipGap = 18;
  const totalW = DIVISION_ORDER.length * chipW + (DIVISION_ORDER.length - 1) * chipGap;
  let cx = (W - totalW) / 2;
  const chipY = H - 320;
  for (const division of DIVISION_ORDER) {
    ctx.fillStyle = DIVISIONS[division]?.color || '#ffc857';
    ctx.fillRect(cx, chipY, chipW, 56);
    ctx.fillStyle = '#14151f';
    ctx.font = 'bold 22px "Courier New", monospace';
    ctx.fillText(DIVISIONS[division]?.short || division, cx + chipW / 2, chipY + 30);
    cx += chipW + chipGap;
  }

  ctx.fillStyle = '#ffc857';
  ctx.font = 'bold 42px "Courier New", monospace';
  ctx.fillText(`HARI ${project.day ?? 1} — DIKERJAKAN SELURUH DIVISI`, W / 2, H - 180);

  ctx.fillStyle = '#8fa0c8';
  ctx.font = '30px "Courier New", monospace';
  ctx.fillText((poster.hashtags || []).join('   '), W / 2, H - 110);

  return { dataUrl: canvas.toDataURL('image/png'), width: W, height: H };
}

export function renderAppIcon(project) {
  const S = 512;
  const { canvas, ctx } = makeCanvas(S, S);

  const bg = ctx.createLinearGradient(0, 0, S, S);
  bg.addColorStop(0, '#1a2138');
  bg.addColorStop(1, '#2a1a40');
  ctx.fillStyle = bg;
  roundRectPath(ctx, 0, 0, S, S, 96);
  ctx.fill();

  ctx.strokeStyle = '#ffc857';
  ctx.lineWidth = 14;
  roundRectPath(ctx, 26, 26, S - 52, S - 52, 72);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffc857';
  ctx.font = 'bold 150px "Courier New", monospace';
  ctx.fillText('PSN', S / 2, S / 2 - 46);

  ctx.fillStyle = '#9fb0d8';
  ctx.font = 'bold 40px "Courier New", monospace';
  const label = String(project.content?.poster?.headline || project.title || 'Proyek').slice(0, 14);
  ctx.fillText(label, S / 2, S / 2 + 110);

  return { dataUrl: canvas.toDataURL('image/png'), width: S, height: S };
}
```

- [ ] **3b.** `bun run build` → hijau.
- [ ] **3c. Commit:** `feat(artifacts): render poster & ikon proyek`

---

## Task 4 — Prompt & parser proyek (`src/llm/prompts.js`) + bank fallback (`src/llm/fallback.js`)

- [ ] **4a. Tulis test dulu** — buat `tests/llm-project.test.js`:

```js
import { describe, expect, test } from 'bun:test';
import { parseProjectContent, parseProjectCode } from '../src/llm/prompts.js';
import { projectContentFallback } from '../src/llm/fallback.js';

describe('parseProjectContent', () => {
  test('json di dalam fenced block', () => {
    const raw = 'Ini hasilnya:\n```json\n{"sections":[{"division":"it","title":"T","text":"X"}],"caption":"hai"}\n```\nSemoga membantu!';
    const data = parseProjectContent(raw);
    expect(data.sections[0].division).toBe('it');
    expect(data.caption).toBe('hai');
  });
  test('teks sampah → null', () => {
    expect(parseProjectContent('maaf saya tidak bisa')).toBeNull();
  });
});

describe('parseProjectCode', () => {
  test('ambil files & run', () => {
    const raw = '{"stack":"tauri","run":["bun install"],"files":[{"path":"package.json","content":"{}"}]}';
    const data = parseProjectCode(raw);
    expect(data.files.length).toBe(1);
    expect(data.run[0]).toBe('bun install');
  });
  test('tanpa files → null', () => {
    expect(parseProjectCode('{"stack":"x"}')).toBeNull();
    expect(parseProjectCode('bukan json')).toBeNull();
  });
});

describe('projectContentFallback', () => {
  test('lengkap 5 divisi', () => {
    const c = projectContentFallback({ title: 'Uji Coba Proyek' });
    expect(c.sections.map((s) => s.division)).toEqual(['it', 'marketing', 'finance', 'hrd', 'ga']);
    expect(c.budget.length).toBeGreaterThanOrEqual(3);
    expect(c.ga.length).toBeGreaterThanOrEqual(3);
    expect(c.memo.subject).toContain('Uji Coba Proyek');
    expect(c.poster.hashtags[0].startsWith('#')).toBe(true);
  });
});
```

- [ ] **4b.** `bun test` → GAGAL (belum ada). OK.
- [ ] **4c. Edit `src/llm/prompts.js`:**
  - Baris 1-6 area import: tambahkan `import { AGENT_DEFS } from '../agents/roster.js';` setelah `import { formatGameTime } from '../core/utils.js';`.
  - **Tambahkan di AKHIR file** (setelah `matchSpeaker`):

```js
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
```

- [ ] **4d. Edit `src/llm/fallback.js`** — tambahkan di AKHIR file (pastikan `choice` sudah di-import di file ini; kalau belum, tambahkan ke import dari `../core/utils.js`):

```js
// ============================================================
// Proyek: bank fallback konten paket
// ============================================================

const PROJECT_SECTION_VARIANTS = {
  it: [
    { title: 'Rencana Teknis & Stack', text: 'Kami pakai stack yang paling cepat jadi tapi tetap keren: Vite untuk bundling, runtime ringan, dan SQLite untuk data lokal. Arsitektur dipisah rapi supaya tidak jadi utang teknis di minggu pertama. Kalau ada revisi, tinggal tambah sprint kecil.' },
    { title: 'Implementasi & Struktur Kode', text: 'Struktur folder sudah disiapkan: modul utama, data, dan UI dipisah. CRUD standar jalan dulu, fitur keren menyusul sprint 2. Baca README untuk cara menjalankan, lalu kabari kami kalau ada error.' },
  ],
  marketing: [
    { title: 'Kampanye & Poster', text: 'Poster utama sudah digarap dengan warna korporat yang berani. Headline-nya singkat, biar jempol Direktur tidak capek membaca. Caption siap tempel ke semua platform, tinggal pasang di jam prime time.' },
    { title: 'Rencana Promosi', text: 'Kami siapkan poster, caption, dan hashtag biar proyek ini viral minimal di grup keluarga. Call to action-nya jelas: coba, pakai, lalu pamer ke teman kantor. Konten video menyusul di fase berikutnya.' },
  ],
  finance: [
    { title: 'Anggaran', text: 'Estimasi biaya disusun konservatif dengan margin keamanan gaya kantor. Semua item masuk akal, kecuali item "kopi tim", yang tetap kami pertahankan demi moral. Detail per baris ada di anggaran.csv.' },
    { title: 'Realisasi & Kontrol Biaya', text: 'Anggaran kami rapikan, angka dibulatkan biar enak dibaca. Kalau ada tagihan tak terduga, mekanismenya sudah ada: ajukan, tunggu, ingat-ingat sendiri. Prioritaskan kebutuhan, bukan keinginan.' },
  ],
  hrd: [
    { title: 'Dukungan SDM', text: 'Tim yang terlibat sudah didata dan diberi semangat plus jadwal. Kami tekankan istirahat cukup, walau realitanya deadline tetap jalan. Memo resmi sudah terbit agar semuanya terdokumentasi rapi.' },
    { title: 'Tim & Kesejahteraan', text: 'Kami pastikan beban kerja dibagi rata, minimal di atas kertas. Ketrampilan tim dipetakan supaya penugasan tidak menumpuk di satu orang saja. Evaluasi ringan akan dilakukan setelah proyek selesai.' },
  ],
  ga: [
    { title: 'Logistik & Fasilitas', text: 'Peralatan, ruangan, dan kursi sudah dicek satu per satu. Stapler yang hilang sudah dicari tanpa hasil, laporannya ada di checklist. Semua kebutuhan sarana proyek tercatat rapi.' },
    { title: 'Operasional', text: 'GA memastikan listrik, meja, dan printer dalam kondisi siap perang. Kabel sudah dirapikan demi keselamatan. Bila ada kebutuhan mendadak, kirim pesan, jangan diam-diam meminjam kursi lantai lain.' },
  ],
};

export function projectContentFallback(project) {
  const title = String(project?.title || 'Proyek');
  const order = ['it', 'marketing', 'finance', 'hrd', 'ga'];
  const sections = order.map((division) => {
    const variant = choice(PROJECT_SECTION_VARIANTS[division]);
    return { division, title: variant.title, text: variant.text };
  });
  const headline = title.length <= 24 ? title : `${title.slice(0, 23).trim()}…`;
  return {
    sections,
    poster: {
      headline,
      tagline: 'Paket kerja lengkap, rapi, dan siap dipakai.',
      hashtags: ['#PixelSinergi', '#KerjaKerjaKerja', '#SiapPakai'],
    },
    caption: `Proyek "${title}" resmi dikerjakan seluruh divisi PT Pixel Sinergi Nusantara. Laporan, anggaran, sampai kodenya sudah kami siapkan. Tinggal dipakai, pak!`,
    budget: [
      { item: 'Konsumsi tim & rapat koordinasi', qty: 3, unit: 'hari', price: 250000, note: 'termasuk kopi' },
      { item: 'Perangkat kerja tambahan', qty: 2, unit: 'unit', price: 750000, note: 'mouse bekas masih layak' },
      { item: 'Cetak & material poster', qty: 1, unit: 'paket', price: 300000, note: 'warna, jangan hitam putih' },
      { item: 'Langganan tools pendukung', qty: 2, unit: 'bulan', price: 150000, note: 'diskon tim' },
      { item: 'Dana darurat revisi', qty: 1, unit: 'paket', price: 400000, note: 'biasanya kepakai' },
    ],
    ga: [
      { category: 'Ruang', item: 'Ruang kerja tim proyek', qty: 1, owner: 'Joko', status: 'siap' },
      { category: 'Peralatan', item: 'Laptop & perangkat pendukung', qty: 3, owner: 'Joko', status: 'siap' },
      { category: 'Jaringan', item: 'Akses WiFi prioritas', qty: 1, owner: 'Bayu', status: 'proses' },
      { category: 'Konsumsi', item: 'Stok kopi & camilan', qty: 5, owner: 'Joko', status: 'siap' },
    ],
    memo: {
      subject: `Dukungan SDM untuk proyek "${title}"`,
      body: 'Sehubungan dengan tugas proyek dari Bapak Direktur, seluruh karyawan diharapkan mendukung penuh pelaksanaannya sesuai peran divisi masing-masing. Beban kerja diatur agar tetap manusiawi. Kerja sama dan komunikasi yang baik adalah kunci.',
      closing: 'Demikian disampaikan. Salam hangat, tetap semangat, dan jangan lupa istirahat.',
    },
  };
}
```

- [ ] **4e.** `bun test` → hijau semua (file test lama + baru). `bun run build` → hijau.
- [ ] **4f. Commit:** `feat(llm): prompt/parser proyek + bank fallback`

---

## Task 5 — Rust: `save_project_package` + `open_path`

- [ ] **5a. `src-tauri/Cargo.toml`** — tambah setelah baris `reqwest = ...`:
  ```toml
  base64 = "0.22"
  ```
- [ ] **5b. Edit `src-tauri/src/lib.rs`:**
  - Tambah import di atas (dekat `use serde_json::{json, Value};`):
    ```rust
    use base64::Engine as _;
    use serde::Serialize;
    ```
  - Tambah blok kode berikut **sebelum** `#[cfg_attr(mobile, tauri::mobile_entry_point)] pub fn run()` (setelah fungsi `load_config`):

```rust
// ============================================================
// Proyek: simpan paket deliverable & buka folder
// ============================================================

const WIN_RESERVED: [&str; 22] = [
    "CON", "PRN", "AUX", "NUL",
    "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
    "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
];

fn is_reserved_name(name: &str) -> bool {
    let head = name.split('.').next().unwrap_or("").to_ascii_uppercase();
    WIN_RESERVED.contains(&head.as_str())
}

fn sanitize_segment(seg: &str) -> String {
    let filtered: String = seg
        .chars()
        .filter(|c| c.is_alphanumeric() || "-_.() ".contains(*c))
        .collect();
    filtered.trim().trim_end_matches('.').trim().to_string()
}

fn sanitize_dir_name(raw: &str) -> String {
    let mut out = String::new();
    for ch in raw.chars() {
        if ch == '/' || ch == '\\' {
            out.push('-');
        } else if ch.is_alphanumeric() || "-_.() ".contains(ch) {
            out.push(ch);
        }
    }
    let collapsed = out.split_whitespace().collect::<Vec<_>>().join(" ");
    let mut name: String = collapsed.chars().take(80).collect();
    while name.ends_with('.') || name.ends_with(' ') {
        name.pop();
    }
    if name.is_empty() {
        name = "proyek".to_string();
    } else if is_reserved_name(&name) {
        name = format!("proyek-{}", name);
    }
    name
}

fn sanitize_rel_path(raw: &str) -> Option<String> {
    let normalized = raw.replace('\\', "/");
    let trimmed = normalized.trim();
    if trimmed.is_empty() || trimmed.starts_with('/') || trimmed.contains(':') {
        return None;
    }
    let mut parts: Vec<String> = Vec::new();
    for seg in trimmed.split('/') {
        let seg = seg.trim();
        if seg.is_empty() || seg == "." {
            continue;
        }
        if seg == ".." {
            return None;
        }
        let mut cleaned = sanitize_segment(seg);
        if cleaned.is_empty() {
            return None;
        }
        if is_reserved_name(&cleaned) {
            cleaned = format!("proj-{}", cleaned);
        }
        parts.push(cleaned);
    }
    if parts.is_empty() || parts.len() > 4 {
        return None;
    }
    Some(parts.join("/"))
}

#[derive(serde::Deserialize)]
struct PackageFile {
    rel_path: String,
    content: String,
    #[serde(default)]
    is_base64: bool,
}

#[derive(Serialize)]
struct SaveResult {
    folder: String,
    saved: Vec<String>,
    failed: Vec<String>,
}

#[tauri::command(rename_all = "snake_case")]
fn save_project_package(
    app: tauri::AppHandle,
    dir_name: String,
    files: Vec<PackageFile>,
) -> Result<SaveResult, String> {
    if files.is_empty() {
        return Err("Paket kosong, tidak ada file untuk disimpan.".to_string());
    }

    let documents = app
        .path()
        .document_dir()
        .map_err(|e| format!("Gagal menemukan folder Documents: {e}"))?;
    let root = documents.join("PixelSinergi");
    std::fs::create_dir_all(&root).map_err(|e| format!("Gagal membuat folder PixelSinergi: {e}"))?;

    let clean = sanitize_dir_name(&dir_name);
    let mut folder = root.join(&clean);
    if folder.exists() {
        for n in 2..=99 {
            let candidate = root.join(format!("{}-{}", clean, n));
            if !candidate.exists() {
                folder = candidate;
                break;
            }
        }
    }
    std::fs::create_dir_all(&folder).map_err(|e| format!("Gagal membuat folder proyek: {e}"))?;

    let mut saved: Vec<String> = Vec::new();
    let mut failed: Vec<String> = Vec::new();

    for file in files {
        let rel = match sanitize_rel_path(&file.rel_path) {
            Some(rel) => rel,
            None => {
                failed.push(file.rel_path);
                continue;
            }
        };
        let target = folder.join(&rel);
        if let Some(parent) = target.parent() {
            if std::fs::create_dir_all(parent).is_err() {
                failed.push(file.rel_path);
                continue;
            }
        }
        let bytes: Vec<u8> = if file.is_base64 {
            match base64::engine::general_purpose::STANDARD.decode(file.content.trim()) {
                Ok(bytes) => bytes,
                Err(_) => {
                    failed.push(file.rel_path);
                    continue;
                }
            }
        } else {
            file.content.into_bytes()
        };
        match std::fs::write(&target, bytes) {
            Ok(_) => saved.push(file.rel_path),
            Err(_) => failed.push(file.rel_path),
        }
    }

    Ok(SaveResult {
        folder: folder.to_string_lossy().to_string(),
        saved,
        failed,
    })
}

#[tauri::command]
fn open_path(path: String) -> Result<(), String> {
    let target = PathBuf::from(&path);
    if !target.exists() {
        return Err("Folder belum ada di disk.".to_string());
    }

    #[cfg(target_os = "windows")]
    let mut command = std::process::Command::new("explorer");
    #[cfg(target_os = "macos")]
    let mut command = std::process::Command::new("open");
    #[cfg(all(unix, not(target_os = "macos")))]
    let mut command = std::process::Command::new("xdg-open");

    command
        .arg(&path)
        .spawn()
        .map_err(|e| format!("Gagal membuka folder: {e}"))?;
    Ok(())
}

#[cfg(test)]
mod project_tests {
    use super::*;

    #[test]
    fn dir_name_bersih() {
        assert_eq!(sanitize_dir_name("  "), "proyek");
        assert!(!sanitize_dir_name("a/b\\c").contains('/'));
        assert!(!sanitize_dir_name("a\\b:d*e").contains(':'));
        assert_eq!(sanitize_dir_name("CON"), "proyek-CON");
    }

    #[test]
    fn rel_path_aman() {
        assert_eq!(sanitize_rel_path("../x.txt"), None);
        assert_eq!(sanitize_rel_path("/abs/x.txt"), None);
        assert_eq!(sanitize_rel_path("C:/Windows/x.txt"), None);
        assert_eq!(sanitize_rel_path("a/b/c/d/e.js"), None);
        assert_eq!(
            sanitize_rel_path(r"src-tauri\src\main.rs"),
            Some("src-tauri/src/main.rs".to_string())
        );
        assert_eq!(sanitize_rel_path("CON.txt"), Some("proj-CON.txt".to_string()));
    }
}
```

  - Edit `invoke_handler` jadi:
    ```rust
        .invoke_handler(tauri::generate_handler![
            ping,
            llm_chat,
            save_config,
            load_config,
            save_project_package,
            open_path
        ])
    ```
  - Update komentar header file (baris 1-6) supaya menyebut dua command baru (opsional tapi rapi).

- [ ] **5c.** Dari `src-tauri/`: `cargo test` → 2 test hijau; lalu `cargo check` → hijau.
- [ ] **5d. Commit:** `feat(tauri): command save_project_package & open_path`

---

## Task 6 — `src/agents/projects.js` (jalur offline dulu) + wiring `main.js` + channel feed

> Sengaja dua tahap: Task 6 = struktur + fallback/template (tanpa LLM) supaya bisa diverifikasi penuh offline; Task 7 menyambungkan LLM.

- [ ] **6a. Implementasi** `src/agents/projects.js`:

```js
// ============================================================
// projects.js — Tugas Proyek: brief Direktur → paket deliverable nyata
// Alur: start → update (progres menit kantor) → complete (konten + kode)
//       → render poster → simpan paket ke disk → arsip + modal.
// ============================================================

import { bus } from '../core/bus.js';
import { uid, formatGameTime } from '../core/utils.js';
import { isTauri, getInvoke } from '../core/config.js';
import { buildProjectContentPrompt, buildProjectCodePrompt, parseProjectContent, parseProjectCode } from '../llm/prompts.js';
import { projectContentFallback } from '../llm/fallback.js';
import {
  slugifyTitle, buildReportMd, buildCaptionTxt, buildBudgetCsv, buildMemoMd, buildGaChecklistCsv,
} from '../artifacts/files.js';
import { normalizeCodeFiles, pickFallbackTemplate, withGuaranteedReadme } from '../artifacts/code.js';
import { TEMPLATES } from '../artifacts/templates.js';
import { renderPoster, renderAppIcon } from '../artifacts/poster.js';
import { DIVISIONS } from '../world/office.js';

export const DIVISION_ORDER = ['it', 'marketing', 'finance', 'hrd', 'ga'];
const MILESTONE_PCT = { it: 20, marketing: 36, finance: 52, hrd: 68, ga: 84 };
const DURATION_MIN_RANGE = [20, 40];
const SOURCE_LABEL = { llm: 'LLM', mixed: 'LLM + Template', template: 'Template offline' };

const dateStamp = () => new Date().toISOString().slice(0, 10);
const stripDataUrl = (s) => String(s || '').split(',')[1] || '';
const textBytes = (s) => new TextEncoder().encode(s).length;

function downloadBlob(name, content, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = String(name).split('/').pop() || 'file.txt';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function downloadBase64(name, base64, mime = 'image/png') {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  downloadBlob(name, bytes, mime);
}

/**
 * Gabungkan hasil parsial LLM dengan bank fallback. Murni — ada unit test.
 * @returns {{ value: object, source: 'llm'|'mixed'|'template' }}
 */
export function mergeProjectContent(parsed, fallback) {
  const value = JSON.parse(JSON.stringify(fallback));
  const clean = (s, max) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
  let parts = 0;

  if (parsed && Array.isArray(parsed.sections)) {
    let ok = 0;
    for (const item of parsed.sections) {
      const division = DIVISION_ORDER.find((d) => d === item?.division);
      if (!division) continue;
      const text = clean(item.text, 350);
      if (!text) continue;
      const title = clean(item.title, 60)
        || value.sections.find((s) => s.division === division)?.title
        || DIVISIONS[division]?.name
        || division;
      value.sections = value.sections.map((s) => (s.division === division ? { division, title, text } : s));
      ok += 1;
    }
    if (ok >= 3) parts += 1;
  }

  if (parsed?.poster && clean(parsed.poster.headline, 24)) {
    value.poster.headline = clean(parsed.poster.headline, 24);
    const tagline = clean(parsed.poster.tagline, 60);
    if (tagline) value.poster.tagline = tagline;
    const tags = (Array.isArray(parsed.poster.hashtags) ? parsed.poster.hashtags : [])
      .map((t) => clean(t, 24))
      .filter(Boolean)
      .map((t) => (t.startsWith('#') ? t : `#${t}`))
      .slice(0, 3);
    if (tags.length) value.poster.hashtags = tags;
    parts += 1;
  }

  if (clean(parsed?.caption, 240)) {
    value.caption = clean(parsed.caption, 240);
    parts += 1;
  }

  const budget = Array.isArray(parsed?.budget)
    ? parsed.budget.slice(0, 8).map((r) => ({
      item: clean(r?.item, 80) || 'Item',
      qty: Math.max(1, Math.round(Number(r?.qty) || 1)),
      unit: clean(r?.unit, 16) || 'pcs',
      price: Math.max(0, Math.round(Number(r?.price) || 0)),
      note: clean(r?.note, 80),
    }))
    : [];
  if (budget.length >= 3) {
    value.budget = budget;
    parts += 1;
  }

  const ga = Array.isArray(parsed?.ga)
    ? parsed.ga.slice(0, 8).map((r) => ({
      category: clean(r?.category, 40) || 'Umum',
      item: clean(r?.item, 80) || 'Item',
      qty: Math.max(1, Math.round(Number(r?.qty) || 1)),
      owner: clean(r?.owner, 40) || 'GA',
      status: clean(r?.status, 24) || 'proses',
    }))
    : [];
  if (ga.length >= 3) {
    value.ga = ga;
    parts += 1;
  }

  if (parsed?.memo && clean(parsed.memo.body, 400)) {
    value.memo = {
      subject: clean(parsed.memo.subject, 80) || value.memo.subject,
      body: clean(parsed.memo.body, 400),
      closing: clean(parsed.memo.closing, 120) || value.memo.closing,
    };
    parts += 1;
  }

  const source = parts === 0 ? 'template' : parts >= 6 ? 'llm' : 'mixed';
  return { value, source };
}

export class ProjectManager {
  constructor(sim) {
    this.sim = sim;
    this.active = null;
    this.archive = [];
  }

  get isActive() {
    return !!this.active;
  }

  /** Dipakai behavior & HUD: label fokus proyek. */
  get focusLabel() {
    return this.active ? `Fokus proyek: ${this.active.title}` : '';
  }

  /**
   * Mulai proyek dari brief. @returns {boolean} false bila ditolak.
   * (Teks konfirmasi/penolakan ditampilkan lewat toast/feed.)
   */
  start(brief) {
    const sim = this.sim;
    const title = String(brief || '').replace(/\s+/g, ' ').trim().slice(0, 160);
    if (title.length < 8) return false;
    if (this.isActive) {
      sim.toast(`📋 Masih ada proyek "${this.active.title}" yang dikerjakan, Pak.`, 'danger', 4200);
      return false;
    }

    const [lo, hi] = DURATION_MIN_RANGE;
    const durationMin = lo + Math.floor(Math.random() * (hi - lo + 1));
    const project = {
      id: uid('prj'),
      title,
      day: sim.clock.day,
      startedAtMin: sim.clock.timeMin,
      durationMin,
      elapsedMin: 0,
      milestones: Object.fromEntries(
        DIVISION_ORDER.map((d) => [d, { done: false, atPct: MILESTONE_PCT[d] }]),
      ),
      status: 'running',
      content: null,
      contentSource: null,
      code: null,
      source: null,
      posterDataUrl: null,
      iconDataUrl: null,
      files: [],
      textFiles: [],
      folderName: `${dateStamp()} - Hari ${sim.clock.day} - ${slugifyTitle(title)}`,
      folderPath: null,
      finishedAtMin: null,
      _late: false,
      _token: null,
      _statsCounted: false,
      _completing: false,
    };
    this.active = project;

    sim.feed.add({
      channel: 'proyek',
      text: `📋 PROYEK DIMULAI: "${title}" — target ${durationMin} menit kantor. Semua divisi turun tangan.`,
      meta: { project: true },
    });
    sim.sfx?.chime();
    sim.toast('📋 Proyek dimulai! Semua divisi sibuk (terlihat).', 'success', 5200);
    bus.emit('project:start', project);

    this.focusEveryone(project);
    return true;
  }

  focusEveryone(project) {
    const sim = this.sim;
    for (const agent of sim.agents) {
      if (agent.isStatic || agent.gone) continue;
      if (['chat', 'meeting', 'coffee'].includes(agent.activity?.type)) continue;
      sim.behavior?.goWork(agent, `Fokus proyek: ${project.title}`);
    }
  }

  releaseFocus() {
    const sim = this.sim;
    for (const agent of sim.agents) {
      if (agent.isStatic || agent.gone) continue;
      if (String(agent.activity?.label || '').startsWith('Fokus proyek')) {
        sim.behavior?.goWork(agent, 'Balik kerja (proyek selesai)');
      }
    }
  }

  /** Progres & tonggak divisi. @param {number} gameMinutes delta menit kantor. */
  update(gameMinutes) {
    const project = this.active;
    if (!project || project.status !== 'running' || project._completing) return;
    if (!(gameMinutes > 0)) return;

    project.elapsedMin += gameMinutes;
    const pct = Math.min(100, (project.elapsedMin / project.durationMin) * 100);

    for (const division of DIVISION_ORDER) {
      const milestone = project.milestones[division];
      if (!milestone.done && pct >= milestone.atPct) {
        milestone.done = true;
        this.sim.feed.add({
          channel: 'proyek',
          text: `✅ ${DIVISIONS[division]?.name || division}: bagian proyek selesai dikerjakan.`,
          meta: { project: true },
        });
      }
    }

    if (pct >= 100) {
      project._completing = true;
      void this.complete(project);
    }
  }

  /** Dipanggil `endDay()`: proyek belum kelar → dikejar deadline (template + disclaimer). */
  finalizeLate() {
    const project = this.active;
    if (!project || project.status !== 'running') return;
    project._token = Symbol('late'); // batalkan pipeline async yang sedang jalan
    project._completing = true;
    if (!project._statsCounted) {
      project._statsCounted = true;
      this.sim.stats.projects += 1;
      this.sim.stats.projectsToday.push(project.title);
    }
    void this.complete(project, { late: true });
  }

  async complete(project, { late = false } = {}) {
    const sim = this.sim;
    const myToken = Symbol('project-run');
    project._token = myToken;
    project._late = late;
    const alive = () => project._token === myToken;

    try {
      let content;
      let contentSource;
      if (late) {
        content = projectContentFallback(project);
        contentSource = 'template';
      } else {
        const result = await this.generateContent(project);
        if (!alive()) return;
        content = result.value;
        contentSource = result.source;
      }

      let code;
      if (late) {
        code = this.templateCode(project, 'dikejar deadline');
      } else {
        code = await this.generateCode(project);
        if (!alive()) return;
      }

      project.content = content;
      project.contentSource = contentSource;
      project.code = code;
      project.source = contentSource === 'llm' && !code.fallback
        ? 'llm'
        : contentSource === 'template' && code.fallback
          ? 'template'
          : 'mixed';

      try {
        project.posterDataUrl = renderPoster(project).dataUrl;
        project.iconDataUrl = renderAppIcon(project).dataUrl;
      } catch (err) {
        console.warn('[projects] render poster gagal:', err);
      }

      if (!alive()) return;

      project.finishedAtMin = sim.clock.timeMin;
      project.textFiles = this.buildTextFiles(project);
      this.buildManifest(project);

      await this.savePackage(project);
      if (!alive()) return;

      project.status = late ? 'late' : 'done';
      if (!project._statsCounted) {
        project._statsCounted = true;
        sim.stats.projects += 1;
        sim.stats.projectsToday.push(project.title);
      }

      sim.feed.add({
        channel: 'proyek',
        text: `✅ Proyek "${project.title}" selesai — paket tersimpan${project.folderPath ? ` di ${project.folderPath}` : ' (unduhan browser)'}.`,
        meta: { project: true },
      });
      sim.toast(
        project.folderPath
          ? `📦 Paket proyek tersimpan di ${project.folderPath}`
          : '📦 Paket proyek diunduh lewat browser (mode dev).',
        'success',
        7000,
      );
      sim.sfx?.chime();

      this.archive.unshift(project);
      this.active = null;
      bus.emit('project:done', project);
      this.releaseFocus();

      if (sim.modals && !sim.modals.current) sim.modals.openProject(project);
      else sim.toast('📄 Hasil proyek bisa dibuka di tombol "Lihat Hasil Proyek".', 'info', 5000);
    } catch (err) {
      console.error('[projects] gagal menyelesaikan proyek:', err);
      project._completing = false;
      sim.toast(`❌ Proyek gagal diselesaikan: ${err?.message || err}`, 'danger', 6000);
    }
  }

  /** Task 7 mengisi versi LLM; Task 6 selalu fallback. */
  async generateContent(project) {
    return { value: projectContentFallback(project), source: 'template' };
  }

  /** Task 7 mengisi versi LLM; Task 6 selalu template. */
  async generateCode(project) {
    return this.templateCode(project);
  }

  templateCode(project, reason = '') {
    const key = pickFallbackTemplate(project.title);
    const tpl = TEMPLATES[key];
    const files = withGuaranteedReadme(
      tpl.files.map((f) => ({ ...f, bytes: textBytes(f.content), warn: false, ok: true })),
      project,
      tpl.run,
    );
    return { stack: key, files, run: tpl.run, fallback: true, dropped: 0, reason };
  }

  filePathList(project) {
    return [
      'laporan.md', 'poster.png', 'ikon-app.png',
      'caption-sosmed.txt', 'anggaran.csv', 'memo-sdm.md', 'checklist-ga.csv',
      ...(project.code?.files || []).map((f) => `kode/${f.path}`),
    ];
  }

  buildTextFiles(project) {
    const content = project.content;
    const timeLabel = formatGameTime(project.finishedAtMin ?? this.sim.clock.timeMin);
    const sourceLabel = SOURCE_LABEL[project.source] || SOURCE_LABEL[project.contentSource] || '—';
    const fileList = this.filePathList(project);
    return [
      {
        relPath: 'laporan.md',
        content: buildReportMd(project, {
          timeLabel,
          late: !!project._late,
          sourceLabel,
          fileList,
        }),
      },
      { relPath: 'caption-sosmed.txt', content: buildCaptionTxt(content) },
      { relPath: 'anggaran.csv', content: buildBudgetCsv(content.budget) },
      { relPath: 'memo-sdm.md', content: buildMemoMd(project, content.memo, { timeLabel }) },
      { relPath: 'checklist-ga.csv', content: buildGaChecklistCsv(content.ga) },
    ];
  }

  buildManifest(project) {
    const files = [];
    for (const f of project.textFiles) {
      files.push({ relPath: f.relPath, kind: 'text', bytes: textBytes(f.content), status: 'pending', warn: false });
    }
    files.push({
      relPath: 'poster.png',
      kind: 'binary',
      bytes: Math.round(stripDataUrl(project.posterDataUrl).length * 0.75),
      status: 'pending',
      warn: !project.posterDataUrl,
    });
    files.push({
      relPath: 'ikon-app.png',
      kind: 'binary',
      bytes: Math.round(stripDataUrl(project.iconDataUrl).length * 0.75),
      status: 'pending',
      warn: !project.iconDataUrl,
    });
    for (const f of project.code.files) {
      files.push({
        relPath: `kode/${f.path}`,
        kind: 'text',
        bytes: f.bytes,
        status: 'pending',
        warn: !!f.warn,
      });
    }
    const order = this.filePathList(project);
    files.sort((a, b) => order.indexOf(a.relPath) - order.indexOf(b.relPath));
    project.files = files;
  }

  buildPackagePayload(project) {
    const payload = [];
    for (const f of project.textFiles) {
      payload.push({ rel_path: f.relPath, content: f.content, is_base64: false });
    }
    if (project.posterDataUrl) {
      payload.push({ rel_path: 'poster.png', content: stripDataUrl(project.posterDataUrl), is_base64: true });
    }
    if (project.iconDataUrl) {
      payload.push({ rel_path: 'ikon-app.png', content: stripDataUrl(project.iconDataUrl), is_base64: true });
    }
    for (const f of project.code.files) {
      payload.push({ rel_path: `kode/${f.path}`, content: f.content, is_base64: false });
    }
    return payload;
  }

  async savePackage(project) {
    const payload = this.buildPackagePayload(project);
    const included = new Set(payload.map((f) => f.rel_path));
    for (const m of project.files) {
      if (!included.has(m.relPath)) m.status = 'failed';
    }

    if (isTauri) {
      try {
        const invoke = await getInvoke();
        const result = await invoke('save_project_package', {
          dir_name: project.folderName,
          files: payload,
        });
        project.folderPath = result?.folder || null;
        const saved = new Set(result?.saved || []);
        const failed = new Set(result?.failed || []);
        for (const m of project.files) {
          if (m.status === 'failed') continue;
          m.status = failed.has(m.relPath) ? 'failed' : saved.has(m.relPath) ? 'saved' : 'failed';
        }
        const failCount = project.files.filter((f) => f.status === 'failed').length;
        if (failCount > 0) {
          this.sim.toast(`⚠️ ${failCount} file gagal disimpan. Cek daftar file.`, 'danger', 6000);
        }
      } catch (err) {
        for (const m of project.files) m.status = 'failed';
        this.sim.toast(`❌ Gagal menyimpan paket: ${err?.message || err}`, 'danger', 6000);
      }
    } else {
      for (const f of payload) {
        try {
          if (f.is_base64) downloadBase64(f.rel_path, f.content, 'image/png');
          else downloadBlob(f.rel_path, f.content, 'text/plain');
        } catch (err) {
          console.warn('[projects] unduh gagal:', f.rel_path, err);
        }
      }
      for (const m of project.files) {
        if (m.status !== 'failed') m.status = 'downloaded';
      }
      project.folderPath = null;
      this.sim.toast('📦 Mode browser: paket diunduh sebagai file terpisah.', 'info', 6000);
    }
  }

  async resave(project) {
    if (!project?.files?.length) {
      this.sim.toast('Belum ada paket untuk disimpan.', 'info');
      return;
    }
    await this.savePackage(project);
    if (isTauri) {
      this.sim.toast('💾 Paket disimpan ulang (folder baru versi berikutnya bila sudah ada).', 'success', 5200);
    }
  }

  async openFolder(project) {
    if (!isTauri || !project?.folderPath) {
      this.sim.toast('Folder hanya tersedia di aplikasi desktop.', 'info');
      return;
    }
    try {
      const invoke = await getInvoke();
      await invoke('open_path', { path: project.folderPath });
    } catch (err) {
      this.sim.toast(`❌ Gagal membuka folder: ${err?.message || err}`, 'danger');
    }
  }
}
```

Catatan: `bus`, `buildProjectContentPrompt`, `buildProjectCodePrompt`, `parseProjectContent`, `parseProjectCode` sengaja sudah diimpor sejak Task 6 agar diff Task 7 minimal (Vite tidak protes unused import).

- [ ] **6b. Tulis test merge** — buat `tests/projects-merge.test.js`:

```js
import { describe, expect, test } from 'bun:test';
import { mergeProjectContent } from '../src/agents/projects.js';
import { projectContentFallback } from '../src/llm/fallback.js';

const fallback = () => projectContentFallback({ title: 'Uji' });

describe('mergeProjectContent', () => {
  test('parsial: sebagian LLM, sisanya fallback → mixed', () => {
    const { value, source } = mergeProjectContent({
      sections: [
        { division: 'it', title: 'Baru', text: 'Teks baru.' },
        { division: 'marketing', title: 'Baru', text: 'Teks baru.' },
        { division: 'finance', title: 'Baru', text: 'Teks baru.' },
      ],
      caption: 'Caption dari LLM',
    }, fallback());
    expect(value.sections.find((s) => s.division === 'it').text).toBe('Teks baru.');
    expect(value.sections.find((s) => s.division === 'hrd').text.length).toBeGreaterThan(0);
    expect(value.caption).toBe('Caption dari LLM');
    expect(source).toBe('mixed');
  });

  test('rusak total → template', () => {
    const { source } = mergeProjectContent(null, fallback());
    expect(source).toBe('template');
  });

  test('klamp angka', () => {
    const { value } = mergeProjectContent({
      budget: [
        { item: 'A', qty: '2', price: '1000.5' },
        { item: 'B', qty: -5, price: -3 },
        { item: 'C', qty: 1, price: 1 },
      ],
    }, fallback());
    expect(value.budget[0].qty).toBe(2);
    expect(value.budget[0].price).toBe(1001);
    expect(value.budget[1].qty).toBe(1);
    expect(value.budget[1].price).toBe(0);
  });
});
```

- [ ] **6c.** `bun test` → hijau.

- [ ] **6d. Wiring `src/main.js`** (edit satu per satu, anchor persis):
  1. Import — setelah `import { DirectiveSystem } from './agents/directives.js';` tambah:
     ```js
     import { ProjectManager } from './agents/projects.js';
     ```
  2. Stats (baris 62-67) —
     ```js
     stats: {
       coffeeDrinks: 0,
       directives: 0,
       incidents: 0,
       conversations: 0,
     },
     ```
     jadi:
     ```js
     stats: {
       coffeeDrinks: 0,
       directives: 0,
       incidents: 0,
       conversations: 0,
       projects: 0,
       projectsToday: [],
     },
     ```
  3. Snapshot (baris 70):
     ```js
     daySnapshot: { coffeeDrinks: 0, directives: 0, incidents: 0, conversations: 0 },
     ```
     jadi:
     ```js
     daySnapshot: { coffeeDrinks: 0, directives: 0, incidents: 0, conversations: 0, projects: 0 },
     ```
  4. Tambah method setelah `openReport()`:
     ```js
     openProject(project = null) {
       const target = project || this.projects?.active || this.projects?.archive?.[0] || null;
       if (!target) {
         this.toast('Belum ada proyek. Kirim 📜 Titah "Tugas Proyek Baru" dulu.', 'info');
         return;
       }
       this.modals?.openProject(target);
     },
     ```
  5. Boot — setelah `sim.incidents = new IncidentSystem(sim);`:
     ```js
     sim.projects = new ProjectManager(sim);
     ```
  6. Update loop — setelah `sim.incidents.update(gameMinutes);`:
     ```js
     sim.projects.update(gameMinutes);
     ```
  7. `endDay()` — setelah `const finishedDay = sim.clock.day;`:
     ```js
     // Proyek yang belum kelar: dikejar deadline (paket template + disclaimer).
     sim.projects?.finalizeLate();
     ```
  8. `endDay()` — setelah `sim.lastReport = report;`:
     ```js
     sim.stats.projectsToday = [];
     ```
  9. `buildReport()` counters — tambah baris:
     ```js
     projects: Math.max(0, sim.stats.projects - (snap.projects || 0)),
     ```
     setelah baris `directives: ...`.
  10. `buildReport()` return — tambah sebelum penutup:
      ```js
      projectsList: [...(sim.stats.projectsToday || [])],
      ```
      setelah `lastDirective: directive,`.

- [ ] **6e. Channel feed `src/ui/feed.js`:**
  1. Baris 10:
     ```js
     const CHANNELS = new Set(['kerja', 'gosip', 'hr', 'direksi', 'sistem', 'proyek']);
     ```
  2. `CHANNEL_LABEL` tambah `proyek: 'proyek',`.
  3. `trackNotable` (baris 94) — kondisi jadi:
     ```js
     if (item.channel === 'hr' || item.channel === 'direksi' || item.meta?.incident || item.meta?.project) {
     ```
  4. `recentNotable` (baris 119) — kondisi jadi:
     ```js
     if (!(it.channel === 'hr' || it.channel === 'direksi' || it.meta?.incident || it.meta?.project)) continue;
     ```

- [ ] **6f.** `bun test` + `bun run build` → hijau.

- [ ] **6g. E2E offline (browser, agent-browser skill):**
  1. `bun run dev` (background) → catat URL (biasanya `http://localhost:1420` atau 5173).
  2. Pakai skill `agent-browser`: buka URL, tunggu `window.__PIXEL_SIM__` ada.
  3. Console:
     ```js
     __PIXEL_SIM__.directives.send('proyek', 'buat aplikasi desktop tauri + rust + sqlite + vanilla js + vite')
     ```
  4. Persingkat proyek supaya cepat selesai:
     ```js
     __PIXEL_SIM__.projects.active.durationMin = 2;
     __PIXEL_SIM__.clock.speed = 16;  // bila setter manual tidak jalan, ubah <select id="speed-select"> via UI
     ```
  5. Tunggu ~5-10 detik → evaluasi:
     ```js
     __PIXEL_SIM__.projects.archive[0].files.map(f => f.relPath + ':' + f.status)
     ```
     Harapan: 8 item + `kode/**` + `kode/README.md`, semua status `downloaded` (browser mode), `source === 'template'`, `code.fallback === true`, posterDataUrl panjang > 10000.
  6. Cek `document.querySelectorAll('.feed-item.chan-proyek').length >= 7` (1 mulai + 5 tonggak + 1 selesai).
  7. Screenshot untuk bukti; simpan di temp, bukan repo.
  8. Tutup dev server.
- [ ] **6h. Commit:** `feat(projects): orkestrator proyek + paket offline + wiring`

---

## Task 7 — Sambung LLM (pipeline A & B) di `projects.js`

- [ ] **7a. Edit `src/agents/projects.js` import:** tambah `isLlmReady` di import config dan import client chat:
  ```js
  import { isTauri, getInvoke, isLlmReady } from '../core/config.js';
  import { chat } from '../llm/client.js';
  ```
  (Prompt builder, parser, dan `projectContentFallback` sudah diimpor sejak Task 6.)
- [ ] **7b. Ganti isi dua method seam** dengan versi LLM:

```js
  async generateContent(project) {
    const fallback = projectContentFallback(project);
    if (!isLlmReady()) return { value: fallback, source: 'template' };
    await this.waitForLlmFree();
    const res = await this.withLlmBusy(() => chat(
      buildProjectContentPrompt(this.sim, project),
      { maxTokens: 2000, timeoutSecs: 60 },
    ));
    if (!res.ok) {
      console.warn('[projects] konten LLM gagal, pakai fallback:', res.error);
      return { value: fallback, source: 'template' };
    }
    const parsed = parseProjectContent(res.text);
    if (!parsed) {
      console.warn('[projects] JSON konten tidak terbaca, pakai fallback.');
      return { value: fallback, source: 'template' };
    }
    return mergeProjectContent(parsed, fallback);
  }

  async generateCode(project) {
    if (!isLlmReady()) return this.templateCode(project);
    await this.waitForLlmFree();
    const res = await this.withLlmBusy(() => chat(
      buildProjectCodePrompt(this.sim, project),
      { maxTokens: 8000, timeoutSecs: 90 },
    ));
    const parsed = res.ok ? parseProjectCode(res.text) : null;
    if (!parsed) {
      console.warn('[projects] kode LLM gagal/tidak terbaca, pakai template:', res.error || 'json tidak valid');
      return this.templateCode(project);
    }
    const { files, dropped } = normalizeCodeFiles(parsed.files);
    if (files.length === 0) return this.templateCode(project);
    return {
      stack: parsed.stack || '',
      run: parsed.run || [],
      files: withGuaranteedReadme(files, project, parsed.run || []),
      fallback: false,
      dropped,
    };
  }

  async waitForLlmFree(timeoutMs = 25000) {
    const conv = this.sim.conversations;
    if (!conv) return;
    const t0 = performance.now();
    while (conv.llmBusy && performance.now() - t0 < timeoutMs) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  async withLlmBusy(fn) {
    const conv = this.sim.conversations;
    if (conv) conv.llmBusy = true;
    try {
      return await fn();
    } finally {
      if (conv) conv.llmBusy = false;
    }
  }
```

  Dan tambah `import { chat } from '../llm/client.js';` — sudah dicatat di 7a, lewati bila sudah.

- [ ] **7c.** `bun run build` → hijau; `bun test` → tetap hijau.
- [ ] **7d. Verifikasi jalur gagal (offline/endpoint ngawur):** di E2E browser seperti 6g, tapi isi setting baseUrl `http://127.0.0.1:9` (port mati) via `__PIXEL_SIM__` → tunggu selesai → `source === 'template'`, `console.warn` muncul di log, paket tetap lengkap.
- [ ] **7e. Verifikasi jalur sukses (opsional, bila user punya endpoint):** isi Base URL + API Key + Model di ⚙️, ulangi 6g; harapan `source` `'llm'` atau `'mixed'`, `code.fallback === false`, jumlah file kode beragam sesuai brief. Untuk mode Tauri, jangan pakai browser (CORS); pakai `bun run tauri dev`.
- [ ] **7f. Commit:** `feat(llm): pipeline konten & kode proyek`

---

## Task 8 — UI: modal Titah, modal Proyek, HUD, laporan harian, CSS

- [ ] **8a. `src/agents/directives.js`:**
  1. Tambah preset ke-7 di akhir array `DIRECTIVE_PRESETS` (setelah `bebas`):
     ```js
     {
       type: 'proyek',
       icon: '📋',
       title: 'Tugas Proyek Baru',
       desc: 'Tulis brief; semua divisi kerja, hasilnya paket file nyata (laporan, poster, CSV, kode).',
     },
     ```
  2. `send()` — ganti dua baris ini (sekitar baris 74-75):
     ```js
     const preset = DIRECTIVE_PRESETS.find((p) => p.type === type);
     const text = type === 'custom' ? String(customText || '').trim() : (preset?.title || 'Titah');
     ```
     menjadi:
     ```js
     const preset = DIRECTIVE_PRESETS.find((p) => p.type === type);
     const rawCustom = String(customText || '').trim();
     const text = (type === 'custom' || type === 'proyek') && rawCustom
       ? rawCustom
       : (preset?.title || 'Titah');
     ```
  3. Switch — tambah case setelah `case 'bebas'`:
     ```js
     case 'proyek': {
       this.sim.projects?.start(text);
       break;
     }
     ```

- [ ] **8b. `src/ui/modals.js`:**
  1. Import: tambah `import { DIVISIONS } from '../world/office.js';`.
  2. Ganti SELURUH method `openDirective()` (baris 214-276) dengan versi ini:

```js
  openDirective() {
    const cards = DIRECTIVE_PRESETS.map((p) => `
      <button class="directive-card${p.type === 'rapat' ? ' active' : ''}" data-type="${p.type}" type="button">
        <strong>${p.icon} ${escapeHtml(p.title)}</strong>
        <small>${escapeHtml(p.desc)}</small>
      </button>
    `).join('');

    const modal = this.open(`
      <div class="modal" role="dialog" aria-modal="true" aria-label="Titah Direksi">
        <div class="modal-head">
          <h2>📜 Titah Direksi</h2>
          <button class="btn tiny-btn modal-x" data-close type="button">✕</button>
        </div>
        <div class="modal-body">
          <div class="hint" style="font-size:11.5px;color:var(--text-dim)">
            Pilih perintah. Bawahan akan merespons dengan bahasa <b>formal</b>, lalu bergosip dengan gaya <b>gaul</b> setelahnya.
          </div>
          <div class="directive-grid">${cards}</div>

          <div class="form-row hidden" id="dir-project-row">
            <label for="dir-project">Brief proyek untuk seluruh divisi</label>
            <textarea id="dir-project" rows="3" maxlength="160" placeholder="Contoh: Buat aplikasi desktop Tauri + Rust + SQLite + vanilla JS + Vite untuk absensi karyawan…"></textarea>
            <span class="hint">Min 8 karakter. Semua divisi ikut kerja; hasilnya paket file nyata (laporan, poster, CSV, kode).</span>
          </div>

          <div class="form-row">
            <label for="dir-custom">Atau tulis titah custom (opsional)</label>
            <textarea id="dir-custom" rows="3" maxlength="160" placeholder="Contoh: Besok semua divisi presentasi pakai kostum superhero…"></textarea>
            <span class="hint">Maks 160 karakter. Jika diisi, titah custom dipakai dan pilihan kartu diabaikan — kecuali kartu Tugas Proyek.</span>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn" data-close type="button">Batal</button>
          <button id="btn-directive-send" class="btn gold-btn" type="button">📜 Kirim Titah</button>
        </div>
      </div>
    `);
    if (!modal) return;

    let selected = 'rapat';
    const cardsEl = [...modal.querySelectorAll('.directive-card')];
    const projectRow = modal.querySelector('#dir-project-row');
    const sendBtn = modal.querySelector('#btn-directive-send');

    const setSelected = (btn) => {
      selected = btn.dataset.type || 'rapat';
      for (const c of cardsEl) {
        c.classList.toggle('active', c === btn);
        c.style.borderColor = c === btn ? 'var(--accent)' : '';
      }
      const isProject = selected === 'proyek';
      projectRow.classList.toggle('hidden', !isProject);
      sendBtn.textContent = isProject ? '🚀 Mulai Proyek' : '📜 Kirim Titah';
      if (isProject) setTimeout(() => modal.querySelector('#dir-project')?.focus(), 30);
    };
    for (const card of cardsEl) {
      card.addEventListener('click', () => setSelected(card));
    }

    modal.querySelectorAll('[data-close]').forEach((btn) => {
      btn.addEventListener('click', () => this.close());
    });

    sendBtn.addEventListener('click', () => {
      if (selected === 'proyek') {
        const input = modal.querySelector('#dir-project');
        const brief = input.value.trim();
        if (brief.length < 8) {
          input.style.borderColor = 'var(--danger)';
          setTimeout(() => { input.style.borderColor = ''; }, 1200);
          return;
        }
        this.sim.directives.send('proyek', brief);
      } else {
        const custom = modal.querySelector('#dir-custom').value.trim();
        if (custom.length >= 3) this.sim.directives.send('custom', custom);
        else this.sim.directives.send(selected);
      }
      this.close();
    });

    setTimeout(() => modal.querySelector('#dir-custom').focus(), 50);
  }
```

  3. Tambah method baru `openProject(project)` **sebelum** `openReport(report)`:

```js
  // ==========================================================
  // Proyek (hasil & arsip)
  // ==========================================================

  openProject(project) {
    const sim = this.sim;
    if (!project) {
      sim.toast?.('Belum ada proyek.', 'info');
      return;
    }
    const running = project.status === 'running';
    const pct = Math.min(100, Math.round((project.elapsedMin / project.durationMin) * 100));
    const srcLabel = { llm: '🤖 LLM', mixed: '🤖+🧩 LLM + Template', template: '🧩 Template offline' }[project.source]
      || (running ? '⏳ Sedang dikerjakan' : '—');

    const sections = (project.content?.sections || []).map((s) => `
      <div class="project-section">
        <h4>${escapeHtml(`${DIVISIONS[s.division]?.name || s.division} — ${s.title}`)}</h4>
        <p>${escapeHtml(s.text)}</p>
      </div>
    `).join('');

    const fileRows = (project.files || []).map((f) => {
      const icon = f.status === 'saved' || f.status === 'downloaded' ? '✅'
        : f.status === 'failed' ? '❌'
          : f.warn ? '⚠️' : '⏳';
      const kb = Math.max(1, Math.round((f.bytes || 0) / 1024));
      return `<div class="manifest-row"><span>${icon}</span><span class="mf-path">${escapeHtml(f.relPath)}</span><span class="mf-bytes">${kb} KB</span></div>`;
    }).join('') || '<div class="hint" style="color:var(--text-dim);font-size:11px">Paket sedang disusun…</div>';

    const archive = sim.projects?.archive || [];
    const archiveSelect = archive.length > 1 ? `
      <select id="proj-archive" class="select" style="max-width:280px">
        ${archive.map((p) => `<option value="${p.id}" ${p.id === project.id ? 'selected' : ''}>${escapeHtml(`Hari ${p.day} — ${p.title}`)}</option>`).join('')}
      </select>` : '';

    const modal = this.open(`
      <div class="modal" role="dialog" aria-modal="true" aria-label="Hasil Proyek">
        <div class="modal-head">
          <h2>📁 ${escapeHtml(project.title)}</h2>
          <button class="btn tiny-btn modal-x" data-close type="button">✕</button>
        </div>
        <div class="modal-body">
          <div class="hint" style="font-size:11.5px;color:var(--text-dim);display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <span>Hari ${project.day} · ${project.status === 'late' ? 'DIKEJAR DEADLINE' : running ? 'berjalan' : 'selesai'}</span>
            <span class="badge-src">${srcLabel}</span>
            ${project.folderPath ? `<span style="font-family:var(--font-mono);font-size:10px">${escapeHtml(project.folderPath)}</span>` : ''}
          </div>

          ${running ? `
            <div class="project-widget">
              <div class="project-title">Progres: ${pct}%</div>
              <div class="project-bar"><div style="width:${pct}%"></div></div>
            </div>
            <div class="hint" style="font-size:11px;color:var(--text-dim)">Semua divisi sedang mengerjakan. Paket file muncul di sini setelah selesai.</div>
          ` : ''}

          ${project.posterDataUrl ? `<img class="project-poster" src="${project.posterDataUrl}" alt="Poster proyek" />` : ''}
          ${sections}
          <div>
            <div class="panel-title" style="margin-bottom:6px">📦 Isi Paket (${(project.files || []).length} file)</div>
            <div class="project-filelist">${fileRows}</div>
          </div>
          <div class="hint" style="font-size:11px;color:var(--text-dim)">Menunggu ACC Direktur. Kode hasil AI belum diuji otomatis — buka README di folder <code>kode/</code> sebelum dipakai.</div>
        </div>
        <div class="modal-foot" style="flex-wrap:wrap;gap:6px">
          ${archiveSelect}
          ${project.folderPath ? '<button id="btn-proj-open" class="btn" type="button">📁 Buka Folder</button>' : ''}
          ${!running ? '<button id="btn-proj-resave" class="btn" type="button">💾 Simpan Ulang</button>' : ''}
          ${!running ? '<button id="btn-proj-copy-report" class="btn" type="button">📋 Copy Laporan</button>' : ''}
          ${!running ? '<button id="btn-proj-copy-caption" class="btn" type="button">📋 Copy Caption</button>' : ''}
          <button class="btn gold-btn" data-close type="button">Tutup</button>
        </div>
      </div>
    `);
    if (!modal) return;

    modal.querySelectorAll('[data-close]').forEach((btn) => {
      btn.addEventListener('click', () => this.close());
    });

    modal.querySelector('#btn-proj-open')?.addEventListener('click', () => {
      sim.projects?.openFolder(project);
    });
    modal.querySelector('#btn-proj-resave')?.addEventListener('click', async () => {
      await sim.projects?.resave(project);
    });

    const copyFrom = async (relPath, label) => {
      const file = (project.textFiles || []).find((f) => f.relPath === relPath);
      if (!file) {
        sim.toast?.('File belum tersedia.', 'info');
        return;
      }
      try {
        await navigator.clipboard.writeText(file.content);
        sim.toast?.(`📋 ${label} dicopy.`, 'success', 2600);
      } catch {
        sim.toast?.('Gagal mengcopy (izin clipboard).', 'danger');
      }
    };
    modal.querySelector('#btn-proj-copy-report')?.addEventListener('click', () => copyFrom('laporan.md', 'Laporan'));
    modal.querySelector('#btn-proj-copy-caption')?.addEventListener('click', () => copyFrom('caption-sosmed.txt', 'Caption'));

    modal.querySelector('#proj-archive')?.addEventListener('change', (e) => {
      const target = (sim.projects?.archive || []).find((p) => p.id === e.target.value);
      if (target && target !== project) {
        this.close();
        this.openProject(target);
      }
    });
  }
```

  4. Laporan harian (`openReport`): tambah KPI setelah baris `${kpi('Titah', c.directives ?? 0, '📜')}`:
     ```js
     ${kpi('Proyek', c.projects ?? 0, '📋')}
     ```
     Dan tambah blok setelah `</div>` dari "Catatan Penting" (sebelum blok `r.lastDirective`):
     ```js
     ${(r.projectsList && r.projectsList.length) ? `
       <div>
         <div class="panel-title" style="margin-bottom:6px">📋 Proyek Selesai Hari Ini</div>
         ${r.projectsList.map((t) => `<div class="report-line"><span>${escapeHtml(t)}</span><b>selesai</b></div>`).join('')}
       </div>` : ''}
     ```

- [ ] **8c. `src/ui/hud.js`:** tambah import `escapeHtml` dari `../core/utils.js` (satu baris sudah ada `formatGameTime` — jadikan `import { formatGameTime, escapeHtml } from '../core/utils.js';`).
  Di `renderStats()`:
  1. Sebelum `this.statsEl.innerHTML = [...]`, hitung:
     ```js
     const proj = this.sim.projects;
     let projectHtml = '';
     if (proj?.active) {
       const p = proj.active;
       const pct = Math.min(100, Math.round((p.elapsedMin / p.durationMin) * 100));
       const dots = ['it', 'marketing', 'finance', 'hrd', 'ga']
         .map((d) => `<span class="project-dot${p.milestones?.[d]?.done ? ' on' : ''}"></span>`)
         .join('');
       projectHtml = `
         <div class="project-widget">
           <div class="panel-title" style="font-size:10px">📋 PROYEK AKTIF</div>
           <div class="project-title" title="${escapeHtml(p.title)}">${escapeHtml(p.title)}</div>
           <div class="project-bar"><div style="width:${pct}%"></div></div>
           <div class="project-meta"><span>${pct}%</span><span class="project-dots">${dots}</span></div>
         </div>`;
     } else if (proj?.archive?.length) {
       projectHtml = `
         <button id="btn-project-view" class="btn gold-btn" style="width:100%;margin-top:2px">📄 Lihat Hasil Proyek</button>
         <button id="btn-project-archive" class="btn" style="width:100%;margin-top:4px">📁 Arsip Proyek (${proj.archive.length})</button>`;
     }
     ```
  2. Sisipkan `projectHtml,` ke array innerHTML setelah baris `statCount('📜 Titah', this.sim.stats.directives),`.
  3. Setelah handler `#btn-report`, tambah:
     ```js
     document.getElementById('btn-project-view')?.addEventListener('click', () => {
       this.sim.openProject?.();
     });
     document.getElementById('btn-project-archive')?.addEventListener('click', () => {
       this.sim.openProject?.();
     });
     ```

- [ ] **8d. `src/style.css`** — tambahkan blok berikut di akhir bagian "7b. Laporan Harian" (atau akhir file), dan ubah `.report-grid`:

```css
/* ---------- 7c. Tugas Proyek ---------- */
.report-grid {
  grid-template-columns: repeat(auto-fit, minmax(88px, 1fr));
}
.feed-item.chan-proyek { border-left-color: #4dd0c4; }
.feed-item.chan-proyek .feed-text { color: #c8fff8; }
.project-widget {
  margin-top: 6px; padding: 8px; border: 1px solid var(--border); border-radius: 6px;
  background: var(--panel-2); display: flex; flex-direction: column; gap: 5px;
}
.project-title { font-size: 11px; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.project-bar { height: 8px; background: var(--ink); border: 1px solid var(--border); border-radius: 4px; overflow: hidden; }
.project-bar > div { height: 100%; background: linear-gradient(90deg, #2f8f83, #4dd0c4); transition: width 0.4s; }
.project-meta { display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: var(--text-dim); font-family: var(--font-mono); }
.project-dots { display: inline-flex; gap: 3px; align-items: center; }
.project-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--border-2); display: inline-block; }
.project-dot.on { background: #4dd0c4; }
.project-poster {
  width: 100%; max-width: 320px; border: 1px solid var(--border-2); border-radius: 6px;
  image-rendering: pixelated; align-self: center;
}
.project-section { background: var(--panel-2); border: 1px solid var(--border); border-radius: 6px; padding: 8px 10px; }
.project-section h4 { font-size: 12px; color: var(--accent); margin-bottom: 4px; }
.project-section p { font-size: 11.5px; line-height: 1.45; color: var(--text); }
.project-filelist { display: flex; flex-direction: column; gap: 3px; max-height: 160px; overflow-y: auto; }
.manifest-row { display: flex; gap: 8px; align-items: baseline; font-size: 11px; padding: 3px 6px; border-radius: 4px; background: var(--panel-2); }
.manifest-row .mf-path { font-family: var(--font-mono); color: var(--text-dim); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.manifest-row .mf-bytes { color: var(--text-dim); font-size: 10px; }
.badge-src { font-size: 10px; padding: 1px 6px; border-radius: 8px; border: 1px solid var(--border-2); color: var(--text-dim); }
```

  Catatan: `.modal-body` kemungkinan flex-column; `.project-poster` pakai `align-self:center` aman.

- [ ] **8e.** `bun run build` + `bun test` → hijau.
- [ ] **8f. E2E UI (agent-browser):**
  1. `bun run dev`, buka URL.
  2. Klik `#btn-directive` → klik kartu `📋 Tugas Proyek Baru` → pastikan `#dir-project-row` tidak `.hidden` dan tombol jadi "🚀 Mulai Proyek" → isi brief → klik → modal tutup, toast, feed `chan-proyek` muncul.
  3. `__PIXEL_SIM__.projects.active.durationMin = 2`, speed 16 → tunggu selesai → modal hasil terbuka otomatis: ada `<img.project-poster>`, 5 `.project-section`, manifest ≥ 8 baris ✅, tombol Copy Laporan/Caption/Simpan Ulang.
  4. Klik `📋 Copy Caption` → toast sukses (grant clipboard permission bila diminta).
  5. Tutup modal → panel statistik menampilkan `📄 Lihat Hasil Proyek` + `📁 Arsip Proyek (1)`; klik → modal terbuka lagi.
  6. Jalankan proyek kedua singkat → buka modal → dropdown arsip berisi 2 item dan bisa pindah.
  7. Laporan harian: `#btn-report` → KPI `Proyek` muncul; bila ada proyek hari itu, blok "Proyek Selesai Hari Ini" tampil.
  8. Screenshot 2-3 kondisi untuk bukti (simpan di temp).
- [ ] **8g. Commit:** `feat(ui): modal proyek, widget progres, laporan & style`

---

## Task 9 — Mode fokus di `src/agents/behavior.js`

- [ ] **9a.** Ganti blok `case 'arrival' ... case 'capek'` (baris 96-101) menjadi:
  ```js
      case 'arrival':
      case 'work1':
      case 'work2':
      case 'capek': {
        const proj = sim.projects?.active;
        if (proj) this.goWork(agent, `Fokus proyek: ${proj.title}`);
        else this.goWork(agent, WORK_LABELS[block] || 'Bekerja');
        break;
      }
  ```
- [ ] **9b.** Case `'home'` (baris 108-118) jadi:
  ```js
      case 'home': {
        const proj = sim.projects?.active;
        const lembur = ['it', 'ga'].includes(agent.def.division);
        if (proj) {
          this.goWork(agent, `Fokus proyek: ${proj.title}`);
        } else if (sim.flags.overtime) {
          this.goWork(agent, 'Lembur (semua divisi)');
        } else if (lembur && !sim.flags.allGoHome) {
          this.goWork(agent, 'Lembur (pura-pura semangat)');
        } else {
          agent.goHome();
        }
        break;
      }
  ```
- [ ] **9c.** `maybeSecondary` — trip kopi:
  ```js
        const p = gameMinutes * 0.02 * (sim.projects?.active ? 0.5 : 1);
  ```
  dan kunjungan lintas divisi:
  ```js
      if (!sim.projects?.active && working && ['work1', 'work2'].includes(block)) {
  ```
- [ ] **9d.** Catatan penting (jangan diubah): `sim.flags.freeDay` tetap menang atas fokus proyek (blok "mode bebas" mengembalikan lebih awal) — ini perilaku yang disengaja.
- [ ] **9e. Verifikasi (E2E):** `bun run dev` → mulai proyek via console → cek:
  ```js
  __PIXEL_SIM__.agents.filter(a => !a.isStatic && !a.gone).map(a => a.activity.label)
  ```
  Harapan: mayoritas/stage akhir semua `Fokus proyek: ...` (kecuali yang sedang chat/meeting/kopi/lunch).
  Lalu set `__PIXEL_SIM__.clock.timeMin = 1030` (17:10, blok `home`) → tunggu beberapa detik → label tetap `Fokus proyek: ...` (nobody pulang) → lanjut `__PIXEL_SIM__.clock.timeMin = 1079` → tunggu rollover → `__PIXEL_SIM__.projects.archive[0].status === 'late'` dan toast/modal muncul; laporan hari itu `counters.projects >= 1`.
- [ ] **9f. Commit:** `feat(behavior): mode fokus proyek`

---

## Task 10 — Dokumentasi + QA akhir

- [ ] **10a. `README.md`** — tambah bullet fitur + bagian:
  ```md
  ### 📋 Tugas Proyek (Titah → paket deliverable)
  - Kirim titah **📋 Tugas Proyek Baru** dengan brief bebas (mis. "Buat aplikasi desktop Tauri + Rust + SQLite + vanilla JS + Vite").
  - Semua divisi kelihatan mengerjakan; 5 tonggak muncul di Live Office Feed.
  - Setelah ±20–40 menit kantor, paket tersimpan otomatis di
    `Documents\PixelSinergi\<tanggal> - Hari <n> - <slug>\`: `laporan.md`, `poster.png`, `ikon-app.png`,
    `caption-sosmed.txt`, `anggaran.csv`, `memo-sdm.md`, `checklist-ga.csv`, dan `kode/` (kode proyek sesuai brief).
  - Tombol **📁 Buka Folder**, **💾 Simpan Ulang**, **📋 Copy Laporan/Caption**, dan arsip proyek ada di modal hasil / panel statistik.
  - Tanpa LLM (offline / endpoint error) paket tetap terbit memakai template; badge sumber di modal menunjukkan asalnya.
  - Aplikasi **tidak pernah** menjalankan atau meng-compile kode hasil AI — buka README di folder `kode/` lalu jalankan manual.
  ```
- [ ] **10b. `docs/PRD.md`** — tambah US-08:
  ```md
  ### US-08 — Tugas Proyek & Paket Deliverable
  Sebagai Direktur, saya ingin mengirim satu brief proyek lalu melihat seluruh divisi mengerjakannya, dan menerima paket file nyata di disk yang bisa dibuka dan ditindaklanjuti.
  - Acceptance: 1 proyek aktif; progres 20–40 menit kantor; 5 tonggak feed; paket 8 item + README dijamin; tersimpan otomatis di `Documents\PixelSinergi`; badge sumber LLM/Template; fallback offline selalu siap; proyek kehabisan hari diselesaikan "dikejar deadline" (status `late`).
  ```
- [ ] **10c. `docs/RULES.md`** — tambah mekanik proyek: 1 aktif; durasi 20–40 menit acak; tonggak 20/36/52/68/84%; kopi −50% dan tanpa kunjungan lintas divisi saat aktif; blok pulang (17:00–18:00) tetap kerja; rollover → `late` + disclaimer; batas kode 14 file/24KB/160KB/depth 4; app tidak mengeksekusi kode.
- [ ] **10d. `docs/SCHEMA.md`** — tambah objek `Project`: field `id,title,day,startedAtMin,durationMin,elapsedMin,milestones{it..ga:{done,atPct}},status('running'|'done'|'late'),content,contentSource,code{stack,run,files[{path,content,bytes,warn}],fallback,dropped},source('llm'|'mixed'|'template'),posterDataUrl,iconDataUrl,files[{relPath,kind,bytes,status,warn}],textFiles[{relPath,content}],folderName,folderPath,finishedAtMin`; feed channel `proyek`; stats `projects`, `projectsToday[]`.
- [ ] **10e. `docs/ARCHITECTURE.md`** — tambah modul `src/artifacts/{files,code,templates,poster}.js`, `src/agents/projects.js`, dua command Rust (`save_project_package`, `open_path`), dan alur: Titah → ProjectManager.start → update (menit game) → complete → prompt A/B (LLM) → merge/fallback → poster → save → arsip/modal.
- [ ] **10f. Final check:** `bun test` (semua), `bun run build`, `cd src-tauri && cargo check`, lalu `bun run tauri build --no-bundle` (opsional, lama) — semua hijau.
- [ ] **10g. Manual smoke di aplikasi Tauri (`bun run tauri dev` atau exe):** klik ⚙️ isi endpoint bila ada; kirim Tugas Proyek; percepat; setelah selesai klik **📁 Buka Folder** → folder `Documents\PixelSinergi\...` terbuka dan isi paket lengkap; buka `laporan.md` dan `kode/README.md`; cek `poster.png` tampil. Ini langkah verifikasi manusia (window native tidak bisa diotomasi dari sini).
- [ ] **10h. Bersihkan artefak QA** (screenshot temp dsb), lalu commit terakhir: `docs: dokumentasi fitur Tugas Proyek` (+ commit QA bila ada sisa).

---

## Definisi Selesai

1. `bun test` hijau; `bun run build` & `cargo check` hijau.
2. Dari UI: Titah → Tugas Proyek → semua agen fokus → 5 tonggak → paket tersimpan + terbaca di modal → tombol folder/copy/resave jalan → arsip & laporan harian benar.
3. Offline (tanpa endpoint / endpoint error): paket tetap lengkap, badge `Template offline`.
4. Rollover saat proyek jalan: status `late`, disclaimer di `laporan.md`, counter laporan benar.
5. Tidak ada dependency JS baru; hanya `base64` di Rust; semua teks Bahasa Indonesia.

## Keputusan yang Sudah Dikunci (jangan dibuka lagi saat eksekusi)

- Output Marketing fase 1 = gambar (poster + ikon). Video fase 2.
- `ikon-app.png` = bonus ikon 512².
- Simpan ulang = folder baru (`-2`, `-3`), tidak menimpa.
- Auto-buka modal hanya jika tidak ada modal lain terbuka.
- Mode bebas (titah `bebas`) menang atas fokus proyek.
- App tidak pernah mengeksekusi kode LLM.

## Eksekusi

- **Task 0 (git)** opsional — tanyakan user.
- Saran mode eksekusi: **native** (satu agen, langsung), bukan subagent per task — task saling terkait erat pada state sim/UI, konteks kecil, dan subagent belum tentu memegang konvensi proyek ini.
- Setelah semua task: jalankan Task 10g bersama user (Tauri manual smoke).
