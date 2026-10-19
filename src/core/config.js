// ============================================================
// config.js — Pengaturan aplikasi (persist)
// Tauri: config.json di app config dir (via Rust command)
// Browser: localStorage
// ============================================================

import { bus } from './bus.js';

export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

let invokeFn = null;
export async function getInvoke() {
  if (!isTauri) return null;
  if (!invokeFn) {
    const mod = await import('@tauri-apps/api/core');
    invokeFn = mod.invoke;
  }
  return invokeFn;
}

export const DEFAULT_SETTINGS = {
  baseUrl: '',
  apiKey: '',
  model: 'gpt-4o-mini',
  temperature: 0.9,
  maxTokens: 400,
  timeoutSecs: 45,
  offlineMode: false,
  soundEnabled: true,
  defaultSpeed: 2,
  showBubbles: true,
};

const LS_KEY = 'pixel-sinergi/config';

let settings = { ...DEFAULT_SETTINGS };

export function getSettings() {
  return settings;
}

export async function loadSettings() {
  try {
    let stored = null;
    if (isTauri) {
      const invoke = await getInvoke();
      stored = await invoke('load_config');
    } else {
      const raw = localStorage.getItem(LS_KEY);
      stored = raw ? JSON.parse(raw) : null;
    }
    if (stored && typeof stored === 'object') {
      settings = { ...DEFAULT_SETTINGS, ...stored };
    }
  } catch (err) {
    console.warn('[config] gagal memuat settings, pakai default:', err);
    settings = { ...DEFAULT_SETTINGS };
  }
  return settings;
}

export async function saveSettings(patch) {
  settings = { ...settings, ...patch };
  try {
    if (isTauri) {
      const invoke = await getInvoke();
      await invoke('save_config', { config: settings });
    } else {
      localStorage.setItem(LS_KEY, JSON.stringify(settings));
    }
  } catch (err) {
    console.error('[config] gagal menyimpan settings:', err);
  }
  bus.emit('config:changed', settings);
  return settings;
}

/** Apakah LLM siap dipakai (endpoint + model terisi & tidak offline) */
export function isLlmReady() {
  return !settings.offlineMode && settings.baseUrl.trim().length > 0 && settings.model.trim().length > 0;
}
