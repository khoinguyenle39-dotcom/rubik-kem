import { expect, test } from '@playwright/test';

test('plays visible turns, pauses, resumes, and allows opting in with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // Test playback with a known valid solution, without rebuilding solver tables.
  await page.addInitScript(() => {
    class SolverFixture {
      onmessage: ((event: { data: unknown }) => void) | null = null;
      onerror = null;
      constructor() { setTimeout(() => this.send({ type: 'ready', initMs: 0, tableBytes: 0 }), 0); }
      send(data: unknown) { this.onmessage?.({ data }); }
      postMessage(message: { type: string; id: number }) {
        setTimeout(() => {
          if (message.type === 'prepare') this.send({ type: 'prepared', id: message.id, report: { tier: 'standard', source: 'built', tableBytes: 0, ms: 0, cacheError: null } });
          if (message.type === 'solve') this.send({ type: 'result', id: message.id, result: { moves: [0, 3, 2, 5], stoppedBy: 'proven', nodes: 0, elapsedMs: 0 } });
        }, 0);
      }
      terminate() {}
    }
    Object.defineProperty(window, 'Worker', { value: SolverFixture });
  });
  await page.goto('http://127.0.0.1:5173/');
  await page.getByRole('button', { name: 'Thử một khối mẫu' }).click();
  await page.getByRole('button', { name: 'Tìm lời giải ít nước nhất' }).click();
  const effects = page.getByRole('checkbox', { name: 'Hiệu ứng xoay' });
  await expect(effects).not.toBeChecked();
  await expect(page.getByRole('button', { name: 'Chạy công thức', exact: true })).toBeDisabled();
  await effects.check();
  await page.getByLabel('Tốc độ xoay').selectOption('0.6');
  await expect(page.locator('canvas')).toBeVisible();
  await page.locator('canvas').screenshot({ path: 'test-results/animation-before.png' });
  await page.getByRole('button', { name: 'Chạy công thức', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tiếp theo', exact: true })).toBeDisabled();
  await page.waitForTimeout(600);
  await page.locator('canvas').screenshot({ path: 'test-results/animation-during.png' });
  await page.getByRole('button', { name: 'Tạm dừng', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tiếp theo', exact: true })).toBeEnabled({ timeout: 10000 });
  const paused = await page.locator('.playback-buttons > span').innerText();
  await page.waitForTimeout(1700);
  await expect(page.locator('.playback-buttons > span')).toHaveText(paused);
  await page.getByRole('button', { name: 'Chạy công thức', exact: true }).click();
  await expect(page.getByText('Hoàn thành!', { exact: true })).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.playback-buttons > span')).toHaveText('4 / 4');
  await page.locator('canvas').screenshot({ path: 'test-results/animation-after.png' });
  await page.getByRole('button', { name: 'Quay lại', exact: true }).click();
  await expect(page.locator('.move-caption strong')).toHaveText('R');
  await expect(page.locator('.move-list [aria-current="step"]')).toHaveText("R'");
  await expect(page.locator('.playback-buttons > span')).toHaveText('3 / 4');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.reload();
  await page.getByRole('button', { name: 'Thử một khối mẫu' }).click();
  await page.getByRole('button', { name: 'Tìm lời giải ít nước nhất' }).click();
  await expect(page.getByRole('checkbox', { name: 'Hiệu ứng xoay' })).toBeChecked();
});
