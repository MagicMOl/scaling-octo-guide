/* 封面：路口与速写人物（当前用实拍图，备用） */
  /* --- 封面：现实路口 + 速写人物 --- */
  function buildRoad(host) {
    const W = 517, H = 330;
    const vx = 172, vw = 173;      // 竖向车道
    const hy = 78, hh = 174;       // 横向车道
    const ink = '#171410';
    let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">`;
    s += `<defs>
      <filter id="rough" x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="6" result="n"/>
        <feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
      <filter id="asphalt" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" seed="2" result="t"/>
        <feColorMatrix in="t" type="saturate" values="0"/>
        <feComposite operator="in" in2="SourceGraphic"/>
      </filter>
    </defs>`;

    // 人行道底色
    s += `<rect x="0" y="0" width="${W}" height="${H}" fill="#D8D0BE"/>`;
    s += `<rect x="0" y="0" width="${W}" height="${hy - 8}" fill="#DCD5C4"/>`;
    s += `<rect x="0" y="${hy + hh + 8}" width="${W}" height="${H - hy - hh - 8}" fill="#DCD5C4"/>`;
    s += `<rect x="0" y="0" width="${vx - 8}" height="${H}" fill="#DCD5C4"/>`;
    s += `<rect x="${vx + vw + 8}" y="0" width="${W - vx - vw - 8}" height="${H}" fill="#DCD5C4"/>`;

    // 沥青
    s += `<rect x="${vx - 8}" y="0" width="${vw + 16}" height="${H}" fill="#78756C" opacity=".90"/>`;
    s += `<rect x="0" y="${hy - 8}" width="${W}" height="${hh + 16}" fill="#78756C" opacity=".90"/>`;
    s += `<rect x="${vx - 8}" y="${hy - 8}" width="${vw + 16}" height="${hh + 16}" fill="#737067" opacity=".90"/>`;
    s += `<rect x="${vx - 8}" y="0" width="${vw + 16}" height="${H}" fill="#000" opacity=".05" filter="url(#asphalt)"/>`;
    s += `<rect x="0" y="${hy - 8}" width="${W}" height="${hh + 16}" fill="#000" opacity=".05" filter="url(#asphalt)"/>`;

    // 路缘
    s += `<rect x="${vx - 10}" y="0" width="2" height="${hy - 10}" fill="#B9B1A0"/>`;
    s += `<rect x="${vx + vw + 9}" y="0" width="2" height="${hy - 10}" fill="#B9B1A0"/>`;
    s += `<rect x="${vx - 10}" y="${hy + hh + 9}" width="2" height="${H}" fill="#B9B1A0"/>`;
    s += `<rect x="${vx + vw + 9}" y="${hy + hh + 9}" width="2" height="${H}" fill="#B9B1A0"/>`;

    // —— 交错叠加：另外两层路口，各自旋转，压在主路口下面 ——
    const cx0 = vx + vw / 2, cy0 = hy + hh / 2;
    const ghost = (angle, op) => `<g transform="rotate(${angle} ${cx0} ${cy0})" opacity="${op}">
        <rect x="${vx - 8}" y="-40" width="${vw + 16}" height="${H + 80}" fill="#6F6C63"/>
        <rect x="-40" y="${hy - 8}" width="${W + 80}" height="${hh + 16}" fill="#6F6C63"/>
        <rect x="${vx - 10}" y="-40" width="2" height="${hy + 30}" fill="#BDB5A3"/>
        <rect x="${vx + vw + 9}" y="-40" width="2" height="${hy + 30}" fill="#BDB5A3"/>
        <rect x="-40" y="${cy0 - 1}" width="${W + 80}" height="2" fill="#E8E2D2" opacity=".5"/>
        <rect x="${cx0 - 1}" y="-40" width="2" height="${H + 80}" fill="#E8E2D2" opacity=".5"/>
      </g>`;
    s += ghost(-18, .18) + ghost(14, .13) + ghost(31, .09);

    // 车道分隔虚线
    const cx = vx + vw / 2, cy = hy + hh / 2;
    for (let y = 0; y < hy - 26; y += 26) s += `<rect x="${cx - 1}" y="${y}" width="2" height="14" fill="#E8E2D2" opacity=".8"/>`;
    for (let y = hy + hh + 20; y < H; y += 26) s += `<rect x="${cx - 1}" y="${y}" width="2" height="14" fill="#E8E2D2" opacity=".8"/>`;
    for (let x = 0; x < vx - 26; x += 26) s += `<rect x="${x}" y="${cy - 1}" width="14" height="2" fill="#E8E2D2" opacity=".8"/>`;
    for (let x = vx + vw + 20; x < W; x += 26) s += `<rect x="${x}" y="${cy - 1}" width="14" height="2" fill="#E8E2D2" opacity=".8"/>`;

    // 斑马线（四条）
    const zw = 10, zg = 9;
    for (let x = vx - 2; x < vx + vw + 2; x += zw + zg) {
      s += `<rect x="${x}" y="${hy - 62}" width="${zw}" height="34" fill="#EFE9DA" opacity=".92"/>`;   // 上
      s += `<rect x="${x}" y="${hy + hh + 28}" width="${zw}" height="34" fill="#EFE9DA" opacity=".92"/>`; // 下
    }
    for (let y = hy; y < hy + hh; y += zw + zg) {
      s += `<rect x="${vx - 62}" y="${y}" width="34" height="${zw}" fill="#EFE9DA" opacity=".92"/>`;      // 左
      s += `<rect x="${vx + vw + 28}" y="${y}" width="34" height="${zw}" fill="#EFE9DA" opacity=".92"/>`;  // 右
    }
    // 停止线
    s += `<rect x="${vx - 2}" y="${hy - 72}" width="${vw + 4}" height="4" fill="#EFE9DA" opacity=".9"/>`;
    s += `<rect x="${vx - 2}" y="${hy + hh + 68}" width="${vw + 4}" height="4" fill="#EFE9DA" opacity=".9"/>`;
    s += `<rect x="${vx - 72}" y="${hy}" width="4" height="${hh}" fill="#EFE9DA" opacity=".9"/>`;
    s += `<rect x="${vx + vw + 68}" y="${hy}" width="4" height="${hh}" fill="#EFE9DA" opacity=".9"/>`;

    // 井盖与磨损
    s += `<circle cx="${vx + 30}" cy="${hy + hh + 46}" r="9" fill="#5E5B54" stroke="#4E4B45" stroke-width="1"/>`;
    s += `<circle cx="${vx + vw + 52}" cy="${hy - 34}" r="7" fill="#5E5B54" stroke="#4E4B45" stroke-width="1"/>`;

    // —— 速写人物（实心，笔触）——
    const figure = (x, y, sc, rot, flip) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${flip ? -1 : 1} ${1}) scale(${sc})" filter="url(#rough)" stroke="${ink}" stroke-linecap="round" fill="none">
        <circle cx="0" cy="-40" r="5.6" fill="${ink}" stroke="none"/>
        <path d="M-6.5 -33.5 L6.5 -33.5 L5 -13 L-5 -13 Z" fill="${ink}" stroke="none"/>
        <path d="M-4.5 -30.5 L-9 -16" stroke-width="3.4"/>
        <path d="M4.5 -30.5 L10 -20" stroke-width="3.2"/>
        <path d="M-2 -12.5 L3.5 6" stroke-width="3.8"/>
        <path d="M2.5 -12.5 L-5 5" stroke-width="3.6"/>
        <path d="M3.5 6.2 L8.2 6.2" stroke-width="2.6"/>
        <path d="M-5 5.2 L-9.6 5.2" stroke-width="2.6"/>
        <path d="M-4 -28 l 2 8 M0 -29 l 2 8 M3 -27 l 2 7" stroke-width=".9" opacity=".42"/>
        <path d="M-11 10 l 22 -1.5" stroke-width="1" opacity=".2"/>
      </g>`;

    // 八个更大的速写人：彼此隔着距离走，又被细线牵在一起
    const pts = [
      [238, 52, .86], [300, 58, .80], [116, 148, .92], [86, 226, .84],
      [404, 138, .90], [420, 232, .82], [248, 296, .90], [334, 306, .84],
    ];
    const links = [[0, 2], [2, 3], [3, 1], [1, 4], [5, 2], [3, 6], [6, 7], [0, 6]];
    let net = `<g stroke="${ink}" stroke-width=".9" opacity=".26">`;
    links.forEach(([a, b]) => {
      net += `<line x1="${pts[a][0]}" y1="${pts[a][1] - 20}" x2="${pts[b][0]}" y2="${pts[b][1] - 20}"/>`;
    });
    net += `</g>`;
    // 看不见的手：画外收拢的一束淡线
    net += `<g stroke="${ink}" stroke-width=".7" opacity=".11">`;
    [0, 3, 6].forEach((i) => { net += `<line x1="${pts[i][0]}" y1="${pts[i][1] - 20}" x2="${cx}" y2="${cy - 82}"/>`; });
    net += `</g>`;
    s += net;
    pts.forEach(([x, y, sc], i) => { s += figure(x, y, sc, (i % 3 - 1) * 7, i % 2 === 0); });

    // 路口中间立着一只钟：占满整个路口，时间是那只看不见的手
    const R = 84;
    const clock = (x, y) => {
      const pt = (a, r) => {
        const rad = (a - 90) * Math.PI / 180;
        return [x + Math.cos(rad) * r, y + Math.sin(rad) * r];
      };
      let g = `<g><ellipse cx="${x}" cy="${y + R + 10}" rx="58" ry="9" fill="${ink}" opacity=".10"/>`;
      g += `<circle cx="${x}" cy="${y}" r="${R}" fill="#FFFFFF" stroke="${ink}" stroke-width="2"/>`;
      g += `<circle cx="${x}" cy="${y}" r="${R - 9}" fill="none" stroke="${ink}" stroke-width=".7" opacity=".45"/>`;
      for (let i = 0; i < 60; i++) {
        const major = i % 5 === 0;
        const [x1, y1] = pt(i * 6, R - 14);
        const [x2, y2] = pt(i * 6, major ? R - 24 : R - 19);
        g += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${ink}" stroke-width="${major ? 1.8 : .7}" opacity="${major ? 1 : .6}"/>`;
      }
      const hand = (a, len, w, col) => {
        const [x2, y2] = pt(a, len);
        return `<line x1="${x}" y1="${y}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`;
      };
      g += hand(222.5, 40, 4.2, ink) + hand(60, 62, 2.8, ink) + hand(-48, 70, 1.2, '#B03A28');
      g += `<circle cx="${x}" cy="${y}" r="3.4" fill="${ink}"/>`;
      return g + `</g>`;
    };
    s += clock(cx, cy);

    // 交通信号灯（俯视的小灯箱）
    const light = (x, y) => `<g><rect x="${x - 5}" y="${y - 5}" width="10" height="10" rx="2" fill="#3B3833"/><circle cx="${x}" cy="${y}" r="2.4" fill="#C9A24A"/></g>`;
    s += light(vx - 26, hy - 26) + light(vx + vw + 26, hy + hh + 26);

    s += `</svg>`;
    host.innerHTML = s;
  }

  /* --- 手机 --- */
  const PHONES = [
    { initial: 'cover',   x: 40,   y: 400, label: '一　封面（tab 1）' },
    { initial: 'film',    x: 285,  y: 386, label: '二　底片 · 螺旋上升（tab 2）' },
    { initial: 'project', x: 530,  y: 400, label: '三　项目 ① 立项' },
    { initial: 'team',    x: 775,  y: 386, label: '四　项目 ② 团队' },
    { initial: 'invest',  x: 1020, y: 400, label: '五　项目 ③ 投资' },
    { initial: 'tech',    x: 1265, y: 386, label: '六　项目 ④ 选型' },
    { initial: 'order',   x: 1510, y: 400, label: '七　项目 ⑤ 下单' },
  ];
  const TABS = [
    { key: 'cover', label: '封面' },
    { key: 'film', label: '底片' },
    { key: 'project', label: '项目' },
    { key: 'me', label: '我' },
  ];
  const SCALE = .54;
  const stage = document.getElementById('stage');

  const TEAM = {
    zhan: { av: '栈', name: '小栈', role: 'AI 成员 · 代码搭子 · 常驻', foot: '不占工资 · 随项目常驻', desc: '你写需求，他写样板代码；改到第三版也不抱怨。', skills: [['SwiftUI', 80], ['样板代码', 95], ['重构', 70]] },
    ye: { av: '页', name: '小页', role: 'AI 成员 · 排版助理 · 常驻', foot: '不占工资 · 随项目常驻', desc: '三千张照片先过她一遍，再交给你挑。', skills: [['排版', 92], ['图像处理', 88], ['中文字体', 90]] },
    zhang: { av: '账', name: '小账', role: 'AI 成员 · 财务与合规 · 按次', foot: '按次计费 · 发票与合同', desc: '发票、合同、报税，一个月处理一次就够。', skills: [['财税', 85], ['合同', 80], ['发票', 95]] },
    lin: { av: '前', name: '林一舟', role: '真人 · 前端工程师 · 匹配 92%', foot: '可接档 11 月 20 日 · 按周结算', desc: '你已经把界面想清楚了，缺一个把它写成真东西的人。', skills: [['SwiftUI', 92], ['WebGL', 78], ['上线节奏', 90]] },
    zhou: { av: '图', name: '周牧', role: '真人 · 图像算法 · 匹配 87%', foot: '可接档 11 月 25 日 · 按周结算', desc: '三千张照片的自动排版，是这件事真正的难点。', skills: [['抠图', 94], ['排版算法', 86], ['PyTorch', 88]] },
    lan: { av: '长', name: '阿岚', role: '真人 · 增长 · 匹配 78%', foot: '可接档 12 月 1 日 · 按周结算', desc: '你做过 0 到 1，没做过从 1 到 1000。', skills: [['内容', 88], ['投放', 82], ['增长实验', 79]] },
  };

  // 每个成员的个人底片 + AI 标记
  Object.assign(TEAM.zhan, { ai: true, film: [['2023', '代码训练'], ['2025', '项目微调'], ['2026', '上线 4 个项目']] });
  Object.assign(TEAM.ye, { ai: true, film: [['2024', '图库训练'], ['2025', '中文字体'], ['2026', '排版上线']] });
  Object.assign(TEAM.zhang, { ai: true, film: [['2024', '票据识别'], ['2025', '合规库'], ['2026', '第一次月结']] });
  Object.assign(TEAM.lin, { ai: false, film: [['2019', '第一个 App'], ['2022', '上线 3 个'], ['2025', '独立开发']] });
  Object.assign(TEAM.zhou, { ai: false, film: [['2018', '抠图模型'], ['2021', '排版算法'], ['2024', '论文 2 篇']] });
  Object.assign(TEAM.lan, { ai: false, film: [['2019', '内容起号'], ['2022', '第一次投放'], ['2025', '增长实验 40 次']] });

  const YEARS = {
    2015: { sub: '第 1 年 · 文案', doing: '在广告公司写产品文案', city: '北京 · 望京', line: '写清楚比写漂亮难',
      skills: [['文案', 70], ['抗压', 60], ['排版', 55]], logs: ['Q1 一天写 12 条，被退回 9 条', 'Q4 第一次被用户在评论区骂'] },
    2018: { sub: '第 4 年 · 交互设计师', doing: '做用户访谈与原型', city: '上海 · 静安', line: '用户说的不是他要的',
      skills: [['访谈', 85], ['原型', 88], ['可用性测试', 72]], logs: ['全年 40 场访谈', '画了 300 张原型，大部分是废稿'] },
    2021: { sub: '第 6 年 · 产品设计师', doing: '把界面拆成可复用的组件', city: '上海 · 漕河泾', line: '把混乱收进秩序',
      skills: [['组件化', 92], ['带人', 70], ['数据看板', 78]], logs: ['Q2 一套 42 个组件的库', 'Q4 做完一个没人用的功能'] },
    2024: { sub: '第 9 年 · 产品负责人', doing: '定价与留存', city: '上海 · 漕河泾', line: '砍功能比加功能难',
      skills: [['定价', 82], ['留存', 88], ['带团队', 76]], logs: ['Q2 把 19 块改成 39 块，续费没掉', 'Q4 砍三个功能，留存 11%→19%'] },
    2026: { sub: '第 11 年 · 产品经理', doing: '一个人从 0 到 1 上线', city: '上海 · 漕河泾', line: '判断比执行贵',
      skills: [['需求拆解', 90], ['上线', 85], ['AI 工具链', 70]], logs: ['Q1 十周做出第一个版本', 'Q3 开始让 AI 写样板代码'] },
  };

