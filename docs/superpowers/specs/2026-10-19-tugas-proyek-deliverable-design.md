# Spec: Tugas Proyek & Paket Deliverable — PT Pixel Sinergi Nusantara Tbk

- **Tanggal:** 2026-10-24 (revisi 3 — Native Rust)
- **Status:** Disetujui — arsitektur Native Rust (`eframe`/`egui` + OpenGL)
- **Pendekatan:** Modul Rust mandiri (`src/sim.rs`, `src/deliver.rs`, `src/imagegen.rs`, `src/llm.rs`)
- **Riwayat:** Rev 1 = dokumen markdown tunggal. Rev 2 = paket file nyata per divisi. Rev 3 = port ke Native Rust, menghasilkan deliverable nyata langsung ke `Documents\PixelSinergi`.

---

## 1. Tujuan

Direktur (pemain) menerbitkan **tugas proyek** bebas (contoh: *"buat aplikasi desktop Tauri + Rust + SQLite + vanilla JS + Vite"*). Semua karyawan mengerjakannya secara terlihat (mode fokus), progres berjalan mengikuti waktu nyata komputer, lalu keluar **paket proyek nyata**: laporan Markdown, slide PPTX asli, poster PNG, ikon aplikasi, anggaran CSV, memo SDM, checklist GA, dan scaffold kode — disimpan langsung ke folder `Documents\PixelSinergi`.

Prinsip kunci: **LLM = konten, renderer lokal = perakit file.** LLM menghasilkan teks, angka, dan kode proyek; renderer lokal (`deliver.rs` + `imagegen.rs`) merakit artefak sehingga bentuk file selalu valid dan aplikasi tetap jalan tanpa API.

---

## 2. Keputusan Produk (hasil brainstorming)

| Topik | Keputusan |
|---|---|
| Bentuk output | **Paket folder** otomatis tersimpan di `Documents\PixelSinergi` |
| Cara pengerjaan | Bertahap & terlihat: agen fokus di meja, progres real-time (default 5 menit) |
| Pembagian kerja | Semua divisi menyumbang bagian laporan **dan** artefak file masing-masing |
| IT | **Kode proyek sesuai brief Direktur** (free-form, stack apa pun yang disebut) — bukan template situs statis |
| Fallback | Selalu tersedia via template prosedural; badge "Template" di modal hasil |
| Keamanan | **Zero execution** — aplikasi tidak pernah mengeksekusi kode hasil AI |

---

## 3. Arsitektur Teknis (Native Rust)

### 3.1 Stack
- **UI:** `eframe`/`egui` (0.37) + OpenGL (`glow`)
- **HTTP:** `reqwest` + `rustls-tls` (blocking client)
- **Gambar:** `image` (PNG), `gif` (animasi promo)
- **PPTX:** `ppt-rs` (binary PPTX asli)
- **Font:** `fontdue` (rasterisasi font CPU)
- **Waktu:** `chrono` (jam lokal OS)

### 3.2 Alur Siklus Proyek
```
1. Direktur input brief → sim.start_project(brief)
2. detect_kind(brief) → "software" | "presentation" | "campaign" | "document" | "generic"
3. detect_stack(brief) → "tauri" | "vite" | "python" | "react" | dll.
4. Proyek aktif: agen lock ke meja, 5 tonggak divisi di feed
5. Progres real-time (default 300 detik)
6. Selesai → deliver::run() di background thread:
     A) Konten: LLM (jika ready) atau template prosedural
     B) Kode: scaffold + LLM (jika software)
     C) Gambar: poster.png, ikon-app.png, promo.gif (imagegen.rs)
     D) PPTX: presentasi.pptx (ppt-rs, jika presentation)
     E) Tulis ke Documents\PixelSinergi\<tanggal> - <slug>\
```

### 3.3 Batas Keamanan (Hard Guardrails)
- **Sanitasi Path:** `util::sanitize_rel_path` memvalidasi setiap path file. Traversal (`../`), path absolut, karakter ilegal Windows (`:`, `*`, `?`, `"`, `<`, `>`, `|`), dan kedalaman > 5 ditolak.
- **Kapasitas Kode:** Maksimal 40 file, 60 KB/file, total 400 KB.
- **Zero Execution:** Aplikasi tidak pernah menjalankan perintah terminal, script compiler, atau runtime node.

---

## 4. Format Paket Deliverable

Setiap paket terdiri dari:

| File | Deskripsi |
|---|---|
| `laporan.md` | Laporan lengkap multi-divisi |
| `presentasi.pptx` | Slide PowerPoint asli (jika jenis presentation) |
| `poster.png` | Poster proyek 1080×1080 px |
| `ikon-app.png` | Ikon aplikasi 512×512 px |
| `promo.gif` | Animasi promo ringkas |
| `anggaran.csv` | Anggaran dengan BOM UTF-8 dan format Rupiah |
| `memo-sdm.md` | Memo sumber daya manusia |
| `checklist-ga.csv` | Checklist General Affairs |
| `kode/` | Scaffold kode proyek (jika software) |

---

## 5. Integrasi LLM

- Endpoint: OpenAI-compatible (`POST /v1/chat/completions`)
- Normalisasi URL otomatis di `llm.rs`
- Timeout default: 60 detik
- Fallback: Template prosedural selalu siap
- Konfigurasi: `%APPDATA%\PixelSinergi\settings.json`

---

## 6. Build & QA

```bash
cargo test                 # unit test (peta, A*, parser, PPTX zip, paket lengkap)
cargo build --release      # exe: target/release/pixel-sinergi.exe
cargo run -- --gen-sample  # hasilkan contoh paket ke %TEMP%\pixel-sinergi-sample
```
