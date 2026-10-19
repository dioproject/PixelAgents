// ============================================================
// camera.js — Kamera CCTV: pan, zoom, smooth follow
// ============================================================

import { clamp, lerp } from '../core/utils.js';

export class Camera {
  constructor({ worldW, worldH, zoom = 2 }) {
    this.worldW = worldW;
    this.worldH = worldH;
    this.x = 0;            // kiri-atas viewport dalam koordinat dunia (pixel)
    this.y = 0;
    this.zoom = zoom;      // zoom integer 1-4 (pixel art tetap tajam)
    this.targetZoom = zoom;
    this.vw = 800;
    this.vh = 600;
    this.follow = null;    // {x, y} titik dunia yang ingin di-center
    this.followStrength = 6;
  }

  setViewport(w, h) {
    this.vw = w;
    this.vh = h;
    this.clampPos();
  }

  get viewW() { return this.vw / this.zoom; }
  get viewH() { return this.vh / this.zoom; }

  clampPos() {
    const maxX = this.worldW - this.viewW;
    const maxY = this.worldH - this.viewH;
    // jika dunia lebih kecil dari viewport → pusatkan
    this.x = maxX <= 0 ? maxX / 2 : clamp(this.x, 0, maxX);
    this.y = maxY <= 0 ? maxY / 2 : clamp(this.y, 0, maxY);
  }

  setZoom(z) {
    const center = this.screenCenterWorld();
    this.targetZoom = clamp(Math.round(z), 1, 4);
    this.zoom = this.targetZoom;
    this.centerOn(center.x, center.y);
  }

  zoomIn() { this.setZoom(this.zoom + 1); }
  zoomOut() { this.setZoom(this.zoom - 1); }

  screenCenterWorld() {
    return { x: this.x + this.viewW / 2, y: this.y + this.viewH / 2 };
  }

  centerOn(wx, wy) {
    this.follow = { x: wx, y: wy };
    this.x = wx - this.viewW / 2;
    this.y = wy - this.viewH / 2;
    this.clampPos();
  }

  /** Focus dengan animasi halus (dipakai CCTV navigator) */
  focusOn(wx, wy, zoomLevel) {
    if (zoomLevel) {
      this.targetZoom = clamp(Math.round(zoomLevel), 1, 4);
      this.zoom = this.targetZoom;
    }
    this.follow = { x: wx, y: wy };
  }

  panByScreen(dx, dy) {
    this.follow = null;
    this.x -= dx / this.zoom;
    this.y -= dy / this.zoom;
    this.clampPos();
  }

  worldToScreen(wx, wy) {
    return { x: (wx - this.x) * this.zoom, y: (wy - this.y) * this.zoom };
  }

  screenToWorld(sx, sy) {
    return { x: this.x + sx / this.zoom, y: this.y + sy / this.zoom };
  }

  update(dtMs) {
    if (this.follow) {
      const t = clamp((dtMs / 1000) * this.followStrength, 0, 1);
      const cx = this.x + this.viewW / 2;
      const cy = this.y + this.viewH / 2;
      this.x = lerp(cx, this.follow.x, t) - this.viewW / 2;
      this.y = lerp(cy, this.follow.y, t) - this.viewH / 2;
      if (Math.abs(this.x + this.viewW / 2 - this.follow.x) < 1) {
        // sudah dekat, cukup berhenti tanpa mengubah follow (biar tidak jitter)
      }
      this.clampPos();
    }
  }
}
