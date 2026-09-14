import type { HotBoardItem, HotRepoMeta } from './types'

/**
 * How the global trending board is ordered.
 *
 * GitHub's trending page is NOT sorted by stars or by stars gained — it uses an
 * internal trending score, so its #1 often shows fewer stars than its #2. That
 * order stays available as `official`, but the UI defaults to `period` (stars
 * gained in the window), which is what people expect from a hot list.
 */
export type HotSort = 'official' | 'period' | 'stars' | 'velocity'

export interface HotRow {
  item: HotBoardItem
  meta: HotRepoMeta | null
  /** GitHub's own rank — also the identity the ▲/▼ badges are computed against */
  official: number
  /** Where the row sits in the current view */
  position: number
}

/** stars gained in the window ÷ total stars — favours fast risers over big repos */
export function growthRate(
  starsPeriod: number | null | undefined,
  stars: number
): number {
  if (!starsPeriod || !stars) return 0
  return starsPeriod / stars
}

type Row = Omit<HotRow, 'position'>
type MetaOf = (fullName: string) => HotRepoMeta | null

/**
 * Sort a board's rows for display.
 *
 * `official` is always kept as the tie-breaker so the result stays stable and
 * reproducible no matter which metric is active, and so rows that share a value
 * keep GitHub's relative order instead of depending on engine sort stability.
 */
export function sortHotRows(
  items: HotBoardItem[],
  metaOf: MetaOf,
  sort: HotSort
): HotRow[] {
  const list: Row[] = items.map((item) => ({
    item,
    meta: metaOf(item.full_name),
    official: item.rank || 0,
  }))

  const byOfficial = (a: Row, b: Row) => a.official - b.official
  const comparators: Record<HotSort, (a: Row, b: Row) => number> = {
    official: byOfficial,
    period: (a, b) =>
      (b.item.stars_period || 0) - (a.item.stars_period || 0) || byOfficial(a, b),
    stars: (a, b) => (b.meta?.stars || 0) - (a.meta?.stars || 0) || byOfficial(a, b),
    velocity: (a, b) =>
      growthRate(b.item.stars_period, b.meta?.stars || 0) -
        growthRate(a.item.stars_period, a.meta?.stars || 0) || byOfficial(a, b),
  }

  return list
    .slice()
    .sort(comparators[sort])
    .map((r, i) => ({ ...r, position: i + 1 }))
}
