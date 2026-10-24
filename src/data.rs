// ============================================================
// data.rs — Data statis: roster, bank dialog, template deliverable
// ============================================================

use crate::office::Div;

pub struct AgentDef {
    pub id: &'static str,
    pub name: &'static str,
    pub role: &'static str,
    pub div: Div,
    pub level: u8,
    pub style: &'static str,
    pub traits: &'static [&'static str],
    pub phrases: &'static [&'static str],
    pub habits: &'static str,
    pub salary: u64,
    pub seat: &'static str,
    // palette
    pub skin: [u8; 3],
    pub hair: [u8; 3],
    pub top: [u8; 3],
    pub bottom: [u8; 3],
    pub accent: [u8; 3],
}

pub const AGENTS: &[AgentDef] = &[
    AgentDef {
        id: "bayu", name: "Bayu", role: "Senior Backend Engineer", div: Div::It, level: 2,
        style: "Garing dan datar. Humornya kering, suka jawab singkat teknis.",
        traits: &["hidup dari kopi sachet", "trauma deploy hari Jumat sore", "sarkas halus"],
        phrases: &["Wkwk.", "Jir, prod meledak.", "Di lokal gue jalan kok.", "Yaudah, restart aja."],
        habits: "selalu pegang mug, ngoding tengah malam", salary: 18_500_000, seat: "seat.bayu",
        skin: [0xe8, 0xb0, 0x88], hair: [0x2b, 0x2b, 0x33], top: [0x5c, 0x6b, 0x85],
        bottom: [0x2a, 0x2e, 0x3d], accent: [0x7e, 0xe7, 0x87],
    },
    AgentDef {
        id: "rian", name: "Rian", role: "Junior Frontend Developer", div: Div::It, level: 1,
        style: "Antusias tapi panikan. Sering minta tolong duluan sebelum coba.",
        traits: &["panik kalau CSS geser 1px", "selalu bilang 'di lokal saya jalan'", "takut pull request"],
        phrases: &["Aduh pusing", "Ini kenapa ya mas?", "Di lokal saya jalan kok!", "Maaf mas, saya coba dulu ya 😭"],
        habits: "banyak buka tab StackOverflow", salary: 6_500_000, seat: "seat.rian",
        skin: [0xf2, 0xc4, 0x9b], hair: [0x4a, 0x33, 0x2a], top: [0x7a, 0x8b, 0xa8],
        bottom: [0x3a, 0x4a, 0x6a], accent: [0xff, 0xc8, 0x57],
    },
    AgentDef {
        id: "salsa", name: "Salsa", role: "DevOps & QA Engineer", div: Div::It, level: 2,
        style: "Galak, to the point, suka nge-reject PR. Ke atasan langsung formal mulus.",
        traits: &["ratu reject pull request", "disiplin pipeline", "sayang kucing"],
        phrases: &["PR-nya gue reject ya.", "Test case mana?", "Di staging aja berani, di prod jangan.", "Jangan push langsung ke main!"],
        habits: "selalu cek log server pagi-pagi", salary: 15_000_000, seat: "seat.salsa",
        skin: [0xe8, 0xb0, 0x88], hair: [0x3a, 0x2a, 0x3a], top: [0x4a, 0x5a, 0x74],
        bottom: [0x2f, 0x37, 0x52], accent: [0xff, 0x9e, 0xc4],
    },
    AgentDef {
        id: "jessica", name: "Jessica", role: "Head of Growth", div: Div::Marketing, level: 3,
        style: "Jaksel 80%. Campur bahasa Inggris, buzzword marketing, optimis berlebihan soal 'viral'.",
        traits: &["literally everywhere", "hafal istilah growth hacking", "fashionable"],
        phrases: &["Honestly, which is gitu...", "Kita butuh viral traction, guys.", "Literally ini game changer.", "Aku udah align sama stakeholders."],
        habits: "main TikTok jam kerja 'buat riset'", salary: 25_000_000, seat: "seat.jessica",
        skin: [0xf2, 0xc4, 0x9b], hair: [0x8a, 0x5a, 0x3a], top: [0xd8, 0x6b, 0x8f],
        bottom: [0x4a, 0x3a, 0x52], accent: [0xe8, 0xe8, 0xee],
    },
    AgentDef {
        id: "fajar", name: "Fajar", role: "Graphic Designer", div: Div::Marketing, level: 1,
        style: "Capek batin, pasrah, passive-aggressive halus. Sering menghela napas ('hadeh').",
        traits: &["korban revisi ke-15", "artistik tapi menyerah", "pendiam"],
        phrases: &["Hadeh.", "Oke, revisi dulu ya.", "Maksudnya 'lebih pop-up' itu apa ya?", "Masih bisa, tapi jiwa saya udah nggak."],
        habits: "headphone selalu di kepala", salary: 7_000_000, seat: "seat.fajar",
        skin: [0xd1, 0x9a, 0x6b], hair: [0x2b, 0x2b, 0x33], top: [0xe8, 0xe8, 0xee],
        bottom: [0x3d, 0x4a, 0x6b], accent: [0xc9, 0x55, 0x6e],
    },
    AgentDef {
        id: "endang", name: "Mbak Endang", role: "Senior Finance Officer", div: Div::Finance, level: 2,
        style: "Ketus dan teliti. Tidak bisa ditawar soal struk. Diam-diam sayang kantor.",
        traits: &["mata elang pendeteksi struk lecek", "anti reimburse tanpa nota", "galak tapi peduli"],
        phrases: &["Nota fisiknya mana?", "Tanpa cap basah tidak berlaku ya.", "Uang perusahaan bukan uang pohon.", "Sudah di-budget-kan belum?"],
        habits: "menghitung ulang kas kecil tiap pagi", salary: 14_000_000, seat: "seat.endang",
        skin: [0xe8, 0xb0, 0x88], hair: [0x2b, 0x2b, 0x33], top: [0xe8, 0xe8, 0xee],
        bottom: [0x4a, 0x4a, 0x52], accent: [0x7a, 0x3b, 0x4f],
    },
    AgentDef {
        id: "dimas", name: "Dimas", role: "Tax & Accounting Staff", div: Div::Finance, level: 1,
        style: "Cemas dan rajin. Sering overthinking selisih angka kecil.",
        traits: &["kalkulator seumur hidup", "stress selisih Rp 500", "takut auditor"],
        phrases: &["Selisih 500 perak darimana ini 😭", "Bentar, saya cek rekap dulu.", "Deadline SPT makin deket.", "Aman... kayaknya."],
        habits: "membawa dua kalkulator", salary: 6_800_000, seat: "seat.dimas",
        skin: [0xd1, 0x9a, 0x6b], hair: [0x4a, 0x33, 0x2a], top: [0xde, 0xd6, 0xc3],
        bottom: [0x3a, 0x3f, 0x52], accent: [0x7a, 0x3b, 0x4f],
    },
    AgentDef {
        id: "maya", name: "Bu Maya", role: "HR Manager", div: Div::Hrd, level: 3,
        style: "Sok akrab ke bawahan ('bestie', 'dear', emoticon :) yang mengancam). Ke atasan super formal.",
        traits: &["ratu email formal", "pengawas jam presensi", "hobi reminder H-1"],
        phrases: &["Halo bestie!", "Ditunggu sampai jam 12 ya dear :)", "Ini demi kebaikan kita semua ya.", "Mohon diisi form-nya ya :)"],
        habits: "kirim reminder jam 7 pagi", salary: 22_000_000, seat: "seat.maya",
        skin: [0xe8, 0xb0, 0x88], hair: [0x2b, 0x2b, 0x33], top: [0x4a, 0x8a, 0x8a],
        bottom: [0x2f, 0x37, 0x52], accent: [0xff, 0xc8, 0x57],
    },
    AgentDef {
        id: "kevin", name: "Kevin", role: "Talent Acquisition", div: Div::Hrd, level: 2,
        style: "Cringe-enthusiastic. Suka ice breaking, quote motivasi, antusias berlebihan.",
        traits: &["hobi ice breaking canggung", "posting quote LinkedIn", "semangat tanpa alasan"],
        phrases: &["Semangat pagi teman-teman! 🔥", "Kita main games dulu yuuk!", "Growth mindset!", "Recruitment itu passion saya!"],
        habits: "menyapa semua orang pagi-pagi", salary: 8_000_000, seat: "seat.kevin",
        skin: [0xf2, 0xc4, 0x9b], hair: [0x4a, 0x33, 0x2a], top: [0x6a, 0xa8, 0xa0],
        bottom: [0x3a, 0x42, 0x60], accent: [0xff, 0x9e, 0xc4],
    },
    AgentDef {
        id: "joko", name: "Mas Joko", role: "Head of General Affairs", div: Div::Ga, level: 2,
        style: "Chill, merakyat, solutif. Ngomong santai, kadang medok. Selalu bisa benerin apa saja.",
        traits: &["pahlawan dispenser", "pemegang remote AC", "kalem"],
        phrases: &["Santai bos, gampang.", "Nanti gue cek ya.", "AC 16 derajat biar fokus.", "Galon gue ganti abis ini."],
        habits: "berkeliling cek ruangan tiap jam", salary: 9_000_000, seat: "seat.joko",
        skin: [0xb5, 0x7b, 0x4e], hair: [0x2b, 0x2b, 0x33], top: [0xd0, 0xa1, 0x39],
        bottom: [0x4a, 0x54, 0x74], accent: [0x3a, 0x42, 0x60],
    },
];

impl AgentDef {
    pub fn by_id(id: &str) -> Option<&'static AgentDef> {
        AGENTS.iter().find(|a| a.id == id)
    }
}

/// Bank dialog ambient (channel, teks). {name} {other} diganti runtime.
pub const CHATTER: &[(&str, &str)] = &[
    // pagi
    ("pagi", "Pagi. Kopi dulu, ngoding kemudian."),
    (
        "pagi",
        "{name} datang paling pagi lagi, lampu aja belum pada nyala.",
    ),
    (
        "pagi",
        "Semangat pagi teman-teman! 🔥 (terlalu semangat, jam segini)",
    ),
    ("pagi", "Absen dulu ya, biar HRD senang."),
    ("pagi", "Bau kopi udah kecium dari lobby, mantap."),
    ("pagi", "Eh, AC-nya udah dingin belum? Saya kedinginan."),
    // kerja
    (
        "kerja",
        "Build-nya jalan 3 menit. Tinggal nunggu sambil ngopi.",
    ),
    ("kerja", "{name}: ini kenapa ya, di lokal saya jalan kok."),
    ("kerja", "PR-nya saya reject ya, test case mana?"),
    (
        "kerja",
        "Deadline sprint tinggal 2 hari. Santai. (tidak santai)",
    ),
    ("kerja", "Ada yang punya charger Type-C? Baterai 3% ini."),
    (
        "kerja",
        "Meeting jam 2 ya, jangan lupa. Materinya belum ada.",
    ),
    ("kerja", "Dokumennya mana? Aku butuh buat lampiran."),
    (
        "kerja",
        "{name} ngoding sambil dengerin lo-fi lagi, fokus banget.",
    ),
    (
        "kerja",
        "Server tadi malam sempat down, tapi udah aku restart.",
    ),
    ("kerja", "Kalkulator saya ada dua, jaga-jaga."),
    // kopi
    ("kopi", "Kopi keempat hari ini. Masih sehat kok, mungkin."),
    ("kopi", "Mesin kopi lagi ngambek, airnya netes pelan."),
    ("kopi", "Gula udah habis. Siapa yang ambil terakhir, ngaku."),
    ("kopi", "Espresso double, biar mata melek sampai sore."),
    ("kopi", "Mug-nya jangan lupa dicuci ya, ini bukan museum."),
    // makan
    (
        "makan",
        "Makan siang apa hari ini? Warteg sebelah lagi rame.",
    ),
    ("makan", "Aku bawa bekal, hemat. Kata Finance."),
    ("makan", "Nasi padang, pedas, siap-siap ngantuk abis ini."),
    ("makan", "Sofa pantry enak banget buat rebahan 10 menit."),
    ("makan", "Ada kerupuk di kaleng Khong Guan, silakan."),
    // sore
    (
        "sore",
        "Matahari sore dari jendela bagus banget, sayang harus kerja.",
    ),
    ("sore", "Sisa 40 menit. Jangan tambah fitur baru ya."),
    ("sore", "Tas udah rapi. Hati belum."),
    ("sore", "Sore-sore gini enaknya teh manis."),
    // malam / lembur
    ("malam", "Lampu utama udah dimatiin, lampu meja aja."),
    (
        "malam",
        "Yang lain udah pulang, tinggal kita bertiga. Suasana jadi syahdu.",
    ),
    (
        "malam",
        "Deploy malam lebih tenang, gak ada yang nanya 'udah belum'.",
    ),
    ("malam", "Tutup buku akhir bulan memang begini. Sabar."),
    (
        "malam",
        "{name} masih di depan monitor, wajahnya kena pantulan layar.",
    ),
    (
        "malam",
        "Kucing kantor tidur di atas mesin fotokopi, hangat soalnya.",
    ),
    ("malam", "Lembur itu bukan kerja, itu ibadah. (kata HRD)"),
    ("malam", "Titip ya, kalau pulang matiin lampu meja."),
    (
        "malam",
        "Ada suara printer sendiri jam segini. Jangan panik.",
    ),
    // hujan
    ("hujan", "Hujan di luar. Suara rintiknya bikin ngantuk."),
    ("hujan", "Yang bawa payung tolong dititip ya, saya numpang."),
    ("hujan", "Jendela berembun, waktu rasanya melambat."),
    // insiden
    ("insiden", "Printer rusak lagi. Mas Joko dipanggil."),
    (
        "insiden",
        "AC perang mode: satu bilang dingin, satu bilang panas.",
    ),
    ("insiden", "Reimburse saya ditolak, katanya nota lecek."),
    (
        "insiden",
        "Ada yang nge-send email ke 'reply all' lagi. Gempar.",
    ),
    // proyek
    ("proyek", "Proyek mulai. Semua fokus, kopi disiapkan."),
    ("proyek", "IT lagi nulis arsitekturnya. Doakan lancar."),
    (
        "proyek",
        "Creative sibuk nyusun visual. Revisi ditahan dulu.",
    ),
    (
        "proyek",
        "Finance itung anggaran, realistis tapi ada 'kopi tim'.",
    ),
    ("proyek", "HRD bikinin checklist rilis, biar rapi."),
    (
        "proyek",
        "GA pastikan meja, listrik, dan kursi siap perang.",
    ),
    ("proyek", "Tahap akhir. Semua merapat ke meja."),
];

pub fn chatter_for(channel: &str) -> Vec<&'static str> {
    CHATTER
        .iter()
        .filter(|c| c.0 == channel)
        .map(|c| c.1)
        .collect()
}

/// Fallback konten paket per divisi: (divisi, judul, teks)
pub fn fallback_sections(kind: &str, title: &str) -> Vec<(Div, String, String)> {
    let t = title.to_string();
    vec![
        (
            Div::It,
            if kind == "presentation" { "Data & Struktur Materi".into() } else { "Implementasi & Struktur".into() },
            if kind == "presentation" {
                format!("Kami rapikan alur materi «{t}» jadi runtut: masalah, solusi, bukti, dan penutup. Semua angka ditaruh di lampiran supaya slide utama tetap ringkas.")
            } else if kind == "campaign" {
                format!("Kami siapkan aset digital dan utas kampanye «{t}». Link, QR, dan materi landing page disusun agar gampang dibagikan.")
            } else {
                format!("Struktur folder «{t}» sudah disiapkan: modul utama, data, dan tampilan dipisah rapi. Versi pertama jalan dulu, fitur keren menyusul iterasi berikutnya.")
            },
        ),
        (
            Div::Marketing,
            "Rencana Promosi".into(),
            format!("Kami siapkan poster, caption, dan hashtag untuk «{t}». Call to action jelas: coba, pakai, lalu pamer ke grup keluarga. Semoga viral, minimal di grup alumni."),
        ),
        (
            Div::Finance,
            "Anggaran".into(),
            "Estimasi disusun konservatif dengan margin keamanan khas kantor. Semua masuk akal, kecuali pos \"kopi tim\" yang tetap kami pertahankan demi moral. Rincian ada di anggaran.csv.".into(),
        ),
        (
            Div::Hrd,
            "Tim & Kesejahteraan".into(),
            "Beban kerja dibagi rata, minimal di atas kertas. Skill tim dipetakan agar tidak menumpuk di satu orang. Evaluasi ringan menyusul setelah proyek selesai.".into(),
        ),
        (
            Div::Ga,
            "Operasional".into(),
            "Meja, listrik, kursi, dan printer dipastikan siap. Kabel dirapikan demi keselamatan. Butuh mendadak? kirim pesan, jangan diam-diam pinjam kursi lantai lain.".into(),
        ),
    ]
}

pub const FALLBACK_CAPTIONS: &[&str] = &[
    "Baru saja rilis: {title} ✨",
    "Kami persembahkan {title} — dibuat dengan sabar, kopi, dan sedikit drama revisi. Cek sekarang!",
    "Tim kami baru menyelesaikan {title}. Satu langkah kecil untuk kantor, satu langkah besar untuk produktivitas.",
    "Kabar baik! {title} sudah siap dipakai. Coba dan rasakan bedanya.",
];

pub const FALLBACK_HASHTAGS: &[&str] = &[
    "#PixelSinergi",
    "#BuatLokal",
    "#KerjaKerasCerdas",
    "#ProdukBaru",
    "#MadeInIndonesia",
    "#TimKami",
    "#RilisBaru",
];

/// Baris anggaran: (item, qty, satuan_harga)
pub fn budget_rows(kind: &str) -> Vec<(&'static str, u32, u64)> {
    match kind {
        "campaign" => vec![
            ("Iklan sosial media", 1, 2_500_000),
            ("Cetak poster A2", 25, 35_000),
            ("Endorse mikro", 3, 750_000),
            ("Snack tim lembur", 12, 25_000),
            ("Kopi tim", 40, 12_000),
        ],
        "presentation" => vec![
            ("Cetak deck cadangan", 5, 15_000),
            ("Lisensi template premium", 1, 350_000),
            ("Ruang meeting & konsumsi", 1, 850_000),
            ("Snack tim lembur", 8, 25_000),
            ("Kopi tim", 24, 12_000),
        ],
        _ => vec![
            ("Mesin/komputer tambahan", 1, 7_500_000),
            ("Layanan cloud bulanan", 3, 450_000),
            ("Domain & SSL", 1, 320_000),
            ("Snack tim lembur", 20, 25_000),
            ("Kopi tim", 60, 12_000),
        ],
    }
}

pub const CHECKLIST_QA: &[&str] = &[
    "Fitur utama jalan sesuai brief tanpa error di console",
    "Tampilan rapi di resolusi kecil & besar",
    "Teks tidak ada yang typo/keluar batas tombol",
    "Semua tombol bisa diklik dan memberi respons",
    "Data contoh tersedia untuk demo",
    "Dokumentasi cara pakai sudah ditulis (README)",
    "File ikon & poster sudah final",
    "Cek ulang penamaan file & folder",
    "Backup versi rilis sebelum demo ke Direktur",
];

/// Kata kunci deteksi jenis proyek.
pub fn detect_kind(brief: &str) -> &'static str {
    let b = brief.to_lowercase();
    let has = |k: &[&str]| k.iter().any(|s| b.contains(s));
    if has(&[
        "pptx",
        "powerpoint",
        "slide",
        "presentasi",
        "pitch deck",
        "deck",
        "proposal investor",
    ]) {
        "presentation"
    } else if has(&[
        "video",
        "reels",
        "tiktok",
        "kampanye",
        "campaign",
        "iklan",
        "promosi",
        "poster",
        "sosmed",
        "content plan",
    ]) {
        "campaign"
    } else if has(&[
        "android", "aplikasi", "app ", "apk", "mobile", "web", "website", "desktop", "tauri",
        "rust", "software", "sistem", "backend", "frontend", "program", "tools", "bot", "game",
    ]) {
        "software"
    } else if has(&[
        "laporan",
        "analisis",
        "riset",
        "research",
        "dokumen",
        "sop",
        "panduan",
        "kurikulum",
        "materi",
    ]) {
        "document"
    } else {
        "generic"
    }
}

/// Deteksi stack kode (untuk software).
pub fn detect_stack(brief: &str) -> &'static str {
    let b = brief.to_lowercase();
    let has = |k: &[&str]| k.iter().any(|s| b.contains(s));
    if has(&["android", "apk", "kotlin", "compose", "mobile"]) {
        "android"
    } else if has(&["tauri", "desktop", "exe", "installer"]) {
        "tauri"
    } else if has(&["react", "next", "vue", "svelte"]) {
        "webapp"
    } else if has(&["api", "backend", "server", "rest"]) {
        "api"
    } else if has(&["web", "website", "landing", "html"]) {
        "web"
    } else {
        "web"
    }
}

pub fn kind_label(kind: &str) -> &'static str {
    match kind {
        "presentation" => "Presentasi / Pitch Deck",
        "campaign" => "Kampanye Marketing",
        "software" => "Perangkat Lunak",
        "document" => "Dokumen / Riset",
        _ => "Proyek Umum",
    }
}

pub fn div_order() -> [Div; 5] {
    [Div::It, Div::Marketing, Div::Finance, Div::Hrd, Div::Ga]
}
