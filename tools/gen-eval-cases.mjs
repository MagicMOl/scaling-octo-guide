// 生成评测集 30 条输入样本（虚构档案，覆盖不同行业、跨度与密度）
import fs from 'node:fs';
import path from 'node:path';

const P = (id, title, years) => ({ id, title, years });

const cases = [
  P('c01', '文案，11 年 4 格', [
    { year: 2015, identity: '文案', city: '上海', line: '在广告公司写 slogan，被退稿 11 次', records: ['给三个品牌写过年度口号', '第一次被客户当面否掉整版方案'] },
    { year: 2018, identity: '文案', city: '北京', line: '转去内容团队，做深度访谈', records: ['访谈 40 位创业者', '写出一篇 10 万+ 的长文'] },
    { year: 2021, identity: '产品设计', city: '杭州', line: '自学设计，把公司界面重做了一遍', records: ['用 42 个组件统一了七零八落的界面', '带着 3 个人做完改版'] },
    { year: 2024, identity: '产品负责人', city: '杭州', line: '砍掉三个功能，留存回来了', records: ['留存 11% → 19%', '第一次自己定价格'] },
  ]),
  P('c02', '后端，8 年 3 格', [
    { year: 2017, identity: '后端工程师', city: '深圳', line: '写订单系统，每天处理十万单', records: ['把一次大促的重复扣款修掉'] },
    { year: 2020, identity: '后端工程师', city: '深圳', line: '做支付对账，重构了三次', records: ['对账差错率从万分之三降到十万分之一'] },
    { year: 2024, identity: '技术负责人', city: '深圳', line: '带 6 个人做服务拆分', records: ['把单体拆成 5 个服务', '上线零宕机'] },
  ]),
  P('c03', '设计，5 年 3 格', [
    { year: 2019, identity: '视觉设计', city: '广州', line: '在乙方做海报，一年 200 张', records: ['给连锁餐饮做整套视觉'] },
    { year: 2021, identity: '交互设计', city: '广州', line: '转做交互，从画图到画流程', records: ['重做了一套后台的导航结构'] },
    { year: 2024, identity: '设计负责人', city: '广州', line: '建了 4 个人的设计组', records: ['定了一套组件规范', '把设计交付周期从 3 周压到 1 周'] },
  ]),
  P('c04', '运营，3 年 2 格', [
    { year: 2021, identity: '内容运营', city: '成都', line: '从 0 做起一个 5 万粉的账号', records: ['日更 300 天'] },
    { year: 2024, identity: '增长运营', city: '成都', line: '做私域，复购率翻了一倍', records: ['把社群从 200 人做到 2 万'] },
  ]),
  P('c05', '教师，6 年 3 格', [
    { year: 2016, identity: '中学教师', city: '武汉', line: '带了一届从高一到高三', records: ['把班里的平均分提了 20 分'] },
    { year: 2020, identity: '在线课程设计', city: '武汉', line: '疫情转线上，自己录了 80 节课', records: ['一门课卖了 3000 份'] },
    { year: 2023, identity: '教研负责人', city: '武汉', line: '带 5 个老师做课程体系', records: ['重构了整年的课程大纲'] },
  ]),
  P('c06', '医生，9 年 3 格', [
    { year: 2015, identity: '住院医师', city: '西安', line: '轮转三年，值过 200 个夜班', records: ['一年管过 400 个病人'] },
    { year: 2019, identity: '主治医师', city: '西安', line: '开始做专科门诊', records: ['门诊量一年 6000 人次'] },
    { year: 2023, identity: '科室副主任', city: '西安', line: '带组做临床路径标准化', records: ['把平均住院日从 9 天压到 6 天'] },
  ]),
  P('c07', '制造业，12 年 3 格', [
    { year: 2012, identity: '工艺工程师', city: '苏州', line: '在产线上调参数', records: ['把良率从 82% 提到 91%'] },
    { year: 2017, identity: '生产主管', city: '苏州', line: '管 3 条线 60 人', records: ['两周内追平一个月的交期缺口'] },
    { year: 2024, identity: '厂长', city: '苏州', line: '接手一个连亏两年的厂', records: ['第二年转正，年产值翻倍'] },
  ]),
  P('c08', '餐饮，7 年 2 格', [
    { year: 2017, identity: '厨师', city: '长沙', line: '在别人的店里当主厨', records: ['一道招牌菜占营业额 30%'] },
    { year: 2021, identity: '店主', city: '长沙', line: '开了第一家自己的店', records: ['三个月回本', '疫情关了又开'] },
  ]),
  P('c09', '农业，20 年 2 格', [
    { year: 2005, identity: '果农', city: '赣州', line: '接手家里的 20 亩脐橙', records: ['一年最忙的时候睡在果园'] },
    { year: 2022, identity: '合作社负责人', city: '赣州', line: '联合 40 户做统一销售', records: ['把收购价从 1.2 元提到 2.1 元'] },
  ]),
  P('c10', '产品经理，10 年 5 格', [
    { year: 2014, identity: '产品助理', city: '北京', line: '画原型、写文档、被骂', records: ['一个月写了 40 份需求文档'] },
    { year: 2016, identity: '产品经理', city: '北京', line: '负责第一个完整模块', records: ['上线后日活翻了三倍'] },
    { year: 2019, identity: '高级产品', city: '北京', line: '从 0 到 1 做了一个新产品', records: ['半年做到 10 万用户'] },
    { year: 2022, identity: '产品负责人', city: '北京', line: '带 4 个产品线', records: ['砍掉两条不赚钱的业务'] },
    { year: 2025, identity: '独立开发者', city: '大理', line: '一个人做产品', records: ['上线两个月，7 个付费用户'] },
  ]),
  P('c11', '空记录年', [
    { year: 2019, identity: '销售', city: '郑州', line: '跑渠道，一年出差 200 天', records: ['签下第一个百万单'] },
    { year: 2020, identity: '销售', city: '郑州', line: '这一年没什么可说的', records: [] },
    { year: 2023, identity: '区域经理', city: '郑州', line: '带 8 个人的团队', records: ['把区域业绩做到全国第二'] },
  ]),
  P('c12', '跨行三次', [
    { year: 2013, identity: '机械设计', city: '天津', line: '画图纸，画了三年', records: ['独立做完一台设备的整套图纸'] },
    { year: 2018, identity: '产品设计', city: '北京', line: '转行做互联网产品', records: ['第一份工作工资降了 40%'] },
    { year: 2021, identity: '创业者', city: '北京', line: '做了一款工具，失败了', records: ['烧完 80 万，团队解散'] },
    { year: 2024, identity: '解决方案顾问', city: '北京', line: '把失败经验变成卖点', records: ['一年做了 20 个客户'] },
  ]),
  P('c13', '单年档案', [
    { year: 2026, identity: '应届生', city: '南京', line: '刚毕业，在一家小公司做前端', records: ['独立做完一个后台页面', '第一次参加代码评审'] },
  ]),
  P('c14', '应届生，两年', [
    { year: 2025, identity: '实习生', city: '南京', line: '在一家十人的公司实习', records: ['把公司的官网重做了一遍'] },
    { year: 2026, identity: '前端工程师', city: '南京', line: '转正，开始独立负责模块', records: ['上线了第一个自己的功能'] },
  ]),
  P('c15', '连续 25 年', [
    ...Array.from({ length: 25 }, (_, i) => ({
      year: 2001 + i,
      identity: i < 10 ? '会计' : i < 20 ? '财务主管' : '财务总监',
      city: '上海',
      line: i < 10 ? '做账、报税、月底加班' : i < 20 ? '带团队做预算' : '管整个财务部',
      records: i % 3 === 0 ? ['这一年的年报是我出的'] : [],
    })),
  ]),
  P('c16', '超长一句话', [
    { year: 2020, identity: '运营', city: '杭州', line: '这一年我同时负责内容、活动、社群、投放、数据看板、用户访谈和竞品分析七件事，每天从早上九点忙到晚上十一点，周末还要写周报和复盘，感觉自己像一个随时会散架但还在硬撑的架子', records: ['一个人做了三个人的活'] },
    { year: 2023, identity: '运营负责人', city: '杭州', line: '学会拒绝', records: ['把七件事砍到三件，业绩反而涨了'] },
  ]),
  P('c17', '中英混合', [
    { year: 2019, identity: '产品经理', city: 'Singapore', line: 'Led the payment revamp, 3 markets', records: ['shipped in 6 weeks', '和三个国家的团队协作'] },
    { year: 2022, identity: 'Product Lead', city: '深圳', line: '回国带团队', records: ['把海外经验带回来做本地化'] },
  ]),
  P('c18', '全部同一行业', [
    { year: 2016, identity: '测试工程师', city: '苏州', line: '做手机测试', records: ['一年测了 30 个版本'] },
    { year: 2019, identity: '测试工程师', city: '苏州', line: '开始写自动化', records: ['把回归从 3 天压到 4 小时'] },
    { year: 2023, identity: '测试负责人', city: '苏州', line: '建质量体系', records: ['线上事故从每月 4 起降到 0'] },
  ]),
  P('c19', '自由职业', [
    { year: 2018, identity: '自由插画师', city: '厦门', line: '接单画插画', records: ['一个月画了 40 张商稿'] },
    { year: 2021, identity: '自由插画师', city: '厦门', line: '开始做课程', records: ['第一期课程卖了 200 份'] },
    { year: 2024, identity: '小工作室主理人', city: '厦门', line: '拉了两个人一起做', records: ['接了第一个品牌整案'] },
  ]),
  P('c20', '公务员转行', [
    { year: 2015, identity: '公务员', city: '济南', line: '在街道办做基层工作', records: ['一年处理了 800 件居民诉求'] },
    { year: 2020, identity: '公务员', city: '济南', line: '做政务信息化', records: ['推动一个办事流程从 5 天到 1 天'] },
    { year: 2024, identity: '企业行政总监', city: '济南', line: '跳到企业', records: ['把行政流程重新理了一遍'] },
  ]),
];

// 兜底生成 21–30：变体，控制篇幅
const extra = [
  ['c21', '销售，6 年', [2018, 2020, 2023], '销售', '重庆'],
  ['c22', '律师，10 年', [2014, 2018, 2022], '律师', '北京'],
  ['c23', '建筑师，9 年', [2015, 2019, 2024], '建筑师', '上海'],
  ['c24', '护士，8 年', [2016, 2020, 2023], '护士', '成都'],
  ['c25', '程序员，15 年', [2010, 2014, 2018, 2023], '程序员', '北京'],
  ['c26', '主播，4 年', [2021, 2024], '主播', '杭州'],
  ['c27', 'HR，7 年', [2017, 2021, 2024], 'HR', '广州'],
  ['c28', '摄影，6 年', [2018, 2021, 2024], '摄影师', '大理'],
  ['c29', '物流，11 年', [2013, 2017, 2022], '物流主管', '郑州'],
  ['c30', '学生，3 年', [2023, 2025, 2026], '学生', '武汉'],
];
for (const [id, title, years, identity, city] of extra) {
  cases.push(P(id, title, years.map((y, i) => ({
    year: y,
    identity,
    city,
    line: ['刚开始做这一行，什么都不懂', '熬过了最难的一年，开始有点方法', '开始带人，也第一次做取舍'][i % 3],
    records: i === 0 ? ['第一份工资拿得很低'] : i === 1 ? ['独立负责了一个项目'] : ['把流程重做了一遍'],
  }))));
}

// 校验：id 唯一、年份升序
const ids = new Set();
for (const c of cases) {
  if (ids.has(c.id)) throw new Error('重复 id ' + c.id);
  ids.add(c.id);
  c.expectedYears = [...new Set(c.years.map((y) => y.year))].sort((a, b) => a - b);
}

fs.mkdirSync('eval', { recursive: true });
fs.writeFileSync(path.resolve('eval/cases.json'), JSON.stringify({ version: 1, count: cases.length, cases }, null, 2), 'utf8');
console.log('生成', cases.length, '条，年份跨度', Math.min(...cases.map((c) => c.years.length)), '至', Math.max(...cases.map((c) => c.years.length)), '年');
