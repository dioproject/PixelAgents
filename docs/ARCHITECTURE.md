# 🏗️ ARCHITECTURE — Arsitektur Teknis

**Stack:** Tauri 2 (Rust) · Vite · Vanilla JS (ESM) · HTML5 Canvas 2D · WebAudio
**Package manager:** Bun

---

## 1. Diagram Tingkat Tinggi

```
┌──────────────────────────────────────────────────────────────────────┐
│                        TAURI DESKTOP (Rust)                          │
│                                                                      │
│  ┌──────────────┐   invoke()   ┌───────────────────────────────────┐ │
│  │  WEBVIEW     │ ───────────▶ │  Rust Commands                    │ │
│  │  (Frontend)  │              │  • llm_chat   (reqwest proxy)     │ │
│  │              │ ◀─────────── │  • save_config / load_config      │ │
│  └──────┬───────┘   Result     └───────────────┬───────────────────┘ │
└─────────┼───────────────────────────────────────┼────────────────────┘
          │                                       │ HTTPS
          │ (Fallback browser mode: fetch)        ▼
          │                              ┌────────────────────┐
          │                              │  LLM Endpoint      │
          │                              │  9router / OpenAI  │
          │                              │  Groq / Ollama ... │
          │                              │  (OpenAI-compat)   │
          │                              └────────────────────┘
          ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Vanilla JS)                        │
│                                                                      │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │ core/      │  │ world/      │  │ engine/      │  │ ui/         │  │
│  │ config     │  │ office map  │  │ loop 60fps   │  │ hud/feed    │  │
│  │ clock      │  │ tile art    │  │ camera       │  │ bubbles     │  │
│  │ bus        │  │ furniture   │  │ pathfinding  │  │ inspector   │  │
│  │ utils      │  │ scene       │  │ sprites      │  │ modals/toast│  │
│  └─────┬──────┘  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘  │
│        │                │                │                 │         │
│        ▼                ▼                ▼                 ▼         │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                    SIMULATION CORE (agents/)                 │    │
│  │  roster → Agent FSM → behavior planner → conversation mgr    │    │
│  │                    incidents · directives                    │    │
│  └──────────────────────────┬───────────────────────────────────┘    │
│                             │                                        │
│                    ┌────────▼────────┐                               │
│                    │ llm/ (client,   │                               │
│                    │ prompts,        │                               │
│                    │ fallback banks) │                               │
│                    └─────────────────┘                               │
└──────────────────────────────────────────────────────────────────────┘
```

## 2. Modul & Tanggung Jawab

| Modul | Tanggung Jawab | Tidak Boleh |
|---|---|---|
| `core/config` | Load/save Settings (Tauri config dir ↔ localStorage), nilai default | Tahu soal render |
| `core/clock` | Waktu game (menit/hari), kecepatan, pause, konversi jam | Tahu soal agen |
| `core/bus` | Pub/sub event internal (`feed:add`, `toast`, `select-agent`, ...) | Menyimpan state domain |
| `core/utils` | Helper murni: rand, clamp, choice, format, escapeHtml | Efek samping |
| `world/office` | **Satu-satunya sumber kebenaran** peta: rooms, furniture, seats, hotspot, grid walkable, roomAt() | Menggambar |
| `world/tiles` + `world/furnitureArt` | Fungsi painter tile/furniture (gambar ke ctx 16px-scale) | Tahu posisi agen |
| `world/scene` | Pre-render seluruh peta ke offscreen canvas sekali; `draw(ctx, camera)` per frame | Update simulasi |
| `engine/camera` | x/y/zoom, clamp ke batas peta, pan drag, zoom wheel, `worldToScreen()` | Menggambar UI |
| `engine/pathfinding` | A* 4-arah di grid; `nearestWalkable()` | Tahu apa pun tentang agen |
| `engine/sprites` | Definisi matriks sprite + palet; pre-render frame per agen; `drawAgent()` | Logika AI |
| `engine/loop` | rAF loop: `update(dt)` → `render()` → `updateDom()`; meter FPS | Leadership logic |
| `agents/roster` | Data statis 10 karyawan + direktur | Runtime mutable |
| `agents/agent` | Class Agent: posisi, path following, FSM aktivitas, stats, bubble | Memanggil LLM langsung |
| `agents/behavior` | Planner: memilih aktivitas per agen berdasar jam kerja + kondisi; menjalankan walk; mengatur pulang/lembur | Menyusun dialog |
| `agents/conversation` | Orkestrasi percakapan: pilih pasangan, susun turn (LLM/fallback), jadwalkan bubble + feed, lepas agen | Menyentuh canvas |
| `agents/incidents` | Timer & roll insiden acak, membangun skrip insiden (atau LLM), efek stats/toast | Menggerakkan agen langsung (delegasi ke agent/behavior) |
| `agents/directives` | Preset titah, efek simulasi (gather/stat/flag), panggil conversation untuk reaksi | — |
| `agents/projects` | Orkestrasi Tugas Proyek: state 1 aktif, progres + tonggak, konten & kode (LLM/fallback), poster, simpan paket, arsip | Menjalankan/meng-compile kode hasil AI |
| `artifacts/files` | Builder teks murni: `laporan.md`, CSV (BOM `;`), caption, memo | DOM/network |
| `artifacts/code` + `artifacts/templates` | Sanitasi & normalisasi file kode (14 file · 24 KB · 160 KB · depth 4) + scaffold fallback valid | Mengeksekusi kode |
| `artifacts/poster` | Render poster 1080² & ikon 512² ke PNG dataURL (canvas) | Menyimpan file |
| `src-tauri/src/lib.rs` | Command Rust: `llm_chat` (proxy CORS), `save_config`/`load_config`, `save_project_package` (sanitasi + tulis paket ke Documents), `open_path` | Logika bisnis JS |
| `llm/client` | `chat()` (Tauri invoke atau fetch), antrian 1 in-flight, timeout, `testConnection()` | Tahu konteks bisnis |
| `llm/prompts` | Builder system prompt + few-shot + parser JSON multi-speaker | Network |
| `llm/fallback` | Bank dialog procedural (template percakapan, reaksi, insiden) | Network |
| `ui/*` | DOM: topbar, sidebar, feed, bubble, inspector, modal, toast, sfx | State domain (hanya baca lewat API sim) |

## 3. Loop Simulasi (60 FPS)

```
requestAnimationFrame(dt)
 └─ if (!paused):
     simMin = clock.tick(dt)                  // += dt * speed / MS_PER_MIN
     for agent of agents: agent.update(dt, simMin)
        ├─ walk: ikuti path (speed 42 px/s), set frame walkA/B
        ├─ stats: stress/coffee/mood drift berdasar aktivitas & flags
        └─ animasi: ganti frame berdasar animT
     behavior.plan(agents, clock)             // tiap agen idle → pilih aktivitas
     conversation.update(nowMs)               // tayangkan turn, kelola bubble
     incidents.update(simMin)                 // roll & trigger
     directives.update(simMin)                // efek gather selesai → jalankan skrip
 render:
     scene.draw(ctx, camera)                  // offscreen pre-rendered map
     agents sorted by py → drawAgent()
     camera smooth-follow jika ada target
 uiFrame:
     bubbles.reposition()                     // DOM bubble mengikuti kamera
     hud.tick()                               // jam, fps, stats sidebar
```

### Konversi waktu
- `1 game-minute = 1000 ms wall-clock / speed` (speed 2 → hari 08:30–18:00 ≈ 4.7 menit riil).
- `MS_PER_MIN = 1000` konstanta tunggal; dipakai clock & scheduler.

## 4. Alur Percakapan (LLM + Fallback)

```
conversation.tryStartPair()
 ├─ kumpulkan kandidat: 2 agen, activity ∈ {work, idle, slack}, satu ruangan, jarak < 7 tile,
 │  tidak sedang berjalan/ngopi/rapat
 ├─ tentukan konteks (ruang + jam): gosip / kerja / lunch / curhat
 ├─ template fallback SELALU disiapkan (instan)
 └─ jika LLM aktif & antrian kosong:
      turnA = mulai typing bubble (…)
      LLM chat(prompt) ──sukses──▶ parse JSON ──valid──▶ turns
                       └─timeout/gagal──▶ fallback
      ganti typing dengan skrip hasil
 setAgentTalking(a,b); jadwalkan turn tiap 1.5–4.8 s
 ├─ tiap turn: bubble.show(speaker, text) + bus.emit('feed:add')
 └─ selesai: release agen, stats.mood += 3, chattedToday++
```

- **Antrian global LLM = 1 request** agar endpoint tidak dibombardir; konvoi lain memakai fallback.
- **Timebox**: konvoi maksimum 6 turn; timeout LLM 20 s (di bawah timeout HTTP 45 s Settings).
- **Rate limiter**: maksimum 1 percakapan LLM per 45 detik wall-clock; sisanya fallback.

## 5. Proxy LLM (Rust)

```
Frontend ──invoke("llm_chat", {base_url, api_key, model, messages, ...})──▶
 Rust: normalize URL (tambah /chat/completions jika belum)
       POST JSON {model, messages, temperature, max_tokens}
       header Authorization: Bearer <api_key> (jika ada)
       timeout (default 45 s)
 ◀── Ok(content) | Err("HTTP 401: ...") 
```

Keuntungan: **bebas CORS**, API key tidak pernah menyentuh kode web, timeout terkontrol.
Di mode browser dev: `fetch()` langsung (butuh CORS endpoint atau mode offline).

## 6. Persistensi

| Data | Lokasi | Format |
|---|---|---|
| Settings | Tauri: `%APPDATA%/com.pixelsinergi.corporate/config.json` · Browser: `localStorage` | JSON |
| Sim state | In-memory (reset tiap buka) | — |

## 7. Performa

| Teknik | Alasan |
|---|---|
| Pre-render peta statis (1536×1008 offscreen) | 1 `drawImage` per frame alih-alih ribuan `fillRect` |
| Pre-render frame sprite per agen (offscreen) | 12×18 = 216 rect → 1 drawImage |
| DOM hanya untuk UI/bubble/label | Teks tetap tajam & aksesibel tanpa raster font |
| Feed maks 400 node | DOM tetap ringan walau berjalan berjam-jam |
| Sorting 10 agen per frame | Trivial; tidak perlu optimasi |
| `imageSmoothingEnabled=false` + zoom integer | Pixel art tajam khas retro |

## 8. Struktur Folder (Final)

```
PixelAgents/
├─ index.html
├─ package.json / vite.config.js / .gitignore
├─ scripts/gen-icon.mjs
├─ docs/ (PRD, SCHEMA, DESIGN, ARCHITECTURE, RULES)
├─ src/
│  ├─ main.js · style.css
│  ├─ core/   {config, clock, bus, utils}.js
│  ├─ engine/ {camera, pathfinding, sprites, loop}.js
│  ├─ world/  {office, tiles, furnitureArt, scene}.js
│  ├─ agents/ {roster, agent, behavior, conversation, incidents, directives, projects}.js
│  ├─ llm/    {client, prompts, fallback}.js
│  ├─ artifacts/ {files, code, templates, poster}.js
│  └─ ui/     {hud, feed, bubbles, inspector, modals, toast, sfx}.js
└─ src-tauri/
   ├─ Cargo.toml · build.rs · tauri.conf.json
   ├─ capabilities/default.json
   ├─ icons/            (hasil `cargo tauri icon`)
   └─ src/{main.rs, lib.rs}
```

## 9. Build & Rilis

```bash
bun install            # dependensi frontend
bun run dev            # dev server (browser)  :1420
bun run tauri dev      # dev desktop (Rust + webview)
bun run tauri build    # produksi → installer .msi/.exe
```

- `beforeDevCommand: bun run dev`, `devUrl: http://localhost:1420`
- CSP nonaktif (konten 100% lokal); network hanya lewat Rust command.

## 10. Alur Tugas Proyek (Paket Deliverable)

```
Titah "Tugas Proyek Baru" (brief) → DirectiveSystem.send('proyek', text)
  → ProjectManager.start(): 1 proyek aktif; semua agen difokuskan (behavior)
  → update(gameMinutes): progres + 5 tonggak divisi (feed `proyek`)
  → pct 100% → complete():
       A) generateContent : prompt LLM (maxTokens 2000) → parseProjectContent
                            → mergeProjectContent(parsed, bank fallback)
       B) generateCode    : prompt LLM (maxTokens 8000) → parseProjectCode
                            → normalizeCodeFiles (14 file / 24 KB / 160 KB / depth 4)
                            → fallback template + README dijamin
       → renderPoster / renderAppIcon (canvas → PNG dataURL)
       → savePackage: Tauri invoke `save_project_package` → Documents\PixelSinergi\<folder>
                      (browser dev: unduhan terpisah, folderPath = null)
  → arsip + auto-buka modal hasil (hanya bila tidak ada modal lain terbuka)

Rollover 18:00 saat proyek masih jalan → finalizeLate():
  statistik hari itu dihitung sinkron → complete({ late: true })
  → konten & kode template + status 'late' + disclaimer di laporan.md

Batas aman: aplikasi TIDAK PERNAH mengeksekusi/meng-compile kode hasil AI — hanya menulis file.
```
