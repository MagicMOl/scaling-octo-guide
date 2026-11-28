// 截六组标题对比图
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const SKILL = process.env.HUASHU_SKILL || path.resolve('node_modules', 'huashu-design');
const require = createRequire(path.join(SKILL, 'index.js'));
const { chromium } = require('playwright');

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 880, height: 1300 }, deviceScaleFactor: 2 });
await page.goto(pathToFileURL(path.join('design-demos/home-concepts/TITLES.html')).href + '?v=' + Date.now(), { waitUntil: 'load' });
await page.waitForTimeout(600);
await page.screenshot({ path: 'crops9/titles.png', fullPage: true });
console.log('ok');
await browser.close();
