// ============================================================
// imagegen.rs — Kanvas RGBA + poster, ikon aplikasi, dan GIF promo
// (semua digambar secara terprogram, tanpa aset eksternal).
// ============================================================

use crate::data;
use fontdue::{Font, FontSettings};
use image::RgbaImage;

pub struct Canvas {
    pub w: u32,
    pub h: u32,
    pub px: Vec<u8>,
}

impl Canvas {
    pub fn new(w: u32, h: u32, c: [u8; 3]) -> Self {
        let mut px = vec![0u8; (w * h * 4) as usize];
        for i in 0..(w * h) as usize {
            px[i * 4] = c[0];
            px[i * 4 + 1] = c[1];
            px[i * 4 + 2] = c[2];
            px[i * 4 + 3] = 255;
        }
        Self { w, h, px }
    }

    #[inline]
    pub fn blend(&mut self, x: i32, y: i32, c: [u8; 3], a: f32) {
        if x < 0 || y < 0 || x >= self.w as i32 || y >= self.h as i32 {
            return;
        }
        let a = a.clamp(0.0, 1.0);
        let i = ((y as u32 * self.w + x as u32) * 4) as usize;
        let dst = [
            self.px[i] as f32,
            self.px[i + 1] as f32,
            self.px[i + 2] as f32,
        ];
        for k in 0..3 {
            self.px[i + k] = (dst[k] * (1.0 - a) + c[k] as f32 * a).round() as u8;
        }
        self.px[i + 3] = 255;
    }

    pub fn rect(&mut self, x: i32, y: i32, w: i32, h: i32, c: [u8; 3], a: f32) {
        for yy in y..y + h {
            for xx in x..x + w {
                self.blend(xx, yy, c, a);
            }
        }
    }

    pub fn rect_r(&mut self, x: i32, y: i32, w: i32, h: i32, r: i32, c: [u8; 3], a: f32) {
        for yy in 0..h {
            for xx in 0..w {
                // cek sudut membulat
                let mut inside = true;
                let corn = [
                    (r, r, r as f32, r as f32),
                    (w - r - 1, r, (w - r - 1) as f32, r as f32),
                    (r, h - r - 1, r as f32, (h - r - 1) as f32),
                    (w - r - 1, h - r - 1, (w - r - 1) as f32, (h - r - 1) as f32),
                ];
                for (cx, cy, _, _) in corn {
                    let in_x = if cx == r { xx < r } else { xx > w - r - 1 };
                    let in_y = if cy == r { yy < r } else { yy > h - r - 1 };
                    if in_x && in_y {
                        let dx = xx as f32 - cx as f32;
                        let dy = yy as f32 - cy as f32;
                        if dx * dx + dy * dy > (r * r) as f32 {
                            inside = false;
                        }
                    }
                }
                if inside {
                    self.blend(x + xx, y + yy, c, a);
                }
            }
        }
    }

    pub fn vgrad(&mut self, x: i32, y: i32, w: i32, h: i32, top: [u8; 3], bottom: [u8; 3]) {
        for yy in 0..h {
            let t = if h > 1 {
                yy as f32 / (h - 1) as f32
            } else {
                0.0
            };
            let c = [
                crate::util::lerp(top[0] as f32, bottom[0] as f32, t) as u8,
                crate::util::lerp(top[1] as f32, bottom[1] as f32, t) as u8,
                crate::util::lerp(top[2] as f32, bottom[2] as f32, t) as u8,
            ];
            for xx in 0..w {
                self.blend(x + xx, y + yy, c, 1.0);
            }
        }
    }

    pub fn circle(&mut self, cx: i32, cy: i32, r: i32, c: [u8; 3], a: f32) {
        for yy in cy - r..=cy + r {
            for xx in cx - r..=cx + r {
                let dx = (xx - cx) as f32;
                let dy = (yy - cy) as f32;
                if dx * dx + dy * dy <= (r * r) as f32 {
                    self.blend(xx, yy, c, a);
                }
            }
        }
    }

    pub fn glow(&mut self, cx: i32, cy: i32, r: i32, c: [u8; 3], intensity: f32) {
        let steps = 10;
        for i in (1..=steps).rev() {
            let t = i as f32 / steps as f32;
            let rr = (r as f32 * t) as i32;
            let a = intensity * (1.0 - t).powf(1.5) * 0.5;
            self.circle(cx, cy, rr.max(1), c, a);
        }
    }

    #[allow(clippy::too_many_arguments)]
    pub fn draw_text(
        &mut self,
        font: &Font,
        text: &str,
        x: i32,
        y: i32,
        size: f32,
        c: [u8; 3],
        a: f32,
    ) -> i32 {
        let mut pen = x as f32;
        for ch in text.chars() {
            let (m, bmp) = font.rasterize(ch, size);
            let gx = pen as i32 + m.xmin;
            let gy = y - (m.height as i32) - m.ymin;
            for yy in 0..m.height {
                for xx in 0..m.width {
                    let cov = bmp[yy * m.width + xx];
                    if cov > 0 {
                        self.blend(gx + xx as i32, gy + yy as i32, c, a * cov as f32 / 255.0);
                    }
                }
            }
            pen += m.advance_width;
        }
        (pen - x as f32) as i32
    }

    pub fn text_width(font: &Font, text: &str, size: f32) -> i32 {
        let mut w = 0.0f32;
        for ch in text.chars() {
            w += font.metrics(ch, size).advance_width;
        }
        w as i32
    }

    #[allow(clippy::too_many_arguments)]
    pub fn draw_wrapped(
        &mut self,
        font: &Font,
        text: &str,
        x: i32,
        y: i32,
        size: f32,
        c: [u8; 3],
        a: f32,
        max_w: i32,
        line_h: i32,
    ) -> i32 {
        let mut lines: Vec<String> = Vec::new();
        let mut cur = String::new();
        for word in text.split_whitespace() {
            let trial = if cur.is_empty() {
                word.to_string()
            } else {
                format!("{cur} {word}")
            };
            if Self::text_width(font, &trial, size) > max_w && !cur.is_empty() {
                lines.push(std::mem::take(&mut cur));
                cur = word.to_string();
            } else {
                cur = trial;
            }
        }
        if !cur.is_empty() {
            lines.push(cur);
        }
        let mut yy = y;
        for line in lines.iter() {
            self.draw_text(font, line, x, yy, size, c, a);
            yy += line_h;
        }
        yy - y
    }

    pub fn to_image(&self) -> RgbaImage {
        RgbaImage::from_raw(self.w, self.h, self.px.clone()).expect("gambar valid")
    }

    pub fn encode_png(&self) -> Vec<u8> {
        use image::ImageEncoder;
        let mut buf = Vec::new();
        let enc = image::codecs::png::PngEncoder::new(&mut buf);
        enc.write_image(&self.px, self.w, self.h, image::ExtendedColorType::Rgba8)
            .expect("encode png");
        buf
    }
}

// ---------------- Font ----------------
pub fn load_fonts() -> (Font, Font) {
    let display = Font::from_bytes(
        include_bytes!("../assets/fonts/Silkscreen-Bold.ttf").as_slice(),
        FontSettings::default(),
    )
    .expect("font pixel");
    let body = Font::from_bytes(
        include_bytes!("../assets/fonts/VarelaRound-Regular.ttf").as_slice(),
        FontSettings::default(),
    )
    .expect("font body");
    (display, body)
}

fn div_color(d: crate::office::Div) -> [u8; 3] {
    d.color()
}

/// Motif pinjaman: meja + monitor + lampu (pixel art sederhana).
fn draw_desk_motif(c: &mut Canvas, x: i32, y: i32, s: i32, night: bool) {
    // meja
    c.rect(x, y + s * 2, s * 9, s, [0x8a, 0x5f, 0x3c], 1.0);
    c.rect(x, y + s * 2, s * 9, s / 2, [0xa8, 0x7a, 0x50], 1.0);
    // kaki meja
    c.rect(x + s, y + s * 3, s, s * 2, [0x6b, 0x47, 0x2c], 1.0);
    c.rect(x + s * 7, y + s * 3, s, s * 2, [0x6b, 0x47, 0x2c], 1.0);
    // monitor
    c.rect(x + s * 3, y, s * 3, s * 2, [0x2b, 0x2f, 0x3d], 1.0);
    let scr = if night {
        [0x7f, 0xd0, 0xc8]
    } else {
        [0x5a, 0x86, 0x8a]
    };
    c.rect(x + s * 3 + s / 2, y + s / 2, s * 2, s, scr, 1.0);
    c.rect(x + s * 4, y + s * 2, s, s / 2, [0x3a, 0x3f, 0x4a], 1.0);
    // lampu meja
    c.rect(
        x + s * 7 + s / 2,
        y + s / 2,
        s / 2,
        s * 3 / 2,
        [0x4a, 0x3a, 0x33],
        1.0,
    );
    c.rect(x + s * 7, y, s * 2, s / 2, [0xff, 0xc9, 0x78], 1.0);
    if night {
        c.glow(x + s * 8, y + s, s * 4, [0xff, 0xc9, 0x78], 0.9);
    }
}

// ---------------- Poster ----------------
pub fn render_poster(
    title: &str,
    kind: &str,
    sections: &[(String, String, String)],
    hashtags: &[String],
    company: &str,
    date_label: &str,
    portrait: bool,
) -> Canvas {
    let (w, h) = if portrait {
        (1080u32, 1920u32)
    } else {
        (1080u32, 1350u32)
    };
    let (display, body) = load_fonts();
    let mut c = Canvas::new(w, h, [0xf7, 0xea, 0xd6]);
    // latar gradien hangat
    c.vgrad(
        0,
        0,
        w as i32,
        h as i32,
        [0xfb, 0xf1, 0xe2],
        [0xe9, 0xd3, 0xb8],
    );
    // panel atas (kayu)
    c.rect(0, 0, w as i32, 22, [0x8a, 0x5f, 0x3c], 1.0);
    c.rect(0, 22, w as i32, 6, [0x6b, 0x47, 0x2c], 1.0);
    // glow lembut
    c.glow(120, 240, 320, [0xff, 0xd8, 0xa0], 0.5);
    c.glow(
        (w as i32) - 140,
        (h as i32) - 300,
        380,
        [0xe8, 0xa0, 0x80],
        0.45,
    );

    let mx = 90;
    let inner_w = w as i32 - mx * 2;
    // judul
    let mut y = 160;
    c.draw_text(&display, company, mx, y, 30.0, [0x8a, 0x5f, 0x3c], 1.0);
    y += 40;
    c.draw_text(
        &body,
        &format!("{} · {date_label}", data::kind_label(kind)),
        mx,
        y,
        26.0,
        [0x8a, 0x6a, 0x52],
        1.0,
    );
    y += 70;
    let title_size = if portrait { 74.0 } else { 82.0 };
    y += c.draw_wrapped(
        &display,
        title,
        mx,
        y,
        title_size,
        [0x3a, 0x2a, 0x22],
        1.0,
        inner_w,
        (title_size * 1.18) as i32,
    );
    // garis aksen
    c.rect(
        mx,
        y + 14,
        (inner_w as f32 * 0.28) as i32,
        8,
        [0xe8, 0x7a, 0x52],
        1.0,
    );
    y += 70;

    // motif meja
    draw_desk_motif(&mut c, mx + inner_w / 2 - 90, y, 20, true);
    y += 180;

    // bagian divisi (maks 5)
    for (i, (name, sec_title, text)) in sections.iter().enumerate() {
        if i >= 5 {
            break;
        }
        let div = data::div_order();
        let col = div_color(div[i.min(4)]);
        c.rect_r(mx, y, inner_w, 6, 3, col, 1.0);
        y += 26;
        c.draw_text(
            &display,
            &format!("{} — {}", name.to_uppercase(), sec_title),
            mx,
            y,
            24.0,
            [0x3a, 0x2a, 0x22],
            1.0,
        );
        y += 34;
        y += c.draw_wrapped(
            &body,
            text,
            mx,
            y,
            27.0,
            [0x53, 0x40, 0x36],
            1.0,
            inner_w,
            36,
        );
        y += 34;
        if y > (h as i32) - 420 {
            break;
        }
    }

    // panel bawah
    let fy = (h as i32) - 300;
    c.rect_r(mx, fy, inner_w, 240, 18, [0x2a, 0x21, 0x2a], 0.92);
    c.draw_text(
        &display,
        "SIAP DIPAKAI",
        mx + 34,
        fy + 62,
        34.0,
        [0xff, 0xd8, 0x98],
        1.0,
    );
    c.draw_wrapped(
        &body,
        "Dibuat oleh tim PT Pixel Sinergi Nusantara. Simpan poster ini, bagikan sesuai jadwal konten, dan jangan lupa pos 'kopi tim' tetap dibayar.",
        mx + 34,
        fy + 100,
        26.0,
        [0xf3, 0xe8, 0xd8],
        0.95,
        inner_w - 68,
        34,
    );
    // hashtag chips (wrap baris)
    let mut cx = mx + 34;
    let mut chip_y = fy + 190;
    for tag in hashtags.iter().take(5) {
        let tw = Canvas::text_width(&body, tag, 22.0) + 28;
        if cx + tw > mx + inner_w - 34 {
            cx = mx + 34;
            chip_y += 44;
        }
        c.rect_r(cx, chip_y - 22, tw, 34, 16, [0xe8, 0x7a, 0x52], 0.9);
        c.draw_text(
            &body,
            tag,
            cx + 14,
            chip_y + 2,
            22.0,
            [0x2a, 0x21, 0x2a],
            1.0,
        );
        cx += tw + 12;
    }
    c.draw_text(
        &display,
        company,
        mx,
        (h as i32) - 26,
        22.0,
        [0x8a, 0x6a, 0x52],
        0.9,
    );
    c
}

// ---------------- Ikon aplikasi ----------------
pub fn render_icon(title: &str) -> Canvas {
    let (display, body) = load_fonts();
    let mut c = Canvas::new(512, 512, [0x2a, 0x21, 0x2a]);
    c.rect_r(0, 0, 512, 512, 96, [0xe8, 0x7a, 0x52], 1.0);
    c.vgrad(0, 0, 512, 512, [0xf0, 0xa0, 0x70], [0xc9, 0x5a, 0x3a]);
    for i in 0..3 {
        let inset = 22 + i * 4;
        c.rect_r(
            inset,
            inset,
            512 - inset * 2,
            512 - inset * 2,
            92,
            [0x2a, 0x21, 0x2a],
            0.06,
        );
    }
    // monogram
    let initials: String = title
        .split_whitespace()
        .filter(|w| {
            w.chars()
                .next()
                .map(|ch| ch.is_alphabetic())
                .unwrap_or(false)
        })
        .take(2)
        .filter_map(|w| w.chars().next())
        .collect::<String>()
        .to_uppercase();
    let initials = if initials.is_empty() {
        "PS".to_string()
    } else {
        initials
    };
    let tw = Canvas::text_width(&display, &initials, 210.0);
    c.draw_text(
        &display,
        &initials,
        (512 - tw) / 2,
        320,
        210.0,
        [0xfb, 0xf1, 0xe2],
        1.0,
    );
    // label bawah (potong di batas kata)
    let label: String = {
        let mut acc = String::new();
        for w in title.split_whitespace() {
            let trial = if acc.is_empty() {
                w.to_string()
            } else {
                format!("{acc} {w}")
            };
            if trial.chars().count() > 18 {
                break;
            }
            acc = trial;
        }
        if acc.is_empty() {
            title.chars().take(18).collect()
        } else {
            acc
        }
    };
    let lw = Canvas::text_width(&body, &label, 30.0);
    c.draw_text(
        &body,
        &label,
        (512 - lw) / 2,
        410,
        30.0,
        [0xfb, 0xf1, 0xe2],
        0.92,
    );
    // lampu kecil
    c.circle(430, 90, 26, [0xff, 0xd8, 0x98], 1.0);
    c.glow(430, 90, 110, [0xff, 0xc9, 0x78], 0.8);
    // mask sudut membulat (transparan di luar)
    mask_rounded_square(&mut c, 512, 96);
    c
}

/// Buat piksel di luar kotak membulat menjadi transparan.
fn mask_rounded_square(c: &mut Canvas, size: i32, r: i32) {
    let f = size as f32 - 1.0;
    let rf = r as f32;
    let corners = [(rf, rf), (f - rf, rf), (rf, f - rf), (f - rf, f - rf)];
    for y in 0..size {
        for x in 0..size {
            let mut inside = true;
            for (cx, cy) in corners {
                let near_x = if cx <= rf {
                    (x as f32) < rf
                } else {
                    (x as f32) > f - rf
                };
                let near_y = if cy <= rf {
                    (y as f32) < rf
                } else {
                    (y as f32) > f - rf
                };
                if near_x && near_y {
                    let dx = x as f32 - cx;
                    let dy = y as f32 - cy;
                    if dx * dx + dy * dy > rf * rf {
                        inside = false;
                    }
                }
            }
            if !inside {
                let i = ((y as u32 * c.w + x as u32) * 4) as usize;
                c.px[i] = 0;
                c.px[i + 1] = 0;
                c.px[i + 2] = 0;
                c.px[i + 3] = 0;
            }
        }
    }
}

// ---------------- GIF promo ----------------
pub fn render_promo_gif(
    title: &str,
    kind: &str,
    company: &str,
    sections: &[(String, String, String)],
) -> Vec<u8> {
    let (display, body) = load_fonts();
    let (w, h) = (720i32, 405i32);
    let frames = 16;
    let mut out: Vec<u8> = Vec::new();
    {
        let mut enc = gif::Encoder::new(&mut out, w as u16, h as u16, &[]).expect("gif encoder");
        enc.set_repeat(gif::Repeat::Infinite).expect("repeat");
        for fi in 0..frames {
            let t = fi as f32 / frames as f32;
            // langit siang→malam
            let top = crate::util::lerp_rgba(
                [0x8f as f32, 0xc0 as f32, 0xe0 as f32, 1.0],
                [0x14 as f32, 0x1a as f32, 0x33 as f32, 1.0],
                t,
            );
            let bot = crate::util::lerp_rgba(
                [0xfb as f32, 0xf1 as f32, 0xe2 as f32, 1.0],
                [0x33 as f32, 0x2a as f32, 0x38 as f32, 1.0],
                t,
            );
            let mut c = Canvas::new(w as u32, h as u32, [0, 0, 0]);
            c.vgrad(
                0,
                0,
                w,
                h,
                [top[0] as u8, top[1] as u8, top[2] as u8],
                [bot[0] as u8, bot[1] as u8, bot[2] as u8],
            );
            // jendela + bintang
            let night = t > 0.5;
            if night {
                let mut seed: u32 = 0x1234_5678;
                for _ in 0..50 {
                    seed = seed.wrapping_mul(1664525).wrapping_add(1013904223);
                    let sx = (seed >> 8) % w as u32;
                    seed = seed.wrapping_mul(1664525).wrapping_add(1013904223);
                    let sy = (seed >> 8) % 90;
                    c.circle(sx as i32, sy as i32, 1, [0xff, 0xf0, 0xc0], 0.9);
                }
            }
            // teks
            let title_col = if night {
                [0xf7, 0xea, 0xd6]
            } else {
                [0x3a, 0x2a, 0x22]
            };
            c.draw_wrapped(&display, title, 44, 150, 44.0, title_col, 1.0, w - 88, 52);
            c.draw_text(
                &body,
                &format!("{} · {}", data::kind_label(kind), company),
                44,
                118,
                22.0,
                title_col,
                0.85,
            );
            // meja + lampu dengan animasi
            let desk_x = 44 + ((t * (w as f32 - 340.0)) as i32);
            draw_desk_motif(&mut c, desk_x, 250, 12, night);
            // bar kemajuan
            c.rect(44, h - 46, w - 88, 10, [0x00, 0x00, 0x00], 0.25);
            c.rect(
                44,
                h - 46,
                ((w - 88) as f32 * t) as i32,
                10,
                [0xe8, 0x7a, 0x52],
                0.95,
            );
            // stempel divisi
            let div = data::div_order();
            if let Some((_, name, _)) = sections.get((t * 5.0) as usize % 5) {
                let _ = name;
                let txt = div[((t * 5.0) as usize) % 5].name();
                let tw = Canvas::text_width(&body, txt, 20.0);
                c.rect_r(44, 60, tw + 26, 32, 16, [0x2a, 0x21, 0x2a], 0.55);
                c.draw_text(&body, txt, 57, 82, 20.0, [0xff, 0xd8, 0x98], 1.0);
            }
            let mut raw = c.px.clone();
            let mut frame = gif::Frame::from_rgba_speed(w as u16, h as u16, &mut raw, 10);
            frame.delay = 9; // ~90ms
            enc.write_frame(&frame).expect("tulis frame");
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn poster_png_valid() {
        let secs = data::fallback_sections("software", "Aplikasi Kasir")
            .into_iter()
            .map(|(d, t, x)| (d.name().to_string(), t, x))
            .collect::<Vec<_>>();
        let p = render_poster(
            "Aplikasi Kasir Tauri",
            "software",
            &secs,
            &["#PixelSinergi".to_string()],
            "PT Pixel Sinergi Nusantara",
            "Senin, 1 Jan 2026",
            false,
        );
        let png = p.encode_png();
        assert!(png.len() > 5000);
        let img = image::load_from_memory(&png).unwrap();
        assert_eq!(img.width(), 1080);
    }

    #[test]
    fn icon_png_valid() {
        let i = render_icon("Aplikasi Kasir");
        let png = i.encode_png();
        assert!(png.len() > 2000);
    }

    #[test]
    fn gif_valid() {
        let secs = data::fallback_sections("campaign", "Kampanye Kopi")
            .into_iter()
            .map(|(d, t, x)| (d.name().to_string(), t, x))
            .collect::<Vec<_>>();
        let g = render_promo_gif(
            "Kampanye Kopi Susu",
            "campaign",
            "PT Pixel Sinergi Nusantara",
            &secs,
        );
        assert!(g.len() > 4000);
        assert_eq!(&g[0..3], b"GIF");
    }
}
