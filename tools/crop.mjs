// 单独截每台手机（原尺寸×2），用来放大检查细节
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const SKILL = process.env.HUASHU_SKILL || path.resolve('node_modules', 'huashu-design');
const require = createRequire(path.join(SKILL, 'index.js'));
const { chromium } = require('playwright');

const file = process.argv[2];
const outDir = process.argv[3] || 'crops';
const root = path.resolve('design-demos');

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
await page.goto(pathToFileURL(path.join(root, file)).href, { waitUntil: 'load' });
await page.waitForTimeout(600);

const n = await page.locator('#stage .pwrap').count();
for (let i = 0; i < n; i++) {
  await page.locator('#stage .pwrap').nth(i).screenshot({ path: path.join(root, outDir, `p${i + 1}.png`) });
}
console.log(JSON.stringify({ file, shots: n }));
await browser.close();
