# Spec: Tugas Proyek & Paket Deliverable — PT Pixel Sinergi Nusantara Tbk

- **Tanggal:** 2026-10-19 (revisi 2)
- **Status:** Disetujui sebagian — menunggu review revisi 2 ("IT mengerjakan proyek sesuai brief")
- **Pendekatan:** A — modul proyek mandiri (`src/agents/projects.js`) + renderer artefak (`src/artifacts/`)
- **Riwayat:** Rev 1 = dokumen markdown tunggal. Rev 2 = paket file nyata per divisi; IT menghasilkan kode proyek free-form sesuai brief Direktur.

---

## 1. Tujuan

Direktur (pemain) menerbitkan **tugas proyek** bebas (contoh: *"buat aplikasi
desktop Tauri + Rust + SQLite + vanilla JS + Vite"*). Semua karyawan
mengerjakannya secara terlihat (mode fokus), progres berjalan mengikuti waktu
game, lalu keluar **paket proyek nyata**: laporan, poster, dan file-file hasil
kerja tiap divisi — termasuk **kode proyek IT yang sesuai dengan brief**,
disimpan ke folder di disk.

Prinsip kunci: **LLM = konten, kode = perakit file.** LLM menghasilkan teks,
angka, dan kode proyek; renderer lokal merakit artefak (poster PNG, CSV, memo)
sehingga bentuk file selalu valid dan aplikasi tetap jalan tanpa API.

## 2. Keputusan Produk (hasil brainstorming)

| Topik | Keputusan |
|---|---|
| Bentuk output | **Paket folder** otomatis tersimpan di disk + dibaca di aplikasi + tombol "Buka Folder" |
| Cara pengerjaan | Bertahap & terlihat: agen fokus di meja, progres ±20–40 menit game |
| Pembagian kerja | Semua divisi menyumbang bagian laporan **dan** artefak file masing-masing |
| IT | **Kode proyek sesuai brief Direktur** (free-form, stack apa pun yang disebut) — bukan template situs statis |
| Marketing & Creative | Poster promosi pixel-art + ikon aplikasi (bonus) + caption siap posting |
| Finance | RAB/anggaran `.csv` siap dibuka Excel |
| HRD | Memo internal `.md` ber-kop surat |
| GA | Checklist logistik/rundown `.csv` |
| Video promosi | **Ditunda ke fase 2** (WebM dari canvas; format belum tentu siap sosmed) |
| Gambar AI non-pixel | Masa depan — tergantung router punya model gambar; V1 pakai render lokal pixel-art |
| Bahasa | Semua dialog & artefak Bahasa Indonesia |
| Offline | Wajib tetap menghasilkan paket: teks via bank fallback, kode via kerangka bawaan |
| Proyek aktif | Maksimum **1** dalam satu waktu |
| Eksekusi kode hasil LLM | **TIDAK** dijalankan/di-compile oleh aplikasi (keamanan) — user buka & uji sendiri via README |

## 3. Isi Paket Proyek (folder di disk)

```
Documents\PixelSinergi\<YYYY-MM-DD> - Hari <n> - <slug-judul>\
  ├─ laporan.md            (laporan induk 5 divisi + lampiran + catatan QA)
  ├─ poster.png            (1080×1080, pixel-art, siap sosmed)
  ├─ ikon-app.png          (512×512, bonus dari Marketing/Creative — logo sederhana)
  ├─ caption-sosmed.txt    (caption + hashtag siap copy-paste)
  ├─ anggaran.csv          (Finance; delimiter ';' + BOM UTF-8 agar rapi di Excel ID)
  ├─ memo-sdm.md           (HRD; kop surat + memo)
  ├─ checklist-ga.csv      (GA; rundown/kebutuhan logistik)
  └─ kode\                 (IT; kode proyek sesuai brief — jumlah file bebas dalam batas)
       ├─ (hasil LLM, mis. package.json, index.html, src\, src-tauri\, README.md, .gitignore)
       └─ README.md        (dijamin ada; ditambah otomatis bila LLM tidak menyertakan)
```

- Auto-save **segera setelah proyek selesai**; toast menampilkan path folder.
- Tombol **📁 Buka Folder** membuka folder di Explorer.
- Mode browser (dev): unduh file lewat Blob (bisa muncul prompt "izinkan unduhan ganda").

## 4. Alur Lengkap

```
📜 Modal Titah (kartu "Tugas Proyek" + textarea brief)
        │  klik "Mulai Proyek"
        ▼
directives.send('proyek', brief) ──► ProjectManager.start()
        (tolak + toast kalau masih ada proyek aktif)     │
                                                         ▼
main loop ── tiap frame (gameMinutes, hanya saat tidak pause)
        │            └──► ProjectManager.update()
        │                      ├─ progres naik linear 0→100%
        │                      ├─ tonggak per divisi → feed 'proyek'
        │                      └─ behavior.js: agen "Fokus proyek: <judul>"
        │
        ▼ progres 100% → ProjectManager.complete()
   ┌─ Panggilan LLM A (konten) → sections, poster, caption, budget, ga, memo
   ├─ Panggilan LLM B (kode)   → files[] kode proyek sesuai brief
   │     (masing-masing: gagal / tidak ada LLM → bagiannya dari fallback)
   ├─ Renderer lokal: poster.png + ikon-app.png (canvas)
   ├─ Builder lokal: laporan.md, caption.txt, *.csv, memo.md (selalu valid)
   └─ Normalisasi kode: sanitasi path, whitelist ekstensi, batas ukuran,
         cek JSON rusak (ditandai ⚠️), jamin README ada
        ▼
   Simpan paket (Tauri: tulis ke folder; browser: unduh)
   Simpan ulang di arsip sesi + modal 📁 Proyek (preview poster + isi laporan
   + daftar file & status) — auto-terbuka bila tidak ada modal lain;
   kalau ada → toast + widget "Lihat Hasil"
        ▼
   Feed "✅ Proyek selesai — paket tersimpan" + counter & judul di laporan harian
```

- Pause → progres berhenti (memakai `gameMinutes`).
- Blok makan siang/istirahat tetap jalan; blok pulang (17:00–18:00) saat proyek
  aktif → semua divisi fokus di meja (lembur paksa).
- Ganti hari (18:00) saat proyek jalan → `finalizeLate()`: paket langsung dibuat
  dari fallback (tanpa panggilan LLM) + disclaimer "dikejar deadline", status `late`.

## 5. Komponen & File

### Baru
| File | Isi |
|---|---|
| `src/agents/projects.js` | `ProjectManager`: `start()`, `update(gameMinutes)`, `complete()` (pipeline A+B), `finalizeLate()`, `savePackage()`, `openFolder()`; getter `isActive`/`active`/`archive` |
| `src/artifacts/poster.js` | `renderPoster(project)` & `renderAppIcon(project)` → `{ dataUrl, width, height }` (canvas local, pixel-art) |
| `src/artifacts/files.js` | Builder string murni: `buildReportMd`, `buildCaptionTxt`, `buildBudgetCsv`, `buildMemoMd`, `buildGaChecklistCsv` |
| `src/artifacts/code.js` | Normalisasi payload kode LLM: sanitasi path, whitelist ekstensi, batas ukuran/jumlah, cek JSON, jamin README; `pickFallbackTemplate(brief)` |
| `src/artifacts/templates.js` | 2 kerangka bawaan (valid, minimal): `tauri-sqlite-starter`, `vite-vanilla-starter` — dipakai saat offline/gagal |

### Disentuh
| File | Perubahan |
|---|---|
| `src/agents/directives.js` | Preset `proyek` + `case 'proyek'` → `sim.projects.start(brief)`; tolak bila aktif |
| `src/agents/behavior.js` | Mode fokus saat `sim.projects.isActive && blok kerja/pulang`; peluang trip kopi −50%; kunjungan lintas divisi dimatikan |
| `src/main.js` | Instansiasi `sim.projects`; `update(gameMinutes)`; `finalizeLate()` di `endDay`; counter `stats.projects` + `projectsToday`; `sim.openProject()` |
| `src/ui/modals.js` | Kartu "📋 Tugas Proyek" + textarea `#dir-project`; modal 📁 Proyek: preview poster, kartu laporan, daftar file + status, tombol |
| `src/ui/hud.js` | Widget progres + tombol "📁 Proyek" (≥1 proyek) |
| `src/ui/feed.js` | Channel `proyek` (teal) |
| `src/llm/prompts.js` | `buildProjectContentPrompt` (A) + `buildProjectCodePrompt` (B) |
| `src/llm/fallback.js` | Bank fallback: sections, poster copy, caption, budget, ga, memo |
| `src/style.css` | Widget, kartu laporan, daftar file, preview poster |
| `src-tauri/src/lib.rs` | Command `save_project_package` + `open_path`; registrasi `invoke_handler` |

## 6. Panggilan LLM (2 tahap, berurutan)

Aturan antrian global tetap: satu request aktif (`sim.conversations.llmBusy`),
tunggu maks 25 dtk saat sibuk; percakapan pasangan tidak menyela pipeline.
Pipeline proyek boleh menembak A→B berurutan tanpa cooldown percakapan.

### A — Konten (`buildProjectContentPrompt`)
- `maxTokens: 2000`, `timeoutSecs: 60`.
- Keluaran JSON (toleran, tiap kunci opsional — yang hilang dari fallback):
```json
{
  "sections": [
    {"division":"it","title":"…","text":"…"},
    {"division":"marketing","title":"…","text":"…"},
    {"division":"finance","title":"…","text":"…"},
    {"division":"hrd","title":"…","text":"…"},
    {"division":"ga","title":"…","text":"…"}
  ],
  "poster":   {"headline":"…(≤24 char)","tagline":"…(≤60)","hashtags":["#…","#…","#…"]},
  "caption":  "…(≤240 char, siap posting + hashtag)",
  "budget":   [{"item":"…","qty":2,"unit":"pcs","price":250000,"note":"…"}],
  "ga":       [{"category":"…","item":"…","qty":2,"owner":"…","status":"…"}],
  "memo":     {"subject":"…","body":"…(≤400 char)","closing":"…"}
}
```
- Batas: sections tiap `text` ≤350 char; budget & ga 5–8 baris; semua teks Bahasa Indonesia.

### B — Kode proyek (`buildProjectCodePrompt`)
- `maxTokens: 8000`, `timeoutSecs: 90`.
- Konteks: brief mentah + aturan "WAJIB mengikuti teknologi yang disebut di brief"
  (contoh: Tauri + Rust + SQLite + vanilla JS + Vite ⇒ bikin struktur itu, bukan
  situs statis), permintaan file lengkap & bisa dijalankan, sertakan README cara
  menjalankan, `.gitignore` bila relevan, jangan sertakan kredensial/binari/lockfile.
- Keluaran JSON:
```json
{"stack":"tauri+rust+sqlite+vite","files":[{"path":"package.json","content":"…"}],"run":["bun install","bun run tauri dev"]}
```
- Batas keras (dikirim di prompt & ditegakkan di `code.js`):
  - maks **14 file**; per file **≤24KB**; total **≤160KB**; kedalaman path ≤4.
  - ekstensi whitelist: `.js .mjs .cjs .ts .tsx .jsx .html .css .json .md .rs .toml .yaml .yml .sql .txt .gitignore .example` (dotfile `.gitignore` diizinkan).
  - path relatif saja; tolak `..`, absolut, `node_modules`, `target`, `dist`.
  - lebih dari batas → ambil file yang muat (prioritas `README`, config, sumber), sisanya dibuang + catat di manifest.
- `.json` dicek `JSON.parse`; gagal → tetap disimpan tapi ditandai ⚠️ di manifest & catatan QA.
- Bila B gagal/mati → `pickFallbackTemplate(brief)`:
  - kata kunci tauri/rust/desktop/exe → `tauri-sqlite-starter`
  - kata kunci vite/web/situs/landing/react → `vite-vanilla-starter`
  - default → `vite-vanilla-starter`
  - README kerangka menjelaskan "dibuat dalam mode offline — kerangka dasar, tandai TODO".

### Badge sumber (per bagian)
- Semua dari LLM → **"LLM"**; campuran → **"LLM + Template"**; semua fallback → **"Template offline"**.

## 7. Struktur Data

```js
// sim.projects
{
  active: null | Project,
  archive: Project[],          // sesi ini, terbaru di depan
}

Project = {
  id: 'prj_<uid>',
  title: string,               // brief pemain (≤160 char)
  day: number,
  startedAtMin: number,
  durationMin: number,         // 20–40
  elapsedMin: number,
  milestones: {                // division -> { done, atPct }
    it: { done:false, atPct:20 }, marketing: { done:false, atPct:36 },
    finance: { done:false, atPct:52 }, hrd: { done:false, atPct:68 },
    ga: { done:false, atPct:84 },
  },
  status: 'running' | 'done' | 'late',
  content: {                   // hasil A (dinormalisasi, tiap kunci terisi)
    sections: [{ division, title, text }],
    poster: { headline, tagline, hashtags },
    caption, budget: [...], ga: [...], memo: { subject, body, closing },
  },
  code: {                      // hasil B
    stack: string,
    files: [{ path, content, ok: boolean }],   // ok=false → JSON rusak dll
    run: [string],
    fallback: boolean,
  },
  posterDataUrl: string,       // untuk preview di modal
  iconDataUrl: string,
  files: [{                    // manifest paket
    relPath: string, kind: 'text'|'binary', bytes: number,
    status: 'pending'|'saved'|'downloaded'|'failed',
    warn: boolean,             // true = JSON rusak / file dipotong karena batas (⚠️)
  }],
  folderName: string,          // '<YYYY-MM-DD> - Hari <n> - <slug>'
  folderPath: string | null,   // hasil save (Tauri)
  source: 'llm' | 'mixed' | 'template',
  finishedAtMin: number | null,
}
```

`stats` tambahan: `projects` (counter sesi), `projectsToday: string[]` (judul selesai
hari ini; direset saat pergantian hari; dipakai laporan).

## 8. Renderer Lokal (canvas, selalu jalan)

- **Poster** (`renderPoster`): 1080×1080. Gaya pixel-art: latar navy `#0f1220` +
  grid halus, frame emas blok, header perusahaan kecil, judul besar uppercase
  (wrap maks 3 baris), tagline, 3 hashtag bawah, footer "PT Pixel Sinergi
  Nusantara Tbk · Hari n · 2026". Opsional: 2 sprite agen sebagai ilustrasi
  (bila API sprite tersedia; kalau tidak, ornamen pixel).
- **Ikon app** (`renderAppIcon`): 512×512. Tile navy membulat + border emas +
  inisial/ikon pixel sederhana dari judul proyek.
- Keduanya `toDataURL('image/png')` → base64 → Rust (binary) / Blob (browser).

## 9. Builder Lokal (teks, selalu valid)

- `laporan.md`: judul, Hari/jam, sumber per bagian, 5 bagian divisi, **daftar
  lampiran paket**, **Catatan QA** ("kode hasil AI belum diuji; ada yang perlu
  direview — pesan Salsa"), status "Menunggu ACC Direktur", disclaimer `late`.
- `caption-sosmed.txt`: caption + baris hashtag.
- `anggaran.csv`: header `Item;Qty;Satuan;Harga Satuan;Total;Catatan` + baris +
  baris `TOTAL;;;;<jumlah>;`. Angka polos (tanpa pemisah ribuan). BOM UTF-8.
- `memo-sdm.md`: kop `PT PIXEL SINERGI NUSANTARA Tbk` + `MEMORANDUM INTERNAL`,
  `No: HRD-<n>/<hari>`, Kepada/Dari/Perihal, isi, salam penutup.
- `checklist-ga.csv`: header `Kategori;Item;Qty;PIC;Status`. BOM UTF-8.
- Semua sel: escape `;`/newline (bungkus kutip), buang karakter kontrol.

## 10. Command Rust (2 buah)

```rust
#[derive(Deserialize)]
struct PackageFile { rel_path: String, content: String, #[serde(default)] is_base64: bool }

#[derive(Serialize)]
struct SaveResult { folder: String, saved: Vec<String>, failed: Vec<String> }

#[tauri::command(rename_all = "snake_case")]
fn save_project_package(app: tauri::AppHandle, dir_name: String, files: Vec<PackageFile>)
    -> Result<SaveResult, String>

#[tauri::command]
fn open_path(path: String) -> Result<(), String>
```

- `save_project_package`: **satu invoke menulis seluruh paket** (bukan per file,
  supaya dedupe folder konsisten). Resolve `document_dir()` →
  `PixelSinergi/<dir_name>`; sanitasi `dir_name`/`rel_path` (relatif, tanpa `..`,
  blokir reserved name Windows `CON`/`NUL`/…); anti-timpa folder (suffix `-2`,
  `-3`, … dicek sekali di awal); buat parent folder otomatis; `is_base64=true` →
  decode PNG via crate `base64`; file yang gagal masuk `failed[]`, sisanya tetap
  ditulis; return `{ folder, saved[], failed[] }`.
- `open_path`: Windows `explorer`, macOS `open`, Linux `xdg-open`.
- Browser (dev): Blob unduh per file; tidak melempar error.

## 11. UI Detail

- **Modal Titah**: kartu ke-7 `📋 Tugas Proyek — "Tulis brief; semua divisi kerja."`
  Saat aktif: textarea `#dir-project` (maxlength 160, min 8) + tombol
  "🚀 Mulai Proyek". Kartu lain → perilaku lama.
- **Widget progres** (panel statistik): judul, progress bar, 5 dot divisi.
  Selesai → "📄 Lihat Hasil". Tombol kecil "📁 Proyek" untuk arsip (≥1 proyek).
- **Modal 📁 Proyek**: header (judul, Hari/jam, badge sumber), preview `poster.png`,
  kartu 5 bagian laporan, **daftar file paket** (nama + status ✅/⚠️/❌),
  penutup "Menunggu ACC Direktur", footer: `📁 Buka Folder` · `💾 Simpan Ulang` ·
  `📋 Copy Laporan` · `📋 Copy Caption` · dropdown arsip · Tutup. Setelah simpan:
  tampil path folder.
- **Feed `proyek`**: mulai + 5 tonggak + `✅ Proyek "<judul>" selesai — paket
  tersimpan di Documents\PixelSinergi\…`.
- **Laporan harian**: counter `📋 Proyek` + daftar judul selesai hari itu.

## 12. Error Handling & Edge Case

| Kasus | Perlakuan |
|---|---|
| Proyek kedua saat satu jalan | Tolak + toast "Masih ada proyek '<judul>' yang dikerjakan, Pak." |
| Brief kosong / <8 char | Tombol kirim tidak jalan + hint |
| LLM A gagal / parse rusak | Bagian teks dari bank fallback; badge menyesuaikan |
| LLM B gagal / timeout | Kerangka bawaan (`pickFallbackTemplate`) + badge |
| JSON kode rusak | File tetap disimpan, ditandai ⚠️ di manifest + Catatan QA laporan |
| File kode melebihi batas | Dipotong sesuai prioritas, dicatat di manifest |
| Simpan sebagian gagal | Status per file ❌ + toast; tombol "Simpan Ulang" |
| Ganti hari saat jalan | `finalizeLate()`: paket fallback instan + disclaimer, status `late` |
| Pause | Progres & tonggak berhenti |
| Semua agen `gone` | Proyek tetap jalan; dokumen dibuat di akhir |

## 13. Batas Scope (YAGNI)

- **Video promosi**: fase 2 (WebM canvas; format belum tentu siap sosmed).
- **Gambar AI non-pixel**: masa depan, tergantung model gambar di router.
- **Tidak ada eksekusi kode**: app tidak `bun install`/compile/run kode hasil LLM.
- Tidak ada: task board, banyak proyek paralel, penugasan manual, deadline/kalender,
  revisi dokumen, editor kode dalam app, zip, plugin dialog/fs baru.
- Riwayat lintas sesi di UI: tidak (arsip = sesi; file di disk permanen).

## 14. Testing

1. `bun run build` + `cargo check` tiap tahap besar.
2. E2E dev server (agent-browser): terbitkan proyek → widget & label fokus →
   percepat jam via `window.__PIXEL_SIM__` → modal hasil: poster tampil, 5 kartu,
   daftar file; copy laporan & caption.
3. Offline: kosongkan Base URL → paket lengkap dari fallback; kode =
   `tauri-sqlite-starter` bila brief menyebut Tauri; badge "Template offline".
4. Rollover: mulai proyek mendekati 18:00 → status `late` + disclaimer.
5. Smoke desktop (exe release): sekali selesai → cek di
   `Documents\PixelSinergi\<folder>`: laporan.md, poster.png, ikon-app.png,
   caption-sosmed.txt, anggaran.csv, memo-sdm.md, checklist-ga.csv, `kode/`.
6. Sanity kode: `README.md` ada; file `.json` yang rusak tertandai; batas ukuran ditegakkan.
7. Bersihkan artefak QA (screenshot/script sementara).

## 15. Dokumentasi yang Diperbarui

- `README.md` — fitur paket proyek + cara pakai.
- `docs/PRD.md` — user story "US-08 Tugas Proyek & Paket Deliverable".
- `docs/RULES.md` — mekanik proyek (durasi, progres, pipeline LLM, paket, `late`).
- `docs/SCHEMA.md` — struktur `Project` + counter stats.
- `docs/ARCHITECTURE.md` — `projects.js`, `src/artifacts/`, command Rust.

## 16. Acceptance Criteria

1. Kartu "Tugas Proyek" bisa memulai proyek dari brief bebas; proyek kedua ditolak.
2. Selama blok kerja, semua agen non-statis berlabel "Fokus proyek: …" di meja.
3. Widget progres naik; 5 tonggak divisi tampil di feed.
4. Selesai: paket **tersimpan otomatis** di `Documents\PixelSinergi\<folder>` dengan
   laporan.md, poster.png, ikon-app.png, caption-sosmed.txt, anggaran.csv,
   memo-sdm.md, checklist-ga.csv, dan `kode/`.
5. Brief "buat aplikasi desktop Tauri + Rust + SQLite + vanilla JS + Vite" (LLM aktif)
   → `kode/` berisi struktur proyek Tauri (config Rust + frontend), bukan situs statis.
6. Offline → paket tetap lengkap; `kode/` = kerangka bawaan; badge "Template offline".
7. File `.json` rusak tertandai ⚠️; README kode selalu ada.
8. Modal: preview poster, kartu 5 divisi, daftar file + status, tombol Buka Folder /
   Simpan Ulang / Copy Laporan / Copy Caption; arsip bisa dibuka ulang.
9. Laporan harian memuat counter + judul proyek selesai; feed menampilkan milestone.
10. Ganti hari saat proyek jalan → status `late` + disclaimer; pause menghentikan progres.
11. `bun run build` + `cargo check` hijau; tidak ada error di E2E.

## 17. Rencana Implementasi (ringkas)

1. **Core offline end-to-end**: `projects.js` + fallback bank + `files.js` +
   `templates.js` + `save_project_package`/`open_path` + wiring + widget →
   paket teks & kerangka kode sudah tersimpan.
2. **Perilaku fokus**: `behavior.js` (kerja/pulang fokus, kopi −50%, kunjungan off).
3. **Poster & ikon**: `poster.js` + preview di modal.
4. **LLM A (konten)**: `buildProjectContentPrompt` + parsing toleran + badge.
5. **LLM B (kode)**: `buildProjectCodePrompt` + normalisasi/batas + fallback stack.
6. **UI final + docs + E2E + pembersihan artefak QA.**
