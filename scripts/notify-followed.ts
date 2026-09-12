/**
 * RepoCensus — Followed-projects Release Notifier (v1.10)
 *
 * Runs in GitHub Actions right after fetch-followed.ts (schedule only):
 * 1. Read src/data/followed.json (freshly written by fetch-followed)
 * 2. Collect repos that have releases flagged is_new = true
 * 3. If any, create an issue "📡 关注项目动态 · <date>" listing them
 *    (skipped when an open issue with the same title already exists)
 *
 * Env: GITHUB_TOKEN (needs issues:write), GITHUB_REPOSITORY (set by Actions)
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

import type { FollowedData } from '../src/engine/types'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FOLLOWED_PATH = resolve(__dirname, '../src/data/followed.json')

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY || '' // "owner/repo"
if (!GITHUB_TOKEN || !GITHUB_REPOSITORY) {
  console.error('❌ GITHUB_TOKEN and GITHUB_REPOSITORY are required')
  process.exit(1)
}

const API = `https://api.github.com/repos/${GITHUB_REPOSITORY}`
const HEADERS: Record<string, string> = {
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  Accept: 'application/vnd.github+json',
  'User-Agent': 'repocensus-notify',
}

async function ghFetch(url: string, init?: RequestInit): Promise<Response> {
  const resp = await fetch(url, { headers: HEADERS, ...init })
  if (!resp.ok && resp.status !== 304) {
    console.error(`⚠️  GitHub API ${resp.status} on ${url}`)
  }
  return resp
}

async function main() {
  const data = JSON.parse(readFileSync(FOLLOWED_PATH, 'utf-8')) as FollowedData
  const withNew = data.repos.filter((r) => r.releases.some((rel) => rel.is_new))

  if (withNew.length === 0) {
    console.log('✅ No new followed-releases, nothing to notify')
    return
  }

  const date = new Date().toISOString().slice(0, 10)
  const title = `📡 关注项目动态 · ${date}`
  const lines: string[] = [
    `共有 **${withNew.length}** 个关注项目发布了新版本（由每日定时采集自动生成）：`,
    '',
  ]
  for (const repo of withNew) {
    lines.push(`### ${repo.full_name}`)
    for (const rel of repo.releases.filter((r) => r.is_new)) {
      lines.push(
        `- ${rel.prerelease ? '🧪 ' : ''}**${rel.tag_name}**${rel.name ? ` — ${rel.name}` : ''} · ${rel.published_at.slice(0, 10)} · [查看](${rel.html_url})`
      )
    }
    lines.push('')
  }
  lines.push('---', '*本 Issue 由 RepoCensus 每日采集任务自动创建。*')
  const body = lines.join('\n')

  // Dedup: skip if an open issue with the same title exists
  const listResp = await ghFetch(`${API}/issues?state=open&per_page=100`)
  if (listResp.ok) {
    const issues = (await listResp.json()) as { title: string; pull_request?: unknown }[]
    if (issues.some((i) => !i.pull_request && i.title === title)) {
      console.log('✅ Issue for today already exists, skipping')
      return
    }
  }

  const createResp = await ghFetch(`${API}/issues`, {
    method: 'POST',
    body: JSON.stringify({ title, body, labels: ['followed-updates'] }),
  })
  if (!createResp.ok) {
    console.error(`❌ Failed to create issue: ${createResp.status}`)
    process.exit(1)
  }
  const issue = (await createResp.json()) as { html_url: string }
  console.log(`✅ Issue created: ${issue.html_url}`)
}

main().catch((err) => {
  console.error('❌ Fatal error:', err)
  process.exit(1)
})
