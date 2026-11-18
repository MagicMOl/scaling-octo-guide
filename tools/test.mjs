// 最小点击测试：tab 切换、卡片进入下一屏、控制台报错
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const SKILL = process.env.HUASHU_SKILL || path.resolve('node_modules', 'huashu-design');
const require = createRequire(path.join(SKILL, 'index.js'));
const { chromium } = require('playwright');

const root = path.resolve('design-demos');
const files = ['dir-2.html', 'dir-3.html', 'dir-1-v4.html', 'dir-1-v5.html', 'dir-1-v6.html'];

const browser = await chromium.launch({ channel: 'chrome' });
const report = [];

for (const f of files) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(pathToFileURL(path.join(root, f)).href, { waitUntil: 'load' });
  await page.waitForTimeout(250);

  const r = await page.evaluate(() => {
    const phones = [...document.querySelectorAll('.pwrap')];
    const rows = phones.map((p) => {
      const label = p.querySelector('.scr.on')?.dataset.name || null;
      const tabs = [...p.querySelectorAll('.tab')];
      const seq = tabs.map((t) => { t.click(); return p.querySelector('.scr.on')?.dataset.name; });
      return { start: label, tabs: seq.length, switched: seq.join(',') };
    });
    // 卡片 / 按钮跳转
    const p0 = phones[0];
    const navs = [];
    p0.querySelectorAll('[data-go]').forEach((el) => {
      const before = p0.querySelector('.scr.on')?.dataset.name;
      el.click();
      navs.push(before + ' -> ' + (p0.querySelector('.scr.on')?.dataset.name));
    });
    // 底片：逐个年份点开，读年份页标题
    const years = [];
    const y2 = p0.querySelector('.scr[data-name="year"] .year h2');
    p0.querySelectorAll('.frame').forEach((f) => {
      f.click();
      years.push(y2 ? y2.textContent : '-');
    });
    return { phones: rows, navs, years };
  });

  report.push({ file: f, errors, ...r });
  await page.close();
}

await browser.close();
console.log(JSON.stringify(report, null, 2));
