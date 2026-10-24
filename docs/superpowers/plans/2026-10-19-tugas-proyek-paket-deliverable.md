# Rencana Implementasi: Tugas Proyek & Paket Deliverable

> **Untuk pelaksana:** kerjakan task berurutan. Tiap task punya langkah verifikasi; JANGAN lanjut sebelum verifikasi hijau. Setelah semua task selesai, jalankan Task 10 (QA akhir).
>
> **Spec sumber (source of truth):** `docs/superpowers/specs/2026-10-19-tugas-proyek-deliverable-design.md` (rev 3 — Native Rust).
>
> **Sasaran akhir:** Direktur menulis satu brief bebas → semua divisi kelihatan bekerja real-time → paket file nyata tersimpan di `Documents\PixelSinergi\<tanggal> - <slug>\` (termasuk `kode/` = kode proyek sesuai brief, bukan mini website) + bisa dibaca ulang di aplikasi. Selalu playable offline via template.

---

## Konteks Teknis (baca dulu, 1 menit)

- **Stack:** Native Rust (`eframe`/`egui` + OpenGL). Tanpa JavaScript, tanpa WebView, tanpa Bun.
- **Jalur dev:** `cargo run` (dari root). Build cek: `cargo check`, `cargo build --release`.
- **Test:** `cargo test` (unit test bawaan Rust, tanpa dependency baru).
- **Waktu:** Jam lokal OS (`chrono::Local::now()`). Fase: Dini hari (00–05), Pagi buta (05–07), Jam kerja (07–12), Istirahat (12–13), Sore (13–17), Jam pulang (17–18), Lembur (18–23).
- **Feed:** `sim.push_feed(channel, text)`. Channel valid: `kerja`, `gosip`, `direksi`, `sistem`, `proyek`, `pantry`, `insiden`.
- **LLM:** `llm::chat(settings, system, user, max_tokens, timeout)` → `ChatResult { ok, text, error }`. Endpoint OpenAI-compatible.
- **Deliverable:** `deliver::run(req, progress)` di worker thread. Hasil disimpan ke `Documents\PixelSinergi\<folder>\`.
- **Keamanan:** `util::sanitize_rel_path` memvalidasi path. Zero execution policy.

---

## Batasan Global (semua task)

1. Semua teks user-facing **Bahasa Indonesia** (gaya kantor satir, konsisten dengan game).
2. **Tanpa dependency JS baru.** Semua dependency Rust sudah ada di `Cargo.toml`.
3. App **tidak pernah** mengeksekusi/compile kode hasil LLM. Batas keamanan keras.
4. Semua file I/O harus melalui `sanitize_rel_path`.
5. UI thread tidak boleh diblokir oleh operasi LLM atau file I/O panjang.

---

## Task List

### Task 1: Deteksi Jenis & Stack Proyek
- [ ] Implementasi `data::detect_kind(brief)` dan `data::detect_stack(brief)`
- [ ] Unit test: berbagai input brief → kind dan stack yang benar
- [ ] Verifikasi: `cargo test` hijau

### Task 2: Inisialisasi Proyek & Tonggak
- [ ] `sim.start_project(brief)` → buat `Project` baru, lock agen ke meja
- [ ] 5 tonggak divisi (IT, Marketing, Finance, HRD, GA) dengan persentase trigger
- [ ] Feed proyek aktif saat tonggak tercapai
- [ ] Verifikasi: `cargo test` hijau

### Task 3: Generator Konten (LLM + Template)
- [ ] Prompt engineering di `llm.rs` untuk konten proyek
- [ ] Parser respons LLM ke struct `PlanContent`
- [ ] Template fallback prosedural (selalu tersedia)
- [ ] Verifikasi: `cargo test` hijau

### Task 4: Generator Kode (Scaffold + LLM)
- [ ] Scaffold kode berdasarkan `detect_stack`
- [ ] Sanitasi path dan kapasitas (40 file, 60 KB/file, 400 KB total)
- [ ] README.md selalu dijamin
- [ ] Verifikasi: `cargo test` hijau

### Task 5: Generator Gambar (Poster, Ikon, GIF)
- [ ] `imagegen::render_poster()` → poster 1080×1080 px
- [ ] `imagegen::render_icon()` → ikon 512×512 px
- [ ] `imagegen::render_promo_gif()` → animasi promo
- [ ] Verifikasi: file output valid dan dapat dibuka

### Task 6: Generator PPTX (Presentasi)
- [ ] Integrasi `ppt-rs` untuk slide PPTX asli
- [ ] Speaker notes dalam bahasa Indonesia
- [ ] Verifikasi: file PPTX valid dan dapat dibuka di PowerPoint

### Task 7: Penyusunan Paket & Penulisan ke Disk
- [ ] `deliver::run()` orkestrasi semua generator
- [ ] Penulisan ke `Documents\PixelSinergi\<folder>\`
- [ ] Manifest file (`FileEntry`) dengan status ok/fail
- [ ] Verifikasi: folder dan file tercipta dengan benar

### Task 8: Arsip & Modal Hasil
- [ ] Simpan `Delivered` ke `sim.archive`
- [ ] Tampilkan modal hasil di UI (`egui`)
- [ ] Tombol "Buka Folder" → `deliver::open_folder()`
- [ ] Badge sumber (LLM / Template)

### Task 9: Edge Cases & Fallback
- [ ] Proyek melewati jam pulang → status `late`, konten template
- [ ] LLM timeout/gagal → fallback template
- [ ] Disk penuh → graceful error, toast notification
- [ ] Verifikasi: `cargo test` hijau

### Task 10: QA Akhir
- [ ] `cargo test` → semua hijau (23/23 passed)
- [ ] `cargo run -- --gen-sample` → 3 contoh paket valid
- [ ] `cargo build --release` → exe berjalan mulus
- [ ] Installer MSI → build berhasil via `bash scripts/build-msi.sh`
- [ ] Manual test: brief bebas → proyek selesai → folder tercipta → file valid
