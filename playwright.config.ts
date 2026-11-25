import { defineConfig, devices } from "@playwright/test";

/**
 * Tests E2E (M6). Corren CONTRA PRODUCCIÓN con guardas y limpieza: ver
 * e2e/README.md antes de usarlos. Un solo worker, porque comparten el
 * estado del día en la base.
 */
try {
  process.loadEnvFile(".env.local");
} catch {
  // Sin .env.local: e2e/global-setup.ts avisa qué falta.
}

const PUERTO = Number(process.env.E2E_PUERTO ?? 3100);

export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.(e2e|setup)\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: `http://localhost:${PUERTO}`,
    locale: "es-HN",
    timezoneId: "America/Tegucigalpa",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "sesiones", testMatch: /auth\.setup\.ts/ },
    {
      name: "movil",
      testMatch: /.*\.movil\.e2e\.ts/,
      dependencies: ["sesiones"],
      use: {
        ...devices["Pixel 5"],
        viewport: { width: 360, height: 780 },
      },
    },
    {
      name: "escritorio",
      testMatch: /.*\.e2e\.ts/,
      testIgnore: /.*\.movil\.e2e\.ts/,
      dependencies: ["sesiones", "movil"],
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
    },
  ],
  webServer: {
    command: `npx next dev -p ${PUERTO}`,
    url: `http://localhost:${PUERTO}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
