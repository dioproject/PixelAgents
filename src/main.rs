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

use chrono::Datelike;
use eframe::egui::{self, CornerRadius, Rect};
use render::Camera;
use sim::Sim;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

#[derive(Clone, Copy, PartialEq, Eq)]
enum FeedFilter {
    All,
    Kerja,
    Gosip,
    Direksi,
    Proyek,
}

struct App {
    sim: Sim,
    cam: Camera,
    last: Instant,
    // Pengaturan LLM & dialog
    settings: llm::Settings,
    show_settings: bool,
    test_result: Option<Result<String, String>>,
    testing_connection: bool,
    // Modal Titah Direksi & Proyek
    show_directive: bool,
    directive_input: String,
    // Modal Arsip Deliverable
    show_archive: bool,
    // Filter Feed
    feed_filter: FeedFilter,
    // Status background deliver
    progress_msg: Arc<Mutex<String>>,
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
        if let Ok(w) = std::env::var("PIXEL_WARM") {
            if let Ok(secs) = w.parse::<f32>() {
                let steps = (secs / 0.05) as i32;
                for _ in 0..steps {
                    sim.tick(0.05);
                }
            }
        }
        let settings = llm::load();
        Self {
            sim,
            cam: Camera::default(),
            last: Instant::now(),
            settings,
            show_settings: false,
            test_result: None,
            testing_connection: false,
            show_directive: false,
            directive_input: String::new(),
            show_archive: false,
            feed_filter: FeedFilter::All,
            progress_msg: Arc::new(Mutex::new(String::new())),
        }
    }

    fn focus_room(&mut self, rect: Rect, rx: f32, ry: f32, span: f32) {
        self.cam.fit(rect, Some((rx, ry, span)));
    }
}

impl eframe::App for App {
    fn ui(&mut self, ui: &mut egui::Ui, _frame: &mut eframe::Frame) {
        let dt = self.last.elapsed().as_secs_f32().min(0.25);
        self.last = Instant::now();
        self.sim.tick(dt);

        // Jika proyek selesai packing, jalankan generator deliverable (bila belum)
        if let Some(p) = self.sim.project.as_ref() {
            if p.status == sim::ProjStatus::Packing {
                let req = deliver::GenRequest {
                    title: p.title.clone(),
                    brief: p.brief.clone(),
                    kind: p.kind,
                    stack: p.stack,
                    late: p.late,
                    settings: self.settings.clone(),
                    date_label: self.sim.date_label(),
                    day_num: self.sim.now.ordinal(),
                    override_root: None,
                };
                let prog = Arc::clone(&self.progress_msg);
                // Langsung generate (blocking cepat di thread terpisah / sinkron)
                let delivered = deliver::run(&req, prog);
                self.sim.finish_project(delivered);
            }
        }

        ui.ctx().request_repaint_after(Duration::from_millis(16));

        // ================= TOP PANEL (HUD Cozy) =================
        egui::Panel::top("hud").show(ui, |ui| {
            ui.add_space(4.0);
            ui.horizontal(|ui| {
                ui.label(
                    egui::RichText::new("🏢 PT Pixel Sinergi Nusantara")
                        .font(theme::pixel(16.0))
                        .color(theme::ACCENT_2),
                );
                ui.separator();

                let phase = self.sim.phase();
                ui.label(
                    egui::RichText::new(format!("{} {} {}", phase.icon(), self.sim.clock_str(), phase.label()))
                        .font(theme::pixel(13.0))
                        .color(theme::TEXT),
                );

                ui.separator();
                ui.label(
                    egui::RichText::new(format!("👥 Hadir: {}/10", self.sim.present_agents().len()))
                        .font(theme::body(13.0))
                        .color(theme::TEXT_DIM),
                );

                if self.sim.has_project() {
                    ui.separator();
                    if let Some(p) = self.sim.project.as_ref() {
                        let pct = (p.progress() * 100.0) as i32;
                        ui.label(
                            egui::RichText::new(format!("🔨 Proyek: {}% «{}»", pct, p.title))
                                .font(theme::body(13.0))
                                .color(theme::ACCENT),
                        );
                    }
                }

                ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                    if ui.button(egui::RichText::new("⚙️ Settings AI").font(theme::body(13.0))).clicked() {
                        self.show_settings = !self.show_settings;
                    }
                    if ui.button(egui::RichText::new("📜 Titah Direksi").font(theme::body(13.0))).clicked() {
                        self.show_directive = !self.show_directive;
                    }
                    if ui.button(egui::RichText::new("📦 Arsip Hasil").font(theme::body(13.0))).clicked() {
                        self.show_archive = !self.show_archive;
                    }
                });
            });
            ui.add_space(4.0);
        });

        // ================= BOTTOM BAR (CCTV NAVIGATOR) =================
        egui::Panel::bottom("cctv_nav").show(ui, |ui| {
            ui.horizontal(|ui| {
                ui.label(
                    egui::RichText::new("📹 CCTV:")
                        .font(theme::pixel(12.0))
                        .color(theme::TEXT_DIM),
                );
                let viewport = ui.available_rect_before_wrap();
                if ui.button("Semua Kantor").clicked() {
                    self.cam.fit(viewport, None);
                }
                if ui.button("💻 IT").clicked() {
                    self.focus_room(viewport, 16.0, 11.0, 36.0);
                }
                if ui.button("🎨 Mktg").clicked() {
                    self.focus_room(viewport, 42.0, 37.0, 34.0);
                }
                if ui.button("📊 Finc").clicked() {
                    self.focus_room(viewport, 13.0, 37.0, 32.0);
                }
                if ui.button("☕ Pantry").clicked() {
                    self.focus_room(viewport, 76.0, 37.0, 42.0);
                }
                if ui.button("🤝 Rapat").clicked() {
                    self.focus_room(viewport, 48.0, 11.0, 36.0);
                }
                if ui.button("👑 Direktur").clicked() {
                    self.focus_room(viewport, 80.0, 11.0, 36.0);
                }
                if ui.button("📋 HRD/GA").clicked() {
                    self.focus_room(viewport, 24.0, 57.0, 44.0);
                }

                ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                    if let Ok(prog) = self.progress_msg.lock() {
                        if !prog.is_empty() {
                            ui.label(
                                egui::RichText::new(&*prog)
                                    .font(theme::body(12.0))
                                    .color(theme::ACCENT_2),
                            );
                        }
                    }
                });
            });
        });

        // ================= RIGHT PANEL (FEED & INSPECTOR) =================
        egui::Panel::right("side_panel")
            .default_size(320.0)
            .min_size(280.0)
            .show(ui, |ui| {
                // Jika ada agen yang dipilih, tampilkan Inspector
                if let Some(idx) = self.sim.selected {
                    if let Some(agent) = self.sim.agents.get(idx) {
                        ui.horizontal(|ui| {
                            ui.label(
                                egui::RichText::new(format!("👤 Profil: {}", agent.name()))
                                    .font(theme::pixel(15.0))
                                    .color(theme::ACCENT_2),
                            );
                            ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                                if ui.button("✕").clicked() {
                                    self.sim.selected = None;
                                }
                            });
                        });
                        ui.separator();

                        egui::Frame::group(ui.style())
                            .fill(theme::PANEL_2)
                            .corner_radius(CornerRadius::same(6))
                            .show(ui, |ui| {
                                ui.label(egui::RichText::new(agent.def.role).font(theme::body(13.0)).color(theme::TEXT));
                                ui.label(format!("Divisi: {}", agent.def.div.name()));
                                ui.label(format!("Status: {}", agent.activity));
                                ui.label(format!("Kehadiran: {}", if agent.present { "Di Kantor" } else { "Pulang/Luar" }));
                                ui.add_space(4.0);
                                ui.label(format!("😊 Mood: {:.0}%", agent.mood));
                                ui.label(format!("🔥 Stress: {:.0}%", agent.stress));
                                ui.label(format!("☕ Kopi: {:.1}/5.0", agent.coffee));
                                ui.add_space(4.0);
                                ui.label(egui::RichText::new(format!("Gaya: {}", agent.def.style)).font(theme::body(11.0)).color(theme::TEXT_DIM));
                                ui.label(egui::RichText::new(format!("Kebiasaan: {}", agent.def.habits)).font(theme::body(11.0)).color(theme::TEXT_DIM));

                                if let Some((bubble_txt, _)) = &agent.bubble {
                                    ui.add_space(4.0);
                                    ui.label(
                                        egui::RichText::new(format!("💬 \"{}\"", bubble_txt))
                                            .font(theme::body(12.0))
                                            .color(theme::ACCENT_2),
                                    );
                                }
                            });

                        ui.add_space(10.0);
                    }
                }

                // Header Feed & Tab
                ui.horizontal(|ui| {
                    ui.label(
                        egui::RichText::new("📢 Live Feed")
                            .font(theme::pixel(14.0))
                            .color(theme::TEXT),
                    );
                    ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                        ui.selectable_value(&mut self.feed_filter, FeedFilter::Proyek, "Proyek");
                        ui.selectable_value(&mut self.feed_filter, FeedFilter::Direksi, "Direksi");
                        ui.selectable_value(&mut self.feed_filter, FeedFilter::Gosip, "Gosip");
                        ui.selectable_value(&mut self.feed_filter, FeedFilter::Kerja, "Kerja");
                        ui.selectable_value(&mut self.feed_filter, FeedFilter::All, "Semua");
                    });
                });
                ui.separator();

                egui::ScrollArea::vertical()
                    .stick_to_bottom(true)
                    .show(ui, |ui| {
                        for f in self.sim.feed.iter() {
                            let match_filter = match self.feed_filter {
                                FeedFilter::All => true,
                                FeedFilter::Kerja => f.channel == "kerja",
                                FeedFilter::Gosip => f.channel == "gosip" || f.channel == "pantry",
                                FeedFilter::Direksi => f.channel == "direksi",
                                FeedFilter::Proyek => f.channel == "proyek",
                            };
                            if !match_filter {
                                continue;
                            }
                            let color = match f.channel {
                                "direksi" => theme::ACCENT_2,
                                "proyek" => theme::ACCENT,
                                "gosip" | "pantry" => theme::PINK,
                                "insiden" => theme::DANGER,
                                "sistem" => theme::TEXT_FAINT,
                                _ => theme::TEXT,
                            };
                            ui.horizontal(|ui| {
                                ui.label(
                                    egui::RichText::new(format!("[{}]", f.time))
                                        .font(theme::mono(11.0))
                                        .color(theme::TEXT_DIM),
                                );
                                ui.label(
                                    egui::RichText::new(&f.text)
                                        .font(theme::body(12.0))
                                        .color(color),
                                );
                            });
                        }
                    });
            });

        // ================= CENTRAL PANEL (CANVAS KANTOR) =================
        egui::CentralPanel::default().show(ui, |ui| {
            let rect = ui.available_rect_before_wrap();
            let resp = render::draw_office(ui, rect, &self.sim, &mut self.cam);
            if resp.clicked() {
                if let Some(pos) = resp.interact_pointer_pos() {
                    self.sim.selected = render::pick_agent(&self.sim, &self.cam, rect, pos);
                }
            }
        });

        // ================= MODAL: SETTINGS AI =================
        if self.show_settings {
            egui::Window::new("⚙️ Konfigurasi LLM / AI Studio")
                .collapsible(false)
                .resizable(false)
                .default_width(460.0)
                .show(ui.ctx(), |ui| {
                    ui.label(
                        egui::RichText::new("Masukkan endpoint OpenAI-compatible apa pun (9router, OpenRouter, Groq, Ollama, OpenAI).")
                            .font(theme::body(12.0))
                            .color(theme::TEXT_DIM),
                    );
                    ui.add_space(8.0);

                    ui.horizontal(|ui| {
                        ui.label("Base URL:");
                        ui.text_edit_singleline(&mut self.settings.base_url);
                    });
                    ui.label(
                        egui::RichText::new("Contoh: https://openrouter.ai/api/v1 atau http://localhost:11434/v1")
                            .font(theme::body(11.0))
                            .color(theme::TEXT_FAINT),
                    );

                    ui.horizontal(|ui| {
                        ui.label("API Key: ");
                        ui.add(egui::TextEdit::singleline(&mut self.settings.api_key).password(true));
                    });

                    ui.horizontal(|ui| {
                        ui.label("Model:   ");
                        ui.text_edit_singleline(&mut self.settings.model);
                    });

                    ui.horizontal(|ui| {
                        ui.label("Temperature:");
                        ui.add(egui::Slider::new(&mut self.settings.temperature, 0.0..=1.5).step_by(0.05));
                    });

                    ui.checkbox(&mut self.settings.offline, "Mode Offline (Paksa template prosedural)");

                    ui.separator();
                    ui.horizontal(|ui| {
                        if ui.button("🧪 Test Koneksi").clicked() {
                            self.testing_connection = true;
                            self.test_result = Some(llm::test_connection(&self.settings));
                            self.testing_connection = false;
                        }

                        if ui.button("💾 Simpan Pengaturan").clicked() {
                            let _ = llm::save(&self.settings);
                            self.show_settings = false;
                        }

                        if ui.button("Tutup").clicked() {
                            self.show_settings = false;
                        }
                    });

                    if let Some(res) = &self.test_result {
                        ui.add_space(4.0);
                        match res {
                            Ok(msg) => {
                                ui.label(
                                    egui::RichText::new(format!("✅ Terhubung: {msg}"))
                                        .color(theme::SUCCESS)
                                        .font(theme::body(12.0)),
                                );
                            }
                            Err(err) => {
                                ui.label(
                                    egui::RichText::new(format!("❌ Gagal: {err}"))
                                        .color(theme::DANGER)
                                        .font(theme::body(12.0)),
                                );
                            }
                        }
                    }
                });
        }

        // ================= MODAL: TITAH DIREKSI & TUGAS PROYEK =================
        if self.show_directive {
            egui::Window::new("📜 Titah Direksi & Proyek Baru")
                .collapsible(false)
                .resizable(false)
                .default_width(500.0)
                .show(ui.ctx(), |ui| {
                    ui.label(
                        egui::RichText::new("Sebagai Direktur Utama, kamu bisa memberi titah instan atau tugas proyek lengkap.")
                            .font(theme::body(12.0))
                            .color(theme::TEXT_DIM),
                    );
                    ui.add_space(8.0);

                    ui.heading("⚡ Titah Instan");
                    ui.horizontal(|ui| {
                        if ui.button("🤝 Rapat Dadakan").clicked() {
                            self.sim.directive_meeting();
                            self.show_directive = false;
                        }
                        if ui.button("🌙 Lembur Malam Ini").clicked() {
                            self.sim.directive_overtime();
                            self.show_directive = false;
                        }
                        if ui.button("☕ Potong Budget Kopi").clicked() {
                            self.sim.directive_coffee_cut();
                            self.show_directive = false;
                        }
                        if ui.button("🏖️ Bebas Ngapain Aja").clicked() {
                            self.sim.directive_free_day();
                            self.show_directive = false;
                        }
                    });

                    ui.separator();
                    ui.heading("📋 Perintah Kustom & Proyek Bebas");
                    ui.label(
                        egui::RichText::new("Ketik instruksi apa saja (misal: 'Bikin aplikasi kasir warung desktop', 'Buatkan pitch deck investor AI 8 slide', atau 'Evaluasi KPI minggu ini').")
                            .font(theme::body(12.0))
                            .color(theme::TEXT_DIM),
                    );

                    ui.add(
                        egui::TextEdit::multiline(&mut self.directive_input)
                            .hint_text("Tulis instruksi bebasmu di sini...")
                            .desired_rows(4)
                            .desired_width(f32::INFINITY),
                    );

                    ui.add_space(4.0);
                    ui.horizontal(|ui| {
                        if ui.button(egui::RichText::new("🚀 Luncurkan sebagai Tugas Proyek").color(theme::ACCENT)).clicked() {
                            if !self.directive_input.trim().is_empty() {
                                let _ = self.sim.start_project(&self.directive_input);
                                self.directive_input.clear();
                                self.show_directive = false;
                            }
                        }

                        if ui.button("📢 Umumkan sebagai Titah Direksi").clicked() {
                            if !self.directive_input.trim().is_empty() {
                                self.sim.directive_custom(&self.directive_input);
                                self.directive_input.clear();
                                self.show_directive = false;
                            }
                        }

                        ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                            if ui.button("Batal").clicked() {
                                self.show_directive = false;
                            }
                        });
                    });
                });
        }

        // ================= MODAL: ARSIP HASIL DELIVERABLE =================
        if self.show_archive {
            egui::Window::new("📦 Arsip Paket Deliverable")
                .collapsible(false)
                .resizable(true)
                .default_width(520.0)
                .show(ui.ctx(), |ui| {
                    ui.label(
                        egui::RichText::new("Paket yang dihasilkan AI tersimpan di: Documents\\PixelSinergi")
                            .font(theme::body(12.0))
                            .color(theme::TEXT_DIM),
                    );
                    if ui.button("📁 Buka Folder Utama").clicked() {
                        deliver::open_folder(&deliver::packages_root());
                    }
                    ui.separator();

                    if self.sim.archive.is_empty() {
                        ui.label(egui::RichText::new("Belum ada paket proyek yang selesai. Buat lewat menu Titah Direksi.").color(theme::TEXT_DIM));
                    } else {
                        egui::ScrollArea::vertical().show(ui, |ui| {
                            for item in self.sim.archive.iter().rev() {
                                egui::Frame::group(ui.style())
                                    .fill(theme::PANEL_2)
                                    .corner_radius(CornerRadius::same(6))
                                    .show(ui, |ui| {
                                        ui.horizontal(|ui| {
                                            ui.label(egui::RichText::new(&item.title).font(theme::body(14.0)).color(theme::ACCENT_2));
                                            ui.label(format!("({})", item.kind));
                                        });
                                        ui.label(format!("Selesai: {} | Sumber: {}", item.day_label, item.source));
                                        ui.label(format!("Lokasi: {}", item.folder.display()));
                                        if ui.button("📂 Buka Folder Paket").clicked() {
                                            deliver::open_folder(&item.folder);
                                        }
                                    });
                                ui.add_space(6.0);
                            }
                        });
                    }

                    if ui.button("Tutup").clicked() {
                        self.show_archive = false;
                    }
                });
        }
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
