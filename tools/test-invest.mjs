// 投资认购流程验证
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

const inv = page.locator('#stage .pwrap').nth(4);
const before = {
  amt: await inv.locator('.amt').textContent(),
  pct: await inv.locator('.pct').textContent(),
  rows: await inv.locator('.plist .pl').count(),
};

await inv.locator('.invbtn').click();
await page.waitForTimeout(300);
const sheetOpen = await inv.locator('.sheet.on').count();
await inv.screenshot({ path: path.join(root, 'crops6', 'invest-sheet.png') });

await inv.locator('.iamt div[data-amt="10"]').click();
await inv.locator('.sheet.on .invbtn').click();
await page.waitForTimeout(400);

const after = {
  amt: await inv.locator('.amt').textContent(),
  pct: await inv.locator('.pct').textContent(),
  rows: await inv.locator('.plist .pl').count(),
  h1: await inv.locator('.inv .h1').innerText(),
  sheet: await inv.locator('.sheet.on').count(),
};
await inv.screenshot({ path: path.join(root, 'crops6', 'invest-after.png') });

console.log(JSON.stringify({ errors, before, sheetOpen, after }, null, 2));
await browser.close();
