import type { CensusData, Repo } from './types'

export interface AnnualReport {
  year: number

  // ── 仓库构成（三类） ──
  originalTotal: number // 自建仓库总数
  forkTotal: number // Fork 仓库总数
  starTotal: number // 标星仓库总数（表示你的兴趣，非你的产出）
  originalThisYear: number // 今年新建
  forkThisYear: number // 今年 Fork
  starThisYear: number // 今年标星

  // ── 你的影响力（仅自建 + Fork，即 own 仓库） ──
  totalStarsReceived: number // own 仓库累计收到的 Star
  starsThisYear: number // own 仓库中、今年新建/ Fork 的那些收到的 Star
  healthAvg: number // own 仓库平均健康分

  // ── 你的兴趣（仅标星仓库） ──
  starredLangTop: { name: string; count: number }[]
  starredTopicTop: { name: string; count: number }[]

  // ── own 仓库的语言 / 领域 / Topic ──
  topLanguages: { name: string; count: number }[]
  topDomains: { name: string; count: number }[]
  topTopics: { name: string; count: number }[]

  // ── own 仓库的月度活跃度 ──
  monthlyActivity: { month: number; created: number; pushed: number; starred: number }[]
  busiestMonth: number
}

function monthName(m: number): string {
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]
}

function countBy(
  repoList: Repo[],
  field: 'language' | 'category' | 'topics',
  n: number
): { name: string; count: number }[] {
  const map = new Map<string, number>()
  for (const r of repoList) {
    if (field === 'topics') {
      for (const t of r.topics || []) map.set(t, (map.get(t) || 0) + 1)
    } else {
      const v = (field === 'language' ? r.language : r.category) as string | undefined
      if (v) map.set(v, (map.get(v) || 0) + 1)
    }
  }
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
}

export function computeAnnualReport(data: CensusData, year?: number): AnnualReport {
  const targetYear = year ?? new Date().getFullYear()
  const repos = data.repos

  // 两类：own = 你自己的仓库（自建 + Fork）；starred = 你标星的别人仓库
  const own = repos.filter((r) => r.type === 'original' || r.type === 'fork')
  const starred = repos.filter((r) => r.type === 'star')

  // ── 构成 ──
  const originalTotal = repos.filter((r) => r.type === 'original').length
  const forkTotal = repos.filter((r) => r.type === 'fork').length
  const starTotal = starred.length

  // 本年度拆分：own 用 created_at；starred 用 starred_at
  const originalThisYear = own.filter(
    (r) => r.type === 'original' && new Date(r.created_at).getFullYear() === targetYear
  ).length
  const forkThisYear = own.filter(
    (r) => r.type === 'fork' && new Date(r.created_at).getFullYear() === targetYear
  ).length
  const starThisYear = starred.filter(
    (r) => r.starred_at && new Date(r.starred_at).getFullYear() === targetYear
  ).length

  // ── 影响力（仅 own） ──
  const totalStarsReceived = own.reduce((s, r) => s + (r.stargazers_count || 0), 0)
  const ownThisYear = own.filter((r) => new Date(r.created_at).getFullYear() === targetYear)
  const starsThisYear = ownThisYear.reduce((s, r) => s + (r.stargazers_count || 0), 0)
  const healthAvg = own.length
    ? Math.round(own.reduce((s, r) => s + (r.health_score || 0), 0) / own.length)
    : 0

  // ── 兴趣（仅 starred） ──
  const starredLangTop = countBy(starred, 'language', 6)
  const starredTopicTop = countBy(starred, 'topics', 12)

  // ── own 的语言 / 领域 / Topic ──
  const topLanguages = countBy(own, 'language', 6)
  const topDomains = countBy(own, 'category', 6)
  const topTopics = countBy(own, 'topics', 12)

  // ── 月度活跃度（own 仓库的创建/推送；starred 的标星） ──
  const monthly = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    monthLabel: monthName(i + 1),
    created: 0,
    pushed: 0,
    starred: 0,
  }))
  for (const r of own) {
    const c = new Date(r.created_at)
    if (c.getFullYear() === targetYear) monthly[c.getMonth()].created++
    const p = new Date(r.pushed_at)
    if (p.getFullYear() === targetYear) monthly[p.getMonth()].pushed++
  }
  for (const r of starred) {
    if (r.starred_at) {
      const s = new Date(r.starred_at)
      if (s.getFullYear() === targetYear) monthly[s.getMonth()].starred++
    }
  }
  const busiestMonth = monthly.reduce(
    (max, m) => (m.created + m.pushed > max.created + max.pushed ? m : max),
    monthly[0]
  ).month

  return {
    year: targetYear,
    originalTotal,
    forkTotal,
    starTotal,
    originalThisYear,
    forkThisYear,
    starThisYear,
    totalStarsReceived,
    starsThisYear,
    healthAvg,
    starredLangTop,
    starredTopicTop,
    topLanguages,
    topDomains,
    topTopics,
    monthlyActivity: monthly,
    busiestMonth,
  }
}

export { monthName }
