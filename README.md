# neverskipfitness.com

The NeverSkip landing page, built with [Hugo](https://gohugo.io) and deployed to GitHub Pages by
`.github/workflows/deploy.yml`.

```bash
hugo server            # http://localhost:1313, live reload
hugo --gc --minify     # production build into public/
```

Use Hugo 0.152.2 (the version the workflow pins) or newer.

## Where things live

| Change | Edit |
|---|---|
| Hero, section headings, the note, pricing text | `layouts/home.html` (written in the neutral voice) |
| Feature cards, story milestones, stats, FAQ | `data/features.yaml`, `timeline.yaml`, `stats.yaml`, `faq.yaml` |
| The Drill and Devoted page copy | `data/voice/drill.yaml`, `data/voice/devoted.yaml` |
| Voice names, descriptions, the 18+ gate, voice icons | `data/voices.yaml` |
| The in-app moments in the voice preview | `data/moments.yaml` |
| Imprint and privacy policy | `content/imprint.md`, `content/privacypolicy.md` |
| Styles and behaviour | `assets/css/main.css`, `assets/js/script.js`, `assets/js/voice.js` |
| Fonts (self-hosted Inter and Inter Tight, SIL OFL) | `static/fonts/` |
| Mock screenshots, app icons, the plate glyph | `static/images/mocks/`, `static/brand/` |
| App Store ID and link, author link | `hugo.toml` → `[params]` |

### How the voices work

The page ships in the neutral voice. Every element that a voice can rewrite carries `data-v="key"`.
Each voice file lists only the keys whose text differs, and a missing key falls back to neutral. Keys for
repeated items use the item's `id`, e.g. `feature.taps.title` or `milestone.2026-09.text`, so reordering
a data file never mixes up the copy. `voice.js` reads the voices from the JSON block at the end of the page,
remembers the visitor's choice in the browser only, and asks for adult confirmation before switching to
any voice marked `gate: true`. The note and FAQ stay neutral in every voice on purpose.

## Deployment

Every push to `master` builds and deploys. Pull requests build only.

One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**. Until that is
switched, GitHub keeps trying to build the repository as a Jekyll site.

## Before launch

- `content/privacypolicy.md`: check the items marked `confirm` in its front matter (the NeverSkip 1 section, GitHub's Data Privacy Framework status).
- `hugo.toml`: `appStoreID` and `appStoreURL` point at the NeverSkip 1 listing. Confirm v2 ships under it.
- The screenshots in `static/images/mocks/` are mocks; replace them with real ones.
- Items marked `confirm` in `data/*.yaml` and `layouts/home.html` are wording to check.

The site makes no third-party requests (no CDN, no Google Fonts); keep it that way, or update the privacy policy.
