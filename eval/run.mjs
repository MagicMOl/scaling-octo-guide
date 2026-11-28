// 评测集跑分：默认 dry（校验断言逻辑），加 --endpoint 走真实调用
// 用法：
//   node eval/run.mjs --dry
//   node eval/run.mjs --endpoint http://127.0.0.1:8787/api/analyze --out eval/results.json
import fs from 'node:fs';
import path from 'node:path';
import { validate } from '../contracts/validate.mjs';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};

const DRY = flag('--dry');
const ENDPOINT = value('--endpoint', '');
const OUT = value('--out', '');
const LIMIT = Number(value('--limit', '0')) || 0;
const TIMEOUT = Number(value('--timeout', '25000'));

const SYSTEM = '你是一位资深的产品与职业顾问。只根据用户提供的「底片」数据判断，不要编造年份或事件。'
  + '输出严格的 JSON，结构见契约 v1：'
  + '{ "v": 1, "strength": "一句话，6–20 字，说清他真正擅长什么，不用「具有」开头，不加句号", '
  + '"evidence": [{ "year": 2021, "event": "这一年发生的具体事，8–40 字，来自底片原文", "why": "不超过 12 字" }], '
  + '"openings": "一句话，6–20 字，说清 AI 时代可以往哪打开", "confidence": 0.7 }。'
  + 'evidence 必须恰好 3 条，年份必须是底片里出现过的年份。不要输出多余文字，不要给价格。';

function buildUser(c) {
  return '底片数据（JSON）：\n' + JSON.stringify(c.years.map((y) => ({
    year: y.year, identity: y.identity, city: y.city, line: y.line, records: y.records,
  })));
}

function parseJSON(text) {
  if (!text) throw new Error('空返回');
  let s = String(text).trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  return JSON.parse(s);
}

async function callModel(c) {
  const t0 = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system: SYSTEM, user: buildUser(c), model: 'deepseek-chat', temperature: 0.4 }),
      signal: ctrl.signal,
    });
    const text = await r.text();
    if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + text.slice(0, 120));
    let payload;
    try { payload = JSON.parse(text); } catch { payload = { text }; }
    const raw = payload.text || payload.content || payload.reply || text;
    return { data: parseJSON(raw), ms: Date.now() - t0 };
  } finally {
    clearTimeout(timer);
  }
}

// 断言：除契约外，再加两条数据与事实约束
function checkCase(c, data) {
  const fails = [];
  const v = validate(data);
  if (!v.ok) fails.push(...v.errors.map((e) => e.field + ': ' + e.message));

  const allowed = new Set(c.expectedYears);
  if (Array.isArray(data.evidence)) {
    data.evidence.forEach((e, i) => {
      if (e && typeof e === 'object' && Number.isInteger(e.year) && !allowed.has(e.year)) {
        fails.push(`evidence[${i}].year: ${e.year} 不在档案年份 [${[...allowed].join(',')}] 中，疑似编造`);
      }
    });
  }
  return fails;
}

const suite = JSON.parse(fs.readFileSync(path.resolve('eval/cases.json'), 'utf8'));
let list = suite.cases;
if (LIMIT) list = list.slice(0, LIMIT);

const rows = [];
let pass = 0;
const ruleHits = {};

if (DRY) {
  // 干跑：用 fixtures 里的固定返回，验证断言能判对
  const dir = path.resolve('eval/fixtures');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')) : [];
  for (const f of files) {
    const fx = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const c = suite.cases.find((x) => x.id === fx.caseId);
    if (!c) { rows.push({ file: f, pass: false, fails: ['找不到用例 ' + fx.caseId] }); continue; }
    const fails = checkCase(c, fx.output);
    fails.forEach((x) => { const k = x.split(':')[0]; ruleHits[k] = (ruleHits[k] || 0) + 1; });
    const ok = fails.length === 0;
    if (ok) pass++;
    rows.push({ case: c.id, file: f, expectPass: fx.expectPass, pass: ok, fails });
  }
} else {
  if (!ENDPOINT) {
    console.error('缺少 --endpoint，或加 --dry 只验断言');
    process.exit(2);
  }
  for (const c of list) {
    try {
      const { data, ms } = await callModel(c);
      const fails = checkCase(c, data);
      if (ms > 20000) fails.push('latency: ' + ms + 'ms 超过 20s');
      fails.forEach((x) => { const k = x.split(':')[0]; ruleHits[k] = (ruleHits[k] || 0) + 1; });
      const ok = fails.length === 0;
      if (ok) pass++;
      rows.push({ case: c.id, title: c.title, pass: ok, ms, fails });
    } catch (e) {
      rows.push({ case: c.id, title: c.title, pass: false, fails: ['异常: ' + String(e.message).slice(0, 160)] });
    }
    process.stdout.write(rows[rows.length - 1].pass ? '.' : 'x');
  }
  console.log('');
}

const total = rows.length;
const report = {
  mode: DRY ? 'dry' : 'live',
  endpoint: ENDPOINT || null,
  total,
  passed: pass,
  rate: total ? +(pass / total).toFixed(3) : 0,
  rules: ruleHits,
  rows,
  at: new Date().toISOString(),
};

if (OUT) fs.writeFileSync(path.resolve(OUT), JSON.stringify(report, null, 2), 'utf8');

console.log(`结果：${pass}/${total} 通过（${(report.rate * 100).toFixed(1)}%）`);
if (Object.keys(ruleHits).length) console.log('失败分布：', ruleHits);
for (const r of rows.filter((x) => !x.pass).slice(0, 8)) {
  console.log(' ·', r.case || r.file, '→', (r.fails || []).slice(0, 2).join(' | '));
}

// dry 模式下，expectPass 与实际不符即失败
if (DRY) {
  const wrong = rows.filter((r) => r.expectPass !== undefined && r.expectPass !== r.pass);
  if (wrong.length) {
    console.log('断言逻辑有误：', wrong.map((w) => w.file + ' 期望 ' + w.expectPass + ' 实际 ' + w.pass).join('; '));
    process.exit(1);
  }
}
