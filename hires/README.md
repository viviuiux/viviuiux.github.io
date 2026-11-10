# hires/ — files for the developer

All files are named after the image they belong to in `public/assets/`.

## 1. Case 4 — GIF → video

| Replaces (public/assets/) | New files | Size |
|---|---|---|
| `ai-removes-the-background-from-a-photo-of-a-pain.gif` (1.0 MB) | `.webm` (VP9, 68 KB) · `.mp4` (H.264, 90 KB) · `-poster.jpg` (first frame) | 2400×1172, 3.76 s loop, same timing as the GIF |
| `touch-up-mode-erasing-and-restoring-parts-of-the.gif` (2.8 MB) | `.webm` (VP9, 208 KB) · `.mp4` (H.264, 227 KB) · `-poster.jpg` | 2400×1172, 10.16 s loop, same timing as the GIF |

**The grey panel is part of the video** (2400×1172 = the whole 600×293 frame at 4×, `#ECECEC`, phone centred, the GIF's white corners removed). So the whole frame is clickable, the expand badge sits in the frame corner, and the lightbox shows the frame, like every other case image. The video fills the panel (`width:100%; height:100%; object-fit:cover`), so on phones the panel's sides are cropped and the phone keeps its size. Cursor over it: the normal arrow.

Markup: `<video autoplay muted loop playsinline preload="metadata" poster="…-poster.jpg" width="600">` with `<source type="video/webm">` first, then `<source type="video/mp4">`. Keep the same alt text as an `aria-label`. With `prefers-reduced-motion: reduce`, don't autoplay — show the poster.
The videos have no sound. They also open in the lightbox (show the video there instead of an `<img>`).

## 2. Lightbox only — 4× images (@full)

2400 px wide PNG, exported from Figma at 4× (inner photos/screens are 3.3–13× the frame size, so the extra detail is real, not upscaled).
Checked against the current 1200 px files: same crop and content, same transparency.

| Page image (public/assets/) | Lightbox file (hires/) | Size |
|---|---|---|
| Case 1 · `variables-old-vs-redesign-and-component-docs.png` | `variables-old-vs-redesign-and-component-docs@full.png` | 2400×2760 |
| Case 1 · `new-brand-screens.png` | `new-brand-screens@full.png` | 2400×2480 |
| Case 1 · `tarot-before-and-after.png` | `tarot-before-and-after@full.png` | 2400×2192 |
| Case 2 · `discover-tab-tarot-splash-content-and-csat-scree.png` | `discover-tab-tarot-splash-content-and-csat-scree@full.png` | 2400×2748 |
| Case 2 · `screens-across-the-new-discover-experience.jpg` | `screens-across-the-new-discover-experience@full.png` | 2400×1300 |
| Case 3 · `research-of-art-and-interior-services.jpg` | `research-of-art-and-interior-services@full.png` | 2400×1172 |
| Case 3 · `recommended-interiors-and-an-artwork-in-a-room.png` | `recommended-interiors-and-an-artwork-in-a-room@full.png` | 2400×1408 |

- Five of them have a transparent background (like the page versions); the two from JPG are opaque.
- They are 0.5–2.9 MB, so run them through the same optimizer (WebP ~q90 is fine; keep alpha) and load only when the lightbox opens: put the path in `data-full` on the `<img>` and swap `big.src` to it in `show()`, falling back to the page image.
- Other case images have no @full version — the lightbox uses the page image (1200 px) for them.

## 3. All other images — re-exported from Figma (10 Nov)

- Every case image, all 4 covers and the 7 About photos were re-rendered from the Figma sources (most are 3–17× larger than the frame), then scaled down to the same pixel size as before, so the layout doesn't change. Content checked against the old files (same crop; cover 1 and 4 are composited on `#F6F5F1` like before).
- Page files: JPG q92 4:4:4 / PNG; their `.webp` copies at q90 (was q82, which softened text in screenshots). `tools/optimize.mjs` now also uses q90.
- 17 more lightbox files `@full.png` (1680–2400 px) — all case images now have one, except the hackathon photo (its source is only 2×).
- The previous files are in `_backup-assets-before-hq/`.
