# Viktoriia Polotniuk: portfolio site

A static site (plain HTML/CSS/JS, no framework). The finished site is the **`public/`** folder.

## Folders

| Folder | What it is |
|---|---|
| `public/` | **The site itself.** This is what gets deployed. |
| `public/assets/` | Images and the DeFonte font (readable names; `.webp` is the compressed copy of photos and screens) |
| `src-proto/` | Copies of the prototype boards (`*.dc.html`) the pages are built from |
| `tools/` | Helper scripts (see below) |
| `.github/workflows/pages.yml` | Automatic publishing to GitHub Pages |

## Pages

- `/`: Work (with the loader on the first visit in a session)
- `/about/`
- `/work/app-rebrand-design-system/`, `/work/discover-tab/`, `/work/smart-interior-search/`, `/work/ai-background-removal/`
- `404.html`: "Nothing here"

## Running it on your computer

```bash
npm install
npm start
```
Then open http://localhost:3000.

## Scripts in `tools/`

- `node tools/build.mjs`: rebuilds the pages in `public/` from `src-proto/`. Run it after changing the prototype. Set the domain like this: `SITE_URL=https://domain.com node tools/build.mjs`.
- `node tools/optimize.mjs`: makes WebP copies of photos and screens. Hand-drawn PNGs stay as they are.
- `node tools/icons.mjs`: favicons, `site.webmanifest` and `og-image.png`.
- `node tools/measure.mjs`: checks page heights against the board heights (1280 / 1440 / 834 / 375).
- `node tools/check.mjs`: automated check of the interactions (header, TOC, lightbox, email, bottom bar, 404).
- `node tools/check2.mjs` … `check4.mjs`: loader, header plate, glass, videos, 4× lightbox, keyboard, touch gestures, Back/Forward, reduced motion.
- `node tools/qa.mjs`: full sweep of every page at 375 / 834 / 1280 / 1440 (+ reduced motion): JS errors, missing files, horizontal scroll, alt texts, links, image sharpness.
- `node tools/shrink.mjs`: shrinks hand-drawn PNGs to 3× of the largest size they are shown at (originals stay in `tools/originals/`).

All checks need the local server running (`npm start`).

> ⚠️ `build.mjs` overwrites the HTML in `public/`. If you edit text directly in `public/*.html`, do not run the build afterwards, or make the same edit in `src-proto/` too.

## Images and videos from `hires/`

`node tools/optimize.mjs` turns the files from `hires/` into:
- `assets/<name>@full.webp`: 4× images used **only in the lightbox**. They load when the lightbox opens; the page itself shows the regular images.
- `assets/<name>.webm` + `.mp4` + `-poster.webp`: the Case 4 videos that replaced the GIFs. They play only while visible on screen and open in the lightbox.

After adding new files to `hires/`, run `node tools/optimize.mjs && node tools/build.mjs`.

## Glass (scroll distortion)

The file is `public/js/glass.js`. To compare variants, add one of these to the address: `?glass=band` (default), `?glass=pill`, `?glass=off`.
To turn it off completely, delete the `<script src="/js/glass.js">` line in `tools/build.mjs` and run the build.
