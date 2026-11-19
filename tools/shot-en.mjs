// 英文模式截图：整版 + 三屏
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const SKILL = process.env.HUASHU_SKILL || path.resolve('node_modules', 'huashu-design');
const require = createRequire(path.join(SKILL, 'index.js'));
const { chromium } = require('playwright');

const root = path.resolve('design-demos');
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1800, height: 1000 }, deviceScaleFactor: 2 });
await page.goto(pathToFileURL(path.join(root, 'dir-1-v6.html')).href, { waitUntil: 'load' });
await page.evaluate(() => { try { localStorage.setItem('dipian.lang', 'en'); } catch (e) {} });
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(700);
await page.screenshot({ path: path.join(root, 'crops9', 'en-board.png') });

const wrap = (i) => page.locator('#stage .pwrap').nth(i);
await wrap(1).screenshot({ path: path.join(root, 'crops9', 'en-film.png') });
await wrap(2).screenshot({ path: path.join(root, 'crops9', 'en-project.png') });
await wrap(4).screenshot({ path: path.join(root, 'crops9', 'en-invest.png') });

console.log('done');
await browser.close();
