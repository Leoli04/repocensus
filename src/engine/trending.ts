import type { Repo, TrendingRepo, TrendingData } from './types'
import { daysSince } from './categorizer'

// ============================================================
// Trending Engine — Star growth analysis
// ============================================================

/**
 * Compute trending data from repos and previous star counts.
 *
 * - star_delta: current stars - previous stars (requires historical data)
 * - star_velocity: average stars per 30 days since repo creation
 * - trending_score: weighted combination (delta weighted higher when historical data exists)
 *
 * On first run (no previous data), falls back to velocity + absolute stars.
 */
export function computeTrending(
  repos: Repo[],
  prevStarMap: Map<string, number>
): TrendingData {
  const hasHistorical = prevStarMap.size > 0

  const trendingRepos: TrendingRepo[] = repos
    .filter((r) => !r.archived && r.stargazers_count > 0)
    .map((repo) => {
      const prevStars = prevStarMap.get(repo.full_name) ?? repo.stargazers_count
      const starDelta = repo.stargazers_count - prevStars

      const ageDays = Math.max(daysSince(repo.created_at), 1)
      const starVelocity = (repo.stargazers_count / ageDays) * 30

      let trendingScore: number
      if (hasHistorical) {
        // Weight recent growth heavily, velocity as tiebreaker
        trendingScore = starDelta * 10 + starVelocity * 2 + repo.stargazers_count * 0.01
      } else {
        // No historical data: use velocity + absolute stars as proxy
        trendingScore = starVelocity * 5 + repo.stargazers_count * 0.1
      }

      return {
        repo,
        star_delta: starDelta,
        prev_stars: prevStars,
        star_velocity: Math.round(starVelocity * 100) / 100,
        trending_score: Math.round(trendingScore * 100) / 100,
      }
    })
    .filter((t) => t.trending_score > 0)
    .sort((a, b) => b.trending_score - a.trending_score)

  const topN = 30
  const overall = trendingRepos.slice(0, topN)

  // Group by category, top 10 per category
  const catMap = new Map<string, TrendingRepo[]>()
  for (const t of trendingRepos) {
    const cat = t.repo.category
    if (!catMap.has(cat)) catMap.set(cat, [])
    catMap.get(cat)!.push(t)
  }
  const byCategory = Array.from(catMap.entries())
    .map(([category, rs]) => ({ category, repos: rs.slice(0, 10) }))
    .filter((g) => g.repos.length > 0)
    .sort((a, b) => {
      const aMax = a.repos[0]?.trending_score || 0
      const bMax = b.repos[0]?.trending_score || 0
      return bMax - aMax
    })

  return {
    overall,
    by_category: byCategory,
    period: '7 days',
    has_historical: hasHistorical,
  }
}
