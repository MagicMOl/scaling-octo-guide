// 限流计数器存储。契约：async incr(key, ttlSec) -> { count, ttlSec }
// 默认内存版（单进程）；多实例用 Upstash Redis REST（Node 与 Workers 都能用，零依赖）。

export function createMemoryStore() {
  const map = new Map();
  return {
    kind: 'memory',
    async incr(key, ttlSec) {
      const now = Date.now();
      let e = map.get(key);
      if (!e || now >= e.exp) {
        e = { n: 0, exp: now + ttlSec * 1000 };
        map.set(key, e);
      }
      e.n += 1;
      // 顺手清掉过期键，避免长跑内存涨
      if (map.size > 5000) {
        for (const [k, v] of map) if (now >= v.exp) map.delete(k);
      }
      return { count: e.n, ttlSec: Math.max(0, Math.ceil((e.exp - now) / 1000)) };
    },
  };
}

// Upstash Redis REST：POST /pipeline，命令走 JSON，不需要 npm 包
export function createUpstashStore({ url, token, fetchImpl = fetch }) {
  const base = url.replace(/\/+$/, '');
  return {
    kind: 'upstash',
    async incr(key, ttlSec) {
      const res = await fetchImpl(base + '/pipeline', {
        method: 'POST',
        headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
        body: JSON.stringify([
          ['INCR', key],
          ['EXPIRE', key, ttlSec, 'NX'],
          ['TTL', key],
        ]),
      });
      if (!res.ok) throw new Error('redis HTTP ' + res.status);
      const rows = await res.json();
      const count = Number(rows?.[0]?.result);
      const ttl = Number(rows?.[2]?.result);
      if (!Number.isFinite(count)) throw new Error('redis 返回异常');
      return { count, ttlSec: Number.isFinite(ttl) && ttl > 0 ? ttl : ttlSec };
    },
  };
}

// 根据环境变量选存储；配了 Upstash 就用共享存储，否则退回内存
export function pickStore(env) {
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return createUpstashStore({ url, token });
  if (env.RATE_STORE === 'upstash') {
    throw new Error('RATE_STORE=upstash 但缺少 UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN');
  }
  return createMemoryStore();
}
