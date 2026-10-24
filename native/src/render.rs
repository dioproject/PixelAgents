// ============================================================
// render.rs — Renderer cozy: lantai, dinding, furniture, agen,
// kucing, partikel, pencahayaan 24 jam, jendela langit.
// ============================================================

use crate::office::{self, MAP_H, MAP_W};
use crate::sim::{CatState, ParticleKind, Phase, Sim};
use crate::util::{clock_hm, lerp};
use chrono::Timelike;
use eframe::egui::{
    self, Align2, Color32, CornerRadius, Painter, Pos2, Rect, Stroke, StrokeKind, Vec2,
};

pub const BASE_TILE: f32 = 18.0;

#[derive(Clone)]
pub struct Camera {
    pub scale: f32,
    pub off: Vec2,
    pub init: bool,
}

impl Default for Camera {
    fn default() -> Self {
        Self {
            scale: BASE_TILE,
            off: Vec2::ZERO,
            init: false,
        }
    }
}

impl Camera {
    pub fn fit(&mut self, viewport: Rect, focus: Option<(f32, f32, f32)>) {
        let (w, h) = if let Some((_, _, span)) = focus {
            (span, span * 0.66)
        } else {
            (MAP_W as f32, MAP_H as f32)
        };
        let s = (viewport.width() / w).min(viewport.height() / h);
        self.scale = s.clamp(4.0, 40.0);
        if let Some((cx, cy, _)) = focus {
            self.off = Vec2::new(
                viewport.width() / 2.0 - cx * self.scale,
                viewport.height() / 2.0 - cy * self.scale,
            );
        } else {
            self.off = Vec2::new(
                (viewport.width() - MAP_W as f32 * self.scale) / 2.0,
                (viewport.height() - MAP_H as f32 * self.scale) / 2.0,
            );
        }
        self.init = true;
    }

    pub fn w2s(&self, rect: Rect, wx: f32, wy: f32) -> Pos2 {
        Pos2::new(
            rect.min.x + self.off.x + wx * self.scale,
            rect.min.y + self.off.y + wy * self.scale,
        )
    }

    pub fn s2w(&self, rect: Rect, p: Pos2) -> (f32, f32) {
        (
            (p.x - rect.min.x - self.off.x) / self.scale,
            (p.y - rect.min.y - self.off.y) / self.scale,
        )
    }

    pub fn trect(&self, rect: Rect, tx: f32, ty: f32, w: f32, h: f32) -> Rect {
        let a = self.w2s(rect, tx, ty);
        Rect::from_min_size(a, Vec2::new(w * self.scale, h * self.scale))
    }

    pub fn clamp(&mut self, rect: Rect) {
        let pad = self.scale * 1.5;
        let ww = MAP_W as f32 * self.scale;
        let wh = MAP_H as f32 * self.scale;
        if ww + pad * 2.0 >= rect.width() {
            self.off.x = self.off.x.clamp(rect.width() - ww - pad, pad);
        } else {
            self.off.x = (rect.width() - ww) / 2.0;
        }
        if wh + pad * 2.0 >= rect.height() {
            self.off.y = self.off.y.clamp(rect.height() - wh - pad, pad);
        } else {
            self.off.y = (rect.height() - wh) / 2.0;
        }
    }
}

fn c(rgb: [u8; 3]) -> Color32 {
    Color32::from_rgb(rgb[0], rgb[1], rgb[2])
}
fn ca(rgb: [u8; 3], a: f32) -> Color32 {
    Color32::from_rgba_unmultiplied(rgb[0], rgb[1], rgb[2], (a.clamp(0.0, 1.0) * 255.0) as u8)
}

// ---------------- Palet lantai (cozy pastel) ----------------
fn floor_colors(key: &str) -> ([u8; 3], [u8; 3]) {
    match key {
        "it" => ([0xa9, 0xb4, 0xc6], [0x9c, 0xa9, 0xc0]),
        "meeting" => ([0xbd, 0xb2, 0xcd], [0xb0, 0xa5, 0xc2]),
        "director" => ([0xc9, 0xa2, 0xaa], [0xbd, 0x96, 0xa0]),
        "finance" => ([0xab, 0xc3, 0xa5], [0x9f, 0xb8, 0x99]),
        "marketing" => ([0xda, 0xa6, 0xb3], [0xce, 0x9a, 0xa8]),
        "pantry" => ([0xc9, 0xa0, 0x6c], [0xbd, 0x93, 0x61]),
        "hrd" => ([0xa5, 0xc8, 0xc5], [0x99, 0xbc, 0xba]),
        "ga" => ([0xd7, 0xc1, 0x8c], [0xcb, 0xb5, 0x81]),
        "lobby" => ([0xcc, 0xba, 0xa1], [0xc0, 0xae, 0x96]),
        _ => ([0xbb, 0x93, 0x6b], [0xb0, 0x88, 0x61]), // koridor
    }
}

const WOOD: [u8; 3] = [0x8a, 0x5f, 0x3c];
const WOOD_D: [u8; 3] = [0x6b, 0x47, 0x2c];
const WOOD_L: [u8; 3] = [0xa8, 0x7a, 0x50];
const METAL: [u8; 3] = [0x9a, 0xa5, 0xb1];
const METAL_D: [u8; 3] = [0x6f, 0x79, 0x86];
const SCREEN: [u8; 3] = [0x2b, 0x2f, 0x3d];
const SCREEN_L: [u8; 3] = [0x7f, 0xd0, 0xc8];
const PLANT: [u8; 3] = [0x6a, 0xa0, 0x6a];
const PLANT_D: [u8; 3] = [0x4f, 0x7f, 0x52];
const SOIL: [u8; 3] = [0x5a, 0x46, 0x32];
const FABRIC: [u8; 3] = [0xc9, 0x8a, 0x7a];
const PAPER: [u8; 3] = [0xf2, 0xe8, 0xd6];

// ---------------- Entry ----------------
pub fn draw_office(ui: &mut egui::Ui, rect: Rect, sim: &Sim, cam: &mut Camera) -> egui::Response {
    let resp = ui.allocate_rect(rect, egui::Sense::click_and_drag());
    let painter = ui.painter_at(rect);

    if !cam.init {
        cam.fit(rect, None);
    }
    // interaksi: drag pan
    if resp.dragged() {
        cam.off += resp.drag_delta();
    }
    if let Some(hover) = resp.hover_pos() {
        let scroll = ui.input(|i| i.smooth_scroll_delta.y);
        if scroll.abs() > 0.01 {
            let before = cam.s2w(rect, hover);
            let factor = (1.0 + scroll * 0.0016).clamp(0.85, 1.18);
            cam.scale = (cam.scale * factor).clamp(5.0, 46.0);
            let after = cam.s2w(rect, hover);
            cam.off.x += (after.0 - before.0) * cam.scale;
            cam.off.y += (after.1 - before.1) * cam.scale;
        }
    }
    if resp.double_clicked() {
        cam.fit(rect, None);
    }
    cam.clamp(rect);

    let hour = sim.hour_float();

    // latar luar
    painter.rect_filled(
        rect,
        CornerRadius::ZERO,
        Color32::from_rgb(0x14, 0x11, 0x17),
    );

    draw_windows(&painter, rect, cam, sim, hour);
    draw_floors(&painter, rect, cam, sim);
    draw_walls(&painter, rect, cam);
    draw_furniture(&painter, rect, cam, hour, sim);
    draw_particles(&painter, rect, cam, sim);
    draw_agents(&painter, rect, cam, sim, hour);
    draw_cat(&painter, rect, cam, sim);
    draw_room_labels(&painter, rect, cam, sim);
    draw_lighting(&painter, rect, cam, sim, hour);
    draw_selection_ring(&painter, rect, cam, sim);
    draw_bubbles(&painter, rect, cam, sim);

    resp
}

// ---------------- Jendela & langit ----------------
fn sky_gradient(hour: f32) -> ([u8; 3], [u8; 3]) {
    let keys: [(f32, [u8; 3], [u8; 3]); 9] = [
        (0.0, [0x0b, 0x10, 0x24], [0x1b, 0x23, 0x40]),
        (4.5, [0x10, 0x16, 0x2e], [0x24, 0x2c, 0x4c]),
        (6.0, [0x3a, 0x35, 0x5e], [0xf0, 0xa8, 0x68]),
        (7.5, [0x8f, 0xc0, 0xe0], [0xd8, 0xe8, 0xf0]),
        (12.0, [0x6f, 0xb7, 0xe8], [0xcf, 0xe8, 0xf5]),
        (16.5, [0x7f, 0xb0, 0xd8], [0xf5, 0xd8, 0xb0]),
        (18.5, [0x6a, 0x4a, 0x7a], [0xf0, 0x8a, 0x4a]),
        (20.0, [0x24, 0x24, 0x44], [0x3a, 0x35, 0x60]),
        (24.0, [0x0b, 0x10, 0x24], [0x1b, 0x23, 0x40]),
    ];
    let h = hour.rem_euclid(24.0);
    for w in keys.windows(2) {
        let (h0, t0, b0) = w[0];
        let (h1, t1, b1) = w[1];
        if h >= h0 && h <= h1 {
            let t = (h - h0) / (h1 - h0).max(0.001);
            return (lerp_rgb(t0, t1, t), lerp_rgb(b0, b1, t));
        }
    }
    (keys[0].1, keys[0].2)
}

fn lerp_rgb(a: [u8; 3], b: [u8; 3], t: f32) -> [u8; 3] {
    [
        lerp(a[0] as f32, b[0] as f32, t) as u8,
        lerp(a[1] as f32, b[1] as f32, t) as u8,
        lerp(a[2] as f32, b[2] as f32, t) as u8,
    ]
}

fn draw_windows(painter: &Painter, rect: Rect, cam: &Camera, sim: &Sim, hour: f32) {
    let (top, bot) = sky_gradient(hour);
    // band jendela di dinding utara (y = -0.15 .. 0.0) sepanjang bangunan
    let y0 = -0.75;
    let y1 = 0.05;
    let steps = 10;
    for i in 0..steps {
        let t0 = i as f32 / steps as f32;
        let t1 = (i + 1) as f32 / steps as f32;
        let col = c(lerp_rgb(top, bot, (t0 + t1) / 2.0));
        let r = cam.trect(
            rect,
            0.0,
            lerp(y0, y1, t0),
            MAP_W as f32,
            lerp(y0, y1, t1) - lerp(y0, y1, t0),
        );
        painter.rect_filled(r, CornerRadius::ZERO, col);
    }
    // bintang saat malam
    if hour < 6.0 || hour >= 19.0 {
        let mut seed: u32 = 0x9e37_79b9;
        for i in 0..70 {
            seed = seed.wrapping_mul(1664525).wrapping_add(1013904223);
            let x = (seed >> 8) as f32 / (1 << 24) as f32 * MAP_W as f32;
            seed = seed.wrapping_mul(1664525).wrapping_add(1013904223);
            let y = y0 + (seed >> 8) as f32 / (1 << 24) as f32 * (y1 - y0);
            let tw = (sim.anim * 1.6 + i as f32).sin() * 0.5 + 0.5;
            let a = 0.35 + 0.5 * tw;
            painter.circle_filled(
                cam.w2s(rect, x, y),
                (cam.scale * 0.045).max(0.6),
                ca([0xff, 0xf0, 0xc0], a),
            );
        }
    }
    // mullion (kerangka jendela)
    let band_bot = cam.w2s(rect, 0.0, y1).y;
    let stroke = Stroke::new((cam.scale * 0.12).max(1.0), c([0x6b, 0x5a, 0x4a]));
    for gx in (0..=MAP_W).step_by(6) {
        let p = cam.w2s(rect, gx as f32, y0);
        painter.line_segment([p, Pos2::new(p.x, band_bot)], stroke);
    }
    let p1 = cam.w2s(rect, 0.0, y0);
    let p2 = cam.w2s(rect, MAP_W as f32, y0);
    painter.line_segment([p1, p2], stroke);
    painter.line_segment(
        [Pos2::new(p1.x, band_bot), Pos2::new(p2.x, band_bot)],
        Stroke::new((cam.scale * 0.16).max(1.2), c([0x4a, 0x3e, 0x33])),
    );
}

// ---------------- Lantai ----------------
fn draw_floors(painter: &Painter, rect: Rect, cam: &Camera, sim: &Sim) {
    for room in office::ROOMS.iter() {
        let (base, checker) = floor_colors(room.floor);
        let r = cam.trect(
            rect,
            room.x as f32,
            room.y as f32,
            room.w as f32,
            room.h as f32,
        );
        painter.rect_filled(r, CornerRadius::ZERO, c(base));
        // pola checker
        for ty in 0..room.h {
            for tx in 0..room.w {
                if (tx + ty) % 2 == 0 {
                    let tr = cam.trect(rect, (room.x + tx) as f32, (room.y + ty) as f32, 1.0, 1.0);
                    painter.rect_filled(tr, CornerRadius::ZERO, c(checker));
                }
            }
        }
        // papan kayu untuk pantry/koridor
        if room.floor == "pantry" || room.floor == "corridor" {
            let stroke = Stroke::new((cam.scale * 0.05).max(0.7), ca(WOOD_D, 0.35));
            for ty in room.y..room.y + room.h {
                let p = cam.w2s(rect, room.x as f32, ty as f32 + 0.5);
                let p2 = cam.w2s(rect, (room.x + room.w) as f32, ty as f32 + 0.5);
                painter.line_segment([p, p2], stroke);
            }
        }
        // bayangan tepi dalam
        let inner = Rect::from_min_max(
            Pos2::new(r.min.x + 2.0, r.min.y + 2.0),
            Pos2::new(r.max.x - 2.0, r.max.y - 2.0),
        );
        painter.rect_stroke(
            inner,
            CornerRadius::ZERO,
            Stroke::new(1.0, ca([0, 0, 0], 0.06)),
            StrokeKind::Inside,
        );
    }
    // garis tepi bangunan
    // pintu: warnai seperti koridor supaya terbaca sebagai jalan
    let (d_base, _) = floor_colors("corridor");
    for (dx, dy) in office::DOORS.iter() {
        let r = cam.trect(rect, *dx as f32, *dy as f32, 1.0, 1.0);
        painter.rect_filled(r, CornerRadius::ZERO, c(d_base));
    }
    let _ = sim;
}

// ---------------- Dinding ----------------
fn is_door(x: i32, y: i32) -> bool {
    office::DOORS.iter().any(|d| d.0 == x && d.1 == y)
}

fn draw_walls(painter: &Painter, rect: Rect, cam: &Camera) {
    let wall = c([0xef, 0xe3, 0xcf]);
    let wall_side = c([0xd8, 0xc7, 0xac]);
    let wall_top = c([0xfa, 0xf1, 0xe0]);
    for room in office::ROOMS.iter() {
        let mut put = |tx: i32, ty: i32, top: bool| {
            if is_door(tx, ty) {
                return;
            }
            let r = cam.trect(rect, tx as f32, ty as f32, 1.0, 1.0);
            painter.rect_filled(r, CornerRadius::ZERO, if top { wall_top } else { wall });
            // sisi gelap
            let b = Rect::from_min_max(Pos2::new(r.min.x, r.max.y - r.height() * 0.35), r.max);
            painter.rect_filled(
                b,
                CornerRadius::ZERO,
                if top { wall_side } else { wall_side },
            );
            // garis luar
            painter.rect_stroke(
                r,
                CornerRadius::ZERO,
                Stroke::new(1.0, ca([0x60, 0x4c, 0x3a], 0.35)),
                StrokeKind::Inside,
            );
        };
        for tx in room.x..room.x + room.w {
            put(tx, room.y - 1, true);
            put(tx, room.y + room.h, false);
        }
        for ty in room.y..room.y + room.h {
            put(room.x - 1, ty, false);
            put(room.x + room.w, ty, false);
        }
    }
}

// ---------------- Furniture ----------------
fn draw_furniture(painter: &Painter, rect: Rect, cam: &Camera, hour: f32, sim: &Sim) {
    for fu in office::FURNITURE.iter() {
        let r = cam.trect(rect, fu.x as f32, fu.y as f32, fu.w as f32, fu.h as f32);
        let unit = cam.scale;
        let is_night = hour < 6.5 || hour >= 18.5;
        // bayangan
        if fu.blocking {
            let sh = Rect::from_min_size(
                Pos2::new(r.min.x + unit * 0.12, r.max.y - unit * 0.16),
                Vec2::new(r.width(), unit * 0.24),
            );
            painter.rect_filled(sh, CornerRadius::same(2), ca([0, 0, 0], 0.18));
        }
        match fu.kind {
            "desk" | "deskL" | "directorDesk" => {
                let name = fu.kind;
                let wood = if name == "directorDesk" {
                    c([0x7a, 0x4a, 0x2c])
                } else {
                    c(WOOD)
                };
                painter.rect_filled(r, CornerRadius::same(2), wood);
                let top =
                    Rect::from_min_max(r.min, Pos2::new(r.max.x, r.min.y + r.height() * 0.35));
                painter.rect_filled(top, CornerRadius::same(2), c(WOOD_L));
                // monitor
                let mw = unit * 0.5;
                let mx = r.min.x + r.width() * 0.5 - mw / 2.0;
                let monitor = Rect::from_min_size(
                    Pos2::new(mx, r.min.y + r.height() * 0.16),
                    Vec2::new(mw, unit * 0.42),
                );
                painter.rect_filled(monitor, CornerRadius::same(1), c(SCREEN));
                let glow_on = is_night || sim.has_project();
                let scr = ca(
                    if glow_on {
                        SCREEN_L
                    } else {
                        [0x5a, 0x86, 0x8a]
                    },
                    if glow_on { 0.95 } else { 0.6 },
                );
                painter.rect_filled(
                    Rect::from_min_max(
                        monitor.min + Vec2::splat(unit * 0.06),
                        monitor.max - Vec2::splat(unit * 0.06),
                    ),
                    CornerRadius::same(1),
                    scr,
                );
                // keyboard + mug
                painter.rect_filled(
                    Rect::from_min_size(
                        Pos2::new(r.min.x + r.width() * 0.3, r.max.y - unit * 0.24),
                        Vec2::new(r.width() * 0.4, unit * 0.14),
                    ),
                    CornerRadius::same(1),
                    c(METAL),
                );
                painter.circle_filled(
                    Pos2::new(r.min.x + r.width() * 0.85, r.max.y - unit * 0.22),
                    unit * 0.1,
                    c([0xe8, 0xdd, 0xcc]),
                );
            }
            "conference" => {
                painter.rect_filled(r, CornerRadius::same(4), c([0x9a, 0x74, 0x52]));
                let inner = Rect::from_min_max(
                    r.min + Vec2::splat(unit * 0.12),
                    r.max - Vec2::splat(unit * 0.12),
                );
                painter.rect_filled(inner, CornerRadius::same(4), c([0xb2, 0x8a, 0x62]));
                // piring & cangkir kecil
                for k in 0..3 {
                    let cx = inner.min.x + inner.width() * (0.25 + 0.25 * k as f32);
                    painter.circle_filled(Pos2::new(cx, inner.center().y), unit * 0.12, c(PAPER));
                }
            }
            "counter" | "longTable" | "reception" | "workbench" => {
                let col = if fu.kind == "reception" {
                    c([0x8a, 0x6a, 0x9a])
                } else {
                    c(WOOD)
                };
                painter.rect_filled(r, CornerRadius::same(2), col);
                painter.rect_filled(
                    Rect::from_min_max(r.min, Pos2::new(r.max.x, r.min.y + r.height() * 0.3)),
                    CornerRadius::same(2),
                    c(WOOD_L),
                );
            }
            "coffeeMachine" => {
                painter.rect_filled(r, CornerRadius::same(2), c(METAL_D));
                painter.rect_filled(
                    Rect::from_min_max(
                        r.min + Vec2::splat(unit * 0.14),
                        r.max - Vec2::splat(unit * 0.14),
                    ),
                    CornerRadius::same(2),
                    c([0x3a, 0x42, 0x4c]),
                );
                painter.circle_filled(
                    Pos2::new(r.center().x, r.min.y + r.height() * 0.3),
                    unit * 0.08,
                    c([0xff, 0xd0, 0x80]),
                );
            }
            "dispenser" => {
                painter.rect_filled(r, CornerRadius::same(2), c([0xdf, 0xe6, 0xee]));
                painter.rect_filled(
                    Rect::from_min_size(
                        Pos2::new(r.min.x + r.width() * 0.15, r.min.y + r.height() * 0.1),
                        Vec2::new(r.width() * 0.7, r.height() * 0.5),
                    ),
                    CornerRadius::same(4),
                    ca([0x6f, 0xb0, 0xe0], 0.9),
                );
                painter.circle_filled(
                    Pos2::new(r.center().x - unit * 0.12, r.max.y - unit * 0.18),
                    unit * 0.05,
                    c([0xd0, 0x60, 0x50]),
                );
                painter.circle_filled(
                    Pos2::new(r.center().x + unit * 0.12, r.max.y - unit * 0.18),
                    unit * 0.05,
                    c([0x60, 0x90, 0xd0]),
                );
            }
            "fridge" => {
                painter.rect_filled(r, CornerRadius::same(2), c([0xe8, 0xec, 0xf0]));
                painter.rect_filled(
                    Rect::from_min_max(
                        Pos2::new(r.min.x + 2.0, r.min.y + r.height() * 0.45),
                        Pos2::new(r.max.x - 2.0, r.min.y + r.height() * 0.5),
                    ),
                    CornerRadius::ZERO,
                    c([0xb0, 0xb8, 0xc0]),
                );
                // magnet warna
                for k in 0..3 {
                    painter.circle_filled(
                        Pos2::new(
                            r.min.x + r.width() * (0.3 + 0.2 * k as f32),
                            r.min.y + r.height() * 0.2,
                        ),
                        unit * 0.05,
                        c([0xd0, 0x6a, 0x5a]),
                    );
                }
            }
            "vending" => {
                painter.rect_filled(r, CornerRadius::same(2), c([0x5a, 0x6a, 0x8a]));
                painter.rect_filled(
                    Rect::from_min_max(
                        r.min + Vec2::splat(unit * 0.15),
                        Pos2::new(r.max.x - unit * 0.15, r.min.y + r.height() * 0.5),
                    ),
                    CornerRadius::same(2),
                    ca([0xff, 0xd0, 0x90], 0.95),
                );
                for k in 0..3 {
                    painter.circle_filled(
                        Pos2::new(
                            r.center().x,
                            r.min.y + r.height() * (0.62 + 0.12 * k as f32),
                        ),
                        unit * 0.05,
                        c([0xe0, 0x70, 0x60]),
                    );
                }
            }
            "serverRack" => {
                painter.rect_filled(r, CornerRadius::same(2), c([0x33, 0x38, 0x42]));
                for k in 0..3 {
                    let y = r.min.y + r.height() * (0.18 + 0.28 * k as f32);
                    painter.rect_filled(
                        Rect::from_min_size(
                            Pos2::new(r.min.x + unit * 0.12, y),
                            Vec2::new(r.width() - unit * 0.24, unit * 0.16),
                        ),
                        CornerRadius::same(1),
                        c([0x4a, 0x52, 0x5e]),
                    );
                    painter.circle_filled(
                        Pos2::new(r.max.x - unit * 0.25, y + unit * 0.08),
                        unit * 0.045,
                        c([0x8f, 0xe0, 0x80]),
                    );
                }
            }
            "copier" => {
                painter.rect_filled(r, CornerRadius::same(2), c([0xdc, 0xdc, 0xe2]));
                painter.rect_filled(
                    Rect::from_min_size(
                        Pos2::new(r.min.x + 2.0, r.min.y + 2.0),
                        Vec2::new(r.width() - 4.0, r.height() * 0.35),
                    ),
                    CornerRadius::same(2),
                    c([0x6a, 0x72, 0x80]),
                );
                painter.rect_filled(
                    Rect::from_min_size(
                        Pos2::new(r.min.x + r.width() * 0.55, r.max.y - unit * 0.3),
                        Vec2::new(r.width() * 0.35, unit * 0.2),
                    ),
                    CornerRadius::same(1),
                    c(PAPER),
                );
            }
            "cabinet" => {
                painter.rect_filled(r, CornerRadius::same(2), c([0x7a, 0x5c, 0x42]));
                painter.rect_filled(
                    Rect::from_min_max(r.min + Vec2::splat(2.0), r.max - Vec2::splat(2.0)),
                    CornerRadius::same(1),
                    c([0x8f, 0x6e, 0x50]),
                );
                for k in 0..2 {
                    painter.circle_filled(
                        Pos2::new(r.center().x, r.min.y + r.height() * (0.35 + 0.3 * k as f32)),
                        unit * 0.05,
                        c([0xe0, 0xd0, 0xa0]),
                    );
                }
            }
            "sofa" | "armchair" => {
                painter.rect_filled(r, CornerRadius::same(3), c(FABRIC));
                painter.rect_filled(
                    Rect::from_min_max(
                        r.min + Vec2::splat(unit * 0.1),
                        Pos2::new(r.max.x - unit * 0.1, r.min.y + r.height() * 0.5),
                    ),
                    CornerRadius::same(3),
                    c([0xd8, 0x9c, 0x8c]),
                );
            }
            "beanbag" => {
                painter.circle_filled(
                    r.center(),
                    r.width().min(r.height()) * 0.55,
                    c([0x9a, 0x7a, 0xa8]),
                );
                painter.circle_filled(
                    r.center(),
                    r.width().min(r.height()) * 0.34,
                    c([0xac, 0x8c, 0xba]),
                );
            }
            "coffeeTable" | "poolTable" => {
                let col = if fu.kind == "poolTable" {
                    c([0x3a, 0x7a, 0x5a])
                } else {
                    c([0x9a, 0x74, 0x52])
                };
                painter.rect_filled(r, CornerRadius::same(3), col);
                if fu.kind == "poolTable" {
                    for (dx, dy) in [(0.2, 0.3), (0.8, 0.3), (0.5, 0.7), (0.3, 0.6)] {
                        painter.circle_filled(
                            Pos2::new(r.min.x + r.width() * dx, r.min.y + r.height() * dy),
                            unit * 0.07,
                            c([0xf0, 0xf0, 0xf0]),
                        );
                    }
                }
            }
            "plant" | "plantBig" => {
                let big = fu.kind == "plantBig";
                let pot = Rect::from_min_size(
                    Pos2::new(
                        r.center().x - r.width() * 0.22,
                        r.max.y - r.height() * (if big { 0.3 } else { 0.4 }),
                    ),
                    Vec2::new(
                        r.width() * 0.44,
                        r.height() * (if big { 0.28 } else { 0.36 }),
                    ),
                );
                painter.rect_filled(pot, CornerRadius::same(2), c(SOIL));
                let sway = (sim.anim * 1.2 + fu.x as f32).sin() * unit * 0.06;
                let leaves = if big { 7 } else { 5 };
                for k in 0..leaves {
                    let ang = std::f32::consts::PI * (0.15 + 0.7 * k as f32 / (leaves - 1) as f32);
                    let lx = r.center().x + (ang.cos() * r.width() * 0.34) + sway;
                    let ly = pot.min.y - (ang.sin() * r.height() * 0.34);
                    painter.circle_filled(
                        Pos2::new(lx, ly),
                        r.width() * (if big { 0.3 } else { 0.26 }),
                        c(if k % 2 == 0 { PLANT } else { PLANT_D }),
                    );
                }
            }
            "whiteboard" => {
                painter.rect_filled(r, CornerRadius::same(1), c([0xf6, 0xf8, 0xfa]));
                painter.rect_stroke(
                    r,
                    CornerRadius::same(1),
                    Stroke::new(1.0, c(METAL_D)),
                    StrokeKind::Inside,
                );
                for k in 0..3 {
                    painter.line_segment(
                        [
                            Pos2::new(
                                r.min.x + unit * 0.2,
                                r.min.y + r.height() * (0.3 + 0.2 * k as f32),
                            ),
                            Pos2::new(
                                r.min.x + r.width() * (0.6 + 0.1 * k as f32),
                                r.min.y + r.height() * (0.3 + 0.2 * k as f32),
                            ),
                        ],
                        Stroke::new(1.0, c([0x8a, 0x9a, 0xb0])),
                    );
                }
            }
            "screen" => {
                painter.rect_filled(r, CornerRadius::same(1), c([0xe8, 0xe8, 0xee]));
                painter.rect_filled(
                    Rect::from_min_max(r.min + Vec2::splat(2.0), r.max - Vec2::splat(2.0)),
                    CornerRadius::same(1),
                    c([0x9a, 0xb8, 0xd8]),
                );
            }
            "board" => {
                painter.rect_filled(r, CornerRadius::same(1), c([0x8a, 0x6a, 0x4a]));
                painter.rect_filled(
                    Rect::from_min_max(r.min + Vec2::splat(2.0), r.max - Vec2::splat(2.0)),
                    CornerRadius::same(1),
                    c(PAPER),
                );
                for k in 0..4 {
                    painter.rect_filled(
                        Rect::from_min_size(
                            Pos2::new(
                                r.min.x + unit * (0.3 + 0.7 * k as f32),
                                r.min.y + unit * 0.2,
                            ),
                            Vec2::new(unit * 0.4, unit * 0.5),
                        ),
                        CornerRadius::same(1),
                        c([0xe0, 0xc0, 0x80]),
                    );
                }
            }
            "acUnit" => {
                painter.rect_filled(r, CornerRadius::same(2), c([0xe8, 0xee, 0xf2]));
                painter.rect_filled(
                    Rect::from_min_size(
                        Pos2::new(r.min.x + 2.0, r.max.y - r.height() * 0.35),
                        Vec2::new(r.width() - 4.0, r.height() * 0.2),
                    ),
                    CornerRadius::same(1),
                    c([0xb8, 0xc4, 0xcc]),
                );
            }
            "cctvWall" => {
                painter.rect_filled(r, CornerRadius::same(1), c([0x2a, 0x2f, 0x3d]));
                for k in 0..3 {
                    painter.rect_filled(
                        Rect::from_min_size(
                            Pos2::new(
                                r.min.x + r.width() * (0.08 + 0.32 * k as f32),
                                r.min.y + r.height() * 0.15,
                            ),
                            Vec2::new(r.width() * 0.24, r.height() * 0.5),
                        ),
                        CornerRadius::same(1),
                        c([0x4a, 0x5a, 0x6a]),
                    );
                }
            }
            "rug" => {
                painter.rect_filled(r, CornerRadius::same(6), ca([0xb0, 0x8a, 0x9a], 0.55));
                painter.rect_stroke(
                    r,
                    CornerRadius::same(6),
                    Stroke::new(2.0, ca([0x8a, 0x6a, 0x7a], 0.6)),
                    StrokeKind::Inside,
                );
            }
            "tripod" => {
                painter.line_segment(
                    [r.center_bottom(), r.center_top()],
                    Stroke::new(2.0, c(METAL_D)),
                );
                painter.circle_filled(r.center_top(), unit * 0.16, c([0x3a, 0x3f, 0x4a]));
            }
            "boxes" => {
                painter.rect_filled(r, CornerRadius::same(1), c([0xc0, 0x9a, 0x6a]));
                painter.line_segment(
                    [
                        Pos2::new(r.min.x, r.center().y),
                        Pos2::new(r.max.x, r.center().y),
                    ],
                    Stroke::new(1.0, c([0x9a, 0x78, 0x4e])),
                );
            }
            "toolbox" => {
                painter.rect_filled(r, CornerRadius::same(1), c([0xd0, 0x4a, 0x3a]));
                painter.rect_filled(
                    Rect::from_min_size(
                        Pos2::new(r.center().x - unit * 0.2, r.min.y),
                        Vec2::new(unit * 0.4, unit * 0.1),
                    ),
                    CornerRadius::same(1),
                    c(METAL_D),
                );
            }
            "hazard" => {
                let mut x = r.min.x;
                while x < r.max.x {
                    painter.rect_filled(
                        Rect::from_min_size(
                            Pos2::new(x, r.min.y),
                            Vec2::new(unit * 0.3, r.height()),
                        ),
                        CornerRadius::ZERO,
                        c([0xe0, 0xc0, 0x40]),
                    );
                    x += unit * 0.6;
                }
            }
            "sign" => {
                painter.rect_filled(r, CornerRadius::same(2), c([0x3a, 0x2f, 0x3a]));
                painter.circle_filled(r.center(), unit * 0.3, c([0xff, 0xc8, 0x57]));
            }
            "cables" | "stain" => {
                if fu.kind == "stain" {
                    painter.circle_filled(
                        r.center(),
                        r.width().min(r.height()) * 0.3,
                        ca([0x5a, 0x40, 0x30], 0.35),
                    );
                } else {
                    painter.line_segment(
                        [
                            Pos2::new(r.min.x, r.center().y),
                            Pos2::new(r.max.x, r.center().y - unit * 0.2),
                        ],
                        Stroke::new(1.5, c([0x30, 0x30, 0x38])),
                    );
                }
            }
            "posterBoard" => {
                painter.rect_filled(r, CornerRadius::same(1), c([0x8a, 0x6a, 0x4a]));
                painter.rect_filled(
                    Rect::from_min_max(r.min + Vec2::splat(2.0), r.max - Vec2::splat(2.0)),
                    CornerRadius::same(1),
                    c(PAPER),
                );
            }
            _ => {
                painter.rect_filled(r, CornerRadius::same(2), c([0x8a, 0x74, 0x5c]));
            }
        }
    }
}

// ---------------- Agen ----------------
fn draw_agents(painter: &Painter, rect: Rect, cam: &Camera, sim: &Sim, hour: f32) {
    let mut order: Vec<usize> = sim
        .agents
        .iter()
        .enumerate()
        .filter(|(_, a)| a.present)
        .map(|(i, _)| i)
        .collect();
    order.sort_by(|&a, &b| {
        sim.agents[a]
            .pos
            .1
            .partial_cmp(&sim.agents[b].pos.1)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    let unit = cam.scale * 1.28;
    let night = hour < 6.5 || hour >= 18.5;

    for &i in order.iter() {
        let a = &sim.agents[i];
        let base = cam.w2s(rect, a.pos.0, a.pos.1);
        let bob = if a.moving {
            (a.walk_phase).sin() * unit * 0.06
        } else {
            0.0
        };
        let f = a.facing;
        // bayangan
        painter.add(egui::Shape::ellipse_filled(
            Pos2::new(base.x, base.y + unit * 0.34),
            Vec2::new(unit * 0.30, unit * 0.12),
            ca([0, 0, 0], 0.22),
        ));
        let upright = !a.sit;
        let body_h = if upright { unit * 0.72 } else { unit * 0.56 };
        let top_y = base.y + unit * 0.30 - body_h + bob;
        // kursi bila duduk
        if a.sit {
            painter.rect_filled(
                Rect::from_min_size(
                    Pos2::new(base.x - unit * 0.26, base.y + unit * 0.02),
                    Vec2::new(unit * 0.52, unit * 0.34),
                ),
                CornerRadius::same(3),
                c([0x4a, 0x3a, 0x33]),
            );
        }
        // kaki
        if upright {
            let leg_col = c(a.def.bottom);
            painter.rect_filled(
                Rect::from_min_size(
                    Pos2::new(base.x - unit * 0.16, top_y + body_h * 0.7),
                    Vec2::new(unit * 0.12, body_h * 0.45),
                ),
                CornerRadius::same(1),
                leg_col,
            );
            painter.rect_filled(
                Rect::from_min_size(
                    Pos2::new(base.x + unit * 0.04, top_y + body_h * 0.7),
                    Vec2::new(unit * 0.12, body_h * 0.45),
                ),
                CornerRadius::same(1),
                leg_col,
            );
        }
        // badan
        let body = Rect::from_min_size(
            Pos2::new(base.x - unit * 0.24, top_y + body_h * 0.30),
            Vec2::new(unit * 0.48, body_h * 0.5),
        );
        painter.rect_filled(body, CornerRadius::same(3), c(a.def.top));
        // lengan
        painter.rect_filled(
            Rect::from_min_size(
                Pos2::new(base.x - unit * 0.30, top_y + body_h * 0.34),
                Vec2::new(unit * 0.08, body_h * 0.36),
            ),
            CornerRadius::same(2),
            c(a.def.top),
        );
        painter.rect_filled(
            Rect::from_min_size(
                Pos2::new(base.x + unit * 0.22, top_y + body_h * 0.34),
                Vec2::new(unit * 0.08, body_h * 0.36),
            ),
            CornerRadius::same(2),
            c(a.def.top),
        );
        // kepala
        let head_r = unit * 0.2;
        let hx = base.x;
        let hy = top_y + body_h * 0.16;
        painter.circle_filled(Pos2::new(hx, hy), head_r, c(a.def.skin));
        // rambut
        let hair = c(a.def.hair);
        match f {
            'u' => {
                painter.circle_filled(Pos2::new(hx, hy - head_r * 0.35), head_r * 1.02, hair);
            }
            'd' => {
                painter.circle_filled(Pos2::new(hx, hy + head_r * 0.55), head_r * 0.9, hair);
            }
            'l' => {
                painter.circle_filled(Pos2::new(hx - head_r * 0.4, hy), head_r * 0.95, hair);
            }
            _ => {
                painter.circle_filled(Pos2::new(hx + head_r * 0.4, hy), head_r * 0.95, hair);
            }
        }
        // mata (kecuali membelakangi)
        if f != 'u' {
            let (ex, spread) = match f {
                'l' => (hx - head_r * 0.5, if upright { 0.18 } else { 0.2 }),
                'r' => (hx + head_r * 0.5, if upright { 0.18 } else { 0.2 }),
                _ => (hx - head_r * 0.55, 0.5),
            };
            let eye = c([0x2a, 0x22, 0x2a]);
            painter.circle_filled(Pos2::new(ex, hy - head_r * 0.1), head_r * 0.13, eye);
            if f == 'd' {
                painter.circle_filled(
                    Pos2::new(ex + head_r * spread, hy - head_r * 0.1),
                    head_r * 0.13,
                    eye,
                );
            }
        }
        // pantulan layar saat malam
        if night && a.sit {
            let glow = ca([0x7f, 0xd0, 0xc8], 0.35);
            painter.circle_filled(Pos2::new(hx, hy), head_r * 1.7, glow);
        }
        // nama saat zoom cukup
        if cam.scale >= 9.0 {
            painter.text(
                Pos2::new(base.x, top_y - unit * 0.42),
                Align2::CENTER_BOTTOM,
                a.def.name,
                crate::theme::pixel((cam.scale * 0.32).clamp(7.0, 12.0)),
                ca([0x2a, 0x22, 0x2a], 0.75),
            );
        }
    }
}

// ---------------- Kucing ----------------
fn draw_cat(painter: &Painter, rect: Rect, cam: &Camera, sim: &Sim) {
    let cat = &sim.cat;
    let unit = cam.scale * 1.2;
    let p = cam.w2s(rect, cat.pos.0, cat.pos.1);
    let orange = c([0xe0, 0x91, 0x3f]);
    let cream = c([0xf0, 0xd8, 0xb0]);
    let sleeping = cat.state == CatState::Sleep;
    // bayangan
    painter.add(egui::Shape::ellipse_filled(
        Pos2::new(p.x, p.y + unit * 0.18),
        Vec2::new(unit * 0.26, unit * 0.1),
        ca([0, 0, 0], 0.2),
    ));
    if sleeping {
        painter.add(egui::Shape::ellipse_filled(
            p,
            Vec2::new(unit * 0.3, unit * 0.2),
            orange,
        ));
        painter.circle_filled(Pos2::new(p.x, p.y - unit * 0.1), unit * 0.14, orange);
        painter.circle_filled(Pos2::new(p.x, p.y - unit * 0.08), unit * 0.09, cream);
        // telinga
        painter.circle_filled(
            Pos2::new(p.x - unit * 0.1, p.y - unit * 0.2),
            unit * 0.04,
            orange,
        );
        painter.circle_filled(
            Pos2::new(p.x + unit * 0.1, p.y - unit * 0.2),
            unit * 0.04,
            orange,
        );
        painter.text(
            Pos2::new(p.x + unit * 0.3, p.y - unit * 0.34),
            Align2::CENTER_CENTER,
            "Zzz",
            crate::theme::pixel(8.0),
            ca([0xd0, 0xc0, 0xe0], 0.9),
        );
    } else {
        // badan duduk
        painter.add(egui::Shape::ellipse_filled(
            Pos2::new(p.x, p.y),
            Vec2::new(unit * 0.18, unit * 0.24),
            orange,
        ));
        painter.circle_filled(Pos2::new(p.x, p.y - unit * 0.22), unit * 0.15, orange);
        painter.circle_filled(
            Pos2::new(p.x - unit * 0.09, p.y - unit * 0.34),
            unit * 0.045,
            orange,
        );
        painter.circle_filled(
            Pos2::new(p.x + unit * 0.09, p.y - unit * 0.34),
            unit * 0.045,
            orange,
        );
        painter.circle_filled(Pos2::new(p.x, p.y - unit * 0.2), unit * 0.09, cream);
        painter.circle_filled(
            Pos2::new(p.x - unit * 0.05, p.y - unit * 0.24),
            unit * 0.02,
            c([0x2a, 0x22, 0x2a]),
        );
        painter.circle_filled(
            Pos2::new(p.x + unit * 0.05, p.y - unit * 0.24),
            unit * 0.02,
            c([0x2a, 0x22, 0x2a]),
        );
        // ekor
        let sway = (cat.phase * 2.0).sin() * unit * 0.1;
        painter.line_segment(
            [
                Pos2::new(p.x + unit * 0.16, p.y + unit * 0.05),
                Pos2::new(p.x + unit * 0.34 + sway, p.y - unit * 0.1),
            ],
            Stroke::new(unit * 0.07, orange),
        );
    }
}

// ---------------- Label ruangan ----------------
fn draw_room_labels(painter: &Painter, rect: Rect, cam: &Camera, _sim: &Sim) {
    if cam.scale < 7.0 {
        return;
    }
    for room in office::ROOMS.iter() {
        if let Some(label) = room.label {
            let p = cam.w2s(
                rect,
                room.x as f32 + room.w as f32 / 2.0,
                room.y as f32 + 0.7,
            );
            painter.text(
                p,
                Align2::CENTER_CENTER,
                label,
                crate::theme::pixel((cam.scale * 0.34).clamp(8.0, 13.0)),
                ca([0x4a, 0x3a, 0x2a], 0.35),
            );
        }
    }
}

// ---------------- Partikel ----------------
fn draw_particles(painter: &Painter, rect: Rect, cam: &Camera, sim: &Sim) {
    for p in sim.particles.iter() {
        let sp = cam.w2s(rect, p.x, p.y);
        let life = (p.life / p.max_life.max(0.001)).clamp(0.0, 1.0);
        match p.kind {
            ParticleKind::Dust => {
                painter.circle_filled(sp, cam.scale * 0.05, ca([0xff, 0xf0, 0xc0], 0.5 * life));
            }
            ParticleKind::Steam => {
                painter.circle_filled(
                    sp,
                    cam.scale * (0.08 + 0.06 * life),
                    ca([0xff, 0xff, 0xff], 0.28 * life),
                );
            }
            ParticleKind::Heart => {
                painter.circle_filled(sp, cam.scale * 0.07, ca([0xff, 0x9e, 0xc4], 0.9 * life));
            }
            ParticleKind::Rain => {
                painter.line_segment(
                    [
                        sp,
                        Pos2::new(sp.x - cam.scale * 0.03, sp.y + cam.scale * 0.22),
                    ],
                    Stroke::new(1.0, ca([0xbf, 0xd8, 0xf0], 0.5 * life)),
                );
            }
        }
    }
}

// ---------------- Pencahayaan ----------------
fn glow(painter: &Painter, center: Pos2, radius: f32, color: Color32, intensity: f32) {
    let steps = 6;
    for i in (1..=steps).rev() {
        let t = i as f32 / steps as f32;
        let r = radius * t;
        let a = intensity * (1.0 - t).powf(1.4) * 0.55;
        painter.circle_filled(
            center,
            r,
            Color32::from_rgba_unmultiplied(color.r(), color.g(), color.b(), (a * 255.0) as u8),
        );
    }
}

fn ambient_tint(hour: f32) -> Color32 {
    let keys: [(f32, [u8; 3], f32); 8] = [
        (0.0, [0x0e, 0x12, 0x24], 0.60),
        (5.5, [0x1b, 0x23, 0x40], 0.42),
        (6.8, [0xff, 0xb2, 0x7a], 0.16),
        (8.5, [0xff, 0xf0, 0xd0], 0.0),
        (16.5, [0xff, 0xa8, 0x60], 0.12),
        (18.5, [0xff, 0x7a, 0x4a], 0.20),
        (20.0, [0x3a, 0x35, 0x60], 0.44),
        (24.0, [0x0e, 0x12, 0x24], 0.60),
    ];
    let h = hour.rem_euclid(24.0);
    for w in keys.windows(2) {
        let (h0, c0, a0) = w[0];
        let (h1, c1, a1) = w[1];
        if h >= h0 && h <= h1 {
            let t = (h - h0) / (h1 - h0).max(0.001);
            let col = lerp_rgb(c0, c1, t);
            let a = lerp(a0, a1, t);
            return ca(col, a);
        }
    }
    ca([0x0e, 0x12, 0x24], 0.6)
}

fn draw_lighting(painter: &Painter, rect: Rect, cam: &Camera, sim: &Sim, hour: f32) {
    let tint = ambient_tint(hour);
    if tint.a() > 3 {
        painter.rect_filled(rect, CornerRadius::ZERO, tint);
    }
    let night = hour < 6.5 || hour >= 18.0;
    let unit = cam.scale;
    // lampu hangat: meja yang aktif
    for a in sim.agents.iter().filter(|a| a.present) {
        let p = cam.w2s(rect, a.pos.0, a.pos.1 - 0.2);
        let is_work = a.sit;
        if is_work {
            let intensity = if night { 0.95 } else { 0.28 };
            glow(
                painter,
                p,
                unit * 2.4,
                Color32::from_rgb(0xff, 0xc9, 0x78),
                intensity,
            );
            // lampu meja kecil
            painter.circle_filled(
                Pos2::new(p.x + unit * 0.28, p.y - unit * 0.36),
                unit * 0.06,
                c([0xff, 0xe0, 0xa0]),
            );
        }
        // glow monitor
        glow(
            painter,
            p,
            unit * 1.2,
            Color32::from_rgb(0x9f, 0xe0, 0xd8),
            if night { 0.5 } else { 0.16 },
        );
    }
    // lampu pantry & koridor
    glow(
        painter,
        cam.w2s(rect, 83.5, 29.5),
        unit * 3.0,
        Color32::from_rgb(0xff, 0xd8, 0x98),
        if night { 0.7 } else { 0.18 },
    );
    glow(
        painter,
        cam.w2s(rect, 47.0, 24.0),
        unit * 4.0,
        Color32::from_rgb(0xff, 0xe8, 0xc0),
        if night { 0.35 } else { 0.1 },
    );
    glow(
        painter,
        cam.w2s(rect, 15.0, 24.0),
        unit * 4.0,
        Color32::from_rgb(0xff, 0xe8, 0xc0),
        if night { 0.35 } else { 0.1 },
    );
    // lampu direktur
    glow(
        painter,
        cam.w2s(rect, 72.5, 5.5),
        unit * 3.2,
        Color32::from_rgb(0xff, 0xc0, 0x70),
        if night { 0.6 } else { 0.15 },
    );
}

fn draw_selection_ring(painter: &Painter, rect: Rect, cam: &Camera, sim: &Sim) {
    if let Some(i) = sim.selected {
        if let Some(a) = sim.agents.get(i) {
            if a.present {
                let p = cam.w2s(rect, a.pos.0, a.pos.1 + 0.35);
                painter.add(egui::Shape::ellipse_stroke(
                    p,
                    Vec2::new(cam.scale * 0.4, cam.scale * 0.16),
                    Stroke::new(1.6, Color32::from_rgb(0xf0, 0xb3, 0x57)),
                ));
            }
        }
    }
    // highlight tile hover
    let _ = (MAP_W, MAP_H);
}

// ---------------- Balon kata ----------------
fn draw_bubbles(painter: &Painter, rect: Rect, cam: &Camera, sim: &Sim) {
    for a in sim.agents.iter().filter(|a| a.present) {
        if let Some((text, _)) = &a.bubble {
            draw_bubble(painter, rect, cam, a.pos, text, a.def.accent);
        }
    }
    if let Some((text, _)) = &sim.cat.bubble {
        draw_bubble(painter, rect, cam, sim.cat.pos, text, [0xe0, 0x91, 0x3f]);
    }
}

fn draw_bubble(
    painter: &Painter,
    rect: Rect,
    cam: &Camera,
    at: (f32, f32),
    text: &str,
    accent: [u8; 3],
) {
    let unit = cam.scale;
    let fp = crate::theme::body((unit * 0.5).clamp(10.0, 13.0));
    let max_chars = 26;
    let mut lines: Vec<String> = Vec::new();
    let mut cur = String::new();
    for word in text.split_whitespace() {
        if cur.chars().count() + word.chars().count() + 1 > max_chars && !cur.is_empty() {
            lines.push(cur.clone());
            cur.clear();
        }
        if !cur.is_empty() {
            cur.push(' ');
        }
        cur.push_str(word);
        if lines.len() >= 3 {
            break;
        }
    }
    if !cur.is_empty() && lines.len() < 4 {
        lines.push(cur);
    }
    let text_block = lines.join("\n");
    let galley = painter.layout_no_wrap(text_block, fp, Color32::from_rgb(0x2a, 0x22, 0x2a));
    let pad = unit * 0.18;
    let top = cam.w2s(rect, at.0, at.1 - 0.55);
    let size = galley.size() + Vec2::splat(pad * 2.0);
    let mut b = Rect::from_min_size(Pos2::new(top.x - size.x / 2.0, top.y - size.y), size);
    // jepit ke dalam viewport
    if b.min.x < rect.min.x + 4.0 {
        b = b.translate(Vec2::new(rect.min.x + 4.0 - b.min.x, 0.0));
    }
    if b.max.x > rect.max.x - 4.0 {
        b = b.translate(Vec2::new(rect.max.x - 4.0 - b.max.x, 0.0));
    }
    if b.min.y < rect.min.y + 2.0 {
        b = b.translate(Vec2::new(0.0, rect.min.y + 2.0 - b.min.y));
    }
    painter.rect_filled(
        b,
        CornerRadius::same(6),
        Color32::from_rgb(0xfb, 0xf3, 0xe4),
    );
    painter.rect_stroke(
        b,
        CornerRadius::same(6),
        Stroke::new(1.2, c(accent)),
        StrokeKind::Inside,
    );
    // ekor balon
    painter.add(egui::Shape::convex_polygon(
        vec![
            Pos2::new(b.center().x - unit * 0.12, b.max.y),
            Pos2::new(b.center().x + unit * 0.12, b.max.y),
            Pos2::new(b.center().x, b.max.y + unit * 0.22),
        ],
        Color32::from_rgb(0xfb, 0xf3, 0xe4),
        Stroke::NONE,
    ));
    painter.galley(
        b.min + Vec2::splat(pad),
        galley,
        Color32::from_rgb(0x2a, 0x22, 0x2a),
    );
}

/// Ambil agen pada posisi layar (untuk klik).
pub fn pick_agent(sim: &Sim, cam: &Camera, rect: Rect, pos: Pos2) -> Option<usize> {
    let (wx, wy) = cam.s2w(rect, pos);
    let mut best: Option<(usize, f32)> = None;
    for (i, a) in sim.agents.iter().enumerate() {
        if !a.present {
            continue;
        }
        let d = ((a.pos.0 - wx).powi(2) + (a.pos.1 - wy).powi(2)).sqrt();
        if d < 0.9 && best.map(|(_, bd)| d < bd).unwrap_or(true) {
            best = Some((i, d));
        }
    }
    best.map(|(i, _)| i)
}

/// Warna aksen fase untuk UI.
pub fn phase_accent(p: Phase) -> Color32 {
    match p {
        Phase::LateNight => Color32::from_rgb(0x8a, 0x9a, 0xd0),
        Phase::Dawn => Color32::from_rgb(0xf0, 0xb3, 0x80),
        Phase::Morning => Color32::from_rgb(0xf0, 0xd8, 0x90),
        Phase::Lunch => Color32::from_rgb(0x9d, 0xc0, 0x8c),
        Phase::Afternoon => Color32::from_rgb(0xf0, 0xc0, 0x80),
        Phase::Evening => Color32::from_rgb(0xe8, 0x8a, 0x62),
        Phase::Overtime => Color32::from_rgb(0xb0, 0xa0, 0xe0),
    }
}

pub fn fmt_time_label(sim: &Sim) -> String {
    let (h, m) = if let Some(h) = sim.preview_hour {
        (h.floor() as u32 % 24, ((h - h.floor()) * 60.0) as u32 % 60)
    } else {
        (sim.now.hour(), sim.now.minute())
    };
    clock_hm(h, m)
}

/// Pusat peta (tile) untuk keperluan fokus kamera.
pub fn map_center() -> (f32, f32) {
    (MAP_W as f32 / 2.0, MAP_H as f32 / 2.0)
}
