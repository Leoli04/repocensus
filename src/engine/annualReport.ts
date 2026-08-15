import type { CensusData, Repo } from './types'

export interface AnnualReport {
  year: number
  totalRepos: number
  createdThisYear: number
  originalThisYear: number
  forkThisYear: number
  totalStarsReceived: number
  starsReceivedThisYear: number
  topLanguages: { name: string; count: number }[]
  topDomains: { name: string; count: number }[]
  monthlyActivity: { month: number; created: number; pushed: number }[]
  topTopics: { name: string; count: number }[]
  busiestMonth: number
  healthAvg: number
}

function monthName(m: number): string {
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]
}

export function computeAnnualReport(data: CensusData, year?: number): AnnualReport {
  const targetYear = year ?? new Date().getFullYear()
  const repos = data.repos

  // Filter to repos created in target year (for "created this year" stats)
  const createdThisYear = repos.filter((r) => new Date(r.created_at).getFullYear() === targetYear)

  // All-time stats
  const totalStarsReceived = repos.reduce((s, r) => s + (r.stargazers_count || 0), 0)

  // Language distribution (all repos)
  const langMap = new Map<string, number>()
  for (const r of repos) {
    if (r.language) langMap.set(r.language, (langMap.get(r.language) || 0) + 1)
  }
  const topLanguages = Array.from(langMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  // Domain distribution (categories)
  const domMap = new Map<string, number>()
  for (const r of repos) {
    if (r.category) domMap.set(r.category, (domMap.get(r.category) || 0) + 1)
  }
  const topDomains = Array.from(domMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  // Topics (all repos)
  const topicMap = new Map<string, number>()
  for (const r of repos) {
    for (const t of r.topics || []) {
      topicMap.set(t, (topicMap.get(t) || 0) + 1)
    }
  }
  const topTopics = Array.from(topicMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)

  // Monthly activity (created + pushed) for target year
  const monthly = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    monthLabel: monthName(i + 1),
    created: 0,
    pushed: 0,
  }))
  for (const r of repos) {
    const c = new Date(r.created_at)
    if (c.getFullYear() === targetYear) monthly[c.getMonth()].created++
    const p = new Date(r.pushed_at)
    if (p.getFullYear() === targetYear) monthly[p.getMonth()].pushed++
  }
  const busiestMonth =
    monthly.reduce((max, m) => (m.created + m.pushed > max.created + max.pushed ? m : max), monthly[0]).month

  const healthAvg = Math.round(repos.reduce((s, r) => s + (r.health_score || 0), 0) / repos.length)

  return {
    year: targetYear,
    totalRepos: repos.length,
    createdThisYear: createdThisYear.length,
    originalThisYear: createdThisYear.filter((r) => r.type === 'original').length,
    forkThisYear: createdThisYear.filter((r) => r.type === 'fork').length,
    totalStarsReceived,
    starsReceivedThisYear: createdThisYear.reduce((s, r) => s + (r.stargazers_count || 0), 0),
    topLanguages,
    topDomains,
    monthlyActivity: monthly,
    topTopics,
    busiestMonth,
    healthAvg,
  }
}

export { monthName }
