// 截图工具：借 huashu-design 插件里的 playwright + 本机 Chrome
// 用法: node shot.mjs <url|file> <out.png> [--w 1440] [--h 900] [--full] [--wait 1200]
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const SKILL = process.env.HUASHU_SKILL || path.resolve('node_modules', 'huashu-design');
const require = createRequire(path.join(SKILL, 'index.js'));
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const input = args[0];
const out = args[1];
const flag = (name, def) => {
  const i = args.indexOf(name);
  return i > -1 ? args[i + 1] : def;
};
const W = Number(flag('--w', 1440));
const H = Number(flag('--h', 900));
const full = args.includes('--full');
const wait = Number(flag('--wait', 1200));

const url = /^https?:|^file:/.test(input)
  ? input
  : pathToFileURL(path.resolve(input)).href;

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(url, { waitUntil: 'load', timeout: 45000 });
try { await page.waitForLoadState('networkidle', { timeout: 6000 }); } catch {}
await page.waitForTimeout(wait);
await page.screenshot({ path: out, fullPage: full });
console.log(JSON.stringify({ out, errors, h: await page.evaluate(() => document.documentElement.scrollHeight) }, null, 2));
await browser.close();
