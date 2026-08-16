import type { Repo, TechProfile, StaleRepo } from './types'
import { daysSince } from './categorizer'

// ============================================================
// Tech Profile & Stale Repo Analysis
// ============================================================

/**
 * Build a tech profile from repos.
 */
export function buildTechProfile(repos: Repo[]): TechProfile {
  const langMap = new Map<string, number>()
  const domainMap = new Map<string, number>()
  let active = 0
  let silent = 0
  let archived = 0
  let totalStarsReceived = 0
  let totalStarsGiven = 0

  for (const repo of repos) {
    // Language distribution
    if (repo.language) {
      langMap.set(repo.language, (langMap.get(repo.language) || 0) + 1)
    }

    // Domain distribution (from computed category using by-domain template)
    if (repo.category) {
      domainMap.set(repo.category, (domainMap.get(repo.category) || 0) + 1)
    }

    // Activity
    const days = daysSince(repo.updated_at)
    if (days <= 180) active++
    else if (days <= 730) silent++
    else archived++

    // Stars
    if (repo.type === 'original') {
      totalStarsReceived += repo.stargazers_count || 0
    }
    if (repo.type === 'star') {
      totalStarsGiven++
    }
  }

  // Sort languages by count
  const totalLangs = Array.from(langMap.values()).reduce((a, b) => a + b, 0) || 1
  const languages = Array.from(langMap.entries())
    .map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / totalLangs) * 100),
    }))
    .sort((a, b) => b.count - a.count)

  // Sort domains by count
  const domains = Array.from(domainMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  return {
    languages,
    domains,
    activity: { active, silent, archived },
    total_stars_received: totalStarsReceived,
    total_stars_given: totalStarsGiven,
  }
}

/**
 * Find stale repos that should be considered for archival/deletion.
 * Criteria: > 2 years old, < 3 stars, not a fork, not archived.
 */
export function findStaleRepos(repos: Repo[]): StaleRepo[] {
  const stale: StaleRepo[] = []

  for (const repo of repos) {
    if (repo.type !== 'original') continue
    if (repo.archived) continue

    const days = daysSince(repo.updated_at)
    if (days > 730 && repo.stargazers_count < 3) {
      stale.push({
        repo,
        reason: '{years} 年未更新，{stars} star',
        days_since_update: days,
      })
    }
  }

  return stale.sort((a, b) => b.days_since_update - a.days_since_update)
}

/**
 * Get recently starred repos, sorted by starred_at descending.
 */
export function getNewStars(repos: Repo[]): Repo[] {
  return repos
    .filter((r) => r.type === 'star' && r.starred_at)
    .sort((a, b) => new Date(b.starred_at!).getTime() - new Date(a.starred_at!).getTime())
    .map((r) => ({
      ...r,
      starred_days_ago: r.starred_at ? daysSince(r.starred_at) : null,
    }))
}
