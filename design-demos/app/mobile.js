/* 手机模式与左右滑动 */

  /* ---------- 手机模式：一台手机 + 左右滑动 ---------- */
  const ORDER = ['cover', 'film', 'project', 'me'];
  let mphone = null;

  function fitMobile() {
    if (!mphone) return;
    const st = document.getElementById('mstage');
    const s = Math.min((window.innerWidth - 20) / 417, (window.innerHeight - 150) / 876);
    mphone.style.transform = 'scale(' + s + ')';
    st.style.width = (417 * s) + 'px';
    st.style.height = (876 * s) + 'px';
  }

  function syncPager() {
    if (!mphone) return;
    const on = mphone.querySelector('.scr.on');
    const i = on ? ORDER.indexOf(on.dataset.name) : 0;
    const step = document.getElementById('mstep');
    if (step) step.textContent = (i + 1) + ' / ' + ORDER.length;
    document.querySelectorAll('#mdots i').forEach((d, k) => d.classList.toggle('on', k === i));
  }

  function go(name) {
    if (!mphone) return;
    const tab = mphone.querySelector('.tab[data-tab="' + name + '"]');
    if (tab) tab.click();
    syncPager();
  }

  function buildMobile() {
    if (mphone) return;
    const host = document.getElementById('mstage');
    const wrap = buildPhone({ initial: 'cover', x: 0, y: 0 });
    wrap.style.left = '0';
    wrap.style.top = '0';
    host.appendChild(wrap);
    mphone = wrap;
    wrap.querySelectorAll('#road').forEach(buildRoad);
    tearAll(wrap);

    const dots = document.getElementById('mdots');
    ORDER.forEach(() => dots.appendChild(document.createElement('i')));

    host.addEventListener('click', () => setTimeout(syncPager, 30));

    let sx = 0, sy = 0;
    host.addEventListener('touchstart', (e) => {
      const t = e.touches[0]; sx = t.clientX; sy = t.clientY;
    }, { passive: true });
    host.addEventListener('touchend', (e) => {
      const t = e.changedTouches[0];
      const dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
      const on = mphone.querySelector('.scr.on');
      const i = ORDER.indexOf(on.dataset.name);
      const next = dx < 0 ? Math.min(i + 1, ORDER.length - 1) : Math.max(i - 1, 0);
      if (next !== i) go(ORDER[next]);
    }, { passive: true });

    fitMobile();
    syncPager();
  }

