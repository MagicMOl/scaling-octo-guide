// 重截物流图：推进到已签收（展示产品文案而非演示提示）
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const SKILL = process.env.HUASHU_SKILL || path.resolve('node_modules', 'huashu-design');
const require = createRequire(path.join(SKILL, 'index.js'));
const { chromium } = require('playwright');

const out = path.resolve('softcopyright-output/shots');
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1800, height: 1000 }, deviceScaleFactor: 2 });
await page.goto(pathToFileURL(path.join('design-demos/dir-1-v6.html')).href + '?v=' + Date.now(), { waitUntil: 'load' });
await page.evaluate(() => { localStorage.setItem('dipian.lang', 'zh'); localStorage.removeItem('dipian.order'); });
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(800);

const P = page.locator('#stage .pwrap').nth(6);
await P.locator('.confirm').click({ force: true });
await page.waitForTimeout(400);
await P.locator('.track .next').click({ force: true });
await page.waitForTimeout(250);
await P.locator('.track .next').click({ force: true });
await page.waitForTimeout(350);
await P.screenshot({ path: path.join(out, '09-track.png') });
console.log('ok');
await browser.close();
