// 语言切换验证：中文 → EN → 中文，检查关键文案与恢复
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const SKILL = process.env.HUASHU_SKILL || path.resolve('node_modules', 'huashu-design');
const require = createRequire(path.join(SKILL, 'index.js'));
const { chromium } = require('playwright');

const root = path.resolve('design-demos');
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1800, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(pathToFileURL(path.join(root, 'dir-1-v6.html')).href, { waitUntil: 'load' });
await page.waitForTimeout(400);

const read = () => page.evaluate(() => {
  const t = (sel) => { const el = document.querySelector(sel); return el ? el.textContent.trim() : null; };
  return {
    title: t('.board-title h1'),
    tab: t('#stage .pwrap .tab'),
    cover: t('#stage .pwrap .scr[data-name="cover"] .ht h2'),
    input: document.querySelector('#stage .pwrap .rq') ? document.querySelector('#stage .pwrap .rq').value : null,
    htmlLang: document.documentElement.lang,
  };
});

const zh = await read();

// 点板上的 EN
await page.locator('.langtog [data-lang="en"]').click();
await page.waitForTimeout(300);
const en = await read();

// 点回中文
await page.locator('.langtog [data-lang="zh"]').click();
await page.waitForTimeout(300);
const back = await read();

// 手机上切（我 页语言行）
await page.locator('#stage .pwrap').nth(0).locator('.tab[data-tab="me"]').click();
await page.waitForTimeout(150);
await page.locator('#stage .pwrap').nth(0).locator('.scr[data-name="me"] [data-lang="en"]').click({ force: true });
await page.waitForTimeout(300);
const meEn = await page.locator('#stage .pwrap .scr[data-name="me"] .mestat span').first().textContent();

console.log(JSON.stringify({ errors, zh, en, back, meEn: meEn.trim() }, null, 2));
await browser.close();
