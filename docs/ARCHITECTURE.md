# 🏗️ ARCHITECTURE — Arsitektur Teknis (Native Rust)

**Stack:** Rust 2021 · `eframe`/`egui` (0.37) · OpenGL (`glow`) · `reqwest` · `image` · `ppt-rs`  
**Platform:** Windows desktop (MSI installer via WiX Toolset v3)  

---

## 1. Diagram Tingkat Tinggi

```
┌────────────────────────────────────────────────────────────────────────┐
│                   PIXEL SINERGI DESKTOP (Native Rust)                   │
│                                                                        │
│  ┌─────────────────────────┐           ┌────────────────────────────┐  │
│  │   UI & Loop (main.rs)   │ ────────▶ │    Simulasi (sim.rs)       │  │
│  │  • egui Panels          │           │  • Jam Lokal OS (chrono)   │  │
│  │  • HUD, Feed, Canvas    │           │  • Agen FSM & Pathfinding  │  │
│  │  • Interaksi Pointer    │           │  • Kucing, Partikel, Cuaca │  │
│  └────────────┬────────────┘           │  • Siklus Proyek & Tonggak │  │
│               │                        └─────────────┬──────────────┘  │
│               ▼                                      │                 │
│  ┌─────────────────────────┐                         │                 │
│  │   Renderer (render.rs)  │                         ▼                 │
│  │  • egui::Painter        │           ┌────────────────────────────┐  │
│  │  • Peta 96x63 tile      │           │    LLM Client (llm.rs)     │  │
│  │  • Pencahayaan 24-jam   │           │  • OpenAI-compat POST      │  │
│  │  • Sprites & Furniture  │           │  • Blocking reqwest+rustls │  │
│  │  • Speech Bubbles       │           │  • Template fallback       │  │
│  └─────────────────────────┘           └─────────────┬──────────────┘  │
│                                                      │                 │
│                                                      ▼                 │
│                                        ┌────────────────────────────┐  │
│                                        │   Deliverable (deliver.rs) │  │
│                                        │  • imagegen.rs (PNG/GIF)   │  │
│                                        │  • ppt-rs (PPTX binary)    │  │
│                                        │  • Sanitasi Path & Kode    │  │
│                                        │  • Tulis ke Dokumen OS     │  │
│                                        └─────────────┬──────────────┘  │
└──────────────────────────────────────────────────────┼─────────────────┘
                                                       ▼
                                    ┌────────────────────────────────────┐
                                    │ Documents\PixelSinergi\<paket>\    │
                                    │ • laporan.md    • poster.png       │
                                    │ • presentasi.pptx • ikon-app.png   │
                                    │ • anggaran.csv  • kode/ (scaffold) │
                                    └────────────────────────────────────┘
```

---

## 2. Modul & Tanggung Jawab

| File / Modul | Tanggung Jawab | Batasan / Larangan |
|---|---|---|
| `src/main.rs` | Entry point aplikasi, inisialisasi window `eframe`, loop event UI, mode CLI (`--gen-sample`, `--gen-icon`) | Tidak menyimpan logika komputasi simulasi langsung |
| `src/theme.rs` | Palet warna (BG, PANEL, ACCENT, SAGE, TEAL, dll), font embedded (Silkscreen, Varela Round) | Tidak memuat aset eksternal dinamis di luar binary |
| `src/office.rs` | Sumber kebenaran peta: ukuran grid 96×63, definisi ruangan, furniture, kursi (seats), hotspot interaksi, grid walkable, dan pathfinding A* 4-arah | Tidak melakukan operasi rendering layar |
| `src/data.rs` | Roster statis 10 karyawan + direktur, bank dialog per channel ambient, deteksi tipe brief (`detect_kind`, `detect_stack`), template deliverable | Data konstan / *read-only* |
| `src/sim.rs` | State mesin simulasi real-time: jam lokal OS, fase waktu 24-jam, pergerakan agen, kucing kantor, emisi partikel, feed event, dan manajemen siklus proyek | Tidak memanggil thread rendering langsung |
| `src/render.rs` | Visualisasi visual kantor: lantai checker, dinding & pintu, furniture procedural, sprite agen & kucing, siklus pencahayaan langit & meja, balon kata, dan interaksi pick | Hanya menggambar via `egui::Painter` |
| `src/imagegen.rs` | Kanvas memori RGBA (`Canvas`): perender poster beresolusi tinggi (1080×1080), ikon aplikasi (512×512 & .ico 256×256), dan frame animasi promo GIF | Bebas dependensi GPU (murni CPU image buffer) |
| `src/llm.rs` | Pengaturan LLM (`Settings`), pembaca/penyimpan `%APPDATA%\PixelSinergi\settings.json`, klien chat HTTP kompatibel OpenAI, prompt engineering proyek, dan parser respons | Tidak memblokir UI thread untuk pekerjaan panjang |
| `src/deliver.rs` | Orkestrator berkas hasil deliverable: penggabungan data LLM/template, pembuatan Markdown, CSV ber-BOM, file slide binary PPTX, pembentukan struktur kode software, dan penulisan aman ke disk | Tidak mengeksekusi atau mengompilasi kode hasil generasi |
| `src/util.rs` | Helper murni: sanitasi slug folder, sanitasi path relasional (`sanitize_rel_path`), interpolasi linier warna, dan extractor blok JSON | Fungsi murni tanpa efek samping ke I/O |

---

## 3. Sistem Waktu & Simulasi Jam Komputer

Simulasi tidak menggunakan percepatan buatan sebagai mode utama, melainkan mengikatkan diri langsung ke jam lokal sistem operasi pengguna (`chrono::Local::now()`):

```
00:00–05:00  Dini Hari    → Kantor sunyi, sebagian besar agen pulang, lampu meja redup.
05:00–07:00  Pagi Buta    → Mas Joko (GA) menyalakan lampu, kru awal mulai tiba.
07:00–12:00  Jam Kerja    → Semua agen berada di meja masing-masing, produktivitas tinggi.
12:00–13:00  Istirahat    → Pantry ramai untuk makan siang dan obrolan kasual.
13:00–17:00  Sore         → Deep work sesi kedua, kopi break sore di pantry.
17:00–18:00  Jam Pulang   → Tas dirapikan, sebagian besar agen meninggalkan kantor via lobby.
18:00–23:59  Lembur       → Lampu utama redup, lampu meja hangat menyala untuk tim lembur (IT/Finance).
```

### Lingkungan & Pencahayaan 24 Jam
`render.rs` menghitung gradasi langit luar jendela dan *ambient tint* kantor berdasarkan nilai desimal jam (`hour_float`). Meja agen yang aktif memiliki *warm desk lamp radial glow*, lampu monitor berpendar halus, dan jendela menampilkan bintang saat malam atau mintik hujan ketika flag cuaca hujan aktif.

---

## 4. Siklus Proyek & Pembuatan Paket Deliverable

1. **Trigger**: Direktur mengirimkan brief melalui perintah proyek (`sim.start_project(brief)`).
2. **Analisis Brief**:
   - `data::detect_kind(brief)` menentukan kategori: `software`, `presentation`, `campaign`, `document`, atau `generic`.
   - `data::detect_stack(brief)` menentukan kerangka teknologi: `tauri`, `vite`, `python`, `react`, dsb.
3. **Pengerjaan Terlihat**:
   - Status proyek `ProjStatus::Running` mengunci agen di meja masing-masing (fokus proyek).
   - 5 tonggak divisi tercapai secara berkala (20%, 36%, 52%, 68%, 84%) dan disiarkan ke feed `proyek`.
4. **Penyusunan Paket (Worker Thread)**:
   - Konten teks dihasilkan via LLM (jika endpoint siap) atau template prosedural.
   - Aset visual diproduksi oleh `imagegen.rs` (poster PNG, ikon aplikasi, promo GIF).
   - Slide presentasi diproduksi ke format PPTX asli melalui pustaka `ppt-rs`.
   - Berkas kode scaffold dirapikan dan disanitasi ketat.
5. **Persistensi ke Disk**:
   - Seluruh artefak ditulis ke `%USERPROFILE%\Documents\PixelSinergi\<tanggal> - <slug>\`.
   - Hasil disimpan ke arsip internal aplikasi (`sim.archive`).

---

## 5. Keamanan & Batasan Berkas (Hard Guardrails)

Untuk menjaga keamanan komputer pengguna:
- **Zero Execution**: Aplikasi tidak pernah menjalankan perintah terminal, script compiler, runtime node, atau binary hasil generasi AI.
- **Path Sanitization**: `util::sanitize_rel_path` memvalidasi setiap path file dalam paket. Percobaan traversal seperti `../`, path absolut, karakter ilegal Windows (`:`, `*`, `?`, `"`, `<`, `>`, `|`), serta kedalaman lebih dari batas aman akan otomatis ditolak.
- **Kapasitas Kode**: Maksimal 40 berkas, ukuran maksimal per berkas 60 KB, total paket kode tidak melebihi 400 KB.

---

## 6. Persistensi & Konfigurasi

| Data | Lokasi | Format |
|---|---|---|
| Konfigurasi & LLM | `%APPDATA%\PixelSinergi\settings.json` | JSON |
| Paket Deliverable | `%USERPROFILE%\Documents\PixelSinergi\` | Folder berkas nyata |
| State Simulasi & Feed | In-memory RAM (reset bersih saat aplikasi dibuka ulang) | Rust Structs |
