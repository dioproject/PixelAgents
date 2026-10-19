// ============================================================
// projects.js — Tugas Proyek: brief Direktur → paket deliverable nyata
// Alur: start → update (progres menit kantor) → complete (konten + kode)
//       → render poster → simpan paket ke disk → arsip + modal.
// ============================================================

import { bus } from '../core/bus.js';
import { uid, formatGameTime } from '../core/utils.js';
import { isTauri, getInvoke, isLlmReady } from '../core/config.js';
import { chat } from '../llm/client.js';
import { buildProjectContentPrompt, buildProjectCodePrompt, parseProjectContent, parseProjectCode } from '../llm/prompts.js';
import { projectContentFallback } from '../llm/fallback.js';
import {
  slugifyTitle, buildReportMd, buildCaptionTxt, buildBudgetCsv, buildMemoMd, buildGaChecklistCsv,
} from '../artifacts/files.js';
import { normalizeCodeFiles, pickFallbackTemplate, withGuaranteedReadme } from '../artifacts/code.js';
import { TEMPLATES } from '../artifacts/templates.js';
import { renderPoster, renderAppIcon } from '../artifacts/poster.js';
import { DIVISIONS } from '../world/office.js';

export const DIVISION_ORDER = ['it', 'marketing', 'finance', 'hrd', 'ga'];
const MILESTONE_PCT = { it: 20, marketing: 36, finance: 52, hrd: 68, ga: 84 };
const DURATION_MIN_RANGE = [20, 40];
const SOURCE_LABEL = { llm: 'LLM', mixed: 'LLM + Template', template: 'Template offline' };

const dateStamp = () => new Date().toISOString().slice(0, 10);
const stripDataUrl = (s) => String(s || '').split(',')[1] || '';
const textBytes = (s) => new TextEncoder().encode(s).length;

function downloadBlob(name, content, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = String(name).split('/').pop() || 'file.txt';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function downloadBase64(name, base64, mime = 'image/png') {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  downloadBlob(name, bytes, mime);
}

/**
 * Gabungkan hasil parsial LLM dengan bank fallback. Murni — ada unit test.
 * @returns {{ value: object, source: 'llm'|'mixed'|'template' }}
 */
export function mergeProjectContent(parsed, fallback) {
  const value = JSON.parse(JSON.stringify(fallback));
  const clean = (s, max) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
  let parts = 0;

  if (parsed && Array.isArray(parsed.sections)) {
    let ok = 0;
    for (const item of parsed.sections) {
      const division = DIVISION_ORDER.find((d) => d === item?.division);
      if (!division) continue;
      const text = clean(item.text, 350);
      if (!text) continue;
      const title = clean(item.title, 60)
        || value.sections.find((s) => s.division === division)?.title
        || DIVISIONS[division]?.name
        || division;
      value.sections = value.sections.map((s) => (s.division === division ? { division, title, text } : s));
      ok += 1;
    }
    if (ok >= 3) parts += 1;
  }

  if (parsed?.poster && clean(parsed.poster.headline, 24)) {
    value.poster.headline = clean(parsed.poster.headline, 24);
    const tagline = clean(parsed.poster.tagline, 60);
    if (tagline) value.poster.tagline = tagline;
    const tags = (Array.isArray(parsed.poster.hashtags) ? parsed.poster.hashtags : [])
      .map((t) => clean(t, 24))
      .filter(Boolean)
      .map((t) => (t.startsWith('#') ? t : `#${t}`))
      .slice(0, 3);
    if (tags.length) value.poster.hashtags = tags;
    parts += 1;
  }

  if (clean(parsed?.caption, 240)) {
    value.caption = clean(parsed.caption, 240);
    parts += 1;
  }

  const budget = Array.isArray(parsed?.budget)
    ? parsed.budget.slice(0, 8).map((r) => ({
      item: clean(r?.item, 80) || 'Item',
      qty: Math.max(1, Math.round(Number(r?.qty) || 1)),
      unit: clean(r?.unit, 16) || 'pcs',
      price: Math.max(0, Math.round(Number(r?.price) || 0)),
      note: clean(r?.note, 80),
    }))
    : [];
  if (budget.length >= 3) {
    value.budget = budget;
    parts += 1;
  }

  const ga = Array.isArray(parsed?.ga)
    ? parsed.ga.slice(0, 8).map((r) => ({
      category: clean(r?.category, 40) || 'Umum',
      item: clean(r?.item, 80) || 'Item',
      qty: Math.max(1, Math.round(Number(r?.qty) || 1)),
      owner: clean(r?.owner, 40) || 'GA',
      status: clean(r?.status, 24) || 'proses',
    }))
    : [];
  if (ga.length >= 3) {
    value.ga = ga;
    parts += 1;
  }

  if (parsed?.memo && clean(parsed.memo.body, 400)) {
    value.memo = {
      subject: clean(parsed.memo.subject, 80) || value.memo.subject,
      body: clean(parsed.memo.body, 400),
      closing: clean(parsed.memo.closing, 120) || value.memo.closing,
    };
    parts += 1;
  }

  const source = parts === 0 ? 'template' : parts >= 6 ? 'llm' : 'mixed';
  return { value, source };
}

export class ProjectManager {
  constructor(sim) {
    this.sim = sim;
    this.active = null;
    this.archive = [];
  }

  get isActive() {
    return !!this.active;
  }

  /** Dipakai behavior & HUD: label fokus proyek. */
  get focusLabel() {
    return this.active ? `Fokus proyek: ${this.active.title}` : '';
  }

  /**
   * Mulai proyek dari brief. @returns {boolean} false bila ditolak.
   * (Teks konfirmasi/penolakan ditampilkan lewat toast/feed.)
   */
  start(brief) {
    const sim = this.sim;
    const title = String(brief || '').replace(/\s+/g, ' ').trim().slice(0, 160);
    if (title.length < 8) return false;
    if (this.isActive) {
      sim.toast(`📋 Masih ada proyek "${this.active.title}" yang dikerjakan, Pak.`, 'danger', 4200);
      return false;
    }

    const [lo, hi] = DURATION_MIN_RANGE;
    const durationMin = lo + Math.floor(Math.random() * (hi - lo + 1));
    const project = {
      id: uid('prj'),
      title,
      day: sim.clock.day,
      startedAtMin: sim.clock.timeMin,
      durationMin,
      elapsedMin: 0,
      milestones: Object.fromEntries(
        DIVISION_ORDER.map((d) => [d, { done: false, atPct: MILESTONE_PCT[d] }]),
      ),
      status: 'running',
      content: null,
      contentSource: null,
      code: null,
      source: null,
      posterDataUrl: null,
      iconDataUrl: null,
      files: [],
      textFiles: [],
      folderName: `${dateStamp()} - Hari ${sim.clock.day} - ${slugifyTitle(title)}`,
      folderPath: null,
      finishedAtMin: null,
      _late: false,
      _token: null,
      _statsCounted: false,
      _completing: false,
    };
    this.active = project;

    sim.feed.add({
      channel: 'proyek',
      text: `📋 PROYEK DIMULAI: "${title}" — target ${durationMin} menit kantor. Semua divisi turun tangan.`,
      meta: { project: true },
    });
    sim.sfx?.chime();
    sim.toast('📋 Proyek dimulai! Semua divisi sibuk (terlihat).', 'success', 5200);
    bus.emit('project:start', project);

    this.focusEveryone(project);
    return true;
  }

  focusEveryone(project) {
    const sim = this.sim;
    for (const agent of sim.agents) {
      if (agent.isStatic || agent.gone) continue;
      if (['chat', 'meeting', 'coffee'].includes(agent.activity?.type)) continue;
      sim.behavior?.goWork(agent, `Fokus proyek: ${project.title}`);
    }
  }

  releaseFocus() {
    const sim = this.sim;
    for (const agent of sim.agents) {
      if (agent.isStatic || agent.gone) continue;
      if (String(agent.activity?.label || '').startsWith('Fokus proyek')) {
        sim.behavior?.goWork(agent, 'Balik kerja (proyek selesai)');
      }
    }
  }

  /** Progres & tonggak divisi. @param {number} gameMinutes delta menit kantor. */
  update(gameMinutes) {
    const project = this.active;
    if (!project || project.status !== 'running' || project._completing) return;
    if (!(gameMinutes > 0)) return;

    project.elapsedMin += gameMinutes;
    const pct = Math.min(100, (project.elapsedMin / project.durationMin) * 100);

    for (const division of DIVISION_ORDER) {
      const milestone = project.milestones[division];
      if (!milestone.done && pct >= milestone.atPct) {
        milestone.done = true;
        this.sim.feed.add({
          channel: 'proyek',
          text: `✅ ${DIVISIONS[division]?.name || division}: bagian proyek selesai dikerjakan.`,
          meta: { project: true },
        });
      }
    }

    if (pct >= 100) {
      project._completing = true;
      void this.complete(project);
    }
  }

  /** Dipanggil `endDay()`: proyek belum kelar → dikejar deadline (template + disclaimer). */
  finalizeLate() {
    const project = this.active;
    if (!project || project.status !== 'running') return;
    project._token = Symbol('late'); // batalkan pipeline async yang sedang jalan
    project._completing = true;
    if (!project._statsCounted) {
      project._statsCounted = true;
      this.sim.stats.projects += 1;
      this.sim.stats.projectsToday.push(project.title);
    }
    void this.complete(project, { late: true });
  }

  async complete(project, { late = false } = {}) {
    const sim = this.sim;
    const myToken = Symbol('project-run');
    project._token = myToken;
    project._late = late;
    const alive = () => project._token === myToken;

    try {
      let content;
      let contentSource;
      if (late) {
        content = projectContentFallback(project);
        contentSource = 'template';
      } else {
        const result = await this.generateContent(project);
        if (!alive()) return;
        content = result.value;
        contentSource = result.source;
      }

      let code;
      if (late) {
        code = this.templateCode(project, 'dikejar deadline');
      } else {
        code = await this.generateCode(project);
        if (!alive()) return;
      }

      project.content = content;
      project.contentSource = contentSource;
      project.code = code;
      project.source = contentSource === 'llm' && !code.fallback
        ? 'llm'
        : contentSource === 'template' && code.fallback
          ? 'template'
          : 'mixed';

      try {
        project.posterDataUrl = renderPoster(project).dataUrl;
        project.iconDataUrl = renderAppIcon(project).dataUrl;
      } catch (err) {
        console.warn('[projects] render poster gagal:', err);
      }

      if (!alive()) return;

      project.finishedAtMin = sim.clock.timeMin;
      project.textFiles = this.buildTextFiles(project);
      this.buildManifest(project);

      await this.savePackage(project);
      if (!alive()) return;

      project.status = late ? 'late' : 'done';
      if (!project._statsCounted) {
        project._statsCounted = true;
        sim.stats.projects += 1;
        sim.stats.projectsToday.push(project.title);
      }

      sim.feed.add({
        channel: 'proyek',
        text: `✅ Proyek "${project.title}" selesai — paket tersimpan${project.folderPath ? ` di ${project.folderPath}` : ' (unduhan browser)'}.`,
        meta: { project: true },
      });
      sim.toast(
        project.folderPath
          ? `📦 Paket proyek tersimpan di ${project.folderPath}`
          : '📦 Paket proyek diunduh lewat browser (mode dev).',
        'success',
        7000,
      );
      sim.sfx?.chime();

      this.archive.unshift(project);
      this.active = null;
      bus.emit('project:done', project);
      this.releaseFocus();

      if (sim.modals?.openProject && !sim.modals.current) sim.modals.openProject(project);
      else sim.toast('📄 Hasil proyek bisa dibuka lewat tombol "Lihat Hasil Proyek".', 'info', 5000);
    } catch (err) {
      console.error('[projects] gagal menyelesaikan proyek:', err);
      project._completing = false;
      sim.toast(`❌ Proyek gagal diselesaikan: ${err?.message || err}`, 'danger', 6000);
    }
  }

  /** Pipeline A: konten paket (sections, poster, caption, budget, ga, memo). */
  async generateContent(project) {
    const fallback = projectContentFallback(project);
    if (!isLlmReady()) return { value: fallback, source: 'template' };
    await this.waitForLlmFree();
    const res = await this.withLlmBusy(() => chat(
      buildProjectContentPrompt(this.sim, project),
      { maxTokens: 2000, timeoutSecs: 60 },
    ));
    if (!res.ok) {
      console.warn('[projects] konten LLM gagal, pakai fallback:', res.error);
      return { value: fallback, source: 'template' };
    }
    const parsed = parseProjectContent(res.text);
    if (!parsed) {
      console.warn('[projects] JSON konten tidak terbaca, pakai fallback.');
      return { value: fallback, source: 'template' };
    }
    return mergeProjectContent(parsed, fallback);
  }

  /** Pipeline B: kode proyek (stack + files + run). */
  async generateCode(project) {
    if (!isLlmReady()) return this.templateCode(project);
    await this.waitForLlmFree();
    const res = await this.withLlmBusy(() => chat(
      buildProjectCodePrompt(this.sim, project),
      { maxTokens: 8000, timeoutSecs: 90 },
    ));
    const parsed = res.ok ? parseProjectCode(res.text) : null;
    if (!parsed) {
      console.warn('[projects] kode LLM gagal/tidak terbaca, pakai template:', res.error || 'json tidak valid');
      return this.templateCode(project);
    }
    const { files, dropped } = normalizeCodeFiles(parsed.files);
    if (files.length === 0) return this.templateCode(project);
    return {
      stack: parsed.stack || '',
      run: parsed.run || [],
      files: withGuaranteedReadme(files, project, parsed.run || []),
      fallback: false,
      dropped,
    };
  }

  async waitForLlmFree(timeoutMs = 25000) {
    const conv = this.sim.conversations;
    if (!conv) return;
    const t0 = performance.now();
    while (conv.llmBusy && performance.now() - t0 < timeoutMs) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  async withLlmBusy(fn) {
    const conv = this.sim.conversations;
    if (conv) conv.llmBusy = true;
    try {
      return await fn();
    } finally {
      if (conv) conv.llmBusy = false;
    }
  }

  templateCode(project, reason = '') {
    const key = pickFallbackTemplate(project.title);
    const tpl = TEMPLATES[key];
    const files = withGuaranteedReadme(
      tpl.files.map((f) => ({ ...f, bytes: textBytes(f.content), warn: false, ok: true })),
      project,
      tpl.run,
    );
    return { stack: key, files, run: tpl.run, fallback: true, dropped: 0, reason };
  }

  filePathList(project) {
    return [
      'laporan.md', 'poster.png', 'ikon-app.png',
      'caption-sosmed.txt', 'anggaran.csv', 'memo-sdm.md', 'checklist-ga.csv',
      ...(project.code?.files || []).map((f) => `kode/${f.path}`),
    ];
  }

  buildTextFiles(project) {
    const content = project.content;
    const timeLabel = formatGameTime(project.finishedAtMin ?? this.sim.clock.timeMin);
    const sourceLabel = SOURCE_LABEL[project.source] || SOURCE_LABEL[project.contentSource] || '—';
    const fileList = this.filePathList(project);
    return [
      {
        relPath: 'laporan.md',
        content: buildReportMd(project, {
          timeLabel,
          late: !!project._late,
          sourceLabel,
          fileList,
        }),
      },
      { relPath: 'caption-sosmed.txt', content: buildCaptionTxt(content) },
      { relPath: 'anggaran.csv', content: buildBudgetCsv(content.budget) },
      { relPath: 'memo-sdm.md', content: buildMemoMd(project, content.memo, { timeLabel }) },
      { relPath: 'checklist-ga.csv', content: buildGaChecklistCsv(content.ga) },
    ];
  }

  buildManifest(project) {
    const files = [];
    for (const f of project.textFiles) {
      files.push({ relPath: f.relPath, kind: 'text', bytes: textBytes(f.content), status: 'pending', warn: false });
    }
    files.push({
      relPath: 'poster.png',
      kind: 'binary',
      bytes: Math.round(stripDataUrl(project.posterDataUrl).length * 0.75),
      status: 'pending',
      warn: !project.posterDataUrl,
    });
    files.push({
      relPath: 'ikon-app.png',
      kind: 'binary',
      bytes: Math.round(stripDataUrl(project.iconDataUrl).length * 0.75),
      status: 'pending',
      warn: !project.iconDataUrl,
    });
    for (const f of project.code.files) {
      files.push({
        relPath: `kode/${f.path}`,
        kind: 'text',
        bytes: f.bytes,
        status: 'pending',
        warn: !!f.warn,
      });
    }
    const order = this.filePathList(project);
    files.sort((a, b) => order.indexOf(a.relPath) - order.indexOf(b.relPath));
    project.files = files;
  }

  buildPackagePayload(project) {
    const payload = [];
    for (const f of project.textFiles) {
      payload.push({ rel_path: f.relPath, content: f.content, is_base64: false });
    }
    if (project.posterDataUrl) {
      payload.push({ rel_path: 'poster.png', content: stripDataUrl(project.posterDataUrl), is_base64: true });
    }
    if (project.iconDataUrl) {
      payload.push({ rel_path: 'ikon-app.png', content: stripDataUrl(project.iconDataUrl), is_base64: true });
    }
    for (const f of project.code.files) {
      payload.push({ rel_path: `kode/${f.path}`, content: f.content, is_base64: false });
    }
    return payload;
  }

  async savePackage(project) {
    const payload = this.buildPackagePayload(project);
    const included = new Set(payload.map((f) => f.rel_path));
    for (const m of project.files) {
      if (!included.has(m.relPath)) m.status = 'failed';
    }

    if (isTauri) {
      try {
        const invoke = await getInvoke();
        const result = await invoke('save_project_package', {
          dir_name: project.folderName,
          files: payload,
        });
        project.folderPath = result?.folder || null;
        const saved = new Set(result?.saved || []);
        const failed = new Set(result?.failed || []);
        for (const m of project.files) {
          if (m.status === 'failed') continue;
          m.status = failed.has(m.relPath) ? 'failed' : saved.has(m.relPath) ? 'saved' : 'failed';
        }
        const failCount = project.files.filter((f) => f.status === 'failed').length;
        if (failCount > 0) {
          this.sim.toast(`⚠️ ${failCount} file gagal disimpan. Cek daftar file.`, 'danger', 6000);
        }
      } catch (err) {
        for (const m of project.files) m.status = 'failed';
        this.sim.toast(`❌ Gagal menyimpan paket: ${err?.message || err}`, 'danger', 6000);
      }
    } else {
      for (const f of payload) {
        try {
          if (f.is_base64) downloadBase64(f.rel_path, f.content, 'image/png');
          else downloadBlob(f.rel_path, f.content, 'text/plain');
        } catch (err) {
          console.warn('[projects] unduh gagal:', f.rel_path, err);
        }
      }
      for (const m of project.files) {
        if (m.status !== 'failed') m.status = 'downloaded';
      }
      project.folderPath = null;
      this.sim.toast('📦 Mode browser: paket diunduh sebagai file terpisah.', 'info', 6000);
    }
  }

  async resave(project) {
    if (!project?.files?.length) {
      this.sim.toast('Belum ada paket untuk disimpan.', 'info');
      return;
    }
    await this.savePackage(project);
    if (isTauri) {
      this.sim.toast('💾 Paket disimpan ulang (folder baru versi berikutnya bila sudah ada).', 'success', 5200);
    }
  }

  async openFolder(project) {
    if (!isTauri || !project?.folderPath) {
      this.sim.toast('Folder hanya tersedia di aplikasi desktop.', 'info');
      return;
    }
    try {
      const invoke = await getInvoke();
      await invoke('open_path', { path: project.folderPath });
    } catch (err) {
      this.sim.toast(`❌ Gagal membuka folder: ${err?.message || err}`, 'danger');
    }
  }
}
