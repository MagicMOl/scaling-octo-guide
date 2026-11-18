// 截「我」页 + 步骤条跳转验证
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const SKILL = process.env.HUASHU_SKILL || path.resolve('node_modules', 'huashu-design');
const require = createRequire(path.join(SKILL, 'index.js'));
const { chromium } = require('playwright');

const root = path.resolve('design-demos');
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1800, height: 1000 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(pathToFileURL(path.join(root, 'dir-1-v6.html')).href, { waitUntil: 'load' });
await page.waitForTimeout(600);

const p1 = page.locator('#stage .pwrap').nth(0);

// 1. 点「我」tab
await p1.locator('.tab[data-tab="me"]').click();
await page.waitForTimeout(200);
const meOn = await p1.locator('.scr[data-name="me"].on').count();
await p1.screenshot({ path: path.join(root, 'crops7', 'me.png') });

// 2. 点「项目」tab 回到立项，再用步骤条跳到「下单」
await p1.locator('.tab[data-tab="project"]').click();
await p1.locator('.steps span[data-step="order"]').first().click();
await page.waitForTimeout(200);
const orderOn = await p1.locator('.scr[data-name="order"].on').count();
const stepOn = await p1.locator('.steps span.on').first().textContent();
const tabOn = await p1.locator('.tab.on').textContent();

// 3. 从「我」页点「我的认购」跳到投资页
await p1.locator('.tab[data-tab="me"]').click();
await p1.locator('.melist div[data-go="invest"]').click();
await page.waitForTimeout(200);
const investOn = await p1.locator('.scr[data-name="invest"].on').count();

console.log(JSON.stringify({ errors, meOn, orderOn, stepOn, tabOn, investOn }, null, 2));
await browser.close();
