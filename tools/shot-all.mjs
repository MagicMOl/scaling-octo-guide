// 批量截图：thumbs + 三个方向
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const SKILL = process.env.HUASHU_SKILL || path.resolve('node_modules', 'huashu-design');
const require = createRequire(path.join(SKILL, 'index.js'));
const { chromium } = require('playwright');

const root = path.resolve('design-demos');
const jobs = [
  { file: 'thumbs.html', out: 'thumbs.png', w: 1600, h: 1000 },
  { file: 'dir-2.html', out: 'dir-2.png', w: 1440, h: 900 },
  { file: 'dir-3.html', out: 'dir-3.png', w: 1440, h: 900 },
  { file: 'dir-1-v4.html', out: 'dir-1-v4.png', w: 1600, h: 1000 },
  { file: 'dir-1-v4.html', out: 'dir-1-v4-small.png', w: 1200, h: 760 },
  { file: 'dir-1-v5.html', out: 'dir-1-v5.png', w: 1600, h: 1000 },
  { file: 'dir-1-v5.html', out: 'dir-1-v5-small.png', w: 1200, h: 760 },
  { file: 'dir-1-v6.html', out: 'dir-1-v6.png', w: 1800, h: 1000 },
  { file: 'dir-1-v6.html', out: 'dir-1-v6-small.png', w: 1200, h: 760 },
];

const browser = await chromium.launch({ channel: 'chrome' });
const report = [];
for (const j of jobs) {
  const page = await browser.newPage({ viewport: { width: j.w, height: j.h }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(pathToFileURL(path.join(root, j.file)).href, { waitUntil: 'load' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(root, j.out) });
  report.push({ file: j.file, errors });
  await page.close();
}
await browser.close();
console.log(JSON.stringify(report, null, 2));
