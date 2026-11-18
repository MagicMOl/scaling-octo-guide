// 探测 api.deepseek.com 是否允许浏览器直连（CORS）
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const SKILL = process.env.HUASHU_SKILL || path.resolve('node_modules', 'huashu-design');
const require = createRequire(path.join(SKILL, 'index.js'));
const { chromium } = require('playwright');

const root = path.resolve('design-demos');
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
await page.goto(pathToFileURL(path.join(root, 'dir-1-v6.html')).href, { waitUntil: 'load' });

const result = await page.evaluate(async () => {
  const out = { origin: location.origin, href: location.href.slice(0, 40) };
  try {
    const r = await fetch('https://api.deepseek.com/models', {
      method: 'GET',
      headers: { Authorization: 'Bearer sk-test-invalid' },
    });
    out.status = r.status;
    out.cors = 'allowed';
    out.body = (await r.text()).slice(0, 120);
  } catch (e) {
    out.cors = 'blocked';
    out.error = String(e).slice(0, 160);
  }
  return out;
});

console.log(JSON.stringify(result, null, 2));
await browser.close();
