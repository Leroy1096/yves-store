// Build « fichier unique » : un seul JS + CSS, intégrés ensuite dans un HTML autonome
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  define: { 'import.meta.env.VITE_SINGLE': JSON.stringify('1') },
  build: {
    outDir: 'dist-single',
    emptyOutDir: true,
    copyPublicDir: false,
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    modulePreload: false,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
})
