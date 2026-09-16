/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Deploy no GitHub Pages: o site fica em https://<user>.github.io/taskflow/,
  // não na raiz do domínio — sem `base`, os assets buildados (JS/CSS) seriam
  // referenciados a partir de `/`, quebrando o carregamento. Não afeta
  // `npm run dev`/`preview` local (Vite ignora `base` no servidor de dev).
  base: '/taskflow/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
  },
});
