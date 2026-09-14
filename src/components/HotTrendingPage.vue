<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from '../i18n'
import { useHotTrending } from '../composables/useHotTrending'
import { sortHotRows, type HotSort } from '../engine/hotSort'
import type { HotPeriod } from '../engine/types'

const { t, locale } = useI18n()
const { boards, findBoard, languagesFor, meta, updatedAt, isStale } = useHotTrending()

const emit = defineEmits<{ (e: 'close'): void }>()

// ── Route: #/trending ─────────────────────────────────────
const open = ref(false)

function parseHash(): boolean {
  return location.hash.replace(/^#\/?/, '') === 'trending'
}

function syncFromHash() {
  open.value = parseHash()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && open.value) close()
}

onMounted(() => {
  syncFromHash()
  window.addEventListener('hashchange', syncFromHash)
  window.addEventListener('keydown', onKeydown)
})
onUnmounted(() => {
  window.removeEventListener('hashchange', syncFromHash)
  window.removeEventListener('keydown', onKeydown)
})

function close() {
  if (location.hash.startsWith('#/trending')) {
    history.replaceState(null, '', location.pathname + location.search)
  }
  open.value = false
  emit('close')
  window.scrollTo({ top: 0, behavior: 'auto' })
}

// ── Filters ───────────────────────────────────────────────
const period = ref<HotPeriod>('daily')
const language = ref<string>('')

const periods = computed<{ id: HotPeriod; label: string }[]>(() => [
  { id: 'daily', label: t('hot.periodDaily') },
  { id: 'weekly', label: t('hot.periodWeekly') },
  { id: 'monthly', label: t('hot.periodMonthly') },
])

const periodsInData = computed(() => new Set(boards.value.map((b) => b.period)))

/** Language buttons for the active period — see languagesFor() for why scoped */
const languageOptions = computed(() => languagesFor(period.value))

// ── Sorting ───────────────────────────────────────────────
// Default to stars gained in the period. GitHub's own order is an internal
// trending score rather than a star ranking, so its #1 often shows fewer stars
// than its #2 — see engine/hotSort.ts for the full explanation.
const sort = ref<HotSort>('period')

const sortOptions = computed<{ id: HotSort; label: string }[]>(() => [
  { id: 'period', label: t('hot.sortPeriod') },
  { id: 'stars', label: t('hot.sortStars') },
  { id: 'velocity', label: t('hot.sortVelocity') },
  { id: 'official', label: t('hot.sortOfficial') },
])

const board = computed(() => findBoard(period.value, language.value))
const rows = computed(() => sortHotRows(board.value?.items || [], meta, sort.value))
const dropped = computed(() => board.value?.dropped || [])

/** Keep the selected language valid when the data changes */
const currentLanguage = computed(() => (board.value ? language.value : ''))

// Switching period can leave the selection without a board — fall back to "all"
// rather than rendering an empty list.
watch(languageOptions, (options) => {
  if (!options.some((o) => o.id === language.value)) language.value = ''
})

// ── Summary ───────────────────────────────────────────────
const newCount = computed(
  () => rows.value.filter((r) => r.item.prev_rank === null).length
)
const streakCount = computed(
  () => rows.value.filter((r) => r.item.days_on_board >= 3).length
)

// ── Formatting ────────────────────────────────────────────
const numLocale = computed(() => (locale.value === 'zh' ? 'zh-CN' : 'en-US'))

function fmt(n: number): string {
  return n.toLocaleString(numLocale.value)
}

const updatedDate = computed(() => {
  const ts = updatedAt.value
  if (!ts) return ''
  return new Date(ts).toLocaleString(numLocale.value, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
})

const periodUnit = computed(
  () =>
    ({
      daily: t('hot.unitDaily'),
      weekly: t('hot.unitWeekly'),
      monthly: t('hot.unitMonthly'),
    }) as Record<HotPeriod, string>
)

function langLabel(id: string, label: string): string {
  return id === '' ? t('hot.all') : label
}
</script>

<template>
  <div v-if="open" class="hot-page">
    <!-- Top bar -->
    <header class="hot-header">
      <button class="back-btn" @click="close">← {{ t('all.back') }}</button>
      <div class="title-wrap">
        <h2 class="title">🌍 {{ t('hot.title') }}</h2>
        <span class="meta">
          <template v-if="updatedDate">{{ t('hot.updated', { date: updatedDate }) }} · </template>{{ t('hot.subtitle') }}
        </span>
      </div>
      <a
        class="gh-link"
        href="https://github.com/trending"
        target="_blank"
        rel="noopener"
      >github.com/trending ↗</a>
      <span class="esc-hint">Esc</span>
    </header>

    <div class="hot-body">
      <!-- Stale warning -->
      <div v-if="isStale" class="notice stale-notice">⚠️ {{ t('hot.stale') }}</div>

      <!-- Controls -->
      <div v-if="boards.length" class="controls">
        <div class="period-switch">
          <button
            v-for="p in periods"
            :key="p.id"
            :class="['period-btn', { active: period === p.id }]"
            :disabled="!periodsInData.has(p.id)"
            @click="period = p.id"
          >
            {{ p.label }}
          </button>
        </div>

        <div class="lang-switch">
          <button
            v-for="l in languageOptions"
            :key="l.id || 'all'"
            :class="['lang-btn', { active: currentLanguage === l.id }]"
            @click="language = l.id"
          >
            {{ langLabel(l.id, l.label) }}
          </button>
        </div>
      </div>

      <!-- Sort -->
      <div v-if="boards.length" class="sort-row">
        <span class="sort-label">{{ t('hot.sortBy') }}</span>
        <div class="sort-switch">
          <button
            v-for="s in sortOptions"
            :key="s.id"
            :class="['sort-btn', { active: sort === s.id }]"
            @click="sort = s.id"
          >
            {{ s.label }}
          </button>
        </div>
      </div>

      <!-- Summary -->
      <div v-if="rows.length" class="summary">
        <span class="sum-item">{{ t('hot.repoCount', { n: rows.length }) }}</span>
        <span class="sum-item up">{{ t('hot.newCount', { n: newCount }) }}</span>
        <span class="sum-item down">{{ t('hot.droppedCount', { n: dropped.length }) }}</span>
        <span class="sum-item streak">{{ t('hot.streakCount', { n: streakCount }) }}</span>
        <span v-if="board?.source === 'search'" class="sum-item warn">{{ t('hot.sourceSearch') }}</span>
      </div>

      <!-- Empty -->
      <div v-if="!rows.length" class="empty">{{ t('hot.empty') }}</div>

      <!-- List -->
      <ol v-else class="hot-list">
        <li v-for="row in rows" :key="row.item.full_name">
          <a class="hot-row" :href="row.meta?.html_url || `https://github.com/${row.item.full_name}`" target="_blank" rel="noopener">
            <span :class="['rank', { top1: row.item.rank === 1, top3: row.item.rank <= 3 }]">
              {{ row.item.rank }}
            </span>

            <img
              v-if="row.meta?.owner_avatar"
              class="avatar"
              :src="row.meta.owner_avatar"
              :alt="row.item.full_name"
              loading="lazy"
            />

            <div class="main">
              <div class="name-line">
                <span class="fullname">{{ row.item.full_name }}</span>
                <span v-if="row.meta?.language" class="lang-chip">{{ row.meta.language }}</span>
                <span v-if="row.item.days_on_board >= 3" class="streak-chip">
                  🔥 {{ t('hot.daysOnBoard', { n: row.item.days_on_board }) }}
                </span>
                <span v-if="sort !== 'official'" class="official-chip">
                  {{ t('hot.officialRank', { n: row.official }) }}
                </span>
              </div>
              <p v-if="row.meta?.description" class="desc">{{ row.meta.description }}</p>
              <div class="metrics">
                <span class="metric">⭐ {{ fmt(row.meta?.stars || 0) }}</span>
                <span v-if="row.item.stars_period" class="metric hot">
                  +{{ fmt(row.item.stars_period) }} {{ periodUnit[board?.period || 'daily'] }}
                </span>
                <span class="metric">
                  <svg class="metric-ico" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
                    <path fill="currentColor" d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z"></path>
                  </svg>
                  {{ fmt(row.meta?.forks || 0) }}
                </span>
              </div>
            </div>

            <div class="badges">
              <span v-if="row.item.rank_delta === null" class="delta new">{{ t('hot.newEntry') }}</span>
              <span v-else-if="row.item.rank_delta > 0" class="delta up">▲ {{ row.item.rank_delta }}</span>
              <span v-else-if="row.item.rank_delta < 0" class="delta down">▼ {{ -row.item.rank_delta }}</span>
              <span v-else class="delta flat">—</span>
            </div>
          </a>
        </li>
      </ol>

      <!-- Dropped off the board since last update -->
      <section v-if="dropped.length" class="dropped-section">
        <h3 class="dropped-title">{{ t('hot.droppedTitle') }}</h3>
        <div class="dropped-list">
          <a
            v-for="d in dropped"
            :key="d.full_name"
            class="dropped-item"
            :href="`https://github.com/${d.full_name}`"
            target="_blank"
            rel="noopener"
          >
            <span class="dropped-name">{{ d.full_name }}</span>
            <span class="dropped-rank">#{{ d.prev_rank }} → —</span>
          </a>
        </div>
      </section>

      <p class="footnote">{{ t('hot.footnote') }}</p>
    </div>
  </div>
</template>

<style scoped>
.hot-page {
  position: fixed;
  inset: 0;
  z-index: 800;
  background: var(--bg);
  overflow-y: auto;
  animation: page-in 0.2s ease;
}

@keyframes page-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.hot-header {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 24px;
  background: var(--bg);
  border-bottom: 1px solid var(--card-border);
}

.back-btn {
  padding: 8px 16px;
  border-radius: 9px;
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
}

.back-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.title-wrap {
  flex: 1;
  min-width: 0;
}

.title {
  font-size: 17px;
  font-weight: 800;
  margin: 0;
  color: var(--text-primary);
}

.meta {
  font-size: 11px;
  color: var(--text-tertiary);
}

.gh-link {
  font-size: 12px;
  color: var(--accent);
  text-decoration: none;
  flex-shrink: 0;
}

.gh-link:hover {
  text-decoration: underline;
}

.esc-hint {
  font-size: 10px;
  color: var(--text-tertiary);
  border: 1px solid var(--card-border);
  border-radius: 5px;
  padding: 2px 6px;
  flex-shrink: 0;
}

.hot-body {
  max-width: 960px;
  margin: 0 auto;
  padding: 20px 24px 64px;
}

.notice {
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 12px;
  line-height: 1.6;
  margin-bottom: 14px;
}

.stale-notice {
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.4);
  color: var(--text-primary);
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.period-switch {
  display: flex;
  gap: 4px;
}

.period-btn {
  padding: 6px 16px;
  border-radius: 8px;
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.period-btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--text-primary);
}

.period-btn.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
  font-weight: 600;
}

.period-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.lang-switch {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.lang-btn {
  padding: 4px 10px;
  border-radius: 20px;
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.lang-btn:hover {
  border-color: var(--accent);
}

.lang-btn.active {
  background: var(--accent-bg);
  border-color: var(--accent);
  color: var(--accent);
  font-weight: 600;
}

.sort-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.sort-label {
  font-size: 12px;
  color: var(--text-tertiary);
}

.sort-switch {
  display: flex;
  gap: 4px;
}

.sort-btn {
  padding: 4px 12px;
  border-radius: 8px;
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.sort-btn:hover {
  border-color: var(--accent);
}

.sort-btn.active {
  background: var(--accent-bg);
  border-color: var(--accent);
  color: var(--accent);
  font-weight: 600;
}

.summary {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  font-size: 12px;
  margin-bottom: 16px;
}

.sum-item {
  color: var(--text-secondary);
}

.sum-item.up {
  color: #10b981;
}

.sum-item.down {
  color: #f59e0b;
}

.sum-item.streak {
  color: #ef4444;
}

.sum-item.warn {
  color: var(--text-tertiary);
  font-style: italic;
}

.empty {
  text-align: center;
  padding: 64px 24px;
  color: var(--text-tertiary);
  font-size: 14px;
}

.hot-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hot-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  text-decoration: none;
  transition: border-color 0.15s, transform 0.15s;
}

.hot-row:hover {
  border-color: var(--accent);
  transform: translateX(2px);
}

.rank {
  flex-shrink: 0;
  width: 28px;
  text-align: center;
  font-size: 15px;
  font-weight: 800;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
}

.rank.top3 {
  color: var(--text-secondary);
}

.rank.top1 {
  color: #f59e0b;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  flex-shrink: 0;
  border: 1px solid var(--card-border);
}

.main {
  flex: 1;
  min-width: 0;
}

.name-line {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.fullname {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  word-break: break-all;
}

.lang-chip {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 10px;
  background: var(--lang-bg);
  color: var(--lang-text);
}

.streak-chip {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 10px;
  background: rgba(239, 68, 68, 0.14);
  color: #ef4444;
}

.desc {
  margin: 3px 0 0;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 5px;
  font-size: 12px;
  color: var(--text-tertiary);
}

.metric.hot {
  color: #ef4444;
  font-weight: 600;
}

/* Inline octicon — the 🍴 emoji is missing from many Windows emoji fonts and
   renders as a tofu box, so the fork count uses an SVG instead. */
.metric-ico {
  vertical-align: -1px;
  opacity: 0.7;
}

.official-chip {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 10px;
  background: var(--accent-bg);
  color: var(--accent);
  border: 1px solid var(--card-border);
  white-space: nowrap;
}

.badges {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}

.delta {
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.delta.up {
  color: #10b981;
}

.delta.down {
  color: #f59e0b;
}

.delta.flat {
  color: var(--text-tertiary);
}

.delta.new {
  font-size: 10px;
  padding: 1px 7px;
  border-radius: 10px;
  background: var(--accent-bg);
  color: var(--accent);
}

.dropped-section {
  margin-top: 28px;
}

.dropped-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-secondary);
  margin: 0 0 10px;
}

.dropped-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.dropped-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 8px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  text-decoration: none;
  font-size: 12px;
}

.dropped-item:hover {
  border-color: #f59e0b;
}

.dropped-name {
  color: var(--text-secondary);
}

.dropped-rank {
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
}

.footnote {
  margin-top: 28px;
  font-size: 11px;
  color: var(--text-tertiary);
  line-height: 1.7;
}

@media (max-width: 768px) {
  .hot-body {
    padding: 16px 14px 48px;
  }

  .hot-header {
    padding: 12px 14px;
    gap: 10px;
  }

  .gh-link,
  .esc-hint {
    display: none;
  }

  .desc {
    -webkit-line-clamp: 3;
  }
}
</style>
