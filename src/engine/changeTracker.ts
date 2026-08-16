import type { ChangeSnapshot, ChangeDiff, ChangeEntry, StarChange } from './types'

/**
 * Compare the two most recent snapshots and produce a diff:
 * - added: repos present now but absent before
 * - removed: repos present before but absent now
 * - starUp / starDown: signed star-count deltas for repos in both snapshots
 *
 * Returns null when there is not enough history (fewer than 2 snapshots).
 */
export function computeChange(history: ChangeSnapshot[] | undefined): ChangeDiff | null {
  if (!history || history.length < 2) return null

  const to = history[history.length - 1]
  const from = history[history.length - 2]

  const fromNames = new Set(from.names)
  const toNames = new Set(to.names)

  const added: ChangeEntry[] = to.names
    .filter((n) => !fromNames.has(n))
    .map((n) => ({ full_name: n, stars: to.stars[n] ?? 0 }))

  const removed: ChangeEntry[] = from.names
    .filter((n) => !toNames.has(n))
    .map((n) => ({ full_name: n, stars: from.stars[n] ?? 0 }))

  const starUp: StarChange[] = []
  const starDown: StarChange[] = []
  let unchangedCount = 0

  for (const n of toNames) {
    if (!fromNames.has(n)) continue // added repos handled above
    const f = from.stars[n] ?? 0
    const t = to.stars[n] ?? 0
    const delta = t - f
    if (delta > 0) starUp.push({ full_name: n, from: f, to: t, delta })
    else if (delta < 0) starDown.push({ full_name: n, from: f, to: t, delta })
    else unchangedCount++
  }

  starUp.sort((a, b) => b.delta - a.delta)
  starDown.sort((a, b) => a.delta - b.delta)

  return { from, to, added, removed, starUp, starDown, unchangedCount }
}
