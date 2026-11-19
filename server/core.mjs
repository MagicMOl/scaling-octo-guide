// 共享核心：校验、限流、转发、错误映射。不依赖任何运行时专有 API（Node 18+ / Workers 通用）。
export const ALLOWED_MODELS = ['deepseek-chat', 'deepseek-reasoner'];
export const MAX_SYSTEM = 20000;
export const MAX_USER = 40000;
export const DEFAULT_MODEL = 'deepseek-chat';

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };

export function json(status, payload, extra = {}) {
  return new Response(JSON.stringify(payload), { status, headers: { ...JSON_HEADERS, ...extra } });
}

export function corsHeaders(origin, allowed) {
  const allow = allowed && allowed.trim() ? allowed.trim() : '*';
  const ok = allow === '*' || allow.split(',').map((s) => s.trim()).includes(origin || '');
  if (!ok) return null;
  return {
    'access-control-allow-origin': allow === '*' ? '*' : origin,
    'access-control-allow-methods': 'POST, GET, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'origin',
  };
}

export function preflight(origin, allowed) {
  const h = corsHeaders(origin, allowed);
  if (!h) return new Response(null, { status: 403 });
  return new Response(null, { status: 204, headers: h });
}

export function parseChatInput(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { error: { code: 'invalid_body', message: 'Body 必须是 JSON 对象。' } };
  }
  const { system, user, model, temperature } = raw;
  if (typeof system !== 'string' || !system.trim()) {
    return { error: { code: 'invalid_system', message: '缺少 system。' } };
  }
  if (typeof user !== 'string' || !user.trim()) {
    return { error: { code: 'invalid_user', message: '缺少 user。' } };
  }
  if (system.length > MAX_SYSTEM) {
    return { error: { code: 'system_too_long', message: `system 超过 ${MAX_SYSTEM} 字符。` } };
  }
  if (user.length > MAX_USER) {
    return { error: { code: 'user_too_long', message: `user 超过 ${MAX_USER} 字符。` } };
  }
  const m = model || DEFAULT_MODEL;
  if (!ALLOWED_MODELS.includes(m)) {
    return { error: { code: 'invalid_model', message: `不支持的模型：${m}` } };
  }
  let t = Number(temperature);
  if (!Number.isFinite(t)) t = 0.6;
  t = Math.min(2, Math.max(0, t));
  return { value: { system, user, model: m, temperature: t } };
}

// 限流：存储可插拔（内存 / Redis），存储故障时退回本进程内存，避免整站不可用
export function createLikimitMemory({ perMinute = 20, perDay = 200, now = () => Date.now() } = {}) {
  const buckets = new Map();
  return function hitMemory(key) {
    const t = now();
    let b = buckets.get(key);
    if (!b) { b = { min: 0, day: 0, minuteStart: t, dayStart: t }; buckets.set(key, b); }
    if (t - b.minuteStart >= 60000) { b.minuteStart = t; b.min = 0; }
    if (t - b.dayStart >= 86400000) { b.dayStart = t; b.day = 0; }
    if (b.min >= perMinute) return { ok: false, scope: 'minute', retryAfter: Math.ceil((60000 - (t - b.minuteStart)) / 1000) };
    if (b.day >= perDay) return { ok: false, scope: 'day', retryAfter: Math.ceil((86400000 - (t - b.dayStart)) / 1000) };
    b.min += 1; b.day += 1;
    return { ok: true, remaining: perMinute - b.min };
  };
}

export function createLimiter({ store, perMinute = 20, perDay = 200 } = {}) {
  const memory = createLikimitMemory({ perMinute, perDay });
  return async function hit(id) {
    if (!store || store.kind === 'memory') return memory(id);
    const keyBase = 'rl:' + id;
    try {
      const m = await store.incr(keyBase + ':m', 60);
      const d = await store.incr(keyBase + ':d', 86400);
      if (m.count > perMinute) return { ok: false, scope: 'minute', retryAfter: m.ttlSec || 60 };
      if (d.count > perDay) return { ok: false, scope: 'day', retryAfter: d.ttlSec || 86400 };
      return { ok: true, remaining: Math.max(0, perMinute - m.count) };
    } catch (e) {
      // 存储挂了：退回单进程限流，并在结果里标记，方便日志排查
      const r = memory(id);
      return { ...r, degraded: true };
    }
  };
}

export async function callUpstream({ input, apiKey, baseUrl, fetchImpl = fetch, timeoutMs = 60000 }) {
  const url = (baseUrl || 'https://api.deepseek.com').replace(/\/+$/, '') + '/chat/completions';
  const body = {
    model: input.model,
    temperature: input.temperature,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: input.system },
      { role: 'user', content: input.user },
    ],
  };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res;
  try {
    res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + apiKey },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch (e) {
    return { status: 504, error: { code: 'upstream_timeout', message: '上游超时或不可达。' } };
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    // 不把上游原文透传给前端，避免回显密钥片段
    const map = { 401: 'upstream_auth', 402: 'upstream_quota', 429: 'upstream_rate' };
    const code = map[res.status] || (res.status >= 500 ? 'upstream_error' : 'upstream_rejected');
    const messages = {
      upstream_auth: '上游鉴权失败（服务端 Key 无效或已过期）。',
      upstream_quota: '上游账户余额不足。',
      upstream_rate: '上游限流，请稍后再试。',
      upstream_error: '上游服务异常。',
      upstream_rejected: '上游拒绝了这次请求。',
    };
    return { status: res.status === 429 ? 429 : 502, error: { code, message: messages[code] } };
  }

  let payload;
  try { payload = await res.json(); } catch (e) {
    return { status: 502, error: { code: 'upstream_bad_json', message: '上游返回的不是 JSON。' } };
  }
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    return { status: 502, error: { code: 'upstream_empty', message: '上游没有返回内容。' } };
  }
  let data;
  try { data = JSON.parse(content); } catch (e) {
    return { status: 502, error: { code: 'model_not_json', message: '模型返回的不是合法 JSON。' } };
  }
  return {
    status: 200,
    value: { data, usage: payload.usage || null, model: payload.model || input.model },
  };
}
