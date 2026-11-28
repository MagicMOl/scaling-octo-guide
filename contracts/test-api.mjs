// 接口契约实测：两段运行——功能检查（高限流）+ 限流检查（低限流）
import { spawn } from 'node:child_process';
import path from 'node:path';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withServer({ port, perMin = 100, perDay = 500 }, fn) {
  const child = spawn(process.execPath, [path.resolve('server/node-server.mjs')], {
    env: { ...process.env, PORT: String(port), RATE_PER_MIN: String(perMin), RATE_PER_DAY: String(perDay), DEEPSEEK_API_KEY: '' },
    stdio: 'ignore',
  });
  const base = `http://127.0.0.1:${port}`;
  try {
    for (let i = 0; i < 50; i++) {
      try { const r = await fetch(base + '/api/health'); if (r.ok) break; } catch {}
      await sleep(150);
    }
    return await fn(base);
  } finally {
    child.kill();
    await sleep(150);
  }
}

async function call(base, { path: p = '/api/chat', method = 'POST', body } = {}) {
  const res = await fetch(base + p, {
    method,
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, code: json && json.error && json.error.code };
}

const results = [];
const check = (label, pass, got, want) => results.push({ label, pass, got, want });

await withServer({ port: 8801 }, async (base) => {
  const h = await call(base, { path: '/api/health', method: 'GET' });
  check('health 形状', h.status === 200 && h.json && h.json.ok === true && 'hasKey' in h.json,
    JSON.stringify(h.json).slice(0, 70), '200 {ok:true,hasKey,...}');

  const empty = await call(base, { body: {} });
  check('空 body', empty.status === 400 && !!empty.code, `${empty.status} ${empty.code}`, '400 <参数错误码>');

  const badJson = await call(base, { body: 'not-json' });
  check('非法 JSON', badJson.status === 400 && badJson.code === 'bad_request', `${badJson.status} ${badJson.code}`, '400 bad_request');

  const wrongMethod = await call(base, { method: 'GET' });
  check('方法错', wrongMethod.status === 405 && wrongMethod.code === 'method_not_allowed', `${wrongMethod.status} ${wrongMethod.code}`, '405 method_not_allowed');

  const notFound = await call(base, { path: '/api/nope', body: {} });
  check('未知路径', notFound.status === 404 && notFound.code === 'not_found', `${notFound.status} ${notFound.code}`, '404 not_found');

  const big = await call(base, { body: { user: 'x'.repeat(300000) } });
  check('超大 body', big.status === 413 && big.code === 'payload_too_large', `${big.status} ${big.code}`, '413 payload_too_large');

  const noKey = await call(base, { body: { system: 's', user: 'u', model: 'deepseek-chat' } });
  check('未配 Key', noKey.status === 503 && noKey.code === 'server_misconfigured', `${noKey.status} ${noKey.code}`, '503 server_misconfigured');
});

await withServer({ port: 8802, perMin: 2, perDay: 5 }, async (base) => {
  let limited = null;
  for (let i = 0; i < 5; i++) {
    const r = await call(base, { body: { system: 's', user: 'u', model: 'deepseek-chat' } });
    if (r.status === 429) { limited = r; break; }
  }
  check('限流触发', !!limited && limited.code === 'rate_limited', limited ? '429 rate_limited' : '未触发', '429 rate_limited');
});

const failed = results.filter((r) => !r.pass);
console.log(JSON.stringify({ total: results.length, failed: failed.length, results }, null, 1));
if (failed.length) process.exitCode = 1;
