/* 手机骨架与七屏逻辑（buildPhone 主体，后续按屏拆出） */
  /* ---------- 底片数据模型 + AI 调用 ---------- */
  const memStore = {};
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return memStore[k] || null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { memStore[k] = v; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { delete memStore[k]; } },
  };

  // 把用户补记的记录并回数据模型（下次打开还在）
  try {
    const savedLogs = JSON.parse(store.get('dipian.logs') || '{}');
    Object.keys(savedLogs).forEach((y) => {
      if (YEARS[y]) YEARS[y].logs = YEARS[y].logs.concat(savedLogs[y]);
    });
  } catch (e) { /* 忽略损坏数据 */ }

  // 数据模型 → 提示词用的结构化摘要
  // 底片结论 -> 立项页的带入条（跨手机统一刷新）
function syncMeOrder() {
  let o = null;
  try { o = JSON.parse(store.get('dipian.order') || 'null'); } catch (e) { o = null; }
  const delivered = o && (o.stage || 0) >= 4;
  document.querySelectorAll('#stage [data-order-em]').forEach((el) => {
    if (!o) { el.textContent = '未下单'; el.classList.remove('ok'); return; }
    el.textContent = '¥27,197 · ' + (delivered ? '已到货' : '运输中');
    el.classList.toggle('ok', delivered);
  });
}

function syncFromFilmAll(focus) {
  let c = null;
  try { c = JSON.parse(store.get('dipian.conclusion') || 'null'); } catch (e) { c = null; }
  document.querySelectorAll('#stage [data-fromfilm]').forEach((el) => {
    if (!c || (!c.strength && !c.openings)) { el.classList.remove('on'); return; }
    el.classList.add('on');
    const t = el.querySelector('[data-fromtext]');
    if (t) t.textContent = '你擅长的：' + (c.strength || '—') + '。可以打开的方向：' + (c.openings || '—') + '。';
  });
  if (focus) {
    const b = document.querySelector('#stage [data-fromfilm].on [data-fill]');
    if (b) b.focus();
  }
}

function filmSummary() {
  return Object.keys(YEARS).sort()
    .filter((y) => {
      const d = YEARS[y];
      return (d.logs && d.logs.length) || (d.skills && d.skills.length);
    })
    .map((y) => {
      const d = YEARS[y];
      return {
        年: y, 身份: d.sub, 在做: d.doing, 城市: d.city,
        一句话: d.line, 技能: (d.skills || []).map(([k, v]) => k + ' ' + v), 记录: d.logs || [],
      };
    });
}

// 新建一年：先只有空壳，等用户写下第一条记录
function createNextYear() {
  const keys = Object.keys(YEARS).filter((k) => /^\d+$/.test(k)).map(Number);
  const maxY = keys.length ? String(Math.max(...keys)) : '2026';
  const y = String(Number(maxY) + 1);
  if (!YEARS[y]) {
    const prev = (YEARS[maxY] && YEARS[maxY].sub) || '';
    const m = prev.match(/(\d+)/);
    const n = m ? Number(m[1]) + 1 : keys.length + 1;
    YEARS[y] = {
      sub: '第 ' + n + ' 年', doing: '还没写', city: '—',
      line: '还没写', skills: [], logs: [],
    };
  }
  return y;
}


  const AI_SYS = '你是一位资深的产品与职业顾问。只根据用户提供的「底片」数据判断，不要编造年份或事件。'
    + '输出严格的 JSON，字段：strength（一句话，不超过 20 字，说清他真正擅长什么）、'
    + 'evidence（数组，3 条，每条引用具体年份和事件）、openings（一句话，不超过 20 字，说清 AI 时代可以往哪打开）、'
    + 'why（一句话解释依据）。不要输出多余文字。';

  async function callJSON(system, user, temp) {
    const endpoint = store.get('dipian.endpoint');
    const model = store.get('dipian.model') || 'deepseek-chat';
    const t = typeof temp === 'number' ? temp : 0.6;

    // 首选：走自己的 BFF（Key 在服务端，前端拿不到）
    if (endpoint) {
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system, user, model, temperature: t }),
      });
      let j = null;
      try { j = await r.json(); } catch (e) { j = null; }
      if (!r.ok) {
        const msg = (j && j.error && j.error.message) || ('HTTP ' + r.status);
        throw new Error(msg);
      }
      if (!j || !j.data || typeof j.data !== 'object') throw new Error('BFF 返回格式不对。');
      return { data: j.data, usage: j.usage || null, model: j.model || model };
    }

    // 回退：直连（仅演示，Key 在浏览器本地）
    const key = store.get('dipian.apiKey');
    const body = {
      model,
      temperature: t,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    };
    const r = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      let detail = '';
      try { detail = (await r.text()).slice(0, 140); } catch (e) { detail = ''; }
      throw new Error('HTTP ' + r.status + (detail ? ' · ' + detail : ''));
    }
    const j = await r.json();
    const txt = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
    let data;
    try { data = JSON.parse(txt); } catch (e) { throw new Error('返回不是合法 JSON：' + txt.slice(0, 100)); }
    return { data, usage: j.usage, model };
  }

  async function callAI() {
    return callJSON(AI_SYS, JSON.stringify(filmSummary()), 0.6);
  }

  const PROJ_SYS = '你是资深产品负责人。根据用户的三个回答和底片摘要，给出两个差异明显的方案和一次评审。'
    + '只根据给定信息，不要编造数据。输出严格 JSON：'
    + '{"plans":[{"name":"不超过6字","desc":"一句话不超过24字","pros":"优点不超过12字","cons":"代价不超过12字"},{"name":"","desc":"","pros":"","cons":""}],'
    + '"recommended":0, "review":{"concept":0.0,"cost":0.0,"risk":0.0},'
    + '"verdict":"结论一句话，含周期与预算，不超过40字","keep":"保留什么","fix":"要改什么","risky":"风险是什么"}'
    + '。review 三项为 0–10 的一位小数；两个方案必须真的不同（一个是稳的、一个是快的或准的）。不要输出多余文字。';

  async function callProject(req, film) {
    return callJSON(PROJ_SYS, JSON.stringify({ 需求: req, 底片: film }), 0.5);
  }

  function buildPhone(cfg) {
    const wrap = document.createElement('div');    wrap.className = 'pwrap';
    wrap.style.left = cfg.x + 'px';
    wrap.style.top = cfg.y + 'px';
    wrap.style.transform = `scale(${SCALE})`;

    const phone = document.createElement('div');
    phone.className = 'phone';
    phone.innerHTML = `
      <div class="screen">
        <div class="sbar"><span>9:41</span>
          <div class="sicons">
            <div class="sig"><i style="height:4px"></i><i style="height:6px"></i><i style="height:9px"></i><i style="height:11px"></i></div>
            <div class="bat"><b></b></div>
          </div>
        </div>
        <div class="island"></div>
        <div class="content"></div>
        <div class="tabbar"></div>
        <div class="home"></div>
      </div>`;

    const content = phone.querySelector('.content');
    ['cover', 'film', 'project', 'team', 'invest', 'tech', 'order', 'me'].forEach((k) => content.appendChild(document.getElementById('tpl-' + k).content.cloneNode(true)));

    const screen = phone.querySelector('.screen');
    const scr = content.querySelectorAll('.scr');
    const sheet = document.createElement('div');
    sheet.className = 'sheet';
    screen.appendChild(sheet);
    const isheet = document.createElement('div');
    isheet.className = 'sheet';
    screen.appendChild(isheet);
    const ys = document.createElement('div');
    ys.className = 'sheet ysheet';
    screen.appendChild(ys);
    const aisheet = document.createElement('div');
    aisheet.className = 'sheet aisheet';
    screen.appendChild(aisheet);

    const GROUP = { cover: 'cover', film: 'film', me: 'me', project: 'project', team: 'project', invest: 'project', tech: 'project', order: 'project' };
    const show = (name) => {
      scr.forEach((s) => s.classList.toggle('on', s.dataset.name === name));
      const active = GROUP[name] || name;
      phone.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t.dataset.tab === active));
      phone.querySelectorAll('.steps span').forEach((sp) => sp.classList.toggle('on', sp.dataset.step === name));
      sheet.classList.remove('on');
      isheet.classList.remove('on');
      ys.classList.remove('on');
      aisheet.classList.remove('on');
    };

    const tabbar = phone.querySelector('.tabbar');
    TABS.forEach((t) => {
      const b = document.createElement('div');
      b.className = 'tab';
      b.dataset.tab = t.key;
      b.textContent = t.label;
      b.addEventListener('click', () => show(t.key));
      tabbar.appendChild(b);
    });

    phone.querySelectorAll('.steps span').forEach((sp) => {
      sp.addEventListener('click', (ev) => { ev.stopPropagation(); show(sp.dataset.step); });
    });

    // 底片：点开某一年，看信息并补记录
    const openYear = (y, imgSrc) => {
        const d = YEARS[y];
        if (!d) return;
        const img = imgSrc ? { src: imgSrc } : null;
        ys.innerHTML = `<div class="yh">
            <div class="yimg">${img ? `<img src="${img.src}" alt="">` : '照片位'}</div>
            <div><b>${y}</b><span>${d.sub}</span></div>
            <button class="x">×</button>
          </div>
          <div class="yinfo">
            <div><span>在做</span>${d.doing}</div>
            <div><span>城市</span>${d.city}</div>
            <div><span>一句</span>${d.line}</div>
          </div>
          ${(d.skills && d.skills.length)
            ? `<div class="fl">这一年积累的</div>
          <div class="skills">${d.skills.map(([k, v]) => `<div class="s"><span>${k}</span><div class="track"><i style="width:${v}%"></i></div><b>${v}</b></div>`).join('')}</div>`
            : ''}
          <div class="fl">这一年的记录</div>
          ${(d.logs && d.logs.length)
            ? `<div class="ylist">${d.logs.map((l) => `<div>${l}</div>`).join('')}</div>`
            : `<div class="empty"><b>这一年还没有记录</b><span>写下当时在做什么、卡在哪里。下次读底片时，这段会进到模型输入里。</span><button class="eadd">补一条</button></div>`}
          <div class="yfill"><input type="text" placeholder="记一句这一年的事…"><button>存</button></div>
          <button class="ygo">带着这一年去立项 →</button>`;
        ys.classList.add('on');
        ys.querySelector('.x').onclick = (ev) => { ev.stopPropagation(); ys.classList.remove('on'); };
        const input = ys.querySelector('.yfill input');
        const eadd = ys.querySelector('.eadd');
        if (eadd) eadd.onclick = (ev) => { ev.stopPropagation(); input.focus(); };
        ys.querySelector('.yfill button').onclick = (ev) => {
          ev.stopPropagation();
          const v = input.value.trim();
          if (!v) return;
          let list = ys.querySelector('.ylist');
          if (!list) {
            // 空态：第一次补记时，把空态换成列表
            const empty = ys.querySelector('.empty');
            list = document.createElement('div');
            list.className = 'ylist';
            if (empty) empty.replaceWith(list);
            else ys.insertBefore(list, input.parentElement);
          }
          const div = document.createElement('div');
          div.textContent = v;
          list.appendChild(div);
          input.value = '';
          // 存到本机，下次打开还在，也会进入 AI 的输入
          try {
            const saved = JSON.parse(store.get('dipian.logs') || '{}');
            saved[y] = (saved[y] || []).concat([v]);
            store.set('dipian.logs', JSON.stringify(saved));
            if (YEARS[y]) YEARS[y].logs.push(v);
          } catch (err) { /* 存不了就只在本次会话里 */ }
        };
        ys.querySelector('.ygo').onclick = (ev) => { ev.stopPropagation(); ys.classList.remove('on'); show('project'); };
    };

    phone.querySelectorAll('.cell[data-year]').forEach((c) => {
      c.addEventListener('click', (e) => {
        e.stopPropagation();
        const im = c.querySelector('.ph img');
        openYear(c.dataset.year, im ? im.src : null);
      });
    });

    const addYearBtn = phone.querySelector('.addyear');
    if (addYearBtn) {
      addYearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openYear(createNextYear(), null);
      });
    }

    /* ---------- AI 读底片 ---------- */
    const aiBtn = phone.querySelector('.aibtn');
    const aiState = phone.querySelector('.aistate');
    const syncAI = () => {
      if (!aiState) return;
      const ep = store.get('dipian.endpoint');
      const k = store.get('dipian.apiKey');
      if (ep) {
        let host = ep;
        try { host = new URL(ep).host; } catch (e) { host = ep.slice(0, 22); }
        aiState.textContent = 'BFF · ' + host;
        aiState.classList.add('on');
      } else if (k) {
        aiState.textContent = '直连 · ' + (store.get('dipian.model') || 'deepseek-chat');
        aiState.classList.add('on');
      } else {
        aiState.textContent = '未连接 · 点这里设置';
        aiState.classList.remove('on');
      }
    };
    const closeAI = () => aisheet.classList.remove('on');
    const bindX = () => { const x = aisheet.querySelector('.x'); if (x) x.onclick = (e) => { e.stopPropagation(); closeAI(); }; };

    const renderDemo = () => {
      aisheet.innerHTML = `<div class="ai-hd"><b style="font-size: 15px;">AI 读完了十一年</b><button class="x">×</button></div>
        <div class="ai-lab">你擅长的</div>
        <div class="ai-big">把混乱收进秩序</div>
        <div><div class="ai-ev"><div>2021 · 用 42 个组件把混乱的界面收进秩序</div><div>2024 · 砍掉三个功能，留存 11% → 19%</div><div>2026 · 十周一个人上线，7 个真实用户</div></div></div>
        <div class="ai-lab">可以打开的</div>
        <div class="ai-big">用 AI 做决策，不做设计稿</div>
        <div class="ai-meta">演示结果 · 未调用 API</div>
        <div class="ai-actions"><button class="again">配置 Key 重新读</button></div>`;
      bindX();
      aisheet.querySelector('.again').onclick = (e) => { e.stopPropagation(); openKey(); };
      aisheet.classList.add('on');
    };

    const renderResult = ({ data, usage, model }) => {
      const ev = Array.isArray(data.evidence) ? data.evidence : [];
      aisheet.innerHTML = `<div class="ai-hd"><b style="font-size: 15px;">AI 读完了十一年</b><button class="x">×</button></div>
        <div class="ai-lab">你擅长的</div>
        <div class="ai-big">${data.strength || '—'}</div>
        <div class="ai-ev">${ev.map((e) => `<div>${e}</div>`).join('')}</div>
        <div class="ai-lab">可以打开的</div>
        <div class="ai-big">${data.openings || '—'}</div>
        <div class="ai-meta">${model} · 输入 ${(usage && usage.prompt_tokens) || '-'} / 输出 ${(usage && usage.completion_tokens) || '-'} tokens · ${data.why || ''}</div>
        <div class="ai-actions"><button class="again">再读一次</button><button class="toinv">带着结论去立项 →</button></div>`;
      bindX();
      aisheet.querySelector('.again').onclick = (e) => { e.stopPropagation(); runAI(); };
      aisheet.querySelector('.toinv').onclick = (e) => {
        e.stopPropagation();
        store.set('dipian.conclusion', JSON.stringify({ strength: data.strength || '', openings: data.openings || '' }));
        closeAI();
        show('project');
        syncFromFilmAll(true);
      };
      aisheet.classList.add('on');
    };

    const renderError = (msg) => {
      aisheet.innerHTML = `<div class="ai-hd"><b style="font-size: 15px;">AI 没读成</b><button class="x">×</button></div>
        <div class="ai-err">${msg}</div>
        <div class="ai-actions"><button class="retry">重试</button><button class="demo">先用演示结果</button><button class="cfg">改 Key</button></div>`;
      bindX();
      aisheet.querySelector('.retry').onclick = (e) => { e.stopPropagation(); runAI(); };
      aisheet.querySelector('.demo').onclick = (e) => { e.stopPropagation(); renderDemo(); };
      aisheet.querySelector('.cfg').onclick = (e) => { e.stopPropagation(); openKey(); };
      aisheet.classList.add('on');
    };

    const runAI = async () => {
      aisheet.innerHTML = `<div class="ai-hd"><b style="font-size: 15px;">读底片</b><button class="x">×</button></div>
        <div class="ai-lab">你擅长的</div>
        <div class="skel skel-b" style="width: 70%;"></div>
        <div class="skel skel-l"></div>
        <div class="skel skel-l" style="width: 84%;"></div>
        <div class="skel skel-l" style="width: 60%;"></div>
        <div class="ai-lab" style="margin-top: 22px;">可以打开的</div>
        <div class="skel skel-b" style="width: 56%;"></div>
        <div class="ai-meta">正在读十一年的记录…</div>`;
      bindX();
      aisheet.classList.add('on');
      try {
        const res = await callAI();
        renderResult(res);
      } catch (err) {
        renderError(String(err && err.message ? err.message : err));
      }
    };

    const openKey = () => {
      aisheet.innerHTML = `<div class="ai-hd"><b style="font-size: 15px;">AI 连接设置</b><button class="x">×</button></div>
        <div class="ai-meta" style="margin-top: 10px;">推荐填服务地址（BFF）：Key 只在服务端，浏览器拿不到。留空则退回直连模式，Key 存在本机 localStorage，仅适合自己试。</div>
        <div class="ai-lab" style="margin-top: 14px;">服务地址</div>
        <input class="kinput ept" type="text" placeholder="http://localhost:8787/api/chat">
        <div class="ai-lab">直连 Key（可选）</div>
        <input class="kinput key" type="password" placeholder="sk-...">
        <select class="ksel"><option value="deepseek-chat">deepseek-chat</option><option value="deepseek-reasoner">deepseek-reasoner</option></select>
        <div class="ai-actions"><button class="ksave">保存</button><button class="kclear">清除</button></div>`;
      bindX();
      const epInput = aisheet.querySelector('.ept');
      const keyInput = aisheet.querySelector('.key');
      const sel = aisheet.querySelector('.ksel');
      epInput.value = store.get('dipian.endpoint') || '';
      keyInput.value = store.get('dipian.apiKey') || '';
      sel.value = store.get('dipian.model') || 'deepseek-chat';
      aisheet.querySelector('.ksave').onclick = (e) => {
        e.stopPropagation();
        const ep = epInput.value.trim();
        const kk = keyInput.value.trim();
        if (ep) store.set('dipian.endpoint', ep); else store.del('dipian.endpoint');
        if (kk) store.set('dipian.apiKey', kk); else store.del('dipian.apiKey');
        store.set('dipian.model', sel.value);
        syncAI();
        closeAI();
      };
      aisheet.querySelector('.kclear').onclick = (e) => {
        e.stopPropagation();
        store.del('dipian.endpoint');
        store.del('dipian.apiKey');
        syncAI();
        closeAI();
      };
      aisheet.classList.add('on');
    };

    if (aiBtn) {
      aiBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!store.get('dipian.endpoint') && !store.get('dipian.apiKey')) { openKey(); return; }
        runAI();
      });
      aiState.addEventListener('click', (e) => { e.stopPropagation(); openKey(); });
      syncAI();
    }

    /* ---------- 立项：可编辑需求 + AI 生成方案与评审 ---------- */
    const fillBtn = phone.querySelector('[data-fill]');
    if (fillBtn) {
      fillBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        let c = null;
        try { c = JSON.parse(store.get('dipian.conclusion') || 'null'); } catch (err) { c = null; }
        if (!c || !c.openings) return;
        const what = phone.querySelector('.rq[data-k="what"]');
        if (what) {
          what.value = c.openings;
          const cur = {};
          rqInputs.forEach((i) => { cur[i.dataset.k] = i.value; });
          store.set('dipian.req', JSON.stringify(cur));
          what.focus();
        }
      });
    }

    syncFromFilmAll();
    syncMeOrder();

    const REQ_DEFAULT = {
      what: '把手机里的旅行照，自动排成一本能打印的小册子',
      who: '一年旅行 ≥3 次、懒得修图的人',
      when: '10 周内看到第一个能寄出去的版本',
    };
    const rqInputs = phone.querySelectorAll('.rq');
    let savedReq = {};
    try { savedReq = JSON.parse(store.get('dipian.req') || '{}'); } catch (e) { savedReq = {}; }
    rqInputs.forEach((inp) => {
      const k = inp.dataset.k;
      inp.value = savedReq[k] || REQ_DEFAULT[k] || '';
      inp.placeholder = REQ_DEFAULT[k] || '';
      inp.addEventListener('change', () => {
        const cur = {};
        rqInputs.forEach((i) => { cur[i.dataset.k] = i.value; });
        store.set('dipian.req', JSON.stringify(cur));
      });
    });

    const genBtn = phone.querySelector('.genbtn');
    const solEl = phone.querySelector('[data-sol]');
    const revEl = phone.querySelector('[data-rev]');
    const verdictEl = phone.querySelector('[data-verdict]');
    const rev2El = phone.querySelector('[data-rev2]');
    const gmsg = phone.querySelector('[data-gmsg]');

    const renderProject = (d) => {
      const plans = Array.isArray(d.plans) ? d.plans.slice(0, 2) : [];
      if (plans.length === 2 && solEl) {
        solEl.innerHTML = plans.map((p, i) => {
          const rec = i === Number(d.recommended);
          return `<div class="card2 ${rec ? 'rec' : ''}">${rec ? '<div class="tag">推荐</div>' : ''}`
            + `<div class="t">${i === 0 ? 'A ' : 'B '}${p.name || ''}</div>`
            + `<div class="d">${p.desc || ''}</div>`
            + `<div class="pm">${[p.pros, p.cons].filter(Boolean).join(' · ')}</div></div>`;
        }).join('');
      }
      const r = d.review || {};
      const n = (v) => (typeof v === 'number' && isFinite(v) ? v.toFixed(1) : '—');
      if (revEl) {
        revEl.innerHTML = `<div><b>${n(r.concept)}</b><span>概念</span></div>`
          + `<div><b>${n(r.cost)}</b><span>成本</span></div>`
          + `<div><b class="risk">${n(r.risk)}</b><span>风险</span></div>`;
      }
      if (d.verdict && verdictEl) verdictEl.textContent = '结论：' + d.verdict;
      const rows = [['保留', d.keep], ['要改', d.fix], ['风险', d.risky]].filter((x) => x[1]);
      if (rows.length && rev2El) {
        rev2El.innerHTML = rows.map(([k, v]) => `<div><span>${k}</span>${v}</div>`).join('');
      }
    };

    if (genBtn) {
      genBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!store.get('dipian.endpoint') && !store.get('dipian.apiKey')) {
          gmsg.textContent = '先在底片页配置服务地址或 Key，再回来生成。';
          return;
        }
        const reqData = {};
        rqInputs.forEach((i) => { reqData[i.dataset.k] = i.value.trim(); });
        store.set('dipian.req', JSON.stringify(reqData));
        genBtn.disabled = true;
        const oldLabel = genBtn.textContent;
        genBtn.textContent = '生成中…';
        gmsg.textContent = '';
        try {
          const { data } = await callProject(reqData, filmSummary());
          renderProject(data);
          gmsg.textContent = '';
        } catch (err) {
          gmsg.textContent = '生成失败：' + String(err && err.message ? err.message : err);
        } finally {
          genBtn.disabled = false;
          genBtn.textContent = oldLabel;
        }
      });
    }

    phone.querySelectorAll('[data-go]').forEach((el) => {
      el.addEventListener('click', (e) => { e.stopPropagation(); show(el.dataset.go); });
    });

    /* ---------- 下单后的物流追踪 ---------- */
    const orderScr = phone.querySelector('.scr[data-name="order"]');
    if (orderScr) {
      const orderBox = orderScr.querySelector('.order');
      const trackBox = orderScr.querySelector('[data-track]');
      const confirmBtn = orderScr.querySelector('.confirm');
      const TNO = 'SF1234567890';
      const NODES = [
        ['已下单', '11 / 20 10:12'],
        ['已发货 · 顺丰速运', '11 / 20 18:40'],
        ['运输中 · 已到达上海转运中心', '11 / 21 07:05'],
        ['派送中', '11 / 21 13:40'],
        ['已签收', '11 / 21 14:12'],
      ];
      const readOrder = () => {
        try { return JSON.parse(store.get('dipian.order') || 'null'); } catch (e) { return null; }
      };
      const STATUS = ['已下单', '已发货', '运输中', '派送中', '已签收'];
      const renderTrack = () => {
        if (!trackBox) return;
        const o = readOrder();
        if (!o) return;
        const stage = Math.min(o.stage || 0, NODES.length - 1);
        const done = stage >= NODES.length - 1;
        trackBox.innerHTML = `<div class="theader">
            <div class="tstatus"><b>${STATUS[stage]}</b></div>
            <span class="stamp">${done ? '已到货' : '已冲洗'}</span>
          </div>
          <span class="tno">${TNO} · 顺丰速运</span>
          <div class="tl">${NODES.map(([t, s], i) => {
            const k = i < stage ? 'done' : (i === stage ? 'on' : 'wait');
            return `<div class="n ${k}"><b>${t}</b><span>${s}</span></div>`;
          }).join('')}</div>
          <div class="tact">
            <button class="copy">复制单号</button>
            ${done ? '<button class="back">去「我」</button>' : '<button class="next">推进到下一节点</button>'}
          </div>
          <div class="tnote">${done
            ? '已签收，订单记为「已到货」，保修与发票在「我」里。'
            : '演示用：点「推进到下一节点」可以让物流往前走一步；签收后自动回到「我」页。'}</div>`;
        const copyBtn = trackBox.querySelector('.copy');
        copyBtn.onclick = async (e) => {
          e.stopPropagation();
          try {
            await navigator.clipboard.writeText(TNO);
            copyBtn.textContent = '已复制';
          } catch (err) { copyBtn.textContent = TNO; }
        };
        const backBtn = trackBox.querySelector('.back');
        if (backBtn) backBtn.onclick = (e) => { e.stopPropagation(); show('me'); syncMeOrder(); };
        const nextBtn = trackBox.querySelector('.next');
        if (nextBtn) {
          nextBtn.onclick = (e) => {
            e.stopPropagation();
            const cur = readOrder();
            if (!cur) return;
            const ns = Math.min((cur.stage || 0) + 1, NODES.length - 1);
            store.set('dipian.order', JSON.stringify({ ...cur, stage: ns }));
            const h1n = orderScr.querySelector('.h1');
            if (h1n) h1n.textContent = ns >= NODES.length - 1 ? '已签收，冲洗完了。' : '已下单，正在路上。';
            renderTrack();
            syncMeOrder();
            if (ns >= NODES.length - 1) {
              // 签收：停一下让人看到最后一个节点亮起，再自动切到「我」
              setTimeout(() => { show('me'); syncMeOrder(); }, 1400);
            }
          };
        }
      };
      const applyOrderState = () => {
        const h1 = orderScr.querySelector('.h1');
        const o = readOrder();
        if (o) {
          orderBox.classList.add('tracked');
          if (h1) h1.textContent = (o.stage || 0) >= NODES.length - 1 ? '已签收，冲洗完了。' : '已下单，正在路上。';
          renderTrack();
        } else {
          orderBox.classList.remove('tracked');
          if (h1) h1.textContent = '三件硬件，六家商家。';
        }
      };
      if (confirmBtn) {
        confirmBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          store.set('dipian.order', JSON.stringify({ no: TNO, carrier: '顺丰速运', at: Date.now(), stage: 2 }));
          applyOrderState();
          syncMeOrder();
        });
      }
      applyOrderState();
    }

    show(cfg.initial);

    // 团队成员详情
    phone.querySelectorAll('[data-mem]').forEach((n) => {
      n.addEventListener('click', (e) => {
        e.stopPropagation();
        const m = TEAM[n.dataset.mem];
        if (!m) return;
        const face = m.ai
          ? `<svg viewBox="0 0 64 64"><rect width="64" height="64" fill="#2B5C86"/><circle cx="32" cy="32" r="14" fill="none" stroke="#fff" stroke-width="1.6"/><circle cx="32" cy="32" r="4" fill="#fff"/><path d="M32 8v10M32 46v10M8 32h10M46 32h10" stroke="#fff" stroke-width="1.2" opacity=".65"/></svg>`
          : `<svg viewBox="0 0 64 64"><rect width="64" height="64" fill="#1B1711"/><circle cx="32" cy="24" r="11" fill="#EFE8D8"/><path d="M11 64c0-12 9-19 21-19s21 7 21 19z" fill="#EFE8D8"/></svg>`;
        sheet.innerHTML = `<div class="pf">
            <div class="pf-img">${face}</div>
            <div class="pf-t"><b>${m.name}</b><i>${m.role}</i><div class="pm">${m.foot}</div></div>
            <button class="x">×</button>
          </div>
          <div class="ds">${m.desc}</div>
          <div class="skills">${m.skills.map(([k, v]) => `<div class="s"><span>${k}</span><div class="track"><i style="width:${v}%"></i></div><b>${v}</b></div>`).join('')}</div>
          <div class="fl">个人底片</div>
          <div class="strip">${m.film.map(([y, l]) => `<div class="mf ${m.ai ? 'ai' : ''}"><b>${y}</b><span>${l}</span></div>`).join('')}</div>
          <div class="tags"><span>远程协作</span><span>按周</span><span>两周一次评审</span></div>`;
        sheet.classList.add('on');
        sheet.querySelector('.x').addEventListener('click', (ev) => { ev.stopPropagation(); sheet.classList.remove('on'); });
      });
    });

    // 商家比价
    const sumEl = phone.querySelector('.sum2');
    const recalc = () => {
      let total = 0;
      phone.querySelectorAll('.item2').forEach((it) => {
        const p = it.querySelector('.shop.on');
        if (p) total += Number(p.dataset.price);
      });
      if (sumEl) sumEl.textContent = '¥' + total.toLocaleString('en-US');
    };
    phone.querySelectorAll('.item2').forEach((it) => {
      it.querySelectorAll('.shop').forEach((sh) => {
        sh.addEventListener('click', (e) => {
          e.stopPropagation();
          it.querySelectorAll('.shop').forEach((x) => x.classList.remove('on'));
          sh.classList.add('on');
          const priceEl = it.querySelector('.price');
          if (priceEl) priceEl.textContent = '¥' + Number(sh.dataset.price).toLocaleString('en-US');
          recalc();
        });
      });
    });
    recalc();

    // 投资认购
    let amt = 5;
    const invBtn = phone.querySelector('.invbtn');
    const cks = phone.querySelectorAll('.ck');
    cks.forEach((c) => c.addEventListener('click', (e) => {
      e.stopPropagation();
      c.classList.toggle('on');
      const ok = [...cks].every((x) => x.classList.contains('on'));
      if (invBtn) {
        invBtn.disabled = !ok;
        invBtn.classList.toggle('off', !ok);
      }
    }));
    if (invBtn) {
      invBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        isheet.innerHTML = `<div class="hd"><div><b>参与投资</b><i style="font-style: normal; font-size: 9.5px; color: #8A7E62;">天使轮 · 投前估值 ¥450 万</i></div><button class="x">×</button></div>
          <div class="iamt"><div data-amt="3">¥3 万</div><div data-amt="5" class="on">¥5 万</div><div data-amt="10">¥10 万</div></div>
          <div class="inote">团队跟投上限 5 万；外部投资人需做合格投资者认证，10 万起投。认购后 6 个月锁定期，3 年内可按 1.5 倍回购。</div>
          <button class="invbtn" style="margin-top: 18px;">确认认购 <span class="sel">¥5 万</span></button>`;
        isheet.classList.add('on');
        isheet.querySelector('.x').addEventListener('click', (ev) => { ev.stopPropagation(); isheet.classList.remove('on'); });
        isheet.querySelectorAll('.iamt div').forEach((d) => {
          d.addEventListener('click', () => {
            isheet.querySelectorAll('.iamt div').forEach((x) => x.classList.remove('on'));
            d.classList.add('on');
            amt = Number(d.dataset.amt);
            isheet.querySelector('.invbtn .sel').textContent = '¥' + amt + ' 万';
          });
        });
        isheet.querySelector('.invbtn').addEventListener('click', (ev) => {
          ev.stopPropagation();
          const list = phone.querySelector('.plist');
          if (list) {
            const row = document.createElement('div');
            row.className = 'pl';
            row.innerHTML = `<span class="who">你<i>团队跟投</i></span><span class="mo">¥${amt} 万</span><em>待签约</em>`;
            list.appendChild(row);
          }
          const now = 32 + amt;
          const pct = Math.min(100, Math.round(now / 50 * 100));
          const amtEl = phone.querySelector('.amt');
          const pctEl = phone.querySelector('.pct');
          const barEl = phone.querySelector('.prog .track i');
          if (amtEl) amtEl.textContent = '¥' + now + ' 万';
          if (pctEl) pctEl.textContent = pct + '%';
          if (barEl) barEl.style.width = pct + '%';
          const h1 = phone.querySelector('.inv .h1');
          if (h1) h1.innerHTML = '天使轮 50 万，<br>还差 ' + Math.max(0, 50 - now) + ' 万。';
          isheet.classList.remove('on');
        });
      });
    }

    wrap.appendChild(phone);
    return wrap;
  }

  PHONES.forEach((cfg) => {
    stage.appendChild(buildPhone(cfg));
    const label = document.createElement('div');
    label.className = 'plabel';
    label.textContent = cfg.label;
    label.style.left = cfg.x + 'px';
    label.style.top = (cfg.y + 876 * SCALE + 12) + 'px';
    stage.appendChild(label);
  });

  document.querySelectorAll('#road').forEach(buildRoad);
  tearAll(document);

  /* 按窗口缩放整块版心：任何预览尺寸都能看到完整的六台手机 */
  function fitBoard() {
    const s = Math.min(window.innerWidth / 1800, window.innerHeight / 1000, 1);
    const b = document.getElementById('board');
    if (b) b.style.transform = 'translate(-50%, -50%) scale(' + s + ')';
  }
  window.addEventListener('resize', fitBoard);
  fitBoard();
