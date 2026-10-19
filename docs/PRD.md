# 📋 PRD — PT Pixel Sinergi Nusantara Tbk

**Versi:** 1.0.0 · **Status:** Approved · **Tanggal:** 19 Oktober 2026

---

## 1. Latar Belakang

Dunia kerja kantor Indonesia penuh dengan dinamika unik: obrolan pantry, drama reimburse, perang suhu AC, hingga typo maut yang terkirim ke grup Direksi. Fenomena ini sangat relatable, lucu, dan hampir tidak pernah disimulasikan dalam bentuk yang interaktif.

**PT Pixel Sinergi Nusantara Tbk** adalah simulasi desktop bergaya pixel art di mana pengguna menjadi Direktur Utama dan mengamati (serta memprovokasi) kantor yang dihuni karyawan-karyawan AI dengan kepribadian khas Indonesia.

## 2. Tujuan Produk

1. **Menghibur**: Menjadi "tontonan hidup" kantor fiktif yang lucu — seperti reality show pixel art.
2. **Relatable**: Humor yang dekat dengan pengalaman kerja/kuliah/organisasi pengguna Indonesia.
3. **Fleksibel**: Berjalan penuh tanpa API (mode offline) namun lebih pintar dengan LLM custom endpoint (9router, OpenRouter, Ollama, dsb.).
4. **Ringan**: Desktop app Tauri — binary kecil (< 20 MB), RAM hemat (< 100 MB), jalan lancar di laptop kantor tipikal.

### Non-Goals (Sekarang)
- ❌ Multiplayer / networking antar pengguna
- ❌ Akun, login, atau sinkronisasi cloud
- ❌ Ekonomi in-game kompleks (pajak, payroll real)
- ❌ Modding / scripting oleh pengguna

## 3. Persona Pengguna

| Persona | Deskripsi | Kebutuhan |
|---|---|---|
| **"Bos" — Direktur Utama (P0)** | Pengguna utama. Suka mengamati, memprovokasi kantor, dan menertawakan drama. | Monitoring menyeluruh, intervensi lucu (Titah Direksi), feedback cepat & jelas. |

## 4. User Stories & Acceptance Criteria

### US-01 — Menonton Kantor Hidup
> Sebagai Direktur, saya ingin melihat kantor pixel dengan karyawan yang bergerak dan beraktivitas, agar terasa hidup.

**Acceptance:**
- Karyawan berjalan dari meja ke pantry, duduk, mengetik, minum kopi dengan animasi.
- Rutinitas harian berjalan otomatis dari jam 08:30 hingga 18:00 lalu berganti hari.
- Pergerakan memakai pathfinding (tidak menembus dinding/furniture).

### US-02 — Membaca Obrolan Karyawan
> Sebagai Direktur, saya ingin membaca obrolan karyawan secara real-time, agar bisa mengintip drama kantor.

**Acceptance:**
- Dialog muncul sebagai balon kata (speech bubble) di atas kepala karakter.
- Semua dialog masuk ke **Office Feed** dengan timestamp + tab filter (Semua/Kerja/Gosip/HR).
- Tanpa API key: dialog berasal dari bank procedural yang kontekstual (tempat, divisi, waktu).
- Dengan API key: dialog digenerate LLM dengan kepribadian masing-masing karakter.
- Selalu ada fallback saat LLM timeout/gagal — simulasi tidak pernah macet.

### US-03 — Inspeksi Karyawan
> Sebagai Direktur, saya ingin mengklik karyawan dan melihat profil & kondisinya.

**Acceptance:**
- Panel inspector menampilkan: nama, jabatan, divisi, level, mood, stress, kecanduan kopi, status aktivitas, kutipan terakhir.
- Klik karyawan di canvas ATAU di feed/daftar agen membuka inspector + pan camera ke lokasi.

### US-04 — Titah Direksi
> Sebagai Direktur, saya ingin mengeluarkan perintah yang membuat kantor bereaksi.

**Acceptance:**
- Tersedia preset: Rapat Dadakan, Potong Budget Kopi, Lembur Malam Ini, Pizza Party, Batik Day, Bebas Seharian, plus input custom bebas.
- Bawahan merespons dengan bahasa **formal** (ke atasan) untuk 2–4 karyawan terpilih.
- Setelah itu muncul reaksi **gosip informal** antar sesama karyawan.
- Efek simulasi nyata: rapat → semua berkumpul di Meeting Room; potong budget → kopi tidak lagi menaikkan mood; pizza → mood naik; dll.
- Semua tercatat di feed channel "direksi".

### US-05 — Insiden Otomatis
> Sebagai Direktur, saya ingin drama terjadi sendiri tanpa saya, agar tontonan tetap seru.

**Acceptance:**
- Insiden acak muncul sesuai jadwal probabilitas: keceplosan chat ke bos, perang AC, reimburse ditolak, printer rusak, KPI reminder, ulang tahun, BSOD.
- Setiap insiden: dialog multi-karakter + notifikasi toast + efek statistik.
- Insiden "keceplosan" selalu memicu respon HRD (teguran) dan permintaan maaf formal ke Direktur.

### US-06 — Pesan Suara: Gaul vs Formal
> Sebagai pemilik perusahaan, saya ingin budaya bicara kantor terjaga: gaul ke teman, formal ke atasan.

**Acceptance:**
- Sistem tone otomatis berdasar perbandingan level: ke atasan = formal; sesama/ke bawahan = gaul (gaya per kepribadian).
- Aturan ini tertanam di prompt LLM DAN di bank dialog procedural.
- Contoh dokumentasi lengkap ada di `docs/RULES.md`.

### US-07 — Konfigurasi LLM Fleksibel
> Sebagai pengguna teknis, saya ingin memakai endpoint LLM apa pun yang saya punya.

**Acceptance:**
- Settings: Base URL, API Key, Model, Temperature, Max Tokens, Timeout.
- Mendukung format OpenAI-compatible `POST {base}/chat/completions`.
- Tombol Test Koneksi menampilkan OK/error dengan pesan jelas.
- Di Tauri, request diproxy Rust (bebas CORS). Di browser, via fetch langsung.
- Config persist (JSON di app config dir / localStorage).

### US-08 — Kontrol Waktu
> Sebagai Direktur, saya ingin mempercepat/menjeda waktu kantor.

**Acceptance:**
- Kecepatan 1x/2x/4x/8x/16x + Pause.
- Jam game + hari ditampilkan di HUD.

## 5. Metrik Keberhasilan

| Metrik | Target |
|---|---|
| FPS render saat 10 agen aktif | ≥ 55 FPS di laptop mid-range |
| Waktu start aplikasi | < 3 detik |
| Ketersediaan konten tanpa API | Simulasi hidup ≥ 2 jam tanpa pengulangan mencolok |
| RAM terpakai (Tauri release) | < 120 MB |
| Ukuran installer Windows | < 20 MB |

## 6. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| LLM lambat/rate limit | Dialog telat, suasana rusak | Timeout 15s + fallback procedural instan + antrian 1 request |
| Repetisi dialog offline | Bosan | Bank template besar + pemilihan berbobot + variasi persona |
| Endpoint non-OpenAI | Setting user gagal | Dokumentasi jelas "OpenAI-compatible only" + test koneksi |
| Performa render | Lag | Pre-render map & sprite ke offscreen canvas; DOM hanya untuk UI/bubble |

## 7. Rilis

- **v0.1 (MVP)** — Semua US di atas (yang sedang dibangun sekarang).
- **v0.2 (Backlog)** — Event tanggal merah, cuti bareng, PHK satire, evaluasi tahunan, mode "audit".
