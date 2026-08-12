# RepoCensus

> Fork-and-go GitHub repository census dashboard — zero server, zero cost, auto-refresh.

**English** | [中文](./README_CN.md)

## What is this?

RepoCensus scans **all your GitHub repositories** (self-created + forked + starred), automatically categorizes them, and generates a beautiful interactive dashboard deployed to GitHub Pages.

### Key Features

- **Three-in-one view** — Self-created, Forked, and Starred repos in one dashboard
- **Smart auto-categorization** — Multi-signal weighted engine (topics, language, keywords)
- **5 preset templates** — Switch between by-domain / by-language / by-activity / by-purpose / by-type
- **Health scoring** — 0-100 score per repo based on recency, stars, README, license, topics
- **Stale repo detection** — Find repos you should archive or delete
- **Star timeline** — See what you starred recently, with new-star highlighting
- **Tech profile** — Language distribution, domain coverage, activity breakdown
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
│   │   └── profiler.ts        # Tech profile + stale repo analysis
│   ├── components/            # Vue components
│   │   ├── RepoCard.vue
│   │   ├── TechProfile.vue
│   │   └── StarTimeline.vue
│   ├── composables/           # Vue composables
│   │   ├── useRepos.ts        # Data + filtering + template switching
│   │   └── useTheme.ts        # Dark/light theme
│   ├── data/
│   │   └── repos.json         # Generated data (auto-updated by Action)
│   ├── styles/
│   │   └── main.css           # Global styles + theme variables
│   ├── App.vue                # Main app
│   └── main.ts                # Entry
├── scripts/
│   └── fetch.ts               # GitHub API fetcher (runs in Actions)
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

## License

MIT
