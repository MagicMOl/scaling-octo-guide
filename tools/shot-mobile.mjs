// 手机模式验证：390×844、触屏、左右滑动
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const SKILL = process.env.HUASHU_SKILL || path.resolve('node_modules', 'huashu-design');
const require = createRequire(path.join(SKILL, 'index.js'));
const { chromium } = require('playwright');

const root = path.resolve('design-demos');
const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(pathToFileURL(path.join(root, 'dir-1-v6.html')).href, { waitUntil: 'load' });
await page.waitForTimeout(700);

const shot = (n) => page.screenshot({ path: path.join(root, n) });
await shot('mobile-1.png');

const step0 = await page.locator('#mstep').textContent();

// 滑到下一页（向左滑）
async function swipe(fromX, toX) {
  await page.evaluate(([a, b]) => {
    const host = document.getElementById('mstage');
    const mk = (x) => new Touch({ identifier: 1, target: host, clientX: x, clientY: 420 });
    host.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [mk(a)], changedTouches: [mk(a)] }));
    host.dispatchEvent(new TouchEvent('touchend', { bubbles: true, touches: [], changedTouches: [mk(b)] }));
  }, [fromX, toX]);
  await page.waitForTimeout(250);
}

await swipe(320, 90);
const step1 = await page.locator('#mstep').textContent();
await shot('mobile-2.png');

// 先到项目 tab，再用步骤条进团队，点开一个人
await page.locator('.mstage .tab[data-tab="project"]').click();
await page.locator('.mstage .steps span[data-step="team"]').first().click();
await page.waitForTimeout(250);
const step2 = await page.locator('#mstep').textContent();
await page.locator('.mstage [data-mem="lin"]').click();
await page.waitForTimeout(300);
const sheetOpen = await page.locator('.mstage .sheet.on').count();
await shot('mobile-sheet.png');

// 回滑一页
await page.locator('.mstage .sheet .x').click();
await swipe(90, 320);
const step3 = await page.locator('#mstep').textContent();

const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);

console.log(JSON.stringify({ errors, step0, step1, step2, sheetOpen, step3, overflow }, null, 2));
await browser.close();
