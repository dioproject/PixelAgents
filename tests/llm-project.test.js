import { describe, expect, test } from 'bun:test';
import { parseProjectContent, parseProjectCode } from '../src/llm/prompts.js';
import { projectContentFallback } from '../src/llm/fallback.js';

describe('parseProjectContent', () => {
  test('json di dalam fenced block', () => {
    const raw = 'Ini hasilnya:\n```json\n{"sections":[{"division":"it","title":"T","text":"X"}],"caption":"hai"}\n```\nSemoga membantu!';
    const data = parseProjectContent(raw);
    expect(data.sections[0].division).toBe('it');
    expect(data.caption).toBe('hai');
  });
  test('teks sampah → null', () => {
    expect(parseProjectContent('maaf saya tidak bisa')).toBeNull();
  });
});

describe('parseProjectCode', () => {
  test('ambil files & run', () => {
    const raw = '{"stack":"tauri","run":["bun install"],"files":[{"path":"package.json","content":"{}"}]}';
    const data = parseProjectCode(raw);
    expect(data.files.length).toBe(1);
    expect(data.run[0]).toBe('bun install');
  });
  test('tanpa files → null', () => {
    expect(parseProjectCode('{"stack":"x"}')).toBeNull();
    expect(parseProjectCode('bukan json')).toBeNull();
  });
});

describe('projectContentFallback', () => {
  test('lengkap 5 divisi', () => {
    const c = projectContentFallback({ title: 'Uji Coba Proyek' });
    expect(c.sections.map((s) => s.division)).toEqual(['it', 'marketing', 'finance', 'hrd', 'ga']);
    expect(c.budget.length).toBeGreaterThanOrEqual(3);
    expect(c.ga.length).toBeGreaterThanOrEqual(3);
    expect(c.memo.subject).toContain('Uji Coba Proyek');
    expect(c.poster.hashtags[0].startsWith('#')).toBe(true);
  });
});
