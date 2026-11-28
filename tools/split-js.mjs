// 按语法验证过的切点重写 app/*.js，并重写壳的脚本引用
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const SRC = path.resolve('design-demos/dir-1-v6.html');
const APP = path.resolve('design-demos/app');
const HTML = path.resolve('design-demos/dir-1-v7.html');

const lines = fs.readFileSync(SRC, 'utf8').split('\n');
const START = 969;
const END = 2435;
const script = lines.slice(START - 1, END);

const ok = (src) => { try { new vm.Script(src, { filename: 'c.js' }); return true; } catch { return false; } };

// 语法验证过的切点（0-based，相对 script）
const CUTS = [0, 21, 214, 962, 1026, script.length];
const META = [
  ['utils.js', '通用小工具：撕纸多边形'],
  ['cover.js', '封面：路口与速写人物（当前用实拍图，备用）'],
  ['phone.js', '手机骨架与七屏逻辑（buildPhone 主体，后续按屏拆出）'],
  ['mobile.js', '手机模式与左右滑动'],
  ['i18n.js', '中英切换与启动'],
];

const report = [];
for (let i = 0; i < META.length; i++) {
  const [name, desc] = META[i];
  const a = CUTS[i];
  const b = CUTS[i + 1];
  const chunk = script.slice(a, b).join('\n');
  if (!ok(chunk)) throw new Error('chunk 不合法: ' + name);
  fs.writeFileSync(path.join(APP, name), '/* ' + desc + ' */\n' + chunk + '\n', 'utf8');
  report.push({ name, lines: b - a, bytes: Buffer.byteLength(chunk) });
}

// 清理旧的错误分片
for (const old of ['core.js', 'data.js', 'film.js', 'project.js', 'tracking.js']) {
  const p = path.join(APP, old);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

// 重写壳的 script 列表
let html = fs.readFileSync(HTML, 'utf8');
html = html.replace(/<script src="app\/[^"]+"><\/script>\s*/g, '');
const tags = ['templates.js', ...META.map((m) => m[0])]
  .map((f) => `<script src="app/${f}"></script>`).join('\n');
html = html.replace('</body>', tags + '\n</body>');
fs.writeFileSync(HTML, html, 'utf8');

console.log(JSON.stringify({ report, htmlKb: Math.round(Buffer.byteLength(html) / 1024) }, null, 1));
