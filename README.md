# RepoCensus

> Fork-and-go GitHub repository census dashboard — zero server, zero cost, auto-refresh.

**English** | [中文](./README_CN.md)

## What is this?

RepoCensus scans **all your GitHub repositories** (self-created + forked + starred), automatically categorizes them, and generates a beautiful interactive dashboard deployed to GitHub Pages.

### Key Features

- **Three-in-one view** — Self-created, Forked, and Starred repos in one dashboard
- **Smart auto-categorization** — Multi-signal weighted engine (topics, language, keywords)
- **6 preset templates** — Switch between by-domain / by-language / by-activity / by-purpose / by-type / AI-domain
- **Trending board** (your repos) — Star velocity ranking of your own repos, with category filter pills
- **Global trending board** (utility) — Scrapes GitHub-wide Trending: daily/weekly/monthly × 11 language boards, with rank movement, dropped entries and days-on-board
- **Health scoring** — 0-100 score per repo based on recency, stars, README, license, topics
- **Stale repo detection** — Find repos you should archive or delete
- **Star timeline** — See what you starred recently, with new-star highlighting
- **Tech profile** — Language distribution, domain coverage, activity breakdown
- **Share card & Badge** — Generate tech profile share card (PNG/SVG) + shields.io-style README badges
- **Dark/Light theme** — Auto-detect, toggle with one click
- **Zero server** — Pure static site, deployed to GitHub Pages
- **Auto-refresh** — GitHub Actions runs weekly (or on push)

## Quick Start

```
1. Fork this repository
2. Go to Settings → Pages → Source: GitHub Actions
3. Go to Actions tab → "Generate Dashboard" → Run workflow
4. Visit https://<your-username>.github.io/repocensus/
```

That's it. No environment variables needed — `GITHUB_TOKEN` is automatically provided by GitHub Actions.

## How It Works

```
GitHub Actions (weekly cron)
  │
  ├─ 1. Fetch repos + starred via GitHub API
  ├─ 2. Run categorization engine (5 templates)
  ├─ 3. Calculate health scores + tech profile
  ├─ 4. Build Vue 3 SPA with Vite
  └─ 5. Deploy to GitHub Pages
```

All data is baked into the static bundle at build time. The dashboard makes **zero API calls** at runtime — it's pure HTML/CSS/JS.

## Customization

### Change category rules

Edit `config/templates.yml` to add custom classification templates. See the file for examples.

### Change refresh frequency

Edit `.github/workflows/generate.yml`:

```yaml
on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly (default)
    - cron: '0 0 * * *'  # Daily
```

### Run locally

```bash
npm install
npm run dev
```

The dev server uses sample data in `src/data/repos.json`. To fetch real data:

```bash
export GITHUB_TOKEN=ghp_your_token
export GITHUB_USERNAME=your_username
npm run fetch
npm run dev
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Vue 3 + TypeScript |
| Build | Vite 6 |
| Engine | Pure TypeScript (no dependencies) |
| CI/CD | GitHub Actions |
| Hosting | GitHub Pages |
| Charts | Hand-crafted SVG (no chart library) |

## Project Structure

```
repocensus/
├── .github/workflows/
│   └── generate.yml           # Action: fetch → categorize → build → deploy
├── src/
│   ├── engine/                # Core classification engine (pure TS)
│   │   ├── types.ts           # Type definitions
│   │   ├── templates.ts       # 5 preset category templates
│   │   ├── categorizer.ts     # Multi-signal weighted matcher
│   │   ├── health.ts          # Health score calculator
│   │   ├── profiler.ts        # Tech profile + stale repo analysis
│   │   ├── recommend.ts       # Smart recommendation engine (topic similarity)
│   │   └── changeTracker.ts   # Change tracking (snapshot diff)
│   ├── components/            # Vue components
│   │   ├── WorkbenchPage.vue  # Workbench: action inbox + quick-launch (default tab)
│   │   ├── RepoCard.vue       # Repo card (notes/tags editor)
│   │   ├── TechProfile.vue
│   │   ├── StarTimeline.vue
│   │   ├── TrendingBoard.vue
│   │   ├── HotTrendingPage.vue # GitHub global trending board (utility, #/trending)
│   │   ├── ShareCard.vue
│   │   ├── RecommendBoard.vue # Explore-topics drill-down
│   │   ├── ChangeTracker.vue  # Change tracking board
│   │   ├── SectionNav.vue
│   │   ├── VersionPanel.vue
│   │   ├── CategoryGroups.vue
│   │   └── AdvancedFilters.vue
│   ├── composables/           # Vue composables
│   │   ├── useRepos.ts        # Data + filtering + template switching
│   │   ├── useTheme.ts        # Dark/light theme
│   │   ├── useRepoMeta.ts     # Repo notes/tags (localStorage)
│   │   ├── useExport.ts       # Markdown / JSON / CSV export
│   │   ├── useHotTrending.ts  # Global trending board data access
│   │   ├── useWorkbench.ts    # Action inbox data access
│   │   └── useBookmarks.ts    # Quick-launch bookmarks (localStorage + link probe)
│   ├── i18n/                  # Lightweight i18n (no vue-i18n dependency)
│   │   ├── index.ts           # t() + locale ref
│   │   ├── zh.ts              # Chinese strings
│   │   └── en.ts              # English strings
│   ├── data/
│   │   ├── repos.json         # Generated data (auto-updated by Action)
│   │   ├── snapshots.json     # History snapshots for change tracking
│   │   ├── trending.json      # GitHub global trending boards
│   │   ├── trending-history.json # Daily rank snapshots (days-on-board)
│   │   ├── workbench.json     # Action inbox (auto-updated by Action)
│   │   └── bookmarks.example.json # Quick-launch example (yours stays in your browser)
│   ├── styles/
│   │   └── main.css           # Global styles + theme variables
│   ├── App.vue                # Main app
│   └── main.ts                # Entry
├── scripts/
│   ├── fetch.ts               # GitHub API fetcher (runs in Actions)
│   ├── fetch-inbox.ts         # Workbench action inbox (review/assigned/forks behind)
│   └── fetch-trending.ts      # Global trending scraper (+ Search API fallback)
├── config/
│   └── templates.yml          # Custom category templates
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## FAQ

**Does this need a server?**
No. Everything is static. GitHub Actions fetches data and builds the site; GitHub Pages serves it.

**Will it hit API rate limits?**
No. The fetcher makes ~2-20 API calls (depending on repo count), well within the 5,000/hour limit. Search API (if used for recommendations) is limited to 30/min with built-in throttling.

**Can I use it for someone else's account?**
Yes, but you need their public data. Fork the repo, set `GITHUB_USERNAME` as a repository variable, and run the Action.

**Is my data private?**
Your repo metadata (public repos, stars) is already public on GitHub. RepoCensus just organizes it. No data leaves your own GitHub repository.

The workbench's quick-launch bookmarks are a **deliberate exception**: they live only in your browser's localStorage and are **never written back to the repository**. Anyone forking this project only gets `src/data/bookmarks.example.json`, never your private links. The trade-off is that moving to another device needs a manual "Export JSON" → "Import".

`config/followed.yml`, by contrast, **is** committed — the build-time Action has to read it — so a fork carries your followed list along. Keep it to public projects, or treat it as a shareable list.

**Why aren't the bookmarks a repo config file?**
Because "does this belong in the repo?" depends on **who has to read the data**: anything a build-time Action reads (like `followed.yml`) has to be committed; anything only the browser renders (bookmarks) should not be. Shipping an example in the repo and keeping the real data on the user's side is this project's default stance on personal data.

## Roadmap

> Version numbers follow the in-app "Version Panel" Changelog. Current latest release: **v1.15.0**.

| Version | Feature | Status |
|---------|---------|--------|
| v1.0 | Core MVP: data fetch + categorization engine + health score + dashboard + GitHub Actions | ✅ |
| v1.1 | YAML custom templates + cross-dimension + AI domain classification + Markdown export + multi-sort | ✅ |
| v1.2 | Trending board (star velocity + monthly average + category filter) | ✅ |
| v1.3 | Share card (PNG/SVG download) + README badges | ✅ |
| v1.4 | Version progress panel (Changelog + Roadmap) + live trending recompute + right-side quick nav | ✅ |
| v1.5 | Search + advanced filtering + annual repo report (Spotify Wrapped style) + smart recommendations | ✅ |
| v1.6 | i18n (Chinese / English) + repo notes/tags + data export (JSON/CSV) + explore drill-down + change tracking | ✅ |
| v1.7 | Tab-based multi-view layout (Overview / Repos / Activity / Profile / Compare) | ✅ |
| v1.8 | Followed repos activity + repo detail slide-over + trend charts + contribution heatmap + HTML report export | ✅ |
| v1.9 | Multi-user comparison (formerly v2.1) + learning path view (formerly v2.8, removed in v1.13) | ✅ |
| v1.10 | Language donut chart + README preview + PWA + release notifications | ✅ |
| v1.11 | Followed activity cards (GitHub Feed style) | ✅ |
| v1.12 | Full-page "view all" + side quick-nav | ✅ |
| v1.13 | Drop learning-path view + dark chart colour calibration + build artifact cleanup | ✅ |
| v1.14 | GitHub global trending board (utility): daily/weekly/monthly × 11 language boards + rank movement + days on board | ✅ |
| v1.15 | Workbench (new tab, default landing page): action inbox (PRs to review / assigned issues / forks behind upstream / silent repos) + quick-launch bookmarks (stored on your device, import & export) | ✅ |

### Backlog

| Item | Description | Status |
|------|-------------|--------|
| AI insight summary | Optional LLM: profile summary, cleanup tips, weekly digest (formerly v2.5) | 🔲 |
| Mobile responsive layout | Responsive layout so the dashboard works on phones | 🔲 |
| Fork value analysis | Detect which forks actually changed code vs. which are safe to clean up | 🔲 |
| Language proficiency radar | Score each language by count / stars / activity, shown as a radar chart | 🔲 |
| Repo favourites / pinning | Pin important repos to the top of the overview (localStorage) | 🔲 |
| PNG share card themes | Multiple colour themes for the share card (minimal white / dark tech / gradient) | 🔲 |
| Data chunk splitting | repos.json (~1MB) is inlined into the main bundle; evaluate lazy loading | 🔲 |

## License

MIT
