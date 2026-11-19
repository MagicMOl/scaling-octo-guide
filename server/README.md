# BFF（把 DeepSeek Key 挪到服务端）

前端不再直接持有 API Key。这个目录是一个薄转发层：校验请求 → 限流 → 转发 DeepSeek → 只返回结构化结果。

```
浏览器原型 ──POST /api/chat──▶ BFF ──Bearer Key──▶ api.deepseek.com
                                │
                                └─ Key 只在服务端内存/环境变量里
```

## 本地跑

```powershell
.\server\run-local.ps1 -Key "sk-你的key"
```

或者直接：

```powershell
$env:DEEPSEEK_API_KEY="sk-你的key"
node server/node-server.mjs
```

启动后：`http://localhost:8787/api/chat`

然后在原型里：底片页 →「未连接 · 点这里设置」→ **服务地址** 填 `http://localhost:8787/api/chat` → 保存。状态会变成「BFF · localhost:8787」。

## 部署

### Cloudflare Workers（推荐，免费额度够用）

```powershell
cd server
npm i -D wrangler
npx wrangler login
npx wrangler secret put DEEPSEEK_API_KEY
npx wrangler deploy
```

或直接跑 `.\server\deploy-cloudflare.ps1`。

部署完把 `https://<名字>.<账号>.workers.dev/api/chat` 填到原型的服务地址里。

### Docker / 任意 Node 主机

```bash
docker build -t dipian-bff server/
docker run -p 8787:8787 -e DEEPSEEK_API_KEY=sk-xxx dipian-bff
```

也可以扔到 Render / Railway / 自己的 VPS，只要有 Node 18+。

## 环境变量

| 变量 | 默认 | 说明 |
|---|---|---|
| `DEEPSEEK_API_KEY` | — | **必填**，只在服务端 |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` | 换代理或自建网关时改这里 |
| `PORT` | `8787` | Node 版监听端口 |
| `ALLOWED_ORIGINS` | `*` | 逗号分隔的来源白名单，生产环境务必收紧 |
| `RATE_PER_MIN` | `20` | 每 IP 每分钟上限 |
| `RATE_PER_DAY` | `200` | 每 IP 每天上限 |
| `MAX_BODY_BYTES` | `65536` | 请求体上限 |

## 接口

`POST /api/chat`

```json
{ "system": "...", "user": "...", "model": "deepseek-chat", "temperature": 0.6 }
```

成功：

```json
{ "data": { ...模型返回的 JSON... }, "usage": { "prompt_tokens": 812, "completion_tokens": 96 }, "model": "deepseek-chat" }
```

失败统一是 `{ "error": { "code": "...", "message": "中文可读信息" } }`，状态码 400 / 405 / 413 / 429 / 502 / 504。

`GET /api/health` 返回服务状态（不暴露 Key）。

## 已经做了的安全处理

- Key 只在服务端；上游 401 会被映射成 `upstream_auth`，**不会把上游原文回显给前端**；
- 模型白名单（`deepseek-chat` / `deepseek-reasoner`），请求体与消息长度有上限；
- 每 IP 双窗口限流（分钟 / 天），超限返回 429 + `retry-after`；
- CORS 白名单可配，默认 `*` 仅适合本地与内测；
- 日志只记模型名与消息长度，不记内容。

## 还没做（上线前要补）

- 限流是**单进程内存**：多实例部署要用 Redis / KV 才能全局一致；
- 没有鉴权：谁都能调这个接口，生产要加登录态或签名；
- 没有审计与告警、没有成本熔断。

## 测试

```bash
node server/test.mjs        # 假上游 + 真服务：13 项断言
node tools/test-bff-e2e.mjs # 浏览器 → BFF → 假上游（需要 Playwright）
```
