// 为软著说明书截取界面图（8 屏 + 1 弹层）
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const SKILL = process.env.HUASHU_SKILL || path.resolve('node_modules', 'huashu-design');
const require = createRequire(path.join(SKILL, 'index.js'));
const { chromium } = require('playwright');

const out = path.resolve('softcopyright-output/shots');
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1800, height: 1000 }, deviceScaleFactor: 2 });
await page.goto(pathToFileURL(path.join('design-demos/dir-1-v6.html')).href + '?v=' + Date.now(), { waitUntil: 'load' });
await page.evaluate(() => { localStorage.setItem('dipian.lang', 'zh'); localStorage.removeItem('dipian.order'); });
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(900);

const P = (i) => page.locator('#stage .pwrap').nth(i);
const shot = async (loc, name) => {
  await loc.screenshot({ path: path.join(out, name + '.png') });
  console.log('shot', name);
};

await shot(P(0), '01-cover');
await shot(P(1), '02-film');

// 年份详情
await P(1).locator('.cell[data-year="2021"]').click({ force: true });
await page.waitForTimeout(500);
await P(1).screenshot({ path: path.join(out, '03-year.png') });
console.log('shot 03-year');
await P(1).locator('.ysheet.on .x').click({ force: true });
await page.waitForTimeout(300);

await shot(P(2), '04-project');
await shot(P(3), '05-team');
await shot(P(4), '06-invest');
await shot(P(5), '07-tech');
await shot(P(6), '08-order');

// 物流追踪
await P(2).locator('.scr.on .steps span[data-step="order"]').click({ force: true }).catch(() => {});
await page.waitForTimeout(300);
await P(6).locator('.confirm').click({ force: true });
await page.waitForTimeout(600);
await P(6).screenshot({ path: path.join(out, '09-track.png') });
console.log('shot 09-track');

await browser.close();
