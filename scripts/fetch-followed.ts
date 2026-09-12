/**
 * RepoCensus — Followed Projects Fetcher (v2.4)
 *
 * Runs daily in GitHub Actions (incremental mode):
 * 1. Read config/followed.yml (list of followed repos)
 * 2. Fetch latest releases for each repo from GitHub API
 * 3. Merge with previous src/data/followed.json:
 *    - releases not present before get is_new = true
 *    - keep the newest N releases per repo (newest first)
 *    - record last push activity for repos that don't release
 * 4. Write src/data/followed.json for Vite to bundle
 *
 * Env: GITHUB_TOKEN, (optional) FOLLOWED_MAX_RELEASES (default 10)
 */

import { writeFileSync, readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import yaml from 'js-yaml'

import type { FollowedData, FollowedRepo, ReleaseUpdate } from '../src/engine/types'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FOLLOWED_PATH = resolve(__dirname, '../src/data/followed.json')
const FOLLOWED_YML = resolve(__dirname, '../config/followed.yml')
const MAX_RELEASES = Number(process.env.FOLLOWED_MAX_RELEASES || 10)

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''
if (!GITHUB_TOKEN) {
  console.error('❌ GITHUB_TOKEN environment variable is required')
  process.exit(1)
}

const API_BASE = 'https://api.github.com'
const HEADERS: Record<string, string> = {
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
}

async function githubFetch(url: string): Promise<any> {
  const resp = await fetch(url, { headers: HEADERS })
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

// ── Load followed list from YAML ──────────────────────────

interface FollowedConfig {
  full_name: string
  alias?: string
  tags?: string[]
}

function loadFollowedList(): FollowedConfig[] {
  if (!existsSync(FOLLOWED_YML)) {
    console.log('📂 No followed list found (config/followed.yml)')
    return []
  }
  try {
    const content = readFileSync(FOLLOWED_YML, 'utf-8')
    const parsed = yaml.load(content) as any
    const list = parsed?.followed
    if (!Array.isArray(list)) {
      console.log('⚠️  No followed entries in config/followed.yml')
      return []
    }
    return list
      .map((e: any) => ({
        full_name: String(e.repo || e.full_name || '').trim(),
        alias: e.alias || undefined,
        tags: Array.isArray(e.tags) ? e.tags.map(String) : undefined,
      }))
      .filter((e) => e.full_name.includes('/'))
  } catch (err) {
    console.warn('⚠️  Failed to parse config/followed.yml:', err)
    return []
  }
}

// ── Main ──────────────────────────────────────────────────

async function main() {
  console.log('🚀 RepoCensus followed-projects fetch starting...\n')

  const list = loadFollowedList()
  if (list.length === 0) {
    // Write an empty payload so the frontend still builds
    const empty: FollowedData = { generated_at: new Date().toISOString(), repos: [] }
    writeFileSync(FOLLOWED_PATH, JSON.stringify(empty, null, 2))
    console.log('✅ Empty followed.json written (nothing to follow)')
    return
  }
  if (list.length > 50) {
    console.log(`⚠️  ${list.length} followed repos exceeds the 50 limit; only the first 50 are collected`)
  }
  const targets = list.slice(0, 50)

  // Previous data for incremental detection
  let prev: FollowedData | null = null
  if (existsSync(FOLLOWED_PATH)) {
    try {
      prev = JSON.parse(readFileSync(FOLLOWED_PATH, 'utf-8')) as FollowedData
    } catch {
      console.log('⚠️  Could not parse previous followed.json, starting fresh')
    }
  }
  const prevByRepo = new Map<string, FollowedRepo>()
  for (const r of prev?.repos || []) prevByRepo.set(r.full_name, r)

  const repos: FollowedRepo[] = []
  let newCount = 0

  for (const cfg of targets) {
    try {
      // Repo meta (for pushed_at) + releases
      const [repoMeta, releasesRaw] = await Promise.all([
        githubFetch(`${API_BASE}/repos/${cfg.full_name}`),
        githubFetch(`${API_BASE}/repos/${cfg.full_name}/releases?per_page=${MAX_RELEASES}`),
      ])

      const knownTags = new Set(
        (prevByRepo.get(cfg.full_name)?.releases || []).map((r) => r.tag_name)
      )
      // First-ever run = baseline snapshot: mark nothing as new to avoid noise
      const isBaseline = !prevByRepo.has(cfg.full_name)

      const releases: ReleaseUpdate[] = (Array.isArray(releasesRaw) ? releasesRaw : [])
        .slice(0, MAX_RELEASES)
        .map((r: any) => {
          const isNew = !isBaseline && !knownTags.has(r.tag_name)
          if (isNew) newCount++
          return {
            tag_name: r.tag_name || '',
            name: r.name || null,
            published_at: r.published_at || r.created_at,
            html_url: r.html_url || `https://github.com/${cfg.full_name}/releases`,
            prerelease: !!r.prerelease,
            is_new: isNew,
          }
        })
        .sort(
          (a: ReleaseUpdate, b: ReleaseUpdate) =>
            new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
        )

      repos.push({
        full_name: cfg.full_name,
        alias: cfg.alias || null,
        tags: cfg.tags || [],
        html_url: repoMeta.html_url || `https://github.com/${cfg.full_name}`,
        pushed_at: repoMeta.pushed_at || null,
        releases,
      })
      console.log(
        `   ✓ ${cfg.full_name}: ${releases.length} release(s)${releases.some((r) => r.is_new) ? ' · has new' : ''}`
      )
    } catch (err) {
      // Keep previous data for this repo instead of dropping it
      const prevRepo = prevByRepo.get(cfg.full_name)
      if (prevRepo) {
        repos.push(prevRepo)
        console.log(`   ⚠️  ${cfg.full_name}: fetch failed, kept previous data`)
      } else {
        console.log(`   ⚠️  ${cfg.full_name}: fetch failed (${(err as Error).message.slice(0, 80)})`)
      }
    }
  }

  const data: FollowedData = {
    generated_at: new Date().toISOString(),
    repos,
  }
  writeFileSync(FOLLOWED_PATH, JSON.stringify(data, null, 2))
  console.log(`\n✅ followed.json written: ${repos.length} repo(s), ${newCount} new release(s)`)
  console.log('🎉 Done!')
}

main().catch((err) => {
  console.error('❌ Fatal error:', err)
  process.exit(1)
})
