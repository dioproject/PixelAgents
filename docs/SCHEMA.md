# 🗃️ SCHEMA — Skema Data PT Pixel Sinergi Nusantara Tbk

Semua data runtime berbentuk objek JavaScript (in-memory). Hanya **Settings** yang dipersist ke disk. Format di bawah memakai notasi TypeScript-like untuk kejelasan.

---

## 1. Settings (Persisted)

Disimpan di `app_config_dir/pixel-sinergi/config.json` (Tauri) atau `localStorage["pixel-sinergi/config"]` (browser).

```ts
interface Settings {
  baseUrl: string;          // "" = belum diisi → fallback procedural
  apiKey: string;           // "" untuk Ollama lokal
  model: string;            // "gpt-4o-mini", "llama3.3", ...
  temperature: number;      // 0.0 - 2.0, default 0.9
  maxTokens: number;        // default 400
  timeoutSecs: number;      // default 45
  offlineMode: boolean;     // true = paksa fallback procedural
  soundEnabled: boolean;    // default true
  defaultSpeed: number;     // 1 | 2 | 4 | 8 | 16 ; default 2
  showBubbles: boolean;     // tampilkan speech bubble, default true
}
```

## 2. Division

```ts
interface Division {
  id: 'it' | 'marketing' | 'finance' | 'hrd' | 'ga' | 'exec';
  name: string;             // "IT & Engineering"
  short: string;            // "IT"
  color: string;            // hex untuk feed & label
  floorTint: [string, string]; // [base, checker] warna lantai
}
```

## 3. AgentDef (Roster — statis)

```ts
interface AgentDef {
  id: string;               // "bayu"
  name: string;             // "Bayu"
  role: string;             // "Senior Backend Engineer"
  division: DivisionId;
  level: 1 | 2 | 3;         // 1 junior, 2 senior/staff, 3 manager/head
  gender: 'm' | 'f';
  style: string;            // deskripsi gaya bicara (dipakai prompt)
  traits: string[];         // ["garing", "kopi-addict", "trauma-deploy-jumat"]
  catchphrases: string[];   // untuk fallback & flare prompt
  downTone: 'casual' | 'sweet' | 'jaksel' | 'chill' | 'bossy'; // gaya saat bicara ke bawahan
  lookup: {                 // posisi & warna
    skin: string; hair: string; hairStyle: number;   // index gaya rambut 0-5
    top: string; bottom: string; accent: string;     // warna baju, celana, aksen
  };
  desk: { x: number; y: number; face: 'up'|'down'|'left'|'right' }; // tile kursi
  salary: number;           // angka satir untuk panel (Rp)
  coffeeLevel: 0 | 1 | 2 | 3; // seberapa sakau kesehariannya
}
```

## 4. Runtime Agent (mutable)

```ts
interface Agent extends AgentDef {
  px: number; py: number;           // posisi pixel (feet anchor)
  facing: 'up'|'down'|'left'|'right';
  frame: string;                    // nama frame sprite aktif
  animT: number;                    // akumulator animasi
  path: Tile[];                     // sisa jalur (tile grid)
  activity: Activity;               // aktivitas saat ini
  stats: AgentStats;
  bubble: BubbleState | null;
  gone: boolean;                    // sudah pulang?
  log: string[];                    // 3 kutipan terakhir
}

interface AgentStats {
  mood: number;      // 0-100
  stress: number;    // 0-100
  coffee: number;    // 0-5 (kafein dalam darah, satir)
  chattedToday: number;
}

interface Activity {
  type: 'idle' | 'walk' | 'work' | 'coffee' | 'chat' | 'meeting'
      | 'slack' | 'lunch' | 'lobby' | 'gone';
  target?: Tile | Tile[];    // tujuan walk
  seat?: SeatRef;            // kursi (desk/meeting/pantry)
  forced?: boolean;          // true = jangan di-override planner
  onArrive?: () => void;     // callback saat sampai
  until?: number;            // waktu game (menit) aktivitas berakhir
  facing?: Facing;           // untuk duduk/slack
  label?: string;            // untuk inspector: "Ngetik sprint board", dsb.
}
```

## 5. Office Map

```ts
interface Room {
  id: string;              // "it", "meeting", "director", "corridor1", "pantry", ...
  label: string;           // "Divisi IT & Engineering"
  x: number; y: number;    // tile interior kiri-atas
  w: number; h: number;    // ukuran interior (tile)
  floor: FloorStyleId;     // referensi ke gaya lantai (warna + pattern)
  labelAnchor?: Tile;      // posisi label DOM
}

interface Furniture {
  id: string;              // "desk.bayu", "meeting.table", ...
  type: FurnitureType;     // "desk" | "roundTable" | "sofa" | ... (lihat DESIGN.md)
  x: number; y: number;    // tile kiri-atas
  w: number; h: number;    // ukuran (tile)
  blocking: boolean;       // menghalangi jalan?
  rot?: 0 | 90;            // rotasi (90 = vertikal)
  meta?: Record<string, any>; // mis. { screenFacing: 'down' }
}

interface SeatRef {
  id: string;              // "seat.bayu" | "seat.meeting.3"
  x: number; y: number;    // tile tempat duduk
  facing: Facing;          // arah hadap saat duduk
  kind: 'desk' | 'meeting' | 'pantry' | 'sofa' | 'lobby';
}

interface Hotspot {
  id: string;              // "coffee.machine", "dispenser", "printer", ...
  x: number; y: number;    // tile interaksi (tempat berdiri)
  stand: Tile;             // tile berdiri paling aman
  label: string;
}
```

## 6. Conversation

```ts
interface Turn {
  speakerId: string;       // agent id | "hr" | "system"
  speakerName: string;     // display
  text: string;            // maks 180 char
  tone: 'casual' | 'formal' | 'hr-alert' | 'system' | 'director';
  at: number;              // jadwal tayang (ms wall-clock relatif konvoi)
}

interface Conversation {
  id: string;
  kind: 'pair' | 'group' | 'incident' | 'directive' | 'meeting';
  participants: string[];  // agent ids
  origin: 'llm' | 'fallback' | 'scripted';
  turns: Turn[];
  cursor: number;
  startedAt: number;
}
```

## 7. Feed & Events

```ts
interface FeedEvent {
  id: string;
  t: number;               // game minutes
  day: number;
  channel: 'kerja' | 'gosip' | 'hr' | 'direksi' | 'sistem';
  from?: string;           // agent id pengirim
  text: string;
  meta?: { incident?: string; directive?: string; to?: string };
}

interface Incident {
  id: 'keceplosan' | 'ac_war' | 'reimburse' | 'printer' | 'kpi' | 'birthday' | 'bsod';
  weight: number;          // bobot pemilihan
  cooldown: number;        // menit game sebelum boleh muncul lagi
  minDay?: number;
}

interface Directive {
  type: 'rapat' | 'budget' | 'lembur' | 'pizza' | 'batik' | 'bebas' | 'custom';
  text: string;            // teks titah yang dibacakan sistem
  at: number;
  effects: DirectiveEffect[];
}

interface DirectiveEffect {
  kind: 'gather' | 'stat' | 'flag' | 'line';
  // gather: pindahkan agen ke lokasi; stat: delta mood/stress; flag: aktifkan kondisi; line: pakai bank reaksi
  payload: any;
}
```

## 8. Camera & UI State

```ts
interface CameraState { x: number; y: number; zoom: 1|2|3|4; }

interface UIState {
  selectedAgentId: string | null;
  feedTab: 'all' | 'kerja' | 'gosip' | 'hr';
  modal: null | 'settings' | 'directive' | 'about';
  paused: boolean;
  speed: number;
}
```

## 9. Save Data (v0.2 — belum dipakai)

```ts
interface SaveState {
  version: 1;
  day: number;
  timeMin: number;
  agents: { id: string; stats: AgentStats }[];
  feedTail: FeedEvent[];   // 50 terakhir
  flags: Record<string, boolean>;
}
```

## 10. Project (Tugas Proyek)

```ts
interface ProjectFile { relPath: string; kind: 'text' | 'binary'; bytes: number; status: 'pending' | 'saved' | 'downloaded' | 'failed'; warn: boolean }

interface Project {
  id: string;
  title: string;                 // brief dari Direktur (≤160 char)
  day: number;
  startedAtMin: number;          // menit kantor saat mulai
  durationMin: number;           // 20–40
  elapsedMin: number;            // progres berjalan
  milestones: Record<'it'|'marketing'|'finance'|'hrd'|'ga', { done: boolean; atPct: number }>;
  status: 'running' | 'done' | 'late';
  content: object | null;        // sections[5], poster, caption, budget[], ga[], memo
  contentSource: 'llm' | 'mixed' | 'template' | null;
  code: { stack: string; run: string[]; files: { path: string; content: string; bytes: number; warn: boolean }[]; fallback: boolean; dropped: number } | null;
  source: 'llm' | 'mixed' | 'template' | null;   // gabungan konten + kode
  posterDataUrl: string | null;  // PNG dataURL 1080²
  iconDataUrl: string | null;    // PNG dataURL 512²
  files: ProjectFile[];          // manifest paket (8 item + kode/**)
  textFiles: { relPath: string; content: string }[];
  folderName: string;            // <YYYY-MM-DD> - Hari <n> - <slug>
  folderPath: string | null;     // null di mode browser
  finishedAtMin: number | null;
}
```

- Feed channel: `proyek` (mulai, 5 tonggak, selesai).
- Stats: `stats.projects` (total) dan `stats.projectsToday[]` (judul; direset setelah laporan harian dibuat).
- Laporan harian: `counters.projects` + `projectsList[]`.

---

## Aturan Validasi Penting

1. `Turn.text` wajib ≤ 180 karakter (dipotong otomatis) dan tanpa newline.
2. `speakerId` harus ada di roster, atau merupakan id spesial (`hr`, `system`).
3. Balon kata maksimal 1 aktif per agen; balon baru menimpa yang lama.
4. Feed menyimpan maksimal 400 item (FIFO) agar DOM tetap ringan.
5. Pathfinding 4 arah (bukan diagonal) di grid walkable; tile furniture `blocking=true` tidak bisa dilewati.
