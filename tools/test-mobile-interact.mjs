// 手机模式交互测试：底部导航、年份弹层、项目步骤、左右滑动
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const SKILL = process.env.HUASHU_SKILL || path.resolve('node_modules', 'huashu-design');
const require = createRequire(path.join(SKILL, 'index.js'));
const { chromium } = require('playwright');

const out = path.resolve('crops9');
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto('http://127.0.0.1:8090/', { waitUntil: 'load' });
await page.waitForTimeout(700);

const shots = [];
const snap = async (name) => {
  await page.screenshot({ path: path.join(out, name + '.png') });
  shots.push(name);
};

// 1. 底片页
await page.locator('#mobile .tab[data-tab="film"]').click({ force: true });
await page.waitForTimeout(500);
await snap('m-1-film');

// 2. 点年份 -> 弹层
await page.locator('#mobile .cell[data-year="2021"]').click({ force: true });
await page.waitForTimeout(500);
await snap('m-2-year');
const sheetOn = await page.locator('#mobile .ysheet.on').count();

// 关掉弹层
await page.locator('#mobile .ysheet.on .x').click({ force: true });
await page.waitForTimeout(300);

// 3. 项目页
await page.locator('#mobile .tab[data-tab="project"]').click({ force: true });
await page.waitForTimeout(500);
await snap('m-3-project');

// 4. 步骤：团队
await page.locator('#mobile .scr.on .steps span[data-step="team"]').click({ force: true });
await page.waitForTimeout(400);
await snap('m-4-team');

// 5. 左右滑动：从团队滑回立项
const box = await page.locator('#mobile .phone').boundingBox();
if (box) {
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * 0.8, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.2, y, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(500);
}
const afterSwipe = await page.locator('#mobile .scr.on').getAttribute('data-name').catch(() => '?');
await snap('m-5-after-swipe');

// 6. 我页
await page.locator('#mobile .tab[data-tab="me"]').click({ force: true });
await page.waitForTimeout(400);
await snap('m-6-me');

console.log(JSON.stringify({ errors, sheetOn, afterSwipe, shots }, null, 1));
await browser.close();
