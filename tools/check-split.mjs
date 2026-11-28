// 验证拆分后的原型
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const SKILL = process.env.HUASHU_SKILL || path.resolve('node_modules', 'huashu-design');
const require = createRequire(path.join(SKILL, 'index.js'));
const { chromium } = require('playwright');

const target = process.argv[2] || 'design-demos/dir-1-v7.html';
const out = process.argv[3] || 'crops9/v7-board.png';

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1800, height: 1000 }, deviceScaleFactor: 2 });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 140)); });

try {
  await page.goto(pathToFileURL(path.resolve(target)).href, { waitUntil: 'domcontentloaded', timeout: 20000 });
} catch (e) {
  console.log(JSON.stringify({ gotoError: String(e).slice(0, 120), errs }));
  await browser.close();
  process.exit(0);
}
await page.waitForTimeout(1500);

const info = await page.evaluate(() => ({
  phones: document.querySelectorAll('.phone').length,
  templates: document.querySelectorAll('template').length,
  screens: document.querySelectorAll('.scr').length,
}));

await page.screenshot({ path: out });
console.log(JSON.stringify({ info, errs }));
await browser.close();
