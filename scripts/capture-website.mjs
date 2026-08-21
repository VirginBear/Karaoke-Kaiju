import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const websiteDir = path.resolve('website');
const artifactDir = path.resolve(
  process.env.KARAOKE_KAIJU_ARTIFACT_DIR ?? 'artifacts/website',
);
fs.mkdirSync(artifactDir, { recursive: true });

// Simple static server
const server = http.createServer((req, res) => {
  let filePath = path.join(websiteDir, req.url === '/' ? 'index.html' : req.url);
  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const ext = path.extname(filePath);
  let contentType = 'text/html';
  if (ext === '.css') contentType = 'text/css';
  if (ext === '.js') contentType = 'application/javascript';
  if (ext === '.png') contentType = 'image/png';
  if (ext === '.svg') contentType = 'image/svg+xml';

  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(0, async () => {
  const port = server.address().port;
  console.log(`Server running at http://localhost:${port}`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  // 1. Capture Light Mode
  await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.setItem('karaoke_kaiju_theme', 'light'));
  await page.reload({ waitUntil: 'networkidle' });

  await page.screenshot({ path: path.join(artifactDir, 'website_light_hero.png'), fullPage: false });
  await page.screenshot({ path: path.join(artifactDir, 'website_light_fullpage.png'), fullPage: true });

  // 2. Capture Dark Mode
  const themeToggle = await page.$('#theme-toggle-btn');
  if (themeToggle) await themeToggle.click();
  await page.waitForTimeout(300);

  await page.screenshot({ path: path.join(artifactDir, 'website_dark_hero.png'), fullPage: false });
  await page.screenshot({ path: path.join(artifactDir, 'website_dark_fullpage.png'), fullPage: true });

  console.log('Light and Dark mode screenshots saved successfully!');
  await browser.close();
  server.close();
});
