# contracts/api.md

前端、BFF、数据库之间的接口约定。**改端点或字段必须同步改本文件、`app/api.js` 与服务端**。

- 负责人：韩东
- 现状：只有 `POST /api/chat` 与 `GET /api/health` 已实现，其余为 P1–P4 目标
- 落地文件：`server/core.mjs`、`server/node-server.mjs`、`server/worker.mjs`

---

## 一、通用约定

### 地址

| 环境 | Base URL |
|---|---|
| 本地 | `http://127.0.0.1:8787` |
| 线上 | `https://api.<domain>` |

前端通过 `store.get('dipian.endpoint')` 覆盖，未配置时用本地默认值。

### 请求头

```
content-type: application/json
authorization: Bearer <supabase_access_token>   // 需要登录的端点
idempotency-key: <uuid>                          // 写入类端点必带
```

### 成功响应

```json
{ "ok": true, "data": { ... }, "usage": { "prompt_tokens": 812, "completion_tokens": 156 } }
```

### 失败响应（统一结构）

```json
{ "ok": false, "error": { "code": "rate_limited", "message": "太频繁，请 42 秒后重试", "retry_after": 42 } }
```

**所有错误都带 `code`**，前端只按 `code` 分支，不解析 `message` 文本——文案要能改。

### 限流头

```
x-ratelimit-limit: 20
x-ratelimit-remaining: 7
x-ratelimit-reset: 42
```

---

## 二、端点清单

| 方法 | 路径 | 用途 | 状态 |
|---|---|---|---|
| GET | `/api/health` | 存活与版本 | ✅ 已实现 |
| POST | `/api/chat` | 通用模型代理 | ✅ 已实现 |
| POST | `/api/analyze` | 档案分析（服务端校验 + 落库） | ⬜ P4 |
| POST | `/api/plan` | 立项两版方案 | ⬜ P4 |
| POST | `/api/import/check` | 导入前校验与去重建议 | ⬜ P3 |
| POST | `/api/export` | 导出全部数据 | ⬜ P1 |
| DELETE | `/api/account` | 删除账号 | ⬜ P1 |

**CRUD 不走 BFF**。年份块、记录、项目、订单的增删改查由前端直接请求 Supabase REST，靠 RLS 兜底。理由：这些操作不需要模型，过一层 BFF 只是多一跳。

---

## 三、逐个端点

### GET /api/health

```json
{
  "ok": true,
  "hasKey": true,
  "models": ["deepseek-chat", "deepseek-reasoner"],
  "rate": { "perMinute": 20, "perDay": 200 },
  "store": "memory"
}
```

`store` 为 `memory` 表示限流只在单进程内有效（多实例下会各算各的），生产环境应为 `upstash`。

### POST /api/chat（已实现）

请求：

```json
{ "system": "…", "user": "…", "model": "deepseek-chat", "temperature": 0.6 }
```

响应：

```json
{ "ok": true, "data": { "text": "{\"v\":1,…}" }, "usage": { "prompt_tokens": 812, "completion_tokens": 156 } }
```

- 服务端强制 `response_format: json_object`
- 模型白名单：`deepseek-chat`、`deepseek-reasoner`
- Key 只在服务端，前端拿不到

### POST /api/analyze（P4）

请求：

```json
{
  "blocks": [
    { "year": 2021, "identity": "产品设计", "city": "杭州", "line": "…", "records": ["…"] }
  ],
  "locale": "zh"
}
```

响应：

```json
{
  "ok": true,
  "data": {
    "v": 1,
    "strength": "把混乱收进秩序",
    "evidence": [{ "year": 2021, "event": "…", "why": "…" }],
    "openings": "用 AI 做决策，不做设计稿",
    "confidence": 0.72
  },
  "usage": { "prompt_tokens": 812, "completion_tokens": 156 },
  "cost_cents": 3
}
```

**服务端必须做的三件事**：

1. 用 `contracts/validate.mjs` 校验返回，不合法返回 `bad_model_output`，**不落库**
2. 校验 `evidence[].year` 都在 `blocks` 的年份集合里，否则返回 `hallucinated_year`
3. 写 `ai_calls`，算 `cost_cents`，超日预算返回 `budget_exceeded`

### POST /api/plan（P4）

请求：

```json
{ "need": { "what": "…", "who": "…", "when": "…" }, "blocks": [ … ] }
```

响应：

```json
{
  "ok": true,
  "data": {
    "plans": [
      { "id": "A", "name": "…", "why": "…", "scores": { "concept": 8.5, "cost": 7.0, "risk": 6.5 } },
      { "id": "B", "name": "…", "why": "…", "scores": { "concept": 7.0, "cost": 8.0, "risk": 7.5 } }
    ],
    "recommended": "A",
    "summary": "一句话结论"
  }
}
```

**约束**：`plans` 必须恰好 2 条；`recommended` 必须是 A 或 B；分数 0–10，保留一位小数。

### POST /api/import/check（P3）

端上解析完照片/日历/简历，**只把元数据发上来**，不要发图片。

请求：

```json
{
  "items": [
    { "kind": "photo", "taken_at": "2018-05-03T12:00:00+08:00", "hint": "海边" }
  ]
}
```

响应：

```json
{
  "ok": true,
  "data": {
    "suggested": [{ "year": 2018, "count": 37, "sample": ["海边", "团队合影"] }],
    "duplicates": 3
  }
}
```

### POST /api/export（P1）

返回一个 JSON 文件流，包含该用户全部数据：

```json
{ "exported_at": "2026-11-28T…", "profile": {…}, "blocks": […], "records": […], "projects": […], "orders": […], "analyses": […] }
```

### DELETE /api/account（P1）

```json
{ "ok": true, "data": { "purge_after": "2026-11-29T…" } }
```

打 `deleted_at` 标记，24 小时内物理删除。响应里告诉用户确切时间。

---

## 四、错误码

### 400 参数类（客户端问题，先于服务端配置暴露）

| code | 含义 |
|---|---|
| `bad_request` | 请求体不是合法 JSON，或读取失败 |
| `invalid_body` | 请求体不是对象 |
| `invalid_system` / `invalid_user` | `system` / `user` 缺失或不是字符串 |
| `system_too_long` / `user_too_long` | 超出长度上限 |
| `invalid_model` | 模型不在白名单（`deepseek-chat`、`deepseek-reasoner`） |

### 其余状态码

| code | HTTP | 含义 | 前端该做什么 |
|---|---|---|---|
| `unauthorized` | 401 | 未登录或 token 过期 | 跳登录 |
| `origin_not_allowed` | 403 | 来源不在 CORS 白名单 | 开发期错误，查 `ALLOWED_ORIGINS` |
| `forbidden` | 403 | 越权（RLS 拒绝） | 提示无权限 |
| `not_found` | 404 | 路径或资源不存在 | 回列表 |
| `method_not_allowed` | 405 | 方法用错 | 开发期错误 |
| `payload_too_large` | 413 | 请求体超过 `MAX_BODY_BYTES` | 截断或分批 |
| `rate_limited` | 429 | 触发限流 | 按 `retry-after` 倒计时 |
| `budget_exceeded` | 429 | 当日预算用尽 | 提示明天再试，给演示结果 |
| `upstream_timeout` | 504 | 模型超时 | 重试一次，再失败给演示 |
| `upstream_error` | 502 | 上游异常 | 同上 |
| `upstream_bad_json` / `upstream_empty` / `model_not_json` | 502 | 上游返回不可用 | 保留上次结论 + 提示 |
| `bad_model_output` | 502 | 返回不符合契约 | 保留上次结论 + 提示 |
| `hallucinated_year` | 502 | 证据年份不在档案里 | 保留上次结论 + 提示 |
| `server_misconfigured` | 503 | 服务端没配 `DEEPSEEK_API_KEY` | 提示「服务未配置」，不要反复重试 |

**校验顺序是刻意的**：先 405 → 限流 → 413 → 400 → 最后才 503。

理由：`server_misconfigured` 是运维问题，不是用户问题。如果它排在最前面，客户端参数错了也会看到「服务未配置」，排查方向会被带偏——这个顺序是被 `contracts/test-api.mjs` 测出来的，不是拍脑袋定的。

---

## 五、三个必须守住的规则

### 1 · 写入带幂等键

离线队列重放时，同一条请求可能发两次。服务端用 `idempotency-key` 去重，24 小时内相同键返回首次结果。

这条不做，断网恢复就会产生重复记录。

### 2 · 模型输出不信任

服务端拿到模型返回后，**必须**先过 `validate()`、再校验年份、再落库。前端的渲染容错不能替代服务端校验——有人直接打接口就绕过去了。

### 3 · 价格只能来自商品 API

`/api/plan` 与 `/api/analyze` 的返回里出现价格一律判失败（`bad_model_output`）。选型的报价必须由商品 API 提供，模型只给类别与理由。

---

## 六、前端封装约定

所有请求走 `app/api.js` 一个出口：

```js
// 统一处理：超时、错误码分支、幂等键、重试
export async function post(path, body, { idempotent = false, timeout = 25000 } = {}) { … }
```

- 超时默认 25 秒，`/api/chat` 这类长请求 60 秒
- 429 按 `retry_after` 自动重试一次
- 504 重试一次，再失败返回可读错误
- **不在组件里直接 `fetch`**

---

## 七、版本与兼容

- 端点路径不变时，**新增字段不视为破坏**
- 删除或改名字段，走 `/api/v2/...`
- 响应里带 `x-api-version: 1`，前端启动时校验一次，不匹配就在控制台告警
