// 结论契约校验器：零依赖，前端与评测集共用
// 用法：import { validate } from './validate.mjs'

const LIMITS = {
  strength: [6, 20],
  openings: [6, 20],
  event: [8, 40],
  why: [0, 12],
  evidenceCount: 3,
};

const isStr = (v) => typeof v === 'string';

export function validate(obj) {
  const errors = [];
  const push = (field, message) => errors.push({ field, message });

  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return { ok: false, errors: [{ field: '$', message: '结论必须是对象' }] };
  }

  if (obj.v !== 1) push('v', '版本必须为 1，收到 ' + JSON.stringify(obj.v));

  for (const key of ['strength', 'openings']) {
    const val = obj[key];
    const [min, max] = LIMITS[key];
    if (!isStr(val)) { push(key, '必须是字符串'); continue; }
    const n = Array.from(val.trim()).length;
    if (n < min || n > max) push(key, `长度需在 ${min} 到 ${max} 字之间，现在 ${n} 字`);
    if (/[。！？]$/.test(val.trim())) push(key, '结尾不要加句号或感叹号');
    if (/^(具有|建议|可以尝试)/.test(val.trim())) push(key, '不要用「具有/建议/可以尝试」这类套话开头');
  }

  const ev = obj.evidence;
  if (!Array.isArray(ev)) {
    push('evidence', '必须是数组');
  } else if (ev.length !== LIMITS.evidenceCount) {
    push('evidence', `必须是 ${LIMITS.evidenceCount} 条，现在 ${ev.length} 条`);
  } else {
    ev.forEach((item, i) => {
      const at = `evidence[${i}]`;
      if (isStr(item)) { push(at, '必须是对象 {year, event}，不能是字符串'); return; }
      if (!item || typeof item !== 'object') { push(at, '必须是对象'); return; }
      const y = item.year;
      if (!Number.isInteger(y) || y < 1980 || y > 2100) push(at + '.year', '必须是 1980–2100 的整数');
      if (!isStr(item.event)) {
        push(at + '.event', '必须是字符串');
      } else {
        const n = Array.from(item.event.trim()).length;
        if (n < LIMITS.event[0] || n > LIMITS.event[1]) push(at + '.event', `长度需在 ${LIMITS.event[0]} 到 ${LIMITS.event[1]} 字之间，现在 ${n} 字`);
      }
      if (item.why !== undefined) {
        if (!isStr(item.why)) push(at + '.why', '必须是字符串');
        else if (Array.from(item.why).length > LIMITS.why[1]) push(at + '.why', `不超过 ${LIMITS.why[1]} 字`);
      }
    });
  }

  if (obj.confidence !== undefined) {
    const c = obj.confidence;
    if (typeof c !== 'number' || Number.isNaN(c) || c < 0 || c > 1) push('confidence', '必须是 0 到 1 的数字');
  }

  // 通用兜底：结论里不许出现价格，价格只能来自商品 API
  const text = JSON.stringify(obj);
  if (/[¥￥]\s?\d|\d+\s?元/.test(text)) push('$', '结论中不允许出现价格');

  return { ok: errors.length === 0, errors };
}

export function assertValid(obj, label = 'conclusion') {
  const r = validate(obj);
  if (!r.ok) {
    const msg = r.errors.map((e) => `${e.field}: ${e.message}`).join('; ');
    throw new Error(`[${label}] 结论不符合契约 → ${msg}`);
  }
  return obj;
}
