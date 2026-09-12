import type { ChangeSnapshot, RepoTrend, StarPoint } from './types'

/**
 * Compute trend-chart data from the snapshot history:
 * - global: total star count per snapshot
 * - topRepos: repos with the largest star growth across the window (top N)
 */
export function computeTrends(
  history: ChangeSnapshot[] | undefined,
  topN = 8
): { global: StarPoint[]; topRepos: RepoTrend[]; windowCount: number } {
  if (!history || history.length < 2) {
    return { global: [], topRepos: [], windowCount: history?.length || 0 }
  }

  const window = history.slice(-12) // use at most the last 12 snapshots

  // Global total stars per snapshot
  const global: StarPoint[] = window.map((s) => ({
    date: s.generated_at,
    total: Object.values(s.stars).reduce((sum, n) => sum + (n || 0), 0),
  }))

  // Per-repo trends: only repos present in the first snapshot of the window
  const first = window[0]
  const deltas: RepoTrend[] = []
  for (const name of first.names) {
    const points = window.map((s) => s.stars[name] ?? 0)
    const delta = points[points.length - 1] - points[0]
    deltas.push({
      full_name: name,
      url: first.urls[name] || '#',
      points,
      delta,
    })
  }
  deltas.sort((a, b) => b.delta - a.delta)
  const topRepos = deltas.filter((d) => d.delta > 0).slice(0, topN)

  return { global, topRepos, windowCount: window.length }
}
