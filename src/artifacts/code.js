// ============================================================
// code.js — Sanitasi & normalisasi file kode proyek (murni)
// ============================================================

export const MAX_CODE_FILES = 14;
export const MAX_FILE_BYTES = 24 * 1024;
export const MAX_TOTAL_BYTES = 160 * 1024;
const MAX_SEGMENTS = 4;
const SKIP_DIRS = new Set(['node_modules', 'target', 'dist', '.git']);
const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;
const ALLOWED_EXT = new Set([
  '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.html', '.css', '.json',
  '.md', '.rs', '.toml', '.yaml', '.yml', '.sql', '.txt', '.example',
]);
const ALLOWED_BASENAME = new Set(['.gitignore', '.env.example']);

export function sanitizeRelPath(raw) {
  const norm = String(raw || '').replaceAll('\\', '/').trim();
  if (!norm || norm.startsWith('/') || /^[a-zA-Z]:/.test(norm)) return null;
  const out = [];
  for (const segRaw of norm.split('/')) {
    const seg = segRaw.trim();
    if (!seg || seg === '.') continue;
    if (seg === '..') return null;
    if (SKIP_DIRS.has(seg.toLowerCase())) return null;
    const cleaned = seg.replace(/[<>:"|?*]/g, '').replace(/[. ]+$/g, '');
    if (!cleaned) return null;
    out.push(RESERVED.test(cleaned) ? `proj-${cleaned}` : cleaned);
  }
  if (!out.length || out.length > MAX_SEGMENTS) return null;
  return out.join('/');
}

function isAllowedPath(path) {
  const base = path.split('/').pop().toLowerCase();
  if (ALLOWED_BASENAME.has(base)) return true;
  const dot = base.lastIndexOf('.');
  if (dot <= 0) return false;
  return ALLOWED_EXT.has(base.slice(dot));
}

function isValidJson(text) {
  try { JSON.parse(text); return true; } catch { return false; }
}

export function normalizeCodeFiles(rawFiles) {
  const files = [];
  const seen = new Set();
  let totalBytes = 0;
  let dropped = 0;
  for (const raw of Array.isArray(rawFiles) ? rawFiles : []) {
    const path = sanitizeRelPath(raw?.path);
    const content = typeof raw?.content === 'string' ? raw.content : '';
    if (!path || !content.trim()) { dropped += 1; continue; }
    const key = path.toLowerCase();
    if (seen.has(key) || !isAllowedPath(path)) { dropped += 1; continue; }
    const bytes = new TextEncoder().encode(content).length;
    if (bytes > MAX_FILE_BYTES || totalBytes + bytes > MAX_TOTAL_BYTES || files.length >= MAX_CODE_FILES) {
      dropped += 1;
      continue;
    }
    seen.add(key);
    totalBytes += bytes;
    const warn = key.endsWith('.json') && !isValidJson(content);
    files.push({ path, content, bytes, warn, ok: !warn });
  }
  return { files, dropped, totalBytes };
}

export function pickFallbackTemplate(brief) {
  const t = String(brief || '').toLowerCase();
  return /(tauri|rust|desktop|aplikasi desktop|\bexe\b|sqlite)/.test(t)
    ? 'tauri-sqlite-starter'
    : 'vite-vanilla-starter';
}

export function withGuaranteedReadme(files, project, run = []) {
  if (files.some((f) => f.path.toLowerCase().endsWith('readme.md'))) return files;
  const steps = run.length
    ? run.map((cmd, i) => `${i + 1}. \`${cmd}\``)
    : ['1. Buka `index.html` di browser.'];
  const content = [
    `# ${project.title}`,
    '',
    'Proyek ini dihasilkan oleh Divisi IT PT Pixel Sinergi Nusantara Tbk untuk Bapak Direktur.',
    '',
    '## Cara menjalankan',
    ...steps,
    '',
    '> Catatan: kode belum melalui QA otomatis. Review dulu sebelum dipakai.',
    '',
  ].join('\n');
  return [{ path: 'README.md', content, bytes: new TextEncoder().encode(content).length, warn: false, ok: true }, ...files];
}
