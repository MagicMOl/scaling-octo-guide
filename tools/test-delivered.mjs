// 验证：确认下单 -> 推进到签收 -> 自动去「我」-> 订单标记已到货
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
await page.evaluate(() => { localStorage.removeItem('dipian.order'); localStorage.setItem('dipian.lang', 'zh'); });
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(400);

const p = page.locator('#stage .pwrap').nth(2);
await p.locator('.scr.on .steps span[data-step="order"]').click({ force: true });
await page.waitForTimeout(250);
await p.locator('.confirm').click({ force: true });
await page.waitForTimeout(400);

const st1 = await p.locator('.track .tstatus b').textContent();
const nextCount = await p.locator('.track .next').count();

// 推进两次：运输中 -> 派送中 -> 已签收
await p.locator('.track .next').click({ force: true });
await page.waitForTimeout(300);
const st2 = await p.locator('.track .tstatus b').textContent();
await p.screenshot({ path: path.join(out, 'o-3-delivering.png') });

await p.locator('.track .next').click({ force: true });
await page.waitForTimeout(300);
const st3 = await p.locator('.track .tstatus b').textContent();
await p.screenshot({ path: path.join(out, 'o-4-delivered.png') });

// 等自动跳转
await page.waitForTimeout(1800);
const meOn = await p.locator('.scr.on').getAttribute('data-name');
const meRow = await p.locator('[data-order-em]').textContent();
const meClass = await p.locator('[data-order-em]').getAttribute('class');
await p.screenshot({ path: path.join(out, 'o-5-me.png') });

console.log(JSON.stringify({ errors, st1, st2, st3, nextCount, meOn, meRow: meRow.trim(), meClass }, null, 1));
await browser.close();
