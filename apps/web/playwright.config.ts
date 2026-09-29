import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./test",
  testMatch: "*.e2e.ts",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:8180",
    launchOptions: { executablePath: "/usr/bin/google-chrome" },
  },
  webServer: [
    {
      command: "node ../api/dist/src/main.js",
      url: "http://127.0.0.1:4100/api/v1/health/live",
      env: { PORT: "4100" },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: "node node_modules/next/dist/bin/next dev -p 3100",
      url: "http://127.0.0.1:3100",
      env: { INTERNAL_API_ORIGIN: "http://127.0.0.1:4100" },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: "node ../../infra/dev-proxy.mjs",
      url: "http://127.0.0.1:8180",
      env: { API_PORT: "4100", WEB_PORT: "3100", PROXY_PORT: "8180" },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
