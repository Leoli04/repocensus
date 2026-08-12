import type { Repo, CategoryTemplate, CategoryRule, Matcher } from './types'

// ============================================================
// Categorizer — Multi-signal weighted classification engine
// ============================================================

/**
 * Match a single matcher against a repo.
 * Returns the weight if matched, 0 if not.
 */
function matchMatcher(repo: Repo, matcher: Matcher): number {
  let fieldValue = ''

  switch (matcher.field) {
    case 'topics':
      fieldValue = (repo.topics || []).join(' ').toLowerCase()
      break
    case 'language':
      fieldValue = (repo.language || '').toLowerCase()
      break
    case 'name':
      fieldValue = (repo.name || '').toLowerCase()
      break
    case 'description':
      fieldValue = (repo.description || '').toLowerCase()
      break
  }

  // Special sentinel values for activity/type-based templates
  if (matcher.operator === 'regex') {
    const v = String(matcher.value)
    switch (v) {
      case '__IS_FORK__':
        return repo.type === 'fork' ? matcher.weight : 0
      case '__IS_ORIGINAL__':
        return repo.type === 'original' ? matcher.weight : 0
      case '__IS_STAR__':
        return repo.type === 'star' ? matcher.weight : 0
      case '__ACTIVE_6M__':
        return daysSince(repo.updated_at) <= 180 ? matcher.weight : 0
      case '__SILENT_2Y__':
        return daysSince(repo.updated_at) > 180 && daysSince(repo.updated_at) <= 730 ? matcher.weight : 0
      case '__ARCHIVED_2Y__':
        return daysSince(repo.updated_at) > 730 ? matcher.weight : 0
      default:
        return 0
    }
  }

  if (matcher.operator === 'equals') {
    const values = Array.isArray(matcher.value) ? matcher.value : [matcher.value]
    if (values.includes('*') && fieldValue) return matcher.weight
    return values.some((v) => v.toLowerCase() === fieldValue) ? matcher.weight : 0
  }

  if (matcher.operator === 'contains') {
    const values = Array.isArray(matcher.value) ? matcher.value : [matcher.value]
    return values.some((v) => fieldValue.includes(v.toLowerCase())) ? matcher.weight : 0
  }

  return 0
}

/**
 * Score a repo against a single category rule.
 * Returns the total weighted score.
 */
function scoreCategory(repo: Repo, rule: CategoryRule): number {
  let total = 0
  for (const matcher of rule.matchers) {
    total += matchMatcher(repo, matcher)
  }
  return total
}

/**
 * Categorize a single repo using a template.
 * Returns the category name with the highest score.
 */
export function categorize(repo: Repo, template: CategoryTemplate): string {
  let bestCategory = '其他'
  let bestScore = 0

  // Sort by priority (lower = checked first for tie-breaking)
  const sorted = [...template.categories].sort((a, b) => a.priority - b.priority)

  for (const rule of sorted) {
    const score = scoreCategory(repo, rule)
    if (score > bestScore) {
      bestScore = score
      bestCategory = rule.name
    }
  }

  // Fallback for type-based template
  if (bestScore === 0 && template.id === 'by-type') {
    if (repo.type === 'original') return '🛠️ 自建'
    if (repo.type === 'fork') return '🍴 Fork'
    return '⭐ Star'
  }

  return bestScore > 0 ? bestCategory : '其他'
}

/**
 * Categorize all repos with a given template.
 * Returns a map of category -> repos.
 */
export function categorizeAll(
  repos: Repo[],
  template: CategoryTemplate
): Map<string, Repo[]> {
  const result = new Map<string, Repo[]>()

  for (const repo of repos) {
    const category = categorize(repo, template)
    if (!result.has(category)) {
      result.set(category, [])
    }
    result.get(category)!.push(repo)
  }

  return result
}

/**
 * Recategorize repos with a different template (for client-side switching).
 * Only updates the `category` field.
 */
export function recategorize(repos: Repo[], template: CategoryTemplate): Repo[] {
  return repos.map((repo) => ({
    ...repo,
    category: categorize(repo, template),
  }))
}

// ── Utility ────────────────────────────────────────────────

export function daysSince(dateStr: string): number {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  return Math.floor((now - then) / (1000 * 60 * 60 * 24))
}
