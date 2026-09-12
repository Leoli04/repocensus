<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CensusData, Repo } from '../engine/types'
import { useI18n } from '../i18n'

const props = defineProps<{ data: CensusData }>()
const { t } = useI18n()

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

const otherName = ref('')
const loading = ref(false)
const error = ref('')
const other = ref<{ username: string; avatar: string; url: string; repos: RawRepo[] } | null>(null)

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

// ── Metric computation shared by both sides ───────────────
interface SideStats {
  username: string
  avatar: string
  url: string
  repoCount: number
  totalStars: number
  activeCount: number
  avgStars: string
  topLangs: { name: string; count: number; pct: number }[]
  topRepos: { name: string; url: string; stars: number; lang: string | null }[]
}

function nowMs(): number {
  return Date.now()
}

function buildStats(
  username: string,
  avatar: string,
  url: string,
  repos: { full_name: string; html_url: string; language: string | null; stargazers_count: number; pushed_at: string; fork?: boolean }[],
  includeForks: boolean
): SideStats {
  const list = includeForks ? repos : repos.filter((r) => !r.fork)
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
    repoCount: list.length,
    totalStars,
    activeCount,
    avgStars: list.length ? (totalStars / list.length).toFixed(1) : '0',
    topLangs,
    topRepos,
  }
}

// My side: original repos from the bundled census data
const myStats = computed<SideStats>(() => {
  const mine: Repo[] = props.data.repos.filter((r) => r.type === 'original')
  return buildStats(props.data.username, props.data.avatar_url, props.data.html_url, mine as any, false)
})

const otherStats = computed<SideStats | null>(() => {
  if (!other.value) return null
  return buildStats(other.value.username, other.value.avatar, other.value.url, other.value.repos as any, true)
})

// ── Star / repo overlap ───────────────────────────────────
const overlap = computed(() => {
  if (!other.value) return null
  const myNames = new Set(props.data.repos.map((r) => r.full_name.toLowerCase()))
  const common = other.value.repos.filter((r) => myNames.has(r.full_name.toLowerCase()))
  const pct = other.value.repos.length ? Math.round((common.length / other.value.repos.length) * 100) : 0
  return { count: common.length, pct, repos: common.slice(0, 12) }
})

// ── Fetch the other user's public repos ───────────────────
async function compare() {
  const name = otherName.value.trim()
  if (!name || loading.value) return
  if (name.toLowerCase() === props.data.username.toLowerCase()) {
    error.value = t('cmp.errSelf')
    return
  }
  loading.value = true
  error.value = ''
  other.value = null
  try {
    const headers: Record<string, string> = { Accept: 'application/vnd.github+json' }
    const token = localStorage.getItem('repocensus:gh-token')
    if (token) headers.Authorization = `Bearer ${token}`

    const uResp = await fetch(`https://api.github.com/users/${encodeURIComponent(name)}`, { headers })
    if (uResp.status === 404) {
      error.value = t('cmp.errNotFound', { name })
      return
    }
    if (uResp.status === 403) {
      error.value = t('cmp.errRate')
      return
    }
    if (!uResp.ok) throw new Error(String(uResp.status))
    const u = await uResp.json()

    const repos: RawRepo[] = []
    for (let page = 1; page <= 2; page++) {
      const rResp = await fetch(
        `https://api.github.com/users/${encodeURIComponent(name)}/repos?per_page=100&type=owner&sort=pushed&page=${page}`,
        { headers }
      )
      if (!rResp.ok) throw new Error(String(rResp.status))
      const batch: RawRepo[] = await rResp.json()
      repos.push(...batch)
      if (batch.length < 100) break
    }

    other.value = { username: u.login, avatar: u.avatar_url, url: u.html_url, repos }
  } catch {
    error.value = t('cmp.errFetch')
  } finally {
    loading.value = false
  }
}

function metricRow(a: number | string, b: number | string): 'a' | 'b' | 'tie' {
  const na = Number(a)
  const nb = Number(b)
  if (isNaN(na) || isNaN(nb) || na === nb) return 'tie'
  return na > nb ? 'a' : 'b'
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

    <!-- Input -->
    <div class="cmp-input-row">
      <input
        v-model="otherName"
        class="cmp-input"
        :placeholder="t('cmp.placeholder')"
        @keyup.enter="compare"
      />
      <button class="cmp-btn" :disabled="loading || !otherName.trim()" @click="compare">
        {{ loading ? '⏳' : t('cmp.go') }}
      </button>
    </div>
    <p class="cmp-hint">{{ t('cmp.hint') }}</p>
    <p v-if="error" class="cmp-error">{{ error }}</p>

    <!-- Results -->
    <template v-if="myStats && otherStats">
      <div class="cmp-grid">
        <div v-for="side in ([myStats, otherStats] as const)" :key="side.username" class="cmp-card" :class="{ mine: side.username === data.username }">
          <div class="cmp-user">
            <img :src="side.avatar" :alt="side.username" class="cmp-avatar" />
            <div class="cmp-user-meta">
              <a :href="side.url" target="_blank" rel="noopener" class="cmp-username">{{ side.username }}</a>
              <span v-if="side.username === data.username" class="cmp-you">{{ t('cmp.you') }}</span>
            </div>
          </div>

          <div class="cmp-metrics">
            <div class="cmp-metric" :class="{ win: metricRow(myStats.repoCount, otherStats.repoCount) === (side.username === data.username ? 'a' : 'b') }">
              <span class="metric-num">{{ side.repoCount }}</span>
              <span class="metric-key">{{ t('cmp.repos') }}</span>
            </div>
            <div class="cmp-metric" :class="{ win: metricRow(myStats.totalStars, otherStats.totalStars) === (side.username === data.username ? 'a' : 'b') }">
              <span class="metric-num">⭐ {{ fmtStars(side.totalStars) }}</span>
              <span class="metric-key">{{ t('cmp.totalStars') }}</span>
            </div>
            <div class="cmp-metric" :class="{ win: metricRow(myStats.activeCount, otherStats.activeCount) === (side.username === data.username ? 'a' : 'b') }">
              <span class="metric-num">🟢 {{ side.activeCount }}</span>
              <span class="metric-key">{{ t('cmp.active') }}</span>
            </div>
            <div class="cmp-metric" :class="{ win: metricRow(myStats.avgStars, otherStats.avgStars) === (side.username === data.username ? 'a' : 'b') }">
              <span class="metric-num">{{ side.avgStars }}</span>
              <span class="metric-key">{{ t('cmp.avgStars') }}</span>
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
      <div v-if="overlap" class="overlap-card">
        <div class="overlap-head">
          <span class="overlap-title">🔗 {{ t('cmp.overlapTitle') }}</span>
          <span class="overlap-num">{{ t('cmp.overlapNum', { n: overlap.count, p: overlap.pct }) }}</span>
        </div>
        <div class="overlap-bar-track">
          <div class="overlap-bar-fill" :style="{ width: overlap.pct + '%' }" />
        </div>
        <div v-if="overlap.repos.length" class="overlap-chips">
          <a v-for="r in overlap.repos" :key="r.full_name" :href="r.html_url" target="_blank" rel="noopener" class="topic-chip">
            {{ r.full_name }}
          </a>
        </div>
        <p v-else class="cmp-none">{{ t('cmp.overlapNone') }}</p>
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

.cmp-input-row {
  display: flex;
  gap: 8px;
  max-width: 420px;
}

.cmp-input {
  flex: 1;
  padding: 9px 14px;
  border-radius: 9px;
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  color: var(--text-primary);
  font-size: 13px;
}

.cmp-input:focus {
  outline: none;
  border-color: var(--accent);
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
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 10px;
}

.overlap-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
}

.overlap-num {
  font-size: 12px;
  font-weight: 700;
  color: var(--accent);
}

.overlap-bar-track {
  height: 10px;
  background: var(--bar-track);
  border-radius: 5px;
  overflow: hidden;
  margin-bottom: 12px;
}

.overlap-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), #8b5cf6);
  border-radius: 5px;
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
