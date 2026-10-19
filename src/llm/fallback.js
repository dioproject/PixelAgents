// ============================================================
// fallback.js — Bank dialog procedural (mode tanpa LLM)
// Token pembicara: 'A' | 'B' | divisionId | agentId | 'hr' | 'any'
// ============================================================

import { choice } from '../core/utils.js';

// ---------------- Percakapan berpasangan ----------------

export const PAIR_TEMPLATES = [
  // ===== IT / kerja =====
  {
    id: 'it_bug_prod', room: ['it'], ctx: ['work'], channel: 'kerja', divisions: ['it'],
    lines: [
      { by: 'A', text: 'Woy, error rate naik nih di dashboard. Ada yang deploy ya semalem?' },
      { by: 'B', text: 'Bukan gue. Cek commit log jam 11 malem sana.' },
      { by: 'A', text: 'Jir... iya ada. Yaudah gue revert dulu, doain.' },
    ],
  },
  {
    id: 'it_css_geser', room: ['it'], ctx: ['work'], channel: 'kerja', divisions: ['it'],
    lines: [
      { by: 'B', text: 'Mas, layout-nya geser 1px di resolusi 1366. Panik gue 😭' },
      { by: 'A', text: '1px? Coba inspect, biasanya margin collapse. Santai.' },
      { by: 'B', text: 'Nemu! Ada margin dobel. Makasih mas, hidup gue tenang lagi.' },
    ],
  },
  {
    id: 'it_staging', room: ['it'], ctx: ['work'], channel: 'kerja', divisions: ['it'],
    lines: [
      { by: 'A', text: 'Siapa yang drop table di staging woy? Data dummy-nya ilang semua.' },
      { by: 'B', text: 'Wkwk. Tadi gue seed ulang kok, aman.' },
      { by: 'A', text: 'Sekali lagi kejadian, gue cabut aksesnya ya.' },
    ],
  },
  // ===== Marketing =====
  {
    id: 'mkt_revisi', room: ['marketing'], ctx: ['work'], channel: 'kerja', divisions: ['marketing'],
    lines: [
      { by: 'A', text: 'Faj, banner-nya tolong lebih "pop-up" tapi minimalis ya, yang *gitu* gitu deh.' },
      { by: 'B', text: 'Hadeh. Iya, revisi ke-15. Siap.' },
      { by: 'A', text: 'Thanksss! You are the best! ✨' },
    ],
  },
  {
    id: 'mkt_konten', room: ['marketing'], ctx: ['work'], channel: 'kerja', divisions: ['marketing'],
    lines: [
      { by: 'A', text: 'Konten TikTok besok udah ada script belum? Kita butuh viral traction nih.' },
      { by: 'B', text: 'Udah 60%. Talentnya... gue, nyanyi sambil nge-review laptop.' },
      { by: 'A', text: 'Honestly? Which is itu bisa banget. Gas.' },
    ],
  },
  // ===== Finance =====
  {
    id: 'fin_reimburse', room: ['finance'], ctx: ['work'], channel: 'kerja', divisions: ['finance'],
    lines: [
      { by: 'A', text: 'Ini klaim taksi bulan lalu ada yang fotokopi notanya. Ditolak ya?' },
      { by: 'B', text: 'Iya, cahaya struknya harus asli. Aturan itu dibuat biar kita aman.' },
      { by: 'A', text: 'Oke, gue balikin ke yang ngajuin. Siap-siap drama.' },
    ],
  },
  {
    id: 'fin_selisih', room: ['finance'], ctx: ['work'], channel: 'kerja', divisions: ['finance'],
    lines: [
      { by: 'B', text: 'Mas, selisih 500 perak darimana ini 😭 udah gue cek 3 kali.' },
      { by: 'A', text: 'Itu pembulatan pajak biasanya. Catat aja di adjustment kecil.' },
      { by: 'B', text: 'Aman. Kayaknya. Semoga audit lancar.' },
    ],
  },
  // ===== HRD =====
  {
    id: 'hr_kpi', room: ['hrd'], ctx: ['work'], channel: 'kerja', divisions: ['hrd'],
    lines: [
      { by: 'A', text: 'KPI anak-anak udah masuk semua belum? Deadline H-2 lho ya.' },
      { by: 'B', text: 'Baru 70%. Nanti gue ingetin pakai email yang ramah tapi menakutkan.' },
      { by: 'A', text: 'Yang penting ada emoticonnya ya :) biar hangat.' },
    ],
  },
  // ===== GA =====
  {
    id: 'ga_dispenser', room: ['ga'], ctx: ['work'], channel: 'kerja', divisions: ['ga'],
    lines: [
      { by: 'A', text: 'Bos, dispenser pantry airnya netes lagi. Nanti gue bongkar ya.' },
      { by: 'B', text: 'Santai, gampang. Kunci inggris gue masih di lemari.' },
    ],
  },
  // ===== Lintas divisi =====
  {
    id: 'cross_feature', room: ['it'], ctx: ['work'], channel: 'kerja', divisions: ['marketing', 'it'], anyOrder: true,
    lines: [
      { by: 'marketing', text: 'Mas, kita butuh fitur baru buat campaign besok ya, dikit doang kok.' },
      { by: 'it', text: 'Besok? Dikit? Fitur itu dibilang dikit dari kacamata siapa dulu...' },
      { by: 'marketing', text: 'Ya minimal jalan dulu, nanti di-iterate 😄' },
      { by: 'it', text: 'Oke, tapi gue masukin backlog dulu. Sprint depan.' },
    ],
  },
  {
    id: 'cross_naik_1jt', room: ['it'], ctx: ['work'], channel: 'kerja', divisions: ['it', 'finance'], anyOrder: true,
    lines: [
      { by: 'finance', text: 'Budget server naik? Kemarin baru dibeliin lho.' },
      { by: 'it', text: 'Traffic naik mbak, error 502 tiap sore. Ini demi stabilitas!' },
      { by: 'finance', text: 'Ajukan proposal dulu, lengkap. Nanti kita review.' },
    ],
  },
  // ===== Pantry / gosip =====
  {
    id: 'gosip_budget', room: ['pantry', 'corridor1', 'corridor2', 'lobby'], ctx: ['gosip', 'break', 'lunch'], channel: 'gosip', divisions: ['any'],
    lines: [
      { by: 'A', text: 'Eh, beneran ga sih katanya budget kopi mau dipotong? Gosipnya dari finance nih.' },
      { by: 'B', text: 'Ssssh. Dinding pantry itu tipis. Tapi... ada benarnya. Yang gue denger sih gitu.' },
      { by: 'A', text: 'Ya ampun. Kantor sebesar ini, kopi jadi pertaruhannya.' },
    ],
  },
  {
    id: 'gosip_jam_pulang', room: ['pantry', 'lobby'], ctx: ['gosip', 'break', 'lunch'], channel: 'gosip', divisions: ['any'],
    lines: [
      { by: 'A', text: 'Lu tau ga, yang di divisi sebelah katanya pulang paling akhir terus.' },
      { by: 'B', text: 'Ya gimana, kerjaannya emang ga pernah abis. Kasian juga.' },
      { by: 'A', text: 'Kita sih sante aja, yang penting tunjukkan muka pas jam kerja wkwk.' },
    ],
  },
  {
    id: 'gosip_gaji', room: ['pantry'], ctx: ['break', 'lunch', 'gosip'], channel: 'gosip', divisions: ['any'],
    lines: [
      { by: 'A', text: 'Eh jangan bilang siapa-siapa, tapi gue denger THR tahun ini bakal...' },
      { by: 'B', text: 'Jangan bikin ekspektasi! Nanti kenyataannya cuma "terima kasih" 😭' },
      { by: 'A', text: 'Dikit-dikit ngomongin duit. Emang hidup segitu-gitu aja yak.' },
    ],
  },
  {
    id: 'lunch_weekend', room: ['pantry'], ctx: ['lunch'], channel: 'gosip', divisions: ['any'],
    lines: [
      { by: 'A', text: 'Akhir pekan mau ke mana nih? Gue sih rebahan total.' },
      { by: 'B', text: 'Rebahan itu healing paling murah. Setuju.' },
    ],
  },
  {
    id: 'sore_keluh', room: ['it', 'marketing', 'finance', 'hrd', 'ga'], ctx: ['sore'], channel: 'kerja', divisions: ['any'],
    lines: [
      { by: 'A', text: 'Jam segini tuh rasanya kaya berenang di lumpur ya.' },
      { by: 'B', text: 'Bertahan dikit lagi, nanti maghrib pulang.' },
      { by: 'A', text: 'Kopi ke-4 gue ga ngaruh lagi. Tolong.' },
    ],
  },
  {
    id: 'meeting_hantu', room: ['meeting'], ctx: ['work', 'gosip'], channel: 'gosip', divisions: ['any'],
    lines: [
      { by: 'A', text: 'Ini meeting "5 menit" kok udah 40 menit belum kelar?' },
      { by: 'B', text: 'Tenang, tinggal action items doang. Yang gaakan pernah dikerjain juga sih.' },
    ],
  },
];

// ---------------- Reaksi titah (formal ke Direktur) ----------------

export const DIRECTIVE_FORMAL = {
  rapat: [
    { division: 'hrd', text: 'Selamat pagi, Pak Direktur. Seluruh divisi kami siap menghadiri rapat dalam 5 menit. Terima kasih atas arahan Bapak.' },
    { division: 'finance', text: 'Siap, Pak. Saya membawa laporan kas terbaru untuk dipaparkan di ruang meeting.' },
    { division: 'it', text: 'Baik Bapak, tim kami hentikan sprint dahulu dan segera menuju ruang meeting. Mohon izin.' },
    { division: 'marketing', text: 'Noted, Pak! Kami siapkan deck singkat agar diskusinya lebih impactful.' },
    { division: 'ga', text: 'Siap Pak, saya pastikan ruang meeting, proyektor, dan AC-nya sudah siap digunakan.' },
  ],
  budget: [
    { division: 'finance', text: 'Terima kasih atas keputusan bijaknya, Pak. Efisiensi operasional memang perlu kita jaga bersama.' },
    { division: 'hrd', text: 'Baik Pak, kami akan mengomunikasikan kebijakan efisiensi ini dengan hangat kepada seluruh tim :) ' },
    { division: 'it', text: 'Dipahami, Bapak. Produktivitas tim tetap kami jaga dengan sumber daya yang ada.' },
    { division: 'marketing', text: 'Siap Pak! Kebetulan kami sedang menyusun strategi yang lebih cost-efficient juga.' },
    { division: 'ga', text: 'Siap, Pak. Nanti saya hitung ulang stok kopi yang tersisa ya.' },
  ],
  lembur: [
    { division: 'it', text: 'Siap, Pak. Tim engineering akan menyelesaikan deployment malam ini juga. Dedikasi kami untuk perusahaan.' },
    { division: 'finance', text: 'Baik Bapak, laporan tutup buku saya selesaikan malam ini. Terima kasih atas kepercayaannya.' },
    { division: 'hrd', text: 'Baik Pak, kami siapkan dukungan konsumsi kecil-kecilan untuk teman-teman yang lembur :) ' },
    { division: 'marketing', text: 'Siap, Pak. Kalau ternyata masih kurang, silakan hubungi saya kapan pun.' },
    { division: 'ga', text: 'Siap Pak, nanti saya pastikan lampu dan AC tetap nyala sampai selesai.' },
  ],
  pizza: [
    { division: 'hrd', text: 'Terima kasih banyak, Pak! Ini akan sangat meningkatkan employee engagement kami :D' },
    { division: 'it', text: 'Terima kasih, Bapak. Kami akan menghentikan deployment sejenak demi pizza. Prioritas jelas.' },
    { division: 'marketing', text: 'Wah, noted Pak! Kami bikin konten internalnya sekalian ya, untuk employer branding.' },
    { division: 'finance', text: 'Terima kasih Pak. Saya asumsikan ini masuk pos "employee relations", mohon konfirmasinya.' },
    { division: 'ga', text: 'Siap Pak! Saya bantu atur meja dan piringnya di pantry ya.' },
  ],
  batik: [
    { division: 'hrd', text: 'Ide yang sangat merakyat, Pak! Kami akan umumkan H-1 agar tidak ada yang lupa :) ' },
    { division: 'marketing', text: 'Siap Pak! Ini kesempatan bagus untuk konten "culture" kami.' },
    { division: 'it', text: 'Baik Bapak. Saya... akan mencari batik yang paling tidak mencolok.' },
    { division: 'finance', text: 'Siap Pak. Kebetulan minggu lalu kantor sebelah juga pakai batik, jadi kami sudah ada referensi.' },
    { division: 'ga', text: 'Siap Pak, saya sih gampang. Yang penting kerjaan beres.' },
  ],
  bebas: [
    { division: 'it', text: 'Terima kasih, Bapak. Sungguh di luar ekspektasi kami semua.' },
    { division: 'hrd', text: 'Baik Pak! Kami percaya kepercayaan Bapak akan mendorong budaya kerja yang lebih sehat :)' },
    { division: 'marketing', text: 'Wow. Noted Pak. Hari ini kami akan... bebas. Sungguh kehormatan.' },
    { division: 'finance', text: 'Baik Pak. Saya akan menyelesaikan kewajiban minimal dan menikmati ketenangan hari ini.' },
    { division: 'ga', text: 'Siap Pak! Kalau gitu saya sekalian benerin dispenser yang netes ya.' },
  ],
  custom: [
    { division: 'hrd', text: 'Baik Bapak, arahan tersebut kami catat dan kami sampaikan ke seluruh divisi secara resmi. Terima kasih, Pak.' },
    { division: 'it', text: 'Dipahami, Bapak. Tim kami segera menyesuaikan prioritas pekerjaan sesuai arahan.' },
    { division: 'marketing', text: 'Noted, Pak! Kami akan mengomunikasikan ini dengan pendekatan yang paling tepat sasaran.' },
    { division: 'finance', text: 'Siap, Bapak. Kami akan evaluasi dampaknya terhadap operasional lalu melaporkannya kembali.' },
    { division: 'ga', text: 'Baik Pak, saya dukung dari sisi operasional lapangan ya.' },
  ],
};

// ---------------- Gosip setelah titah (informal) ----------------

export const DIRECTIVE_GOSSIP = {
  rapat: [
    { by: 'A', text: 'Yeay rapat lagi. Tumben banget, tadi kan baru dua kali minggu ini 🙃' },
    { by: 'B', text: 'Yang penting bawa laptop, buka yang penting muka fokus.' },
  ],
  budget: [
    { by: 'A', text: 'Kopi dipotong 50% katanya. Gimana mau ngoding tanpa kopi 😭' },
    { by: 'B', text: 'Tenang, gue masih nyimpen sachet di laci. Operasi rahasia.' },
    { by: 'A', text: 'Pahlawan tanpa nama. Jangan bilang-bilang finance ya.' },
  ],
  lembur: [
    { by: 'A', text: 'Lembur lagi lembur lagi. Semangat katanya. Semangat siapa dulu.' },
    { by: 'B', text: 'Yang penting jajan malemnya ditraktir. Eh, ditraktir ga ya?' },
    { by: 'A', text: 'Hahaha. Ya lihat nanti aja deh.' },
  ],
  pizza: [
    { by: 'A', text: 'PIZZA JAM 3! Ini lebih dari gaji bulan ini.' },
    { by: 'B', text: 'Gue ambil dua slice, satu buat di meja satu buat di jalan. Normal kan?' },
    { by: 'A', text: 'Normal. Semua orang juga begitu.' },
  ],
  batik: [
    { by: 'A', text: 'Batik day besok. Gue belum punya nih, pinjem dong.' },
    { by: 'B', text: 'Yang di lemari gue motifnya terlalu nge-jreng, siap aja.' },
  ],
  bebas: [
    { by: 'A', text: 'Beneran bebas? Ini pasti jebakan batman.' },
    { by: 'B', text: 'Udah sajalah nikmatin. Jangan tanya-tanya nanti dikasih kerjaan.' },
  ],
  custom: [
    { by: 'A', text: 'Titah baru dari Bos tuh. Udah pada baca belum?' },
    { by: 'B', text: 'Baru sekilas. Intinya: iyakan aja dulu, nanti kita adjust.' },
  ],
};

// ---------------- Rapat (multi-speaker) ----------------

export const MEETING_TURNS = [
  { by: 'hrd', text: 'Baik teman-teman, rapat dadakan ini kita mulai. Bapak Direktur ingin mendengar progress masing-masing divisi.' },
  { by: 'it', text: 'Dari kami: backend aman, frontend... ada 1px yang masih misterius. Target selesai Kamis.' },
  { by: 'marketing', text: 'Campaign minggu ini reach-nya naik 40%. Next step: kita push konten format baru minggu depan.' },
  { by: 'finance', text: 'Pengingat saja: reimburse bulan lalu sudah cair 90%. Mohon nota fisik disimpan rapi sesuai aturan.' },
  { by: 'ga', text: 'Fasilitas aman. Printer sudah dibersihkan, AC lantai 2 sudah disetel ulang.' },
  { by: 'hrd', text: 'Terima kasih semuanya. Action items akan saya kirim via email setelah rapat ini ya :) ' },
];

// ---------------- Respon sekunder (reaksi pihak ketiga) ----------------

export const SIDE_REACTIONS = {
  gosip: [
    { text: 'Duh, denger dari sebelah tuh ngeri-ngeri sedap.' },
    { text: 'Wah wah... ada apa tuh? Bagi info dong.' },
    { text: 'Kayaknya kantor kita memang tidak pernah sepi drama ya.' },
  ],
  kerja: [
    { text: 'Ini sprint review kita jadi maju ya? Semangat.' },
    { text: 'Fyi, mantau ya teman-teman.' },
  ],
  sore: [
    { text: 'Kelas sore sudah dimulai. Bertahan, teman-teman.' },
    { text: 'Sisa 90 menit... pelan-pelan saja, kamu pasti sampai.' },
  ],
};

// ---------------- Helper pemilihan ----------------

export function matchPairTemplate(sim, a, b, ctx, roomId) {
  const divA = a.def.division;
  const divB = b.def.division;

  const candidates = PAIR_TEMPLATES.filter((t) => {
    const roomOk = t.room.includes('any') || t.room.includes(roomId);
    const ctxOk = t.ctx.includes(ctx) || (t.ctx.includes('gosip') && roomId === 'pantry');
    if (!roomOk || !ctxOk) return false;
    if (t.divisions.includes('any')) return true;
    // pasangan divisi harus cocok dua-duanya (urutan bebas / sama)
    const set = new Set(t.divisions);
    if (set.size === 1) return divA === t.divisions[0] && divB === t.divisions[0];
    return set.has(divA) && set.has(divB);
  });

  if (candidates.length === 0) return null;
  // hindari pengulangan beruntun
  const fresh = candidates.filter((c) => !sim.conversations.recentTemplateIds.includes(c.id));
  const pool = fresh.length > 0 ? fresh : candidates;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function pickDirectiveLines(bank, type, count = 2) {
  const list = bank[type] || bank.custom;
  const shuffled = [...list].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ---------------- Skrip insiden ----------------

export function scriptKeceplosan() {
  return {
    first: [
      'Woi bos, jadi ga nih meetingnya? Gue warteg dulu ya sebentar 🙏',
      'Pak bos santuy, reportnya nanti sore gue kirim. Wkwk.',
      'Bos, pinjam charger dong, punya gue ketinggalan. Luv u 😘',
      'Sir, ralat. Itu typo. Yang bener: punya gue ketinggalan juga.',
    ],
    hr: (name) => `Selamat siang Kak ${name}, mohon izin menindaklanjuti pesan tersebut ya. Mohon kerjasamanya untuk mampir ke ruang HRD, kami sudah menyiapkan form klarifikasi dan teh hangat :) `,
    apology: 'Mohon maaf yang sebesar-besarnya, Bapak Direktur. Pesan sebelumnya salah kirim, saya khilaf. Mohon arahan dan kebijaksanaannya, Pak. 🙏',
    gossip: (name) => `Bro, ${name} typo ke grup Bosch 😭 gue ngeliat dari jauh aja keringetan.`,
  };
}

export function scriptAcWar() {
  return [
    { by: 'marketing', text: 'Bang Joko, AC-nya 16 derajat! Tangan gue udah kaya nugget 😭' },
    { by: 'ga', text: 'Lah, kemarin yang ngeluh kepanasan siapa? Sabar ya, nanti gue naikin 2 derajat.' },
    { by: 'marketing', text: 'Plis jangan cuma 2. 20 aja, biar produktif, demi revenue.' },
    { by: 'ga', text: 'Yaudah 18 deh. Deal, jangan nanti ngeluh lagi.' },
  ];
}

export function scriptReimburse(victimName, victimDivision) {
  return [
    { by: victimDivision, name: victimName, text: 'Mbak, klaim makan siang saya minggu lalu belum cair nih... 🥲' },
    { by: 'finance', text: 'Nota fisiknya sudah diserahkan? Yang di sistem hanya foto struk reduce ya.' },
    { by: victimDivision, name: victimName, text: 'Fotonya jelas kok mbak, beneran jelas.' },
    { by: 'finance', text: 'Peraturannya jelas ya mas/mbak: struk asli dan tanggal sesuai. Silakan dilengkapi dulu.' },
  ];
}

export function scriptPrinterJam() {
  return [
    { by: 'finance', text: 'Bang Joko! Mesin fotokopi nyangkut lagi, ini ada 40 lembar mau dicetak 😭' },
    { by: 'ga', text: 'Santai mbak, gue ke sana sekarang. Biasanya kertasnya kebanyakan.' },
    { by: 'finance', text: 'Sumpah ya, mesin ini lebih drama daripada kantor.' },
    { by: 'ga', text: 'Udah, semua salah printer. Bukan salah manusia. Hehe.' },
  ];
}

export function scriptBsod(agentName) {
  return [
    { by: 'it', name: agentName, text: 'Detail gue, laptop gue BSOD pas compile 😭 makan 2 jam kerjaan.' },
    { by: 'it', text: 'Coba aman mode. Kalau masih BSOD, install ulang aja. Klasik.' },
    { by: 'it', name: agentName, text: 'Ya udah, aman mode dulu. Doain ga BSOD lagi.' },
  ];
}

export function scriptBirthday(targetName) {
  return [
    { by: 'hrd', text: `Teman-teman! Hari ini hari spesial! Semua kumpul di pantry yuk, ada surprise buat ${targetName}! 🎂` },
    { by: 'hrd', text: 'Kita nyanyi dulu ya! Satu... dua... Selamat ulang tahun~ 🎵' },
    { by: 'any', text: 'Selamat ulang tahun! Semoga rezekinya lancar, kerjaannya... ya segitu-gitu aja wkwk.' },
    { by: 'any', text: 'Potong kue! Potong kue! Yang bagian cream paling atas buat gue ya.' },
  ];
}

export function scriptKpiReminder() {
  return [
    { by: 'hrd', text: '📢 Pengumuman: pengisian form KPI periode ini ditutup H-2 ya teman-teman. Mohon dicek keseluruhan :) ' },
    { by: 'hrd', text: 'Bagi yang belum, jangan sampai kami kirim email pribadi ya dear :)))' },
    { by: 'any', text: 'Yaaampun KPI. Ini bulan kayaknya baru kemarin ngisi.' },
  ];
}

// ============================================================
// Proyek: bank fallback konten paket
// ============================================================

const PROJECT_SECTION_VARIANTS = {
  it: [
    { title: 'Rencana Teknis & Stack', text: 'Kami pakai stack yang paling cepat jadi tapi tetap keren: Vite untuk bundling, runtime ringan, dan SQLite untuk data lokal. Arsitektur dipisah rapi supaya tidak jadi utang teknis di minggu pertama. Kalau ada revisi, tinggal tambah sprint kecil.' },
    { title: 'Implementasi & Struktur Kode', text: 'Struktur folder sudah disiapkan: modul utama, data, dan UI dipisah. CRUD standar jalan dulu, fitur keren menyusul sprint 2. Baca README untuk cara menjalankan, lalu kabari kami kalau ada error.' },
  ],
  marketing: [
    { title: 'Kampanye & Poster', text: 'Poster utama sudah digarap dengan warna korporat yang berani. Headline-nya singkat, biar jempol Direktur tidak capek membaca. Caption siap tempel ke semua platform, tinggal pasang di jam prime time.' },
    { title: 'Rencana Promosi', text: 'Kami siapkan poster, caption, dan hashtag biar proyek ini viral minimal di grup keluarga. Call to action-nya jelas: coba, pakai, lalu pamer ke teman kantor. Konten video menyusul di fase berikutnya.' },
  ],
  finance: [
    { title: 'Anggaran', text: 'Estimasi biaya disusun konservatif dengan margin keamanan gaya kantor. Semua item masuk akal, kecuali item "kopi tim", yang tetap kami pertahankan demi moral. Detail per baris ada di anggaran.csv.' },
    { title: 'Realisasi & Kontrol Biaya', text: 'Anggaran kami rapikan, angka dibulatkan biar enak dibaca. Kalau ada tagihan tak terduga, mekanismenya sudah ada: ajukan, tunggu, ingat-ingat sendiri. Prioritaskan kebutuhan, bukan keinginan.' },
  ],
  hrd: [
    { title: 'Dukungan SDM', text: 'Tim yang terlibat sudah didata dan diberi semangat plus jadwal. Kami tekankan istirahat cukup, walau realitanya deadline tetap jalan. Memo resmi sudah terbit agar semuanya terdokumentasi rapi.' },
    { title: 'Tim & Kesejahteraan', text: 'Kami pastikan beban kerja dibagi rata, minimal di atas kertas. Ketrampilan tim dipetakan supaya penugasan tidak menumpuk di satu orang saja. Evaluasi ringan akan dilakukan setelah proyek selesai.' },
  ],
  ga: [
    { title: 'Logistik & Fasilitas', text: 'Peralatan, ruangan, dan kursi sudah dicek satu per satu. Stapler yang hilang sudah dicari tanpa hasil, laporannya ada di checklist. Semua kebutuhan sarana proyek tercatat rapi.' },
    { title: 'Operasional', text: 'GA memastikan listrik, meja, dan printer dalam kondisi siap perang. Kabel sudah dirapikan demi keselamatan. Bila ada kebutuhan mendadak, kirim pesan, jangan diam-diam meminjam kursi lantai lain.' },
  ],
};

export function projectContentFallback(project) {
  const title = String(project?.title || 'Proyek');
  const order = ['it', 'marketing', 'finance', 'hrd', 'ga'];
  const sections = order.map((division) => {
    const variant = choice(PROJECT_SECTION_VARIANTS[division]);
    return { division, title: variant.title, text: variant.text };
  });
  const headline = title.length <= 24 ? title : `${title.slice(0, 23).trim()}…`;
  return {
    sections,
    poster: {
      headline,
      tagline: 'Paket kerja lengkap, rapi, dan siap dipakai.',
      hashtags: ['#PixelSinergi', '#KerjaKerjaKerja', '#SiapPakai'],
    },
    caption: `Proyek "${title}" resmi dikerjakan seluruh divisi PT Pixel Sinergi Nusantara. Laporan, anggaran, sampai kodenya sudah kami siapkan. Tinggal dipakai, pak!`,
    budget: [
      { item: 'Konsumsi tim & rapat koordinasi', qty: 3, unit: 'hari', price: 250000, note: 'termasuk kopi' },
      { item: 'Perangkat kerja tambahan', qty: 2, unit: 'unit', price: 750000, note: 'mouse bekas masih layak' },
      { item: 'Cetak & material poster', qty: 1, unit: 'paket', price: 300000, note: 'warna, jangan hitam putih' },
      { item: 'Langganan tools pendukung', qty: 2, unit: 'bulan', price: 150000, note: 'diskon tim' },
      { item: 'Dana darurat revisi', qty: 1, unit: 'paket', price: 400000, note: 'biasanya kepakai' },
    ],
    ga: [
      { category: 'Ruang', item: 'Ruang kerja tim proyek', qty: 1, owner: 'Joko', status: 'siap' },
      { category: 'Peralatan', item: 'Laptop & perangkat pendukung', qty: 3, owner: 'Joko', status: 'siap' },
      { category: 'Jaringan', item: 'Akses WiFi prioritas', qty: 1, owner: 'Bayu', status: 'proses' },
      { category: 'Konsumsi', item: 'Stok kopi & camilan', qty: 5, owner: 'Joko', status: 'siap' },
    ],
    memo: {
      subject: `Dukungan SDM untuk proyek "${title}"`,
      body: 'Sehubungan dengan tugas proyek dari Bapak Direktur, seluruh karyawan diharapkan mendukung penuh pelaksanaannya sesuai peran divisi masing-masing. Beban kerja diatur agar tetap manusiawi. Kerja sama dan komunikasi yang baik adalah kunci.',
      closing: 'Demikian disampaikan. Salam hangat, tetap semangat, dan jangan lupa istirahat.',
    },
  };
}
