// ============================================================
// poster.js — Render poster & ikon paket proyek (canvas → PNG dataURL)
// ============================================================

import { DIVISIONS } from '../world/office.js';

const DIVISION_ORDER = ['it', 'marketing', 'finance', 'hrd', 'ga'];

function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext('2d') };
}

function wrapLines(ctx, text, maxWidth, maxLines) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) break;
    } else {
      line = test;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawPixelGrid(ctx, w, h) {
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#ffffff';
  for (let y = 20; y < h; y += 40) {
    for (let x = 20; x < w; x += 40) {
      if ((x / 40 + y / 40) % 2 === 0) ctx.fillRect(x, y, 6, 6);
    }
  }
  ctx.restore();
}

export function renderPoster(project) {
  const W = 1080;
  const H = 1080;
  const { canvas, ctx } = makeCanvas(W, H);
  const poster = project.content?.poster || {};

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#101828');
  bg.addColorStop(0.6, '#141b2e');
  bg.addColorStop(1, '#231436');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  drawPixelGrid(ctx, W, H);

  ctx.strokeStyle = '#ffc857';
  ctx.lineWidth = 6;
  ctx.strokeRect(28, 28, W - 56, H - 56);

  ctx.fillStyle = '#ffc857';
  ctx.fillRect(34, 34, W - 68, 72);
  ctx.fillStyle = '#14151f';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 30px "Courier New", monospace';
  ctx.fillText('PT PIXEL SINERGI NUSANTARA Tbk', 54, 71);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 84px "Courier New", monospace';
  const headLines = wrapLines(ctx, poster.headline || project.title, W - 160, 3);
  let y = 300;
  for (const line of headLines) {
    ctx.fillText(line, W / 2, y);
    y += 104;
  }

  ctx.fillStyle = '#9fb0d8';
  ctx.font = '36px "Courier New", monospace';
  const tagLines = wrapLines(ctx, poster.tagline || '', W - 220, 2);
  y += 24;
  for (const line of tagLines) {
    ctx.fillText(line, W / 2, y);
    y += 50;
  }

  const chipW = 168;
  const chipGap = 18;
  const totalW = DIVISION_ORDER.length * chipW + (DIVISION_ORDER.length - 1) * chipGap;
  let cx = (W - totalW) / 2;
  const chipY = H - 320;
  for (const division of DIVISION_ORDER) {
    ctx.fillStyle = DIVISIONS[division]?.color || '#ffc857';
    ctx.fillRect(cx, chipY, chipW, 56);
    ctx.fillStyle = '#14151f';
    ctx.font = 'bold 22px "Courier New", monospace';
    ctx.fillText(DIVISIONS[division]?.short || division, cx + chipW / 2, chipY + 30);
    cx += chipW + chipGap;
  }

  ctx.fillStyle = '#ffc857';
  ctx.font = 'bold 42px "Courier New", monospace';
  ctx.fillText(`HARI ${project.day ?? 1} — DIKERJAKAN SELURUH DIVISI`, W / 2, H - 180);

  ctx.fillStyle = '#8fa0c8';
  ctx.font = '30px "Courier New", monospace';
  ctx.fillText((poster.hashtags || []).join('   '), W / 2, H - 110);

  return { dataUrl: canvas.toDataURL('image/png'), width: W, height: H };
}

export function renderAppIcon(project) {
  const S = 512;
  const { canvas, ctx } = makeCanvas(S, S);

  const bg = ctx.createLinearGradient(0, 0, S, S);
  bg.addColorStop(0, '#1a2138');
  bg.addColorStop(1, '#2a1a40');
  ctx.fillStyle = bg;
  roundRectPath(ctx, 0, 0, S, S, 96);
  ctx.fill();

  ctx.strokeStyle = '#ffc857';
  ctx.lineWidth = 14;
  roundRectPath(ctx, 26, 26, S - 52, S - 52, 72);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffc857';
  ctx.font = 'bold 150px "Courier New", monospace';
  ctx.fillText('PSN', S / 2, S / 2 - 46);

  ctx.fillStyle = '#9fb0d8';
  ctx.font = 'bold 40px "Courier New", monospace';
  const label = String(project.content?.poster?.headline || project.title || 'Proyek').slice(0, 14);
  ctx.fillText(label, S / 2, S / 2 + 110);

  return { dataUrl: canvas.toDataURL('image/png'), width: S, height: S };
}
