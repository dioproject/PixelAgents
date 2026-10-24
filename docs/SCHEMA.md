# 🗃️ SCHEMA — Skema Data PT Pixel Sinergi Nusantara Tbk (Native Rust)

Seluruh struktur data domain utama didefinisikan dalam kode sumber Rust (`src/`). Dokumen ini mencatat skema data runtime dan berkas konfigurasi.

---

## 1. Pengaturan Aplikasi (`Settings`)

Disimpan di disk lokal pengguna pada `%APPDATA%\PixelSinergi\settings.json`.

```rust
pub struct Settings {
    pub base_url: String,           // Mis. "https://openrouter.ai/api/v1" atau "http://localhost:11434"
    pub api_key: String,            // Kunci API (opsional untuk endpoint lokal)
    pub model: String,              // Mis. "gpt-4o-mini"
    pub temperature: f32,           // 0.0 - 2.0 (default: 0.9)
    pub max_tokens: u32,            // Batas token per permintaan (default: 900)
    pub timeout_secs: u64,          // Waktu tunggu HTTP (default: 60)
    pub offline: bool,              // true = memaksa penggunaan template prosedural tanpa jaringan
    pub project_pace_secs: f32,     // Durasi pengerjaan proyek dalam detik (default: 300.0)
    pub compact: bool,              // Tampilan kompak UI
    pub always_on_top: bool,        // Jendela selalu di atas
    pub sound: bool,                // Efek audio aktif
    pub show_names: bool,           // Tampilkan nama di atas karakter
}
```

---

## 2. Divisi Kantor (`Div`)

Didefinisikan dalam `src/office.rs`:

```rust
pub enum Div {
    It,         // "IT & Engineering"   (Warna: [0x8f, 0xb3, 0xff])
    Marketing,  // "Marketing & Creative" (Warna: [0xff, 0x9e, 0xc4])
    Finance,    // "Finance & Accounting" (Warna: [0x9f, 0xe6, 0xa0])
    Hrd,        // "HRD & People Ops"   (Warna: [0x7c, 0xe0, 0xd6])
    Ga,         // "General Affairs"    (Warna: [0xff, 0xd9, 0x8a])
    Exec,       // "Direksi"            (Warna: [0xff, 0xc8, 0x57])
}
```

---

## 3. Roster Karyawan Statis (`AgentDef`)

Didefinisikan dalam `src/data.rs`:

```rust
pub struct AgentDef {
    pub id: &'static str,               // "bayu", "jessica", "endang", dll.
    pub name: &'static str,             // Nama tampilan
    pub role: &'static str,             // Jabatan
    pub div: Div,                       // Divisi kerja
    pub level: u8,                      // 1: Junior/Staff, 2: Senior/Lead, 3: Head/Manager
    pub style: &'static str,            // Karakteristik gaya bicara untuk prompt LLM
    pub traits: &'static [&'static str],// Kepribadian khas
    pub phrases: &'static [&'static str],// Kalimat khas
    pub habits: &'static str,           // Kebiasaan di kantor
    pub salary: u64,                    // Gaji bulanan satir (Rupiah)
    pub seat: &'static str,             // ID kursi meja kerja (mis. "seat.bayu")
    // Palet warna sprite (RGB)
    pub skin: [u8; 3],
    pub hair: [u8; 3],
    pub top: [u8; 3],
    pub bottom: [u8; 3],
    pub accent: [u8; 3],
}
```

---

## 4. State Agen Runtime (`Agent`)

Didefinisikan dalam `src/sim.rs`:

```rust
pub struct Agent {
    pub def: &'static AgentDef,         // Referensi ke definisi statis
    pub pos: (f32, f32),                // Koordinat posisi float dalam grid (x, y)
    pub path: Vec<(i32, i32)>,          // Jalur langkah hasil pathfinding A*
    pub path_i: usize,                  // Indeks langkah saat ini
    pub present: bool,                  // Apakah sedang hadir di kantor
    pub sit: bool,                      // Apakah sedang dalam posisi duduk
    pub facing: char,                   // Arah hadap: 'u', 'd', 'l', 'r'
    pub activity: String,               // Deskripsi aktivitas saat ini untuk UI
    pub goal: (i32, i32),               // Tile tujuan pergerakan
    pub goal_label: String,             // Label tujuan
    pub goal_sit: bool,                 // Apakah harus duduk setibanya di tujuan
    pub plan_key: String,               // Cache status perencanaan untuk menghindari repath berulang
    pub bubble: Option<(String, f64)>,  // Balon kata: (teks, timestamp batas tampil)
    pub mood: f32,                      // 0.0 - 100.0
    pub stress: f32,                    // 0.0 - 100.0
    pub coffee: f32,                    // Kafein dalam darah (0.0 - 5.0)
    pub walk_phase: f32,                // Akumulator animasi langkah kaki
    pub arrive_min: i32,                // Jadwal jam tiba kerja (dalam menit dari 00:00)
    pub leave_min: i32,                 // Jadwal jam pulang kerja
    pub side_trip_until: f64,           // Waktu berakhirnya aktivitas sampingan (kopi/istirahat)
    pub trip_cooldown: f64,             // Jeda waktu sebelum boleh mengambil aktivitas sampingan lagi
    pub moving: bool,                   // Apakah sedang berjalan aktif
}
```

---

## 5. Peta Kantor & Ruangan

Didefinisikan dalam `src/office.rs`:

```rust
pub struct Room {
    pub id: &'static str,               // "it", "marketing", "pantry", "meeting", dll.
    pub label: Option<&'static str>,    // Label ruangan untuk tampilan visual
    pub x: i32,                         // Batas kiri tile interior
    pub y: i32,                         // Batas atas tile interior
    pub w: i32,                         // Lebar interior (tile)
    pub h: i32,                         // Tinggi interior (tile)
    pub floor: &'static str,            // Gaya lantai
    pub corridor: bool,                 // Apakah merupakan koridor lalu lalang
}

pub struct Furn {
    pub kind: &'static str,             // Tipe furnitur ("desk", "roundTable", "sofa", dll)
    pub x: i32,
    pub y: i32,
    pub w: i32,
    pub h: i32,
    pub blocking: bool,                 // true = menghalangi pergerakan (obstacle A*)
}
```

---

## 6. Proyek & Hasil Deliverable

Didefinisikan dalam `src/sim.rs` dan `src/deliver.rs`:

```rust
pub enum ProjStatus {
    Running,    // Sedang dikerjakan
    Packing,    // Menyiapkan paket berkas
    Done,       // Selesai
    Late,       // Melewati batas waktu
}

pub struct Milestone {
    pub div: Div,                       // Divisi penanggung jawab tonggak
    pub pct: f32,                       // Persentase pemicu (0.20, 0.36, 0.52, dll)
    pub done: bool,                     // Status tercapai
    pub note: &'static str,             // Catatan progres feed
}

pub struct Project {
    pub id: u64,                        // Timestamp ID proyek
    pub title: String,                  // Judul proyek (berasal dari brief Direktur)
    pub brief: String,                  // Teks lengkap brief
    pub kind: &'static str,             // "software", "presentation", "campaign", "document", "generic"
    pub stack: &'static str,            // "tauri", "vite", "python", "react", dll.
    pub started: DateTime<Local>,       // Waktu mulai pengerjaan
    pub total_secs: f32,                // Durasi total pengerjaan (detik)
    pub elapsed: f32,                   // Waktu yang telah berjalan
    pub milestones: Vec<Milestone>,     // Daftar 5 tonggak divisi
    pub status: ProjStatus,
    pub late: bool,
}

pub struct FileEntry {
    pub rel: String,                    // Jalur relatif file dalam paket
    pub bytes: usize,                   // Ukuran file dalam byte
    pub ok: bool,                       // Status keberhasilan penulisan ke disk
}

pub struct Delivered {
    pub id: u64,
    pub title: String,
    pub kind: &'static str,
    pub day_label: String,
    pub finished: DateTime<Local>,
    pub folder: PathBuf,                // Lokasi folder paket di disk
    pub files: Vec<FileEntry>,          // Manifest file yang dihasilkan
    pub poster_png: Option<Vec<u8>>,    // Buffer biner poster
    pub icon_png: Option<Vec<u8>>,      // Buffer biner ikon
    pub source: &'static str,           // "llm" atau "template"
    pub late: bool,
    pub sections: Vec<(String, String, String)>,
    pub caption: String,
    pub report_md: String,
    pub run_hint: String,
}
```

---

## 7. Feed & Komunikasi

```rust
pub struct FeedItem {
    pub time: String,                   // Waktu lokal kejadian (mis. "09:15")
    pub channel: &'static str,          // "kerja", "gosip", "direksi", "sistem", "proyek", "pantry", "insiden"
    pub text: String,                   // Teks pemberitahuan
}
```
