import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { createServer } from 'vite';

const workspacePath = resolve(import.meta.dirname, '..');
const vite = await createServer({
  root: workspacePath,
  logLevel: 'silent',
  server: { host: '127.0.0.1', port: 0 },
});
await vite.listen();
const address = vite.httpServer?.address();
if (!address || typeof address === 'string') {
  throw new Error('Unable to start the pitch QA server');
}
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];

page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') {
    errors.push(message.text());
  }
});

try {
  await page.goto(`http://127.0.0.1:${address.port}/qa/pitch-analyzer.html`, {
    waitUntil: 'domcontentloaded',
  });
  const measurements = await page.evaluate(() => window.pitchAccuracyPromise);
  const result = { measurements, errors };
  console.log(JSON.stringify(result, null, 2));

  const outsideTolerance = measurements.some(
    (measurement) => Math.abs(measurement.centsError) > 5,
  );
  if (outsideTolerance || errors.length > 0) {
    process.exitCode = 1;
  }
} finally {
  await browser.close();
  await vite.close();
}
