# contracts/ 接口契约

三方共用的数据结构。**改字段必须同时改本目录、前端渲染、评测断言**，否则会出现「前端读不到、评测测不出」。

| 文件 | 用途 | 负责人 |
|---|---|---|
| `analysis.schema.json` | 结论结构的形式定义（JSON Schema） | 陆星野 |
| `analysis.example.json` | 一份合法示例，前端可据此写渲染 | 陆星野 |
| `analysis.invalid.json` | 五组应被拒绝的返回，评测集直接用 | 陆星野 |
| `validate.mjs` | 零依赖校验器，前端与测试共用 | 陆星野 |
| `test-contract.mjs` | 契约自测：示例通过 + 非法全拒 | 苏禾 |

---

## 结论结构（v1）

```json
{
  "v": 1,
  "strength": "把混乱收进秩序",
  "evidence": [
    { "year": 2021, "event": "用 42 个组件把七零八落的界面收进一套规范", "why": "结构化拆解" },
    { "year": 2024, "event": "砍掉三个功能，留存从 11% 回到 19%", "why": "敢做减法" },
    { "year": 2018, "event": "访谈 40 位用户后被退稿 3 次，仍改到可用", "why": "能扛反复" }
  ],
  "openings": "用 AI 做决策，不做设计稿",
  "confidence": 0.72
}
```

### 硬约束

| 字段 | 规则 | 为什么 |
|---|---|---|
| `v` | 必须为 1 | 版本化，避免旧调用悄悄失效 |
| `strength` | 6–20 字，不用「具有」开头，不加句号 | 这是要印在大字上的，套话撑不住版面 |
| `evidence` | **恰好 3 条**，每条 `{year, event}` | 三条能排满一屏；少于三条显得没依据 |
| `year` | 1980–2100 的整数，且必须是档案里有的年份 | 防编造 |
| `event` | 8–40 字 | 太短没信息，太长放不下 |
| `openings` | 6–20 字 | 同上 |
| `confidence` | 0–1，可选 | 展示为百分比，让用户知道这是概率不是事实 |
| 全文 | **不许出现价格** | 价格只能来自商品 API |

---

## 怎么用

**前端渲染**（`app/phone.js` 的 `renderResult`）：

```js
const evHtml = ev.map((e) => {
  if (e && typeof e === 'object') {
    return `<div>${e.year} · ${e.event}${e.why ? ' <i>' + e.why + '</i>' : ''}</div>`;
  }
  return `<div>${e}</div>`;   // 兼容旧字符串格式
}).join('');
```

**校验**（任何拿到模型返回的地方）：

```js
import { validate, assertValid } from '../contracts/validate.mjs';

const r = validate(data);
if (!r.ok) {
  // 保留上一次结论，记录失败，不覆盖
  console.warn(r.errors);
} else {
  renderResult(data);
}
```

**评测集**：把 `analysis.invalid.json` 的每组 `payload` 喂给 `validate`，断言 `errors` 命中 `expected` 指定的字段。全部命中才算评测通过。

---

## 失败时怎么办

契约的作用不只是「规范」，更是「失败时知道怎么退」：

| 情况 | 处理 |
|---|---|
| 字段齐全 | 正常渲染 |
| 缺 `why`、`confidence` | 可接受，渲染时省略 |
| evidence 少于 3 条 | 拒绝，保留上次结论 |
| 整体不可解析 | 拒绝，展示可读错误 + 重试 + 用演示结果 |
| 出现价格 | 拒绝，记一次违规（选型场景尤其重要） |

**原则：宁可显示上一次的结论，也不要显示一个残缺的新结论。**

---

## 改契约的流程

1. 在 `analysis.schema.json` 改字段，`v` 递增
2. 更新 `analysis.example.json` 与 `analysis.invalid.json`
3. 跑 `node contracts/test-contract.mjs`，示例通过、非法全拒
4. 同步改 `app/phone.js` 的渲染与提示词
5. 通知评测集维护者补断言
