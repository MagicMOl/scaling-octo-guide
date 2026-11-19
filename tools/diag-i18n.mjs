// 诊断：英文模式下页面是否卡死（观察器自激）
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const SKILL = process.env.HUASHU_SKILL || path.resolve('node_modules', 'huashu-design');
const require = createRequire(path.join(SKILL, 'index.js'));
const { chromium } = require('playwright');

const root = path.resolve('design-demos');
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1800, height: 1000 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
await page.goto(pathToFileURL(path.join(root, 'dir-1-v6.html')).href, { waitUntil: 'load' });
await page.evaluate(() => { try { localStorage.setItem('dipian.lang', 'en'); } catch (e) {} });
await page.reload({ waitUntil: 'load' });

const t0 = Date.now();
let ok = true;
try {
  await page.evaluate(() => 1 + 1, null, { timeout: 4000 });
} catch (e) {
  ok = false;
}
const elapsed = Date.now() - t0;

const counts = await page.evaluate(() => ({
  cells: document.querySelectorAll('.cell').length,
  phones: document.querySelectorAll('.pwrap').length,
  lang: document.documentElement.lang,
  sample: document.querySelector('.h1') ? document.querySelector('.h1').textContent.trim().slice(0, 30) : null,
})).catch(() => null);

console.log(JSON.stringify({ errs, responsive: ok, elapsedMs: elapsed, counts }, null, 2));
await browser.close();
