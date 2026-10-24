// ============================================================
// theme.rs — Palet "cozy" + font pixel + gaya egui
// ============================================================

use eframe::egui::{
    self, Color32, FontData, FontDefinitions, FontFamily, FontId, Stroke, TextStyle,
};
use std::sync::Arc;

// ---------- Warna UI (hangat, kayu, krem) ----------
pub const BG: Color32 = Color32::from_rgb(0x1c, 0x17, 0x1f);
pub const PANEL: Color32 = Color32::from_rgb(0x27, 0x20, 0x29);
pub const PANEL_2: Color32 = Color32::from_rgb(0x33, 0x2a, 0x34);
pub const PANEL_3: Color32 = Color32::from_rgb(0x3f, 0x34, 0x3f);
pub const BORDER: Color32 = Color32::from_rgb(0x4c, 0x3e, 0x49);
pub const BORDER_2: Color32 = Color32::from_rgb(0x63, 0x51, 0x5d);
pub const TEXT: Color32 = Color32::from_rgb(0xf3, 0xe8, 0xd8);
pub const TEXT_DIM: Color32 = Color32::from_rgb(0xb9, 0xa3, 0x92);
pub const TEXT_FAINT: Color32 = Color32::from_rgb(0x8b, 0x78, 0x6c);
pub const ACCENT: Color32 = Color32::from_rgb(0xe8, 0x7a, 0x52); // terracotta
pub const ACCENT_2: Color32 = Color32::from_rgb(0xf0, 0xb3, 0x57); // gold
pub const SAGE: Color32 = Color32::from_rgb(0x9d, 0xc0, 0x8c);
pub const TEAL: Color32 = Color32::from_rgb(0x7e, 0xc9, 0xc0);
pub const PINK: Color32 = Color32::from_rgb(0xe0, 0x9a, 0xb0);
pub const LAV: Color32 = Color32::from_rgb(0xb3, 0xa4, 0xd4);
pub const DANGER: Color32 = Color32::from_rgb(0xe0, 0x6a, 0x6a);
pub const SUCCESS: Color32 = Color32::from_rgb(0x8f, 0xc0, 0x7a);
pub const INK: Color32 = Color32::from_rgb(0x16, 0x12, 0x18);

// ---------- Font ----------
pub const PIXEL: &str = "pixel";
pub const PIXEL_BOLD: &str = "pixelb";

pub fn pixel(size: f32) -> FontId {
    FontId::new(size, FontFamily::Name(PIXEL.into()))
}
pub fn pixel_bold(size: f32) -> FontId {
    FontId::new(size, FontFamily::Name(PIXEL_BOLD.into()))
}
pub fn body(size: f32) -> FontId {
    FontId::new(size, FontFamily::Proportional)
}
pub fn mono(size: f32) -> FontId {
    FontId::new(size, FontFamily::Monospace)
}

/// Pasang font & gaya global (cozy).
pub fn install(ctx: &egui::Context) {
    let mut fonts = FontDefinitions::default();
    fonts.font_data.insert(
        "varela".to_owned(),
        Arc::new(FontData::from_static(include_bytes!(
            "../assets/fonts/VarelaRound-Regular.ttf"
        ))),
    );
    fonts.font_data.insert(
        "silk".to_owned(),
        Arc::new(FontData::from_static(include_bytes!(
            "../assets/fonts/Silkscreen-Regular.ttf"
        ))),
    );
    fonts.font_data.insert(
        "silk_bold".to_owned(),
        Arc::new(FontData::from_static(include_bytes!(
            "../assets/fonts/Silkscreen-Bold.ttf"
        ))),
    );

    fonts
        .families
        .entry(FontFamily::Proportional)
        .or_default()
        .insert(0, "varela".to_owned());
    fonts
        .families
        .entry(FontFamily::Monospace)
        .or_default()
        .insert(0, "silk".to_owned());
    fonts
        .families
        .entry(FontFamily::Name(PIXEL.into()))
        .or_default()
        .push("silk".to_owned());
    fonts
        .families
        .entry(FontFamily::Name(PIXEL_BOLD.into()))
        .or_default()
        .push("silk_bold".to_owned());

    ctx.set_fonts(fonts);

    let mut style = (*ctx.global_style()).clone();
    style.text_styles = [
        (TextStyle::Small, body(11.0)),
        (TextStyle::Body, body(13.0)),
        (TextStyle::Button, body(13.0)),
        (TextStyle::Heading, pixel(16.0)),
        (TextStyle::Monospace, mono(12.0)),
    ]
    .into();

    let v = &mut style.visuals;
    v.dark_mode = true;
    v.override_text_color = Some(TEXT);
    v.panel_fill = PANEL;
    v.window_fill = PANEL;
    v.extreme_bg_color = INK;
    v.faint_bg_color = PANEL_2;
    v.window_stroke = Stroke::new(1.0, BORDER);
    v.window_corner_radius = egui::CornerRadius::same(10);
    v.menu_corner_radius = egui::CornerRadius::same(8);
    v.selection.bg_fill = ACCENT.gamma_multiply(0.45);
    v.selection.stroke = Stroke::new(1.0, ACCENT_2);
    v.hyperlink_color = TEAL;
    v.widgets.noninteractive.bg_fill = PANEL_2;
    v.widgets.noninteractive.weak_bg_fill = PANEL_2;
    v.widgets.noninteractive.bg_stroke = Stroke::new(1.0, BORDER);
    v.widgets.noninteractive.fg_stroke = Stroke::new(1.0, TEXT_DIM);
    v.widgets.noninteractive.corner_radius = egui::CornerRadius::same(8);

    v.widgets.inactive.bg_fill = PANEL_3;
    v.widgets.inactive.weak_bg_fill = PANEL_3;
    v.widgets.inactive.bg_stroke = Stroke::new(1.0, BORDER);
    v.widgets.inactive.fg_stroke = Stroke::new(1.0, TEXT);
    v.widgets.inactive.corner_radius = egui::CornerRadius::same(8);

    v.widgets.hovered.bg_fill = BORDER_2;
    v.widgets.hovered.weak_bg_fill = BORDER_2;
    v.widgets.hovered.bg_stroke = Stroke::new(1.0, ACCENT);
    v.widgets.hovered.fg_stroke = Stroke::new(1.0, TEXT);
    v.widgets.hovered.corner_radius = egui::CornerRadius::same(8);

    v.widgets.active.bg_fill = ACCENT.gamma_multiply(0.85);
    v.widgets.active.weak_bg_fill = ACCENT.gamma_multiply(0.85);
    v.widgets.active.bg_stroke = Stroke::new(1.0, ACCENT_2);
    v.widgets.active.fg_stroke = Stroke::new(1.0, INK);
    v.widgets.active.corner_radius = egui::CornerRadius::same(8);

    style.spacing.item_spacing = egui::vec2(8.0, 7.0);
    style.spacing.button_padding = egui::vec2(10.0, 6.0);
    style.spacing.window_margin = egui::Margin::same(10);
    style.spacing.scroll.bar_width = 9.0;

    ctx.set_global_style(style);
}
