# KEY ART — GTA 6 Cover Maker

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/JakeSullyID/gta6-cover-art-01-entry-v3/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/JakeSullyID/gta6-cover-art-01-entry-v3/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Turn your photos into a GTA-style key art poster: a giant striped
retro-chrome title over the pictures, a script subtitle, cast role tags
with flavour lines, a press-quote strip, a gold starburst seal, a tagline
ribbon, a billing block with barcode — then export a print-ready PNG.
Built for the make.fun bounty
[Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01)
($250, 50 places paid). Fully offline: every font, sample photo and
script is a file in this repo, and the app makes zero network requests.

## What's in the poster

- **Key art title**: giant Anton caps with a yellow→orange→pink→purple
  chrome gradient, thick outline and drop shadow, overlapping the photos;
  editable text, size, height and slant. The title is held at or below
  55% height on the grid layout so it never crowds the top role tags.
- **Script subtitle**: Pacifico cursive over the title's lower edge.
- **Pop-out hero**: the hero panel grows past its borders with a gold
  rim and is painted before the title, so the lettering reads over it.
- **Role tags on every panel**: black chip with a hot-pink edge, plus a
  flavour line (`PLACE · TIME · QUIP`) under each role.
- **Poster furniture**: press-quote strip (stars + quote + source), gold
  starburst seal, VOL badge, tagline ribbon with ◆ separators, billing
  block auto-composed from the cast's roles, SVG-style barcode on a
  padded white plate, and a COMING SOON / NOW SHOWING toggle.
- **6 layouts** (Vice Grid, Diagonal, Hero + Strip, Poster, Harbor
  7-panel, Heatwave slanted) and **8 colour grades** (Sunset, Neon, Noir,
  Pastel, Gold Hour, Vice Purple, Teal Dusk, Crimson).
- **Make my cover**: one click arranges the photos, assigns the cast
  roles and takes the title from the caption.
- **PNG export** at 1080×1080, 1080×1350 and 1920×1080, rendered by the
  same code path as the live preview — what you see is what the PNG holds.

## Run it

```sh
node serve.ts            # http://localhost:8080
```

Open `app/index.html` directly from disk works too — the app needs no
server at all. Screenshots: `python3 shoot.py` (needs Playwright with
Chromium; serves the app, shoots the 4 scenes in `shots.json`, and
exercises the real export path at all three sizes).

## Layout of the repo

| File | Role |
| --- | --- |
| `main.ts` | Entrypoint: copies `app/` + `screenshots/` into the output dir and builds `dossier.json` (Node 22, stdlib only). |
| `serve.ts` | Tiny dev server for local tries. |
| `app/index.html`, `app/style.css` | The editor page and its dark sunset theme. |
| `app/src/keyart.js` | The poster painter: layouts, grades, title, furniture, export. |
| `app/src/editor.js` | Page state, controls, gestures, exports, "Make my cover". |
| `app/src/shots.js` | Deterministic `?shot=` scenes for screenshots. |
| `app/fonts/` | Real Anton + Pacifico TTFs (OFL) from Google Fonts. |
| `app/samples/` | 7 fresh golden-hour photos (driver, boss, rider, courier, lookout, wheelman, boulevard). |
| `shots.json` | The 4 screenshot scenes. |
| `shoot.py` | The screenshot + export-path runner. |
| `screenshots/` | The 4 screenshots (each ≤256 KiB). |
| `vendor/makefun-app.ts` | The kit's vendored library, copied unchanged. |

## License

MIT. See [LICENSE](LICENSE).

<sub>Entered on [make.fun](https://make.fun/?ref=jake&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
