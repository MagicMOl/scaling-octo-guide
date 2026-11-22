// 验证：下单 -> 物流追踪 -> 刷新后仍在
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

const proj = page.locator('#stage .pwrap').nth(2);
// 进入下单步
await proj.locator('.scr.on .steps span[data-step="order"]').click({ force: true });
await page.waitForTimeout(300);
const beforeTracked = await proj.locator('.order.tracked').count();
await proj.screenshot({ path: path.join(out, 'o-1-before.png') });

// 确认下单
await proj.locator('.confirm').click({ force: true });
await page.waitForTimeout(500);
const afterTracked = await proj.locator('.order.tracked').count();
const nodes = await proj.locator('.tl .n').count();
const status = await proj.locator('.track .tstatus b').textContent();
await proj.screenshot({ path: path.join(out, 'o-2-track.png') });

// 刷新后仍在
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(400);
const proj2 = page.locator('#stage .pwrap').nth(2);
await proj2.locator('.scr.on .steps span[data-step="order"]').click({ force: true }).catch(() => {});
await page.waitForTimeout(300);
const persisted = await page.evaluate(() => !!localStorage.getItem('dipian.order'));

// 英文
await page.evaluate(() => localStorage.setItem('dipian.lang', 'en'));
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(600);
const proj3 = page.locator('#stage .pwrap').nth(2);
await proj3.locator('.scr.on .steps span[data-step="order"]').click({ force: true }).catch(() => {});
await page.waitForTimeout(400);
const statusEn = await page.locator('#stage .pwrap').nth(2).locator('.track .tstatus b').textContent().catch(() => '');

console.log(JSON.stringify({ errors, beforeTracked, afterTracked, nodes, status: status && status.trim(), persisted, statusEn: statusEn && statusEn.trim() }, null, 1));
await browser.close();
