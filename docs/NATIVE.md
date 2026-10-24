# Pixel Sinergi — Native (Rust) · Arsitektur

Aplikasi desktop **full Rust** (tanpa JavaScript, tanpa WebView) memakai
[`eframe`/`egui`](https://github.com/emilk/egui) dengan renderer OpenGL (`glow`).
Berjalan sebagai *cozy desktop companion*: kantor pixel yang hidup mengikuti
**jam lokal komputer**, dan agen-agen AI menghasilkan **paket deliverable nyata**
ke `Documents\PixelSinergi`.

## Kenapa native?

| Aspek | Tauri + Web (versi lama) | Native Rust (versi baru) |
|---|---|---|
| Runtime UI | WebView2 (Chromium) | OpenGL langsung |
| RAM saat idle | ± 180–300 MB | ± 60–90 MB |
| Bahasa | JS/TS + Rust | 100% Rust |
| Installer | `.msi` via Tauri | `.msi` via WiX (3.5 MB) |
| Grafis | Canvas 2D di browser | painter native + shader-less glow |

## Modul

| File | Tanggung jawab |
|---|---|
| `src/main.rs` | Entry point, window, mode CLI (`--gen-sample`, `--gen-icon`) |
| `src/theme.rs` | Palet "cozy", font pixel (Silkscreen) + rounded (Varela Round), gaya egui |
| `src/office.rs` | Peta kantor (rooms/furniture/seats/hotspot), grid walkable, A* 4 arah |
| `src/data.rs` | Roster 10 karyawan, bank dialog, template fallback deliverable |
| `src/sim.rs` | Simulasi real-time: fase waktu, agen & rutinitas, kucing kantor, partikel, feed, siklus proyek |
| `src/render.rs` | Renderer cozy: lantai, dinding, furniture, agen, kucing, partikel, pencahayaan 24 jam, jendela langit |
| `src/imagegen.rs` | Kanvas RGBA: poster, ikon aplikasi, GIF promo (semua digambar program) |
| `src/llm.rs` | Pengaturan + klien LLM (OpenAI-compatible) + prompt/parser paket |
| `src/deliver.rs` | Orkestrasi deliverable: dokumen, CSV, code scaffold, PPTX asli, simpan ke disk |
| `src/util.rs` | Helper murni (slug, sanitasi path, waktu, JSON longgar) |

## Waktu nyata (tanpa percepatan)

Jam aplikasi = jam OS (`chrono::Local::now()`). Fase perilaku:

```
00–05  dini hari   → kantor sunyi, lampu meja saja
05–07  pagi buta   → GA menyalakan lampu, kru datang
07–12  jam kerja   → semua di meja, kopi mengalir
12–13  istirahat   → pantry ramai
13–17  sore        → kopi kedua, sunbeam jendela
17–18  jam pulang  → tas dirapikan, kru lembur bertahan
18–23  lembur      → lampu utama redup + lampu meja hangat
```

Akhir pekan: kru kecil (GA + IT ops) tetap jaga kantor; sisanya libur.
Lembur otomatis: Jumat (Finance tutup buku), Senin–Kamis (IT ops).

### Pencahayaan

Overlay ambient diinterpolasi dari keyframe jam (indigo malam → sunrise →
terang → sunset → malam), plus *warm desk lamp* radial di tiap meja aktif,
glow monitor, lampu pantry/direktur, dan langit jendela (bintang saat malam,
mintik hujan jika hari hujan).

## Siklus proyek

```
Titah "Tugas Proyek" (brief bebas)
  → ProjectManager: 1 proyek aktif, semua agen fokus di meja
  → progres real-time (default 5 menit) + 5 tonggak divisi (feed `proyek`)
  → selesai → deliver::run() di worker thread:
       A) konten (LLM bila siap, else template)  → sections/caption/budget/slides
       B) kode (khusus software)                 → scaffold/LLM + sanitasi kapasitas
       C) gambar poster + ikon + GIF promo       → imagegen
       D) PPTX asli (ppt-rs) untuk presentasi    → presentasi.pptx + speaker-notes.md
       E) tulis ke Documents\PixelSinergi\<tgl> - <slug>\
```

Jenis proyek dideteksi dari brief: `software`, `presentation`, `campaign`,
`document`, `generic` — isi paket menyesuaikan otomatis.

Batas aman: **tidak pernah mengeksekusi/meng-compile** kode hasil AI — hanya menulis file.

## Konfigurasi

Settings disimpan di `%APPDATA%\PixelSinergi\settings.json`:

```json
{ "baseUrl": "http://192.168.100.4:20128/v1", "apiKey": "nr-...", "model": "gpt-4o-mini",
  "offline": false, "projectPaceSecs": 300 }
```

Tanpa LLM (mode offline / endpoint mati) paket tetap terbit memakai template,
dengan badge sumber **Template** di modal hasil.

## Build

```bash
cd native
cargo test                 # unit test (peta, A*, parser, PPTX zip, paket lengkap)
cargo build --release      # exe: native/target/release/pixel-sinergi.exe
cargo run -- --gen-sample  # hasilkan contoh paket ke %TEMP%\pixel-sinergi-sample
cargo run -- --gen-icon installer/app.ico

# Installer .msi (WiX v3 otomatis diunduh)
bash scripts/build-msi.sh  # → dist-installer/PixelSinergi-1.0.0-x64.msi
```

### Mode QA

| Env var | Fungsi |
|---|---|
| `PIXEL_PREVIEW_HOUR=21` | Pratinjau suasana jam (menggerakkan seluruh jadwal) |
| `PIXEL_DAY_SHIFT=-1` | Geser hari (mis. paksa Jumat dari hari Sabtu) |
| `PIXEL_WARM=60` | Panaskan simulasi N detik sebelum tampil |
| `EFRAME_SCREENSHOT_TO=out.png` | Tangkap screenshot lalu keluar (fitur `__screenshot`) |

Semua kode & teks aplikasi berbahasa Indonesia dengan nada satir kantor yang halus.