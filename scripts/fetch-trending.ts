/**
 * RepoCensus — GitHub Global Trending Fetcher
 *
 * Auxiliary utility: builds the GitHub-wide hot board.
 * NOT to be confused with scripts/fetch.ts → trending (that one ranks the
 * user's *own* repos by star delta).
 *
 * Pipeline:
 *   1. Scrape github.com/trending for every period × language combo.
 *      Only that page exposes "N stars today/this week/this month".
 *   2. If a board can't be scraped, fall back to the GitHub Search API.
 *   3. If both fail, carry the previous board over — never blank a board.
 *   4. Diff against the previous run for rank movement, and against stored
 *      daily snapshots for consecutive days on board.
 *
 * Writes:
 *   src/data/trending.json          — boards + deduped repo metadata
 *   src/data/trending-history.json  — last N daily rank snapshots
 *
 * Env: GITHUB_TOKEN (optional; only needed for the Search API fallback)
 *      TRENDING_MAX_HISTORY (default 14)
 *      TRENDING_CONCURRENCY (default 5)
 */

import { writeFileSync, readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

import type {
  HotBoard,
  HotBoardItem,
  HotPeriod,
  HotRepoMeta,
  HotSnapshot,
  HotSource,
  HotTrendingData,
} from '../src/engine/types'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_PATH = resolve(__dirname, '../src/data/trending.json')
const HISTORY_PATH = resolve(__dirname, '../src/data/trending-history.json')

const MAX_HISTORY = Number(process.env.TRENDING_MAX_HISTORY || 14)
const CONCURRENCY = Number(process.env.TRENDING_CONCURRENCY || 5)
const PERIODS: HotPeriod[] = ['daily', 'weekly', 'monthly']

/**
 * Languages we build a board for.
 *   id    — stable board key, also what the UI filters on (never changes)
 *   slug  — the path segment github.com/trending itself expects, pre-encoded
 *   label — display name
 * Keep id and slug apart: GitHub's own slugs are not always the obvious ones
 * (C++ is `c++`, C# is `c#`), and a wrong slug silently returns the wrong board.
 */
const LANGUAGES: { id: string; slug: string; label: string }[] = [
  { id: '', slug: '', label: 'all' },
  { id: 'python', slug: 'python', label: 'Python' },
  { id: 'javascript', slug: 'javascript', label: 'JavaScript' },
  { id: 'typescript', slug: 'typescript', label: 'TypeScript' },
  { id: 'java', slug: 'java', label: 'Java' },
  { id: 'go', slug: 'go', label: 'Go' },
  { id: 'rust', slug: 'rust', label: 'Rust' },
  { id: 'c', slug: 'c', label: 'C' },
  { id: 'cpp', slug: 'c%2B%2B', label: 'C++' },
  { id: 'csharp', slug: 'c%23', label: 'C#' },
  { id: 'php', slug: 'php', label: 'PHP' },
]

/** How many times a single board is retried before falling back. */
const MAX_ATTEMPTS = 3

/** id -> display name; the Search API wants linguist names (`C++`, `C#`) */
const LANG_LABEL: Record<string, string> = Object.fromEntries(
  LANGUAGES.map((l) => [l.id, l.label])
)

const UA =
  'Mozilla/5.0 (compatible; RepoCensus/1.14; +https://github.com/Leoli04/repocensus)'
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''
/** Overridable so the scraper can be exercised against a local fixture. */
const TRENDING_BASE = (process.env.TRENDING_BASE || 'https://github.com').replace(/\/$/, '')

function boardKey(period: HotPeriod, language: string): string {
  return `${period}:${language || 'all'}`
}

// ── Small helpers ─────────────────────────────────────────

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  mdash: '—',
  ndash: '–',
  hellip: '…',
  lsquo: '\u2018',
  rsquo: '\u2019',
  ldquo: '\u201C',
  rdquo: '\u201D',
  laquo: '«',
  raquo: '»',
  times: '×',
  middot: '·',
  bull: '•',
  deg: '°',
  copy: '©',
  reg: '®',
  trade: '™',
  euro: '€',
  pound: '£',
  yen: '¥',
  cent: '¢',
  sect: '§',
  para: '¶',
  plusmn: '±',
  frac12: '½',
  frac14: '¼',
  frac34: '¾',
  sup2: '²',
  sup3: '³',
  micro: 'µ',
  ne: '≠',
  le: '≤',
  ge: '≥',
  '#39': "'",
  '#x27': "'",
  '#x2F': '/',
}

function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, code: string) => {
    if (ENTITIES[code] !== undefined) return ENTITIES[code]
    if (code.startsWith('#x') || code.startsWith('#X')) {
      const n = parseInt(code.slice(2), 16)
      return Number.isFinite(n) ? String.fromCodePoint(n) : m
    }
    if (code.startsWith('#')) {
      const n = parseInt(code.slice(1), 10)
      return Number.isFinite(n) ? String.fromCodePoint(n) : m
    }
    return m
  })
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()
}

function toInt(s: string | undefined | null): number {
  if (!s) return 0
  const n = parseInt(s.replace(/[^\d]/g, ''), 10)
  return Number.isFinite(n) ? n : 0
}

function isoDaysAgo(days: number): string {
  const d = new Date(Date.now() - days * 86400000)
  return d.toISOString().slice(0, 10)
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function fetchText(url: string, accept: string): Promise<string> {
  const resp = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: accept },
  })
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}`)
  }
  return resp.text()
}

async function fetchJson(url: string): Promise<any> {
  const headers: Record<string, string> = {
    'User-Agent': UA,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`
  const resp = await fetch(url, { headers })
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}`)
  }
  return resp.json()
}

// ── Trending page parser ──────────────────────────────────

/** First path segment of hrefs that are never `owner/repo`. */
const RESERVED = new Set([
  'topics',
  'collections',
  'trending',
  'sponsors',
  'orgs',
  'users',
  'features',
  'about',
  'site',
  'apps',
  'marketplace',
  'explore',
  'login',
  'signup',
  'join',
  'settings',
  'new',
  'pricing',
  'security',
  'enterprise',
  'team',
  'customer-stories',
  'readme',
  'solutions',
  'resources',
  'home',
  'events',
  'blog',
  'contact',
  'sitemap',
  'search',
  'notifications',
  'issues',
  'pulls',
  'dashboard',
  'codespaces',
  'github',
])

/** Loose parse of one trending page. Returns [] when the markup is unrecognised. */
export function parseTrendingHtml(html: string): (HotRepoMeta & {
  stars_period: number
})[] {
  const articles = html.match(
    /<article\b[^>]*class="[^"]*\bBox-row\b[^"]*"[^>]*>[\s\S]*?<\/article>/gi
  )
  if (!articles || articles.length === 0) return []

  const out: (HotRepoMeta & { stars_period: number })[] = []
  const seen = new Set<string>()

  for (const chunk of articles) {
    // full_name — prefer the h2 anchor, fall back to any owner/repo href
    let owner = ''
    let repo = ''
    const h2 = chunk.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i)
    const nameSource = h2 ? h2[1] : chunk
    const nameMatch = nameSource.match(/href="\/([^/"?#]+)\/([^/"?#]+)"/)
    if (nameMatch) {
      owner = nameMatch[1]
      repo = nameMatch[2]
    } else {
      const all = chunk.matchAll(/href="\/([^/"?#]+)\/([^/"?#]+)"/g)
      for (const m of all) {
        if (!RESERVED.has(m[1])) {
          owner = m[1]
          repo = m[2]
          break
        }
      }
    }
    if (!owner || !repo || RESERVED.has(owner)) continue

    const full_name = `${owner}/${repo}`
    if (seen.has(full_name)) continue
    seen.add(full_name)

    // description
    let description: string | null = null
    const descMatch =
      chunk.match(/<p\b[^>]*class="[^"]*\bcol-9\b[^"]*"[^>]*>([\s\S]*?)<\/p>/i) ||
      chunk.match(/<p\b[^>]*class="[^"]*\bpy-1\b[^"]*"[^>]*>([\s\S]*?)<\/p>/i)
    if (descMatch) {
      const text = stripTags(descMatch[1])
      description = text ? text.slice(0, 300) : null
    }

    // language
    let language: string | null = null
    const langMatch =
      chunk.match(/<span\b[^>]*itemprop="programmingLanguage"[^>]*>([\s\S]*?)<\/span>/i) ||
      chunk.match(
        /<span\b[^>]*class="[^"]*repo-language-color[^"]*"[^>]*><\/span>\s*([^<]+)/i
      )
    if (langMatch) {
      const text = stripTags(langMatch[1])
      language = text || null
    }

    // total stars
    let stars = 0
    const starMatch = chunk.match(
      /<a\b[^>]*href="\/[^"]*\/stargazers"[^>]*>([\s\S]*?)<\/a>/i
    )
    if (starMatch) stars = toInt(stripTags(starMatch[1]))

    // forks
    let forks = 0
    const forkMatch = chunk.match(/<a\b[^>]*href="\/[^"]*\/forks"[^>]*>([\s\S]*?)<\/a>/i)
    if (forkMatch) forks = toInt(stripTags(forkMatch[1]))

    // "N stars today | this week | this month"
    let stars_period = 0
    const periodMatch = chunk.match(
      /([\d,]+)\s+stars?\s+(?:today|this\s+week|this\s+month)/i
    )
    if (periodMatch) stars_period = toInt(periodMatch[1])

    out.push({
      full_name,
      html_url: `https://github.com/${full_name}`,
      owner_avatar: `https://github.com/${owner}.png?size=80`,
      description,
      language,
      stars,
      forks,
      stars_period,
    })
  }

  return out
}

/** A parse is only trusted when it looks like a real board. */
function isSaneBoard(items: { full_name: string }[]): boolean {
  return items.length >= 5 && items.every((i) => /^[^/]+\/[^/]+$/.test(i.full_name))
}

// ── Search API fallback ───────────────────────────────────

const SEARCH_WINDOW: Record<HotPeriod, { createdWithin: number; minStars: number }> = {
  daily: { createdWithin: 7, minStars: 50 },
  weekly: { createdWithin: 21, minStars: 200 },
  monthly: { createdWithin: 60, minStars: 500 },
}

async function searchFallback(
  period: HotPeriod,
  languageLabel: string
): Promise<HotRepoMeta[] | null> {
  if (!GITHUB_TOKEN) return null
  const { createdWithin, minStars } = SEARCH_WINDOW[period]
  const parts = [`created:>${isoDaysAgo(createdWithin)}`, `stars:>=${minStars}`]
  // The Search API wants the linguist name (`C++`, `C#`), not our board id
  if (languageLabel && languageLabel !== 'all') parts.push(`language:${languageLabel}`)
  const url =
    `https://api.github.com/search/repositories?q=${encodeURIComponent(parts.join(' '))}` +
    `&sort=stars&order=desc&per_page=25`
  try {
    const data = await fetchJson(url)
    const items = Array.isArray(data?.items) ? data.items : []
    const out: HotRepoMeta[] = items.map((r: any) => ({
      full_name: r.full_name,
      html_url: r.html_url || `https://github.com/${r.full_name}`,
      owner_avatar:
        r.owner?.avatar_url || `https://github.com/${String(r.full_name).split('/')[0]}.png?size=80`,
      description: r.description ? String(r.description).slice(0, 300) : null,
      language: r.language || null,
      stars: r.stargazers_count || 0,
      forks: r.forks_count || 0,
    }))
    return out.length ? out : null
  } catch (err) {
    console.warn(`   ⚠️  search fallback failed: ${(err as Error).message.slice(0, 90)}`)
    return null
  }
}

// ── Board collection ─────────────────────────────────────

interface RawBoard {
  period: HotPeriod
  language: string
  source: HotSource
  scraped: (HotRepoMeta & { stars_period: number })[]
}

async function collectBoard(
  period: HotPeriod,
  language: string,
  slug: string
): Promise<RawBoard | null> {
  const url = `${TRENDING_BASE}/trending${slug ? `/${slug}` : ''}?since=${period}`
  let lastError = ''

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const html = await fetchText(url, 'text/html,application/xhtml+xml')
      const items = parseTrendingHtml(html)
      if (isSaneBoard(items)) {
        return { period, language, source: 'trending', scraped: items }
      }
      // Parsed nothing at all: the markup changed, so retrying the same URL is
      // pointless. A *short* parse (1-4 items) is a truncated response instead,
      // which a retry usually fixes.
      if (items.length === 0) {
        lastError = 'markup not recognised'
        break
      }
      lastError = `only ${items.length} item(s) parsed`
    } catch (err) {
      lastError = (err as Error).message.slice(0, 80)
    }
    if (attempt < MAX_ATTEMPTS - 1) await sleep(500 * (attempt + 1))
  }

  console.warn(`   ⚠️  ${boardKey(period, language)}: ${lastError}`)

  // ── fallback ──
  const fallback = await searchFallback(period, LANG_LABEL[language] || '')
  if (fallback) {
    console.log(`   ↩︎  ${boardKey(period, language)}: search API fallback (${fallback.length})`)
    return {
      period,
      language,
      source: 'search',
      scraped: fallback.map((r) => ({ ...r, stars_period: 0 })),
    }
  }
  return null
}

/** Run tasks with a bounded pool. */
async function pooled<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let cursor = 0
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const idx = cursor++
      results[idx] = await worker(items[idx])
    }
  })
  await Promise.all(runners)
  return results
}

// ── Main ──────────────────────────────────────────────────

async function main() {
  console.log('🚀 RepoCensus global trending fetch starting...\n')

  // Previous payload (for rank movement + carry-over on failure)
  let prev: HotTrendingData | null = null
  if (existsSync(DATA_PATH)) {
    try {
      prev = JSON.parse(readFileSync(DATA_PATH, 'utf-8')) as HotTrendingData
    } catch {
      console.log('⚠️  Could not parse previous trending.json, starting fresh')
    }
  }
  const prevBoardItems = new Map<string, HotBoardItem[]>()
  for (const b of prev?.boards || []) prevBoardItems.set(boardKey(b.period, b.language), b.items)
  const prevRepos: Record<string, HotRepoMeta> = prev?.repos || {}

  // Previous history (for consecutive days on board)
  let history: HotSnapshot[] = []
  if (existsSync(HISTORY_PATH)) {
    try {
      history = JSON.parse(readFileSync(HISTORY_PATH, 'utf-8')) as HotSnapshot[]
      if (!Array.isArray(history)) history = []
    } catch {
      console.log('⚠️  Could not parse trending-history.json, starting fresh')
    }
  }

  // 1. Collect every board
  const combos: { period: HotPeriod; language: string; slug: string }[] = []
  for (const period of PERIODS) {
    for (const lang of LANGUAGES) {
      combos.push({ period, language: lang.id, slug: lang.slug })
    }
  }
  console.log(`📡 Collecting ${combos.length} boards (concurrency ${CONCURRENCY})...`)

  const collected = await pooled(combos, CONCURRENCY, ({ period, language, slug }) =>
    collectBoard(period, language, slug)
  )

  // 2. Assemble boards, dedupe repo metadata, carry over failures
  const repos: Record<string, HotRepoMeta> = {}
  const boards: HotBoard[] = []
  let scrapedCount = 0
  let fallbackCount = 0
  let carriedCount = 0

  for (let i = 0; i < combos.length; i++) {
    const { period, language } = combos[i]
    const raw = collected[i]
    const key = boardKey(period, language)

    let source: HotSource = 'trending'
    let list: (HotRepoMeta & { stars_period: number })[] = []

    if (raw) {
      source = raw.source
      list = raw.scraped
      if (source === 'trending') scrapedCount++
      else fallbackCount++
    } else {
      // Both sources failed — carry the previous board over, never blank it
      const prevItems = prevBoardItems.get(key)
      if (prevItems && prevItems.length) {
        const prevBoard = (prev!.boards || []).find(
          (b) => boardKey(b.period, b.language) === key
        )!
        source = prevBoard.source
        list = prevItems
          .map((it) => {
            const meta = prev!.repos[it.full_name]
            return meta ? { ...meta, stars_period: it.stars_period ?? 0 } : null
          })
          .filter(Boolean) as (HotRepoMeta & { stars_period: number })[]
        carriedCount++
      } else {
        console.log(`   ⛔ ${key}: no data and nothing to carry over`)
        continue
      }
    }

    // metadata map (repos keep every board's version; later boards overwrite
    // only when they bring a fresher/larger number)
    for (const item of list) {
      const existing = repos[item.full_name]
      if (!existing || item.stars >= existing.stars) {
        const { stars_period: _ignored, ...meta } = item
        repos[item.full_name] = meta
      }
    }

    const prevItems = prevBoardItems.get(key) || []
    const prevRankOf = new Map<string, number>()
    prevItems.forEach((it, idx) => prevRankOf.set(it.full_name, it.rank || idx + 1))

    const items: HotBoardItem[] = list.map((item, idx) => {
      const rank = idx + 1
      const prevRank = prevRankOf.get(item.full_name) ?? null
      return {
        full_name: item.full_name,
        rank,
        // Search fallback can't tell how many stars were gained in the window
        stars_period: source === 'search' ? null : item.stars_period || 0,
        prev_rank: prevRank,
        rank_delta: prevRank === null ? null : prevRank - rank,
        days_on_board: 1, // filled in below from history
      }
    })

    // Entries that were on this board last run but are gone now
    const current = new Set(items.map((it) => it.full_name))
    const dropped = prevItems
      .filter((it) => !current.has(it.full_name))
      .map((it, idx) => ({ full_name: it.full_name, prev_rank: it.rank || idx + 1 }))
      .sort((a, b) => a.prev_rank - b.prev_rank)
      .slice(0, 10)

    boards.push({
      period,
      language,
      updated_at: new Date().toISOString(),
      source,
      items,
      dropped,
    })
  }

  // 3. Refresh today's snapshot (daily boards only), then derive days_on_board
  const dailyEntries: Record<string, string[]> = {}
  for (const b of boards) {
    if (b.period !== 'daily') continue
    dailyEntries[boardKey(b.period, b.language)] = b.items.map((it) => it.full_name)
  }
  const dateKey = todayKey()
  const snap: HotSnapshot = { date: dateKey, boards: dailyEntries }
  const lastIdx = history.length - 1
  if (lastIdx >= 0 && history[lastIdx].date === dateKey) history[lastIdx] = snap
  else history.push(snap)
  if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY)

  // Walk history backwards to count consecutive appearances
  const streak = (key: string, fullName: string): number => {
    let n = 0
    for (let i = history.length - 1; i >= 0; i--) {
      const names = history[i].boards[key]
      if (!names || !names.includes(fullName)) break
      n++
    }
    return Math.max(n, 1)
  }
  for (const b of boards) {
    const key = boardKey(b.period, b.language)
    if (b.period !== 'daily') continue
    for (const it of b.items) it.days_on_board = streak(key, it.full_name)
  }

  // 4. Assemble + write
  const data: HotTrendingData = {
    generated_at: new Date().toISOString(),
    boards: boards.sort(
      (a, b) =>
        PERIODS.indexOf(a.period) - PERIODS.indexOf(b.period) ||
        LANGUAGES.findIndex((l) => l.id === a.language) -
          LANGUAGES.findIndex((l) => l.id === b.language)
    ),
    repos: Object.fromEntries(Object.entries(repos).sort(([a], [b]) => a.localeCompare(b))),
    languages: LANGUAGES.map((l) => ({ id: l.id, label: l.label })),
  }

  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2))
  writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2))

  const sizeKb = (p: string) => (existsSync(p) ? (readFileSync(p).length / 1024).toFixed(0) : '0')
  console.log(`\n✅ trending.json written: ${boards.length} boards, ${Object.keys(repos).length} repos`)
  console.log(
    `   scraped: ${scrapedCount} · search fallback: ${fallbackCount} · carried over: ${carriedCount}`
  )
  console.log(`   history: ${history.length} snapshot(s) · ${sizeKb(DATA_PATH)}KB + ${sizeKb(HISTORY_PATH)}KB`)
  console.log('🎉 Done!')
}

// Only run when invoked directly (lets the parser be unit-tested)
const invokedDirectly =
  process.argv[1] && /fetch-trending\.(ts|js)$/.test(process.argv[1].replace(/\\/g, '/'))
if (invokedDirectly) {
  main().catch((err) => {
    console.error('❌ Fatal error:', err)
    process.exit(1)
  })
}
