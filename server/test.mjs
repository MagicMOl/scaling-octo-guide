// BFF 端到端测试：假上游 + 真服务，验证转发、校验、限流、CORS、错误映射
import http from 'node:http';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPSTREAM_PORT = 9911;
const BFF_PORT = 8799;
const KEY = 'sk-test-secret-123';

let lastAuth = null;
let lastBody = null;
let upstreamMode = 'ok';

const upstream = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => (raw += c));
  req.on('end', () => {
    lastAuth = req.headers.authorization || null;
    try { lastBody = JSON.parse(raw); } catch { lastBody = null; }
    if (upstreamMode === 'unauth') {
      res.writeHead(401, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'Authentication Fails, key ****cret-123 invalid' } }));
      return;
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      model: 'deepseek-chat',
      usage: { prompt_tokens: 120, completion_tokens: 40 },
      choices: [{ message: { content: JSON.stringify({ strength: '把混乱收进秩序', evidence: ['2021'], openings: '用 AI 做决策', why: '测试' }) } }],
    }));
  });
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (r.ok) return true;
    } catch (e) { /* not ready */ }
    await sleep(100);
  }
  return false;
}

function startBff(env = {}) {
  return spawn(process.execPath, [path.join(__dirname, 'node-server.mjs')], {
    env: {
      ...process.env,
      PORT: String(BFF_PORT),
      DEEPSEEK_API_KEY: KEY,
      DEEPSEEK_BASE_URL: `http://127.0.0.1:${UPSTREAM_PORT}`,
      RATE_PER_MIN: '100',
      RATE_PER_DAY: '1000',
      ALLOWED_ORIGINS: '*',
      ...env,
    },
    stdio: 'ignore',
  });
}

const post = (body, headers = {}) => fetch(`http://127.0.0.1:${BFF_PORT}/api/chat`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', origin: 'null', ...headers },
  body: typeof body === 'string' ? body : JSON.stringify(body),
  signal: AbortSignal.timeout(15000),
});

const results = [];
const check = (name, cond, detail) => results.push({ name, pass: Boolean(cond), detail });

async function withBff(env, fn) {
  const proc = startBff(env);
  await waitFor(`http://127.0.0.1:${BFF_PORT}/api/health`);
  try { return await fn(); } finally { proc.kill(); await sleep(250); }
}

await new Promise((r) => upstream.listen(UPSTREAM_PORT, r));

try {
  await withBff({}, async () => {
    const health = await (await fetch(`http://127.0.0.1:${BFF_PORT}/api/health`)).json();
    check('health 报告已配置 Key', health.ok === true && health.hasKey === true, health);

    const opt = await fetch(`http://127.0.0.1:${BFF_PORT}/api/chat`, { method: 'OPTIONS', headers: { origin: 'null' } });
    check('OPTIONS 预检返回 204 + CORS', opt.status === 204 && opt.headers.get('access-control-allow-origin') === '*', opt.status);

    const ok = await post({ system: 'sys', user: 'user', model: 'deepseek-chat', temperature: 0.5 });
    const okJson = await ok.json();
    check('正常请求返回 200 与结构化 data', ok.status === 200 && okJson.data?.strength === '把混乱收进秩序', okJson);
    check('上游收到正确的 Bearer Key', lastAuth === `Bearer ${KEY}`, lastAuth);
    check('上游收到 json_object 与两条消息', lastBody?.response_format?.type === 'json_object' && lastBody?.messages?.length === 2, lastBody?.response_format);

    const noUser = await post({ system: 'sys' });
    check('缺 user 返回 400', noUser.status === 400, await noUser.json());

    const badModel = await post({ system: 's', user: 'u', model: 'gpt-4' });
    check('不支持的模型返回 400', badModel.status === 400, await badModel.json());

    const big = await post({ system: 's', user: 'x'.repeat(70000) });
    check('超大请求体返回 413', big.status === 413, big.status);

    const wrongMethod = await fetch(`http://127.0.0.1:${BFF_PORT}/api/chat`, { method: 'GET' });
    check('GET 返回 405', wrongMethod.status === 405, wrongMethod.status);

    const notFound = await fetch(`http://127.0.0.1:${BFF_PORT}/api/nope`);
    check('未知路径返回 404', notFound.status === 404, notFound.status);
  });

  await withBff({ RATE_PER_MIN: '2' }, async () => {
    let limited = null;
    for (let i = 0; i < 6; i++) {
      const r = await post({ system: 's', user: 'u' });
      if (r.status === 429) { limited = r; break; }
    }
    check('超过每分钟上限返回 429', Boolean(limited), limited ? limited.status : '未触发');
  });

  upstreamMode = 'unauth';
  await withBff({}, async () => {
    const r = await post({ system: 's', user: 'u' });
    const j = await r.json();
    check('上游 401 映射成 502 且不回显 Key', r.status === 502 && !JSON.stringify(j).includes(KEY), j);
  });

  await withBff({ DEEPSEEK_API_KEY: '' }, async () => {
    const r = await post({ system: 's', user: 'u' });
    const j = await r.json();
    check('服务端没配 Key 返回 500', r.status === 500 && j.error?.code === 'no_key', j);
  });
} finally {
  upstream.close();
}

const failed = results.filter((r) => !r.pass);
console.log(JSON.stringify({ passed: results.length - failed.length, failed: failed.length, results }, null, 2));
process.exit(failed.length ? 1 : 0);
