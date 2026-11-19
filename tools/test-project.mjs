// 立项页验证：编辑需求 → AI 生成两版方案与评审
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const SKILL = process.env.HUASHU_SKILL || path.resolve('node_modules', 'huashu-design');
const require = createRequire(path.join(SKILL, 'index.js'));
const { chromium } = require('playwright');

const root = path.resolve('design-demos');
const url = pathToFileURL(path.join(root, 'dir-1-v6.html')).href;
const browser = await chromium.launch({ channel: 'chrome' });
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
        plans: [
          { name: '一次成册', desc: '自动排版，交钱就寄，不做挑选', pros: '最快上线', cons: '同质化' },
          { name: '先选后排', desc: '你挑 20 张，AI 排成一册', pros: '付费意愿高', cons: '需要引导' },
        ],
        recommended: 1,
        review: { concept: 8.6, cost: 7.2, risk: 6.4 },
        verdict: '选 B，先做 8 周，预算 ¥30,000。',
        keep: 'B 的「先选后排」，付费意愿最高',
        fix: '把选图压到 20 张以内',
        risky: '相册权限与导出尺寸，第 2 周前要验',
      }) } }],
      usage: { prompt_tokens: 1024, completion_tokens: 210 },
    }),
  });
});

await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(500);
await page.evaluate(() => { try { localStorage.setItem('dipian.apiKey', 'sk-mock'); } catch (e) {} });
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(400);

const proj = page.locator('#stage .pwrap').nth(2);
await proj.locator('.rq[data-k="what"]').fill('把手机里的旅行照做成一本能寄给朋友的小册子');
await proj.locator('.rq[data-k="what"]').blur();
await proj.locator('.genbtn').click();
await page.waitForTimeout(600);

const planNames = await proj.locator('[data-sol] .card2 .t').allTextContents();
const recTag = await proj.locator('[data-sol] .card2.rec .tag').count();
const scores = await proj.locator('[data-rev] b').allTextContents();
const verdict = await proj.locator('[data-verdict]').textContent();
const rows = await proj.locator('[data-rev2] div').allTextContents();
const storeReq = await page.evaluate(() => localStorage.getItem('dipian.req'));
await proj.screenshot({ path: path.join(root, 'crops9', 'project-ai.png') });

console.log(JSON.stringify({
  errors,
  request: captured ? {
    model: captured.model,
    json: captured.response_format.type,
    userPreview: captured.messages[1].content.slice(0, 120),
    hasFilm: captured.messages[1].content.includes('底片'),
  } : null,
  planNames, recTag, scores, verdict: verdict.trim(), rows, storeReq,
}, null, 2));

await browser.close();
