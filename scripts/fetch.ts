/**
 * RepoCensus — Data Fetcher
 *
 * Runs in GitHub Actions (or locally) to:
 * 1. Fetch all user repos + starred repos from GitHub API
 * 2. Normalize to Repo[] format
 * 3. Load custom templates from config/templates.yml
 * 4. Run categorization engine
 * 5. Calculate health scores
 * 6. Build tech profile + stale repo list + new stars
 * 7. Write src/data/repos.json for Vite to bundle
 */

import { writeFileSync, readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import yaml from 'js-yaml'

import type { Repo, CensusData, RepoType, CategoryTemplate, ChangeSnapshot } from '../src/engine/types'
import { PRESET_TEMPLATES } from '../src/engine/templates'
import { categorize, daysSince } from '../src/engine/categorizer'
import { calculateHealthScore, avgHealth } from '../src/engine/health'
import { buildTechProfile, findStaleRepos, getNewStars } from '../src/engine/profiler'
import { computeTrending } from '../src/engine/trending'
import { generateBadges } from './badges'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_PATH = resolve(__dirname, '../src/data/repos.json')
const TEMPLATES_PATH = resolve(__dirname, '../config/templates.yml')
const SNAPSHOTS_PATH = resolve(__dirname, '../src/data/snapshots.json')
const MAX_SNAPSHOTS = 12

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''
const USERNAME = process.env.GITHUB_USERNAME || ''

if (!GITHUB_TOKEN) {
  console.error('❌ GITHUB_TOKEN environment variable is required')
  process.exit(1)
}
if (!USERNAME) {
  console.error('❌ GITHUB_USERNAME environment variable is required')
  process.exit(1)
}

const API_BASE = 'https://api.github.com'
const HEADERS: Record<string, string> = {
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
}

// ── Fetch helpers ──────────────────────────────────────────

async function githubFetch(url: string, extraHeaders?: Record<string, string>): Promise<any> {
  const resp = await fetch(url, { headers: { ...HEADERS, ...extraHeaders } })
  if (resp.status === 403) {
    const remaining = resp.headers.get('x-ratelimit-remaining')
    if (remaining === '0') {
      console.error('❌ GitHub API rate limit exceeded. Try again later.')
      process.exit(1)
    }
  }
  if (!resp.ok) {
    throw new Error(`GitHub API error ${resp.status}: ${await resp.text()}`)
  }
  return resp.json()
}

async function fetchPaginated(url: string, extraHeaders?: Record<string, string>): Promise<any[]> {
  const results: any[] = []
  let page = 1
  while (true) {
    const sep = url.includes('?') ? '&' : '?'
    const pageUrl = `${url}${sep}per_page=100&page=${page}`
    const data = await githubFetch(pageUrl, extraHeaders)
    if (!Array.isArray(data) || data.length === 0) break
    results.push(...data)
    if (data.length < 100) break
    page++
  }
  return results
}

// ── Load custom templates from YAML ────────────────────────

function loadCustomTemplates(): CategoryTemplate[] {
  if (!existsSync(TEMPLATES_PATH)) {
    console.log('📂 No custom templates file found (config/templates.yml)')
    return []
  }

  try {
    const content = readFileSync(TEMPLATES_PATH, 'utf-8')
    const parsed = yaml.load(content) as any

    if (!parsed || !parsed.templates || !Array.isArray(parsed.templates)) {
      console.log('⚠️  No templates found in config/templates.yml')
      return []
    }

    const templates: CategoryTemplate[] = parsed.templates.map((t: any) => ({
      id: t.id || `custom-${Date.now()}`,
      name: t.name || '自定义',
      description: t.description || '',
      type: 'custom' as const,
      categories: (t.categories || []).map((c: any) => ({
        name: c.name || '未命名',
        priority: c.priority || 99,
        matchers: (c.matchers || []).map((m: any) => ({
          field: m.field,
          operator: m.operator,
          value: m.value,
          weight: m.weight || 1,
        })),
      })),
    }))

    console.log(`📋 Loaded ${templates.length} custom template(s) from YAML`)
    return templates
  } catch (err) {
    console.warn('⚠️  Failed to parse config/templates.yml:', err)
    return []
  }
}

// ── Fetch user repos ───────────────────────────────────────

async function fetchUserRepos(username: string): Promise<any[]> {
  console.log(`📥 Fetching repos for ${username}...`)
  const repos = await fetchPaginated(`${API_BASE}/users/${username}/repos?type=all&sort=updated`)

  // Also fetch starred repos separately
  console.log(`📥 Fetching starred repos...`)
  // Use special Accept header to get starred_at timestamp
  const starred = await fetchPaginated(`${API_BASE}/users/${username}/starred`, {
    Accept: 'application/vnd.github.star+json',
  })

  // Build starred_at map
  const starredAtMap = new Map<string, string>()
  for (const item of starred) {
    if (item.starred_at && item.repo) {
      starredAtMap.set(item.repo.full_name, item.starred_at)
    }
  }

  // Separate: user's own repos (original + fork) vs starred-only
  const ownRepos = repos.map((r) => ({ ...r, _starred_at: null as string | null }))
  const ownFullNames = new Set(repos.map((r) => r.full_name))

  // Starred repos that are NOT the user's own
  const starredOnly = starred
    .filter((item) => item.repo && !ownFullNames.has(item.repo.full_name))
    .map((item) => ({
      ...item.repo,
      _starred_at: item.starred_at || null,
    }))

  console.log(`   ✓ Own repos: ${ownRepos.length} (forks: ${ownRepos.filter((r) => r.fork).length})`)
  console.log(`   ✓ Starred only: ${starredOnly.length}`)

  return [...ownRepos, ...starredOnly]
}

// ── Normalize to Repo[] ────────────────────────────────────

function normalizeRepo(raw: any): Repo {
  const isStarred = raw._starred_at !== null && raw._starred_at !== undefined
  const type: RepoType = isStarred ? 'star' : raw.fork ? 'fork' : 'original'

  return {
    id: raw.id,
    name: raw.name,
    full_name: raw.full_name,
    html_url: raw.html_url,
    owner: raw.owner?.login || raw.full_name?.split('/')[0] || '',
    type,
    fork: raw.fork || false,
    parent_full_name: raw.parent?.full_name || raw.source?.full_name || null,
    description: raw.description,
    language: raw.language,
    topics: raw.topics || [],
    stargazers_count: raw.stargazers_count || 0,
    forks_count: raw.forks_count || 0,
    open_issues_count: raw.open_issues_count || 0,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    pushed_at: raw.pushed_at,
    starred_at: raw._starred_at || null,
    archived: raw.archived || false,
    has_readme: true, // optimistic; could check via API but too many calls
    has_license: !!raw.license,
    license: raw.license?.spdx_id || raw.license?.name || null,
    category: '',
    health_score: 0,
    is_new: false,
    starred_days_ago: null,
  }
}

// ── Main ───────────────────────────────────────────────────

async function main() {
  console.log('🚀 RepoCensus data fetch starting...\n')

  // 1. Fetch user info
  const userInfo = await githubFetch(`${API_BASE}/users/${USERNAME}`)
  console.log(`👤 User: ${userInfo.login} (${userInfo.public_repos} public repos)\n`)

  // 2. Fetch all repos
  const rawRepos = await fetchUserRepos(USERNAME)

  // 3. Normalize
  let repos: Repo[] = rawRepos.map(normalizeRepo)

  // 4. Load custom templates
  const customTemplates = loadCustomTemplates()

  // 5. Load previous data for diff (new stars detection + trending)
  let previousStarred = new Set<string>()
  let prevStarMap = new Map<string, number>()
  if (existsSync(DATA_PATH)) {
    try {
      const prev = JSON.parse(readFileSync(DATA_PATH, 'utf-8'))
      previousStarred = new Set(
        (prev.repos || []).filter((r: Repo) => r.type === 'star').map((r: Repo) => r.full_name)
      )
      // Build star map for trending (delta computation)
      for (const r of prev.repos || []) {
        prevStarMap.set(r.full_name, r.stargazers_count || 0)
      }
      console.log(`📂 Loaded previous data: ${previousStarred.size} starred repos, ${prevStarMap.size} star snapshots\n`)
    } catch {
      console.log('⚠️ Could not parse previous data, skipping diff\n')
    }
  }

  // 6. Mark new stars
  repos = repos.map((r) => {
    if (r.type === 'star') {
      r.is_new = !previousStarred.has(r.full_name)
      r.starred_days_ago = r.starred_at ? daysSince(r.starred_at) : null
    }
    return r
  })

  // 7. Categorize (default: by-domain)
  const defaultTemplate = PRESET_TEMPLATES[0]
  repos = repos.map((r) => ({
    ...r,
    category: categorize(r, defaultTemplate),
  }))

  // 8. Health scores
  repos = repos.map((r) => ({
    ...r,
    health_score: calculateHealthScore(r),
  }))

  // 9. Build profile
  const techProfile = buildTechProfile(repos)
  const staleRepos = findStaleRepos(repos)
  const newStars = getNewStars(repos)

  // 9.5 Trending (star growth analysis)
  const trending = computeTrending(repos, prevStarMap)
  console.log(`🔥 Trending: ${trending.overall.length} repos ranked (historical: ${trending.has_historical})`)

  // 10. Stats
  const stats = {
    total: repos.length,
    original: repos.filter((r) => r.type === 'original').length,
    fork: repos.filter((r) => r.type === 'fork').length,
    star: repos.filter((r) => r.type === 'star').length,
    avg_health: avgHealth(repos),
    active_count: repos.filter((r) => daysSince(r.updated_at) <= 180).length,
    stale_count: staleRepos.length,
    archived_count: repos.filter((r) => r.archived).length,
  }

  // 11. Assemble
  const data: CensusData & { custom_templates?: CategoryTemplate[] } = {
    username: userInfo.login,
    avatar_url: userInfo.avatar_url,
    html_url: userInfo.html_url,
    generated_at: new Date().toISOString(),
    repos,
    stats,
    tech_profile: techProfile,
    stale_repos: staleRepos,
    new_stars: newStars,
    trending,
    custom_templates: customTemplates,
  }

  // 11.5 Change-tracking history: append a lightweight snapshot of this run
  let history: ChangeSnapshot[] = []
  if (existsSync(SNAPSHOTS_PATH)) {
    try {
      history = JSON.parse(readFileSync(SNAPSHOTS_PATH, 'utf-8'))
    } catch {
      console.log('⚠️ Could not parse snapshots.json, starting fresh')
    }
  }
  const snapshot: ChangeSnapshot = {
    generated_at: data.generated_at,
    names: repos.map((r) => r.full_name),
    stars: Object.fromEntries(repos.map((r) => [r.full_name, r.stargazers_count])),
    urls: Object.fromEntries(repos.map((r) => [r.full_name, r.html_url])),
  }
  history.push(snapshot)
  if (history.length > MAX_SNAPSHOTS) history = history.slice(-MAX_SNAPSHOTS)
  writeFileSync(SNAPSHOTS_PATH, JSON.stringify(history, null, 2))
  data.history = history
  console.log(`📸 Snapshot saved (${history.length} total, comparing last two for change tracking)`)

  // 12. Write
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2))
  console.log(`✅ Data written to ${DATA_PATH}`)
  console.log(`   Total: ${stats.total} | Original: ${stats.original} | Fork: ${stats.fork} | Star: ${stats.star}`)
  console.log(`   Avg health: ${stats.avg_health}/100 | Stale: ${stats.stale_count} | New stars: ${newStars.length}`)
  console.log(`   Custom templates: ${customTemplates.length}`)

  // 13. Generate badges
  const badgesDir = resolve(__dirname, '../public/badges')
  generateBadges(data, badgesDir)

  console.log(`\n🎉 Done!`)
}

main().catch((err) => {
  console.error('❌ Fatal error:', err)
  process.exit(1)
})
