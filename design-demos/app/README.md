# app/ 模块说明

`dir-1-v7.html` 是拆分后的壳，只负责结构：引用样式、注入模板、按序加载脚本。

## 文件与负责人

| 文件 | 行数 | 内容 | 负责人 |
|---|---|---|---|
| `dir-1-v7.html` | 60 | 展板骨架 + `#mobile` 容器 + 脚本引用 | 顾飞 |
| `app/tokens.css` | 25 | 设计变量（颜色、字号） | 叶知秋 |
| `app/styles.css` | 560 | 全部样式，已把 4 个主色换成变量 | 顾飞 |
| `app/templates.js` | 8 个模板 | 八屏结构 + 4 张内嵌照片 | 沈亦 |
| `app/utils.js` | 21 | 撕纸多边形工具 | 顾飞 |
| `app/cover.js` | 193 | 封面路口与速写人物（当前未使用，保留） | 叶知秋 |
| `app/phone.js` | 748 | 手机骨架、七屏逻辑、AI 调用、立项、物流 | 顾飞 |
| `app/mobile.js` | 64 | 单机模式、滑动、缩放 | 沈亦 |
| `app/i18n.js` | 441 | 中英词条与切换、启动 | 林小满 |

## 加载顺序（不能乱）

```
templates.js   → 先注入 <template>，否则后面查不到
utils.js       → tearAll 立即执行，只依赖 DOM
cover.js       → 定义函数，不执行
phone.js       → 定义 buildPhone，不执行
mobile.js      → 定义 buildMobile
i18n.js        → 末尾启动：buildPhones() / buildMobile()
```

都是普通 `<script>`，共享全局作用域，**不需要构建工具，直接双击 HTML 也能跑**。

## 一个已知的结构问题

`app/phone.js` 里，AI 读底片、立项、物流追踪这些函数都**嵌套在 `buildPhone(phone)` 内部**。这是原型的写法——每个手机实例有自己的一整套闭包状态。

好处是隔离干净，坏处是**没法按屏拆文件**。要真正拆成 `film.js` / `project.js` / `tracking.js`，需要把这些内层函数提到顶层，改为显式接收 `phone` 参数。

已验证：当前切点都在顶层语句边界，每个文件都能独立解析，运行无报错。

## 修改约定

1. **一个文件一个负责人**，跨文件改动先在群里说
2. `templates.js` 与 `styles.css` 必须同步改——改类名不改样式，界面就塌
3. 改 `tokens.css` 的变量名会影响全站，改前搜索引用处
4. 每次合并前跑一遍 `tools/check-v7-interact.mjs`，四项通过才算没回归
