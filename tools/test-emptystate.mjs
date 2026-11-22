// 验证：新增一年 -> 空态 -> 补一条 -> 列表
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const SKILL = process.env.HUASHU_SKILL || path.resolve('node_modules', 'huashu-design');
const require = createRequire(path.join(SKILL, 'index.js'));
const { chromium } = require('playwright');

const root = path.resolve('design-demos');
const out = path.join(root, 'crops9');
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1800, height: 1000 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(pathToFileURL(path.join(root, 'dir-1-v6.html')).href, { waitUntil: 'load' });
await page.evaluate(() => { localStorage.setItem('dipian.lang', 'zh'); });
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(400);

const film = page.locator('#stage .pwrap').nth(1);
const btn = film.locator('.addyear');
const exists = await btn.count();

await btn.click();
await page.waitForTimeout(400);
const year = await film.locator('.ysheet.on .yh b').textContent().catch(() => '');
const emptyOn = await film.locator('.ysheet.on .empty').count();
await film.screenshot({ path: path.join(out, 'h-empty.png') });

await film.locator('.ysheet.on .yfill input').fill('第一次给别人的东西收钱');
await film.locator('.ysheet.on .yfill button').click();
await page.waitForTimeout(300);
const listCount = await film.locator('.ysheet.on .ylist div').count();
const emptyAfter = await film.locator('.ysheet.on .empty').count();
await film.screenshot({ path: path.join(out, 'h-empty-after.png') });

console.log(JSON.stringify({ errors, exists, year: year.trim(), emptyOn, listCount, emptyAfter }, null, 1));
await browser.close();
