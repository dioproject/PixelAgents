# 📜 RULES — Aturan Simulasi Kantor

Dokumen ini adalah "kitab suci" perilaku seluruh penghuni **PT Pixel Sinergi Nusantara Tbk**.

---

## 1. Hierarki & Jabatan

| Level | Sebutan | Contoh | Dipanggil oleh bawahan |
|---|---|---|---|
| **4** | Direktur Utama (Player) | "Bapak Direktur" | "Bapak / Pak Direktur" |
| **3** | Manager / Head / C-Level | Bu Maya, Jessica | "Bu Maya", "Kak Jessica"* |
| **2** | Senior / Specialist | Bayu, Mbak Endang, Mas Joko | "Mas Bayu", "Mbak Endang" |
| **1** | Junior / Staff | Rian, Fajar, Dimas, Kevin | langsung nama / "bro" |

\* Pemanggilan mengikuti gender: **Pak** untuk pria, **Bu** untuk wanita, **Mas/Mbak** untuk area senior staf, **Kak** untuk lintas divisi yang akrab.

## 2. Matriks Tone Bicara (WAJIB)

Aturan tunggal: **bandingkan level pembicara vs lawan bicara.**

```
jika level(lawan) > level(saya)          → FORMAL   (bahasa Indonesia baku & sopan)
jika level(lawan) == level(saya)         → GAUL     (santai, slang, sesama)
jika level(lawan) < level(saya)          → downTone (sesuai kepribadian, TIDAK harus formal)
jika lawan = Direktur (level 4)          → FORMAL   (selalu, tanpa kecuali)
```

### Contoh Kalimat

**FORMAL (ke atasan):**
> "Selamat pagi, Bu Maya. Mohon izin melaporkan bahwa progress sprint minggu ini mengalami kendala teknis. Kami targetkan selesai hari Kamis. Terima kasih atas pengertiannya, Bu."

**GAUL (sesama):**
> "Woy, lu udah liat ticket yang baru? Itu fitur minta diancurin ya? 💀"

**DOWN — sweet (Bu Maya ke staf):**
> "Halo bestie! Form KPI-nya belum diisi ya dear? Ditunggu sampai jam 12 siang ya, biar nanti pas review kita bisa ngobrol santai:))))"

**DOWN — jaksel (Jessica ke desainer):**
> "Faj, honestly aku literally butuh revisi yang lebih... punchy gitu. Which is warnanya kurang oke di feed, ya kan? Thanksss!"

**DOWN — chill (Mas Joko):**
> "Santai aja bos, dispenser mah gampang. Nanti abis ini gue benerin."

**DOWN — garing (Bayu):**
> "Belajar React dulu, baru nanya kenapa state-nya undefined. Wkwk. Sini gue ajarin."

## 3. Rutinitas Harian

| Jam | Blok | Perilaku Agen |
|---|---|---|
| 08:30–09:00 | **Kedatangan** | Berjalan dari lobby ke meja masing-masing, menyalakan laptop |
| 09:00–12:00 | **Deep Work** | Mengetik di meja; saat kafein menipis (< 1.6) agen berjalan ke pantry, menyeduh kopi, lalu kembali (jeda minimal 45 menit game) |
| 12:00–13:00 | **Makan Siang** | Semua ke pantry; kursi makan/sofa dipakai bergantian; konteks obrolan `lunch` |
| 13:00–15:00 | **Kerja Siang** | Kembali mengetik; peluang kecil (±1×/hari per agen) untuk kunjungan lintas divisi |
| 15:00–15:30 | **Coffee Break** | Gelombang ke pantry untuk ngopi/ngobrol; mood pulih perlahan karena istirahat |
| 15:30–17:00 | **Capek Sore** | Laju stress naik lebih cepat; dialog beralih ke keluhan |
| 17:00–18:00 | **Pulang** | Umumnya pulang ke lobby lalu `gone`; divisi IT & GA tetap lembur sampai kantor tutup. Jika flag `overtime` aktif, semua divisi tetap bekerja sampai 18:00. |
| ≥ 18:00 | **Pergantian Hari** | Hari +1; agen `respawn` di lobby jam 08:30 berikutnya; stress −26, mood +3, kopi +1.5; laporan harian dibuat |

**Kecepatan default**: 2x → satu hari kantor ≈ 4,7 menit riil.

## 4. Statistik Agen (Satir)

| Stat | Rentang | Mekanika |
|---|---|---|
| **Mood** | 0–100 | Gosip +3 · Kopi +6 (+2 saat budget dipotong) · Pizza +25 · Keceplosan −10 · Insiden lain bervariasi · pulih saat istirahat |
| **Stress** | 0–100 | Kerja +0.12/menit (blok capek +0.22) · berjalan +0.05 · istirahat +0.01 · Kopi −6 · Keceplosan +30 · KPI +8 |
| **Coffee** | 0–5 | +1.5 setiap minum kopi (maks 5); −0.008/menit saat kerja, −0.003 saat santai. Agen mencari kopi saat < 1.6. |
| **Flags** | boolean | `coffeeBudgetCut` · `overtime` · `pizzaPartyActive` · `freeDay` · `batikNext` · `batikActive` · `allGoHome` |

Mood dan stress memengaruhi laporan harian serta suasana dialog; tidak ada status permanen.

## 5. Percakapan

1. **Pemicu:** setiap ±15 detik riil (≈30 menit game di 2×), dicoba satu percakapan untuk pasangan agen yang satu ruangan, berjarak < 7 tile, dan tidak sedang berjalan/ngopi/rapat.
2. **Komposisi:** 2–6 turn, tiap turn ≤ 180 karakter, ala chat WhatsApp kantor (boleh singkatan: "yg", "gmn", "wkwk", "otw", "fyi").
3. **Konteks** ditentukan ruang + waktu: `pantry` → gosip; meja `it` → kerja/tiket; sore → keluhan; `marketing` → revisi; dekat `finance` → reimburse.
4. **Prioritas isi**: (a) relevan dengan insiden aktif, (b) relevan dengan titah terakhir (maks 90 menit game terakhir), (c) konteks tempat.
5. **Efek setelah percakapan:** peserta mood +3, stress −3, `chattedToday` +1.
6. **Kanal feed:** obrolan kerja → `kerja`; santai/gosip → `gosip`; HRD → `hr`; titah → `direksi`.
7. **Anti-repetisi:** 8 template terakhir dihindari.

## 6. Insiden (Otomatis)

Sistem melempar dadu setiap **20 menit game** (55% chance) pada pukul **09:15–16:50**, lalu memilih insiden berbobot yang cooldown-nya sudah habis.

| Insiden | Bobot | Efek |
|---|---|---|
| **keceplosan** | 8 | Agen salah kirim chat gaul ke Direktur → toast merah + frame `shock` → HRD menindaklanjuti → permintaan maaf formal → gosip. Stress +30, mood −10 (pelaku); HRD +5 stress |
| **ac_war** | 10 | Marketing vs GA soal suhu AC; berakhir kompromi. Stress GA −2 |
| **reimburse** | 10 | Finance menolak klaim (struk fotokopi/luntur); mood pengaju −6 |
| **printer** | 8 | Printer nyangkut; Mas Joko dipanggil; semua stress −3 (lega) |
| **kpi** | 12 | Bu Maya ingatkan deadline KPI via feed `hr`; semua stress +8 |
| **birthday** | 4 | Kevin bikin kejutan canggung + kue di pantry; semua mood +10 |
| **bsod** | 6 | Laptop agen IT BSOD; rekan IT turun tangan; mood korban −4, stress −5, mood helper +3 |

**Cooldown per insiden (menit game):** keceplosan 180 · ac_war 130 · reimburse 130 · printer 130 · kpi 110 · birthday 1440 · bsod 160.
**Syarat umum**: jam kerja 09:15–16:50, hari ≥ 1, tidak saat rapat darurat/insiden lain masih berjalan.

## 7. Titah Direksi (Player Action)

| Preset | Efek Simulasi | Reaksi Bawahan |
|---|---|---|
| **Rapat Dadakan 5 Menit Lagi!** | Semua agen `gather` ke Meeting Room, rapat scripted, lalu bubar | Formal "Siap, Pak" + gosip geram setelahnya |
| **Potong Budget Kopi 50%** | Flag `coffeeBudgetCut` sampai pergantian hari; kopi hanya menaikkan mood +2 | Finance formal setuju; IT & Marketing bergosip sedih |
| **Lembur Malam Ini, Semangat!** | Flag `overtime`; semua divisi tetap bekerja sampai kantor tutup pukul 18:00; stress +8 | "Baik Pak, dedikasi kami untuk perusahaan." (dalam hati: 💀) |
| **Pizza Party Jam 3!** | Flag `pizzaPartyActive`; semua agen menuju pantry party; mood +25 | Sorak-sorai formal + rencana ambil 2 slice |
| **Batik Day Besok** | Flag `batikNext` + `batikActive`; semua agen langsung berganti pakaian batik dan tetap memakainya sampai sehari penuh berikutnya, lalu kembali normal | HRD antusias; sisanya "oke Pak" sambil cek lemari |
| **Bebas Ngapain Aja Seharian** | Flag `freeDay`; planner memilih aktivitas santai (pantry/lounge) | Senang, tapi curiga ini jebakan |
| **Tugas Proyek Baru** | Brief bebas → `ProjectManager.start`: 1 proyek aktif, semua agen fokus kerja, progres 20–40 menit kantor, 5 tonggak divisi di feed `proyek`, lalu paket file nyata disimpan ke `Documents\PixelSinergi` | Menerima brief sebagai prioritas; hasil dibahas di modal + arsip |
| **Custom** | Teks bebas → respons formal dari divisi terpilih; tidak mengubah stat secara langsung | 2–4 respons formal (HRD/IT/Marketing/Finance) + gosip lanjutan |

**Aturan respons titah:**
1. Respons formal muncul di feed channel `direksi`; jika LLM aktif isinya dibuat LLM, jika tidak memakai bank dialog fallback.
2. Sekitar 5 detik setelah respons (≈10 menit game di 2×), muncul 2–3 baris **gosip informal** antar karyawan (channel `gosip`).
3. Titah dicatat di feed dengan style khusus (emas, bullet 📜).

## 8. Etiket Konten (Guardrail)

- Tidak ada ujaran kebencian, SARA, atau pelecehan nyata.
- "SP" dan "teguran" selalu bernada satir ringan, bukan mengancam nyata.
- Semua karakter fiktif; kesamaan nama dengan rekan kerja sungguhan adalah kebetulan statistik murni. 😉

## 9. Tugas Proyek (Titah Khusus)

- **Satu proyek aktif** pada satu waktu; brief ditolak (toast) bila proyek lain masih berjalan.
- Durasi **20–40 menit kantor** (random); tonggak divisi di **20% / 36% / 52% / 68% / 84%** → 5 entri feed channel `proyek`.
- Selama proyek aktif: agen fokus kerja (label `Fokus proyek: …`), peluang trip kopi **×0.5**, kunjungan lintas divisi **nonaktif**.
- **Blok pulang (17:00–18:00) tidak berlaku** selama proyek aktif — semua tetap di meja.
- Rollover 18:00 saat proyek belum selesai → proyek diselesaikan "dikejar deadline": status `late`, konten template, disclaimer di `laporan.md`; tetap dihitung di statistik hari itu.
- Batas paket kode: **14 file · 24 KB/file · 160 KB total · kedalaman 4**; ekstensi whitelist; `README.md` selalu dijamin.
- Aplikasi **tidak pernah mengeksekusi/meng-compile** kode hasil AI — hanya menulis file ke disk.
- Mode bebas (titah `bebas`) menang atas fokus proyek (disengaja).
