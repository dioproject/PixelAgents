// ============================================================
// util.rs — Helper murni (slug, format, waktu, angka)
// ============================================================

/// "Buat Aplikasi Android!" -> "buat-aplikasi-android"
pub fn slugify(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut dash = false;
    for ch in s.chars() {
        if ch.is_ascii_alphanumeric() {
            out.push(ch.to_ascii_lowercase());
            dash = false;
        } else if !dash && !out.is_empty() {
            out.push('-');
            dash = true;
        }
    }
    let out = out.trim_matches('-').to_string();
    if out.is_empty() {
        "proyek".into()
    } else {
        out.chars().take(48).collect()
    }
}

/// Buang karakter ilegal untuk nama file/folder Windows.
pub fn sanitize_component(s: &str) -> String {
    let mut out: String = s
        .chars()
        .map(|c| match c {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '-',
            c if (c as u32) < 0x20 => ' ',
            c => c,
        })
        .collect();
    out = out.trim().trim_end_matches('.').to_string();
    // Nama reserved Windows
    const RESERVED: [&str; 22] = [
        "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8",
        "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
    ];
    let upper = out.to_ascii_uppercase();
    if RESERVED.contains(&upper.as_str()) {
        out = format!("proj-{out}");
    }
    if out.is_empty() {
        out = "item".into();
    }
    out
}

/// Sanitasi jalur relatif (aman dari traversal + reserved + kedalaman).
pub fn sanitize_rel_path(rel: &str, max_depth: usize) -> Option<String> {
    let rel = rel.replace('\\', "/");
    let mut parts: Vec<String> = Vec::new();
    for raw in rel.split('/') {
        let p = raw.trim();
        if p.is_empty() || p == "." || p == ".." {
            continue;
        }
        parts.push(sanitize_component(p));
        if parts.len() > max_depth {
            return None;
        }
    }
    if parts.is_empty() {
        None
    } else {
        Some(parts.join("/"))
    }
}

pub fn two(n: u32) -> String {
    format!("{n:02}")
}

/// 21:07
pub fn clock_hm(hour: u32, minute: u32) -> String {
    format!("{}:{}", two(hour % 24), two(minute % 60))
}

pub fn fmt_kb(bytes: usize) -> String {
    let kb = (bytes as f32 / 1024.0).max(0.1);
    if kb >= 1024.0 {
        format!("{:.1} MB", kb / 1024.0)
    } else if kb >= 10.0 {
        format!("{:.0} KB", kb)
    } else {
        format!("{:.1} KB", kb)
    }
}

pub fn lerp(a: f32, b: f32, t: f32) -> f32 {
    a + (b - a) * t.clamp(0.0, 1.0)
}

/// Interpolasi warna (RGBA) sederhana.
pub fn lerp_rgba(a: [f32; 4], b: [f32; 4], t: f32) -> [f32; 4] {
    let t = t.clamp(0.0, 1.0);
    [
        lerp(a[0], b[0], t),
        lerp(a[1], b[1], t),
        lerp(a[2], b[2], t),
        lerp(a[3], b[3], t),
    ]
}

pub fn hex_to_rgb(hex: &str) -> [u8; 3] {
    let h = hex.trim_start_matches('#');
    let v = |i: usize| u8::from_str_radix(&h[i..i + 2], 16).unwrap_or(0);
    if h.len() >= 6 {
        [v(0), v(2), v(4)]
    } else {
        [255, 255, 255]
    }
}

/// Amankan teks untuk JSON string (tanpa escaping penuh).
pub fn json_escape(s: &str) -> String {
    let mut out = String::with_capacity(s.len() + 8);
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => {}
            '\t' => out.push_str("\\t"),
            c if (c as u32) < 0x20 => {}
            c => out.push(c),
        }
    }
    out
}

/// Ambil nilai string dari JSON longgar (regex-free, cukup untuk fallback).
pub fn json_find_string(text: &str, key: &str) -> Option<String> {
    let needle = format!("\"{key}\"");
    let idx = text.find(&needle)?;
    let rest = &text[idx + needle.len()..];
    let colon = rest.find(':')?;
    let rest = rest[colon + 1..].trim_start();
    if !rest.starts_with('"') {
        return None;
    }
    let mut out = String::new();
    let mut esc = false;
    for c in rest[1..].chars() {
        if esc {
            out.push(match c {
                'n' => '\n',
                't' => '\t',
                other => other,
            });
            esc = false;
        } else if c == '\\' {
            esc = true;
        } else if c == '"' {
            break;
        } else {
            out.push(c);
        }
    }
    Some(out)
}

/// Ambil blok JSON pertama yang seimbang dari sebuah teks.
pub fn extract_json_block(text: &str) -> Option<String> {
    let start = text.find('{')?;
    let bytes = text.as_bytes();
    let mut depth = 0i32;
    let mut in_str = false;
    let mut esc = false;
    for (i, &b) in bytes.iter().enumerate().skip(start) {
        let c = b as char;
        if in_str {
            if esc {
                esc = false;
            } else if c == '\\' {
                esc = true;
            } else if c == '"' {
                in_str = false;
            }
            continue;
        }
        match c {
            '"' => in_str = true,
            '{' | '[' => depth += 1,
            '}' | ']' => {
                depth -= 1;
                if depth == 0 {
                    return Some(text[start..=i].to_string());
                }
            }
            _ => {}
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn slug_basic() {
        assert_eq!(slugify("Buat Aplikasi Android!"), "buat-aplikasi-android");
        assert_eq!(slugify("   "), "proyek");
    }

    #[test]
    fn sanitize_reserved() {
        assert_eq!(sanitize_component("CON"), "proj-CON");
        assert_eq!(sanitize_component("laporan.md"), "laporan.md");
        assert_eq!(sanitize_component("a/b"), "a-b");
    }

    #[test]
    fn rel_path_depth() {
        assert_eq!(
            sanitize_rel_path("kode/src/main.rs", 4).unwrap(),
            "kode/src/main.rs"
        );
        assert!(sanitize_rel_path("a/b/c/d/e", 4).is_none());
        assert!(sanitize_rel_path("../etc/passwd", 4).is_some());
    }

    #[test]
    fn json_extract() {
        let t = "bla {\"a\": 1, \"b\": {\"c\": \"x\"}} tail";
        assert!(extract_json_block(t).unwrap().starts_with("{\"a\""));
        assert_eq!(
            json_find_string("{\"title\": \"Halo Dunia\"}", "title").unwrap(),
            "Halo Dunia"
        );
    }
}
