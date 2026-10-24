# 🏢 PT Pixel Sinergi Nusantara Tbk — Pixel Corporate AI Simulation

> _"Sinergitas Tanpa Batas, Lembur Tanpa Uang Lembur."_

Simulasi korporat virtual berbasis **pixel art** di mana kamu berperan sebagai **Direktur Utama (God Mode)**. Kamu memantau kantor dari atas, membaca obrolan antar karyawan AI secara real-time, menyapa tiap divisi, dan mengeluarkan *Titah Direksi* yang bikin seisi kantor heboh.

Dibangun dengan **Rust murni** (`eframe`/`egui` + OpenGL) — ringan (RAM ± 60–90 MB), tanpa JavaScript, tanpa WebView, dengan render pixel art native di GPU.

---

## 🦀 Native Rust (v1.0)

Aplikasi desktop **full Rust**: tanpa JavaScript, tanpa WebView, memakai
`eframe`/`egui` + OpenGL. Bukan sekadar *game*, melainkan **studio agen AI**:
kantor pixel cozy yang mengikuti **jam nyata komputer** dan menghasilkan
**paket deliverable nyata** (kode, PPTX, poster, GIF, CSV, memo) ke
`Documents\PixelSinergi`.

- 📖 Arsitektur: [`docs/NATIVE.md`](docs/NATIVE.md)
- ▶️ Jalankan: `cargo run` (atau `cargo run --release`)
- 📦 Installer: `bash scripts/build-msi.sh` → `dist-installer/PixelSinergi-1.0.0-x64.msi` (≈3.5 MB)
- 🧪 Test: `cargo test` · 🖼️ contoh paket: `cargo run -- --gen-sample`

---

## ✨ Fitur Utama

| Fitur | Deskripsi |
|---|---|
| 🏢 **Kantor Pixel Interaktif** | 11 ruangan (IT, Marketing, Finance, HRD, GA, Pantry, Meeting, Direktur, Lobby, dll) dengan furniture pixel yang digambar procedural. |
| 🤖 **10 Karyawan AI dengan Kepribadian** | Tiap karyawan punya persona, gaya bicara, statistik mood/stress/kopi, dan rutinitas harian 08:30–18:00. |
| 🗣️ **Tone Engine: Gaul vs Formal** | Otomatis: ngobrol sama teman = bahasa gaul; ngomong ke atasan = bahasa Indonesia formal korporat. |
| 💬 **Obrolan Live (LLM + Fallback)** | Percakapan antar divisi digenerate LLM (custom endpoint kompatibel OpenAI) atau bank dialog procedural yang lucu saat offline. |
| 📺 **God Mode Dashboard** | CCTV pan/zoom, Live Office Feed, inspeksi profil karyawan, statistik kantor. |
| 📜 **Titah Direksi** | Rapat dadakan, potong budget kopi, pizza party, batik day, atau perintah custom — karyawan bereaksi formal ke kamu, lalu bergosip setelahnya. |
| 🚨 **Insiden Korporat** | Keceplosan typo ke bos (auto SP dari HRD!), perang AC, reimburse ditolak, printer rusak, KPI deadline. |
| 📋 **Tugas Proyek & Paket Deliverable** | Kirim brief bebas (mis. aplikasi desktop Tauri); semua divisi bekerja, lalu paket file nyata (laporan, poster, CSV, kode) tersimpan otomatis di `Documents\PixelSinergi`. |
| 🔌 **LLM Fleksibel** | Dukung 9router, OpenRouter, Groq, OpenAI, Ollama, atau endpoint custom apa pun (format OpenAI-compatible). |
| 🌐 **Mode Offline** | Tanpa API key? Simulasi tetap hidup dengan bank dialog procedural. |

---

## 🚀 Cara Menjalankan

### Prasyarat
- [Rust toolchain](https://rustup.rs) (stable, edition 2021)
- Windows: toolchain MSVC + driver OpenGL (bawaan Windows 10/11)
- Untuk installer `.msi`: WiX Toolset v3 (diunduh otomatis oleh `scripts/build-msi.sh`)

### Development
```bash
cargo run                 # jalankan langsung dari root
cargo run --release       # versi rilis (lebih ringan & cepat)
```

### Test
```bash
cargo test
```

### Build Produksi
```bash
cargo build --release
# exe di: target/release/pixel-sinergi.exe
```

### Installer .msi (opsional)
```bash
bash scripts/build-msi.sh
# installer di: dist-installer/PixelSinergi-1.0.0-x64.msi
```

### Regenerate icon (opsional)
```bash
cargo run -- --gen-icon installer/app.ico
```

---

## 🔌 Konfigurasi LLM

Buka **⚙️ Settings** di aplikasi, lalu isi:

| Field | Contoh |
|---|---|
| Base URL | `https://9router.com/v1` · `https://openrouter.ai/api/v1` · `http://localhost:11434/v1` |
| API Key | `sk-...` (kosongkan untuk Ollama lokal) |
| Model | `gpt-4o-mini`, `llama-3.3-70b`, `qwen2.5:14b`, dll |
| Temperature | `0.9` (default) |

> ✅ **Semua endpoint dengan format OpenAI-compatible** (`POST /chat/completions`) didukung.
> 🔁 Klik **Test Koneksi** untuk memastikan endpoint hidup.
> 🕹️ Aktifkan **Mode Offline** untuk memaksa simulasi memakai dialog procedural (tanpa internet).

### 📋 Tugas Proyek (Titah → paket deliverable)

- Kirim titah **📋 Tugas Proyek Baru** dengan brief bebas (mis. "Buat aplikasi desktop Tauri + Rust + SQLite + vanilla JS + Vite").
- Semua divisi kelihatan mengerjakan; 5 tonggak muncul di Live Office Feed.
- Setelah ±20–40 menit kantor, paket tersimpan otomatis di
  `Documents\PixelSinergi\<tanggal> - Hari <n> - <slug>\`: `laporan.md`, `poster.png`, `ikon-app.png`,
  `caption-sosmed.txt`, `anggaran.csv`, `memo-sdm.md`, `checklist-ga.csv`, dan `kode/` (kode proyek sesuai brief).
- Tombol **📁 Buka Folder**, **💾 Simpan Ulang**, **📋 Copy Laporan/Caption**, dan arsip proyek ada di modal hasil / panel statistik.
- Tanpa LLM (offline / endpoint error) paket tetap terbit memakai template; badge sumber di modal menunjukkan asalnya.
- Aplikasi **tidak pernah** menjalankan atau meng-compile kode hasil AI — buka README di folder `kode/` lalu jalankan manual.

---

## 🗂️ Struktur Proyek

```
PixelAgents/
├── README.md                  # Dokumen ini
├── docs/
│   ├── PRD.md                 # Product Requirements Document
│   ├── SCHEMA.md              # Skema data (Agent, Room, FeedEvent, dll)
│   ├── DESIGN.md              # Panduan desain visual pixel art & UI
│   ├── ARCHITECTURE.md        # Arsitektur teknis & data flow
│   ├── RULES.md               # Aturan simulasi (tone, rutinitas, insiden)
│   └── NATIVE.md              # Arsitektur versi native Rust
├── Cargo.toml                 # Manifest crate (pixel-sinergi)
├── assets/
│   └── fonts/                 # Font pixel (Silkscreen) + rounded (Varela Round)
├── src/
│   ├── main.rs                # Entry point & window (eframe/egui)
│   ├── theme.rs               # Palet warna, font, gaya egui
│   ├── office.rs              # Peta kantor, grid walkable, A*
│   ├── data.rs                # Roster karyawan, bank dialog, template
│   ├── sim.rs                 # Simulasi real-time (waktu, agen, proyek)
│   ├── render.rs              # Renderer cozy (lantai, agen, pencahayaan)
│   ├── imagegen.rs            # Generator poster/ikon/GIF (RGBA)
│   ├── llm.rs                 # Klien LLM (OpenAI-compatible)
│   ├── deliver.rs             # Orkestrasi paket deliverable ke disk
│   └── util.rs                # Helper murni (slug, path, waktu, JSON)
├── installer/
│   ├── app.ico
│   └── pixel-sinergi.wxs      # Definisi MSI (WiX v3)
└── scripts/
    └── build-msi.sh           # Bangun installer .msi
```

---

## 🧑‍💼 Roster Karyawan

| Nama | Divisi | Level | Kepribadian |
|---|---|---|---|
| Bayu | IT & Engineering | Senior | Garing, kopi-blooded, trauma deploy Jumat sore |
| Rian | IT & Engineering | Junior | Panik, eager, selalu "di lokal saya jalan" |
| Salsa | IT & Engineering | DevOps/QA | Galak reject PR, to the point |
| Jessica | Marketing & Creative | Head of Growth | Bahasa Jaksel 80%, buzzword machine |
| Fajar | Marketing & Creative | Designer | Pasrah revisi ke-15, passive-aggressive halus |
| Mbak Endang | Finance | Senior | Mata elang struk lecek, saklek tapi sayang uang perusahaan |
| Dimas | Finance | Tax Staff | Cemas, kalkulator seumur hidup, selisih 500 perak |
| Bu Maya | HRD | Manager | Ratu email diplomatis, senyum yang mengancam KPI-mu |
| Kevin | HRD | Recruiter | Cringe-enthusiastic, ice-breaking canggung |
| Mas Joko | General Affairs | Head | Chill, pahlawan dispenser & remote AC 16°C |

**+ Kamu**: Direktur Utama (avatar duduk di Ruang Direktur, memantau via CCTV).

---

## 🗺️ Roadmap

- [x] Fase 1: Fondasi proyek (Tauri + Vite + struktur modular)
- [x] Fase 2: Engine render pixel art (tilemap, furniture, sprites)
- [x] Fase 3: State machine agen & rutinitas harian
- [x] Fase 4: Integrasi LLM custom endpoint + fallback
- [x] Fase 5: Dashboard God Mode (feed, inspector, titah, settings)
- [x] Fase 6: Polish — insiden, sound FX, statistik

---

## 📄 Lisensi

MIT — dipakai untuk keperluan belajar, satire, dan hiburan. Semua karakter fiktif; kesamaan dengan kantormu hanyalah kebetulan belaka. 😉
