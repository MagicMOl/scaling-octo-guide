// 零依赖 Node BFF（Node 18+）：把 DeepSeek Key 留在服务端，前端只调这里。
// 启动：node server/node-server.mjs   （先设置 DEEPSEEK_API_KEY）
import http from 'node:http';
import {
  parseChatInput, createLimiter, callUpstream, json, corsHeaders, preflight, ALLOWED_MODELS,
} from './core.mjs';
import { pickStore } from './stores.mjs';

const PORT = Number(process.env.PORT || 8787);
const API_KEY = process.env.DEEPSEEK_API_KEY || '';
const BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || '*';
const RATE_PER_MIN = Number(process.env.RATE_PER_MIN || 20);
const RATE_PER_DAY = Number(process.env.RATE_PER_DAY || 200);
const MAX_BODY = Number(process.env.MAX_BODY_BYTES || 65536);

const store = pickStore(process.env);
const hit = createLimiter({ store, perMinute: RATE_PER_MIN, perDay: RATE_PER_DAY });

function send(res, status, payload, extra = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(body), ...extra });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve) => {
    let size = 0;
    const chunks = [];
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    req.on('data', (c) => {
      if (done) return;
      size += c.length;
      if (size > MAX_BODY) { finish({ tooLarge: true }); return; }
      chunks.push(c);
    });
    req.on('end', () => finish({ raw: Buffer.concat(chunks).toString('utf8') }));
    req.on('error', () => finish({ error: true }));
  });
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || '';
  const cors = corsHeaders(origin, ALLOWED_ORIGINS);
  const url = new URL(req.url, 'http://localhost');

  if (req.method === 'OPTIONS') {
    const r = preflight(origin, ALLOWED_ORIGINS);
    res.writeHead(r.status, Object.fromEntries(r.headers));
    res.end();
    return;
  }

  if (!cors) {
    send(res, 403, { error: { code: 'origin_not_allowed', message: '来源不在允许列表内。' } });
    return;
  }

  if (url.pathname === '/api/health') {
    send(res, 200, { ok: true, hasKey: Boolean(API_KEY), models: ALLOWED_MODELS, rate: { perMinute: RATE_PER_MIN, perDay: RATE_PER_DAY }, store: store.kind }, cors);
    return;
  }

  if (url.pathname !== '/api/chat') {
    send(res, 404, { error: { code: 'not_found', message: '没有这个接口。' } }, cors);
    return;
  }

  if (req.method !== 'POST') {
    send(res, 405, { error: { code: 'method_not_allowed', message: '只接受 POST。' } }, { ...cors, allow: 'POST, OPTIONS' });
    return;
  }

  if (!API_KEY) {
    send(res, 500, { error: { code: 'no_key', message: '服务端没有配置 DEEPSEEK_API_KEY。' } }, cors);
    return;
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
  const limit = await hit(ip);
  if (!limit.ok) {
    send(res, 429, { error: { code: 'rate_limited', message: '请求太频繁，稍后再试。', scope: limit.scope } }, { ...cors, 'retry-after': String(limit.retryAfter) });
    return;
  }

  const body = await readBody(req);
  if (body.tooLarge) {
    send(res, 413, { error: { code: 'body_too_large', message: `请求体超过 ${MAX_BODY} 字节。` } }, cors);
    req.resume(); // 把剩下的数据读掉，保证 413 能被客户端收到
    return;
  }
  if (body.error) {
    send(res, 400, { error: { code: 'body_read_error', message: '读取请求体失败。' } }, cors);
    return;
  }

  let parsedBody;
  try { parsedBody = JSON.parse(body.raw); } catch (e) {
    send(res, 400, { error: { code: 'bad_json', message: '请求体不是合法 JSON。' } }, cors);
    return;
  }

  const parsed = parseChatInput(parsedBody);
  if (parsed.error) {
    send(res, 400, { error: parsed.error }, cors);
    return;
  }

  // 只记长度与模型，不记内容
  console.log(`[chat] model=${parsed.value.model} system=${parsed.value.system.length} user=${parsed.value.user.length}`);

  const result = await callUpstream({ input: parsed.value, apiKey: API_KEY, baseUrl: BASE_URL });
  if (result.error) {
    send(res, result.status, { error: result.error }, cors);
    return;
  }
  send(res, 200, result.value, { ...cors, 'x-ratelimit-remaining': String(limit.remaining ?? '') });
});

server.listen(PORT, () => {
  console.log(`BFF listening on http://localhost:${PORT}`);
  console.log(`  upstream: ${BASE_URL}  key: ${API_KEY ? '已配置' : '缺失'}`);
  console.log(`  cors: ${ALLOWED_ORIGINS}  rate: ${RATE_PER_MIN}/min, ${RATE_PER_DAY}/day`);
});
