import type { Repo } from './types'
import { daysSince } from './categorizer'

// ============================================================
// Health Score — 0-100 composite metric
// ============================================================

/**
 * Calculate a health score for a repo based on multiple signals.
 *
 * Signals & weights:
 *   - Recency of updates    40% (updated within 6 months = full)
 *   - Stars received        20% (log scale)
 *   - Has README            15%
 *   - Has Topics            10%
 *   - Has License           10%
 *   - Issue activity         5%
 */
export function calculateHealthScore(repo: Repo): number {
  let score = 0

  // 1. Recency (40 points max)
  const days = daysSince(repo.updated_at)
  if (days <= 30) score += 40
  else if (days <= 90) score += 35
  else if (days <= 180) score += 30
  else if (days <= 365) score += 20
  else if (days <= 730) score += 10
  else score += 0

  // 2. Stars (20 points max, log scale)
  const stars = repo.stargazers_count || 0
  if (stars >= 100) score += 20
  else if (stars >= 10) score += 15
  else if (stars >= 1) score += 8
  else score += 0

  // 3. README (15 points)
  if (repo.has_readme) score += 15

  // 4. Topics (10 points)
  if (repo.topics && repo.topics.length > 0) score += 10

  // 5. License (10 points)
  if (repo.has_license) score += 10

  // 6. Issue activity (5 points)
  if (repo.open_issues_count > 0) score += 5

  // Archived repos get a penalty
  if (repo.archived) score = Math.min(score, 20)

  return Math.min(100, Math.max(0, score))
}

/**
 * Get a health label from score.
 */
export function healthLabel(score: number): { label: string; color: string } {
  if (score >= 70) return { label: '健康', color: '#22c55e' }
  if (score >= 40) return { label: '一般', color: '#f59e0b' }
  return { label: '风险', color: '#ef4444' }
}

/**
 * Calculate average health across all repos.
 */
export function avgHealth(repos: Repo[]): number {
  if (repos.length === 0) return 0
  const total = repos.reduce((sum, r) => sum + r.health_score, 0)
  return Math.round(total / repos.length)
}
