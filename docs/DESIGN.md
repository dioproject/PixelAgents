# 🎨 DESIGN — Panduan Visual & Audio

**Gaya:** Top-down 2D pixel art (16-bit modern), palet terbatas, tanpa anti-aliasing.
**Resolusi basis:** 1 tile = **16 px** logis. Zoom kamera: 2x (default), 3x, 4x. `imageSmoothingEnabled = false` wajib.

---

## 1. Palet Warna Global

### Netral & UI
| Nama | Hex | Pemakaian |
|---|---|---|
| Ink | `#14151f` | Outline semua sprite, teks |
| UI BG | `#101218` | Latar aplikasi |
| Panel | `#1a1e2a` | Sidebar, modal |
| Border | `#2c3346` | Garis panel |
| Text | `#e8ecf4` | Teks utama |
| Text dim | `#8b93a7` | Teks sekunder |
| Accent (amber) | `#ffc857` | Aksen, jam, tombol aktif |
| Danger | `#ff6b6b` | HR alert, stress |
| Success | `#7ee787` | OK, mood naik |

### Dinding & Koridor
| Elemen | Hex |
|---|---|
| Wall face | `#363b4d` |
| Wall top (highlight) | `#4a4f63` |
| Baseboard | `#2a2e3d` |
| Corridor floor | `#3a3f52` / checker `#343948` |

### Lantai per Ruangan (base / checker / aksen)
| Ruangan | Base | Checker | Aksen |
|---|---|---|---|
| IT & Engineering | `#2f3a4f` | `#283245` | Kabel merah `#c8553d` |
| Marketing | `#6b4a56` | `#5f414c` | Rug pink `#d87a9b` |
| Finance | `#3d4d3f` | `#354438` | Dokumen krem `#e9dfc2` |
| HRD | `#2f4a4a` | `#284040` | Karpet teal `#4a8a8a` |
| GA | `#4d4733` | `#443f2d` | Pita hazard kuning |
| Pantry | `#5a4632` | `#4e3c2b` | Ubin dapur `#8a7355` |
| Meeting | `#454a5e` | `#3d4254` | Karpet biru navy |
| Director | `#5c2f3a` | `#522a34` | Trim emas `#c9a227` |
| Lobby | `#4a4f63` | `#424759` | Logo perusahaan |

## 2. Karakter

### Anatomi Sprite
- Ukuran frame: **12 × 18 px** (termasuk rambut & sepatu), anchor di tengah-bawah.
- Lapisan: rambut → wajah → badan → lengan → celana → sepatu. Outline `#14151f` di siluet.
- Mata: 1 px hitam (`#14151f`); varian "ngantuk" = garis horizontal.

### Frame Animasi (per agen, pre-render ke offscreen canvas)
| Frame | Keterangan |
|---|---|
| `idle1` / `idle2` | Napas: badan naik 1 px, bergantian tiap 600 ms |
| `walkA` / `walkB` | Kaki bergantian tiap 180 ms |
| `type1` / `type2` | Duduk mengetik, tangan kanan turun-naik |
| `drink` | Menyeruput kopi (1 frame + efek uap) |
| `sit1` | Duduk santai (kursi/sofa) |
| `shock` | Kedua tangan ke atas + mata besar (untuk keceplosan) |
| `sleep` | Kepala rebah ke layar (untuk lembur parah) |

### Warna Khas per Divisi
| Divisi | Atasan/warna baju | Bawahan |
|---|---|---|
| IT | Hoodie abu-biru `#7a8ba8` | Hoodie gelap `#5c6b85` |
| Marketing | Blazer pink `#d86b8f` | Kaos putih `#e8e8ee` + aksen `#c9556e` |
| Finance | Kemeja putih `#e8e8ee` + dasi `#7a3b4f` | Kemeja krem `#ded6c3` |
| HRD | Blazer teal `#4a8a8a` | Blazer muda `#6aa8a0` |
| GA | Polo mustard `#d0a139` | Apron abu `#9a9a9a` |
| Direktur | Jas gelap `#2b2f3d` + dasi merah `#c8553d` | — |

## 3. Furniture (Procedural, digambar via rect 1 px)

| Type | Ukuran | Ciri |
|---|---|---|
| `desk` | 2×1 | Kayu coklat, monitor gelap + glow biru saat aktif, keyboard |
| `deskL` | 3×1 | Varian panjang (marketing: + tripod kamera) |
| `roundTable` | 3×3 | Meja bulat meeting + 8 kursi di keliling |
| `longTable` | 4×2 | Meja makan pantry, kayu terang |
| `sofa` | 2×1 | Sofa kantor abu; `armchair` 1×1 |
| `counter` | 4×1 | Kitchen set + sink; `coffeeMachine` 1×1 hitam-merah + uap |
| `fridge` | 1×2 | Kulkas putih 2 pintu |
| `dispenser` | 1×1 | Galon biru di atas |
| `vendingMachine` | 1×2 | Mesin snack, lampu kedip |
| `serverRack` | 1×2 | Rak server + lampu LED hijau kedip |
| `filingCabinet` | 1×1 | Lemari arsip abu |
| `printer` | 1×1 | Mesin fotokopi + tumpukan kertas |
| `whiteboard` | 3×1 | Papan putih + coretan marker |
| `posterWall` | 3×1 | Wall item: poster/dashboard marketing |
| `acUnit` | 2×1 | Wall item AC + lampu indikator |
| `cctv` | 1×1 | Wall item kamera CCTV |
| `projectorScreen` | 3×1 | Wall item layar proyektor |
| `plant` / `plantBig` | 1×1 / 2×2 | Tanaman hijau pot terakota |
| `poolTable` | 4×2 | Meja biliar lounge |
| `workbench` | 3×1 | Meja kerja GA + toolbox + kotak dus |
| `receptionDesk` | 3×1 | Meja resepsionis + logo |
| `beanbag` | 1×1 | Beanbag IT |
| `coffeeStain` | 1×1 | Dekorasi: noda kopi misterius di karpet |

**Aturan:** outline `#14151f` 1 px mengelilingi bentuk; shading bawah-kanan 1 shade lebih gelap; highlight atas 1 px lebih terang.

## 4. UI Layout (God Mode Dashboard)

```
┌────────────────────────────────────────────────────────────────────────┐
│ TOPBAR  [🏢 PT Pixel Sinergi Nusantara Tbk]   Hari 1 · 09:12  [⏸][2x▾] │
│         [📜 Titah Direksi]  [⚙️ Settings]  [❓]                         │
├────────────┬───────────────────────────────────────────┬───────────────┤
│ CCTV NAV   │                                            │ OFFICE FEED   │
│ ▸ IT       │              CANVAS PIXEL                  │ [All][Kerja]  │
│ ▸ Meeting  │        (bubble DOM di atas canvas)         │ [Gosip][HR]   │
│ ▸ Direktur │                                            │ 09:12 Bayu:   │
│ ▸ Finc     │                                            │  "..."        │
│ ▸ Mktg     │                                            │               │
│ ▸ Pantry   │                                            ├───────────────┤
│ ▸ HRD/GA   │                                            │ KARYAWAN (10) │
│            │                                            │ ● Bayu  Ngetik│
│ STATS      │                                            │ ● Jessica ... │
│ Stress ▓▓  │                                            │               │
│ Kopi ☕ 12 │                                            │               │
└────────────┴───────────────────────────────────────────┴───────────────┘
```

- **Topbar**: tinggi 48 px, latar `#1a1e2a`, jam monospace amber.
- **Sidebar kiri** 200 px: tombol CCTV per ruangan (klik = kamera zoom + pan), statistik kantor live.
- **Sidebar kanan** 300 px: tab feed + daftar karyawan (dot status aktivitas).
- **Inspector**: menggantikan sidebar kanan saat agen dipilih (tombol ✕ untuk kembali).
- **Bubble**: rounded 8 px, bg `#1a1e2a` 95% + border 2 px warna divisi, tail 6 px, font 12 px; nama pengirim kecil di atas teks untuk konteks feed.
- **Overlay CCTV**: scanline halus (opacity 4%), vignette, label ruangan chip kecil kiri-atas; sudut kanan-atas `● REC` merah berkedip pelan.

## 5. Tipografi

| Elemen | Font |
|---|---|
| UI umum | `Segoe UI`, system-ui, sans-serif |
| Jam, angka stats, kode | `Consolas`, `ui-monospace`, monospace |
| Judul panel | UI umum, 600, letter-spacing 0.5px, UPPERCASE 11px |

> Tidak ada webfont eksternal → aplikasi tetap ringan & offline-first.

## 6. Sound Design (Procedural WebAudio — tanpa file)

| SFX | Karakter | Trigger |
|---|---|---|
| `blip` | Beep pendek 880 Hz, 60 ms | Pesan feed baru |
| `alert` | Dua nada turun (660→440) | HR Alert / SP |
| `chime` | Tiga nada naik | Titah Direksi dikirim |
| `sip` | Noise burst pendek low-pass | Agen minum kopi |
| `cash` | Klik tinggi 1200 Hz | Insiden reimburse |

Semua di-toggle dari Settings (`soundEnabled`). Volume dijaga ≤ 0.2 agar tidak mengganggu.

## 7. Tone of Voice (Konten)

- **Ke atasan (level kita lebih rendah):** "Selamat pagi, Pak Direktur. Mohon izin menyampaikan..." — formal, lengkap, diplomatis.
- **Sesama level:** "Woi, jadi ga nih? Wkwk." — gaul, singkat, boleh typo ringan.
- **Ke bawahan:** sesuai `downTone` (sweet/ jaksel / chill / garing).
- **Sistem & HR:** kalimat korporat satir yang kaku, boleh megaphone 📢 dan emoji terbatas.
- **Larangan:** sarkasme kasar, konten SARA, kata kotor berat — tetap aman untuk semua umur.
