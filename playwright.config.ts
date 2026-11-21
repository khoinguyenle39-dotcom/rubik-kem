import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './e2e', timeout: 45000, workers: 1, use: { channel: 'chrome', headless: true, viewport: { width: 1280, height: 900 } } });
