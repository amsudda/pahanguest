# Pahan Guest

Marketing site for a three-room guesthouse in Anuradhapura, Sri Lanka. An [Astro](https://astro.build)
project — one page (`src/pages/index.astro`), the design's original vanilla CSS and JS untouched and
served as plain static files (`public/assets/`), no other framework, no client-side hydration.
Implemented from the `Kadju House.dc.html` artboard in the *Kadju House website design* Claude Design
project (which also holds the `BookingForm` component it imports). The design was drawn for a fictional
south-coast guesthouse; the brand and all location copy have since been moved to Pahan Guest in
Anuradhapura.

```sh
npm install
npm run dev      # http://localhost:4321, live reload
npm run build    # -> dist/
npm run preview  # serve dist/ locally, as it will be deployed
```

## Why Astro, and why so little of it

This was originally a hand-written flat `index.html` + `assets/`. Moving it into Astro bought a
dev server, a build step, and a real project layout, for free — but the page has no data to fetch,
no routes beyond the one, and its interactivity (booking form, overlays, gallery, scroll chrome,
client-side room "pages" at `#/room/slug`) was already a single self-contained script with no
framework dependency. Rewriting that into Astro components/islands would have meant re-deriving and
re-testing ~800 lines of working, already-tested vanilla JS for no behavioural gain. So:

- **`src/pages/index.astro`** is the page — the same markup as the old `index.html`, wrapped in a
  `<Layout>` for the `<head>` boilerplate. It's one file, not decomposed into components, because
  nothing on this single-page site repeats across pages.
- **`public/assets/`** holds the original `styles.css`, `app.js` and every photo, byte-for-byte
  unchanged, referenced with `is:inline` script tags so Astro passes them through rather than
  bundling — the CSS and JS are exactly what they were before, just served from a `public/` folder
  instead of the repo root.

If the site grows into something that actually needs Astro's component model (a blog, multiple real
pages, server data), decomposing `index.astro` into `src/components/*.astro` is the natural next step
— nothing here forecloses it.

## Deploying to Vercel

The repo is already set up for it — no config needed beyond what's committed.

**Via the dashboard:** push this repo to GitHub, then
[import it on Vercel](https://vercel.com/new). It has an `astro` dependency in `package.json`, so
Vercel auto-detects the Astro framework preset, runs `astro build`, and serves `dist/` — nothing to
configure (`vercel.json` also states `"framework": "astro"` explicitly, belt and braces).

**Via the CLI**, from this folder:

```sh
npx vercel        # first deploy — follow the prompts, links the project
npx vercel --prod # promote to production
```

Two things already handled:

- **`.gitignore`** excludes `node_modules/`, `dist/` and `.astro/` (Astro's cache — all regenerated
  by `npm install` / `npm run build`), `Guest house images/` (120MB of raw photo originals — the
  site only ever uses the processed copies in `public/assets/img/`, ~5.5MB total), and `.claude/`,
  none of which are part of the deployed site.
- **`vercel.json`** sets a day-long cache on `assets/img/*` (the filenames aren't content-hashed, so
  nothing longer — replacing a photo under the same name should still reach visitors reasonably
  soon) plus baseline `X-Content-Type-Options` / `Referrer-Policy` headers. No rewrites are needed:
  routing is client-side hash fragments (`#/room/garden-room`), so every URL Vercel ever serves is
  just the one built `index.html`.

## Files

```
astro.config.mjs             output: 'static' — no adapter, no SSR
src/layouts/Layout.astro     <head> boilerplate (meta, fonts, the two is:inline scripts)
src/pages/index.astro        the whole page — markup for both screens, overlays, booking-form template
public/assets/css/styles.css design tokens + all styling — unchanged from the original, passthrough
public/assets/js/app.js      booking form, overlays, gallery, scroll chrome, routing — unchanged, passthrough
public/assets/img/           the site's photography — unchanged, passthrough
```

## Configuration

The WhatsApp number and the house name are read from `<body>` in `src/pages/index.astro` — change
them in one place:

```html
<body data-phone="94772813748" data-house="Pahan Guest">
```

`data-phone` is in international format with no `+` or spaces (what `wa.me` expects).
The phone number also appears literally in the `tel:` links, the footer, the mobile menu
and the JSON-LD block; search for `94772813748` to catch all of them.

## Still to replace

Copy inherited from the design template that describes a business that does not exist:

- **Reviews** — every quote and name in the reviews section is invented (there's no
  Google Business or Booking.com listing yet, and no review-collection system in place).
  They're deliberately *not* attributed to a platform and don't link out to one, per the
  owner's request — swap in real quotes as they come in, or delete the section. The hero's
  rating line and the reviews header use an honest stand-in ("usually booked full, most
  months") instead of a fabricated score; the JSON-LD `aggregateRating` was removed and the
  schema `@type` changed from `BedAndBreakfast` to `GuestHouse` for the same reason.
- **Hosts** — "Nadeeka & Sunil Fernando" are invented names.
- **Address and phone are real**, from the owner's flyer: No. 1050, Stage 2, D. S. Senanayake
  Mawatha, Anuradhapura, and `+94 77 281 3748`. Postcode 50000 and North Central Province were
  inferred (correct for Anuradhapura) and not on the flyer — worth confirming.
- **Email is still a placeholder** — `reservations@pahanguest.lk` — no real address was given.
- **Distances** — the times to Sri Maha Bodhi, Ruwanwelisaya, Mihintale, Isurumuniya and
  Nuwara Wewa are plausible for a town guesthouse but depend on where the house actually is.

Prices were on the site (US$42 / US$55 / US$78, from the design template) and have been removed
at the owner's request — no room card, the room detail page, or `ROOMS` in `app.js` mentions a
rate; ask on WhatsApp instead. Room copy and the gallery captions still live at the top of
`public/assets/js/app.js` (`ROOMS`, `PHOTOS`).

## Photography

The gallery is a plain grid of real photographs of the house, in `public/assets/img/`. Originals
are in `Guest house images/`.

| slot | file | shows |
| --- | --- | --- |
| 1 | `house-garden.jpg` | the house across the lawn, tuk-tuk by the verandah |
| 2 | `balcony.jpg` | upstairs balcony, balusters, mango tree |
| 3 (centre) | `house-front.jpg` | front of the house framed by the tree |
| 4 | `room-beds.jpg` | guest room, double and single bed |
| 5 | `dining.jpg` | dining room under the ceiling fan |
| 6 | `entrance-path.jpg` | stepping stones to the front steps |

The room detail page's three small photos (bed detail, bathroom, view from the window — there's no
real shot of any of these yet) are still a striped placeholder. The `data-shot` attribute on each
one is the brief for that frame and renders as caption text while the placeholder is in place:

```html
<div class="ph ph--3x4" data-shot="bed detail"></div>
```

To drop in a real photo, replace the element, add it under `public/assets/img/`, and keep the
aspect-ratio class off:

```html
<img src="/assets/img/bed-detail.jpg" alt="The bed, made up with the mosquito net down" width="1200" height="1600" loading="lazy">
```

## The hero slideshow

The hero is a crossfading photo slideshow, not a video — four real photos in
`#heroSlideshow` (`/assets/img/hero-1.jpg` … `hero-4.jpg`), each a stacked
full-bleed `<img>`. `app.js` toggles `.is-on` on the next slide every 5s
(`SLIDE_MS`); the fade itself is a CSS `opacity` transition on `.hero__slide`.

- Pauses when the tab is hidden (`visibilitychange`), so a background tab
  doesn't burn through slides unseen, and resumes when it's visible again.
- The existing "Pause slideshow" button stops/resumes it — same control the
  design used for a video, relabelled.
- Doesn't auto-advance at all under `prefers-reduced-motion` — it stays on
  the first slide unless the visitor manually pauses/plays.
- The first slide loads `fetchpriority="high"` with no `loading` attribute
  (it's the LCP candidate); the other three are `loading="lazy"`.

To add or replace slides, add another `<img class="hero__slide">` inside
`#heroSlideshow` and nothing else needs to change — `slides.length` is read
from the DOM. Each source photo was resized to 2400×1500 (`fit: cover`) since
the CSS already applies `object-fit: cover`, so browser-side cropping handles
every viewport; no hand-cropping per aspect ratio needed.

If you'd rather use a real video clip here instead, swap `#heroSlideshow` for
a single `<video class="hero__video" autoplay muted loop playsinline poster="…">`
— the CSS rule for `.hero__video` still exists in `public/assets/css/styles.css` for that path.
Put the file under `public/assets/video/`; nothing needs excluding for it in `.gitignore`.

## How this differs from the artboard

The canvas file is a design surface; four things were translated rather than copied:

- **Responsive switching.** The artboard drove its wide/narrow layouts from a JS
  `window.innerWidth <= 820` flag. That is a CSS `@media (max-width: 820px)` block here,
  so the first paint is already correct and the layout survives with JS off.
- **Scroll work.** The artboard polled on `requestAnimationFrame` for the life of the page.
  Reveals, counters and the SVG draw-on now use `IntersectionObserver`; the header, hero
  parallax and floating buttons use a rAF-throttled scroll listener.
- **The room screen is addressable.** It was a `screen` state flag; it is now
  `#/room/garden-room`, so room pages can be linked and the browser Back button works.
  Returning to the home screen restores your place in the page instead of jumping to the top.
- **Accessibility.** Gallery photos are real buttons rather than click handlers on `<figure>`;
  the FAQ uses `aria-expanded`/`aria-controls`; the three overlays trap focus, lock scroll and
  restore focus on close; form errors are wired up with `aria-describedby`.

Colours, type scale and spacing are unchanged from the design.

## The gallery

`.gal__grid` is a plain responsive CSS grid — `repeat(auto-fit, minmax(240px, 1fr))`, uniform 4:3
tiles, `object-fit: cover`, no overlap, no scroll-driven animation. Clicking any photo opens the
same fullscreen lightbox as everywhere else on the site (`data-lb` is a generic hook, not specific
to the gallery); `PHOTOS` in `app.js` is indexed to match the six tiles in DOM order.

An earlier version pinned the section and scrubbed a scroll-driven zoom across six absolutely-
positioned, deliberately overlapping tiles (rebuilt from the "scale grid" section on
discoverybuildersllc.com). It read as broken clutter rather than a deliberate effect and was
replaced outright — nothing about it survives, including the reduced-motion path, which needed no
special-casing to begin with once the layout stopped depending on scroll position.

Press feedback and the hover-zoom use the same shared conventions as every other button/photo on
the site (`--press`, `--t-press`, the `@media (hover: hover)` gate) — see Motion, below.

## Motion

All timing lives in the tokens at the top of `public/assets/css/styles.css`. The rules behind them:

- **One curve.** `--ease: cubic-bezier(0.22, 1, 0.36, 1)` is the design's own, and it is
  already a strong ease-out, so it covers entrances and feedback. `--ease-drawer` is the
  iOS-style curve for the bottom sheet. `linear` is used only for the review marquee, where
  the motion is constant. Nothing uses `ease-in` — it withholds movement at the exact moment
  the user is watching, which reads as lag.
- **Entry and exit are asymmetric.** Overlays come in over `--t-enter` (320ms) and leave over
  `--t-exit` (200ms). Deciding is slow, responding is fast.
- **Overlays animate in both directions.** Each carries its closed state on the base class and
  its open state on `.is-open`, so the same transition runs in reverse and can be interrupted
  mid-flight — reopening the lightbox while it is fading out cancels the pending removal
  rather than restarting from zero. JS sets `[hidden]` only once the exit has played, and a
  closed overlay is `pointer-events: none` so it cannot swallow clicks while invisible.
- **The sheet leaves the way it arrived**, by `translateY(100%)` — its own height, whatever the
  content — so it reads as one object sliding rather than a box fading.
- **Every control answers the press** with `scale(var(--press))` in 140ms. Full-width accordion
  rows and inline text links are excluded, where shrinking the row reads as a glitch.
- **Hover is gated** behind `@media (hover: hover) and (pointer: fine)`. Without it a tap fires
  `:hover` and leaves the photo stuck at 1.04.
- **Reduced motion means gentler, not none.** Opacity and colour still transition (they carry
  meaning — that an overlay arrived, that a field is invalid); everything that moves is dropped,
  including the press scale and the header's slide-away.

Two performance notes: only `transform` and `opacity` are transitioned on anything that runs
during scroll, and the hero's corner radius — the one property there that forces a repaint of a
full-viewport layer — is quantised to whole pixels, so it repaints about twenty times across the
hero instead of once per frame.
