(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const toggle = $('.nav-toggle');
  const nav = $('#site-nav');
  toggle?.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
  });

  // Recipe modals: also openable by deep link (#d-baerlauch) from the homepage.
  const openDlg = (d) => { if (d && !d.open) d.showModal(); };
  $$('[data-open]').forEach((b) => b.addEventListener('click', () => openDlg(document.getElementById(b.dataset.open))));
  $$('dialog.modal').forEach((d) => d.addEventListener('click', (e) => { if (e.target === d) d.close(); }));
  if (location.hash.startsWith('#d-')) openDlg(document.getElementById(location.hash.slice(1)));

  // Current season
  const m = new Date().getMonth() + 1;
  const season = m >= 3 && m <= 5 ? 'spring' : m <= 8 && m >= 6 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter';
  $$('[data-now]').forEach((g) => { g.hidden = g.dataset.now !== season; });
  $(`[data-now-tag="${season}"]`)?.removeAttribute('hidden');

  // Produce filters
  const chips = $$('.chip');
  chips.forEach((chip) => chip.addEventListener('click', () => {
    const f = chip.dataset.filter;
    chips.forEach((c) => c.setAttribute('aria-pressed', c === chip));
    $$('.season-group').forEach((g) => {
      let any = false;
      $$('.card-produce', g).forEach((card) => {
        const show = f === 'all' || card.dataset.season === f || card.dataset.tags.split(' ').includes(f);
        card.hidden = !show;
        any = any || show;
      });
      g.hidden = !any;
    });
  }));

  // Two-click map: nothing goes to Google until the visitor asks.
  $('#map-load')?.addEventListener('click', () => {
    const map = $('#map');
    const f = document.createElement('iframe');
    f.src = map.dataset.src; f.title = map.dataset.title; f.loading = 'lazy'; f.referrerPolicy = 'no-referrer-when-downgrade';
    map.replaceChildren(f);
    map.classList.add('loaded');
  });

  // Carry an activity choice to the booking form on another page.
  $$('[data-book]').forEach((a) => a.addEventListener('click', () => {
    try { sessionStorage.setItem('hg-preselect', a.dataset.book); } catch { /* storage blocked: booking still works */ }
    window.dispatchEvent(new Event('hg-preselect'));
  }));
})();
