// Aperçu « Website » (port 4173) en MODE DÉMO : base locale avec clients fictifs (Aya, Grâce…),
// aucune donnée réelle, aucun e-mail d'alerte envoyé. Le vrai site (Vercel) utilise vite.config.ts.
// Construire : npx vite build -c vite.demo.config.ts   ·   Servir : npx vite preview -c vite.demo.config.ts
// Développement (port 5173, aussi en démo) : npx vite -c vite.demo.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: { 'import.meta.env.VITE_SINGLE': JSON.stringify('1') },
  server: { host: '0.0.0.0', port: 5173, strictPort: true, allowedHosts: true },
  preview: { host: '0.0.0.0', port: 4173, strictPort: true, allowedHosts: true },
  build: {
    outDir: 'build', // dossier régénérable (non sauvegardé)
    emptyOutDir: true,
    rollupOptions: {
      output: { manualChunks: { react: ['react', 'react-dom', 'react-router-dom'], motion: ['framer-motion'] } },
    },
  },
})
