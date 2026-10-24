// ============================================================
// sim.rs — Simulasi kantor real-time (jam lokal OS), agen, kucing,
// perilaku, feed, dan siklus proyek.
// ============================================================

use crate::data::{self, AgentDef, AGENTS};
use crate::office::{self, Div, World};
use chrono::{DateTime, Datelike, Local, Timelike};
use rand::seq::SliceRandom;
use rand::Rng;
use std::path::PathBuf;

// ---------------- Fase waktu ----------------
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Phase {
    LateNight,
    Dawn,
    Morning,
    Lunch,
    Afternoon,
    Evening,
    Overtime,
}

impl Phase {
    pub fn label(&self) -> &'static str {
        match self {
            Phase::LateNight => "Dini hari",
            Phase::Dawn => "Pagi buta",
            Phase::Morning => "Jam kerja",
            Phase::Lunch => "Istirahat siang",
            Phase::Afternoon => "Sore",
            Phase::Evening => "Jam pulang",
            Phase::Overtime => "Lembur",
        }
    }
    pub fn is_dark(&self) -> bool {
        matches!(self, Phase::LateNight | Phase::Overtime | Phase::Dawn)
    }
    pub fn greeting(&self) -> &'static str {
        match self {
            Phase::LateNight => "Kantor sunyi. Hanya lampu meja yang nyala.",
            Phase::Dawn => "Pagi buta. Mas Joko mulai nyalain lampu.",
            Phase::Morning => "Jam kerja. Semua di meja masing-masing.",
            Phase::Lunch => "Istirahat siang. Pantry ramai.",
            Phase::Afternoon => "Sore. Kopi kedua diseduh.",
            Phase::Evening => "Jam pulang. Tas mulai dirapikan.",
            Phase::Overtime => "Lembur. Lampu utama redup, lampu meja hangat.",
        }
    }
    pub fn icon(&self) -> &'static str {
        match self {
            Phase::LateNight => "🌙",
            Phase::Dawn => "🌅",
            Phase::Morning => "☀️",
            Phase::Lunch => "🍱",
            Phase::Afternoon => "🌤️",
            Phase::Evening => "🌇",
            Phase::Overtime => "🌙",
        }
    }
}

pub fn phase_of(hour: f32) -> Phase {
    let h = hour.rem_euclid(24.0);
    if h < 5.0 {
        Phase::LateNight
    } else if h < 7.0 {
        Phase::Dawn
    } else if h < 12.0 {
        Phase::Morning
    } else if h < 13.0 {
        Phase::Lunch
    } else if h < 17.0 {
        Phase::Afternoon
    } else if h < 18.0 {
        Phase::Evening
    } else {
        Phase::Overtime
    }
}

// ---------------- Feed ----------------
#[derive(Clone)]
pub struct FeedItem {
    pub time: String,
    pub channel: &'static str,
    pub text: String,
}

// ---------------- Flags & stats ----------------
#[derive(Default)]
pub struct Flags {
    pub overtime: bool,
    pub free_day: bool,
    pub coffee_cut: bool,
    pub meeting: bool,
}

#[derive(Default, Clone)]
pub struct Stats {
    pub coffee: u32,
    pub conversations: u32,
    pub projects: u32,
    pub directives: u32,
}

// ---------------- Agen ----------------
pub struct Agent {
    pub def: &'static AgentDef,
    pub pos: (f32, f32),
    pub path: Vec<(i32, i32)>,
    pub path_i: usize,
    pub present: bool,
    pub sit: bool,
    pub facing: char,
    pub activity: String,
    pub goal: (i32, i32),
    pub goal_label: String,
    pub goal_sit: bool,
    pub plan_key: String,
    pub bubble: Option<(String, f64)>,
    pub mood: f32,
    pub stress: f32,
    pub coffee: f32,
    pub walk_phase: f32,
    pub arrive_min: i32,
    pub leave_min: i32,
    pub side_trip_until: f64,
    pub trip_cooldown: f64,
    pub moving: bool,
}

impl Agent {
    pub fn name(&self) -> &'static str {
        self.def.name
    }
    pub fn div(&self) -> Div {
        self.def.div
    }
}

// ---------------- Kucing kantor ----------------
#[derive(Clone, Copy, PartialEq)]
pub enum CatState {
    Wander,
    Sleep,
    Groom,
}

pub struct Cat {
    pub pos: (f32, f32),
    pub path: Vec<(i32, i32)>,
    pub path_i: usize,
    pub state: CatState,
    pub until: f64,
    pub facing: char,
    pub bubble: Option<(String, f64)>,
    pub phase: f32,
}

// ---------------- Partikel ----------------
#[derive(Clone, Copy, PartialEq)]
pub enum ParticleKind {
    Dust,
    Steam,
    Rain,
    Heart,
}

#[derive(Clone, Copy)]
pub struct Particle {
    pub kind: ParticleKind,
    pub x: f32,
    pub y: f32,
    pub vx: f32,
    pub vy: f32,
    pub life: f32,
    pub max_life: f32,
}

// ---------------- Proyek ----------------
#[derive(Clone, Copy, PartialEq, Debug)]
pub enum ProjStatus {
    Running,
    Packing,
    Done,
    Late,
}

pub struct Milestone {
    pub div: Div,
    pub pct: f32,
    pub done: bool,
    pub note: &'static str,
}

pub struct Project {
    pub id: u64,
    pub title: String,
    pub brief: String,
    pub kind: &'static str,
    pub stack: &'static str,
    pub started: DateTime<Local>,
    pub total_secs: f32,
    pub elapsed: f32,
    pub milestones: Vec<Milestone>,
    pub status: ProjStatus,
    pub late: bool,
}

impl Project {
    pub fn progress(&self) -> f32 {
        (self.elapsed / self.total_secs.max(1.0)).clamp(0.0, 1.0)
    }
    pub fn eta(&self) -> DateTime<Local> {
        let remain = (self.total_secs - self.elapsed).max(0.0) as i64;
        self.started + chrono::Duration::seconds(remain)
    }
}

// ---------------- Hasil deliverable ----------------
pub struct FileEntry {
    pub rel: String,
    pub bytes: usize,
    pub ok: bool,
}

pub struct Delivered {
    pub id: u64,
    pub title: String,
    pub kind: &'static str,
    pub day_label: String,
    pub finished: DateTime<Local>,
    pub folder: PathBuf,
    pub files: Vec<FileEntry>,
    pub poster_png: Option<Vec<u8>>,
    pub icon_png: Option<Vec<u8>>,
    pub source: &'static str,
    pub late: bool,
    pub sections: Vec<(String, String, String)>,
    pub caption: String,
    pub report_md: String,
    pub run_hint: String,
}

// ---------------- Sim ----------------
const ENTRANCE: (i32, i32) = (74, 62);
const SPEED: f32 = 3.1;

pub struct Sim {
    pub now: DateTime<Local>,
    pub sim_min: f32,
    pub preview_hour: Option<f32>,
    pub work: World,
    pub agents: Vec<Agent>,
    pub cat: Cat,
    pub feed: Vec<FeedItem>,
    pub selected: Option<usize>,
    pub project: Option<Project>,
    pub archive: Vec<Delivered>,
    pub flags: Flags,
    pub stats: Stats,
    pub chatter_at: f64,
    pub anim: f32,
    pub rain: bool,
    pub particles: Vec<Particle>,
    pub last_day: u32,
    pub night_crew: Vec<usize>,
    pub meeting_until: Option<f64>,
    pub project_secs: f32,
    pub cursor_tile: (i32, i32),
    pub day_shift: i64,
}

impl Sim {
    pub fn now_secs(&self) -> f64 {
        self.now.timestamp_millis() as f64 / 1000.0
    }

    pub fn new() -> Self {
        let now = Local::now();
        let work = World::new();
        let mut agents = Vec::with_capacity(AGENTS.len());
        for (i, def) in AGENTS.iter().enumerate() {
            let (sx, sy, _f) = office::seat_pos(def.seat).unwrap_or((5, 4, 'u'));
            let arrive = 7 * 60 + 5 + (i as i32 * 9) % 80;
            let leave = 17 * 60 + (i as i32 * 5) % 55;
            agents.push(Agent {
                def,
                pos: (ENTRANCE.0 as f32 + 0.5, ENTRANCE.1 as f32 + 0.5),
                path: Vec::new(),
                path_i: 0,
                present: false,
                sit: false,
                facing: 'u',
                activity: "Di luar kantor".into(),
                goal: (sx, sy),
                goal_label: String::new(),
                goal_sit: true,
                plan_key: String::new(),
                bubble: None,
                mood: 70.0,
                stress: 22.0,
                coffee: 1.0,
                walk_phase: i as f32 * 0.7,
                arrive_min: arrive,
                leave_min: leave,
                side_trip_until: 0.0,
                trip_cooldown: 0.0,
                moving: false,
            });
        }
        let day = now.ordinal();
        let mut sim = Self {
            now,
            sim_min: now.hour() as f32 * 60.0 + now.minute() as f32 + now.second() as f32 / 60.0,
            preview_hour: None,
            work,
            agents,
            cat: Cat {
                pos: (85.5, 41.5),
                path: Vec::new(),
                path_i: 0,
                state: CatState::Sleep,
                until: 0.0,
                facing: 'd',
                bubble: None,
                phase: 0.0,
            },
            feed: Vec::new(),
            selected: None,
            project: None,
            archive: Vec::new(),
            flags: Flags::default(),
            stats: Stats::default(),
            chatter_at: 0.0,
            anim: 0.0,
            rain: day % 4 == 1,
            particles: Vec::new(),
            last_day: day,
            night_crew: Vec::new(),
            meeting_until: None,
            project_secs: 300.0,
            cursor_tile: (0, 0),
            day_shift: 0,
        };
        sim.roll_night_crew();
        let opening = format!("{} {}", sim.phase().greeting(), sim.date_label());
        sim.push_feed("sistem", &opening);
        sim
    }

    // ---------- waktu ----------
    pub fn hour_float(&self) -> f32 {
        if let Some(h) = self.preview_hour {
            return h.rem_euclid(24.0);
        }
        self.sim_min / 60.0
    }

    pub fn phase(&self) -> Phase {
        phase_of(self.hour_float())
    }

    pub fn clock_str(&self) -> String {
        if let Some(h) = self.preview_hour {
            let hh = h.floor() as u32 % 24;
            let mm = ((h - h.floor()) * 60.0) as u32 % 60;
            return crate::util::clock_hm(hh, mm);
        }
        crate::util::clock_hm(self.now.hour(), self.now.minute())
    }

    pub fn date_label(&self) -> String {
        const DAYS: [&str; 7] = [
            "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu",
        ];
        const MONTHS: [&str; 12] = [
            "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
        ];
        let wd = self.now.weekday().num_days_from_monday() as usize;
        format!(
            "{}, {} {} {}",
            DAYS[wd],
            self.now.day(),
            MONTHS[(self.now.month() as usize - 1).min(11)],
            self.now.year()
        )
    }

    pub fn is_weekend(&self) -> bool {
        use chrono::Weekday::*;
        matches!(self.now.weekday(), Sat | Sun)
    }

    fn roll_night_crew(&mut self) {
        use chrono::Weekday::*;
        self.night_crew.clear();
        if self.project.is_some() {
            return;
        }
        match self.now.weekday() {
            Sat | Sun => {
                // kru akhir pekan: kantor tetap hidup tapi tenang
                for id in ["joko", "salsa"] {
                    if let Some(i) = self.agents.iter().position(|a| a.def.id == id) {
                        self.night_crew.push(i);
                    }
                }
            }
            Fri => {
                for id in ["endang", "joko"] {
                    if let Some(i) = self.agents.iter().position(|a| a.def.id == id) {
                        self.night_crew.push(i);
                    }
                }
            }
            _ => {
                for id in ["salsa", "dimas"] {
                    if let Some(i) = self.agents.iter().position(|a| a.def.id == id) {
                        self.night_crew.push(i);
                    }
                }
            }
        }
    }

    /// Offset hari (untuk pratinjau/QA). 0 = real-time.
    pub fn set_day_shift(&mut self, days: i64) {
        self.day_shift = days;
        self.now = Local::now() + chrono::Duration::days(days);
        self.roll_night_crew();
        for a in self.agents.iter_mut() {
            a.plan_key.clear();
        }
    }

    // ---------- feed ----------
    pub fn push_feed(&mut self, channel: &'static str, text: &str) {
        self.feed.push(FeedItem {
            time: self.clock_str(),
            channel,
            text: text.to_string(),
        });
        if self.feed.len() > 300 {
            let drop = self.feed.len() - 300;
            self.feed.drain(0..drop);
        }
    }

    pub fn say(&mut self, idx: usize, text: &str, secs: f64) {
        let until = self.now_secs() + secs;
        if let Some(a) = self.agents.get_mut(idx) {
            a.bubble = Some((text.to_string(), until));
        }
    }

    // ---------- proyek ----------
    pub fn has_project(&self) -> bool {
        self.project.is_some()
    }

    pub fn project_status(&self) -> Option<ProjStatus> {
        self.project.as_ref().map(|p| p.status)
    }

    pub fn start_project(&mut self, brief: &str) -> Result<(), String> {
        if self.project.is_some() {
            return Err("Masih ada proyek berjalan. Tunggu sampai paket selesai ya.".into());
        }
        let brief = brief.trim();
        if brief.chars().count() < 8 {
            return Err("Brief proyek minimal 8 karakter.".into());
        }
        let kind = data::detect_kind(brief);
        let stack = data::detect_stack(brief);
        let notes = [
            "Menyusun rencana",
            "Mengerjakan inti",
            "Merapikan detail",
            "Uji & revisi",
            "Pengemasan akhir",
        ];
        let milestones = data::div_order()
            .iter()
            .enumerate()
            .map(|(i, d)| Milestone {
                div: *d,
                pct: 0.20 + i as f32 * 0.16,
                done: false,
                note: notes[i],
            })
            .collect();
        let title: String = brief.chars().take(90).collect();
        self.project = Some(Project {
            id: self.now.timestamp_millis() as u64,
            title: title.clone(),
            brief: brief.to_string(),
            kind,
            stack,
            started: self.now,
            total_secs: self.project_secs,
            elapsed: 0.0,
            milestones,
            status: ProjStatus::Running,
            late: false,
        });
        self.roll_night_crew();
        self.push_feed("proyek", &format!("📋 PROYEK BARU: {title}"));
        self.push_feed(
            "proyek",
            "Semua divisi merapat. Kopi disiapkan, fokus mode aktif.",
        );
        Ok(())
    }

    pub fn finish_project(&mut self, d: Delivered) {
        self.stats.projects += 1;
        self.archive.push(d);
        self.project = None;
        self.roll_night_crew();
        self.push_feed("proyek", "✅ Paket proyek selesai dan tersimpan.");
        for a in self.agents.iter_mut() {
            a.activity = "Balik kerja santai".into();
        }
    }

    // ---------- util perilaku ----------
    fn is_present_by_schedule(&self, i: usize) -> bool {
        if self.has_project() {
            return true;
        }
        if self.is_weekend() {
            let h = self.hour_float();
            return self.night_crew.contains(&i) && (9.0..17.0).contains(&h);
        }
        let a = &self.agents[i];
        if self.sim_min < a.arrive_min as f32 {
            return false;
        }
        if self.sim_min < a.leave_min as f32 {
            return true;
        }
        self.night_crew.contains(&i) && self.hour_float() < 23.0
    }

    fn work_label(&self, a: &Agent) -> String {
        if self.has_project() {
            let t = self
                .project
                .as_ref()
                .map(|p| p.title.clone())
                .unwrap_or_default();
            return format!("Fokus proyek: {t}");
        }
        let base = match a.div() {
            Div::It => "Ngoding / cek server",
            Div::Marketing => "Desain & konten",
            Div::Finance => "Rekap angka",
            Div::Hrd => "Review CV & form",
            Div::Ga => "Cek ruangan",
            Div::Exec => "Baca laporan",
        };
        if self.sim_min >= a.leave_min as f32 {
            format!("Lembur: {base}")
        } else {
            base.to_string()
        }
    }

    fn decide_goal(&self, i: usize) -> (bool, (i32, i32), String, bool) {
        let a = &self.agents[i];
        let hour = self.hour_float();
        let want_present = self.is_present_by_schedule(i);
        if !want_present {
            return (false, ENTRANCE, "Di luar kantor".into(), false);
        }
        if self.flags.free_day && !self.has_project() {
            let s = &office::SEATS[(i * 3 + 1) % office::SEATS.len()];
            return (true, (s.2, s.3), "Santai (mode bebas)".into(), true);
        }
        if self.flags.meeting && !self.has_project() {
            let slot = office::SEATS
                .iter()
                .filter(|s| s.1 == "meeting")
                .nth(i % 12);
            if let Some(s) = slot {
                return (true, (s.2, s.3), "Rapat dadakan".into(), true);
            }
        }
        if !self.has_project() && (12.0..13.0).contains(&hour) {
            let lunch: Vec<_> = office::SEATS.iter().filter(|s| s.1 == "pantry").collect();
            if !lunch.is_empty() {
                let s = lunch[i % lunch.len()];
                return (true, (s.2, s.3), "Makan siang".into(), true);
            }
        }
        if !self.has_project() && (15.0..15.25).contains(&hour) {
            if let Some(p) = office::HOTSPOTS
                .iter()
                .find(|h| h.0 == "coffee")
                .and_then(|h| h.1.first())
            {
                return (true, *p, "Coffee break sore".into(), false);
            }
        }
        if self.now_secs() < a.side_trip_until {
            return (true, a.goal, a.goal_label.clone(), a.goal_sit);
        }
        let (sx, sy, _) = office::seat_pos(a.def.seat).unwrap_or((5, 4, 'u'));
        (true, (sx, sy), self.work_label(a), true)
    }

    // ---------- tick ----------
    pub fn tick(&mut self, dt: f32) {
        self.anim += dt;
        self.now = Local::now() + chrono::Duration::days(self.day_shift);
        if let Some(h) = self.preview_hour {
            self.sim_min = h.rem_euclid(24.0) * 60.0;
        } else {
            self.sim_min = self.now.hour() as f32 * 60.0
                + self.now.minute() as f32
                + self.now.second() as f32 / 60.0;
        }
        if self.now.ordinal() != self.last_day {
            self.last_day = self.now.ordinal();
            self.rain = self.now.ordinal() % 4 == 1;
            self.flags.free_day = false;
            self.flags.overtime = false;
            self.roll_night_crew();
            let msg = format!("Hari baru. {}", self.phase().greeting());
            self.push_feed("sistem", &msg);
        }

        // kedaluwarsa rapat
        if let Some(u) = self.meeting_until {
            if self.now_secs() > u {
                self.meeting_until = None;
                self.flags.meeting = false;
                self.push_feed(
                    "kerja",
                    "Rapat selesai. Semua kembali (dan mengeluh halus).",
                );
            }
        }

        // proyek: progres + tonggak
        let mut fired: Vec<(Div, &'static str)> = Vec::new();
        let mut packing: Option<String> = None;
        if let Some(p) = self.project.as_mut() {
            if p.status == ProjStatus::Running {
                p.elapsed += dt;
                let prog = p.progress();
                for m in p.milestones.iter_mut() {
                    if !m.done && prog >= m.pct {
                        m.done = true;
                        fired.push((m.div, m.note));
                    }
                }
                if prog >= 1.0 {
                    p.status = ProjStatus::Packing;
                    packing = Some(p.title.clone());
                }
            }
        }
        for (div, note) in fired {
            let msg = format!("🔨 {}: {note}…", div.name());
            self.push_feed("proyek", &msg);
        }
        if let Some(t) = packing {
            let msg = format!("📦 Semua tahap selesai. Menyusun paket «{t}»…");
            self.push_feed("proyek", &msg);
        }

        for i in 0..self.agents.len() {
            self.update_agent(i, dt);
        }
        self.update_cat(dt);
        self.update_particles(dt);
        self.ambient();

        for a in self.agents.iter_mut() {
            if a.present {
                a.stress = (a.stress + dt * 0.02).min(100.0);
                a.mood = (a.mood - dt * 0.01).clamp(0.0, 100.0);
                a.coffee = (a.coffee - dt * 0.004).max(0.0);
            }
        }
    }

    fn update_agent(&mut self, i: usize, dt: f32) {
        let (want_present, goal, label, sit) = self.decide_goal(i);
        let now = self.now_secs();
        let phase = self.phase();
        let has_project = self.has_project();
        let mut need_repath = false;
        let mut start_entrance = false;
        let mut trip = false;

        {
            let a = &mut self.agents[i];
            let key = format!("{}|{:?}|{}|{}", label, goal, sit, want_present);
            if a.plan_key != key {
                a.plan_key = key;
                a.goal = goal;
                a.goal_label = label.clone();
                a.goal_sit = sit;
                if want_present && !a.present {
                    a.present = true;
                    start_entrance = true;
                }
                need_repath = true;
            }
            if a.present
                && !has_project
                && matches!(phase, Phase::Morning | Phase::Afternoon)
                && a.sit
                && now > a.trip_cooldown
                && a.coffee < 1.4
            {
                let mut rng = rand::thread_rng();
                if rng.gen_bool((0.02 * dt as f64).min(0.5)) {
                    if let Some(p) = office::HOTSPOTS
                        .iter()
                        .find(|h| h.0 == "coffee")
                        .and_then(|h| h.1.first())
                    {
                        a.trip_cooldown = now + 90.0;
                        a.side_trip_until = now + 12.0;
                        a.goal = *p;
                        a.goal_label = "Ambil kopi".into();
                        a.goal_sit = false;
                        a.path.clear();
                        a.path_i = 0;
                        trip = true;
                        need_repath = true;
                    }
                }
            }
        }
        if start_entrance {
            self.agents[i].pos = (ENTRANCE.0 as f32 + 0.5, ENTRANCE.1 as f32 + 0.5);
        }
        if trip {
            self.stats.coffee += 1;
        }
        if need_repath {
            let target = if want_present {
                self.agents[i].goal
            } else {
                ENTRANCE
            };
            self.repath(i, target);
        }

        // gerak
        {
            let a = &mut self.agents[i];
            if a.path_i < a.path.len() {
                a.moving = true;
                let target = a.path[a.path_i];
                let (tx, ty) = (target.0 as f32 + 0.5, target.1 as f32 + 0.5);
                let (dx, dy) = (tx - a.pos.0, ty - a.pos.1);
                let dist = (dx * dx + dy * dy).sqrt();
                let step = SPEED * dt;
                if dist <= step || dist < 0.001 {
                    a.pos = (tx, ty);
                    a.path_i += 1;
                    if a.path_i >= a.path.len() {
                        a.moving = false;
                        a.sit = a.goal_sit;
                        a.activity = a.goal_label.clone();
                    }
                } else {
                    a.pos.0 += dx / dist * step;
                    a.pos.1 += dy / dist * step;
                    a.walk_phase += dt * 9.0;
                    if dx.abs() > dy.abs() {
                        a.facing = if dx > 0.0 { 'r' } else { 'l' };
                    } else {
                        a.facing = if dy > 0.0 { 'd' } else { 'u' };
                    }
                    a.sit = false;
                }
            } else {
                a.moving = false;
                if !want_present && a.present {
                    a.present = false;
                    a.activity = "Di luar kantor".into();
                    a.bubble = None;
                }
            }
            if let Some((_, until)) = a.bubble {
                if now > until {
                    a.bubble = None;
                }
            }
            if a.coffee > 2.2 {
                a.mood = (a.mood + dt * 0.5).min(100.0);
                a.coffee = 2.0;
            }
        }
    }

    fn repath(&mut self, i: usize, goal: (i32, i32)) {
        let start = (
            self.agents[i].pos.0.round() as i32,
            self.agents[i].pos.1.round() as i32,
        );
        let path = self.work.astar(start, goal);
        let a = &mut self.agents[i];
        match path {
            Some(p) => {
                a.path = p;
                a.path_i = if a.path.len() <= 1 { a.path.len() } else { 1 };
            }
            None => {
                a.path.clear();
                a.path_i = 0;
            }
        }
    }

    // ---------- kucing ----------
    fn update_cat(&mut self, dt: f32) {
        let now = self.now_secs();
        self.cat.phase += dt;
        if let Some((_, until)) = self.cat.bubble {
            if now > until {
                self.cat.bubble = None;
            }
        }
        if now < self.cat.until {
            return;
        }
        if self.cat.path_i < self.cat.path.len() {
            let target = self.cat.path[self.cat.path_i];
            let (tx, ty) = (target.0 as f32 + 0.5, target.1 as f32 + 0.5);
            let (dx, dy) = (tx - self.cat.pos.0, ty - self.cat.pos.1);
            let dist = (dx * dx + dy * dy).sqrt();
            let step = 1.6 * dt;
            if dist <= step || dist < 0.001 {
                self.cat.pos = (tx, ty);
                self.cat.path_i += 1;
                if self.cat.path_i >= self.cat.path.len() {
                    self.cat.state = CatState::Sleep;
                    self.cat.until = now + rand::thread_rng().gen_range(20.0..70.0);
                }
            } else {
                self.cat.pos.0 += dx / dist * step;
                self.cat.pos.1 += dy / dist * step;
                if dx.abs() > dy.abs() {
                    self.cat.facing = if dx > 0.0 { 'r' } else { 'l' };
                } else {
                    self.cat.facing = if dy > 0.0 { 'd' } else { 'u' };
                }
            }
            return;
        }
        let mut rng = rand::thread_rng();
        if rng.gen_bool(0.55) {
            let spots: [(i32, i32); 8] = [
                (62, 44),
                (72, 40),
                (88, 38),
                (60, 56),
                (78, 60),
                (66, 30),
                (90, 44),
                (55, 41),
            ];
            let to = spots[rng.gen_range(0..spots.len())];
            let from = (self.cat.pos.0.round() as i32, self.cat.pos.1.round() as i32);
            if let Some(p) = self.work.astar(from, to) {
                self.cat.path = p;
                self.cat.path_i = if self.cat.path.len() <= 1 {
                    self.cat.path.len()
                } else {
                    1
                };
                self.cat.state = CatState::Wander;
            }
        } else {
            let sleeping = rng.gen_bool(0.7);
            self.cat.state = if sleeping {
                CatState::Sleep
            } else {
                CatState::Groom
            };
            self.cat.until = now + rng.gen_range(15.0..60.0);
            if rng.gen_bool(0.25) {
                let arr = ["Meow.", "Purr…", "Zzz…", "Mrrrow?"];
                let meow = *arr.choose(&mut rng).unwrap_or(&"Meow.");
                self.cat.bubble = Some((meow.to_string(), now + 4.0));
            }
        }
    }

    // ---------- partikel ----------
    fn update_particles(&mut self, dt: f32) {
        for p in self.particles.iter_mut() {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
        }
        self.particles.retain(|p| p.life > 0.0);

        let hour = self.hour_float();
        let mut rng = rand::thread_rng();
        if (7.0..17.0).contains(&hour)
            && self.particles.len() < 140
            && rng.gen_bool((1.5 * dt as f64).min(0.6))
        {
            self.particles.push(Particle {
                kind: ParticleKind::Dust,
                x: rng.gen_range(52.0..95.0),
                y: rng.gen_range(53.0..62.0),
                vx: rng.gen_range(-0.15..0.15),
                vy: rng.gen_range(-0.1..0.05),
                life: rng.gen_range(6.0..14.0),
                max_life: 14.0,
            });
        }
        if rng.gen_bool((2.0 * dt as f64).min(0.7)) {
            self.particles.push(Particle {
                kind: ParticleKind::Steam,
                x: 83.5,
                y: 29.2,
                vx: rng.gen_range(-0.1..0.1),
                vy: -0.5,
                life: rng.gen_range(1.2..2.2),
                max_life: 2.2,
            });
        }
        if rng.gen_bool((1.2 * dt as f64).min(0.5)) {
            self.particles.push(Particle {
                kind: ParticleKind::Steam,
                x: 5.5,
                y: 3.4,
                vx: rng.gen_range(-0.1..0.1),
                vy: -0.45,
                life: rng.gen_range(1.0..2.0),
                max_life: 2.0,
            });
        }
        let mut hearts: Vec<(f32, f32)> = Vec::new();
        for a in self.agents.iter() {
            if a.present && a.mood > 88.0 && rng.gen_bool((0.15 * dt as f64).min(0.3)) {
                hearts.push((a.pos.0, a.pos.1 - 0.6));
            }
        }
        for (hx, hy) in hearts {
            self.particles.push(Particle {
                kind: ParticleKind::Heart,
                x: hx,
                y: hy,
                vx: rng.gen_range(-0.2..0.2),
                vy: -0.6,
                life: 1.6,
                max_life: 1.6,
            });
        }
        // rintik hujan (dalam ruangan terlihat di kaca jendela)
        if self.rain && rng.gen_bool((6.0 * dt as f64).min(0.9)) {
            self.particles.push(Particle {
                kind: ParticleKind::Rain,
                x: rng.gen_range(52.0..95.0),
                y: 52.5,
                vx: -0.05,
                vy: 3.0,
                life: 0.9,
                max_life: 0.9,
            });
        }
    }

    // ---------- obrolan ambient ----------
    fn ambient(&mut self) {
        let now = self.now_secs();
        let interval = if self.has_project() { 26.0 } else { 45.0 };
        if now < self.chatter_at {
            return;
        }
        self.chatter_at = now + interval + rand::thread_rng().gen_range(0.0..20.0);

        let hour = self.hour_float();
        let mut rng = rand::thread_rng();
        let channel = if self.has_project() && rng.gen_bool(0.6) {
            "proyek"
        } else if self.rain && rng.gen_bool(0.25) {
            "hujan"
        } else if self.phase().is_dark() {
            "malam"
        } else if hour < 8.5 {
            "pagi"
        } else if (12.0..13.0).contains(&hour) {
            "makan"
        } else if hour >= 16.5 {
            "sore"
        } else if rng.gen_bool(0.2) {
            "kopi"
        } else if rng.gen_bool(0.06) {
            "insiden"
        } else {
            "kerja"
        };

        let lines = data::chatter_for(channel);
        if lines.is_empty() {
            return;
        }
        let base = lines[rng.gen_range(0..lines.len())];
        let present: Vec<usize> = self
            .agents
            .iter()
            .enumerate()
            .filter(|(_, a)| a.present)
            .map(|(i, _)| i)
            .collect();
        if present.is_empty() {
            return;
        }
        let i = present[rng.gen_range(0..present.len())];
        let text = if base.contains("{name}") {
            let name = self.agents[i].name().to_string();
            base.replace("{name}", &name)
                .replace("{other}", "seseorang")
        } else {
            base.to_string()
        };
        self.say(i, &text, 7.0);
        let chan = ambient_channel(channel);
        self.push_feed(chan, &text);
        self.stats.conversations += 1;
    }

    // ---------- aksi direktif ----------
    pub fn directive_meeting(&mut self) {
        self.flags.meeting = true;
        self.meeting_until = Some(self.now_secs() + 240.0);
        self.stats.directives += 1;
        self.push_feed(
            "direksi",
            "📢 RAPAT DADAKAN! Semua divisi menuju Ruang Meeting.",
        );
        for a in self.agents.iter_mut() {
            a.plan_key.clear();
        }
    }

    pub fn directive_overtime(&mut self) {
        self.flags.overtime = true;
        self.stats.directives += 1;
        self.push_feed(
            "direksi",
            "🌙 LEMBUR MALAM INI. Semua divisi tetap bekerja.",
        );
        for a in self.agents.iter_mut() {
            a.stress = (a.stress + 8.0).min(100.0);
        }
    }

    pub fn directive_free_day(&mut self) {
        self.flags.free_day = true;
        self.stats.directives += 1;
        self.push_feed(
            "direksi",
            "🏖️ BEBAS NGAPAIN AJA. Semua santai (tapi curiga jebakan).",
        );
        for a in self.agents.iter_mut() {
            a.plan_key.clear();
        }
    }

    pub fn directive_coffee_cut(&mut self) {
        self.flags.coffee_cut = true;
        self.stats.directives += 1;
        self.push_feed(
            "direksi",
            "☕ BUDGET KOPI DIPOTONG 50%. Finance senang, tim lain menahan napas.",
        );
    }

    pub fn directive_custom(&mut self, text: &str) {
        let text = text.trim();
        if text.is_empty() {
            return;
        }
        self.stats.directives += 1;
        self.push_feed("direksi", &format!("📢 TITAH DIREKSI: \"{text}\""));

        // Cari 2-3 agen yang hadir untuk merespons formal ke Direktur
        let present = self.present_agents();
        let mut rng = rand::thread_rng();
        let responses = [
            "Baik Pak Direktur, segera kami tindak lanjuti.",
            "Siap Pak, tim kami langsung eksekusi arahan ini.",
            "Dicatat Pak. Kami koordinasikan lintas divisi.",
            "Siap laksanakan, Pak. Segera kami laporkan progresnya.",
        ];

        let mut count = 0;
        for &idx in present.iter() {
            if count >= 2 {
                break;
            }
            use rand::seq::SliceRandom;
            if let Some(&resp) = responses.choose(&mut rng) {
                let agent_name = self.agents[idx].name();
                self.say(idx, resp, 6.0);
                self.push_feed("direksi", &format!("{}: \"{}\"", agent_name, resp));
                count += 1;
            }
        }
    }

    pub fn set_preview(&mut self, h: Option<f32>) {
        self.preview_hour = h;
        if let Some(v) = h {
            self.sim_min = v.rem_euclid(24.0) * 60.0;
        } else {
            self.now = Local::now() + chrono::Duration::days(self.day_shift);
            self.sim_min = self.now.hour() as f32 * 60.0
                + self.now.minute() as f32
                + self.now.second() as f32 / 60.0;
        }
        for a in self.agents.iter_mut() {
            a.plan_key.clear();
        }
    }

    pub fn clear_flags_for_new_day(&mut self) {
        self.flags.free_day = false;
        self.flags.overtime = false;
    }

    /// Indeks agen yang sedang berada di kantor.
    pub fn present_agents(&self) -> Vec<usize> {
        self.agents
            .iter()
            .enumerate()
            .filter(|(_, a)| a.present)
            .map(|(i, _)| i)
            .collect()
    }
}

fn ambient_channel(c: &str) -> &'static str {
    match c {
        "makan" => "pantry",
        "malam" | "hujan" => "gosip",
        "insiden" => "insiden",
        "proyek" => "proyek",
        _ => "kerja",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn phases() {
        assert_eq!(phase_of(8.0), Phase::Morning);
        assert_eq!(phase_of(12.5), Phase::Lunch);
        assert_eq!(phase_of(21.0), Phase::Overtime);
        assert_eq!(phase_of(2.0), Phase::LateNight);
    }

    #[test]
    fn project_flow() {
        let mut sim = Sim::new();
        assert!(sim.start_project("Buat aplikasi desktop Tauri").is_ok());
        assert!(sim.has_project());
        assert_eq!(sim.project.as_ref().unwrap().kind, "software");
        assert_eq!(sim.project.as_ref().unwrap().stack, "tauri");
        assert!(sim.start_project("Buat presentasi investor").is_err());
    }

    #[test]
    fn project_milestones_fire() {
        let mut sim = Sim::new();
        sim.project_secs = 1.0;
        sim.start_project("Buat pptx pitch deck agrikultur")
            .unwrap();
        let mut guard = 0;
        while sim.project.as_ref().map(|p| p.status) == Some(ProjStatus::Running) && guard < 200 {
            sim.tick(0.2);
            guard += 1;
        }
        let p = sim.project.as_ref().unwrap();
        assert_eq!(p.kind, "presentation");
        assert_eq!(p.status, ProjStatus::Packing);
        assert!(p.milestones.iter().all(|m| m.done));
    }

    #[test]
    fn kind_detect() {
        assert_eq!(data::detect_kind("buatkan pptx proposal"), "presentation");
        assert_eq!(data::detect_kind("aplikasi android keuangan"), "software");
        assert_eq!(
            data::detect_kind("kampanye promo kopi di tiktok"),
            "campaign"
        );
    }
}
