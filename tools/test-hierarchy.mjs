// 验证：层级 / 骨架屏 / 一键带入
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const SKILL = process.env.HUASHU_SKILL || path.resolve('node_modules', 'huashu-design');
const require = createRequire(path.join(SKILL, 'index.js'));
const { chromium } = require('playwright');

const root = path.resolve('design-demos');
const out = path.join(root, 'crops9');
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1800, height: 1000 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

await page.route('**/api/chat', async (route) => {
  await new Promise((r) => setTimeout(r, 1200));
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      data: { strength: '把混乱收进秩序', evidence: ['2021 · 组件库', '2024 · 砍功能', '2026 · 一个人上线'], openings: '用 AI 替人做重复的判断', why: '测试' },
      usage: { prompt_tokens: 812, completion_tokens: 96 },
      model: 'deepseek-chat',
    }),
  });
});

await page.goto(pathToFileURL(path.join(root, 'dir-1-v6.html')).href, { waitUntil: 'load' });
await page.evaluate(() => {
  localStorage.setItem('dipian.endpoint', 'http://127.0.0.1:8899/api/chat');
  localStorage.removeItem('dipian.conclusion');
  localStorage.setItem('dipian.lang', 'zh');
});
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(400);

const film = page.locator('#stage .pwrap').nth(1);
const proj = page.locator('#stage .pwrap').nth(2);

await proj.screenshot({ path: path.join(out, 'h-project.png') });

await film.locator('.aibtn').click();
await page.waitForTimeout(350);
await film.screenshot({ path: path.join(out, 'h-skeleton.png') });
await page.waitForTimeout(1400);
await film.screenshot({ path: path.join(out, 'h-result.png') });

await film.locator('.aisheet.on .toinv').click();
await page.waitForTimeout(500);
const fromOn = await proj.locator('[data-fromfilm].on').count();
const fromText = await proj.locator('[data-fromtext]').textContent().catch(() => '');
await proj.locator('[data-fill]').click();
await page.waitForTimeout(200);
const what = await proj.locator('.rq[data-k="what"]').inputValue();
await proj.screenshot({ path: path.join(out, 'h-fromfilm.png') });

console.log(JSON.stringify({ errors, fromOn, fromText: fromText.trim().slice(0, 60), what }, null, 1));
await browser.close();
