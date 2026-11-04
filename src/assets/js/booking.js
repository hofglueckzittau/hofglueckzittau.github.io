(() => {
  const cfg = JSON.parse(document.getElementById('booking-config').textContent);
  const root = document.getElementById('booking');
  const T = cfg.i18n;
  const eur = (n) => new Intl.NumberFormat(cfg.locale, { style: 'currency', currency: 'EUR' }).format(n);
  const cost = (n) => (n === 0 ? T.free : eur(n));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const MAX_MONTHS = 6;

  const state = { step: 0, date: null, slot: null, qty: {}, month: new Date(today.getFullYear(), today.getMonth(), 1), name: '', email: '', method: 'paypal', notice: '', ticket: null, paying: false };

  const fmtDate = (d) => d.toLocaleDateString(cfg.locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const key = (a, u) => `${a}.${u}`;

  // Why an activity cannot run on the chosen date/slot, or null if it can.
  function unavailable(a) {
    if (a.months && state.date && !a.months.includes(state.date.getMonth() + 1)) return T.notThisMonth;
    if (state.slot && !a.slots.includes(state.slot)) return a.slots.includes('am') ? T.notThisSlot : T.notThisSlotPm;
    return null;
  }
  function dropUnavailable() {
    const removed = [];
    cfg.activities.forEach((a) => {
      if (!unavailable(a)) return;
      let had = false;
      a.units.forEach((u) => { if (state.qty[key(a.id, u.id)]) { delete state.qty[key(a.id, u.id)]; had = true; } });
      if (had) removed.push(a.name);
    });
    state.notice = removed.length ? `${T.removed} ${removed.join(', ')}` : '';
  }
  const lines = () => cfg.activities.flatMap((a) => a.units.filter((u) => state.qty[key(a.id, u.id)] > 0).map((u) => ({ a, u, n: state.qty[key(a.id, u.id)], sum: u.price * state.qty[key(a.id, u.id)] })));
  const total = () => lines().reduce((s, l) => s + l.sum, 0);
  // Why the chosen tickets cannot go ahead yet, or '' if they can.
  function blocked() {
    const short = cfg.activities.find((a) => {
      const n = a.units.reduce((s, u) => s + (state.qty[key(a.id, u.id)] || 0), 0);
      return a.minGroup && n > 0 && n < a.minGroup;
    });
    if (short) return T.minGroup.replace('{name}', short.name).replace('{n}', short.minGroup);
    return lines().length && total() === 0 ? T.needPaid : '';
  }

  function preselect() {
    let id = null;
    try { id = sessionStorage.getItem('hg-preselect'); sessionStorage.removeItem('hg-preselect'); } catch { return; }
    const a = cfg.activities.find((x) => x.id === id);
    if (!a || state.ticket) return;
    const k = key(a.id, a.units[0].id);
    state.qty[k] = Math.max(state.qty[k] || 0, 1);
    state.notice = '';
    if (state.date) dropUnavailable();
    render();
  }

  function calendar() {
    const first = state.month;
    const start = (first.getDay() + 6) % 7; // Monday-first grid
    const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const dow = [...Array(7)].map((_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(cfg.locale, { weekday: 'short' }));
    const limit = new Date(today.getFullYear(), today.getMonth() + MAX_MONTHS, 1);
    const prevOff = first <= new Date(today.getFullYear(), today.getMonth(), 1);
    const nextOff = new Date(first.getFullYear(), first.getMonth() + 1, 1) >= limit;
    let cells = dow.map((d) => `<div class="cal-dow">${esc(d)}</div>`).join('') + '<div></div>'.repeat(start);
    for (let n = 1; n <= days; n++) {
      const d = new Date(first.getFullYear(), first.getMonth(), n);
      const closed = d.getDay() === cfg.closedWeekday;
      const off = d < today || closed;
      const on = state.date && iso(state.date) === iso(d);
      cells += `<button type="button" data-date="${iso(d)}" ${off ? 'disabled' : ''} aria-pressed="${!!on}" aria-label="${esc(fmtDate(d))}${closed ? `, ${esc(T.closed)}` : ''}">${n}</button>`;
    }
    return `<div class="cal-head"><button type="button" class="cal-nav" data-month="-1" ${prevOff ? 'disabled' : ''} aria-label="${esc(T.prevMonth)}">‹</button>
      <h4 aria-live="polite">${esc(first.toLocaleDateString(cfg.locale, { month: 'long', year: 'numeric' }))}</h4>
      <button type="button" class="cal-nav" data-month="1" ${nextOff ? 'disabled' : ''} aria-label="${esc(T.nextMonth)}">›</button></div>
      <div class="cal">${cells}</div><p class="small">${esc(T.closed)}</p>`;
  }

  const slotButton = (s) => `<label class="choice"><input type="radio" name="slot" value="${s}" ${state.slot === s ? 'checked' : ''}><span><strong>${esc(T[s])}</strong><small>${esc(cfg.slots[s])}</small></span></label>`;

  function step0() {
    return `<h3 class="book-h">${esc(T.chooseDate)}</h3>${calendar()}
      <div class="slots"><h3 class="book-h">${esc(T.chooseSlot)}</h3><div class="choice-row">${slotButton('am')}${slotButton('pm')}</div></div>
      <div class="book-nav"><span></span><button type="button" class="btn" data-go="1" ${state.date && state.slot ? '' : 'disabled'}>${esc(T.next)}</button></div>`;
  }

  function step1() {
    const rows = cfg.activities.flatMap((a) => {
      const why = unavailable(a);
      return a.units.map((u) => {
        const k = key(a.id, u.id); const n = state.qty[k] || 0;
        const label = `${a.name}: ${u.label}`;
        return `<div class="ticket-row ${why ? 'off' : ''}"><div><span class="ticket-name">${esc(a.name)}</span>
          <span class="ticket-sub">${esc(u.label)} · ${cost(u.price)}${a.confirmed ? '' : '*'}</span>${why ? `<span class="off-note">${esc(why)}</span>` : ''}</div>
          <div class="stepper-qty"><button type="button" data-qty="${k}" data-d="-1" ${n === 0 || why ? 'disabled' : ''} aria-label="${esc(T.decrease)}: ${esc(label)}">−</button>
          <output aria-live="polite">${n}</output><button type="button" data-qty="${k}" data-d="1" ${why || n >= 20 ? 'disabled' : ''} aria-label="${esc(T.increase)}: ${esc(label)}">+</button></div></div>`;
      });
    }).join('');
    const stop = blocked();
    return `<h3 class="book-h">${esc(T.chooseTickets)}</h3>${rows}${stop ? `<p class="notice" role="status" style="margin-top:1rem">${esc(stop)}</p>` : ''}
      <div class="book-nav"><button type="button" class="btn btn-ghost" data-go="0">${esc(T.back)}</button><button type="button" class="btn" data-go="2" ${total() > 0 && !stop ? '' : 'disabled'}>${esc(T.next)}</button></div>`;
  }

  function step2() {
    const methods = Object.entries(T.methods).map(([id, name]) => `<label class="choice"><input type="radio" name="method" value="${id}" ${state.method === id ? 'checked' : ''}><span><strong>${esc(name)}</strong></span></label>`).join('');
    return `<form id="pay-form"><h3 class="book-h">${esc(T.contact)}</h3>
      <div class="field-row"><label>${esc(T.name)}<input name="name" required autocomplete="name" value="${esc(state.name)}"></label>
      <label>${esc(T.email)}<input name="email" type="email" required autocomplete="email" value="${esc(state.email)}"></label></div>
      <h3 class="book-h" style="margin-top:1.4rem">${esc(T.payment)}</h3><div class="pay-grid">${methods}</div>
      <p class="notice">${esc(T.demoPay)}</p>
      <div class="book-nav"><button type="button" class="btn btn-ghost" data-go="1">${esc(T.back)}</button>
      <button type="submit" class="btn" ${state.paying ? 'disabled' : ''}>${esc(state.paying ? T.paying : `${T.pay} · ${eur(total())}`)}</button></div></form>`;
  }

  function ticketView() {
    const t = state.ticket;
    const list = t.lines.map((l) => `<div class="sum-row"><span>${l.n} × ${esc(l.name)} (${esc(l.unit)})</span><span>${cost(l.sum)}</span></div>`).join('');
    return `<div class="ticket" id="ticket"><div class="ticket-top"><h3>${esc(T.thanks)}</h3><p>${esc(T.ticketNote)}</p></div>
      <div class="ticket-qr" role="img" aria-label="QR-Code ${esc(t.no)}">${t.qr}</div>
      <p class="ticket-no">${esc(T.ticketNo)}: ${esc(t.no)}</p>
      <div class="ticket-body">
        <div class="sum-row"><span>${esc(T.guest)}</span><strong>${esc(t.name)}</strong></div>
        <div class="sum-row"><span>${esc(T.when)}</span><strong>${esc(t.when)}</strong></div>
        ${list}
        <div class="sum-row sum-total"><span>${esc(T.total)}</span><span>${eur(t.total)}</span></div>
        <div class="sum-row"><span>${esc(T.paidBy)}</span><span>${esc(T.methods[t.method])} (Demo)</span></div>
      </div></div>
      <div class="ticket-actions"><button type="button" class="btn" data-print>${esc(T.print)}</button><button type="button" class="btn btn-ghost" data-reset>${esc(T.again)}</button></div>
      <p class="ticket-mail">${esc(T.emailDemo)} ${esc(t.email)}</p>`;
  }

  function summary() {
    const when = state.date ? `${fmtDate(state.date)}${state.slot ? ` · ${T[state.slot]} (${cfg.slots[state.slot]})` : ''}` : T.noDate;
    const ls = lines();
    return `<h3>${esc(T.summary)}</h3><p class="small" style="margin-top:0">${esc(when)}</p>
      ${ls.length ? ls.map((l) => `<div class="sum-row"><span>${l.n} × ${esc(l.a.name)}${l.a.units.length > 1 ? ` (${esc(l.u.label)})` : ''}</span><span>${cost(l.sum)}</span></div>`).join('') : `<p class="small">${esc(T.empty)}</p>`}
      <div class="sum-row sum-total" aria-live="polite"><span>${esc(T.total)}</span><span>${eur(total())}</span></div>`;
  }

  function render() {
    root.classList.toggle('is-done', state.step === 3);
    const steps = T.steps.map((s, i) => `<li class="${i <= state.step ? 'on' : ''}" ${i === state.step ? 'aria-current="step"' : ''}>${i + 1}. ${esc(s)}</li>`).join('');
    const views = [step0, step1, step2, ticketView];
    const notice = state.notice && state.step < 3 ? `<p class="notice" role="status">${esc(state.notice)}</p>` : '';
    root.innerHTML = `<div class="book-main"><ol class="stepper">${steps}</ol>${notice}${views[state.step]()}</div>${state.step < 3 ? `<aside class="summary">${summary()}</aside>` : ''}`;
  }

  function focusStep() {
    const el = root.querySelector('.book-h, .ticket-top h3');
    if (el) { el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true }); }
    root.scrollIntoView({ block: 'start' });
  }

  function makeTicket() {
    const code = [...crypto.getRandomValues(new Uint8Array(4))].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    const no = `HG-${state.date.getFullYear()}-${code}`;
    const ls = lines();
    const payload = `HOFGLUECK;${no};${iso(state.date)};${state.slot};${ls.map((l) => `${l.a.id}.${l.u.id}=${l.n}`).join(',')}`;
    const q = qrcode(0, 'M');
    q.addData(payload);
    q.make();
    return {
      no, payload, name: state.name, email: state.email, method: state.method, total: total(),
      when: `${fmtDate(state.date)} · ${T[state.slot]} (${cfg.slots[state.slot]})`,
      lines: ls.map((l) => ({ n: l.n, name: l.a.name, unit: l.u.label, sum: l.sum })),
      qr: q.createSvgTag({ cellSize: 6, margin: 12, scalable: true }),
    };
  }

  root.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.date) {
      const [y, m, d] = b.dataset.date.split('-').map(Number);
      state.date = new Date(y, m - 1, d);
      dropUnavailable();
      render();
      root.querySelector(`[data-date="${b.dataset.date}"]`)?.focus();
    } else if (b.dataset.month) {
      const dir = Number(b.dataset.month);
      state.month = new Date(state.month.getFullYear(), state.month.getMonth() + dir, 1);
      render();
      const again = root.querySelector(`[data-month="${dir}"]`);
      (again && !again.disabled ? again : root.querySelector('.cal-nav:not([disabled])'))?.focus();
    } else if (b.dataset.qty) {
      const k = b.dataset.qty; const dir = Number(b.dataset.d);
      state.qty[k] = Math.min(20, Math.max(0, (state.qty[k] || 0) + dir));
      state.notice = '';
      render();
      const again = root.querySelector(`[data-qty="${k}"][data-d="${dir}"]`);
      (again && !again.disabled ? again : root.querySelector(`[data-qty="${k}"]:not([disabled])`))?.focus();
    } else if (b.dataset.go) {
      const f = root.querySelector('#pay-form');
      if (f) { state.name = f.name.value; state.email = f.email.value; }
      state.step = Number(b.dataset.go);
      render();
      focusStep();
    } else if ('print' in b.dataset) {
      window.print();
    } else if ('reset' in b.dataset) {
      Object.assign(state, { step: 0, date: null, slot: null, qty: {}, notice: '', ticket: null, paying: false });
      render();
      focusStep();
    }
  });

  root.addEventListener('change', (e) => {
    if (e.target.name === 'slot') {
      state.slot = e.target.value;
      dropUnavailable();
      render();
      root.querySelector(`input[name=slot][value=${state.slot}]`)?.focus();
    } else if (e.target.name === 'method') {
      state.method = e.target.value;
    }
  });

  root.addEventListener('submit', (e) => {
    e.preventDefault();
    if (state.paying) return;
    const f = e.target;
    state.name = f.name.value.trim();
    state.email = f.email.value.trim();
    state.method = f.method.value;
    state.paying = true;
    render();
    setTimeout(() => {
      state.ticket = makeTicket();
      state.paying = false;
      state.step = 3;
      render();
      focusStep();
    }, 900);
  });

  window.addEventListener('hg-preselect', preselect);
  render();
  preselect();
})();
