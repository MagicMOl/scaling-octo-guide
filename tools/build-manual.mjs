// 生成软著《软件说明书》：A4 分页 HTML + PDF
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const SKILL = process.env.HUASHU_SKILL || path.resolve('node_modules', 'huashu-design');
const require = createRequire(path.join(SKILL, 'index.js'));
const { chromium } = require('playwright');

const NAME = '25号底片个人经历档案管理与项目孵化系统';
const VERSION = 'V1.0';
const SHOTS = path.resolve('softcopyright-output/shots');
const OUT = path.resolve('softcopyright-output');

const img = (f) => 'data:image/png;base64,' + fs.readFileSync(path.join(SHOTS, f)).toString('base64');

const sections = [
  {
    h: '一、软件概述',
    body: `
      <p>${NAME}（简称“25号底片”）是一款面向个人的经历整理与项目启动辅助软件。软件把用户多年分散的年度经历整理为结构化的档案，据此生成对个人能力与可开拓方向的分析，并把“想做的事”逐步推进为可执行的项目：明确需求、组建团队、了解投资信息、完成设备选型与采购，直至物流签收。</p>
      <p>软件的出发点是：多数人并不缺少能力，而是缺少一条把过去与下一步连接起来的路径。软件以“年份”为基本单位组织经历，以“项目”为基本单位推进行动，二者之间通过结构化的分析结论衔接。</p>
      <p>软件为单页 Web 应用，采用响应式布局，在桌面端以多设备展板形式呈现，在手机端自动切换为单设备浏览模式；界面支持中文与英文实时切换。</p>`,
  },
  {
    h: '二、运行环境',
    table: [
      ['项目', '要求'],
      ['客户端浏览器', 'iOS Safari 15 及以上；Chrome / Edge 100 及以上'],
      ['屏幕适配', '宽度 320 至 2560 像素，自动切换单设备与展板模式'],
      ['服务端（可选）', 'Node.js 18 及以上，或 Cloudflare Workers 运行时'],
      ['网络', '首次加载与分析功能需要网络；已加载内容可离线浏览'],
      ['本地存储', '浏览器 localStorage 与 IndexedDB，用于保存档案与偏好'],
    ],
  },
  {
    h: '三、主要功能',
    subs: [
      {
        t: '3.1 封面与导航',
        p: ['封面采用长曝光人群图像与静置标题的组合，下方为“轻触开始”入口。底部为四个一级导航：封面、底片、项目、我。手机端支持左右滑动切换一级页面。'],
      },
      {
        t: '3.2 个人经历档案',
        p: ['档案以自然年为基本单位，每年为一个独立区块，包含该年的身份、在做的事、所在城市、一句话概括、技能条目与若干条记录。区块之间不共享权重与计数。',
            '用户可在任一年份中追加记录条目，条目携带来源标记与写入时间。当年份没有记录时，界面显示空白引导与“补一条”入口；用户也可通过“新增一年”建立新的年份区块。'],
        img: ['02-film.png', '图 1  个人经历档案（按年分块，螺旋排列）'],
      },
      {
        t: '3.3 年份详情',
        p: ['点击任一年份区块，展开该年的详情：照片位、身份、所在城市与一句话概括，以及该年的技能水平条目与全部记录。用户可在此直接补记，或从该年份进入项目立项。'],
        img: ['03-year.png', '图 2  年份详情与补记'],
      },
      {
        t: '3.4 档案分析',
        p: ['软件将选定年份的档案压缩为结构化摘要，提交至语言模型，要求按约定字段返回结论：擅长的方向、三条带年份的证据、可开拓的方向与判断依据。返回结果经字段校验后渲染为结论卡片，并显示调用的模型名称与 token 用量。',
            '当网络异常或返回内容不符合结构约定时，软件保留上一次结论并给出可读错误，用户可重试或改用内置示例结果。'],
      },
      {
        t: '3.5 项目立项',
        p: ['立项页将需求录入拆为三项：想做什么、给谁用、什么时候。三项内容可直接编辑并保存在本机。',
            '点击“用 AI 生成”后，软件将三项需求与档案摘要一并提交，要求返回两版取向不同的方案、推荐项、概念、成本、风险三项评分以及一句结论。推荐的方案以强调边框与标记呈现，三项评分保留一位小数。',
            '若已生成过档案结论，立项页顶部会出现“来自底片的结论”提示条，用户可一键将可开拓方向填入“想做什么”。'],
        img: ['04-project.png', '图 3  项目立项：需求录入、两版方案与评审'],
      },
      {
        t: '3.6 团队组织架构',
        p: ['团队页以组织架构形式呈现两类成员：随项目常驻的 AI 成员与待招募的真人成员。两类成员在视觉上分层，可分别查看角色、技能水平与个人底片。'],
        img: ['05-team.png', '图 4  团队组织架构（AI 成员与真人成员分层）'],
      },
      {
        t: '3.7 投资信息展示',
        p: ['投资页仅作信息展示，向用户呈现本轮估值、出让比例、锁定期、认购进度、投资人构成与主要条款，不提供任何资金募集、撮合或支付功能。页面底部注明冷静期与资金托管的说明文字，仅供了解，不构成投资建议。'],
        img: ['06-invest.png', '图 5  投资信息展示'],
      },
      {
        t: '3.8 选型与下单',
        p: ['选型页按软件与硬件两类列出所需的开发工具与设备，逐项说明选型理由与规格。下单页对同一件硬件提供多家商家的报价与配送条件，用户切换商家时合计金额实时更新。',
            '确认下单后，页面切换为物流追踪视图：显示运单号与五个节点的时间轴，节点按时间顺序点亮；签收后订单状态记为已到货，并可跳转至个人页查看。'],
        img: ['08-order.png', '图 6  下单页：多商家比价与合计'],
        img2: ['09-track.png', '图 7  物流追踪与签收'],
      },
      {
        t: '3.9 双语与移动适配',
        p: ['软件内置中英文词条表，切换语言时遍历界面文本与属性完成替换；由脚本动态生成的弹层在渲染后自动套用同一规则。手机端自动切换为单设备模式，隐藏展板，保留完整交互。'],
        img: ['01-cover.png', '图 8  封面（手机端单设备模式）'],
      },
    ],
  },
  {
    h: '四、操作流程',
    list: [
      '第一步，打开软件进入封面，轻触开始。',
      '第二步，在底片页查看历年记录，点击任一年份查看详情并补记。',
      '第三步，在底片页点击“让 AI 读一遍”，获得能力结论与可开拓方向。',
      '第四步，进入项目页完成需求三问，生成两版方案与三维评审。',
      '第五步，依次查看团队、投资信息、选型与下单，确认采购。',
      '第六步，在物流视图查看运单节点，签收后返回个人页。',
    ],
  },
  {
    h: '五、技术特点',
    subs: [
      {
        t: '5.1 按年分块的档案模型',
        p: ['档案以自然年为区块单位，区块之间不共享权重与计数。构造模型输入时，每年压缩为定长摘要，参与拼接的年份按窗口选取，使输入规模由年数、年度条目上限与年份窗口共同决定，而不随记录总量增长。'],
      },
      {
        t: '5.2 结构化输出与失败降级',
        p: ['对话模型的返回被约束为固定字段的结构化数据。软件对返回内容执行字段校验，校验不通过时保留既有结论与既有档案，仅追加失败标记，并在下一轮输入到来时自动恢复，不中断使用。'],
      },
      {
        t: '5.3 双通道写入',
        p: ['用户补记与模型回写使用同一条写入路径，条目均携带来源标记与写入时间，确保人工订正与模型结论可以并存而互不覆盖。'],
      },
      {
        t: '5.4 服务端转发与限流',
        p: ['软件提供可独立部署的服务端转发层，负责参数校验、模型白名单、按来源的请求频率限制与错误映射，密钥仅存于服务端，不随客户端下发。'],
      },
      {
        t: '5.5 运行时双语替换',
        p: ['界面文案由词典与规则共同翻译，切换语言后遍历文档文本节点与属性完成替换，并保留原文用于还原；对脚本动态插入的内容，通过变更监听自动套用同一规则。'],
      },
    ],
  },
  {
    h: '六、测试与验证',
    body: `<p>软件在开发过程中执行了以下验证，覆盖服务端、界面交互、生成能力与多端适配四个方面。服务端自动化用例共 18 项，全部通过；界面与交互以脚本化操作逐项核对。</p>`,
    table: [
      ['测试项', '方法', '结果'],
      ['服务端参数校验', '分别提交缺少字段、超长请求体、不支持的模型', '均被拒绝，返回 400 或 413 与可读错误'],
      ['请求频率限制', '同一来源连续请求超过阈值', '返回 429，并给出可重试时间'],
      ['上游异常映射', '模拟鉴权失败与上游服务异常', '统一映射为 502，且不回显密钥'],
      ['结构化输出校验', '模拟字段齐全、缺字段、整体不可解析三种返回', '分别渲染、补齐、降级并保留既有结论'],
      ['界面导航', '依次点击四个一级导航与八处页面跳转', '全部可达，控制台无报错'],
      ['年份详情与补记', '打开任意年份并追加记录后刷新', '记录保留，并进入下一轮生成输入'],
      ['中英文切换', '中英文往返切换并检查动态弹层', '文本、占位符与动态内容均正确切换与还原'],
      ['手机端适配', '在 390 像素宽度下执行完整操作', '自动切换单机模式，滑动与点击正常'],
      ['物流流程', '下单、逐节点推进、签收后返回个人页', '状态与个人页同步，刷新后保持'],
    ],
  },
  {
    h: '七、常见问题',
    list: [
      '记录会不会丢？档案保存在本机浏览器存储中；清除浏览器数据会导致本地副本丢失，软件提供导出功能用于备份。',
      '分析结论是否可靠？结论仅依据用户填写的档案生成，用于辅助自我梳理，不构成职业建议或投资建议。',
      '没有网络能否使用？已加载的页面可以浏览，档案分析、方案生成等需要联网的功能不可用。',
      '为什么有的年份是空的？该年份尚未填写记录，可进入该年份补记，或通过“新增一年”建立新的年份区块。',
      '投资信息可以直接认购吗？不能。软件仅展示投资相关信息，不提供资金募集、撮合或支付功能。',
    ],
  },
  {
    h: '七、术语说明',
    table: [
      ['术语', '含义'],
      ['年份块', '以自然年为边界的档案单位，包含该年的身份、事项、城市与记录'],
      ['底片', '本说明中指一条结构化的年度经历记录集合'],
      ['结论', '由档案生成的结构化分析结果，含擅长方向、证据与可开拓方向'],
      ['两版方案', '一次生成的两个取向不同的立项方案'],
      ['双通道写入', '用户补记与模型回写使用同一条写入路径，条目携带来源标记'],
    ],
  },
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function sHtml(s) {
  let out = '';
  if (s.body) out += s.body;
  if (s.table) {
    out += '<table>' + s.table.map((row, i) =>
      `<tr>${row.map((c) => `<${i === 0 ? 'th' : 'td'}>${esc(c)}</${i === 0 ? 'th' : 'td'}>`).join('')}</tr>`).join('') + '</table>';
  }
  if (s.list) out += '<ol>' + s.list.map((li) => `<li>${esc(li)}</li>`).join('') + '</ol>';
  if (s.subs) {
    for (const sub of s.subs) {
      out += `<h3>${esc(sub.t)}</h3>`;
      for (const p of sub.p) out += `<p>${p}</p>`;
      if (sub.img && sub.img2) {
        out += `<div class="figrow">
          <figure><img src="${img(sub.img[0])}"><figcaption>${esc(sub.img[1])}</figcaption></figure>
          <figure><img src="${img(sub.img2[0])}"><figcaption>${esc(sub.img2[1])}</figcaption></figure>
        </div>`;
      } else if (sub.img) {
        out += `<figure><img src="${img(sub.img[0])}"><figcaption>${esc(sub.img[1])}</figcaption></figure>`;
      }
    }
  }
  return out;
}

const bodyHtml = sections.map((s) => `<h2>${esc(s.h)}</h2>${sHtml(s)}`).join('');

const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">
<style>
  @page { size: A4; margin: 18mm 18mm 16mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: "SimSun", "Songti SC", serif; color: #000; font-size: 10.5pt; line-height: 1.95; }
  header { font-size: 9pt; text-align: center; padding-bottom: 3mm; border-bottom: 0.4pt solid #000; margin-bottom: 6mm; }
  h1 { font-size: 20pt; text-align: center; letter-spacing: .2em; margin: 18mm 0 6mm; font-weight: 700; }
  .subtitle { text-align: center; font-size: 11pt; letter-spacing: .3em; color: #333; margin-bottom: 4mm; }
  .meta { text-align: center; font-size: 10pt; color: #444; margin-bottom: 16mm; line-height: 2.2; }
  h2 { font-size: 13pt; font-weight: 700; margin: 8mm 0 3mm; }
  h3 { font-size: 11pt; font-weight: 700; margin: 6mm 0 2mm; }
  p { text-indent: 2em; margin-bottom: 2mm; text-align: justify; }
  table { width: 100%; border-collapse: collapse; margin: 3mm 0; font-size: 9.5pt; }
  th, td { border: 0.4pt solid #666; padding: 2mm 2.5mm; text-align: left; }
  th { background: #f2f2f2; width: 26%; }
  ol { margin: 2mm 0 2mm 6mm; }
  li { margin-bottom: 1.5mm; }
  figure { margin: 4mm 0 5mm; text-align: center; page-break-inside: avoid; }
  figure img { width: 56mm; border: 0.4pt solid #999; }
  figcaption { font-size: 9pt; color: #333; margin-top: 2mm; }
  .pagebreak { page-break-before: always; }
  footer { position: fixed; left: 0; right: 0; bottom: 6mm; text-align: center; font-size: 8.5pt; }
  footer span { display: inline-block; }
</style></head><body>

<header>${esc(NAME)} ${VERSION}</header>

<h1>软件说明书</h1>
<div class="subtitle">${esc(NAME)}</div>
<div class="meta">
  版本号：${VERSION}<br>
  开发完成日期：2026 年 11 月 28 日<br>
  文档说明：功能与操作说明
</div>

<div class="pagebreak"></div>
${bodyHtml}

<footer><span id="pg"></span></footer>
<script>
  window.addEventListener('load', () => {
    const total = 0; // 由打印时人工核对；此处仅显示内部说明
  });
</script>
</body></html>`;

fs.mkdirSync(OUT, { recursive: true });
const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const htmlPath = path.join(OUT, `软件说明书_25号底片_${stamp}.html`);
const pdfPath = path.join(OUT, `软件说明书_25号底片_${stamp}.pdf`);
fs.writeFileSync(htmlPath, html, 'utf8');

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
await page.waitForTimeout(400);
await page.pdf({
  path: pdfPath, format: 'A4', printBackground: true,
  margin: { top: '18mm', bottom: '16mm', left: '18mm', right: '18mm' },
  displayHeaderFooter: true,
  headerTemplate: `<div style="font-family:SimSun;font-size:8.5pt;width:100%;text-align:center;">${NAME} ${VERSION}</div>`,
  footerTemplate: `<div style="font-family:SimSun;font-size:8.5pt;width:100%;text-align:center;">第 <span class="pageNumber"></span> 页 共 <span class="totalPages"></span> 页</div>`,
});
await browser.close();

const chars = bodyHtml.replace(/<[^>]+>/g, '').length;
console.log(JSON.stringify({ pdf: pdfPath, kb: Math.round(fs.statSync(pdfPath).size / 1024), chars }, null, 1));
