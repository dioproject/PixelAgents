// ============================================================
// deliver.rs — Generator paket deliverable dinamis:
// dokumen, CSV, poster/ikon/GIF, PPTX asli, scaffold kode, dan
// penulisan ke Documents/PixelSinergi.
// ============================================================

use crate::data;
use crate::imagegen;
use crate::llm::{self, CodePlan, PlanContent, Settings};
use crate::sim::{Delivered, FileEntry};
use crate::util::{sanitize_rel_path, slugify};
use chrono::Local;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

pub struct GenRequest {
    pub title: String,
    pub brief: String,
    pub kind: &'static str,
    pub stack: &'static str,
    pub late: bool,
    pub settings: Settings,
    pub date_label: String,
    pub day_num: u32,
    pub override_root: Option<PathBuf>,
}

const COMPANY: &str = "PT Pixel Sinergi Nusantara";

fn set_progress(p: &Arc<Mutex<String>>, s: &str) {
    if let Ok(mut g) = p.lock() {
        *g = s.to_string();
    }
}

// ---------------- Orkestrasi ----------------
pub fn run(req: &GenRequest, progress: Arc<Mutex<String>>) -> Delivered {
    let mut source = "template";

    // 1) konten
    set_progress(&progress, "Merancang konten paket…");
    let fallback = llm::content_fallback(&req.title, req.kind);
    let mut content = fallback.clone();
    let mut content_llm = false;
    if llm::is_ready(&req.settings) && !req.late {
        let (sys, user) = llm::project_content_prompt(&req.title, req.kind);
        let res = llm::chat(&req.settings, &sys, &user, 2000, 75);
        if res.ok {
            if let Some(parsed) = llm::parse_content(&res.text) {
                content = merge_content(&parsed, &fallback);
                content_llm = true;
            }
        }
    }

    // 2) kode (hanya proyek software)
    let mut code: Option<(String, Vec<String>, Vec<(String, String)>, bool)> = None;
    if req.kind == "software" {
        set_progress(&progress, "Menulis kode proyek…");
        let mut code_llm = false;
        let mut plan: Option<CodePlan> = None;
        if llm::is_ready(&req.settings) && !req.late {
            let (sys, user) = llm::project_code_prompt(&req.title, &req.brief, req.stack);
            let res = llm::chat(&req.settings, &sys, &user, 8000, 120);
            if res.ok {
                if let Some(p) = llm::parse_code(&res.text, req.stack) {
                    plan = Some(p);
                    code_llm = true;
                }
            }
        }
        let (stack, run, files) = match plan {
            Some(p) => {
                let (files, _dropped) = normalize_code_files(p.files);
                let files = with_readme(files, &req.title, &p.run);
                (p.stack, p.run, files)
            }
            None => {
                let (stack, run, files) = templates::scaffold(req.stack, &req.title);
                (stack.to_string(), run, files)
            }
        };
        code = Some((stack, run, files, code_llm));
    }

    // 3) gambar
    set_progress(&progress, "Menggambar poster & ikon…");
    let sections: Vec<(String, String, String)> = content
        .sections
        .iter()
        .map(|(d, t, x)| (d.name().to_string(), t.clone(), x.clone()))
        .collect();
    let poster = imagegen::render_poster(
        &req.title,
        req.kind,
        &sections,
        &content.hashtags,
        COMPANY,
        &req.date_label,
        false,
    );
    let poster_story = if req.kind == "campaign" {
        Some(imagegen::render_poster(
            &req.title,
            req.kind,
            &sections,
            &content.hashtags,
            COMPANY,
            &req.date_label,
            true,
        ))
    } else {
        None
    };
    let icon = imagegen::render_icon(&req.title);

    set_progress(&progress, "Merender video promosi (GIF)…");
    let gif = if req.kind == "campaign" || req.kind == "software" || req.kind == "generic" {
        Some(imagegen::render_promo_gif(
            &req.title, req.kind, COMPANY, &sections,
        ))
    } else {
        None
    };

    // 4) PPTX
    let mut pptx: Option<Vec<u8>> = None;
    if req.kind == "presentation" {
        set_progress(&progress, "Menyusun slide PPTX…");
        pptx = build_pptx(&req.title, &content);
    }

    // 5) teks & manifest
    let report = build_report(req, &content, &code, source);
    let caption = build_caption(&content, &req.title);
    let budget_csv = build_budget_csv(&content);
    let memo = content.memo.clone();
    let checklist = build_checklist(&content);
    let calendar = build_calendar(&content);
    let notes = build_speaker_notes(&content);

    let mut files: Vec<(String, Vec<u8>)> = Vec::new();
    files.push(("laporan.md".into(), report.clone().into_bytes()));
    files.push(("poster.png".into(), poster.encode_png()));
    files.push(("ikon-app.png".into(), icon.encode_png()));
    files.push(("caption-sosmed.txt".into(), caption.clone().into_bytes()));
    files.push(("anggaran.csv".into(), budget_csv.into_bytes()));
    files.push(("memo-sdm.md".into(), memo.into_bytes()));
    files.push(("checklist-qa.md".into(), checklist.into_bytes()));
    if let Some(s) = poster_story {
        files.push(("poster-story.png".into(), s.encode_png()));
    }
    if let Some(g) = gif {
        files.push(("promo.gif".into(), g));
    }
    if req.kind == "campaign" || req.kind == "presentation" {
        files.push(("kalender-konten.csv".into(), calendar.into_bytes()));
    }
    if let Some(p) = pptx {
        files.push(("presentasi.pptx".into(), p));
        files.push(("speaker-notes.md".into(), notes.into_bytes()));
    }
    let mut run_hint = String::new();
    if let Some((stack, run, code_files, _)) = &code {
        run_hint = format!(
            "{}\n\nCara menjalankan:\n{}",
            stack,
            run.iter()
                .map(|r| format!("  $ {r}"))
                .collect::<Vec<_>>()
                .join("\n")
        );
        for (rel, text) in code_files {
            files.push((format!("kode/{rel}"), text.as_bytes().to_vec()));
        }
        files.push(("cara-menjalankan.txt".into(), run_hint.clone().into_bytes()));
    }
    if req.kind == "document" || req.kind == "generic" {
        files.push((
            "ringkasan-eksekutif.md".into(),
            executive_summary(req, &content).into_bytes(),
        ));
    }

    // 6) tulis ke disk
    set_progress(&progress, "Menulis paket ke disk…");
    let folder_name = format!(
        "{} - {}",
        Local::now().format("%Y-%m-%d"),
        slugify(&req.title)
    );
    let (folder, entries) = match &req.override_root {
        Some(root) => save_package_at(root, &folder_name, &files),
        None => save_package(&folder_name, &files),
    };

    let code_llm = code.as_ref().map(|c| c.3).unwrap_or(false);
    if content_llm && code_llm {
        source = "llm";
    } else if content_llm || code_llm {
        source = "mixed";
    }

    Delivered {
        id: Local::now().timestamp_millis() as u64,
        title: req.title.clone(),
        kind: req.kind,
        day_label: format!("Hari {}", req.day_num),
        finished: Local::now(),
        folder,
        files: entries,
        poster_png: Some(poster.encode_png()),
        icon_png: Some(icon.encode_png()),
        source,
        late: req.late,
        sections,
        caption,
        report_md: report,
        run_hint,
    }
}

fn merge_content(parsed: &PlanContent, fb: &PlanContent) -> PlanContent {
    PlanContent {
        sections: if parsed.sections.len() >= 3 {
            parsed.sections.clone()
        } else {
            fb.sections.clone()
        },
        caption: if parsed.caption.trim().is_empty() {
            fb.caption.clone()
        } else {
            parsed.caption.clone()
        },
        hashtags: if parsed.hashtags.len() >= 3 {
            parsed.hashtags.clone()
        } else {
            fb.hashtags.clone()
        },
        budget: if parsed.budget.len() >= 3 {
            parsed.budget.clone()
        } else {
            fb.budget.clone()
        },
        memo: if parsed.memo.trim().is_empty() {
            fb.memo.clone()
        } else {
            parsed.memo.clone()
        },
        checklist: if parsed.checklist.len() >= 3 {
            parsed.checklist.clone()
        } else {
            fb.checklist.clone()
        },
        slides: if parsed.slides.len() >= 4 {
            parsed.slides.clone()
        } else {
            fb.slides.clone()
        },
        calendar: if parsed.calendar.len() >= 3 {
            parsed.calendar.clone()
        } else {
            fb.calendar.clone()
        },
    }
}

// ---------------- Kapasitas & normalisasi kode ----------------
const MAX_FILES: usize = 40;
const MAX_FILE_BYTES: usize = 60_000;
const MAX_TOTAL_BYTES: usize = 400_000;
const MAX_DEPTH: usize = 5;

pub fn normalize_code_files(input: Vec<(String, String)>) -> (Vec<(String, String)>, usize) {
    let mut out: Vec<(String, String)> = Vec::new();
    let mut total = 0usize;
    let mut dropped = 0usize;
    for (path, content) in input {
        if out.len() >= MAX_FILES {
            dropped += 1;
            continue;
        }
        let Some(rel) = sanitize_rel_path(&path, MAX_DEPTH) else {
            dropped += 1;
            continue;
        };
        if !allowed_ext(&rel) {
            dropped += 1;
            continue;
        }
        let mut content = content;
        if content.len() > MAX_FILE_BYTES {
            content.truncate(MAX_FILE_BYTES);
        }
        if total + content.len() > MAX_TOTAL_BYTES {
            dropped += 1;
            continue;
        }
        total += content.len();
        out.push((rel, content));
    }
    (out, dropped)
}

fn allowed_ext(rel: &str) -> bool {
    let name = rel.rsplit('/').next().unwrap_or(rel);
    if name == ".gitignore" || name == ".env.example" || name.starts_with("README") {
        return true;
    }
    let ext = name.rsplit('.').next().unwrap_or("");
    const OK: [&str; 24] = [
        "md",
        "txt",
        "json",
        "js",
        "jsx",
        "ts",
        "tsx",
        "css",
        "html",
        "rs",
        "toml",
        "kt",
        "kts",
        "xml",
        "gradle",
        "properties",
        "yml",
        "yaml",
        "gitignore",
        "py",
        "go",
        "java",
        "sh",
        "sql",
    ];
    OK.contains(&ext)
}

fn with_readme(
    mut files: Vec<(String, String)>,
    title: &str,
    run: &[String],
) -> Vec<(String, String)> {
    if files
        .iter()
        .any(|(p, _)| p.eq_ignore_ascii_case("README.md"))
    {
        return files;
    }
    let mut readme = format!(
        "# {title}\n\nProyek ini dibuat oleh tim PT Pixel Sinergi Nusantara.\n\n## Menjalankan\n"
    );
    for r in run {
        readme.push_str(&format!("```bash\n{r}\n```\n"));
    }
    readme.push_str("\n## Catatan\nKode hasil AI belum diuji otomatis. Baca struktur, sesuaikan konfigurasi, lalu jalankan manual.\n");
    files.insert(0, ("README.md".into(), readme));
    files
}

// ---------------- Dokumen ----------------
fn build_report(
    req: &GenRequest,
    content: &PlanContent,
    code: &Option<(String, Vec<String>, Vec<(String, String)>, bool)>,
    source: &str,
) -> String {
    let mut s = String::new();
    s.push_str(&format!("# {}\n\n", req.title));
    s.push_str(&format!(
        "Proyek internal · {} · {}\n",
        req.date_label, COMPANY
    ));
    s.push_str(&format!(
        "Jenis: {} · Sumber konten: {}\n\n",
        data::kind_label(req.kind),
        if source == "template" {
            "template offline (aman tanpa internet)"
        } else {
            "LLM"
        }
    ));
    if req.late {
        s.push_str("> ⚠️ **Proyek dikejar deadline.** Kantor tutup sebelum proyek tuntas, jadi paket ini disusun dengan jalur cepat. Budaya perusahaan, bukan bug.\n\n");
    }
    for (d, title, text) in content.sections.iter() {
        s.push_str(&format!("## {} — {}\n{}\n\n", d.name(), title, text));
    }
    if let Some((stack, run, files, llm_used)) = code {
        s.push_str(&format!(
            "## IT & Engineering — Kode Proyek\nStack: **{stack}** ({}{}). {} file di folder `kode/`.\n\n",
            files.len(),
            if *llm_used { ", disusun LLM" } else { ", scaffold template" },
            run.len()
        ));
        s.push_str("Cara menjalankan:\n");
        for r in run {
            s.push_str(&format!("- `{r}`\n"));
        }
        s.push_str("\n");
    }
    s.push_str("## Anggaran Ringkas\n");
    let mut total = 0u64;
    for (item, qty, price) in content.budget.iter() {
        total += *qty as u64 * *price;
        s.push_str(&format!(
            "- {item} ×{qty} — Rp {}\n",
            format_rupiah(*qty as u64 * *price)
        ));
    }
    s.push_str(&format!(
        "\n**Total estimasi: Rp {}**\n\n",
        format_rupiah(total)
    ));
    s.push_str("## Status\nMenunggu ACC Direktur.\n\n## Lampiran Paket\n");
    s.push_str("- laporan.md\n- poster.png\n- ikon-app.png\n- caption-sosmed.txt\n- anggaran.csv\n- memo-sdm.md\n- checklist-qa.md\n");
    if req.kind == "presentation" {
        s.push_str("- presentasi.pptx\n- speaker-notes.md\n");
    }
    if req.kind == "campaign" {
        s.push_str("- poster-story.png\n- promo.gif\n- kalender-konten.csv\n");
    }
    if code.is_some() {
        s.push_str("- promo.gif\n- kode/ (proyek lengkap)\n");
    }
    s.push_str("\n---\n_Dokumen ini dibuat otomatis oleh kantor virtual Pixel Sinergi._\n");
    s
}

fn executive_summary(req: &GenRequest, content: &PlanContent) -> String {
    let mut s = format!("# Ringkasan Eksekutif — {}\n\n", req.title);
    s.push_str("Dokumen ini merangkum inti proyek untuk dibaca cepat (5 menit).\n\n");
    for (_, title, text) in content.sections.iter().take(5) {
        s.push_str(&format!("- **{title}.** {text}\n"));
    }
    s
}

fn build_caption(content: &PlanContent, title: &str) -> String {
    let mut s = String::new();
    s.push_str(&format!(
        "{}\n\n",
        content.caption.replace("{title}", title)
    ));
    s.push_str("Coba sekarang, lalu ceritakan pengalamanmu di kolom komentar.\n\n");
    s.push_str(&content.hashtags.join(" "));
    s.push_str("\n\n--- Variasi A ---\n");
    s.push_str(&format!(
        "{} sudah rilis! Cek sekarang sebelum kehabisan momen.\n\n",
        title
    ));
    s.push_str("--- Variasi B ---\n");
    s.push_str(
        "Kami kerjakan dengan sabar, kopi, dan sedikit drama revisi. Semoga bermanfaat!\n\n",
    );
    s
}

fn build_budget_csv(content: &PlanContent) -> String {
    let mut s = String::from("\u{feff}Item;Qty;Harga Satuan;Total\n");
    let mut total = 0u64;
    for (item, qty, price) in content.budget.iter() {
        let line_total = *qty as u64 * *price;
        total += line_total;
        s.push_str(&format!("{item};{qty};{};{}\n", *price, line_total));
    }
    s.push_str(&format!("TOTAL;;;{}\n", total));
    s
}

fn build_checklist(content: &PlanContent) -> String {
    let mut s = format!("# Checklist QA — {}\n\n", "Paket Proyek");
    for (i, item) in content.checklist.iter().enumerate() {
        s.push_str(&format!("- [ ] {}. {}\n", i + 1, item));
    }
    s.push_str("\nDicentang oleh GA sebelum demo ke Direktur.\n");
    s
}

fn build_calendar(content: &PlanContent) -> String {
    let mut s = String::from("\u{feff}Periode;Konten;Kanal\n");
    for (when, what) in content.calendar.iter() {
        s.push_str(&format!("{when};{what};Instagram/TikTok\n"));
    }
    s
}

fn build_speaker_notes(content: &PlanContent) -> String {
    let mut s = String::from("# Naskah Presenter\n\n");
    for (i, (title, bullets, notes)) in content.slides.iter().enumerate() {
        s.push_str(&format!("## Slide {} — {}\n", i + 1, title));
        for b in bullets {
            s.push_str(&format!("- {b}\n"));
        }
        if !notes.trim().is_empty() {
            s.push_str(&format!("\n_Panduan: {notes}_\n"));
        }
        s.push_str("\n");
    }
    s
}

fn format_rupiah(v: u64) -> String {
    let s = v.to_string();
    let mut out = String::new();
    let bytes = s.as_bytes();
    for (i, ch) in bytes.iter().enumerate() {
        if i > 0 && (bytes.len() - i) % 3 == 0 {
            out.push('.');
        }
        out.push(*ch as char);
    }
    out
}

// ---------------- PPTX ----------------
fn build_pptx(title: &str, content: &PlanContent) -> Option<Vec<u8>> {
    use ppt_rs::{create_pptx_with_content, SlideContent};
    let mut slides: Vec<SlideContent> = Vec::new();
    for (t, bullets, notes) in content.slides.iter() {
        let mut sc = SlideContent::new(t);
        for b in bullets {
            sc = sc.add_bullet(b);
        }
        if !notes.trim().is_empty() {
            sc = sc.notes(notes);
        }
        slides.push(sc);
    }
    if slides.is_empty() {
        slides.push(SlideContent::new(title).add_bullet("Disusun otomatis oleh tim Pixel Sinergi"));
    }
    create_pptx_with_content(title, slides).ok()
}

// ---------------- Tulis paket ----------------
pub fn packages_root() -> PathBuf {
    let base = std::env::var("USERPROFILE")
        .ok()
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("."));
    base.join("Documents").join("PixelSinergi")
}

fn unique_folder(root: &Path, name: &str) -> PathBuf {
    let first = root.join(name);
    if !first.exists() {
        return first;
    }
    for n in 2..200 {
        let cand = root.join(format!("{name} - {n}"));
        if !cand.exists() {
            return cand;
        }
    }
    root.join(format!("{name} - {}", Local::now().timestamp()))
}

pub fn save_package(folder_name: &str, files: &[(String, Vec<u8>)]) -> (PathBuf, Vec<FileEntry>) {
    let root = packages_root();
    save_package_at(&root, folder_name, files)
}

pub fn save_package_at(
    root: &Path,
    folder_name: &str,
    files: &[(String, Vec<u8>)],
) -> (PathBuf, Vec<FileEntry>) {
    let _ = std::fs::create_dir_all(root);
    let folder = unique_folder(root, folder_name);
    let mut entries = Vec::new();
    let mut ok = std::fs::create_dir_all(&folder).is_ok();
    for (rel, bytes) in files {
        let Some(safe_rel) = sanitize_rel_path(rel, 6) else {
            entries.push(FileEntry {
                rel: rel.clone(),
                bytes: 0,
                ok: false,
            });
            continue;
        };
        let path = folder.join(safe_rel.replace('/', std::path::MAIN_SEPARATOR_STR));
        if let Some(dir) = path.parent() {
            let _ = std::fs::create_dir_all(dir);
        }
        let written = std::fs::write(&path, bytes).is_ok();
        if !written {
            ok = false;
        }
        entries.push(FileEntry {
            rel: safe_rel,
            bytes: bytes.len(),
            ok: written,
        });
    }
    if !ok {
        // tetap kembalikan folder walau sebagian gagal
    }
    (folder, entries)
}

pub fn open_folder(path: &Path) {
    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("explorer").arg(path).spawn();
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = std::process::Command::new("xdg-open").arg(path).spawn();
    }
}

// ============================================================
// Scaffold kode (fallback, selalu tersedia offline)
// ============================================================
pub mod tests_deliver {
    use super::*;

    fn req(kind: &'static str, stack: &'static str, root: &Path) -> GenRequest {
        GenRequest {
            title: "Aplikasi Kasir Tauri".into(),
            brief: "Buat aplikasi desktop tauri + rust + sqlite + vanilla js + vite".into(),
            kind,
            stack,
            late: false,
            settings: Settings {
                offline: true,
                ..Settings::default()
            },
            date_label: "Senin, 1 Jan 2026".into(),
            day_num: 1,
            override_root: Some(root.to_path_buf()),
        }
    }

    #[test]
    fn normalize_caps() {
        let input = vec![
            ("a/b/c/d/e/f/g.rs".to_string(), "x".to_string()),
            ("ok/main.rs".to_string(), "fn main(){}".to_string()),
            ("bad.exe".to_string(), "MZ".to_string()),
        ];
        let (files, dropped) = normalize_code_files(input);
        assert_eq!(files.len(), 1);
        assert_eq!(files[0].0, "ok/main.rs");
        assert_eq!(dropped, 2);
    }

    #[test]
    fn pptx_is_real_zip() {
        let content = llm::content_fallback("Pitch Deck Agri", "presentation");
        let bytes = build_pptx("Pitch Deck Agri", &content).expect("pptx dibuat");
        assert_eq!(&bytes[0..2], b"PK");
        let hay = String::from_utf8_lossy(&bytes);
        assert!(
            hay.contains("ppt/slides/slide1.xml"),
            "isi zip harus punya slide"
        );
        assert!(bytes.len() > 10_000);
    }

    #[test]
    fn full_package_software() {
        let root = std::env::temp_dir().join(format!("pixeltest-{}", std::process::id()));
        let r = req("software", "tauri", &root);
        let d = run(&r, Arc::new(Mutex::new(String::new())));
        assert!(d.folder.exists());
        let names: Vec<&str> = d.files.iter().map(|f| f.rel.as_str()).collect();
        assert!(names.contains(&"laporan.md"));
        assert!(names.contains(&"poster.png"));
        assert!(names.contains(&"kode/README.md"));
        assert!(names.iter().any(|n| n.starts_with("kode/src-tauri/")));
        assert!(d.files.iter().all(|f| f.ok), "semua file harus tersimpan");
        assert!(d.poster_png.as_ref().unwrap().len() > 5000);
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn full_package_presentation() {
        let root = std::env::temp_dir().join(format!("pixeltest-ppt-{}", std::process::id()));
        let r = req("presentation", "web", &root);
        let d = run(&r, Arc::new(Mutex::new(String::new())));
        let names: Vec<&str> = d.files.iter().map(|f| f.rel.as_str()).collect();
        assert!(names.contains(&"presentasi.pptx"));
        assert!(names.contains(&"speaker-notes.md"));
        assert!(names.contains(&"kalender-konten.csv"));
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn unique_folder_dedupe() {
        let root = std::env::temp_dir().join(format!("pixeltest-uniq-{}", std::process::id()));
        std::fs::create_dir_all(&root).unwrap();
        let a = unique_folder(&root, "proyek");
        std::fs::create_dir_all(&a).unwrap();
        let b = unique_folder(&root, "proyek");
        assert_ne!(a, b);
        assert!(b.to_string_lossy().contains("- 2"));
        let _ = std::fs::remove_dir_all(&root);
    }
}

pub mod templates {
    pub fn scaffold(
        stack: &str,
        title: &str,
    ) -> (&'static str, Vec<String>, Vec<(String, String)>) {
        match stack {
            "android" => android(title),
            "tauri" => tauri(title),
            "api" => api(title),
            "webapp" => webapp(title),
            _ => web(title),
        }
    }

    fn readme(title: &str, run: &[&str], note: &str) -> (String, String) {
        let mut s =
            format!("# {title}\n\nDibuat oleh tim PT Pixel Sinergi Nusantara.\n\n## Menjalankan\n");
        for r in run {
            s.push_str(&format!("```bash\n{r}\n```\n"));
        }
        s.push_str(&format!("\n## Catatan\n{note}\n"));
        ("README.md".into(), s)
    }

    pub fn web(title: &str) -> (&'static str, Vec<String>, Vec<(String, String)>) {
        let index = format!(
            "<!doctype html>\n<html lang=\"id\">\n<head>\n  <meta charset=\"utf-8\" />\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />\n  <title>{title}</title>\n  <link rel=\"stylesheet\" href=\"style.css\" />\n</head>\n<body>\n  <main class=\"card\">\n    <h1>{title}</h1>\n    <p>Tulis catatanmu di bawah ini. Data tersimpan di localStorage.</p>\n    <form id=\"f\"><input id=\"i\" placeholder=\"Catatan baru\" required /><button>Simpan</button></form>\n    <ul id=\"list\"></ul>\n  </main>\n  <script src=\"app.js\"></script>\n</body>\n</html>\n"
        );
        let css = ":root{--bg:#1c171f;--card:#272029;--acc:#e87a52;--text:#f3e8d8}\n*{box-sizing:border-box}\nbody{margin:0;font-family:system-ui,sans-serif;background:var(--bg);color:var(--text);display:grid;place-items:center;min-height:100vh;padding:24px}\n.card{background:var(--card);border:1px solid #4c3e49;border-radius:16px;padding:24px;width:min(560px,100%)}\nh1{margin:0 0 8px;font-size:22px}\nform{display:flex;gap:8px;margin:16px 0}\ninput{flex:1;padding:10px;border-radius:10px;border:1px solid #4c3e49;background:#332a34;color:var(--text)}\nbutton{padding:10px 14px;border-radius:10px;border:0;background:var(--acc);color:#1c171f;font-weight:600;cursor:pointer}\nli{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed #4c3e49}\nli button{background:transparent;color:#e06a6a;border:0;cursor:pointer}\n";
        let js = "const KEY='catatan';\nconst load=()=>JSON.parse(localStorage.getItem(KEY)||'[]');\nconst save=(d)=>localStorage.setItem(KEY,JSON.stringify(d));\nfunction render(){const list=document.getElementById('list');list.innerHTML='';load().forEach((t,i)=>{const li=document.createElement('li');li.innerHTML=`<span></span><button>hapus</button>`;li.querySelector('span').textContent=t;li.querySelector('button').onclick=()=>{const d=load();d.splice(i,1);save(d);render();};list.appendChild(li);});}\ndocument.getElementById('f').onsubmit=(e)=>{e.preventDefault();const i=document.getElementById('i');const d=load();d.push(i.value);save(d);i.value='';render();};\nrender();\n";
        let r = readme(
            title,
            &["buka index.html di browser"],
            "Proyek contoh vanilla HTML/CSS/JS, siap dikembangkan.",
        );
        let mut files = vec![
            ("index.html".into(), index),
            ("style.css".into(), css.into()),
            ("app.js".into(), js.into()),
        ];
        files.push(r);
        (
            "web (HTML/CSS/JS)".into(),
            vec!["buka index.html".into()],
            files,
        )
    }

    pub fn webapp(title: &str) -> (&'static str, Vec<String>, Vec<(String, String)>) {
        let pkg = format!(
            "{{\n  \"name\": \"{}\",\n  \"private\": true,\n  \"version\": \"0.1.0\",\n  \"type\": \"module\",\n  \"scripts\": {{ \"dev\": \"vite\", \"build\": \"vite build\", \"preview\": \"vite preview\" }},\n  \"devDependencies\": {{ \"vite\": \"^5.0.0\" }}\n}}\n",
            crate::util::slugify(title)
        );
        let vite = "import { defineConfig } from 'vite';\nexport default defineConfig({ server: { port: 5174 } });\n";
        let index = format!(
            "<!doctype html>\n<html lang=\"id\">\n<head><meta charset=\"utf-8\"><title>{title}</title></head>\n<body><div id=\"app\"></div><script type=\"module\" src=\"/src/main.js\"></script></body>\n</html>\n"
        );
        let main = format!(
            "import './style.css';\n\ndocument.getElementById('app').innerHTML = `\n  <main class=\"card\">\n    <h1>{title}</h1>\n    <p>Aplikasi web dengan Vite. Edit src/main.js untuk mulai.</p>\n    <button id=\"go\">Coba tombol</button>\n  </main>`;\n\ndocument.getElementById('go').addEventListener('click', () => alert('Berfungsi!'));\n"
        );
        let css = ":root{--bg:#1c171f;--card:#272029;--acc:#e87a52;--text:#f3e8d8}\nbody{margin:0;font-family:system-ui,sans-serif;background:var(--bg);color:var(--text);display:grid;place-items:center;min-height:100vh}\n.card{background:var(--card);border:1px solid #4c3e49;border-radius:16px;padding:28px;max-width:520px}\nbutton{margin-top:12px;padding:10px 16px;border:0;border-radius:10px;background:var(--acc);color:#1c171f;font-weight:600;cursor:pointer}\n";
        let r = readme(
            title,
            &["bun install", "bun run dev"],
            "Vite + vanilla JS. Jalankan di Node/Bun.",
        );
        let files = vec![
            ("package.json".into(), pkg),
            ("vite.config.js".into(), vite.into()),
            ("index.html".into(), index),
            ("src/main.js".into(), main),
            ("src/style.css".into(), css.into()),
            r,
        ];
        (
            "webapp (Vite + vanilla JS)".into(),
            vec!["bun install".into(), "bun run dev".into()],
            files,
        )
    }

    pub fn api(title: &str) -> (&'static str, Vec<String>, Vec<(String, String)>) {
        let pkg = format!(
            "{{\n  \"name\": \"{}-api\",\n  \"private\": true,\n  \"version\": \"0.1.0\",\n  \"type\": \"module\",\n  \"scripts\": {{ \"start\": \"node server.js\" }},\n  \"dependencies\": {{ \"express\": \"^4.19.2\" }}\n}}\n",
            crate::util::slugify(title)
        );
        let server = "import express from 'express';\nimport { router as tasks } from './routes/tasks.js';\n\nconst app = express();\napp.use(express.json());\napp.get('/health', (_req, res) => res.json({ ok: true, app: 'Pixel Sinergi API' }));\napp.use('/tasks', tasks);\n\nconst port = process.env.PORT || 3000;\napp.listen(port, () => console.log(`API jalan di http://localhost:${port}`));\n";
        let routes = "import { Router } from 'express';\n\nexport const router = Router();\nlet tasks = [{ id: 1, title: 'Contoh tugas', done: false }];\n\nrouter.get('/', (_req, res) => res.json(tasks));\nrouter.post('/', (req, res) => { const t = { id: Date.now(), title: req.body.title || 'Tanpa judul', done: false }; tasks.push(t); res.status(201).json(t); });\nrouter.put('/:id', (req, res) => { const t = tasks.find((x) => x.id === Number(req.params.id)); if (!t) return res.status(404).json({ error: 'tidak ada' }); t.done = !!req.body.done; res.json(t); });\nrouter.delete('/:id', (req, res) => { tasks = tasks.filter((x) => x.id !== Number(req.params.id)); res.status(204).end(); });\n";
        let r = readme(
            title,
            &["bun install", "bun start"],
            "REST API Express minimal: GET/POST/PUT/DELETE /tasks.",
        );
        let files = vec![
            ("package.json".into(), pkg),
            ("server.js".into(), server.into()),
            ("routes/tasks.js".into(), routes.into()),
            r,
        ];
        (
            "api (Node + Express)".into(),
            vec!["bun install".into(), "bun start".into()],
            files,
        )
    }

    pub fn tauri(title: &str) -> (&'static str, Vec<String>, Vec<(String, String)>) {
        let ident = crate::util::slugify(title);
        let pkg = format!(
            "{{\n  \"name\": \"{ident}\",\n  \"private\": true,\n  \"version\": \"0.1.0\",\n  \"type\": \"module\",\n  \"scripts\": {{ \"dev\": \"vite\", \"build\": \"vite build\", \"tauri\": \"tauri\" }},\n  \"devDependencies\": {{ \"vite\": \"^5.0.0\", \"@tauri-apps/cli\": \"^2.0.0\" }}\n}}\n"
        );
        let index = format!(
            "<!doctype html>\n<html lang=\"id\"><head><meta charset=\"utf-8\"><title>{title}</title></head>\n<body>\n  <main><h1>{title}</h1><p>Aplikasi desktop Tauri 2.</p><button id=\"b\">Sapa dari Rust</button><pre id=\"out\"></pre></main>\n  <script type=\"module\" src=\"/src/main.js\"></script>\n</body></html>\n"
        );
        let mainjs = "import { invoke } from '@tauri-apps/api/core';\n\ndocument.getElementById('b').addEventListener('click', async () => {\n  try {\n    const msg = await invoke('greet', { name: 'Direktur' });\n    document.getElementById('out').textContent = msg;\n  } catch (e) {\n    document.getElementById('out').textContent = 'Error: ' + e;\n  }\n});\n";
        let cargo = format!(
            "[package]\nname = \"{ident}\"\nversion = \"0.1.0\"\nedition = \"2021\"\n\n[build-dependencies]\ntauri-build = {{ version = \"2\", features = [] }}\n\n[dependencies]\ntauri = {{ version = \"2\", features = [] }}\nserde = {{ version = \"1\", features = [\"derive\"] }}\nserde_json = \"1\"\n"
        );
        let buildrs = "fn main() { tauri_build::build() }\n";
        let mainrs = "#[tauri::command]\nfn greet(name: &str) -> String {\n    format!(\"Halo {name}, ini dari Rust!\")\n}\n\nfn main() {\n    tauri::Builder::default()\n        .invoke_handler(tauri::generate_handler![greet])\n        .run(tauri::generate_context!())\n        .expect(\"gagal menjalankan tauri\");\n}\n";
        let conf = format!(
            "{{\n  \"$schema\": \"https://schema.tauri.app/config/2\",\n  \"productName\": \"{title}\",\n  \"version\": \"0.1.0\",\n  \"identifier\": \"com.pixelsinergi.{ident}\",\n  \"build\": {{ \"frontendDist\": \"../dist\", \"devUrl\": \"http://localhost:5173\", \"beforeDevCommand\": \"bun run dev\" }},\n  \"app\": {{ \"windows\": [{{ \"title\": \"{title}\", \"width\": 900, \"height\": 640 }}] }},\n  \"bundle\": {{ \"active\": true }}\n}}\n"
        );
        let r = readme(
            title,
            &["bun install", "bun run tauri dev"],
            "Butuh Rust + Tauri CLI. Struktur: frontend Vite + backend Rust.",
        );
        let files = vec![
            ("package.json".into(), pkg),
            ("index.html".into(), index),
            ("src/main.js".into(), mainjs.into()),
            ("src-tauri/Cargo.toml".into(), cargo),
            ("src-tauri/build.rs".into(), buildrs.into()),
            ("src-tauri/src/main.rs".into(), mainrs.into()),
            ("src-tauri/tauri.conf.json".into(), conf),
            (
                ".gitignore".into(),
                "node_modules/\ndist/\nsrc-tauri/target/\n".into(),
            ),
            r,
        ];
        (
            "tauri (Tauri 2 + vanilla JS)".into(),
            vec!["bun install".into(), "bun run tauri dev".into()],
            files,
        )
    }

    pub fn android(title: &str) -> (&'static str, Vec<String>, Vec<(String, String)>) {
        let pkg = format!(
            "rootProject.name = \"{}\"\ninclude(\":app\")\n",
            crate::util::slugify(title)
        );
        let root_gradle =
            "plugins {\n    id(\"com.android.application\") version \"8.5.0\" apply false\n}\n";
        let app_gradle = "plugins { id(\"com.android.application\") }\n\nandroid {\n    namespace = \"com.pixelsinergi.app\"\n    compileSdk = 34\n    defaultConfig {\n        applicationId = \"com.pixelsinergi.app\"\n        minSdk = 24\n        targetSdk = 34\n        versionCode = 1\n        versionName = \"0.1.0\"\n    }\n    buildFeatures { compose = true }\n    composeOptions { kotlinCompilerExtensionVersion = \"1.5.14\" }\n    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }\n}\n\ndependencies {\n    implementation(platform(\"androidx.compose:compose-bom:2024.06.00\"))\n    implementation(\"androidx.compose.material3:material3\")\n    implementation(\"androidx.compose.ui:ui\")\n    implementation(\"androidx.activity:activity-compose:1.9.0\")\n    implementation(\"androidx.lifecycle:lifecycle-runtime-compose:2.8.0\")\n}\n";
        let manifest = "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<manifest xmlns:android=\"http://schemas.android.com/apk/res/android\">\n    <application android:label=\"Pixel Sinergi\" android:theme=\"@style/Theme.Material3.DayNight\">\n        <activity android:name=\".MainActivity\" android:exported=\"true\">\n            <intent-filter>\n                <action android:name=\"android.intent.action.MAIN\" />\n                <category android:name=\"android.intent.category.LAUNCHER\" />\n            </intent-filter>\n        </activity>\n    </application>\n</manifest>\n";
        let activity = "package com.pixelsinergi.app\n\nimport android.os.Bundle\nimport androidx.activity.ComponentActivity\nimport androidx.activity.compose.setContent\nimport androidx.activity.viewModels\nimport com.pixelsinergi.app.ui.HomeScreen\nimport com.pixelsinergi.app.ui.HomeViewModel\n\nclass MainActivity : ComponentActivity() {\n    private val vm: HomeViewModel by viewModels()\n    override fun onCreate(savedInstanceState: Bundle?) {\n        super.onCreate(savedInstanceState)\n        setContent { HomeScreen(vm) }\n    }\n}\n";
        let model = "package com.pixelsinergi.app.data\n\ndata class Note(val id: Long, val title: String, val done: Boolean = false)\n";
        let repo = "package com.pixelsinergi.app.data\n\nimport kotlinx.coroutines.flow.MutableStateFlow\n\nclass NoteRepository {\n    private val _notes = MutableStateFlow(listOf(Note(1, \"Contoh catatan\")))\n    val notes = _notes\n\n    fun add(title: String) {\n        _notes.value = _notes.value + Note(System.currentTimeMillis(), title)\n    }\n\n    fun toggle(id: Long) {\n        _notes.value = _notes.value.map { if (it.id == id) it.copy(done = !it.done) else it }\n    }\n}\n";
        let vm = "package com.pixelsinergi.app.ui\n\nimport androidx.lifecycle.ViewModel\nimport com.pixelsinergi.app.data.NoteRepository\n\nclass HomeViewModel : ViewModel() {\n    val repo = NoteRepository()\n}\n";
        let screen = "package com.pixelsinergi.app.ui\n\nimport androidx.compose.foundation.layout.*\nimport androidx.compose.foundation.lazy.LazyColumn\nimport androidx.compose.foundation.lazy.items\nimport androidx.compose.material3.*\nimport androidx.compose.runtime.*\nimport androidx.compose.ui.Alignment\nimport androidx.compose.ui.Modifier\nimport androidx.compose.ui.unit.dp\nimport androidx.compose.ui.unit.sp\n\n@OptIn(ExperimentalMaterial3Api::class)\n@Composable\nfun HomeScreen(vm: HomeViewModel) {\n    val notes by vm.repo.notes.collectAsState()\n    var input by remember { mutableStateOf(\"\") }\n    Scaffold(topBar = { TopAppBar(title = { Text(\"Pixel Sinergi\") }) }) { pad ->\n        Column(Modifier.padding(pad).padding(16.dp)) {\n            Row(verticalAlignment = Alignment.CenterVertically) {\n                OutlinedTextField(value = input, onValueChange = { input = it }, modifier = Modifier.weight(1f), label = { Text(\"Catatan baru\") })\n                Spacer(Modifier.width(8.dp))\n                Button(onClick = { if (input.isNotBlank()) { vm.repo.add(input); input = \"\" } }) { Text(\"Tambah\") }\n            }\n            Spacer(Modifier.height(16.dp))\n            LazyColumn {\n                items(notes, key = { it.id }) { n ->\n                    ListItem(\n                        headlineContent = { Text(n.title, fontSize = 16.sp) },\n                        trailingContent = { Checkbox(checked = n.done, onCheckedChange = { vm.repo.toggle(n.id) }) },\n                    )\n                }\n            }\n        }\n    }\n}\n";
        let props =
            "org.gradle.jvmargs=-Xmx2048m\nandroid.useAndroidX=true\nkotlin.code.style=official\n";
        let r = readme(
            title,
            &["buka di Android Studio", "./gradlew assembleDebug"],
            "Kotlin + Jetpack Compose (Material3). Struktur MVVM sederhana.",
        );
        let files = vec![
            ("settings.gradle.kts".into(), pkg),
            ("build.gradle.kts".into(), root_gradle.into()),
            ("gradle.properties".into(), props.into()),
            ("app/build.gradle.kts".into(), app_gradle.into()),
            ("app/src/main/AndroidManifest.xml".into(), manifest.into()),
            (
                "app/src/main/java/com/pixelsinergi/app/MainActivity.kt".into(),
                activity.into(),
            ),
            (
                "app/src/main/java/com/pixelsinergi/app/data/Note.kt".into(),
                model.into(),
            ),
            (
                "app/src/main/java/com/pixelsinergi/app/data/NoteRepository.kt".into(),
                repo.into(),
            ),
            (
                "app/src/main/java/com/pixelsinergi/app/ui/HomeViewModel.kt".into(),
                vm.into(),
            ),
            (
                "app/src/main/java/com/pixelsinergi/app/ui/HomeScreen.kt".into(),
                screen.into(),
            ),
            r,
        ];
        (
            "android (Kotlin + Jetpack Compose)".into(),
            vec![
                "buka di Android Studio".into(),
                "./gradlew assembleDebug".into(),
            ],
            files,
        )
    }
}
