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
    // chunk legitimately exceeds the 500 kB default warning threshold.
    chunkSizeWarningLimit: 1500,
  },
})
