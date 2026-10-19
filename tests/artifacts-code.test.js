import { describe, expect, test } from 'bun:test';
import {
  sanitizeRelPath, normalizeCodeFiles, pickFallbackTemplate, withGuaranteedReadme,
  MAX_FILE_BYTES,
} from '../src/artifacts/code.js';

describe('sanitizeRelPath', () => {
  test('tolak path keluar & absolut', () => {
    expect(sanitizeRelPath('../rahasia.txt')).toBeNull();
    expect(sanitizeRelPath('/etc/passwd')).toBeNull();
    expect(sanitizeRelPath('C:\\Windows\\x.txt')).toBeNull();
  });
  test('normalisasi backslash & reserved windows', () => {
    expect(sanitizeRelPath('src-tauri\\src\\main.rs')).toBe('src-tauri/src/main.rs');
    expect(sanitizeRelPath('CON.txt')).toBe('proj-CON.txt');
  });
  test('tolak node_modules & terlalu dalam', () => {
    expect(sanitizeRelPath('node_modules/x.js')).toBeNull();
    expect(sanitizeRelPath('a/b/c/d/e.js')).toBeNull();
  });
});

describe('normalizeCodeFiles', () => {
  test('whitelist, duplikat, kapasitas', () => {
    const { files, dropped } = normalizeCodeFiles([
      { path: 'package.json', content: '{}' },
      { path: 'app.exe', content: 'MZ' },
      { path: 'package.json', content: '{}' },
      { path: 'src/main.js', content: 'console.log(1)' },
    ]);
    expect(files.map((f) => f.path)).toEqual(['package.json', 'src/main.js']);
    expect(dropped).toBe(2);
  });
  test('json rusak → warn', () => {
    const { files } = normalizeCodeFiles([{ path: 'rusak.json', content: '{bukan json' }]);
    expect(files[0].warn).toBe(true);
  });
  test('file kebesaran dibuang', () => {
    const big = 'x'.repeat(MAX_FILE_BYTES + 10);
    const { files, dropped } = normalizeCodeFiles([{ path: 'big.js', content: big }]);
    expect(files.length).toBe(0);
    expect(dropped).toBe(1);
  });
});

describe('pickFallbackTemplate', () => {
  test('tauri vs vite', () => {
    expect(pickFallbackTemplate('Buat aplikasi desktop Tauri + Rust + SQLite')).toBe('tauri-sqlite-starter');
    expect(pickFallbackTemplate('Landing page vite vanilla')).toBe('vite-vanilla-starter');
  });
});

describe('withGuaranteedReadme', () => {
  test('menambah README bila tidak ada', () => {
    const out = withGuaranteedReadme([{ path: 'index.html', content: '<h1>x</h1>', bytes: 13, warn: false, ok: true }], { title: 'X' }, []);
    expect(out[0].path).toBe('README.md');
    expect(out.length).toBe(2);
  });
  test('tidak dobel bila sudah ada', () => {
    const out = withGuaranteedReadme([{ path: 'README.md', content: '# x', bytes: 3, warn: false, ok: true }], { title: 'X' }, []);
    expect(out.length).toBe(1);
  });
});
