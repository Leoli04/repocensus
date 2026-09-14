/**
 * RepoCensus — Workbench action inbox collector
 *
 * Produces src/data/workbench.json: the "things I actually have to do" list —
 * PRs waiting on my review, issues assigned to me, and forks dragging behind
 * their upstream. Runs in GitHub Actions; the site itself stays fully static
 * (the JSON is bundled at build time, so the browser makes zero API calls).
 *
 * Two things worth knowing before you change this file:
 *
 * 1. Never use `@me` in the search queries. `GITHUB_TOKEN` inside Actions
 *    authenticates as `github-actions[bot]`, so `review-requested:@me` would
 *    ask for PRs requested from *the bot* and always come back empty. The
 *    explicit username is the only correct form here.
 * 2. `GITHUB_TOKEN` is scoped to this repository only, so it can't see the
 *    user's private activity elsewhere. Set a repo secret named INBOX_TOKEN
 *    (a classic PAT with `repo` + `read:user`) to widen the coverage.
 *
 * Failure policy: this script NEVER fails the build. Any problem downgrades
 * the payload to `enabled: false` and the Workbench renders setup guidance.
 */

import { writeFileSync, readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

import type { InboxItem, Repo, WorkbenchData } from '../src/engine/types'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_PATH = resolve(__dirname, '../src/data/workbench.json')
const REPOS_PATH = resolve(__dirname, '../src/data/repos.json')

const TOKEN = process.env.INBOX_TOKEN || process.env.GITHUB_TOKEN || ''
const USERNAME = process.env.GITHUB_USERNAME || process.env.GITHUB_REPOSITORY_OWNER || ''

/** How many entries to keep per section (GitHub returns newest first) */
const MAX_PER_SECTION = 10
/** Upper bound on forks we spend the 2-call compare dance on */
const MAX_FORKS_CHECKED = 15
const MAX_ITEMS = 30
const REQUEST_TIMEOUT_MS = 15000

const API_BASE = 'https://api.github.com'
const HEADERS: Record<string, string> = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
}

function emptyPayload(): WorkbenchData {
  return {
    generated_at: new Date().toISOString(),
    enabled: false,
    counts: { review: 0, assigned: 0, fork_behind: 0 },
    items: [],
  }
}

function write(payload: WorkbenchData) {
  writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2) + '\n')
}

/** GET helper — returns null instead of throwing, so one bad call can't sink the run */
async function gh(url: string): Promise<any | null> {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), REQUEST_TIMEOUT_MS)
  try {
    const resp = await fetch(url, { headers: HEADERS, signal: ctl.signal })
    if (!resp.ok) {
      console.warn(`   ⚠️ ${resp.status} ${url}`)
      return null
    }
    return await resp.json()
  } catch (err) {
    console.warn(`   ⚠️ request failed: ${url} (${(err as Error).message})`)
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** Search API hit → normalized inbox entries */
function toInboxItems(payload: any, kind: 'review' | 'assigned'): InboxItem[] {
  const raw = Array.isArray(payload?.items) ? payload.items : []
  return raw.slice(0, MAX_PER_SECTION).map((it: any) => ({
    kind,
    // repository_url looks like https://api.github.com/repos/owner/name
    repo: String(it.repository_url || '').replace(`${API_BASE}/repos/`, ''),
    html_url: it.html_url,
    title: it.title || '',
    number: typeof it.number === 'number' ? it.number : null,
    updated_at: it.updated_at || '',
  }))
}

async function collectSearch(kind: 'review' | 'assigned'): Promise<InboxItem[]> {
  const q =
    kind === 'review'
      ? `is:open is:pr review-requested:${USERNAME}`
      : `is:open is:issue assignee:${USERNAME}`
  const url = `${API_BASE}/search/issues?q=${encodeURIComponent(q)}&sort=updated&order=desc&per_page=${MAX_PER_SECTION}`
  const payload = await gh(url)
  if (!payload) return []
  const items = toInboxItems(payload, kind)
  console.log(`   ✓ ${kind}: ${items.length}`)
  return items
}

/** Load forks from the existing census payload (no extra listing calls) */
function loadForks(): Repo[] {
  if (!existsSync(REPOS_PATH)) {
    console.log('   ⚠️ repos.json not found — run scripts/fetch.ts first, skipping forks')
    return []
  }
  try {
    const data = JSON.parse(readFileSync(REPOS_PATH, 'utf-8'))
    const forks: Repo[] = (data.repos || []).filter(
      (r: Repo) => r.type === 'fork' && r.parent_full_name
    )
    forks.sort((a, b) => new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime())
    return forks.slice(0, MAX_FORKS_CHECKED)
  } catch {
    console.log('   ⚠️ could not parse repos.json, skipping forks')
    return []
  }
}

/**
 * How far is one fork behind its upstream?
 *
 * Two calls: the fork itself tells us both default branches, then compare
 * reports `behind_by`. Guessing "main" would be wrong often enough to matter.
 */
async function forkBehindBy(fork: Repo): Promise<InboxItem | null> {
  const meta = await gh(`${API_BASE}/repos/${fork.full_name}`)
  if (!meta) return null

  const parentFull = meta.parent?.full_name || fork.parent_full_name
  const parentBranch = meta.parent?.default_branch
  const forkBranch = meta.default_branch
  if (!parentFull || !parentBranch || !forkBranch) return null

  const head = `${fork.owner}:${forkBranch}`
  const cmp = await gh(
    `${API_BASE}/repos/${parentFull}/compare/${parentBranch}...${encodeURIComponent(head)}`
  )
  const behind = typeof cmp?.behind_by === 'number' ? cmp.behind_by : 0
  if (behind <= 0) return null

  return {
    kind: 'fork',
    repo: fork.full_name,
    html_url: fork.html_url,
    title: fork.full_name,
    number: null,
    updated_at: fork.pushed_at || fork.updated_at || '',
    behind,
    upstream: parentFull,
  }
}

async function collectForks(): Promise<InboxItem[]> {
  const forks = loadForks()
  if (!forks.length) {
    console.log('   ✓ fork: 0 (no forks)')
    return []
  }

  const out: InboxItem[] = []
  for (const fork of forks) {
    const item = await forkBehindBy(fork)
    if (item) out.push(item)
  }
  out.sort((a, b) => (b.behind || 0) - (a.behind || 0))
  console.log(`   ✓ fork: ${out.length} behind (checked ${forks.length})`)
  return out
}

async function main() {
  console.log('🧭 Workbench inbox collection starting...\n')

  if (!TOKEN || !USERNAME) {
    console.log('⏭️  Skipped: GITHUB_TOKEN / GITHUB_USERNAME not set.')
    console.log('   Writing an "enabled: false" payload so the UI can show setup guidance.')
    write(emptyPayload())
    return
  }

  console.log(`👤 Inbox owner: ${USERNAME}`)
  if (process.env.INBOX_TOKEN) console.log('🔑 Using INBOX_TOKEN (wider scope)')
  else console.log('🔑 Using GITHUB_TOKEN (this repository only)')

  const review = await collectSearch('review')
  const assigned = await collectSearch('assigned')
  const forkBehind = await collectForks()

  const items = [...review, ...assigned, ...forkBehind].slice(0, MAX_ITEMS)

  const payload: WorkbenchData = {
    generated_at: new Date().toISOString(),
    enabled: true,
    counts: {
      review: review.length,
      assigned: assigned.length,
      fork_behind: forkBehind.length,
    },
    items,
  }

  write(payload)
  console.log(`\n✅ Workbench written to ${OUT_PATH}`)
  console.log(
    `   review: ${payload.counts.review} | assigned: ${payload.counts.assigned} | fork behind: ${payload.counts.fork_behind}`
  )
}

main().catch((err) => {
  // A collector hiccup must never break the deploy — degrade instead.
  console.error('❌ Workbench collector failed, writing disabled payload:', err)
  try {
    write(emptyPayload())
  } catch (writeErr) {
    console.error('❌ Could not write fallback payload either:', writeErr)
  }
})
