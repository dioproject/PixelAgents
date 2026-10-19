// ============================================================
// templates.js — Scaffold fallback valid (dipakai saat offline/gagal)
// Catatan: konten file ditulis sebagai string biasa (tanpa ${} / backtick)
// supaya tidak bentrok dengan template literal JS di file ini.
// ============================================================

const VITE_MAIN = [
  "const app = document.getElementById('app');",
  'let count = 0;',
  "const btn = document.createElement('button');",
  "btn.textContent = 'Klik saya (0)';",
  "btn.addEventListener('click', () => {",
  '  count += 1;',
  "  btn.textContent = 'Klik saya (' + count + ')';",
  '});',
  'app.appendChild(btn);',
  '',
].join('\n');

const VITE_HTML = [
  '<!doctype html>',
  '<html lang="id">',
  '  <head>',
  '    <meta charset="UTF-8" />',
  '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
  '    <title>Proyek Pixel</title>',
  '    <link rel="stylesheet" href="/src/style.css" />',
  '  </head>',
  '  <body>',
  '    <h1>Proyek Pixel Sinergi</h1>',
  '    <div id="app"></div>',
  '    <script type="module" src="/src/main.js"></script>',
  '  </body>',
  '</html>',
  '',
].join('\n');

const VITE_STYLE = 'body { font-family: system-ui, sans-serif; margin: 2rem; background: #14151f; color: #f2f4ff; }\nbutton { padding: 8px 14px; }\n';

const VITE_PKG = JSON.stringify({
  name: 'proyek-pixel',
  private: true,
  version: '0.1.0',
  type: 'module',
  scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
  devDependencies: { vite: '^5.0.0' },
}, null, 2) + '\n';

const VITE_CONFIG = [
  "import { defineConfig } from 'vite';",
  '',
  'export default defineConfig({',
  '  server: { port: 1420, strictPort: true },',
  '});',
  '',
].join('\n');

const VITE_RUN = ['bun install', 'bun run dev'];

// ---------------- Tauri + SQLite starter ----------------

const TAURI_MAIN = [
  "import { invoke } from '@tauri-apps/api/core';",
  '',
  "const listEl = document.getElementById('list');",
  "const inputEl = document.getElementById('note');",
  '',
  'async function refresh() {',
  "  const notes = await invoke('list_notes');",
  "  listEl.innerHTML = '';",
  '  for (const n of notes) {',
  "    const li = document.createElement('li');",
  '    li.textContent = n;',
  '    listEl.appendChild(li);',
  '  }',
  '}',
  '',
  "document.getElementById('add').addEventListener('click', async () => {",
  '  const text = inputEl.value.trim();',
  '  if (!text) return;',
  "  await invoke('add_note', { text });",
  "  inputEl.value = '';",
  '  refresh();',
  '});',
  '',
  'refresh();',
  '',
].join('\n');

const TAURI_HTML = [
  '<!doctype html>',
  '<html lang="id">',
  '  <head>',
  '    <meta charset="UTF-8" />',
  '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
  '    <title>Catatan Pixel</title>',
  '    <link rel="stylesheet" href="/src/style.css" />',
  '  </head>',
  '  <body>',
  '    <h1>Catatan Pixel</h1>',
  '    <input id="note" placeholder="Tulis catatan..." />',
  '    <button id="add">Tambah</button>',
  '    <ul id="list"></ul>',
  '    <script type="module" src="/src/main.js"></script>',
  '  </body>',
  '</html>',
  '',
].join('\n');

const TAURI_PKG = JSON.stringify({
  name: 'catatan-pixel',
  private: true,
  version: '0.1.0',
  type: 'module',
  scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview', tauri: 'tauri' },
  dependencies: { '@tauri-apps/api': '^2.0.0' },
  devDependencies: { '@tauri-apps/cli': '^2.0.0', vite: '^5.0.0' },
}, null, 2) + '\n';

const TAURI_CONFIG = JSON.stringify({
  $schema: 'https://schema.tauri.app/config/2',
  productName: 'Catatan Pixel',
  version: '0.1.0',
  identifier: 'com.pixelsinergi.catatan',
  build: {
    frontendDist: '../dist',
    devUrl: 'http://localhost:1420',
    beforeDevCommand: 'bun run dev',
    beforeBuildCommand: 'bun run build',
  },
  app: {
    windows: [{ title: 'Catatan Pixel', width: 900, height: 640 }],
    security: { csp: null },
  },
}, null, 2) + '\n';

const TAURI_CARGO = [
  '[package]',
  'name = "catatan-pixel"',
  'version = "0.1.0"',
  'edition = "2021"',
  '',
  '[build-dependencies]',
  'tauri-build = { version = "2", features = [] }',
  '',
  '[dependencies]',
  'tauri = { version = "2", features = [] }',
  'serde = { version = "1", features = ["derive"] }',
  'serde_json = "1"',
  'rusqlite = { version = "0.31", features = ["bundled"] }',
  '',
].join('\n');

const TAURI_BUILD_RS = 'fn main() {\n    tauri_build::build()\n}\n';

const TAURI_MAIN_RS = [
  'use std::sync::Mutex;',
  'use rusqlite::Connection;',
  'use tauri::Manager;',
  '',
  'struct Db(Mutex<Connection>);',
  '',
  '#[tauri::command]',
  'fn list_notes(db: tauri::State<Db>) -> Result<Vec<String>, String> {',
  '    let conn = db.0.lock().map_err(|e| e.to_string())?;',
  '    let mut stmt = conn.prepare("SELECT text FROM notes ORDER BY id DESC").map_err(|e| e.to_string())?;',
  '    let rows = stmt.query_map([], |row| row.get::<_, String>(0)).map_err(|e| e.to_string())?;',
  '    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())',
  '}',
  '',
  '#[tauri::command]',
  'fn add_note(db: tauri::State<Db>, text: String) -> Result<(), String> {',
  '    let conn = db.0.lock().map_err(|e| e.to_string())?;',
  '    conn.execute("INSERT INTO notes (text) VALUES (?1)", [text]).map_err(|e| e.to_string())?;',
  '    Ok(())',
  '}',
  '',
  'fn main() {',
  '    tauri::Builder::default()',
  '        .setup(|app| {',
  '            let dir = app.path().app_data_dir()?;',
  '            std::fs::create_dir_all(&dir)?;',
  '            let conn = Connection::open(dir.join("notes.db"))?;',
  '            conn.execute("CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT NOT NULL)", [])?;',
  '            app.manage(Db(Mutex::new(conn)));',
  '            Ok(())',
  '        })',
  '        .invoke_handler(tauri::generate_handler![list_notes, add_note])',
  '        .run(tauri::generate_context!())',
  '        .expect("error menjalankan aplikasi");',
  '}',
  '',
].join('\n');

const GITIGNORE = 'node_modules/\ndist/\nsrc-tauri/target/\n';

export const TEMPLATES = {
  'vite-vanilla-starter': {
    run: VITE_RUN,
    files: [
      { path: 'package.json', content: VITE_PKG },
      { path: 'index.html', content: VITE_HTML },
      { path: 'vite.config.js', content: VITE_CONFIG },
      { path: 'src/main.js', content: VITE_MAIN },
      { path: 'src/style.css', content: VITE_STYLE },
    ],
  },
  'tauri-sqlite-starter': {
    run: ['bun install', 'bun run tauri dev'],
    files: [
      { path: 'package.json', content: TAURI_PKG },
      { path: 'index.html', content: TAURI_HTML },
      { path: 'vite.config.js', content: VITE_CONFIG },
      { path: 'src/main.js', content: TAURI_MAIN },
      { path: 'src/style.css', content: VITE_STYLE },
      { path: 'src-tauri/Cargo.toml', content: TAURI_CARGO },
      { path: 'src-tauri/build.rs', content: TAURI_BUILD_RS },
      { path: 'src-tauri/src/main.rs', content: TAURI_MAIN_RS },
      { path: 'src-tauri/tauri.conf.json', content: TAURI_CONFIG },
      { path: '.gitignore', content: GITIGNORE },
    ],
  },
};
