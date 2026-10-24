// ============================================================
// llm.rs — Pengaturan + klien LLM (OpenAI-compatible) + prompt &
// parser paket proyek. Endpoint bisa diubah saat runtime.
// ============================================================

use crate::data;
use crate::office::Div;
use crate::util::{extract_json_block, json_escape};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::PathBuf;
use std::time::Duration;

#[derive(Serialize, Deserialize, Clone)]
pub struct Settings {
    pub base_url: String,
    pub api_key: String,
    pub model: String,
    pub temperature: f32,
    pub max_tokens: u32,
    pub timeout_secs: u64,
    pub offline: bool,
    #[serde(default = "default_pace")]
    pub project_pace_secs: f32,
    #[serde(default)]
    pub compact: bool,
    #[serde(default)]
    pub always_on_top: bool,
    #[serde(default)]
    pub sound: bool,
    #[serde(default)]
    pub show_names: bool,
}

fn default_pace() -> f32 {
    300.0
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            base_url: String::new(),
            api_key: String::new(),
            model: "gpt-4o-mini".into(),
            temperature: 0.9,
            max_tokens: 900,
            timeout_secs: 60,
            offline: false,
            project_pace_secs: 300.0,
            compact: false,
            always_on_top: false,
            sound: true,
            show_names: true,
        }
    }
}

pub fn config_path() -> PathBuf {
    let base = std::env::var("APPDATA").unwrap_or_else(|_| ".".into());
    PathBuf::from(base)
        .join("PixelSinergi")
        .join("settings.json")
}

pub fn load() -> Settings {
    let p = config_path();
    match std::fs::read_to_string(&p) {
        Ok(txt) => serde_json::from_str(&txt).unwrap_or_default(),
        Err(_) => Settings::default(),
    }
}

pub fn save(s: &Settings) -> Result<(), String> {
    let p = config_path();
    if let Some(dir) = p.parent() {
        std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    let txt = serde_json::to_string_pretty(s).map_err(|e| e.to_string())?;
    std::fs::write(&p, txt).map_err(|e| e.to_string())
}

pub fn is_ready(s: &Settings) -> bool {
    !s.offline && !s.base_url.trim().is_empty() && !s.model.trim().is_empty()
}

fn normalize_url(base: &str) -> String {
    let b = base.trim().trim_end_matches('/');
    if b.ends_with("/chat/completions") {
        b.to_string()
    } else if b.ends_with("/v1") {
        format!("{b}/chat/completions")
    } else {
        format!("{b}/v1/chat/completions")
    }
}

#[derive(Clone)]
pub struct ChatResult {
    pub ok: bool,
    pub text: String,
    pub error: String,
}

pub fn chat(
    s: &Settings,
    system: &str,
    user: &str,
    max_tokens: u32,
    timeout_secs: u64,
) -> ChatResult {
    if !is_ready(s) {
        return ChatResult {
            ok: false,
            text: String::new(),
            error: "LLM belum dikonfigurasi".into(),
        };
    }
    let client = match reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(timeout_secs))
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            return ChatResult {
                ok: false,
                text: String::new(),
                error: e.to_string(),
            }
        }
    };
    let mut body = serde_json::json!({
        "model": s.model,
        "max_tokens": max_tokens,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    });
    if s.temperature > 0.0 {
        body["temperature"] = serde_json::json!(s.temperature);
    }
    let url = normalize_url(&s.base_url);
    let mut req = client.post(&url).json(&body);
    if !s.api_key.trim().is_empty() {
        req = req.header("Authorization", format!("Bearer {}", s.api_key.trim()));
    }
    match req.send() {
        Ok(resp) => {
            let status = resp.status();
            let text = resp.text().unwrap_or_default();
            if !status.is_success() {
                let snippet: String = text.chars().take(220).collect();
                return ChatResult {
                    ok: false,
                    text: String::new(),
                    error: format!("HTTP {status}: {snippet}"),
                };
            }
            match serde_json::from_str::<Value>(&text) {
                Ok(v) => {
                    let content = v
                        .get("choices")
                        .and_then(|c| c.get(0))
                        .and_then(|c| c.get("message"))
                        .and_then(|m| m.get("content"))
                        .and_then(|c| c.as_str())
                        .unwrap_or("");
                    if content.trim().is_empty() {
                        ChatResult {
                            ok: false,
                            text: String::new(),
                            error: "respons kosong".into(),
                        }
                    } else {
                        ChatResult {
                            ok: true,
                            text: content.to_string(),
                            error: String::new(),
                        }
                    }
                }
                Err(e) => ChatResult {
                    ok: false,
                    text: String::new(),
                    error: format!("JSON tidak valid: {e}"),
                },
            }
        }
        Err(e) => ChatResult {
            ok: false,
            text: String::new(),
            error: e.to_string(),
        },
    }
}

pub fn fetch_models(s: &Settings) -> Result<Vec<String>, String> {
    if s.base_url.trim().is_empty() {
        return Err("Base URL belum diisi".into());
    }
    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;

    let b = s.base_url.trim().trim_end_matches('/');
    let url = if b.ends_with("/chat/completions") {
        b.replace("/chat/completions", "/models")
    } else if b.ends_with("/v1") {
        format!("{b}/models")
    } else {
        format!("{b}/v1/models")
    };

    let mut req = client.get(&url);
    if !s.api_key.trim().is_empty() {
        req = req.header("Authorization", format!("Bearer {}", s.api_key.trim()));
    }

    let resp = req.send().map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!("HTTP {}: gagal mengambil daftar model", resp.status()));
    }

    let text = resp.text().unwrap_or_default();
    let v: Value = serde_json::from_str(&text).map_err(|e| format!("JSON tidak valid: {e}"))?;

    let mut models = Vec::new();
    if let Some(data) = v.get("data").and_then(|d| d.as_array()) {
        for m in data {
            if let Some(id) = m.get("id").and_then(|i| i.as_str()) {
                models.push(id.to_string());
            }
        }
    } else if let Some(arr) = v.as_array() {
        for m in arr {
            if let Some(id) = m.get("id").and_then(|i| i.as_str()) {
                models.push(id.to_string());
            }
        }
    }

    if models.is_empty() {
        Err("Tidak ada model ditemukan di endpoint".into())
    } else {
        models.sort();
        Ok(models)
    }
}

pub fn test_connection(s: &Settings) -> Result<String, String> {
    let r = chat(
        s,
        "Anda asisten ringkas.",
        "Balas hanya dengan kata: OK",
        12,
        25,
    );
    if r.ok {
        Ok(r.text.trim().to_string())
    } else {
        Err(r.error)
    }
}

// ============================================================
// Prompt & parser paket proyek
// ============================================================
#[derive(Clone)]
pub struct PlanContent {
    pub sections: Vec<(Div, String, String)>,
    pub caption: String,
    pub hashtags: Vec<String>,
    pub budget: Vec<(String, u32, u64)>,
    pub memo: String,
    pub checklist: Vec<String>,
    pub slides: Vec<(String, Vec<String>, String)>,
    pub calendar: Vec<(String, String)>,
}

#[derive(Clone)]
pub struct CodePlan {
    pub stack: String,
    pub run: Vec<String>,
    pub files: Vec<(String, String)>,
}

pub fn content_fallback(title: &str, kind: &str) -> PlanContent {
    let sections = data::fallback_sections(kind, title);
    let caption = data::FALLBACK_CAPTIONS[0].replace("{title}", title);
    let budget: Vec<(String, u32, u64)> = data::budget_rows(kind)
        .into_iter()
        .map(|(n, q, p)| (n.to_string(), q, p))
        .collect();
    let slides = build_slides_from_sections(title, kind, &sections, &budget);
    PlanContent {
        sections,
        caption,
        hashtags: data::FALLBACK_HASHTAGS.iter().map(|s| s.to_string()).collect(),
        budget,
        memo: format!(
            "### Memo Internal\n\nRe: proyek «{title}»\n\nTim sudah menyusun rencana kerja dan anggaran. Mohon arahan Direktur untuk titik yang perlu diprioritaskan.\n\nHormat,\nHRD & People Ops"
        ),
        checklist: data::CHECKLIST_QA.iter().map(|s| s.to_string()).collect(),
        slides,
        calendar: vec![
            ("Hari 1-3".into(), "Teaser + poster utama".into()),
            ("Hari 4-7".into(), "Ulasan fitur, video pendek".into()),
            ("Hari 8-14".into(), "Testimoni & studi kasus".into()),
            ("Hari 15-21".into(), "Tantangan komunitas".into()),
            ("Hari 22-30".into(), "Rekap & ajakan terakhir".into()),
        ],
    }
}

fn build_slides_from_sections(
    title: &str,
    kind: &str,
    sections: &[(Div, String, String)],
    budget: &[(String, u32, u64)],
) -> Vec<(String, Vec<String>, String)> {
    let mut slides = vec![
        (
            title.to_string(),
            vec![
                format!("{} · PT Pixel Sinergi Nusantara", data::kind_label(kind)),
                "Disusun otomatis oleh tim Pixel Sinergi".into(),
            ],
            "Sapaan singkat, sebutkan tujuan presentasi.".into(),
        ),
        (
            "Masalah & Peluang".into(),
            vec![
                "Kondisi saat ini perlu perbaikan".into(),
                "Ada peluang yang bisa dimanfaatkan".into(),
                "Kompetitor sudah bergerak".into(),
            ],
            "Bahas singkat data pendukung.".into(),
        ),
    ];
    for (_, t, x) in sections.iter().take(3) {
        slides.push((
            t.clone(),
            vec![
                x.clone(),
                "Langkah pelaksanaan disusun bertahap.".into(),
                "Target terukur per tahap.".into(),
            ],
            "Baca poin utama, sisanya biar slide yang bicara.".into(),
        ));
    }
    let total: u64 = budget.iter().map(|(_, q, p)| *q as u64 * *p).sum();
    slides.push((
        "Proyeksi Biaya".into(),
        vec![
            format!("Total estimasi: Rp {total}"),
            format!("{} pos anggaran", budget.len()),
            "Termasuk pos 'kopi tim' (wajib)".into(),
        ],
        "Jelaskan asumsi angka.".into(),
    ));
    slides.push((
        "Penutup & Ajakan".into(),
        vec![
            "Siap dieksekusi".into(),
            "Butuh persetujuan Direktur".into(),
            "Terima kasih".into(),
        ],
        "Ajak diskusi dan tanya-jawab.".into(),
    ));
    slides
}

pub fn project_content_prompt(title: &str, kind: &str) -> (String, String) {
    let sys = "Anda adalah tim agensi profesional Indonesia (PT Pixel Sinergi Nusantara) yang menulis dokumen kerja internal dengan nada sopan, ringkas, sedikit humor kantor yang halus. Selalu balas HANYA JSON valid tanpa penjelasan tambahan.";
    let user = format!(
        r##"Buat isi paket deliverable untuk proyek berikut.

JUDUL/BRIEF: {title}
JENIS: {kind_label}

Balas JSON dengan skema:
{{
  "sections": [{{"division":"it|marketing|finance|hrd|ga","title":"...","text":"2-3 kalimat"}}],
  "caption": "caption sosial media 1-2 kalimat",
  "hashtags": ["#tag"],
  "budget": [{{"item":"...","qty":1,"unit_price":100000}}],
  "memo": "memo internal HRD, 3-4 baris",
  "checklist": ["..."],
  "slides": [{{"title":"...","bullets":["..."],"notes":"catatan pembicara"}}],
  "calendar": [{{"when":"Hari 1-3","what":"..."}}]
}}

Ketentuan: sections 5 item (semua divisi), hashtags 5 item, budget 5 item rupiah wajar (angka tanpa titik), checklist 8 item, slides 6-8 slide, calendar 4-5 item. Gunakan bahasa Indonesia."##,
        kind_label = data::kind_label(kind)
    );
    (sys.to_string(), user)
}

pub fn parse_content(text: &str) -> Option<PlanContent> {
    let block = extract_json_block(text)?;
    let v: Value = serde_json::from_str(&block).ok()?;
    let mut out = PlanContent {
        sections: Vec::new(),
        caption: v
            .get("caption")
            .and_then(|c| c.as_str())
            .unwrap_or("")
            .to_string(),
        hashtags: v
            .get("hashtags")
            .and_then(|h| h.as_array())
            .map(|a| {
                a.iter()
                    .filter_map(|x| x.as_str().map(|s| s.to_string()))
                    .collect()
            })
            .unwrap_or_default(),
        budget: Vec::new(),
        memo: v
            .get("memo")
            .and_then(|c| c.as_str())
            .unwrap_or("")
            .to_string(),
        checklist: v
            .get("checklist")
            .and_then(|h| h.as_array())
            .map(|a| {
                a.iter()
                    .filter_map(|x| x.as_str().map(|s| s.to_string()))
                    .collect()
            })
            .unwrap_or_default(),
        slides: Vec::new(),
        calendar: Vec::new(),
    };
    let divs = data::div_order();
    if let Some(arr) = v.get("sections").and_then(|s| s.as_array()) {
        for (i, s) in arr.iter().enumerate() {
            let div = s
                .get("division")
                .and_then(|d| d.as_str())
                .and_then(|d| divs.iter().find(|x| x.id() == d).copied())
                .unwrap_or_else(|| divs[i.min(divs.len() - 1)]);
            let title = s
                .get("title")
                .and_then(|t| t.as_str())
                .unwrap_or("")
                .to_string();
            let text = s
                .get("text")
                .and_then(|t| t.as_str())
                .unwrap_or("")
                .to_string();
            if !text.trim().is_empty() {
                out.sections.push((div, title, text));
            }
        }
    }
    if let Some(arr) = v.get("budget").and_then(|s| s.as_array()) {
        for b in arr {
            let item = b
                .get("item")
                .and_then(|x| x.as_str())
                .unwrap_or("")
                .to_string();
            let qty = b.get("qty").and_then(|x| x.as_u64()).unwrap_or(1) as u32;
            let price = b.get("unit_price").and_then(|x| x.as_u64()).unwrap_or(0);
            if !item.is_empty() {
                out.budget.push((item, qty, price));
            }
        }
    }
    if let Some(arr) = v.get("slides").and_then(|s| s.as_array()) {
        for s in arr {
            let title = s
                .get("title")
                .and_then(|x| x.as_str())
                .unwrap_or("")
                .to_string();
            let bullets = s
                .get("bullets")
                .and_then(|b| b.as_array())
                .map(|a| {
                    a.iter()
                        .filter_map(|x| x.as_str().map(|s| s.to_string()))
                        .collect()
                })
                .unwrap_or_default();
            let notes = s
                .get("notes")
                .and_then(|x| x.as_str())
                .unwrap_or("")
                .to_string();
            if !title.is_empty() {
                out.slides.push((title, bullets, notes));
            }
        }
    }
    if let Some(arr) = v.get("calendar").and_then(|s| s.as_array()) {
        for s in arr {
            let when = s
                .get("when")
                .and_then(|x| x.as_str())
                .unwrap_or("")
                .to_string();
            let what = s
                .get("what")
                .and_then(|x| x.as_str())
                .unwrap_or("")
                .to_string();
            if !what.is_empty() {
                out.calendar.push((when, what));
            }
        }
    }
    if out.sections.is_empty() && out.caption.is_empty() && out.slides.is_empty() {
        None
    } else {
        Some(out)
    }
}

pub fn project_code_prompt(title: &str, brief: &str, stack: &str) -> (String, String) {
    let sys = "Anda senior engineer Indonesia. Hasil Anda harus berupa struktur proyek yang benar-benar bisa dijalankan. Balas HANYA JSON valid.";
    let user = format!(
        r#"Buat scaffold kode untuk proyek berikut.

JUDUL: {title}
BRIEF: {brief}
STACK: {stack}  (android = Kotlin + Jetpack Compose; tauri = Tauri 2 + vanilla JS; web = HTML/CSS/JS; api = Node Express; webapp = Vite + vanilla)

Balas JSON:
{{
  "stack": "{stack}",
  "run": ["perintah untuk menjalankan"],
  "files": [{{"path":"relatif/ke/file.ext","content":"isi file lengkap"}}]
}}

Aturan: 10-18 file, semua file esensial agar proyek jalan (manifest, build config, entry point, UI, README langkah run). Isi file ringkas tapi berfungsi (tanpa placeholder "TODO"). JSON harus valid: escape newline sebagai \n."#,
        brief = brief.chars().take(400).collect::<String>()
    );
    (sys.to_string(), user)
}

pub fn parse_code(text: &str, fallback_stack: &str) -> Option<CodePlan> {
    let block = extract_json_block(text)?;
    let v: Value = serde_json::from_str(&block).ok()?;
    let stack = v
        .get("stack")
        .and_then(|s| s.as_str())
        .unwrap_or(fallback_stack)
        .to_string();
    let run = v
        .get("run")
        .and_then(|s| s.as_array())
        .map(|a| {
            a.iter()
                .filter_map(|x| x.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();
    let mut files = Vec::new();
    if let Some(arr) = v.get("files").and_then(|s| s.as_array()) {
        for f in arr {
            let p = f.get("path").and_then(|x| x.as_str()).unwrap_or("");
            let c = f.get("content").and_then(|x| x.as_str()).unwrap_or("");
            if !p.is_empty() && !c.is_empty() {
                files.push((p.to_string(), c.to_string()));
            }
        }
    }
    if files.is_empty() {
        None
    } else {
        Some(CodePlan { stack, run, files })
    }
}

/// Bangun body LLM "kasar" untuk obrolan lingkungan (tidak dipakai v1).
#[allow(dead_code)]
pub fn dumb_body(s: &Settings, prompt: &str) -> String {
    format!(
        "{{\"model\":\"{}\",\"messages\":[{{\"role\":\"user\",\"content\":\"{}\"}}]}}",
        json_escape(&s.model),
        json_escape(prompt)
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn url_normalize() {
        assert_eq!(
            normalize_url("http://x:1/v1"),
            "http://x:1/v1/chat/completions"
        );
        assert_eq!(
            normalize_url("http://x:1"),
            "http://x:1/v1/chat/completions"
        );
        assert_eq!(
            normalize_url("http://x:1/v1/chat/completions"),
            "http://x:1/v1/chat/completions"
        );
    }

    #[test]
    fn parse_content_partial() {
        let txt = "bla ```json {\"caption\":\"Halo\",\"sections\":[{\"division\":\"it\",\"title\":\"T\",\"text\":\"X\"}]} ```";
        let p = parse_content(txt).unwrap();
        assert_eq!(p.caption, "Halo");
        assert_eq!(p.sections.len(), 1);
        assert_eq!(p.sections[0].0, Div::It);
    }

    #[test]
    fn parse_code_partial() {
        let txt = "{\"stack\":\"tauri\",\"run\":[\"bun run dev\"],\"files\":[{\"path\":\"a.txt\",\"content\":\"hi\"}]}";
        let c = parse_code(txt, "web").unwrap();
        assert_eq!(c.stack, "tauri");
        assert_eq!(c.files[0].0, "a.txt");
    }

    #[test]
    fn fallback_has_slides() {
        let c = content_fallback("Buat pptx investor agrikultur", "presentation");
        assert!(c.slides.len() >= 6);
        assert_eq!(c.sections.len(), 5);
        assert_eq!(c.budget.len(), 5);
    }
}
