// Zero-dependency static site generator: writes dist/ (DE at root, /en/, /vi/).
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { site, pricing, abo } from './src/content/site.mjs';
import { ui } from './src/content/ui.mjs';
import { activities, unitLabels } from './src/content/activities.mjs';
import { animals } from './src/content/animals.mjs';
import { produce, seasons } from './src/content/produce.mjs';

const credits = JSON.parse(readFileSync('src/content/image-credits.json', 'utf8'));
const LANGS = ['de', 'en', 'vi'];
const OUT = 'dist';

class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const conv = (v) => (v == null || v === false ? '' : v instanceof Raw ? v.s : Array.isArray(v) ? v.map(conv).join('') : esc(v));
const html = (strs, ...vals) => new Raw(strs.reduce((a, s, i) => a + s + (i < vals.length ? conv(vals[i]) : ''), ''));

const PAGES = { home: 'index.html', about: 'ueber-uns.html', exp: 'erlebnisse.html', abo: 'hof-abo.html', prod: 'hofprodukte.html', animals: 'unsere-tiere.html', contact: 'kontakt.html' };
const money = (n, lang) => new Intl.NumberFormat(ui[lang].locale, { style: 'currency', currency: 'EUR' }).format(n);
const coords = `${site.geo.lat.toFixed(7)},${site.geo.lng.toFixed(7)}`;
const mapQuery = encodeURIComponent(coords);

function ctx(lang, file) {
  const up = lang === 'de' ? '' : '../';
  return { lang, t: ui[lang], up, a: (p) => `${up}assets/${p}`, file };
}
const pic = (c, img, alt, cls = '', eager = false) => {
  const m = credits[img];
  return html`<img class="${cls}" src="${c.a(`img/${img}.webp`)}" alt="${alt}" width="${m.w}" height="${m.h}" ${new Raw(eager ? 'fetchpriority="high"' : 'loading="lazy"')}>`;
};
const ALTS = {
  hero: { de: 'Schafe auf einer grünen Wiese', en: 'Sheep on a green meadow', vi: 'Đàn cừu trên đồng cỏ xanh' },
  alpakas: { de: 'Alpakas auf einer Weide', en: 'Alpacas on a pasture', vi: 'Đàn alpaca trên đồng cỏ' },
  zittau: { de: 'Zittauer Gebirge', en: 'Zittau Mountains', vi: 'Dãy núi Zittau' },
  kiste: { de: 'Kisten mit frischem Gemüse', en: 'Crates of fresh vegetables', vi: 'Các thùng rau tươi' },
  schaf: { de: 'Schwarznasenschafe', en: 'Valais Blacknose sheep', vi: 'Cừu mũi đen Valais' },
};
const logo = new Raw(`<svg viewBox="0 0 48 48" width="40" height="40" aria-hidden="true"><circle cx="24" cy="24" r="23" fill="#2E7D32"/><path d="M6 33c7-5 13-5 18-2s12 3 18-2v8a23 23 0 0 1-36 0z" fill="#FFFDD0"/><path d="M24 31V17" stroke="#FFFDD0" stroke-width="2.6" stroke-linecap="round"/><path d="M24 21c0-6 4-10 11-10 0 7-4 11-11 10zM24 25c0-5-3-8-9-8 0 6 3 9 9 8z" fill="#FFFDD0"/></svg>`);
const hills = new Raw(`<svg class="hills" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true"><path d="M0 90V52c180-44 320-44 520-16s300 40 480 6 300-34 440-8v56z" fill="currentColor"/></svg>`);

function layout(c, key, body, opts = {}) {
  const { t, lang, up, file } = c;
  const [title, desc] = opts.meta || t.meta[key];
  const hrefFor = (l) => `${l === lang ? '' : (lang === 'de' ? `${l}/` : l === 'de' ? '../' : `../${l}/`)}${file}`;
  const abs = (l) => `${site.url}/${l === 'de' ? '' : `${l}/`}${file === 'index.html' ? '' : file}`;
  const navItems = Object.keys(t.nav).map((k) => html`<li><a href="${PAGES[k]}" ${new Raw(k === key ? 'aria-current="page"' : '')}>${t.nav[k]}</a></li>`);
  return `<!DOCTYPE html>` + html`
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="${abs(lang)}">
${LANGS.map((l) => html`<link rel="alternate" hreflang="${l}" href="${abs(l)}">`)}
<link rel="alternate" hreflang="x-default" href="${abs('de')}">
<meta property="og:title" content="${title}"><meta property="og:description" content="${desc}"><meta property="og:type" content="website">
<meta property="og:image" content="${site.url}/assets/img/hero.webp"><meta property="og:locale" content="${t.locale.replace('-', '_')}">
<meta name="geo.region" content="DE-SN"><meta name="geo.placename" content="Zittau"><meta name="geo.position" content="${site.geo.lat};${site.geo.lng}">
<meta name="theme-color" content="#2E7D32">
${opts.noindex ? new Raw('<meta name="robots" content="noindex">') : ''}
<link rel="icon" href="${c.a('favicon.svg')}" type="image/svg+xml">
<link rel="preload" href="${c.a('fonts/fraunces-latin-wght-normal.woff2')}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${c.a('styles.css')}">
${opts.head || ''}
</head>
<body data-page="${key}">
<a class="skip" href="#main">${t.skip}</a>
<p class="demo-bar">${t.demo}</p>
<header class="site-header">
  <div class="wrap header-row">
    <a class="brand" href="index.html" aria-label="${site.name}">${logo}<span>Hofglück <em>Zittau</em></span></a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav"><span aria-hidden="true">☰</span> ${t.menu}</button>
    <nav id="site-nav" class="site-nav" aria-label="${t.menu}">
      <ul>${navItems}</ul>
      <ul class="lang" aria-label="Sprache / Language / Ngôn ngữ">
        ${LANGS.map((l) => html`<li><a href="${hrefFor(l)}" hreflang="${l}" lang="${l}" title="${ui[l].langName}" ${new Raw(l === lang ? 'aria-current="true"' : '')}>${l.toUpperCase()}</a></li>`)}
      </ul>
    </nav>
  </div>
</header>
<main id="main">${body}</main>
<footer class="site-footer">
  ${hills}
  <div class="footer-body"><div class="wrap footer-grid">
    <div><p class="brand brand-light">${logo}<span>Hofglück <em>Zittau</em></span></p><p>${t.footer.tagline}</p></div>
    <div><h2>${t.footer.visit}</h2>
      <p>${site.street}<br>${site.zip} ${site.city}</p>
      <p>${t.contact.hoursRows.map((r) => html`${r[0]}: ${r[1]}<br>`)}</p>
      <p><a href="tel:${site.phone.replace(/\s/g, '')}">${site.phone}</a><br><a href="mailto:${site.email}">${site.email}</a></p>
    </div>
    <div><h2>${t.footer.explore}</h2><ul>${navItems.slice(0, 5)}</ul></div>
    <div><h2>${t.footer.legal}</h2><ul>
      <li><a href="impressum.html">${t.footer.impressum}</a></li>
      <li><a href="datenschutz.html">${t.footer.privacy}</a></li>
      <li><a href="bildnachweis.html">${t.footer.credits}</a></li>
    </ul></div>
  </div></div>
</footer>
<script src="${c.a('js/app.js')}" defer></script>
${opts.scripts || ''}
</body></html>
`.s.replace(/^\n/, '');
}

const pageHead = (c, title, lead, img) => html`
<section class="page-head ${img ? 'has-img' : ''}">
  <div class="wrap page-head-grid">
    <div><h1>${title}</h1><p class="lead">${lead}</p></div>
    ${img ? pic(c, img[0], img[1], 'page-head-img', true) : ''}
  </div>
</section>`;

const priceText = (c, a) => {
  const p = pricing[a.id];
  if (p.free) return a[c.lang].free;
  const star = p.confirmed ? '' : '*';
  return Object.entries(p.units).map(([u, v]) => `${money(v, c.lang)}${star} / ${unitLabels[u][c.lang]}`).join(' · ');
};

function activityCard(c, a) {
  const d = a[c.lang];
  return html`<article class="card">
    ${pic(c, a.img, d.name, 'card-img')}
    <div class="card-body">
      <p class="eyebrow">${d.sub}</p>
      <h3>${d.name}</h3>
      <p>${d.text}</p>
      <dl class="facts"><div><dt>${c.t.exp.who}</dt><dd>${d.who}</dd></div><div><dt>${c.t.exp.when}</dt><dd>${d.when}</dd></div><div><dt>${c.t.exp.priceFrom}</dt><dd class="price">${priceText(c, a)}</dd></div></dl>
      ${pricing[a.id].free ? '' : html`<a class="btn btn-small" href="${c.file === 'erlebnisse.html' ? '' : 'erlebnisse.html'}#buchung" data-book="${a.id}">${c.t.cta.bookThis}</a>`}
    </div>
  </article>`;
}

function produceCard(c, p, withDialog = true) {
  const d = p[c.lang];
  const t = c.t.prod;
  const tags = (p.tags || []).map((x) => html`<span class="tag tag-${x}">${t[x]}</span>`);
  const dlgId = `d-${p.id}`;
  return html`<article class="card card-produce" data-season="${p.season}" data-tags="${(p.tags || []).join(' ')}">
    <div class="img-wrap">${pic(c, p.img, p.name, 'card-img')}<div class="tags">${tags}</div></div>
    <div class="card-body">
      <p class="eyebrow">${seasons[p.season][c.lang]} · ${seasons[p.season].range[c.lang]}</p>
      <h3>${p.name}</h3><p class="local">${d.local}</p>
      <p>${d.trait}</p>
      ${withDialog
        ? html`<button class="btn btn-small btn-ghost" type="button" data-open="${dlgId}">${c.t.cta.recipe}</button>`
        : html`<a class="btn btn-small btn-ghost" href="hofprodukte.html#${dlgId}">${c.t.cta.recipe}</a>`}
    </div>
    ${withDialog ? html`<dialog id="${dlgId}" class="modal" aria-labelledby="${dlgId}-t">
      <form method="dialog"><button class="modal-close" aria-label="${t.close}">×</button></form>
      ${pic(c, p.img, p.name, 'modal-img')}
      <div class="modal-body">
        <p class="eyebrow">${seasons[p.season][c.lang]} · ${seasons[p.season].range[c.lang]}</p>
        <h2 id="${dlgId}-t">${p.name}</h2><p class="local">${d.local}</p>
        <h3>${t.trait}</h3><p>${d.trait}</p>
        <h3>${t.nutrition}</h3><p>${d.nutrition}</p>
        <h3>${t.storage}</h3><p>${d.storage}</p>
        <div class="recipe"><h3>${t.recipe}: ${d.recipe}</h3><ol>${d.steps.map((s) => html`<li>${s}</li>`)}</ol></div>
      </div>
    </dialog>` : ''}
  </article>`;
}

function animalCard(c, a) {
  const d = a[c.lang]; const t = c.t.animals;
  return html`<article class="card card-animal">
    ${pic(c, a.img, `${a.name}: ${d.local}`, 'card-img')}
    <div class="card-body">
      <h3>${a.name}</h3><p class="local">${d.local}</p>
      <p>${d.trait}</p>
      <dl class="facts"><div><dt>${t.visit}</dt><dd>${d.visit}</dd></div><div><dt>${t.role}</dt><dd>${d.role}</dd></div></dl>
      <p class="rule"><strong>${t.rule}:</strong> ${d.rule}</p>
    </div>
  </article>`;
}

function homePage(c) {
  const { t, lang } = c; const h = t.home;
  const pick = (id) => activities.find((a) => a.id === id);
  const small = (a) => { const d = a[lang]; return html`<a class="card card-link" href="erlebnisse.html#buchung" data-book="${a.id}">${pic(c, a.img, d.name, 'card-img')}<div class="card-body"><p class="eyebrow">${d.sub}</p><h3>${d.name}</h3><p class="price">${priceText(c, a)}</p></div></a>`; };
  const jsonLd = { '@context': 'https://schema.org', '@type': ['LocalBusiness', 'TouristAttraction'], name: site.name, description: t.meta.home[1], url: site.url, telephone: site.phone, email: site.email, image: `${site.url}/assets/img/hero.webp`, priceRange: '€', address: { '@type': 'PostalAddress', streetAddress: site.street, postalCode: site.zip, addressLocality: site.city, addressRegion: 'Sachsen', addressCountry: 'DE' }, geo: { '@type': 'GeoCoordinates', latitude: site.geo.lat, longitude: site.geo.lng }, areaServed: ['Zittau', 'Oberlausitz', 'Sachsen'], openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], opens: site.hours.open, closes: site.hours.close }] };
  const head = new Raw(`<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`);
  const body = html`
  <section class="hero">
    ${pic(c, 'hero', ALTS.hero[c.lang], 'hero-img', true)}
    <div class="wrap hero-inner"><div class="hero-card">
      <p class="pill">${h.eyebrow}</p>
      <h1 lang="de">${h.tagline}</h1>
      <p class="lead">${h.lead}</p>
      <div class="btn-row"><a class="btn" href="erlebnisse.html#buchung">${t.cta.book}</a><a class="btn btn-ghost" href="hof-abo.html">${t.cta.abo}</a></div>
      <p class="hours">${t.hoursBadge}</p>
    </div></div>
  </section>
  <section class="stats"><div class="wrap stats-grid">${h.stats.map((s) => html`<div><strong>${s[0]}</strong><span>${s[1]}</span></div>`)}</div></section>
  <section class="section">
    <div class="wrap">
      <div class="section-head"><h2>${h.expTitle}</h2><p>${h.expLead}</p></div>
      <div class="grid grid-3">
        ${small(pick('fuehrung'))}${small(pick('fuettern'))}
        <a class="card card-link" href="hof-abo.html#kiosk">${pic(c, 'kiosk', h.kioskCard.name, 'card-img')}<div class="card-body"><p class="eyebrow">${h.kioskCard.sub}</p><h3>${h.kioskCard.name}</h3><p>${h.kioskCard.text}</p></div></a>
      </div>
      <p class="center"><a class="btn btn-ghost" href="erlebnisse.html">${t.cta.all}</a></p>
    </div>
  </section>
  <section class="section band-cream"><div class="wrap split">
    ${pic(c, 'kiste', h.aboTitle, 'rounded')}
    <div><h2>${h.aboTitle}</h2><p>${h.aboText}</p><ul class="checks">${h.aboPoints.map((x) => html`<li>${x}</li>`)}</ul><a class="btn" href="hof-abo.html">${t.cta.abo}</a></div>
  </div></section>
  <section class="section"><div class="wrap">
    <div class="section-head"><h2>${h.seasonTitle}</h2><p>${h.seasonLead}</p></div>
    ${Object.keys(seasons).map((s) => html`<div class="grid grid-3 season-now" data-now="${s}">${produce.filter((p) => p.season === s).map((p) => produceCard(c, p, false))}</div>`)}
    <p class="center"><a class="btn btn-ghost" href="hofprodukte.html">${t.cta.produce}</a></p>
  </div></section>
  <section class="section band-green"><div class="wrap">
    <div class="section-head"><h2>${h.animalsTitle}</h2><p>${h.animalsLead}</p></div>
    <div class="animal-strip">${animals.map((a) => html`<a href="unsere-tiere.html#${a.id}">${pic(c, a.img, a.name)}<span>${a.name}</span></a>`)}</div>
    <p class="center"><a class="btn btn-cream" href="unsere-tiere.html">${t.cta.animals}</a></p>
  </div></section>
  <section class="section"><div class="wrap split split-rev">
    ${pic(c, 'kiosk', h.kioskTitle, 'rounded')}
    <div><h2>${h.kioskTitle}</h2><p>${h.kioskText}</p><a class="btn btn-ghost" href="hof-abo.html#kiosk">${t.cta.kiosk}</a></div>
  </div></section>`;
  return layout(c, 'home', body, { head });
}

function aboutPage(c) {
  const a = c.t.about;
  return layout(c, 'about', html`
  ${pageHead(c, a.title, a.lead, ['alpaka-wiese', ALTS.alpakas[c.lang]])}
  <section class="section"><div class="wrap prose"><h2>${a.storyTitle}</h2>${a.story.map((p) => html`<p>${p}</p>`)}</div></section>
  <section class="section band-cream"><div class="wrap split">
    ${pic(c, 'zittau', ALTS.zittau[c.lang], 'rounded')}
    <div><h2>${a.visionTitle}</h2><p class="lead">${a.vision}</p></div>
  </div></section>
  <section class="section"><div class="wrap">
    <div class="section-head"><h2>${a.missionTitle}</h2></div>
    <div class="grid grid-3">${a.mission.map((m, i) => html`<div class="note-card"><span class="num">${i + 1}</span><h3>${m[0]}</h3><p>${m[1]}</p></div>`)}</div>
    <div class="btn-row center"><a class="btn" href="erlebnisse.html#buchung">${c.t.cta.book}</a><a class="btn btn-ghost" href="kontakt.html">${c.t.cta.contact}</a></div>
  </div></section>`);
}

function expPage(c) {
  const { t, lang } = c; const e = t.exp;
  const cfg = {
    locale: t.locale, i18n: t.booking, closedWeekday: site.hours.closedWeekday, slots: site.slots,
    activities: activities.filter((a) => !pricing[a.id].free).map((a) => ({ id: a.id, name: a[lang].name, slots: a.slots, months: a.months || null, confirmed: pricing[a.id].confirmed,
      units: Object.entries(pricing[a.id].units).map(([u, price]) => ({ id: u, label: unitLabels[u][lang], price })) })),
  };
  const json = new Raw(JSON.stringify(cfg).replace(/</g, '\\u003c'));
  return layout(c, 'exp', html`
  ${pageHead(c, e.title, e.lead)}
  <section class="section section-tight"><div class="wrap">
    <div class="grid grid-3">
      ${activities.map((a) => activityCard(c, a))}
      <article class="card">
        ${pic(c, 'kiosk', e.kiosk.name, 'card-img')}
        <div class="card-body"><p class="eyebrow">${e.kiosk.sub}</p><h3>${e.kiosk.name}</h3><p>${e.kiosk.text}</p><p class="price">${e.kioskNote}</p><a class="btn btn-small btn-ghost" href="hof-abo.html#kiosk">${t.cta.kiosk}</a></div>
      </article>
    </div>
    <p class="footnote">${e.footnote}</p>
  </div></section>
  <section class="section band-cream" id="buchung"><div class="wrap">
    <div class="section-head"><h2>${e.bookTitle}</h2><p>${e.bookLead}</p></div>
    <div id="booking" class="booking"></div>
    <noscript><p>JavaScript is required for online booking. ${site.phone}</p></noscript>
  </div></section>`, {
    scripts: html`<script type="application/json" id="booking-config">${json}</script>
<script src="${c.a('js/qrcode.js')}" defer></script>
<script src="${c.a('js/booking.js')}" defer></script>`,
  });
}

function aboPage(c) {
  const { t } = c; const a = t.abo;
  const cfg = { locale: t.locale, abo, i: { perBox: a.perBox, pfand: a.pfand, first: a.first, next: a.next } };
  const json = new Raw(JSON.stringify(cfg).replace(/</g, '\\u003c'));
  const label = { ok: '✓', pay: '€', lost: '×' };
  return layout(c, 'abo', html`
  ${pageHead(c, a.title, a.lead, ['kiste', ALTS.kiste[c.lang]])}
  <section class="section section-tight"><div class="wrap">
    <h2>${a.builder}</h2>
    <form id="abo-form" class="abo-form">
      <div class="abo-options">
        <fieldset><legend>${a.size}</legend><div class="choice-row">
          <label class="choice"><input type="radio" name="size" value="M" checked><span><strong>${a.small}</strong><small>${a.smallD}</small></span></label>
          <label class="choice"><input type="radio" name="size" value="L"><span><strong>${a.large}</strong><small>${a.largeD}</small></span></label>
        </div></fieldset>
        <fieldset><legend>${a.freq}</legend><div class="choice-row">
          <label class="choice"><input type="radio" name="freq" value="weekly" checked><span><strong>${a.weekly}</strong></span></label>
          <label class="choice"><input type="radio" name="freq" value="monthly"><span><strong>${a.monthly}</strong></span></label>
        </div></fieldset>
        <fieldset><legend>${a.day}</legend><div class="choice-row">
          ${a.days.map((d, i) => html`<label class="choice"><input type="radio" name="day" value="${d}" ${new Raw(i ? '' : 'checked')}><span><strong>${d}</strong></span></label>`)}
        </div></fieldset>
        <div class="field-row"><label>${a.name}<input name="name" required autocomplete="name"></label><label>${a.email}<input name="email" type="email" required autocomplete="email"></label></div>
      </div>
      <aside class="summary" aria-live="polite">
        <div id="abo-summary"></div>
        <button class="btn btn-block" type="submit">${a.submit}</button>
        <p class="small">${a.noteDemo}</p>
        <p class="small">${a.footnote}</p>
      </aside>
    </form>
    <div id="abo-done" class="done" hidden tabindex="-1"><h3>${a.done}</h3><p>${a.doneText} <strong id="abo-no"></strong></p></div>
  </div></section>
  <section class="section band-cream" id="pfand"><div class="wrap">
    <div class="section-head"><h2>${a.pfandTitle}</h2><p>${a.pfandLead}</p></div>
    <div class="pfand-grid">${a.cases.map((x) => html`<div class="pfand-case pfand-${x[0]}"><span class="pfand-icon" aria-hidden="true">${label[x[0]]}</span><h3>${x[1]}</h3><p>${x[2]}</p><p class="pfand-result">${x[3]}</p></div>`)}</div>
    <h3 class="terms-title">${a.termsTitle}</h3>
    <div class="terms">${a.terms.map((x) => html`<details><summary>${x[0]}</summary><p>${x[1]}</p></details>`)}</div>
  </div></section>
  <section class="section" id="kiosk"><div class="wrap split">
    <div>
      <h2>${a.kioskTitle}</h2><p class="lead">${a.kioskLead}</p>
      <h3>${a.range}</h3>
      <ul class="range">${a.rangeItems.map((x) => html`<li><strong>${x[0]}</strong> <span>${x[1]}</span></li>`)}</ul>
      <dl class="facts"><div><dt>${a.kioskHours}</dt><dd>${a.kioskHoursText}</dd></div><div><dt>${a.kioskPay}</dt><dd>${a.kioskPayText}</dd></div></dl>
    </div>
    ${pic(c, 'kiosk', a.kioskTitle, 'rounded')}
  </div></section>`, { scripts: html`<script type="application/json" id="abo-config">${json}</script><script src="${c.a('js/abo.js')}" defer></script>` });
}

function prodPage(c) {
  const t = c.t.prod;
  return layout(c, 'prod', html`
  ${pageHead(c, t.title, t.lead)}
  <section class="section section-tight"><div class="wrap">
    <div class="filters" role="group" aria-label="${t.season}">
      <button type="button" class="chip" data-filter="all" aria-pressed="true">${t.all}</button>
      ${Object.entries(seasons).map(([k, s]) => html`<button type="button" class="chip" data-filter="${k}" aria-pressed="false">${s[c.lang]}</button>`)}
      <button type="button" class="chip chip-alt" data-filter="rare" aria-pressed="false">${t.rare}</button>
      <button type="button" class="chip chip-alt" data-filter="vn" aria-pressed="false">${t.vn}</button>
    </div>
    ${Object.entries(seasons).map(([k, s]) => html`<div class="season-group" data-group="${k}">
      <h2>${s[c.lang]} <small>${s.range[c.lang]}</small> <span class="tag tag-now" data-now-tag="${k}" hidden>${t.current}</span></h2>
      <div class="grid grid-3">${produce.filter((p) => p.season === k).map((p) => produceCard(c, p))}</div>
    </div>`)}
  </div></section>`);
}

function animalsPage(c) {
  const t = c.t.animals;
  return layout(c, 'animals', html`
  ${pageHead(c, t.title, t.lead, ['schwarznase', ALTS.schaf[c.lang]])}
  <section class="section section-tight"><div class="wrap">
    <div class="grid grid-3">${animals.map((a) => html`<div id="${a.id}" class="anchor-card">${animalCard(c, a)}</div>`)}</div>
    <p class="footnote">${t.photo}</p>
    <p class="center"><a class="btn" href="erlebnisse.html#buchung">${c.t.cta.book}</a></p>
  </div></section>`);
}

function contactPage(c) {
  const t = c.t.contact;
  return layout(c, 'contact', html`
  ${pageHead(c, t.title, t.lead, ['zittau', ALTS.zittau[c.lang]])}
  <section class="section section-tight"><div class="wrap">
    <div class="grid grid-3">
      <div class="note-card"><h2>${t.addr}</h2><p>${site.name}<br>${site.street}<br>${site.zip} ${site.city}</p><p class="small">Plus Code: ${site.plusCode}<br>GPS: ${coords.replace(',', ', ')}</p></div>
      <div class="note-card"><h2>${t.hours}</h2><table class="hours-table">${t.hoursRows.map((r) => html`<tr><th scope="row">${r[0]}</th><td>${r[1]}</td></tr>`)}</table></div>
      <div class="note-card"><h2>${t.write}</h2><p><a href="tel:${site.phone.replace(/\s/g, '')}">${site.phone}</a><br><a href="mailto:${site.email}">${site.email}</a></p></div>
    </div>
    <h2 class="mt">${t.mapTitle}</h2>
    <div class="map" id="map" data-src="https://www.google.com/maps?q=${mapQuery}&output=embed" data-title="${t.mapTitle}">
      <p>${t.mapText}</p>
      <div class="btn-row"><button class="btn" type="button" id="map-load">${t.mapBtn}</button>
      <a class="btn btn-ghost" rel="noopener" target="_blank" href="https://www.google.com/maps/search/?api=1&query=${mapQuery}">${t.mapOpen}</a></div>
    </div>
  </div></section>`);
}

function legalPage(c, key, title, content) {
  return layout(c, key, html`${pageHead(c, title, c.t.legalNote)}<section class="section section-tight"><div class="wrap prose" lang="de">${content}</div></section>`, { meta: [`${title} | ${site.name}`, `${title} ${site.name}`], noindex: true });
}
const impressum = html`
  <p class="placeholder">Platzhalter: Vor der Veröffentlichung vollständig ausfüllen und rechtlich prüfen lassen.</p>
  <h2>Angaben gemäß § 5 DDG</h2><p>${site.owner}<br>${site.name}<br>${site.street}<br>${site.zip} ${site.city}</p>
  <h2>Kontakt</h2><p>Telefon: ${site.phone}<br>E-Mail: ${site.email}</p>
  <h2>Umsatzsteuer-ID</h2><p>[USt-IdNr. gemäß § 27a UStG, falls vorhanden]</p>
  <h2>Verantwortlich für den Inhalt</h2><p>${site.owner}, Anschrift wie oben</p>`;
const privacy = html`
  <p class="placeholder">Platzhalter: Vor der Veröffentlichung vollständig ausfüllen und rechtlich prüfen lassen.</p>
  <h2>Verantwortlicher</h2><p>${site.owner}, ${site.street}, ${site.zip} ${site.city}, ${site.email}</p>
  <h2>Diese Demo-Version</h2><p>Die Formulare für Buchung und Abo verarbeiten Ihre Eingaben nur im Browser. Es werden keine Daten an einen Server gesendet und keine Zahlungen ausgeführt.</p>
  <h2>Schriften und Cookies</h2><p>Schriftarten werden von dieser Website selbst ausgeliefert. Diese Website setzt keine Cookies und kein Tracking ein.</p>
  <h2>Google Maps</h2><p>Die Karte wird erst nach Ihrem Klick auf „Karte laden" von Google geladen. Dabei werden Daten wie Ihre IP-Adresse an Google übertragen (Art. 6 Abs. 1 lit. a DSGVO).</p>
  <h2>Ihre Rechte</h2><p>Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch und Beschwerde bei einer Aufsichtsbehörde.</p>`;

function creditsPage(c) {
  const t = c.t.credits;
  return layout(c, 'credits', html`${pageHead(c, t.title, t.lead)}<section class="section section-tight"><div class="wrap table-scroll"><table class="credits"><thead><tr>${t.col.map((x) => html`<th scope="col">${x}</th>`)}</tr></thead><tbody>
    ${Object.entries(credits).map(([, v]) => html`<tr><td><a href="${v.page}" rel="noopener" target="_blank">${v.title}</a></td><td>${v.artist}</td><td>${v.licurl ? html`<a href="${v.licurl}" rel="noopener license" target="_blank">${v.license}</a>` : v.license}</td></tr>`)}
  </tbody></table></div></section>`, { meta: [`${t.title} | ${site.name}`, t.lead] });
}

// ---- write
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync('src/assets', join(OUT, 'assets'), { recursive: true });
writeFileSync(join(OUT, '.nojekyll'), '');
const urls = [];
for (const lang of LANGS) {
  const dir = lang === 'de' ? OUT : join(OUT, lang);
  mkdirSync(dir, { recursive: true });
  const render = {
    'index.html': homePage, 'ueber-uns.html': aboutPage, 'erlebnisse.html': expPage, 'hof-abo.html': aboPage,
    'hofprodukte.html': prodPage, 'unsere-tiere.html': animalsPage, 'kontakt.html': contactPage, 'bildnachweis.html': creditsPage,
    'impressum.html': (c) => legalPage(c, 'impressum', ui[lang].footer.impressum, impressum),
    'datenschutz.html': (c) => legalPage(c, 'privacy', ui[lang].footer.privacy, privacy),
  };
  for (const [file, fn] of Object.entries(render)) {
    const out = join(dir, file);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, fn(ctx(lang, file)));
    urls.push(`${site.url}/${lang === 'de' ? '' : `${lang}/`}${file === 'index.html' ? '' : file}`);
  }
}
writeFileSync(join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`);
writeFileSync(join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`);
console.log(`Built ${urls.length} pages into ${OUT}/`);
