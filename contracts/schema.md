# contracts/schema.md

数据模型。**改表结构必须同步改本文件、`migrations/` 与前端读取处**，否则会出现"数据写进去了但读不出来"。

- 落地文件：`migrations/001_init.sql`（Supabase 直接执行）
- 前端现状：数据在 `localStorage`，本模型是 P1 迁移目标
- 负责人：韩东

---

## 一、七张表

| 表 | 存什么 | 对应本地键 |
|---|---|---|
| `profiles` | 用户档案：显示名、语言 | `dipian.lang` |
| `film_blocks` | 年份块：一年一条，身份、城市、一句话 | `dipian.logs` 的年份部分 |
| `records` | 记录条目：每年若干条 | `dipian.logs` 的条目部分 |
| `analyses` | 分析结论，payload 严格按 `analysis.schema.json` | `dipian.conclusion` |
| `projects` | 立项：需求三问、两版方案、当前状态 | `dipian.req` |
| `orders` | 下单与物流：物品、金额、节点 | `dipian.order` |
| `ai_calls` | 调用台账：只记元数据，不记正文 | 无（新增） |

**不上的云**：`dipian.apiKey`、`dipian.endpoint`、`dipian.model` 属于设备本地配置，永远不进数据库。

---

## 二、关键设计决定

### 1 · 年份块与记录分两张表

一块 = 一年，一条 = 一件事。合在一张表会让"这一年空着"和"这一年没有记录"无法区分，而空态正是首页引导的关键。

```sql
film_blocks: unique (user_id, year)   -- 一个人一年只能有一块
records:     block_id → film_blocks   -- 删除块级联删记录
```

### 2 · 三条导入通道共用 `records`

用 `source` 区分来源：`manual` / `ai` / `import_photo` / `import_calendar` / `import_resume`。

好处：导入的内容和手写的走同一条写入路径、同一个列表、同一种撤销。这也是专利里"双通道写入"的落地方式——人工与模型写同一张表，靠 `source` 溯源。

### 3 · 金额用整数分

`amount_cents int`，不用 float。`¥27,197` 存 `2719700`。

### 4 · 结论存 `jsonb`，但落库前必须校验

`analyses.payload` 是 `contracts/analysis.schema.json` 的实例。服务端在写库前调用 `validate()`，不合法就写 `ok = false` 并把错误放进 `error`，**不覆盖上一条有效结论**。

### 5 · `ai_calls` 是成本熔断的依据

只存 `kind / model / tokens / cost_cents / ok / error`，**不存用户正文**。`today_cost_cents(uid)` 给熔断用：超过日预算直接拒绝并降级。

---

## 三、安全

所有表开 RLS，策略统一：

```sql
using (user_id = auth.uid()) with check (user_id = auth.uid())
```

- 读别人的数据 → 返回空结果
- 写别人的数据 → 403
- `profiles` 用 `id = auth.uid()`

**没有任何"管理员可读全部"的策略。** 需要运营数据时走聚合视图，不碰明细。

---

## 四、删除

| 场景 | 行为 |
|---|---|
| 删一条记录 | 写 `deleted_at`，列表不显示，30 天后物理删 |
| 删一个年份块 | 级联删该年所有记录（软删） |
| 删账号 | `profiles.deleted_at = now()`，24 小时内 `purge_deleted_profiles()` 级联硬删 |

`purge_deleted_profiles()` 只允许由定时任务以 service role 调用，不给前端。

---

## 五、迁移顺序（对应开发计划 P1）

| 步 | 做什么 | 谁 |
|---|---|---|
| 1 | 执行 `001_init.sql` | 韩东 |
| 2 | 账号：magic link，匿名用户首次登录时升级 | 韩东 |
| 3 | 首次登录合并本地数据（冲突按 `updated_at` 取新） | 沈亦 |
| 4 | 读写切到云端，本地只留缓存 | 顾飞 |
| 5 | 导出 JSON / 删除账号入口 | 韩东 + 林小满 |

**第 3 步是唯一容易丢数据的地方**：合并时按 `(user_id, year)` 去重，同年冲突取 `updated_at` 较新的，但**两边的记录条目要全部保留并去重**，不能整块覆盖。

---

## 六、读写的三条约束

1. **前端不做跨表 join**：需要"年份 + 记录"的地方一次请求拿块列表，记录按需分页拉
2. **写入必须带 `source`**：漏了会污染溯源，默认 `manual`
3. **删除优先软删**：物理删只在定时任务里发生

---

## 七、索引为什么是这几个

| 索引 | 服务的查询 |
|---|---|
| `(user_id, year desc)` | 底片页按年倒序 |
| `(user_id, block_id)` 部分索引 | 打开某一年看记录 |
| `(user_id, occurred_on)` | 导入后按时间归年 |
| `(user_id, created_at desc)` on `analyses` | 只取最新一条结论 |
| `(user_id, created_at desc)` on `ai_calls` | 当日花费统计 |

部分索引 `where deleted_at is null` 让软删的行不占索引，列表查询更快。

---

## 八、与契约的关系

```
contracts/analysis.schema.json  ──①──▶  analyses.payload
        │                                    ▲
        │                                    │
        └──② validate.mjs ──────────────────┘
                     ▲
                     │
              eval/run.mjs（评测断言）
```

① 结构定义 ② 落库前校验 ③ 评测只认这个结构。三处共用同一份定义，改一处三处同步。
