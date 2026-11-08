import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  // Rutas relativas para poder publicar en GitHub Pages o cualquier subcarpeta.
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    // Vite rechaza por defecto los dominios que no son localhost. Con SIGEI_PREVIEW=1
    // se aceptan, para ver el servidor de desarrollo a través de un proxy de vista previa.
    allowedHosts: process.env.SIGEI_PREVIEW ? true : undefined,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
