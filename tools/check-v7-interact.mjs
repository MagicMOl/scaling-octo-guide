// v7 交互回归：切 tab、开年份、切语言、手机模式
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const SKILL = process.env.HUASHU_SKILL || path.resolve('node_modules', 'huashu-design');
const require = createRequire(path.join(SKILL, 'index.js'));
const { chromium } = require('playwright');

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1800, height: 1000 }, deviceScaleFactor: 2 });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).slice(0, 140)));

await page.goto(pathToFileURL(path.resolve('design-demos/dir-1-v7.html')).href, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);

const P = page.locator('#stage .pwrap').nth(0);
const out = {};

// 1. 切四个 tab
const tabs = ['film', 'project', 'me', 'cover'];
out.tabs = [];
for (const t of tabs) {
  await P.locator(`.tab[data-tab="${t}"]`).click({ force: true }).catch(() => {});
  await page.waitForTimeout(250);
  const on = await P.locator('.scr.on').getAttribute('data-name').catch(() => null);
  out.tabs.push(t + '→' + on);
}

// 2. 打开年份详情
await P.locator('.tab[data-tab="film"]').click({ force: true });
await page.waitForTimeout(300);
await P.locator('.cell').nth(0).click({ force: true }).catch(() => {});
await page.waitForTimeout(400);
out.yearSheet = await P.locator('.ysheet.on').count();

// 3. 切英文
await page.evaluate(() => localStorage.setItem('dipian.lang', 'en'));
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(900);
out.enTitle = (await page.locator('#stage .pwrap').nth(0).locator('.cov2-title').innerText().catch(() => '')).replace(/\s+/g, ' ');

// 4. 手机模式
await page.evaluate(() => localStorage.setItem('dipian.lang', 'zh'));
await page.setViewportSize({ width: 390, height: 844 });
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(900);
out.mobileVisible = await page.locator('#mobile').isVisible().catch(() => false);
await page.screenshot({ path: 'crops9/v7-mobile.png' });

console.log(JSON.stringify({ out, errs }, null, 1));
await browser.close();
