import { describe, expect, test } from 'bun:test';
import { mergeProjectContent } from '../src/agents/projects.js';
import { projectContentFallback } from '../src/llm/fallback.js';

const fallback = () => projectContentFallback({ title: 'Uji' });

describe('mergeProjectContent', () => {
  test('parsial: sebagian LLM, sisanya fallback → mixed', () => {
    const { value, source } = mergeProjectContent({
      sections: [
        { division: 'it', title: 'Baru', text: 'Teks baru.' },
        { division: 'marketing', title: 'Baru', text: 'Teks baru.' },
        { division: 'finance', title: 'Baru', text: 'Teks baru.' },
      ],
      caption: 'Caption dari LLM',
    }, fallback());
    expect(value.sections.find((s) => s.division === 'it').text).toBe('Teks baru.');
    expect(value.sections.find((s) => s.division === 'hrd').text.length).toBeGreaterThan(0);
    expect(value.caption).toBe('Caption dari LLM');
    expect(source).toBe('mixed');
  });

  test('rusak total → template', () => {
    const { source } = mergeProjectContent(null, fallback());
    expect(source).toBe('template');
  });

  test('klamp angka', () => {
    const { value } = mergeProjectContent({
      budget: [
        { item: 'A', qty: '2', price: '1000.5' },
        { item: 'B', qty: -5, price: -3 },
        { item: 'C', qty: 1, price: 1 },
      ],
    }, fallback());
    expect(value.budget[0].qty).toBe(2);
    expect(value.budget[0].price).toBe(1001);
    expect(value.budget[1].qty).toBe(1);
    expect(value.budget[1].price).toBe(0);
  });
});
