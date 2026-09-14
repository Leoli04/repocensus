import { computed } from 'vue'
import type { HotBoard, HotBoardItem, HotPeriod, HotRepoMeta, HotTrendingData } from '../engine/types'

// Static import — Vite bundles this at build time (zero runtime API calls)
import hotData from '../data/trending.json'

const data = computed<HotTrendingData>(() => hotData as unknown as HotTrendingData)

const boards = computed<HotBoard[]>(() => data.value.boards || [])
const repos = computed<Record<string, HotRepoMeta>>(() => data.value.repos || {})
const languages = computed(() => data.value.languages || [])

/** Most recent board timestamp, or null when nothing has been collected yet */
const updatedAt = computed<string | null>(() => {
  let newest = 0
  for (const b of boards.value) {
    const t = new Date(b.updated_at).getTime()
    if (Number.isFinite(t) && t > newest) newest = t
  }
  return newest ? new Date(newest).toISOString() : null
})

/**
 * True when the board data hasn't refreshed for 36h+ — the scheduled Action was
 * paused (repo inactive for 60 days) or was never enabled after a fork.
 */
const isStale = computed<boolean>(() => {
  const ts = updatedAt.value
  if (!ts) return true
  return Date.now() - new Date(ts).getTime() > 36 * 3600 * 1000
})

function boardKey(period: HotPeriod, language: string): string {
  return `${period}:${language || 'all'}`
}

function findBoard(period: HotPeriod, language: string): HotBoard | undefined {
  return boards.value.find((b) => b.period === period && b.language === language)
}

/**
 * Language options for one period.
 *
 * Deliberately scoped to the period: a button for a language that has no board
 * in the *active* period would render an empty list on click, which reads as
 * "the filter does nothing".
 */
function languagesFor(period: HotPeriod): { id: string; label: string }[] {
  const ids = new Set(
    boards.value.filter((b) => b.period === period).map((b) => b.language)
  )
  const declared = languages.value.filter((l) => ids.has(l.id))
  // Fall back to whatever the boards contain if the script didn't declare them
  if (declared.length) return declared
  return [...ids].map((id) => ({ id, label: id || 'all' }))
}

function meta(fullName: string): HotRepoMeta | null {
  return repos.value[fullName] || null
}

function items(board: HotBoard | undefined): HotBoardItem[] {
  return board?.items || []
}

export function useHotTrending() {
  return {
    data,
    boards,
    repos,
    languages,
    updatedAt,
    isStale,
    boardKey,
    findBoard,
    languagesFor,
    meta,
    items,
  }
}
