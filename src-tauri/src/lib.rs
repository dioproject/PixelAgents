// ============================================================
// lib.rs — Backend Tauri 2 untuk PT Pixel Sinergi Nusantara Tbk
//  • llm_chat              : proxy OpenAI-compatible (bebas CORS)
//  • save_config           : persist settings ke app config dir
//  • load_config           : baca settings
//  • save_project_package  : simpan paket deliverable proyek ke Documents
//  • open_path             : buka folder di file explorer OS
// ============================================================

use base64::Engine as _;
use serde::Serialize;
use serde_json::{json, Value};
use std::path::PathBuf;
use std::time::Duration;
use tauri::Manager;

const APP_CONFIG_FILE: &str = "config.json";

#[tauri::command]
fn ping() -> String {
    "pong — PT Pixel Sinergi Nusantara Tbk".to_string()
}

/// Normalisasi Base URL menjadi endpoint /chat/completions.
fn normalize_endpoint(base_url: &str) -> Result<String, String> {
    let mut base = base_url.trim().trim_end_matches('/').to_string();
    if base.is_empty() {
        return Err("Base URL kosong. Isi di ⚙️ Pengaturan.".to_string());
    }
    if !base.starts_with("http://") && !base.starts_with("https://") {
        return Err("Base URL harus diawali http:// atau https://".to_string());
    }
    if !base.ends_with("/chat/completions") {
        base.push_str("/chat/completions");
    }
    Ok(base)
}

/// Ambil teks dari berbagai bentuk respons (OpenAI chat, array content, completions).
fn extract_content(data: &Value) -> Option<String> {
    let choice = data.get("choices")?.get(0)?;

    if let Some(message) = choice.get("message") {
        if let Some(content) = message.get("content") {
            if let Some(text) = content.as_str() {
                return Some(text.to_string());
            }
            if let Some(parts) = content.as_array() {
                let mut out = String::new();
                for part in parts {
                    if let Some(text) = part.get("text").and_then(|v| v.as_str()) {
                        out.push_str(text);
                    }
                }
                if !out.trim().is_empty() {
                    return Some(out);
                }
            }
        }
        // sebagian provider menaruh jawaban di reasoning_content
        if let Some(text) = message.get("reasoning_content").and_then(|v| v.as_str()) {
            if !text.trim().is_empty() {
                return Some(text.to_string());
            }
        }
    }

    if let Some(text) = choice.get("text").and_then(|v| v.as_str()) {
        return Some(text.to_string());
    }

    None
}

fn truncate_for_error(s: &str, max: usize) -> String {
    let mut out: String = s.chars().take(max).collect();
    if s.chars().count() > max {
        out.push('…');
    }
    out
}

#[tauri::command(rename_all = "snake_case")]
async fn llm_chat(
    base_url: String,
    api_key: String,
    model: String,
    messages: Vec<Value>,
    temperature: Option<f64>,
    max_tokens: Option<u32>,
    timeout_secs: Option<u64>,
) -> Result<String, String> {
    let url = normalize_endpoint(&base_url)?;
    if model.trim().is_empty() {
        return Err("Model kosong. Isi nama model di ⚙️ Pengaturan.".to_string());
    }

    let timeout = timeout_secs.unwrap_or(45).clamp(5, 300);
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(timeout))
        .build()
        .map_err(|e| format!("Gagal membuat HTTP client: {e}"))?;

    let body = json!({
        "model": model.trim(),
        "messages": messages,
        "temperature": temperature.unwrap_or(0.9),
        "max_tokens": max_tokens.unwrap_or(400),
    });

    let mut request = client.post(&url).json(&body);
    let key = api_key.trim();
    if !key.is_empty() {
        request = request.bearer_auth(key);
    }

    let response = request
        .send()
        .await
        .map_err(|e| format!("Gagal menghubungi endpoint LLM: {e}"))?;

    let status = response.status();
    let raw = response
        .text()
        .await
        .map_err(|e| format!("Gagal membaca respons LLM: {e}"))?;

    if !status.is_success() {
        return Err(format!(
            "HTTP {} dari endpoint: {}",
            status.as_u16(),
            truncate_for_error(&raw, 500)
        ));
    }

    let data: Value = serde_json::from_str(&raw)
        .map_err(|e| format!("Respons bukan JSON valid: {e}. Cuplikan: {}", truncate_for_error(&raw, 300)))?;

    extract_content(&data).ok_or_else(|| {
        format!(
            "Format respons LLM tidak dikenal. Cuplikan: {}",
            truncate_for_error(&raw, 400)
        )
    })
}

fn config_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Gagal menemukan app config dir: {e}"))?;
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("Gagal membuat config dir {}: {e}", dir.display()))?;
    Ok(dir.join(APP_CONFIG_FILE))
}

#[tauri::command]
fn save_config(app: tauri::AppHandle, config: Value) -> Result<(), String> {
    let path = config_path(&app)?;
    let json = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Gagal serialisasi config: {e}"))?;

    let tmp = path.with_extension("json.tmp");
    std::fs::write(&tmp, &json)
        .map_err(|e| format!("Gagal menulis config sementara: {e}"))?;

    // Windows tidak mengizinkan rename menimpa file yang ada.
    if std::fs::rename(&tmp, &path).is_err() {
        std::fs::write(&path, &json)
            .map_err(|e| format!("Gagal menyimpan config: {e}"))?;
        let _ = std::fs::remove_file(&tmp);
    }
    Ok(())
}

#[tauri::command]
fn load_config(app: tauri::AppHandle) -> Result<Option<Value>, String> {
    let path = config_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }
    let raw = std::fs::read_to_string(&path)
        .map_err(|e| format!("Gagal membaca config: {e}"))?;
    let value: Value = serde_json::from_str(&raw)
        .map_err(|e| format!("Config bukan JSON valid: {e}"))?;
    Ok(Some(value))
}

// ============================================================
// Proyek: simpan paket deliverable & buka folder
// ============================================================

const WIN_RESERVED: [&str; 22] = [
    "CON", "PRN", "AUX", "NUL",
    "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
    "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
];

fn is_reserved_name(name: &str) -> bool {
    let head = name.split('.').next().unwrap_or("").to_ascii_uppercase();
    WIN_RESERVED.contains(&head.as_str())
}

fn sanitize_segment(seg: &str) -> String {
    let filtered: String = seg
        .chars()
        .filter(|c| c.is_alphanumeric() || "-_.() ".contains(*c))
        .collect();
    filtered.trim().trim_end_matches('.').trim().to_string()
}

fn sanitize_dir_name(raw: &str) -> String {
    let mut out = String::new();
    for ch in raw.chars() {
        if ch == '/' || ch == '\\' {
            out.push('-');
        } else if ch.is_alphanumeric() || "-_.() ".contains(ch) {
            out.push(ch);
        }
    }
    let collapsed = out.split_whitespace().collect::<Vec<_>>().join(" ");
    let mut name: String = collapsed.chars().take(80).collect();
    while name.ends_with('.') || name.ends_with(' ') {
        name.pop();
    }
    if name.is_empty() {
        name = "proyek".to_string();
    } else if is_reserved_name(&name) {
        name = format!("proyek-{}", name);
    }
    name
}

fn sanitize_rel_path(raw: &str) -> Option<String> {
    let normalized = raw.replace('\\', "/");
    let trimmed = normalized.trim();
    if trimmed.is_empty() || trimmed.starts_with('/') || trimmed.contains(':') {
        return None;
    }
    let mut parts: Vec<String> = Vec::new();
    for seg in trimmed.split('/') {
        let seg = seg.trim();
        if seg.is_empty() || seg == "." {
            continue;
        }
        if seg == ".." {
            return None;
        }
        let mut cleaned = sanitize_segment(seg);
        if cleaned.is_empty() {
            return None;
        }
        if is_reserved_name(&cleaned) {
            cleaned = format!("proj-{}", cleaned);
        }
        parts.push(cleaned);
    }
    if parts.is_empty() || parts.len() > 4 {
        return None;
    }
    Some(parts.join("/"))
}

#[derive(serde::Deserialize)]
struct PackageFile {
    rel_path: String,
    content: String,
    #[serde(default)]
    is_base64: bool,
}

#[derive(Serialize)]
struct SaveResult {
    folder: String,
    saved: Vec<String>,
    failed: Vec<String>,
}

#[tauri::command(rename_all = "snake_case")]
fn save_project_package(
    app: tauri::AppHandle,
    dir_name: String,
    files: Vec<PackageFile>,
) -> Result<SaveResult, String> {
    if files.is_empty() {
        return Err("Paket kosong, tidak ada file untuk disimpan.".to_string());
    }

    let documents = app
        .path()
        .document_dir()
        .map_err(|e| format!("Gagal menemukan folder Documents: {e}"))?;
    let root = documents.join("PixelSinergi");
    std::fs::create_dir_all(&root).map_err(|e| format!("Gagal membuat folder PixelSinergi: {e}"))?;

    let clean = sanitize_dir_name(&dir_name);
    let mut folder = root.join(&clean);
    if folder.exists() {
        for n in 2..=99 {
            let candidate = root.join(format!("{}-{}", clean, n));
            if !candidate.exists() {
                folder = candidate;
                break;
            }
        }
    }
    std::fs::create_dir_all(&folder).map_err(|e| format!("Gagal membuat folder proyek: {e}"))?;

    let mut saved: Vec<String> = Vec::new();
    let mut failed: Vec<String> = Vec::new();

    for file in files {
        let rel = match sanitize_rel_path(&file.rel_path) {
            Some(rel) => rel,
            None => {
                failed.push(file.rel_path);
                continue;
            }
        };
        let target = folder.join(&rel);
        if let Some(parent) = target.parent() {
            if std::fs::create_dir_all(parent).is_err() {
                failed.push(file.rel_path);
                continue;
            }
        }
        let bytes: Vec<u8> = if file.is_base64 {
            match base64::engine::general_purpose::STANDARD.decode(file.content.trim()) {
                Ok(bytes) => bytes,
                Err(_) => {
                    failed.push(file.rel_path);
                    continue;
                }
            }
        } else {
            file.content.into_bytes()
        };
        match std::fs::write(&target, bytes) {
            Ok(_) => saved.push(file.rel_path),
            Err(_) => failed.push(file.rel_path),
        }
    }

    Ok(SaveResult {
        folder: folder.to_string_lossy().to_string(),
        saved,
        failed,
    })
}

#[tauri::command]
fn open_path(path: String) -> Result<(), String> {
    let target = PathBuf::from(&path);
    if !target.exists() {
        return Err("Folder belum ada di disk.".to_string());
    }

    #[cfg(target_os = "windows")]
    let mut command = std::process::Command::new("explorer");
    #[cfg(target_os = "macos")]
    let mut command = std::process::Command::new("open");
    #[cfg(all(unix, not(target_os = "macos")))]
    let mut command = std::process::Command::new("xdg-open");

    command
        .arg(&path)
        .spawn()
        .map_err(|e| format!("Gagal membuka folder: {e}"))?;
    Ok(())
}

#[cfg(test)]
mod project_tests {
    use super::*;

    #[test]
    fn dir_name_bersih() {
        assert_eq!(sanitize_dir_name("  "), "proyek");
        assert!(!sanitize_dir_name("a/b\\c").contains('/'));
        assert!(!sanitize_dir_name("a\\b:d*e").contains(':'));
        assert_eq!(sanitize_dir_name("CON"), "proyek-CON");
    }

    #[test]
    fn rel_path_aman() {
        assert_eq!(sanitize_rel_path("../x.txt"), None);
        assert_eq!(sanitize_rel_path("/abs/x.txt"), None);
        assert_eq!(sanitize_rel_path("C:/Windows/x.txt"), None);
        assert_eq!(sanitize_rel_path("a/b/c/d/e.js"), None);
        assert_eq!(
            sanitize_rel_path(r"src-tauri\src\main.rs"),
            Some("src-tauri/src/main.rs".to_string())
        );
        assert_eq!(sanitize_rel_path("CON.txt"), Some("proj-CON.txt".to_string()));
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            ping,
            llm_chat,
            save_config,
            load_config,
            save_project_package,
            open_path
        ])
        .run(tauri::generate_context!())
        .expect("gagal menjalankan PT Pixel Sinergi Nusantara");
}
