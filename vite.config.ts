import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Clean stale hashed assets on every build. The pre-built badge SVGs live
    // in public/badges and are always re-copied by Vite, so nothing is lost.
    emptyOutDir: true,
    // Data is inlined intentionally (zero-server / instant load), so the entry
    // chunk legitimately exceeds the 500 kB default warning threshold. Raised
    // again in v1.15 when trending.json + the workbench payloads took the entry
    // chunk past 1500 kB. Lazy-loading the data is tracked separately on the
    // roadmap; until then this stays a known, accepted size.
    chunkSizeWarningLimit: 1700,
  },
})
