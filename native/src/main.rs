// Pixel Sinergi — Cozy AI Agent Studio (native Rust)
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod data;
mod deliver;
mod imagegen;
mod llm;
mod office;
mod render;
mod sim;
mod theme;
mod util;

use eframe::egui;
use render::Camera;
use sim::Sim;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

struct App {
    sim: Sim,
    cam: Camera,
    last: Instant,
}

impl App {
    fn new(cc: &eframe::CreationContext<'_>) -> Self {
        theme::install(&cc.egui_ctx);
        let mut sim = Sim::new();
        if let Ok(h) = std::env::var("PIXEL_PREVIEW_HOUR") {
            if let Ok(v) = h.parse::<f32>() {
                sim.set_preview(Some(v));
            }
        }
        if let Ok(sh) = std::env::var("PIXEL_DAY_SHIFT") {
            if let Ok(v) = sh.parse::<i64>() {
                sim.set_day_shift(v);
            }
        }
        // QA/snapshot: panaskan simulasi agar agen sudah duduk di meja.
        if let Ok(w) = std::env::var("PIXEL_WARM") {
            if let Ok(secs) = w.parse::<f32>() {
                let steps = (secs / 0.05) as i32;
                for _ in 0..steps {
                    sim.tick(0.05);
                }
            }
        }
        Self {
            sim,
            cam: Camera::default(),
            last: Instant::now(),
        }
    }
}

impl eframe::App for App {
    fn ui(&mut self, ui: &mut egui::Ui, _frame: &mut eframe::Frame) {
        let dt = self.last.elapsed().as_secs_f32().min(0.25);
        self.last = Instant::now();
        self.sim.tick(dt);
        ui.ctx().request_repaint_after(Duration::from_millis(16));

        egui::Panel::top("hud").show(ui, |ui| {
            ui.horizontal(|ui| {
                ui.label(egui::RichText::new("Pixel Sinergi").heading());
                ui.label(format!(
                    "{} {}",
                    self.sim.clock_str(),
                    self.sim.phase().label()
                ));
                ui.label(format!("agen hadir: {}", self.sim.present_agents().len()));
            });
        });

        egui::Panel::right("feed")
            .default_size(300.0)
            .show(ui, |ui| {
                ui.heading("Live Office Feed");
                egui::ScrollArea::vertical()
                    .stick_to_bottom(true)
                    .show(ui, |ui| {
                        for f in self.sim.feed.iter() {
                            ui.label(format!("[{}] {}", f.time, f.text));
                        }
                    });
            });

        egui::CentralPanel::default().show(ui, |ui| {
            let rect = ui.available_rect_before_wrap();
            let resp = render::draw_office(ui, rect, &self.sim, &mut self.cam);
            if resp.clicked() {
                if let Some(pos) = resp.interact_pointer_pos() {
                    self.sim.selected = render::pick_agent(&self.sim, &self.cam, rect, pos);
                }
            }
        });
    }
}

fn gen_sample() {
    let root = std::env::temp_dir().join("pixel-sinergi-sample");
    let s = llm::Settings {
        offline: true,
        ..Default::default()
    };
    let cases = [
        (
            "Aplikasi Kasir Tunda Offline",
            "Buat aplikasi desktop tauri + rust + sqlite + vanilla js + vite untuk kasir warung",
            "software",
            "tauri",
        ),
        (
            "Pitch Deck Investor Agrikultur",
            "Buatkan pptx pitch deck untuk investor agrikultur 8 slide",
            "presentation",
            "web",
        ),
        (
            "Kampanye Kopi Susu Baru",
            "Kampanye peluncuran menu kopi susu baru di tiktok dan instagram",
            "campaign",
            "web",
        ),
    ];
    for (title, brief, kind, stack) in cases {
        let req = deliver::GenRequest {
            title: title.into(),
            brief: brief.into(),
            kind,
            stack,
            late: false,
            settings: s.clone(),
            date_label: "Senin, 1 Jan 2026".into(),
            day_num: 1,
            override_root: Some(root.clone()),
        };
        let d = deliver::run(&req, Arc::new(Mutex::new(String::new())));
        println!("== {} => {}", kind, d.folder.display());
        for f in d.files.iter() {
            println!("   {} ({} B) ok={}", f.rel, f.bytes, f.ok);
        }
    }
}

fn main() -> eframe::Result {
    let args: Vec<String> = std::env::args().collect();
    if args.iter().any(|a| a == "--gen-sample") {
        gen_sample();
        return Ok(());
    }
    if let Some(pos) = args.iter().position(|a| a == "--gen-icon") {
        let out = args
            .get(pos + 1)
            .cloned()
            .unwrap_or_else(|| "app.ico".into());
        let icon = imagegen::render_icon("Pixel Sinergi");
        let img = icon.to_image();
        let png_path = std::path::Path::new(&out).with_extension("png");
        let _ = img.save(&png_path);
        // ICO hanya menerima <=256px
        let small = image::imageops::resize(&img, 256, 256, image::imageops::FilterType::Lanczos3);
        match image::DynamicImage::ImageRgba8(small).save(&out) {
            Ok(_) => println!("ikon ditulis: {out}"),
            Err(e) => println!("gagal menulis ikon: {e}"),
        }
        return Ok(());
    }
    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_inner_size([1360.0, 860.0])
            .with_min_inner_size([1000.0, 640.0])
            .with_title("Pixel Sinergi — Cozy AI Studio"),
        renderer: eframe::Renderer::Glow,
        centered: true,
        ..Default::default()
    };
    eframe::run_native(
        "Pixel Sinergi",
        options,
        Box::new(|cc| Ok(Box::new(App::new(cc)))),
    )
}
