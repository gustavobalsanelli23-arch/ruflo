import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    // Ano do build: o mesmo no HTML pré-renderizado e na hidratação.
    __BUILD_YEAR__: JSON.stringify(new Date().getFullYear()),
  },
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    // A cena 3D do hero (three.js, ~130 kB gzip) é um pedaço à parte,
    // baixado só depois do load; o aviso padrão de 500 kB não se aplica.
    chunkSizeWarningLimit: 560,
  },
});
