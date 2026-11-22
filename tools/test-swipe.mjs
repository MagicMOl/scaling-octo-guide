// 用真实触摸事件验证左右滑动
import path from 'node:path';
import { createRequire } from 'node:module';

const SKILL = process.env.HUASHU_SKILL || path.resolve('node_modules', 'huashu-design');
const require = createRequire(path.join(SKILL, 'index.js'));
const { chromium } = require('playwright');

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto('http://127.0.0.1:8090/', { waitUntil: 'load' });
await page.waitForTimeout(700);

await page.locator('#mobile .tab[data-tab="project"]').click({ force: true });
await page.waitForTimeout(600);
const before = await page.locator('#mobile .scr.on').getAttribute('data-name');

const cdp = await page.context().newCDPSession(page);
const box = await page.locator('#mobile .phone').boundingBox();
const y = box.y + box.height * 0.5;
const x1 = box.x + box.width * 0.82;
const x2 = box.x + box.width * 0.18;

await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x1, y }] });
for (let i = 1; i <= 10; i += 1) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x1 + ((x2 - x1) * i) / 10, y }] });
}
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await page.waitForTimeout(600);

const after = await page.locator('#mobile .scr.on').getAttribute('data-name');
await page.screenshot({ path: path.resolve('crops9/m-7-swipe.png') });
console.log(JSON.stringify({ before, after }));
await browser.close();
