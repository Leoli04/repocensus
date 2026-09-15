<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { CensusData } from '../engine/types'
import { useI18n } from '../i18n'

const props = defineProps<{ data: CensusData }>()
const { t } = useI18n()

// ── Mode & chips input ────────────────────────────────────
type Mode = 'me' | 'others'
const MODE_KEY = 'repocensus:cmp-list'
/** Hard cap of compared sides (including "me" in me-mode) */
const MAX_SIDES = 4

const mode = ref<Mode>('me')
const chips = ref<string[]>([])
const chipInput = ref('')
const loading = ref(false)
const loadingName = ref('')
const error = ref('')
const failed = ref<string[]>([])

interface RawRepo {
  name: string
  full_name: string
  html_url: string
  description: string | null
  language: string | null
  stargazers_count: number
  fork: boolean
  pushed_at: string
}

interface SideStats {
  username: string
  avatar: string
  url: string
  isMe: boolean
  repoCount: number
  totalStars: number
  activeCount: number
  avgStars: number
  topLangs: { name: string; count: number; pct: number }[]
  topRepos: { name: string; url: string; stars: number; lang: string | null }[]
  /** raw repo list, kept for overlap computation */
  repos: RawRepo[]
}

const sides = ref<SideStats[]>([])

interface PairOverlap {
  a: string
  b: string
  count: number
  pct: number
  repos: RawRepo[]
}
const overlaps = ref<PairOverlap[]>([])

const langColors: Record<string, string> = {
  Java: '#b07219',
  Python: '#3572A5',
  Vue: '#41b883',
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  'Jupyter Notebook': '#DA5B0B',
  Rust: '#dea584',
  Go: '#00ADD8',
  'C++': '#f34b7d',
  'C#': '#178600',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Shell: '#89e051',
  MDX: '#fcb32c',
  C: '#555555',
}

function langColor(name: string | null): string {
  return (name && langColors[name]) || '#8b8b8b'
}

function nowMs(): number {
  return Date.now()
}

/**
 * Build the stats of one side. Forks are excluded on EVERY side so the
 * comparison is apples-to-apples (the old 1-vs-1 view excluded forks on
 * "my" side but counted them on the other's).
 */
function buildStats(
  username: string,
  avatar: string,
  url: string,
  reposRaw: RawRepo[],
  isMe: boolean
): SideStats {
  const list = reposRaw.filter((r) => !r.fork)
  const totalStars = list.reduce((s, r) => s + r.stargazers_count, 0)
  const activeCount = list.filter(
    (r) => nowMs() - new Date(r.pushed_at).getTime() < 180 * 86400_000
  ).length

  const langCount = new Map<string, number>()
  for (const r of list) {
    if (!r.language) continue
    langCount.set(r.language, (langCount.get(r.language) || 0) + 1)
  }
  const topLangs = [...langCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count, pct: list.length ? Math.round((count / list.length) * 100) : 0 }))

  const topRepos = [...list]
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 3)
    .map((r) => ({ name: r.full_name.split('/')[1] || r.full_name, url: r.html_url, stars: r.stargazers_count, lang: r.language }))

  return {
    username,
    avatar,
    url,
    isMe,
    repoCount: list.length,
    totalStars,
    activeCount,
    avgStars: list.length ? totalStars / list.length : 0,
    topLangs,
    topRepos,
    repos: list,
  }
}

// ── Chips ─────────────────────────────────────────────────
function maxChips(): number {
  return mode.value === 'me' ? MAX_SIDES - 1 : MAX_SIDES
}

function addChip() {
  const name = chipInput.value.trim().replace(/^@/, '')
  error.value = ''
  if (!name) return
  if (chips.value.some((c) => c.toLowerCase() === name.toLowerCase())) {
    error.value = t('cmp.errDup', { name })
    return
  }
  if (mode.value === 'me' && name.toLowerCase() === props.data.username.toLowerCase()) {
    error.value = t('cmp.errSelfChip')
    return
  }
  if (chips.value.length >= maxChips()) {
    error.value = t('cmp.errCount', { min: mode.value === 'me' ? 1 : 2, max: maxChips() })
    return
  }
  chips.value.push(name)
  chipInput.value = ''
}

function removeChip(i: number) {
  chips.value.splice(i, 1)
  error.value = ''
}

function clearAll() {
  chips.value = []
  chipInput.value = ''
  sides.value = []
  overlaps.value = []
  failed.value = []
  error.value = ''
  persist()
}

function switchMode(m: Mode) {
  if (mode.value === m) return
  mode.value = m
  sides.value = []
  overlaps.value = []
  failed.value = []
  error.value = ''
  persist()
}

// ── Persist last used list (local device only) ────────────
function persist() {
  try {
    localStorage.setItem(MODE_KEY, JSON.stringify({ mode: mode.value, chips: chips.value }))
  } catch {
    /* private mode etc. — list simply won't be remembered */
  }
}

onMounted(() => {
  try {
    const raw = localStorage.getItem(MODE_KEY)
    if (!raw) return
    const saved = JSON.parse(raw)
    if (saved && (saved.mode === 'me' || saved.mode === 'others') && Array.isArray(saved.chips)) {
      mode.value = saved.mode
      chips.value = saved.chips.filter((c: unknown) => typeof c === 'string' && c.trim()).slice(0, MAX_SIDES)
    }
  } catch {
    /* corrupted storage — start empty */
  }
})

// ── GitHub API (anonymous; ~3 requests per user) ──────────
const API = 'https://api.github.com'
const HEADERS: Record<string, string> = { Accept: 'application/vnd.github+json' }

class RateLimitError extends Error {}

async function fetchUser(name: string) {
  const resp = await fetch(`${API}/users/${encodeURIComponent(name)}`, { headers: HEADERS })
  if (resp.status === 404) return null
  if (resp.status === 403) throw new RateLimitError('rate limited')
  if (!resp.ok) throw new Error(String(resp.status))
  return await resp.json()
}

async function fetchRepos(name: string): Promise<RawRepo[]> {
  const repos: RawRepo[] = []
  for (let page = 1; page <= 2; page++) {
    const resp = await fetch(
      `${API}/users/${encodeURIComponent(name)}/repos?per_page=100&type=owner&sort=pushed&page=${page}`,
      { headers: HEADERS }
    )
    if (resp.status === 403) throw new RateLimitError('rate limited')
    if (!resp.ok) throw new Error(String(resp.status))
    const batch: RawRepo[] = await resp.json()
    repos.push(...batch)
    if (batch.length < 100) break
  }
  return repos
}

async function compare() {
  if (loading.value) return
  const names = [...new Set(chips.value.map((c) => c.trim()).filter(Boolean))]
  const min = mode.value === 'me' ? 1 : 2
  const max = maxChips()
  if (names.length < min || names.length > max) {
    error.value = t('cmp.errCount', { min, max })
    return
  }
  if (mode.value === 'me' && names.some((n) => n.toLowerCase() === props.data.username.toLowerCase())) {
    error.value = t('cmp.errSelfChip')
    return
  }

  loading.value = true
  error.value = ''
  failed.value = []
  sides.value = []
  overlaps.value = []
  try {
    const fetched: { username: string; avatar: string; url: string; repos: RawRepo[] }[] = []
    for (const name of names) {
      loadingName.value = name
      const u = await fetchUser(name)
      if (!u) {
        failed.value.push(name)
        continue
      }
      const repos = await fetchRepos(u.login)
      fetched.push({ username: u.login, avatar: u.avatar_url, url: u.html_url, repos })
    }

    if (!fetched.length) {
      error.value = t('cmp.errFetch')
      return
    }

    const stats = fetched.map((f) => buildStats(f.username, f.avatar, f.url, f.repos, false))

    if (mode.value === 'me') {
      const mine = props.data.repos.filter((r) => r.type === 'original') as unknown as RawRepo[]
      const meStats = buildStats(props.data.username, props.data.avatar_url, props.data.html_url, mine, true)
      sides.value = [meStats, ...stats.sort((a, b) => b.totalStars - a.totalStars)]

      // overlap: me vs each other user
      const myNames = new Set(props.data.repos.map((r) => r.full_name.toLowerCase()))
      overlaps.value = stats
        .map((s) => {
          const common = s.repos.filter((r) => myNames.has(r.full_name.toLowerCase()))
          const pct = s.repos.length ? Math.round((common.length / s.repos.length) * 100) : 0
          return { a: props.data.username, b: s.username, count: common.length, pct, repos: common.slice(0, 12) }
        })
        .sort((x, y) => y.count - x.count)
    } else {
      sides.value = stats.sort((a, b) => b.totalStars - a.totalStars)

      // overlap: every pair (4 users → at most 6 pairs)
      const pairs: PairOverlap[] = []
      for (let i = 0; i < sides.value.length; i++) {
        for (let j = i + 1; j < sides.value.length; j++) {
          const A = sides.value[i]
          const B = sides.value[j]
          const setB = new Set(B.repos.map((r) => r.full_name.toLowerCase()))
          const common = A.repos.filter((r) => setB.has(r.full_name.toLowerCase()))
          const pct = A.repos.length ? Math.round((common.length / A.repos.length) * 100) : 0
          pairs.push({ a: A.username, b: B.username, count: common.length, pct, repos: common.slice(0, 12) })
        }
      }
      overlaps.value = pairs.sort((x, y) => y.count - x.count)
    }
    persist()
  } catch (e) {
    if (e instanceof RateLimitError) error.value = t('cmp.errRate')
    else error.value = t('cmp.errFetch')
  } finally {
    loading.value = false
    loadingName.value = ''
  }
}

// ── Metric rendering & "best among all sides" highlight ──
const metricDefs = [
  { key: 'repoCount', labelKey: 'cmp.repos' },
  { key: 'totalStars', labelKey: 'cmp.totalStars', fmt: fmtStars },
  { key: 'activeCount', labelKey: 'cmp.active' },
  { key: 'avgStars', labelKey: 'cmp.avgStars', fmt: (n: number) => n.toFixed(1) },
] as const

function metricVal(side: SideStats, key: string): number {
  return (side as unknown as Record<string, number>)[key]
}

/** true when this side holds the best value of the metric among all sides (ties all highlight) */
function isBest(side: SideStats, key: string): boolean {
  if (sides.value.length < 2) return false
  const vals = sides.value.map((s) => metricVal(s, key))
  return metricVal(side, key) === Math.max(...vals)
}

function fmtStars(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}
</script>

<template>
  <section class="compare-panel">
    <h3 class="section-title">⚖️ {{ t('cmp.title') }}</h3>
    <p class="section-subtitle">{{ t('cmp.subtitle') }}</p>

    <!-- Mode switch -->
    <div class="cmp-modes">
      <button class="cmp-mode" :class="{ active: mode === 'me' }" @click="switchMode('me')">
        {{ t('cmp.modeMe') }}
      </button>
      <button class="cmp-mode" :class="{ active: mode === 'others' }" @click="switchMode('others')">
        {{ t('cmp.modeOthers') }}
      </button>
    </div>

    <!-- Chips -->
    <div class="cmp-chips">
      <span v-if="mode === 'me'" class="cmp-chip me" :title="data.username">
        <img :src="data.avatar_url" class="cmp-chip-avatar" alt="" />
        {{ data.username }}
      </span>
      <span v-for="(c, i) in chips" :key="c.toLowerCase()" class="cmp-chip">
        {{ c }}
        <button class="cmp-chip-del" :title="t('cmp.removeChip')" @click="removeChip(i)">×</button>
      </span>
      <input
        v-if="chips.length < maxChips()"
        v-model="chipInput"
        class="cmp-chip-input"
        :placeholder="t('cmp.chipPlaceholder')"
        @keyup.enter="addChip"
      />
    </div>

    <div class="cmp-actions">
      <button class="cmp-btn" :disabled="loading || !chips.length" @click="compare">
        {{ loading ? `⏳ ${loadingName}…` : t('cmp.go') }}
      </button>
      <button v-if="chips.length || sides.length" class="cmp-btn-ghost" @click="clearAll">
        {{ t('cmp.clear') }}
      </button>
    </div>
    <p class="cmp-hint">{{ t('cmp.hint') }}</p>
    <p v-if="error" class="cmp-error">{{ error }}</p>
    <p v-if="failed.length" class="cmp-error">{{ t('cmp.failedSome', { names: failed.join(', ') }) }}</p>

    <!-- Results -->
    <template v-if="sides.length">
      <div class="cmp-grid">
        <div v-for="side in sides" :key="side.username" class="cmp-card" :class="{ mine: side.isMe }">
          <div class="cmp-user">
            <img :src="side.avatar" :alt="side.username" class="cmp-avatar" />
            <div class="cmp-user-meta">
              <a :href="side.url" target="_blank" rel="noopener" class="cmp-username">{{ side.username }}</a>
              <span v-if="side.isMe" class="cmp-you">{{ t('cmp.you') }}</span>
            </div>
          </div>

          <div class="cmp-metrics">
            <div
              v-for="m in metricDefs"
              :key="m.key"
              class="cmp-metric"
              :class="{ win: isBest(side, m.key) }"
            >
              <span class="metric-num">
                {{ 'fmt' in m && m.fmt ? m.fmt(metricVal(side, m.key)) : metricVal(side, m.key) }}
              </span>
              <span class="metric-key">{{ t(m.labelKey) }}</span>
            </div>
          </div>

          <!-- Language bars -->
          <div class="cmp-langs">
            <span class="cmp-sub">{{ t('cmp.langs') }}</span>
            <div v-for="lang in side.topLangs" :key="lang.name" class="lang-bar">
              <span class="lang-name">{{ lang.name }}</span>
              <div class="bar-track">
                <div class="bar-fill" :style="{ width: lang.pct + '%', background: langColor(lang.name) }" />
              </div>
              <span class="lang-pct">{{ lang.pct }}%</span>
            </div>
            <span v-if="!side.topLangs.length" class="cmp-none">{{ t('common.noData') }}</span>
          </div>

          <!-- Top repos -->
          <div class="cmp-top">
            <span class="cmp-sub">{{ t('cmp.topRepos') }}</span>
            <a v-for="r in side.topRepos" :key="r.name" :href="r.url" target="_blank" rel="noopener" class="top-repo">
              <span class="top-repo-name">{{ r.name }}</span>
              <span class="top-repo-meta">{{ r.lang || '—' }} · ⭐ {{ fmtStars(r.stars) }}</span>
            </a>
            <span v-if="!side.topRepos.length" class="cmp-none">{{ t('common.noData') }}</span>
          </div>
        </div>
      </div>

      <!-- Overlap -->
      <div v-if="overlaps.length" class="overlap-card">
        <div class="overlap-head">
          <span class="overlap-title">🔗 {{ mode === 'me' ? t('cmp.overlapWithMe') : t('cmp.pairOverlap') }}</span>
        </div>
        <div v-for="o in overlaps" :key="o.a + '|' + o.b" class="overlap-row">
          <div class="overlap-row-head">
            <span class="overlap-pair">{{ o.a }} ↔ {{ o.b }}</span>
            <span class="overlap-num">{{ t('cmp.overlapNum', { n: o.count, p: o.pct }) }}</span>
          </div>
          <div class="overlap-bar-track">
            <div class="overlap-bar-fill" :style="{ width: o.pct + '%' }" />
          </div>
          <div v-if="o.repos.length" class="overlap-chips">
            <a v-for="r in o.repos" :key="r.full_name" :href="r.html_url" target="_blank" rel="noopener" class="topic-chip">
              {{ r.full_name }}
            </a>
          </div>
        </div>
        <p v-if="overlaps.every((o) => !o.count)" class="cmp-none">{{ t('cmp.overlapNone') }}</p>
      </div>
    </template>
  </section>
</template>

<style scoped>
.compare-panel {
  margin-top: 8px;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 4px;
  color: var(--text-primary);
}

.section-subtitle {
  font-size: 13px;
  color: var(--text-tertiary);
  margin: 0 0 16px;
}

.cmp-modes {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  border-radius: 10px;
  background: var(--badge-bg);
  margin-bottom: 12px;
}

.cmp-mode {
  padding: 7px 16px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.cmp-mode.active {
  background: var(--accent);
  color: #fff;
}

.cmp-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.cmp-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 9px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.cmp-chip.me {
  border-color: var(--accent);
  color: var(--accent);
}

.cmp-chip-avatar {
  width: 18px;
  height: 18px;
  border-radius: 50%;
}

.cmp-chip-del {
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  padding: 0 2px;
}

.cmp-chip-del:hover {
  color: #ef4444;
}

.cmp-chip-input {
  padding: 7px 12px;
  border-radius: 9px;
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  color: var(--text-primary);
  font-size: 13px;
  min-width: 200px;
}

.cmp-chip-input:focus {
  outline: none;
  border-color: var(--accent);
}

.cmp-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.cmp-btn {
  padding: 9px 20px;
  border-radius: 9px;
  border: none;
  background: var(--accent);
  color: #fff;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
}

.cmp-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cmp-btn-ghost {
  padding: 9px 14px;
  border-radius: 9px;
  border: 1px solid var(--card-border);
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
}

.cmp-btn-ghost:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.cmp-hint {
  font-size: 11px;
  color: var(--text-tertiary);
  margin: 6px 0 0;
}

.cmp-error {
  font-size: 12px;
  color: #ef4444;
  margin: 8px 0 0;
}

.cmp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
  margin-top: 20px;
}

.cmp-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  padding: 18px 20px;
}

.cmp-card.mine {
  border-color: var(--accent);
}

.cmp-user {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.cmp-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid var(--card-border);
}

.cmp-user-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cmp-username {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  text-decoration: none;
}

.cmp-username:hover {
  color: var(--accent);
}

.cmp-you {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 8px;
  background: var(--accent-bg, rgba(59, 130, 246, 0.15));
  color: var(--accent);
  font-weight: 700;
}

.cmp-metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 14px;
}

.cmp-metric {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 6px;
  border-radius: 9px;
  background: var(--badge-bg);
  text-align: center;
}

.cmp-metric.win {
  background: rgba(34, 197, 94, 0.14);
}

.metric-num {
  font-size: 13px;
  font-weight: 800;
  color: var(--text-primary);
}

.cmp-metric.win .metric-num {
  color: #22c55e;
}

.metric-key {
  font-size: 10px;
  color: var(--text-tertiary);
}

.cmp-sub {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  margin-bottom: 8px;
}

.cmp-langs,
.cmp-top {
  margin-top: 12px;
}

.lang-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.lang-name {
  width: 84px;
  font-size: 11px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 0;
}

.bar-track {
  flex: 1;
  height: 12px;
  background: var(--bar-track);
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 4px;
}

.lang-pct {
  width: 34px;
  text-align: right;
  font-size: 10px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.top-repo {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  text-decoration: none;
  border-bottom: 1px solid var(--card-border);
}

.top-repo:last-of-type {
  border-bottom: none;
}

.top-repo-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.top-repo:hover .top-repo-name {
  color: var(--accent);
}

.top-repo-meta {
  font-size: 11px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.cmp-none {
  font-size: 12px;
  color: var(--text-tertiary);
}

.overlap-card {
  margin-top: 16px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  padding: 18px 20px;
}

.overlap-head {
  margin-bottom: 12px;
}

.overlap-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
}

.overlap-row {
  padding: 10px 0;
  border-bottom: 1px solid var(--card-border);
}

.overlap-row:last-of-type {
  border-bottom: none;
}

.overlap-row-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 6px;
}

.overlap-pair {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.overlap-num {
  font-size: 12px;
  font-weight: 700;
  color: var(--accent);
  flex-shrink: 0;
}

.overlap-bar-track {
  height: 8px;
  background: var(--bar-track);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.overlap-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), #8b5cf6);
  border-radius: 4px;
  transition: width 0.4s ease;
}

.overlap-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.topic-chip {
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 10px;
  background: var(--badge-bg);
  color: var(--text-secondary);
  text-decoration: none;
}

.topic-chip:hover {
  color: var(--accent);
}
</style>
