// 统计可用于软著提交的源码行数（剔除 base64 资源）
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const rows = [];

function countText(file, transform) {
  let s = fs.readFileSync(file, 'utf8');
  if (transform) s = transform(s);
  const lines = s.split(/\r?\n/);
  const code = lines.filter((l) => l.trim().length > 0).length;
  const chars = s.length;
  rows.push({ file: path.relative(root, file), lines: lines.length, code, chars });
  return { lines: lines.length, code, chars };
}

// 1) 原型：去掉 data URI，只留代码
countText(path.join(root, 'design-demos/dir-1-v6.html'), (s) =>
  s.replace(/data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+/g, '/* [img] */'));

// 2) 服务端
for (const f of ['server/core.mjs', 'server/stores.mjs', 'server/node-server.mjs', 'server/worker.mjs']) {
  if (fs.existsSync(path.join(root, f))) countText(path.join(root, f));
}

// 3) 入口与文档页
for (const f of ['index.html']) {
  if (fs.existsSync(path.join(root, f))) countText(path.join(root, f));
}

// 4) 工具脚本（可选，通常不作为主程序提交）
let toolLines = 0;
const toolsDir = path.join(root, 'tools');
if (fs.existsSync(toolsDir)) {
  for (const f of fs.readdirSync(toolsDir)) {
    if (f.endsWith('.mjs')) {
      const s = fs.readFileSync(path.join(toolsDir, f), 'utf8');
      toolLines += s.split(/\r?\n/).filter((l) => l.trim()).length;
    }
  }
}

const totalCode = rows.reduce((a, r) => a + r.code, 0);
console.log(JSON.stringify({ rows, totalCode, toolLines, need: 60 * 50 }, null, 1));
