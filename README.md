# Hofglück Zittau

Static website for the Hofglück Zittau experience farm, in German (default), English and Vietnamese. Needs Node 18+ and has no dependencies.

    npm start         # build, then preview at http://localhost:4173
    npm run build     # write the site to dist/

Upload the contents of `dist/` to any static host. Before going live, set the real domain in `site.url`, because canonical links, hreflang and the sitemap use it.

## Where to edit

| What | File |
| --- | --- |
| Address, hours, prices, Pfand | `src/content/site.mjs` |
| Activities | `src/content/activities.mjs` |
| Animals | `src/content/animals.mjs` |
| Produce and recipes | `src/content/produce.mjs` |
| Interface text and page copy | `src/content/ui.mjs` |
| Image credits | `src/content/image-credits.json` |
| Page templates, Impressum, Datenschutz | `build.mjs` |
| Styles and browser scripts | `src/assets/` |

Prices with `confirmed: false` in `site.mjs` are shown with an asterisk until confirmed.

## Not real yet

Payment, ticket email and Abo sign-up are simulated in the browser. Nothing is sent to a server, so they need a backend and a payment provider before real use.

The QR library in `src/assets/js/qrcode.js` is qrcode-generator (MIT).
