// 交互验证：点开团队成员看技能、切换商家看合计
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const SKILL = process.env.HUASHU_SKILL || path.resolve('node_modules', 'huashu-design');
const require = createRequire(path.join(SKILL, 'index.js'));
const { chromium } = require('playwright');

const root = path.resolve('design-demos');
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(pathToFileURL(path.join(root, 'dir-1-v6.html')).href, { waitUntil: 'load' });
await page.waitForTimeout(600);

const team = page.locator('#stage .pwrap').nth(3);
await team.locator('[data-mem="lin"]').click();
await page.waitForTimeout(300);
await team.screenshot({ path: path.join(root, 'crops6', 'sheet-lin.png') });
const sheetOn = await team.locator('.sheet.on').count();
const sheetTitle = await team.locator('.sheet.on .pf b').textContent();

// 关闭
await team.locator('.sheet.on .x').click();
const sheetClosed = await team.locator('.sheet.on').count();

const order = page.locator('#stage .pwrap').nth(6);
const before = await order.locator('.sum2').textContent();
await order.locator('.item2').nth(0).locator('.shop').nth(2).click();
await order.locator('.item2').nth(2).locator('.shop').nth(1).click();
const after = await order.locator('.sum2').textContent();
await order.screenshot({ path: path.join(root, 'crops6', 'order-cheap.png') });

console.log(JSON.stringify({ errors, sheetOn, sheetTitle, sheetClosed, before, after }, null, 2));
await browser.close();
