import { defineConfig } from 'vite';

// Konfigurasi Vite untuk Tauri:
// - port tetap 1420 (dipakai devUrl di tauri.conf.json)
// - watch ignore src-tauri agar Rust rebuild tidak memicu reload loop
export default defineConfig({
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: '127.0.0.1',
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  build: {
    target: 'es2021',
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000,
  },
});
