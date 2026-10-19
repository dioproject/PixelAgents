// ============================================================
// client.js — Client LLM (OpenAI-compatible)
// Tauri: proxy via Rust (bebas CORS) · Browser: fetch langsung
// ============================================================

import { getSettings, isTauri, getInvoke } from '../core/config.js';

function normalizeEndpoint(baseUrl) {
  let base = String(baseUrl || '').trim().replace(/\/+$/, '');
  if (!base) return '';
  if (base.endsWith('/chat/completions')) return base;
  return `${base}/chat/completions`;
}

/**
 * Kirim chat ke endpoint LLM.
 * @returns {Promise<{ok:boolean, text?:string, error?:string}>}
 */
export async function chat(messages, opts = {}) {
  const s = getSettings();
  const baseUrl = opts.baseUrl ?? s.baseUrl;
  const apiKey = opts.apiKey ?? s.apiKey;
  const model = opts.model ?? s.model;
  const temperature = opts.temperature ?? s.temperature;
  const maxTokens = opts.maxTokens ?? s.maxTokens;
  const timeoutSecs = opts.timeoutSecs ?? s.timeoutSecs;

  if (!baseUrl || !model) {
    return { ok: false, error: 'Endpoint LLM belum diatur (Base URL / Model kosong).' };
  }

  const payload = {
    base_url: baseUrl,
    api_key: apiKey,
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    timeout_secs: timeoutSecs,
  };

  try {
    let text;
    if (isTauri) {
      const invoke = await getInvoke();
      text = await invoke('llm_chat', payload);
    } else {
      text = await fetchDirect(payload);
    }
    if (typeof text !== 'string' || !text.trim()) {
      return { ok: false, error: 'Respons LLM kosong.' };
    }
    return { ok: true, text };
  } catch (err) {
    const msg = err?.message || String(err);
    return { ok: false, error: msg };
  }
}

/** Fallback browser: fetch langsung (butuh endpoint yang mengizinkan CORS) */
async function fetchDirect({ base_url, api_key, model, messages, temperature, max_tokens, timeout_secs }) {
  const url = normalizeEndpoint(base_url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), (timeout_secs || 45) * 1000);

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (api_key) headers['Authorization'] = `Bearer ${api_key}`;

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages,
        temperature: temperature ?? 0.9,
        max_tokens: max_tokens ?? 400,
      }),
      signal: controller.signal,
    });

    const raw = await res.text();
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${raw.slice(0, 300)}`);
    }
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error(`Respons bukan JSON: ${raw.slice(0, 200)}`);
    }
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      throw new Error(`Format respons tidak dikenal: ${raw.slice(0, 200)}`);
    }
    return content;
  } catch (err) {
    if (err?.name === 'AbortError') throw new Error(`Timeout ${timeout_secs}s — endpoint tidak merespons.`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Tes koneksi singkat untuk modal Settings */
export async function testConnection(override = {}) {
  const started = performance.now();
  const res = await chat(
    [
      { role: 'system', content: 'Kamu asisten singkat. Jawab satu kata saja.' },
      { role: 'user', content: 'Balas dengan kata: SIAP' },
    ],
    { ...override, maxTokens: 20, temperature: 0.1, timeoutSecs: Math.min(override.timeoutSecs ?? 45, 30) }
  );
  const ms = Math.round(performance.now() - started);
  if (res.ok) return { ok: true, message: `✅ Terhubung! (${ms} ms) Respons: "${res.text.trim().slice(0, 60)}"` };
  return { ok: false, message: `❌ Gagal: ${res.error}` };
}
