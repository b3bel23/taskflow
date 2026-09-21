import { defineConfig, devices } from '@playwright/test';

// Testes E2E em navegador real (Chromium). Sobem o app buildado
// (`vite preview`) — o mesmo bundle que vai para o GitHub Pages, com o
// `base: '/taskflow/'` — e rodam contra ele.
//
// - Localmente, `PW_CHANNEL=chrome` usa o Chrome já instalado (nada para
//   baixar). No CI não se define nada e o Playwright usa o Chromium dele
//   (`npx playwright install --with-deps chromium`).
// - Fuso e relógio são fixos nos testes (`timezoneId` aqui, `page.clock` nos
//   testes), então "hoje" é sempre a mesma sexta-feira, em qualquer máquina.
const PORT = 4173;

export default defineConfig({
  testDir: './e2e',
  // 60s: os testes com duas abas abrem 2 páginas e chegam perto de 30s numa
  // máquina lenta (pasta no OneDrive) sob carga.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  // Poucos workers: cada teste sobe um Chrome e os de duas abas sobem dois;
  // com muitos em paralelo a máquina (ou o runner) fica sem CPU e testes
  // corretos estouram o tempo.
  workers: process.env.CI ? 2 : 3,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/taskflow/`,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: process.env.PW_CHANNEL || undefined },
    },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/taskflow/`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
