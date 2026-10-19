// ============================================================
// modals.js — Settings LLM, Titah Direksi, Tentang, Laporan Harian
// ============================================================

import { getSettings, saveSettings } from '../core/config.js';
import { testConnection } from '../llm/client.js';
import { DIRECTIVE_PRESETS } from '../agents/directives.js';
import { escapeHtml, formatGameTime } from '../core/utils.js';

function kpi(label, value, icon) {
  return `
    <div class="report-kpi">
      <div class="report-kpi-icon">${icon}</div>
      <div>
        <strong>${value}</strong>
        <span>${label}</span>
      </div>
    </div>`;
}

function reportBar(label, value, color) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return `
    <div class="stat-row">
      <span class="stat-label">${label}</span>
      <div class="stat-bar"><div class="stat-fill" style="width:${pct}%;background:${color}"></div></div>
      <span class="stat-value">${Math.round(pct)}</span>
    </div>`;
}

export class Modals {
  constructor(sim) {
    this.sim = sim;
    this.root = document.getElementById('modal-root');
    this.current = null;
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.current) {
        e.preventDefault();
        this.close();
      }
    });
  }

  open(html) {
    if (!this.root) return null;
    this.close();
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = html;
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) this.close();
    });
    this.root.appendChild(backdrop);
    this.current = backdrop;
    return backdrop;
  }

  close() {
    if (!this.root) return;
    this.root.innerHTML = '';
    this.current = null;
  }

  // ==========================================================
  // Settings
  // ==========================================================

  openSettings() {
    const s = getSettings();
    const modal = this.open(`
      <div class="modal" role="dialog" aria-modal="true" aria-label="Pengaturan">
        <div class="modal-head">
          <h2>⚙️ Pengaturan LLM & Simulasi</h2>
          <button class="btn tiny-btn modal-x" data-close type="button">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <label for="set-base">Base URL (OpenAI-compatible)</label>
            <input id="set-base" type="text" spellcheck="false" value="${escapeHtml(s.baseUrl)}" placeholder="https://9router.contoh.com/v1" />
            <span class="hint">Otomatis menambahkan <code>/chat/completions</code> bila belum ada. Contoh Ollama: <code>http://localhost:11434/v1</code></span>
          </div>

          <div class="form-row">
            <label for="set-key">API Key</label>
            <input id="set-key" type="password" spellcheck="false" value="${escapeHtml(s.apiKey)}" placeholder="sk-... / kosongkan untuk endpoint lokal" />
            <span class="hint">Disimpan lokal di config app. Tidak pernah dikirim ke mana pun selain endpoint Anda.</span>
          </div>

          <div class="form-grid">
            <div class="form-row">
              <label for="set-model">Model</label>
              <input id="set-model" type="text" spellcheck="false" value="${escapeHtml(s.model)}" placeholder="gpt-4o-mini" />
            </div>
            <div class="form-row">
              <label for="set-timeout">Timeout (detik)</label>
              <input id="set-timeout" type="number" min="5" max="120" step="1" value="${Number(s.timeoutSecs) || 45}" />
            </div>
          </div>

          <div class="form-grid">
            <div class="form-row">
              <label for="set-temp">Temperature</label>
              <input id="set-temp" type="number" min="0" max="2" step="0.1" value="${Number(s.temperature) || 0.9}" />
            </div>
            <div class="form-row">
              <label for="set-maxtok">Max Tokens</label>
              <input id="set-maxtok" type="number" min="60" max="2000" step="20" value="${Number(s.maxTokens) || 400}" />
            </div>
          </div>

          <div class="switch-row">
            <input id="set-offline" type="checkbox" ${s.offlineMode ? 'checked' : ''} />
            <label for="set-offline">Mode offline — paksa dialog prosedural (simulasi tetap hidup)</label>
          </div>
          <div class="switch-row">
            <input id="set-sound" type="checkbox" ${s.soundEnabled ? 'checked' : ''} />
            <label for="set-sound">Efek suara chiptune</label>
          </div>
          <div class="switch-row">
            <input id="set-bubbles" type="checkbox" ${s.showBubbles ? 'checked' : ''} />
            <label for="set-bubbles">Tampilkan balon kata di atas karyawan</label>
          </div>

          <div class="form-row" style="max-width:220px">
            <label for="set-speed">Kecepatan waktu default</label>
            <select id="set-speed" class="select">
              ${[1, 2, 4, 8, 16].map((v) => `<option value="${v}" ${Number(s.defaultSpeed) === v ? 'selected' : ''}>${v}x</option>`).join('')}
            </select>
          </div>

          <div id="test-result" class="test-result" style="display:none"></div>
        </div>
        <div class="modal-foot">
          <div style="margin-right:auto">
            <button id="btn-test" class="btn" type="button">🔌 Test Koneksi</button>
          </div>
          <button class="btn" data-close type="button">Batal</button>
          <button id="btn-save" class="btn gold-btn" type="button">💾 Simpan</button>
        </div>
      </div>
    `);
    if (!modal) return;

    const $ = (id) => modal.querySelector(`#${id}`);
    const base = $('set-base');
    const key = $('set-key');
    const model = $('set-model');
    const timeout = $('set-timeout');
    const temp = $('set-temp');
    const maxTok = $('set-maxtok');
    const offline = $('set-offline');
    const sound = $('set-sound');
    const bubbles = $('set-bubbles');
    const speed = $('set-speed');
    const testResult = $('test-result');
    const testBtn = $('btn-test');

    const collect = () => ({
      baseUrl: base.value.trim(),
      apiKey: key.value.trim(),
      model: model.value.trim(),
      temperature: Math.max(0, Math.min(2, Number(temp.value) || 0.9)),
      maxTokens: Math.max(60, Math.min(2000, Number(maxTok.value) || 400)),
      timeoutSecs: Math.max(5, Math.min(120, Number(timeout.value) || 45)),
      offlineMode: offline.checked,
      soundEnabled: sound.checked,
      showBubbles: bubbles.checked,
      defaultSpeed: Number(speed.value) || 2,
    });

    modal.querySelectorAll('[data-close]').forEach((btn) => {
      btn.addEventListener('click', () => this.close());
    });

    testBtn.addEventListener('click', async () => {
      const cfg = collect();
      testResult.style.display = 'block';
      testResult.className = 'test-result';
      testResult.textContent = '⏳ Menguji koneksi ke endpoint…';
      testBtn.disabled = true;
      const res = await testConnection({
        baseUrl: cfg.baseUrl,
        apiKey: cfg.apiKey,
        model: cfg.model,
        temperature: cfg.temperature,
        timeoutSecs: cfg.timeoutSecs,
      });
      testResult.classList.add(res.ok ? 'ok' : 'err');
      testResult.textContent = res.message;
      testBtn.disabled = false;
    });

    $('btn-save').addEventListener('click', async () => {
      const patch = collect();
      await saveSettings(patch);
      this.sim.sfx?.setEnabled(patch.soundEnabled);
      if (!patch.showBubbles) this.sim.bubbles?.clear();
      this.sim.clock.setSpeed(patch.defaultSpeed);
      if (this.sim.hud) {
        this.sim.hud.speedSelect.value = String(patch.defaultSpeed);
        this.sim.hud.syncPause();
      }
      this.sim.toast?.('💾 Pengaturan disimpan. Perubahan LLM berlaku pada percakapan berikutnya.', 'success');
      this.close();
    });

    setTimeout(() => base.focus(), 50);
  }

  // ==========================================================
  // Titah Direksi
  // ==========================================================

  openDirective() {
    const cards = DIRECTIVE_PRESETS.map((p) => `
      <button class="directive-card${p.type === 'rapat' ? ' active' : ''}" data-type="${p.type}" type="button">
        <strong>${p.icon} ${escapeHtml(p.title)}</strong>
        <small>${escapeHtml(p.desc)}</small>
      </button>
    `).join('');

    const modal = this.open(`
      <div class="modal" role="dialog" aria-modal="true" aria-label="Titah Direksi">
        <div class="modal-head">
          <h2>📜 Titah Direksi</h2>
          <button class="btn tiny-btn modal-x" data-close type="button">✕</button>
        </div>
        <div class="modal-body">
          <div class="hint" style="font-size:11.5px;color:var(--text-dim)">
            Pilih perintah. Bawahan akan merespons dengan bahasa <b>formal</b>, lalu bergosip dengan gaya <b>gaul</b> setelahnya.
          </div>
          <div class="directive-grid">${cards}</div>

          <div class="form-row">
            <label for="dir-custom">Atau tulis titah custom (opsional)</label>
            <textarea id="dir-custom" rows="3" maxlength="160" placeholder="Contoh: Besok semua divisi presentasi pakai kostum superhero…"></textarea>
            <span class="hint">Maks 160 karakter. Jika diisi, titah custom dipakai dan pilihan kartu diabaikan.</span>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn" data-close type="button">Batal</button>
          <button id="btn-directive-send" class="btn gold-btn" type="button">📜 Kirim Titah</button>
        </div>
      </div>
    `);
    if (!modal) return;

    let selected = 'rapat';
    const cardsEl = [...modal.querySelectorAll('.directive-card')];
    const setSelected = (btn) => {
      selected = btn.dataset.type || 'rapat';
      for (const c of cardsEl) {
        c.classList.toggle('active', c === btn);
        c.style.borderColor = c === btn ? 'var(--accent)' : '';
      }
    };
    for (const card of cardsEl) {
      card.addEventListener('click', () => setSelected(card));
    }

    modal.querySelectorAll('[data-close]').forEach((btn) => {
      btn.addEventListener('click', () => this.close());
    });

    modal.querySelector('#btn-directive-send').addEventListener('click', () => {
      const custom = modal.querySelector('#dir-custom').value.trim();
      if (custom.length >= 3) {
        this.sim.directives.send('custom', custom);
      } else {
        this.sim.directives.send(selected);
      }
      this.close();
    });

    setTimeout(() => modal.querySelector('#dir-custom').focus(), 50);
  }

  // ==========================================================
  // Tentang / Help
  // ==========================================================

  openAbout() {
    const modal = this.open(`
      <div class="modal" role="dialog" aria-modal="true" aria-label="Tentang">
        <div class="modal-head">
          <h2>❓ PT Pixel Sinergi Nusantara Tbk</h2>
          <button class="btn tiny-btn modal-x" data-close type="button">✕</button>
        </div>
        <div class="modal-body about-block">
          <p><b>v0.1.0 — CEO Dashboard / God Mode.</b> Simulasi kantor pixel dengan 10 karyawan AI yang punya rutinitas, kepribadian, dan drama sendiri.</p>

          <p><b>Kontrol</b></p>
          <ul>
            <li><b>Drag</b> kanvas untuk pan CCTV, <b>scroll</b> untuk zoom (1x–4x).</li>
            <li><b>Klik karyawan</b> (di kanvas, feed, atau daftar) untuk inspeksi & fokus kamera.</li>
            <li><b>Space</b> untuk jeda / lanjut. Kecepatan waktu 1x–16x di topbar.</li>
            <li><b>📜 Titah Direksi</b> untuk memprovokasi kantor. Bawahan balas formal, lalu gosip informal.</li>
          </ul>

          <p><b>LLM fleksibel</b></p>
          <p>Buka <code>⚙️</code> untuk Base URL, API Key, dan Model. Semua endpoint OpenAI-compatible bisa dipakai (9router, OpenRouter, Ollama, LM Studio, dsb.). Di Tauri request diproxy Rust agar bebas CORS; di browser memakai fetch langsung.</p>
          <p>Tanpa API — atau jika endpoint error/timeout — simulasi otomatis memakai bank dialog prosedural. <b>Tidak pernah mati.</b></p>

          <p><b>Insiden yang mungkin terjadi:</b> keceplosan chat ke Direktur, perang AC, reimburse ditolak, printer nyangkut, reminder KPI, ulang tahun, dan BSOD. Semua tercatat di Live Office Feed.</p>

          <p style="opacity:0.7">Dibuat dengan Tauri 2 + Vite + Vanilla JS. Semua nama, divisi, dan drama adalah fiksi. Kemiripan dengan kantor Anda mungkin disengaja.</p>
        </div>
        <div class="modal-foot">
          <button class="btn gold-btn" data-close type="button">Siap, Pak Direktur</button>
        </div>
      </div>
    `);
    if (!modal) return;
    modal.querySelectorAll('[data-close]').forEach((btn) => {
      btn.addEventListener('click', () => this.close());
    });
  }

  // ==========================================================
  // Laporan Harian
  // ==========================================================

  openReport(report) {
    const sim = this.sim;
    const r = report || sim.lastReport || sim.buildReport?.() || null;
    if (!r) {
      sim.toast?.('Belum ada data laporan.', 'info');
      return;
    }

    const c = r.counters || {};
    const notable = (r.notable || []).map((n) => `
      <div class="report-note">
        <span class="feed-time">${escapeHtml(n.time || '')}</span>
        <b>${escapeHtml(n.from || 'Sistem')}</b>
        <span>${escapeHtml(n.text || '')}</span>
      </div>
    `).join('') || '<div class="hint" style="color:var(--text-dim);font-size:11px">Belum ada catatan penting.</div>';

    const chatty = (r.topChatty || []).filter((x) => x.count > 0).map((x) => `
      <div class="report-line"><span>${escapeHtml(x.name)}</span><b>${x.count} obrolan</b></div>
    `).join('') || '<div class="hint" style="color:var(--text-dim);font-size:11px">Belum ada yang menonjol. Semua sibuk pura-pura kerja.</div>';

    const stressed = (r.topStress || []).map((x) => `
      <div class="report-line"><span>${escapeHtml(x.name)}</span><b style="color:#ff9a9a">${Math.round(x.stress)} stress</b></div>
    `).join('') || '';

    const modal = this.open(`
      <div class="modal" role="dialog" aria-modal="true" aria-label="Laporan Harian">
        <div class="modal-head">
          <h2>📋 Laporan Harian — Hari ${r.day}${r.live ? ' (live)' : ''}</h2>
          <button class="btn tiny-btn modal-x" data-close type="button">✕</button>
        </div>
        <div class="modal-body">
          <div class="hint" style="font-size:11.5px;color:var(--text-dim)">
            ${r.live
              ? 'Ringkasan hari ini yang masih berjalan. Laporan final muncul otomatis saat kantor tutup (18:00).'
              : `Kantor tutup pukul ${escapeHtml(r.closedAt || '18:00')}. Ini rekap yang akan diarsipkan HRD (tanpa cap basah).`}
          </div>

          <div class="report-grid">
            ${kpi('Obrolan', c.conversations ?? 0, '💬')}
            ${kpi('Kopi', c.coffee ?? 0, '☕')}
            ${kpi('Insiden', c.incidents ?? 0, '🚨')}
            ${kpi('Titah', c.directives ?? 0, '📜')}
          </div>

          <div>
            <div class="panel-title" style="margin-bottom:6px">🌡️ Kondisi Kantor</div>
            ${reportBar('Mood rata-rata', r.avgMood ?? 0, 'linear-gradient(90deg,#38a169,#7ee787)')}
            ${reportBar('Stress rata-rata', r.avgStress ?? 0, 'linear-gradient(90deg,#c53030,#ff6b6b)')}
          </div>

          <div class="report-cols">
            <div>
              <div class="panel-title" style="margin-bottom:6px">🗣️ Paling Banyak Ngobrol</div>
              ${chatty}
            </div>
            <div>
              <div class="panel-title" style="margin-bottom:6px">😵 Paling Stress</div>
              ${stressed || '<div class="hint" style="color:var(--text-dim);font-size:11px">Tidak ada. Mencurigakan.</div>'}
            </div>
          </div>

          <div>
            <div class="panel-title" style="margin-bottom:6px">📌 Catatan Penting</div>
            <div class="report-notes">${notable}</div>
          </div>

          ${r.lastDirective ? `
            <div class="test-result">
              <b>Titah terakhir:</b> “${escapeHtml(r.lastDirective.text)}”
              ${r.lastDirective.atMin != null ? `<span style="opacity:0.6"> · ${formatGameTime(r.lastDirective.atMin)}</span>` : ''}
            </div>` : ''}
        </div>
        <div class="modal-foot">
          <button class="btn gold-btn" data-close type="button">Tutup Laporan</button>
        </div>
      </div>
    `);
    if (!modal) return;
    modal.querySelectorAll('[data-close]').forEach((btn) => {
      btn.addEventListener('click', () => this.close());
    });
  }
}
