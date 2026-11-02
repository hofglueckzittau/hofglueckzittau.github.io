(() => {
  const cfg = JSON.parse(document.getElementById('abo-config').textContent);
  const form = document.getElementById('abo-form');
  const out = document.getElementById('abo-summary');
  const eur = (n) => new Intl.NumberFormat(cfg.locale, { style: 'currency', currency: 'EUR' }).format(n);
  const row = (a, b, cls = '') => {
    const d = document.createElement('div');
    d.className = `sum-row ${cls}`;
    const x = document.createElement('span'); x.textContent = a;
    const y = document.createElement('span'); y.textContent = b;
    d.append(x, y);
    return d;
  };
  const render = () => {
    const box = cfg.abo[form.size.value];
    out.replaceChildren(
      row(cfg.i.perBox, eur(box.price)),
      row(cfg.i.pfand, eur(box.pfand)),
      row(cfg.i.first, eur(box.price + box.pfand), 'sum-total'),
      row(cfg.i.next, eur(box.price)),
    );
  };
  form.addEventListener('change', render);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const code = [...crypto.getRandomValues(new Uint8Array(3))].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    document.getElementById('abo-no').textContent = `HA-${form.size.value}-${code}`;
    const done = document.getElementById('abo-done');
    done.hidden = false;
    done.focus();
  });
  render();
})();
