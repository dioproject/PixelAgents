# 🎨 DESIGN — Panduan Visual & Renderer (Native Rust)

**Gaya:** Top-down 2D pixel art retro modern, palet warna cozy, outline tegas tanpa anti-aliasing.  
**Basis Grid:** 1 tile = **18.0 px** layar (konstanta `BASE_TILE`).  
**Renderer:** `egui::Painter` berbasis OpenGL shader (`glow`) + Kanvas CPU RGBA (`imagegen.rs`) untuk pembuatan berkas biner gambar.  

---

## 1. Palet Warna Cozy (`src/theme.rs`)

### Latar & UI
| Warna | Hex / RGB | Pemakaian |
|---|---|---|
| `BG` | `#1c171f` | Latar luar aplikasi |
| `PANEL` | `#272029` | Background panel HUD & sidebar feed |
| `PANEL_2` | `#332a34` | Panel sekunder / card background |
| `PANEL_3` | `#3f343f` | Elemen interaktif saat hover |
| `BORDER` | `#4c3e49` | Garis pembatas panel |
| `BORDER_2` | `#63515d` | Garis aksen / separator |
| `TEXT` | `#f3e8d8` | Teks utama (warm white) |
| `TEXT_DIM` | `#b9a392` | Teks sekunder (sub-keterangan) |
| `TEXT_FAINT`| `#8b786c` | Teks pudar / petunjuk bantuan |
| `INK` | `#161218` | Warna outline sprite dan teks gelap |

### Aksen & Status
| Warna | Hex / RGB | Pemakaian |
|---|---|---|
| `ACCENT` | `#e87a52` (terracotta) | Aksen utama tombol, sorotan aktif |
| `ACCENT_2` | `#f0b357` (gold) | Indikator jam, kanal direksi |
| `SAGE` | `#9d408c` | Indikator kondisi normal |
| `TEAL` | `#7ec9c0` | Aksen sejuk / pantry |
| `PINK` | `#e09ab0` | Aksen marketing |
| `LAV` | `#b3a4d4` | Aksen malam hari |
| `DANGER` | `#e06a6a` | Peringatan darurat, stres tinggi |
| `SUCCESS` | `#8fc07a` | Status proyek berhasil |

---

## 2. Tipografi (`src/theme.rs`)

Font dibundel langsung ke dalam binary aplikasi (*statically embedded* via `include_bytes!`):

1. **Pixel Typography (`assets/fonts/Silkscreen-Regular.ttf` & `Silkscreen-Bold.ttf`)**:
   - Digunakan untuk heading HUD, judul ruangan, jam, dan teks bernuansa retro.
   - Dipanggil via helper `theme::pixel(size)` dan `theme::pixel_bold(size)`.
2. **Body Typography (`assets/fonts/VarelaRound-Regular.ttf`)**:
   - Digunakan untuk feed, keterangan dialog, dan teks konten agar nyaman dibaca pada ukuran kecil.
   - Dipanggil via helper `theme::body(size)`.

---

## 3. Sistem Pencahayaan Dinamis 24-Jam (`src/render.rs`)

Pencahayaan ruangan disesuaikan secara dinamis dengan jam komputer pengguna:

1. **Langit Jendela (`draw_windows`)**:
   - Gradien langit dihitung dari jam desimal (`sky_gradient(hour)`): indigo malam $\rightarrow$ fajar ungu $\rightarrow$ biru siang $\rightarrow$ jingga sore $\rightarrow$ biru tua malam.
   - Bintang berkedip halus pada malam hari.
   - Efek garis hujan vertikal saat kondisi cuaca hujan aktif.
2. **Ambient Room Tint (`ambient_tint`)**:
   - Lapisan pewarnaan global yang diinterpolasi melintasi keyframe 24 jam untuk menghasilkan atmosfer kantor yang hangat dan hidup.
3. **Lampu Meja & Layar Monitor (`draw_lighting`)**:
   - Radial soft glow di atas meja agen yang sedang bekerja (efek lampu meja kerja hangat).
   - Glow lembut pada layar monitor yang menyala.

---

## 4. Karakter & Animasi Sprite (`src/render.rs`)

- Karakter digambar secara prosedural per layer menggunakan primitif painter `egui` (kaki, celana, baju, kepala, rambut, dan aksesoris).
- Arah hadap: `'u'` (atas), `'d'` (bawah), `'l'` (kiri), `'r'` (kanan).
- Animasi langkah kaki berbasis fase berjalan (`walk_phase`) yang menggerakkan offset kaki secara bergantian.
- Posisi duduk menyesuaikan arah kursi meja kantor.

---

## 5. Generator Gambar CPU (`src/imagegen.rs`)

Untuk menghasilkan deliverable berupa berkas biner nyata tanpa dependensi GPU:
- Struct `Canvas`: Framebuffer RGBA murni di memori RAM dengan fungsi rasterisasi (garis, kotak, lingkaran, teks via `fontdue`).
- `render_poster`: Menghasilkan poster proyek beresolusi tinggi (1080×1080 px) lengkap dengan header, diagram, dan footer.
- `render_icon`: Menghasilkan ikon aplikasi 512×512 px dengan rounded corner mask dan export ke format ICO/PNG.
- `render_promo_gif`: Mengompilasi rangkaian frame animasi ke format berkas GIF bergerak.
