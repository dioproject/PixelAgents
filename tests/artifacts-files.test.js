import { describe, expect, test } from 'bun:test';
import {
  slugifyTitle, csvCell, buildBudgetCsv, buildGaChecklistCsv,
  buildCaptionTxt, buildMemoMd, buildReportMd,
} from '../src/artifacts/files.js';

const project = {
  id: 'prj_abc123',
  title: 'Buat Aplikasi Desktop Tauri',
  day: 3,
  status: 'done',
  content: {
    sections: [
      { division: 'it', title: 'Rencana Teknis', text: 'Stack dipilih.' },
      { division: 'marketing', title: 'Kampanye', text: 'Poster siap.' },
      { division: 'finance', title: 'Anggaran', text: 'Rapi.' },
      { division: 'hrd', title: 'SDM', text: 'Aman.' },
      { division: 'ga', title: 'Logistik', text: 'Siap.' },
    ],
  },
  code: { fallback: true },
  files: [{ relPath: 'kode/package.json' }],
};

describe('slugifyTitle', () => {
  test('lowercase & dash', () => {
    expect(slugifyTitle('Buat Aplikasi Desktop Tauri!')).toBe('buat-aplikasi-desktop-tauri');
  });
  test('fallback kosong', () => {
    expect(slugifyTitle('   ')).toBe('proyek');
  });
});

describe('csv', () => {
  test('escape ; dan kutip', () => {
    expect(csvCell('a;b')).toBe('"a;b"');
    expect(csvCell('kata "penting"')).toBe('"kata ""penting"""');
  });
  test('budget csv: BOM, delimiter, TOTAL', () => {
    const csv = buildBudgetCsv([{ item: 'Kopi; tim', qty: 2, unit: 'gelas', price: 15000, note: '' }]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('"Kopi; tim";2;gelas;15000;30000;');
    expect(csv).toContain('TOTAL;;;;30000;Dalam Rupiah');
  });
});

describe('report & memo', () => {
  test('report memuat 5 divisi + ACC + QA', () => {
    const md = buildReportMd(project, { timeLabel: '10:30', sourceLabel: 'LLM', fileList: ['laporan.md'] });
    expect(md).toContain('# Buat Aplikasi Desktop Tauri');
    expect(md).toContain('IT & Engineering — Rencana Teknis');
    expect(md).toContain('General Affairs — Logistik');
    expect(md).toContain('Menunggu ACC Direktur');
    expect(md).toContain('Salsa');
  });
  test('late memuat disclaimer', () => {
    const md = buildReportMd(project, { late: true, fileList: [] });
    expect(md).toContain('DIKEJAR DEADLINE');
  });
  test('memo berkop', () => {
    const md = buildMemoMd(project, { subject: 'Dukungan', body: 'Isi memo', closing: 'Salam' }, { timeLabel: '09:00' });
    expect(md).toContain('PT PIXEL SINERGI NUSANTARA Tbk');
    expect(md).toContain('MEMORANDUM INTERNAL');
    expect(md).toContain('Perihal: Dukungan');
  });
  test('caption + hashtag', () => {
    const txt = buildCaptionTxt({ caption: 'Halo', poster: { hashtags: ['#a', '#b'] } });
    expect(txt).toBe('Halo\n\n#a #b\n');
  });
});
