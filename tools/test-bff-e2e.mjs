// 端到端：浏览器原型 → BFF → 假上游
import http from 'node:http';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SKILL = process.env.HUASHU_SKILL || path.resolve(ROOT, 'node_modules', 'huashu-design');
const require = createRequire(path.join(SKILL, 'index.js'));
const { chromium } = require('playwright');

const UP_PORT = 9901;
const BFF_PORT = 8801;

// ---- 假上游：按 system 内容返回不同结构 ----
const upstream = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => (raw += c));
  req.on('end', () => {
    let body = {};
    try { body = JSON.parse(raw); } catch {}
    const sys = body?.messages?.[0]?.content || '';
    const isProject = sys.includes('产品负责人');
    const content = isProject
      ? JSON.stringify({
        plans: [
          { name: '一次成册', desc: '自动排版，交钱就寄', pros: '最快上线', cons: '同质化' },
          { name: '先选后排', desc: '你挑 20 张，AI 排成一册', pros: '付费高', cons: '要引导' },
        ],
        recommended: 1,
        review: { concept: 8.6, cost: 7.2, risk: 6.4 },
        verdict: '选 B，8 周先做。', keep: 'B 的先选后排', fix: '压到 20 张', risky: '相册权限',
      })
      : JSON.stringify({ strength: '把混乱收进秩序', evidence: ['2021 · 组件库', '2024 · 砍功能', '2026 · 一个人上线'], openings: '用 AI 做决策', why: '测试用' });
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ model: 'deepseek-chat', usage: { prompt_tokens: 888, completion_tokens: 66 }, choices: [{ message: { content } }] }));
  });
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url, { signal: AbortSignal.timeout(800) }); if (r.ok) return true; } catch {}
    await sleep(100);
  }
  return false;
}

await new Promise((r) => upstream.listen(UP_PORT, r));
const bff = spawn(process.execPath, [path.join(ROOT, 'server', 'node-server.mjs')], {
  env: {
    ...process.env,
    PORT: String(BFF_PORT),
    DEEPSEEK_API_KEY: 'sk-e2e',
    DEEPSEEK_BASE_URL: `http://127.0.0.1:${UP_PORT}`,
    RATE_PER_MIN: '50',
    ALLOWED_ORIGINS: '*',
  },
  stdio: 'ignore',
});
await waitFor(`http://127.0.0.1:${BFF_PORT}/api/health`);

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1800, height: 1000 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(pathToFileURL(path.join(ROOT, 'design-demos', 'dir-1-v6.html')).href, { waitUntil: 'load' });
await page.evaluate((ep) => {
  localStorage.setItem('dipian.endpoint', ep);
  localStorage.removeItem('dipian.apiKey');
  localStorage.setItem('dipian.lang', 'zh');
}, `http://127.0.0.1:${BFF_PORT}/api/chat`);
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(500);

const film = page.locator('#stage .pwrap').nth(1);
const state = (await film.locator('.aistate').textContent()).trim();
await film.locator('.aibtn').click();
await page.waitForTimeout(1500);
const strength = await film.locator('.aisheet.on .ai-big').first().textContent().catch(() => '(none)');
const meta = await film.locator('.aisheet.on .ai-meta').textContent().catch(() => '');
await film.screenshot({ path: path.join(ROOT, 'design-demos', 'crops9', 'bff-film.png') });

const proj = page.locator('#stage .pwrap').nth(2);
await proj.locator('.genbtn').click();
await page.waitForTimeout(1500);
const plans = await proj.locator('[data-sol] .card2 .t').allTextContents();
const scores = await proj.locator('[data-rev] b').allTextContents();
const verdict = await proj.locator('[data-verdict]').textContent();
await proj.screenshot({ path: path.join(ROOT, 'design-demos', 'crops9', 'bff-project.png') });

console.log(JSON.stringify({
  errors,
  state,
  strength: strength.trim(),
  meta: meta.trim().slice(0, 60),
  plans,
  scores,
  verdict: verdict.trim(),
}, null, 2));

await browser.close();
bff.kill();
upstream.close();
