// Cloudflare Workers 入口：与 Node 版共用 core.mjs
// 部署：cd server && npx wrangler deploy   （先 wrangler secret put DEEPSEEK_API_KEY）
import {
  parseChatInput, createLimiter, callUpstream, json, corsHeaders, preflight, ALLOWED_MODELS,
} from './core.mjs';
import { pickStore } from './stores.mjs';

let cached = null;
function limiterFor(env) {
  if (!cached || cached.key !== env.UPSTASH_REDIS_REST_URL) {
    const store = pickStore(env);
    cached = {
      key: env.UPSTASH_REDIS_REST_URL,
      store,
      hit: createLimiter({
        store,
        perMinute: Number(env.RATE_PER_MIN || 20),
        perDay: Number(env.RATE_PER_DAY || 200),
      }),
    };
  }
  return cached;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('origin') || '';
    const allowed = env.ALLOWED_ORIGINS || '*';
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return preflight(origin, allowed);

    const cors = corsHeaders(origin, allowed);
    if (!cors) return json(403, { error: { code: 'origin_not_allowed', message: '来源不在允许列表内。' } });

    if (url.pathname === '/api/health') {
      return json(200, {
        ok: true,
        hasKey: Boolean(env.DEEPSEEK_API_KEY),
        models: ALLOWED_MODELS,
        runtime: 'cloudflare-worker',
        store: L.store.kind,
      }, cors);
    }

    if (url.pathname !== '/api/chat') {
      return json(404, { error: { code: 'not_found', message: '没有这个接口。' } }, cors);
    }

    if (request.method !== 'POST') {
      return json(405, { error: { code: 'method_not_allowed', message: '只接受 POST。' } }, { ...cors, allow: 'POST, OPTIONS' });
    }

    if (!env.DEEPSEEK_API_KEY) {
      return json(500, { error: { code: 'no_key', message: 'Worker 没有配置 DEEPSEEK_API_KEY。' } }, cors);
    }

    const ip = request.headers.get('cf-connecting-ip') || 'unknown';
    const L = limiterFor(env);
    const limit = await L.hit(ip);
    if (!limit.ok) {
      return json(429, { error: { code: 'rate_limited', message: '请求太频繁，稍后再试。', scope: limit.scope } },
        { ...cors, 'retry-after': String(limit.retryAfter) });
    }

    const text = await request.text();
    if (text.length > 65536) {
      return json(413, { error: { code: 'body_too_large', message: '请求体过大。' } }, cors);
    }

    let body;
    try { body = JSON.parse(text); } catch (e) {
      return json(400, { error: { code: 'bad_json', message: '请求体不是合法 JSON。' } }, cors);
    }

    const parsed = parseChatInput(body);
    if (parsed.error) return json(400, { error: parsed.error }, cors);

    const result = await callUpstream({
      input: parsed.value,
      apiKey: env.DEEPSEEK_API_KEY,
      baseUrl: env.DEEPSEEK_BASE_URL,
    });
    if (result.error) return json(result.status, { error: result.error }, cors);
    return json(200, result.value, cors);
  },
};
