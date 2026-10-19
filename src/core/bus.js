// ============================================================
// bus.js — Event bus sederhana (pub/sub)
// ============================================================

const listeners = new Map();

export const bus = {
  on(event, fn) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(fn);
    return () => bus.off(event, fn);
  },

  off(event, fn) {
    listeners.get(event)?.delete(fn);
  },

  emit(event, payload) {
    const set = listeners.get(event);
    if (!set) return;
    for (const fn of set) {
      try {
        fn(payload);
      } catch (err) {
        console.error(`[bus] error pada event "${event}":`, err);
      }
    }
  },
};

// Katalog event yang dipakai di seluruh aplikasi (dokumentasi):
//
// feed:add        { FeedEvent }          — entri baru masuk ke Office Feed
// toast           { text, kind }         — notifikasi toast
// select-agent    { agentId }            — agen dipilih (klik canvas/list)
// agent:gone      { agentId }            — agen pulang
// agent:respawn   { agentId }            — agen kembali ke kantor
// directive:sent  { directive }          — titah dikirim
// incident:start  { incidentId }         — insiden dimulai
// conversation:end{ conversation }       — konvoi selesai
// stats:changed   {}                     — statistik kantor berubah
// config:changed  { settings }           — settings disimpan
