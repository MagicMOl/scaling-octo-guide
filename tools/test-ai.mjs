// 验证「AI 读底片」链路：拦截请求检查 payload，渲染结果；再测真实 401 错误路径
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const SKILL = process.env.HUASHU_SKILL || path.resolve('node_modules', 'huashu-design');
const require = createRequire(path.join(SKILL, 'index.js'));
const { chromium } = require('playwright');

const root = path.resolve('design-demos');
const url = pathToFileURL(path.join(root, 'dir-1-v6.html')).href;
const browser = await chromium.launch({ channel: 'chrome' });

// ---------- 1. 模拟 API ----------
const page = await browser.newPage({ viewport: { width: 1800, height: 1000 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
let captured = null;
await page.route('**/chat/completions', async (route) => {
  captured = JSON.parse(route.request().postData() || '{}');
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      choices: [{ message: { content: JSON.stringify({
        strength: '把混乱收进秩序',
        evidence: ['2021 · 用 42 个组件把界面收进秩序', '2024 · 砍三个功能把留存从 11% 拉到 19%', '2026 · 十周一个人上线'],
        openings: '用 AI 做决策，不做设计稿',
        why: '底片里反复出现的是「把一个想法落到地上」',
      }) } }],
      usage: { prompt_tokens: 812, completion_tokens: 96 },
    }),
  });
});

await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(500);

const film = page.locator('#stage .pwrap').nth(1);
await film.locator('.aibtn').click();
await page.waitForTimeout(200);
const keySheet = await film.locator('.aisheet.on .kinput').count();
await film.locator('.aisheet.on .kinput').fill('sk-mock-key');
await film.locator('.aisheet.on .ksave').click();
await page.waitForTimeout(200);
const stateAfterSave = await film.locator('.aistate').textContent();

await film.locator('.aibtn').click();
await page.waitForTimeout(500);
const strength = await film.locator('.aisheet.on .ai-big').first().textContent();
const evidenceCount = await film.locator('.aisheet.on .ai-ev div').count();
const meta = await film.locator('.aisheet.on .ai-meta').textContent();
await film.screenshot({ path: path.join(root, 'crops9', 'ai-result.png') });

// ---------- 2. 真实接口的错误路径 ----------
const page2 = await browser.newPage({ viewport: { width: 1800, height: 1000 }, deviceScaleFactor: 2 });
const errors2 = [];
page2.on('pageerror', (e) => errors2.push(String(e)));
await page2.goto(url, { waitUntil: 'load' });
await page2.evaluate(() => { try { localStorage.setItem('dipian.apiKey', 'sk-invalid-for-test'); } catch (e) {} });
await page2.reload({ waitUntil: 'load' });
const film2 = page2.locator('#stage .pwrap').nth(1);
await film2.locator('.aibtn').click();
await page2.waitForTimeout(2500);
const errText = await film2.locator('.aisheet.on .ai-err').textContent().catch(() => '(no error shown)');
await film2.locator('.aisheet.on .demo').click();
await page2.waitForTimeout(300);
const demoStrength = await film2.locator('.aisheet.on .ai-big').first().textContent();
await film2.screenshot({ path: path.join(root, 'crops9', 'ai-error.png') });

console.log(JSON.stringify({
  errors,
  keySheet,
  stateAfterSave: stateAfterSave.trim(),
  request: captured ? { model: captured.model, json: captured.response_format, msgs: captured.messages.length, userPreview: captured.messages[1].content.slice(0, 90) } : null,
  strength, evidenceCount, meta: meta.trim().slice(0, 60),
  errors2,
  realError: String(errText).slice(0, 80),
  demoStrength: demoStrength.trim(),
}, null, 2));

await browser.close();
