// BFF 端到端测试：假上游 + 真服务，验证转发、校验、限流、CORS、错误映射、跨实例共享限流
import http from 'node:http';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPSTREAM_PORT = 9911;
const REDIS_PORT = 9922;
const BFF_PORT = 8799;
const BFF_PORT_B = 8800;
const KEY = 'sk-test-secret-123';

// ---------- 假上游 ----------
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

// ---------- 假 Upstash Redis（只实现 INCR / EXPIRE NX / TTL）----------
const kv = new Map();
const redis = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => (raw += c));
  req.on('end', () => {
    let cmds = [];
    try { cmds = JSON.parse(raw); } catch {}
    const now = Date.now();
    const out = cmds.map(([op, key, ttl]) => {
      if (op === 'INCR') {
        let e = kv.get(key);
        if (!e || now >= e.exp) { e = { n: 0, exp: 0 }; }
        e.n += 1;
        kv.set(key, e);
        return { result: e.n };
      }
      if (op === 'EXPIRE') {
        const e = kv.get(key);
        if (!e) return { result: 0 };
        if (e.exp === 0) e.exp = now + Number(ttl) * 1000;
        return { result: 1 };
      }
      if (op === 'TTL') {
        const e = kv.get(key);
        if (!e || e.exp === 0) return { result: -1 };
        return { result: Math.max(0, Math.ceil((e.exp - now) / 1000)) };
      }
      return { result: null };
    });
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(out));
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

function startBff(env = {}, port = BFF_PORT) {
  return spawn(process.execPath, [path.join(__dirname, 'node-server.mjs')], {
    env: {
      ...process.env,
      PORT: String(port),
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

const post = (body, headers = {}, port = BFF_PORT) => fetch(`http://127.0.0.1:${port}/api/chat`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', origin: 'null', ...headers },
  body: typeof body === 'string' ? body : JSON.stringify(body),
  signal: AbortSignal.timeout(15000),
});

const results = [];
const check = (name, cond, detail) => results.push({ name, pass: Boolean(cond), detail });

async function withBff(env, fn, port = BFF_PORT) {
  const proc = startBff(env, port);
  await waitFor(`http://127.0.0.1:${port}/api/health`);
  try { return await fn(); } finally { proc.kill(); await sleep(250); }
}

await new Promise((r) => upstream.listen(UPSTREAM_PORT, r));
await new Promise((r) => redis.listen(REDIS_PORT, r));

try {
  // ---------- 基础功能（内存限流）----------
  await withBff({}, async () => {
    const health = await (await fetch(`http://127.0.0.1:${BFF_PORT}/api/health`)).json();
    check('health 报告已配置 Key 与内存存储', health.ok === true && health.hasKey === true && health.store === 'memory', health);

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

  // ---------- 单实例限流 ----------
  await withBff({ RATE_PER_MIN: '2' }, async () => {
    let limited = null;
    for (let i = 0; i < 6; i++) {
      const r = await post({ system: 's', user: 'u' });
      if (r.status === 429) { limited = r; break; }
    }
    check('超过每分钟上限返回 429', Boolean(limited), limited ? limited.status : '未触发');
  });

  // ---------- 上游 401 ----------
  upstreamMode = 'unauth';
  await withBff({}, async () => {
    const r = await post({ system: 's', user: 'u' });
    const j = await r.json();
    check('上游 401 映射成 502 且不回显 Key', r.status === 502 && !JSON.stringify(j).includes(KEY), j);
  });
  upstreamMode = 'ok';

  // ---------- 未配 Key ----------
  await withBff({ DEEPSEEK_API_KEY: '' }, async () => {
    const r = await post({ system: 's', user: 'u' });
    const j = await r.json();
    check('服务端没配 Key 返回 500', r.status === 500 && j.error?.code === 'no_key', j);
  });

  // ---------- 跨实例共享限流（Upstash）----------
  kv.clear();
  const sharedEnv = {
    RATE_PER_MIN: '2',
    UPSTASH_REDIS_REST_URL: `http://127.0.0.1:${REDIS_PORT}`,
    UPSTASH_REDIS_REST_TOKEN: 'test-token',
  };
  const a = startBff(sharedEnv, BFF_PORT);
  const b = startBff(sharedEnv, BFF_PORT_B);
  await waitFor(`http://127.0.0.1:${BFF_PORT}/api/health`);
  await waitFor(`http://127.0.0.1:${BFF_PORT_B}/api/health`);
  try {
    const healthA = await (await fetch(`http://127.0.0.1:${BFF_PORT}/api/health`)).json();
    check('health 报告使用 upstash 存储', healthA.store === 'upstash', healthA);

    const ip = { 'x-forwarded-for': '203.0.113.9' };
    const r1 = await post({ system: 's', user: 'u' }, ip, BFF_PORT);
    const r2 = await post({ system: 's', user: 'u' }, ip, BFF_PORT_B);
    check('两个实例各用一次都通过（共用计数未超）', r1.status === 200 && r2.status === 200, [r1.status, r2.status]);

    const r3 = await post({ system: 's', user: 'u' }, ip, BFF_PORT);
    check('第三次在 A 上被拒（共享计数）', r3.status === 429, r3.status);

    const other = { 'x-forwarded-for': '198.51.100.7' };
    const r4 = await post({ system: 's', user: 'u' }, other, BFF_PORT_B);
    check('换个 IP 不受影响', r4.status === 200, r4.status);

    check('Redis 里确实写入了两个窗口的键', [...kv.keys()].filter((k) => k.startsWith('rl:')).length >= 2, [...kv.keys()]);
  } finally {
    a.kill();
    b.kill();
    await sleep(250);
  }
} finally {
  upstream.close();
  redis.close();
}

const failed = results.filter((r) => !r.pass);
console.log(JSON.stringify({ passed: results.length - failed.length, failed: failed.length, results }, null, 2));
process.exit(failed.length ? 1 : 0);
