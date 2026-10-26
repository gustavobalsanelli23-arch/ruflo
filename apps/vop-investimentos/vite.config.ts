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
  },
});
