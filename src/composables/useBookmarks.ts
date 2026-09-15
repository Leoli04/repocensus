import { computed, ref } from 'vue'
import type { Bookmark, BookmarkHealth } from '../engine/types'

// The bundled example is the only bookmark data that ever ships in the repo.
// Everything the user actually edits stays in this browser, so forking the
// project never drags along somebody else's private link list.
import exampleData from '../data/bookmarks.example.json'

const STORAGE_KEY = 'repocensus:bookmarks'
const HEALTH_KEY = 'repocensus:bookmarks-health'
const PROBE_TIMEOUT_MS = 6000
const HEALTH_TTL_MS = 24 * 3600 * 1000
const PROBE_CONCURRENCY = 5

const exampleList: Bookmark[] = ((exampleData as any)?.bookmarks || []).filter(isBookmark)

function isHttpUrl(url: unknown): boolean {
  return typeof url === 'string' && /^https?:\/\//i.test(url)
}

function isBookmark(b: any): b is Bookmark {
  return (
    b &&
    typeof b.id === 'string' &&
    typeof b.name === 'string' &&
    isHttpUrl(b.url) &&
    typeof b.group === 'string'
  )
}

/** "Vite 文档" → "VT"; "GitHub" → "GH" — a compact tile monogram */
function deriveBadge(name: string): string {
  const ascii = name.replace(/[^A-Za-z0-9]/g, '')
  if (ascii.length >= 2) return ascii.slice(0, 2).toUpperCase()
  return name.slice(0, 1) || '?'
}

function normalize(b: Bookmark): Bookmark {
  return { ...b, badge: (b.badge || '').trim() || deriveBadge(b.name) }
}

/**
 * Read the stored list, keeping "nothing stored yet" apart from "stored an
 * empty list". Collapsing both into null used to make an emptied list look
 * like a first visit, so the bundled example silently reappeared on reload
 * and every deletion the user made seemed to have been undone.
 */
function readStored(): { has: boolean; list: Bookmark[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { has: false, list: [] }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return { has: false, list: [] }
    const list = parsed.filter(isBookmark).map(normalize)
    // An empty payload means the user deleted everything — honour it.
    // A non-empty payload that yielded nothing valid is corrupt: fall back.
    if (!list.length && parsed.length) return { has: false, list: [] }
    return { has: true, list }
  } catch {
    return { has: false, list: [] }
  }
}

// ── Shared reactive state (one list for the whole app) ─────
const stored = readStored()
const bookmarks = ref<Bookmark[]>(stored.has ? stored.list : exampleList.map(normalize))
/** true while the list is still the untouched bundled example */
const isExample = ref<boolean>(!stored.has)

const healthMap = ref<Record<string, BookmarkHealth>>({})
const healthCheckedAt = ref<number>(0)
const checking = ref(false)

function loadHealthCache() {
  try {
    const raw = localStorage.getItem(HEALTH_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed.at === 'number' && parsed.map) {
      healthCheckedAt.value = parsed.at
      healthMap.value = parsed.map
    }
  } catch {
    /* ignore */
  }
}

function saveHealthCache() {
  try {
    localStorage.setItem(
      HEALTH_KEY,
      JSON.stringify({ at: healthCheckedAt.value, map: healthMap.value })
    )
  } catch {
    /* ignore */
  }
}

function persist(list: Bookmark[]) {
  bookmarks.value = list.map(normalize)
  isExample.value = false
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks.value))
  } catch {
    /* quota / private mode — the in-memory list still works this session */
  }
}

loadHealthCache()

/** All distinct groups, ordered by first appearance */
const groups = computed(() => {
  const seen: string[] = []
  for (const b of bookmarks.value) {
    if (!seen.includes(b.group)) seen.push(b.group)
  }
  return seen
})

const bookmarksByGroup = computed(() =>
  groups.value.map((g) => ({ group: g, items: bookmarks.value.filter((b) => b.group === g) }))
)

const deadLinks = computed(() =>
  bookmarks.value.filter((b) => healthMap.value[b.url] === 'dead')
)

const unreachableCount = computed(() => deadLinks.value.length)

/**
 * Is this URL reachable at all?
 *
 * `mode: 'no-cors'` means the response comes back opaque, so we can only tell
 * "the host answered" from "the host never answered" (DNS gone, connection
 * refused, timeout). A 404 still counts as reachable — call it 无法访问, not 失效,
 * in the UI so the wording stays honest.
 */
async function probe(url: string): Promise<BookmarkHealth> {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), PROBE_TIMEOUT_MS)
  try {
    await fetch(url, {
      mode: 'no-cors',
      cache: 'no-store',
      redirect: 'follow',
      signal: ctl.signal,
    })
    return 'ok'
  } catch {
    return 'dead'
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Probe every bookmark, at most PROBE_CONCURRENCY at a time.
 * Results are cached for 24h so opening the tab doesn't re-hammer 30 sites.
 */
async function checkHealth(force = false) {
  if (checking.value) return
  const fresh = Date.now() - healthCheckedAt.value < HEALTH_TTL_MS
  if (!force && fresh && Object.keys(healthMap.value).length) return
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return

  checking.value = true
  try {
    const list = bookmarks.value.slice()
    const next: Record<string, BookmarkHealth> = { ...healthMap.value }
    for (let i = 0; i < list.length; i += PROBE_CONCURRENCY) {
      const chunk = list.slice(i, i + PROBE_CONCURRENCY)
      const results = await Promise.all(chunk.map((b) => probe(b.url)))
      chunk.forEach((b, idx) => {
        next[b.url] = results[idx]
      })
      healthMap.value = { ...next }
    }
    healthCheckedAt.value = Date.now()
    saveHealthCache()
  } finally {
    checking.value = false
  }
}

// ── Mutations ─────────────────────────────────────────────

function addBookmark(input: { name: string; url: string; group: string; description?: string }) {
  const url = input.url.trim()
  if (!isHttpUrl(url)) return false
  const name = input.name.trim() || url
  const group = input.group.trim() || '未分组'
  const id = `bm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
  persist([
    ...bookmarks.value,
    normalize({ id, name, url, group, description: input.description?.trim() || undefined }),
  ])
  return true
}

function removeBookmark(id: string) {
  persist(bookmarks.value.filter((b) => b.id !== id))
}

function resetToExample() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
  bookmarks.value = exampleList.map(normalize)
  isExample.value = true
}

// ── Import / export (this is what replaces "edit a yml in the repo") ──

function exportJSON() {
  const payload = {
    exported_at: new Date().toISOString(),
    bookmarks: bookmarks.value,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'repocensus-bookmarks.json'
  a.click()
  URL.revokeObjectURL(url)
}

/** Accepts either `{ bookmarks: [...] }` or a bare array. Returns the count imported. */
function importJSON(text: string): number {
  let parsed: any
  try {
    parsed = JSON.parse(text)
  } catch {
    return -1
  }
  const raw = Array.isArray(parsed) ? parsed : parsed?.bookmarks
  if (!Array.isArray(raw)) return -1
  const valid = raw.filter(isBookmark)
  if (!valid.length) return -1
  persist(valid)
  return valid.length
}

export function useBookmarks() {
  return {
    bookmarks,
    groups,
    bookmarksByGroup,
    isExample,
    healthMap,
    deadLinks,
    unreachableCount,
    checking,
    checkHealth,
    addBookmark,
    removeBookmark,
    resetToExample,
    exportJSON,
    importJSON,
    deriveBadge,
  }
}
