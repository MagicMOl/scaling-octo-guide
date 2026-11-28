// 验证结论契约：示例应通过，五组非法返回应被拒
import fs from 'node:fs';
import path from 'node:path';
import { validate } from './validate.mjs';

const read = (f) => JSON.parse(fs.readFileSync(path.resolve('contracts', f), 'utf8'));

const example = read('analysis.example.json');
const r1 = validate(example);
console.log('示例：', r1.ok ? '通过' : '失败 ' + JSON.stringify(r1.errors));

const bad = read('analysis.invalid.json').cases;
let pass = 0;
for (const c of bad) {
  const r = validate(c.payload);
  const hit = r.errors.some((e) => e.field.startsWith(c.expected));
  console.log(`${hit && !r.ok ? '拒绝' : '漏放'} · ${c.name} → ${r.errors.map((e) => e.field).join(',') || '无错误'}`);
  if (hit && !r.ok) pass++;
}

console.log(`\n结果：示例 ${r1.ok ? 'OK' : 'FAIL'}，非法用例 ${pass}/${bad.length} 被正确拒绝`);
if (!r1.ok || pass !== bad.length) process.exit(1);
