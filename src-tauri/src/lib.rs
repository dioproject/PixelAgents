// ============================================================
// lib.rs — Backend Tauri 2 untuk PT Pixel Sinergi Nusantara Tbk
//  • llm_chat     : proxy OpenAI-compatible (bebas CORS)
//  • save_config  : persist settings ke app config dir
//  • load_config  : baca settings
// ============================================================

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            ping,
            llm_chat,
            save_config,
            load_config
        ])
        .run(tauri::generate_context!())
        .expect("gagal menjalankan PT Pixel Sinergi Nusantara");
}
