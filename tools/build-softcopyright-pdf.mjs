// 生成软著源程序文档：54 页 A4 PDF（50 行/页，页眉软件全称+版本，页脚页码）
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const SKILL = process.env.HUASHU_SKILL || path.resolve('node_modules', 'huashu-design');
const require = createRequire(path.join(SKILL, 'index.js'));
const { chromium } = require('playwright');

const NAME = '25号底片个人经历档案管理与项目孵化系统';
const VERSION = 'V1.0';
const PER_PAGE = 50;
const OUT_DIR = path.resolve('softcopyright-output');

const FILES = [
  'design-demos/dir-1-v6.html',
  'server/core.mjs',
  'server/node-server.mjs',
  'server/worker.mjs',
  'server/stores.mjs',
  'index.html',
];

const lines = [];
let maxLen = 0;
for (const f of FILES) {
  const abs = path.resolve(f);
  let s = fs.readFileSync(abs, 'utf8');
  s = s.replace(/data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+/g, '/* [image] */');
  for (const raw of s.split(/\r?\n/)) {
    const line = raw.replace(/\t/g, '  ');
    if (!line.trim()) continue;
    maxLen = Math.max(maxLen, line.length);
    lines.push(line);
  }
}

const pages = [];
for (let i = 0; i < lines.length; i += PER_PAGE) pages.push(lines.slice(i, i + PER_PAGE));

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const body = pages.map((pg, i) => `
  <section class="page">
    <header>${esc(NAME)} ${VERSION}</header>
    <pre>${pg.map((l) => esc(l)).join('\n')}</pre>
    <footer>第 ${i + 1} 页 共 ${pages.length} 页</footer>
  </section>`).join('');

const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">
<style>
  @page { size: A4; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: "Consolas", "Courier New", monospace; color: #000; }
  .page {
    width: 210mm; height: 297mm; padding: 16mm 14mm 14mm;
    page-break-after: always; position: relative; overflow: hidden;
  }
  header {
    font-family: "SimSun", serif; font-size: 9pt; text-align: center;
    padding-bottom: 3mm; border-bottom: 0.4pt solid #000; margin-bottom: 4mm;
  }
  pre {
    font-size: 7.2pt; line-height: 3.9mm; white-space: pre-wrap;
    word-break: break-all; letter-spacing: 0;
  }
  footer {
    position: absolute; left: 0; right: 0; bottom: 8mm; text-align: center;
    font-family: "SimSun", serif; font-size: 8.5pt;
  }
</style></head><body>${body}</body></html>`;

fs.mkdirSync(OUT_DIR, { recursive: true });
const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const htmlPath = path.join(OUT_DIR, `源程序_25号底片_${stamp}.html`);
const pdfPath = path.join(OUT_DIR, `源程序_25号底片_${stamp}.pdf`);
fs.writeFileSync(htmlPath, html, 'utf8');

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
await page.pdf({ path: pdfPath, format: 'A4', printBackground: true, margin: { top: 0, bottom: 0, left: 0, right: 0 } });
await browser.close();

const size = fs.statSync(pdfPath).size;
console.log(JSON.stringify({
  lines: lines.length, maxLen, pages: pages.length,
  pdf: pdfPath, kb: Math.round(size / 1024), html: htmlPath,
}, null, 1));
