# 📋 PRD — PT Pixel Sinergi Nusantara Tbk

**Versi:** 1.0.0 (Native Rust) · **Status:** Active · **Tanggal:** 24 Oktober 2026

---

## 1. Latar Belakang

Dunia kerja kantor Indonesia penuh dengan dinamika unik: obrolan pantry, drama reimburse, perang suhu AC, hingga typo maut yang terkirim ke grup Direksi. Fenomena ini sangat relatable, lucu, dan hampir tidak pernah disimulasikan dalam bentuk yang interaktif.

**PT Pixel Sinergi Nusantara Tbk** adalah aplikasi desktop bernuansa *cozy AI agent studio* bergaya pixel art di mana pengguna memantau kantor virtual yang berjalan mengikuti **jam nyata komputer** (OS clock) dan mempekerjakan karyawan-karyawan AI dengan kepribadian satir khas Indonesia untuk memproduksi **paket deliverable nyata** ke disk komputer.

## 2. Tujuan Produk

1. **Cozy Desktop Companion**: Menjadi "tontonan hidup" di sudut layar desktop dengan kantor pixel hangat, pencahayaan 24-jam dinamis, kucing kantor, dan agen yang beraktivitas sesuai jam nyata.
2. **AI Studio Nyata**: Menghasilkan deliverable file nyata (laporan Markdown, slide presentasi PPTX asli, poster PNG, ikon aplikasi, anggaran CSV, memo SDM, scaffold kode) langsung ke folder `Documents\PixelSinergi`.
3. **Relatable & Satir**: Humor budaya kerja Indonesia yang dekat dengan realitas sehari-hari (reimburse, kopi sachet, revisi, KPI, lembur).
4. **Ringan & Native**: Dibangun murni dengan Rust (`eframe`/`egui` + OpenGL) — tanpa WebView, tanpa Chromium, RAM hemat (±60–90 MB), startup instan, dan installer MSI yang ringkas (≈3.5 MB).
5. **Mandiri (Offline-First)**: Berfungsi 100% tanpa internet/API dengan generator template prosedural, namun dapat ditingkatkan dengan endpoint LLM OpenAI-compatible (9router, OpenRouter, Groq, Ollama, OpenAI).

### Non-Goals
- ❌ Mengeksekusi atau mengompilasi kode hasil generate AI secara otomatis (keamanan disk pengguna).
- ❌ Sinkronisasi akun / cloud berbayar wajib.
- ❌ Multiplayer online.

## 3. Persona Pengguna

| Persona | Deskripsi | Kebutuhan |
|---|---|---|
| **Direktur Utama (God Mode)** | Pengguna aplikasi yang memantau kantor, mengeluarkan titah, dan menugaskan proyek baru. | Pantauan kantor menyeluruh, kontrol titah, delegasi proyek, kemudahan akses folder hasil di disk. |

## 4. User Stories & Acceptance Criteria

### US-01 — Kantor Pixel Real-Time
> Sebagai Direktur, saya ingin kantor pixel mengikuti jam nyata komputer saya, agar terasa seperti kantor companion nyata.

**Acceptance:**
- Waktu berjalan sinkron dengan jam lokal OS (`chrono::Local`).
- Perubahan fase 24-jam: Dini hari (00–05), Pagi buta (05–07), Jam kerja (07–12), Istirahat (12–13), Sore (13–17), Jam pulang (17–18), Lembur (18–23).
- Pencahayaan ambient berubah dinamis (indigo malam, sunrise, siang cerah, sunset jingga, redup lembur) dengan glow hangat pada lampu meja agen yang aktif.
- Kucing kantor berkeliaran, tidur, dan grooming di sekitar area kantor.

### US-02 — Live Office Feed & Obrolan Karyawan
> Sebagai Direktur, saya ingin membaca obrolan karyawan secara real-time dan melihat balon kata di atas mereka.

**Acceptance:**
- Balon kata (speech bubble) muncul di atas kepala karakter saat berbicara.
- Semua peristiwa, percakapan, tonggak proyek, dan sistem tercatat di panel **Live Office Feed**.
- Bank dialog procedural hidup saat offline atau ambient, mencakup konteks pagi, makan siang, sore, lembur, hujan, kopi, insiden, dan proyek.

### US-03 — Tugas Proyek & Paket Deliverable Nyata
> Sebagai Direktur, saya ingin menugaskan brief proyek bebas dan menerima paket deliverable nyata di folder Documents komputer saya.

**Acceptance:**
- Brief proyek bebas (software, presentation, campaign, document, generic).
- Deteksi otomatis jenis proyek dan tech stack dari brief pengguna.
- Progres proyek bertahap dengan 5 tonggak divisi (IT, Marketing, Finance, HRD, GA) yang muncul di feed.
- Saat selesai, paket tersimpan otomatis ke `Documents\PixelSinergi\<tanggal> - <slug>\`.
- Isi paket menyesuaikan jenis proyek:
  - `laporan.md` (laporan lengkap multi-divisi)
  - `presentasi.pptx` (slide PowerPoint binary asli via `ppt-rs`, untuk jenis presentasi)
  - `poster.png`, `ikon-app.png`, `promo.gif` (digambar procedural via canvas RGBA)
  - `anggaran.csv` (dengan BOM UTF-8 dan format Rupiah)
  - `memo-sdm.md` & `checklist-ga.csv`
  - `kode/` (scaffold kode aman dengan README dan sanitasi ketat untuk proyek software)
- Selalu aman: aplikasi tidak pernah mengeksekusi kode hasil generasi.

### US-04 — Titah Direksi
> Sebagai Direktur, saya ingin mengeluarkan perintah manajemen yang memengaruhi perilaku kantor.

**Acceptance:**
- Titah Rapat Dadakan: seluruh divisi berkumpul di Ruang Meeting.
- Titah Lembur: mengaktifkan flag lembur malam ini, menaikkan stress agen.
- Titah Bebas Ngapain Aja: agen bersantai di area lounge/pantry.
- Titah Potong Budget Kopi: memotong suplai kafein kantor.

### US-05 — Konfigurasi LLM OpenAI-Compatible
> Sebagai pengguna, saya dapat menghubungkan LLM favorit saya atau menggunakan mode offline.

**Acceptance:**
- Pengaturan via file JSON di `%APPDATA%\PixelSinergi\settings.json`.
- Mendukung Base URL, API Key, Model name, Temperature, Timeout, dan offline toggle.
- Normalisasi endpoint otomatis (`/v1/chat/completions`).
- Fallback template otomatis jika LLM offline, timeout, atau mengembalikan error.

## 5. Metrik Keberhasilan

| Metrik | Target |
|---|---|
| Runtime footprint | RAM ±60–90 MB, CPU idle < 1% |
| Ukuran installer MSI | ≤ 4 MB |
| Startup time | < 1 detik |
| Test suite | 100% test passing (peta, A*, parser JSON, packaging, PPTX) |
| Integritas paket deliverable | Semua file teks, CSV, gambar PNG, dan PPTX valid dan dapat dibuka oleh aplikasi OS native |
