// 首页方案截图：四个方案，393×852 真机尺寸
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const SKILL = process.env.HUASHU_SKILL || path.resolve('node_modules', 'huashu-design');
const require = createRequire(path.join(SKILL, 'index.js'));
const { chromium } = require('playwright');

const dir = path.resolve('design-demos/home-concepts');
const out = path.resolve('crops9');
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

const files = [
  ['A-dial.html', 'home-A.png'],
  ['B-25frames.html', 'home-B.png'],
  ['C-poster.html', 'home-C.png'],
  ['D-night.html', 'home-D.png'],
  ['E-collage.html', 'home-E.png'],
  ['F-blocks.html', 'home-F.png'],
  ['G-roll.html', 'home-G.png'],
  ['FINAL.html', 'home-FINAL.png'],
];

for (const [src, outName] of files) {
  await page.goto(pathToFileURL(path.join(dir, src)).href, { waitUntil: 'load' });
  await page.waitForTimeout(450);
  await page.screenshot({ path: path.join(out, outName) });
  console.log('shot', outName);
}
console.log(JSON.stringify({ errors }));
await browser.close();
