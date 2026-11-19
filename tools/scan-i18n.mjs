// 扫描英文模式下仍然残留的中文，输出去重清单，供补翻译
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const SKILL = process.env.HUASHU_SKILL || path.resolve('node_modules', 'huashu-design');
const require = createRequire(path.join(SKILL, 'index.js'));
const { chromium } = require('playwright');

const root = path.resolve('design-demos');
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1800, height: 1000 } });
await page.goto(pathToFileURL(path.join(root, 'dir-1-v6.html')).href, { waitUntil: 'load' });
await page.waitForTimeout(400);
await page.evaluate(() => { try { localStorage.setItem('dipian.lang', 'en'); } catch (e) {} });
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(700);

// 依次打开每个 tab / 步骤 / 弹层，把动态内容也扫进去
const film = page.locator('#stage .pwrap').nth(1);
await film.locator('.cell[data-year="2021"]').click({ force: true });
await page.waitForTimeout(300);
const proj = page.locator('#stage .pwrap').nth(2);
await page.locator('#stage .pwrap').nth(0).locator('.tab[data-tab="project"]').click({ force: true });
await page.waitForTimeout(200);

const grab = async (label) => page.evaluate((lbl) => {
  const seen = new Set();
  const walker = document.createTreeWalker(document.getElementById('board'), NodeFilter.SHOW_TEXT, null);
  while (walker.nextNode()) {
    const n = walker.currentNode;
    const t = (n.nodeValue || '').trim();
    if (!t || !/[\u4e00-\u9fa5]/.test(t)) continue;
    seen.add(t);
  }
  document.querySelectorAll('#board [placeholder]').forEach((el) => {
    const v = el.getAttribute('placeholder') || '';
    if (/[\u4e00-\u9fa5]/.test(v)) seen.add('@placeholder: ' + v);
  });
  return { label: lbl, items: [...seen] };
}, label);

const passes = [];
passes.push(await grab('board+cover'));

for (const step of ['team', 'invest', 'tech', 'order', 'project']) {
  await page.locator('#stage .pwrap').nth(2).locator('.scr.on .steps span[data-step="' + step + '"]').first().click({ force: true });
  await page.waitForTimeout(150);
  passes.push(await grab('project:' + step));
}

await page.locator('#stage .pwrap').nth(0).locator('.tab[data-tab="film"]').click({ force: true });
await page.locator('#stage .pwrap').nth(0).locator('.tab[data-tab="me"]').click({ force: true });
await page.waitForTimeout(200);
passes.push(await grab('me'));

await page.locator('#stage .pwrap').nth(1).locator('.cell[data-year="2021"]').click({ force: true });
await page.waitForTimeout(300);
passes.push(await grab('year-sheet'));

const all = new Map();
passes.forEach((p) => p.items.forEach((s) => { if (!all.has(s)) all.set(s, p.label); }));
console.log(JSON.stringify({ total: all.size, items: [...all.entries()] }, null, 1));
await browser.close();
