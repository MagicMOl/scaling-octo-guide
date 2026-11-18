// 底片年份详情验证：点开某一年、补一条记录、跳到立项
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

const film = page.locator('#stage .pwrap').nth(1);
await film.locator('.cell[data-year="2021"]').click();
await page.waitForTimeout(300);

const opened = await film.locator('.ysheet.on').count();
const year = await film.locator('.ysheet.on .yh b').textContent();
const sub = await film.locator('.ysheet.on .yh span').textContent();
const infoRows = await film.locator('.ysheet.on .yinfo div').count();
const logsBefore = await film.locator('.ysheet.on .ylist div').count();
await film.screenshot({ path: path.join(root, 'crops9', 'year-2021.png') });

// 补一条记录
await film.locator('.ysheet.on .yfill input').fill('Q3 学会了拒绝');
await film.locator('.ysheet.on .yfill button').click();
await page.waitForTimeout(200);
const logsAfter = await film.locator('.ysheet.on .ylist div').count();
const lastLog = await film.locator('.ysheet.on .ylist div').last().textContent();

// 带着这一年去立项
await film.locator('.ysheet.on .ygo').click();
await page.waitForTimeout(250);
const projectOn = await film.locator('.scr[data-name="project"].on').count();
const sheetClosed = await film.locator('.ysheet.on').count();

console.log(JSON.stringify({ errors, opened, year, sub, infoRows, logsBefore, logsAfter, lastLog, projectOn, sheetClosed }, null, 2));
await browser.close();
