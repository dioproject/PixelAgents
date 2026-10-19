// ============================================================
// files.js — Builder artefak teks paket proyek (murni, tanpa DOM)
// ============================================================

import { DIVISIONS } from '../world/office.js';

const DIVISION_ORDER = ['it', 'marketing', 'finance', 'hrd', 'ga'];

export function slugifyTitle(title) {
  const slug = String(title || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || 'proyek';
}

export function csvCell(value) {
  const s = String(value ?? '').replace(/[\r\n\t]+/g, ' ').trim();
  if (s.includes(';') || s.includes('"')) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

export function buildCsv(headers, rows) {
  const lines = [headers, ...rows].map((row) => row.map(csvCell).join(';'));
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

export function buildBudgetCsv(rows) {
  const body = [];
  let total = 0;
  for (const row of rows) {
    const qty = Math.max(1, Math.round(Number(row.qty) || 1));
    const price = Math.max(0, Math.round(Number(row.price) || 0));
    const sum = qty * price;
    total += sum;
    body.push([row.item, qty, row.unit || 'pcs', price, sum, row.note || '']);
  }
  body.push(['TOTAL', '', '', '', total, 'Dalam Rupiah']);
  return buildCsv(['Item', 'Qty', 'Satuan', 'Harga Satuan', 'Total', 'Catatan'], body);
}

export function buildGaChecklistCsv(rows) {
  const body = rows.map((row) => [
    row.category || 'Umum',
    row.item,
    Math.max(1, Math.round(Number(row.qty) || 1)),
    row.owner || 'GA',
    row.status || 'proses',
  ]);
  return buildCsv(['Kategori', 'Item', 'Qty', 'PIC', 'Status'], body);
}

export function buildCaptionTxt(content) {
  const tags = (content?.poster?.hashtags || []).join(' ');
  return `${content?.caption || ''}\n\n${tags}\n`;
}

export function buildMemoMd(project, memo, { timeLabel = '09:00' } = {}) {
  return [
    'PT PIXEL SINERGI NUSANTARA Tbk',
    'MEMORANDUM INTERNAL',
    `No: HRD-${project.day}/${project.id.slice(-4).toUpperCase()}`,
    '',
    'Kepada : Seluruh Karyawan',
    'Dari   : Bu Maya — HR Manager',
    `Perihal: ${memo.subject}`,
    `Waktu  : Hari ${project.day}, ${timeLabel} WIB`,
    '',
    memo.body,
    '',
    memo.closing || 'Demikian disampaikan. Mohon kerja samanya ya, bestie :)',
    '',
    'Bu Maya — HR Manager',
    'PT Pixel Sinergi Nusantara Tbk',
    '',
  ].join('\n');
}

export function buildReportMd(project, { timeLabel = '18:00', late = false, sourceLabel = '—', fileList = [] } = {}) {
  const lines = [];
  lines.push(`# ${project.title}`);
  lines.push('');
  lines.push(`Proyek internal · Hari ${project.day} · ${timeLabel} WIB`);
  lines.push(`Sumber konten: ${sourceLabel}`);
  if (late) lines.push('Status: DIKEJAR DEADLINE — sebagian bagian belum matang, tetap dilaporkan selesai.');
  lines.push('');
  for (const division of DIVISION_ORDER) {
    const section = (project.content?.sections || []).find((s) => s.division === division);
    if (!section) continue;
    lines.push(`## ${DIVISIONS[division]?.name || division} — ${section.title}`);
    lines.push(section.text);
    lines.push('');
  }
  lines.push('## Status');
  lines.push('Menunggu ACC Direktur.');
  if (late) {
    lines.push('');
    lines.push('> Catatan: proyek dikejar deadline kantor. Sebagian bagian belum matang namun tetap dilaporkan selesai. (Budaya perusahaan, bukan bug.)');
  }
  lines.push('');
  lines.push('## Lampiran Paket');
  const list = fileList.length ? fileList : (project.files || []).map((f) => f.relPath);
  for (const relPath of list) lines.push(`- ${relPath}`);
  lines.push('');
  lines.push('## Catatan QA');
  lines.push(`Kode di folder kode/ ${project.code?.fallback ? 'berasal dari kerangka bawaan (mode offline/template)' : 'dihasilkan AI'} dan belum diuji otomatis. Silakan buka README, jalankan, lalu review sebelum dipakai. — Salsa (QA)`);
  lines.push('');
  return lines.join('\n');
}
