<script setup lang="ts">
import { ref, computed } from 'vue'
import type { TrendingData, TrendingRepo, Repo, CategoryTemplate } from '../engine/types'
import { computeTrending } from '../engine/trending'
import { healthLabel } from '../engine/health'
import { useI18n } from '../i18n'

const props = defineProps<{
  trending: TrendingData
  repos: Repo[]
  template: CategoryTemplate
}>()
const { t, catLabel } = useI18n()

const selectedCategory = ref<string | null>(null)

// Build prev star map from pre-computed trending data so we can recompute
// accurately for the current template + filters at runtime.
const prevStarMap = computed<Map<string, number>>(() => {
  const map = new Map<string, number>()
  for (const tr of props.trending.overall) {
    map.set(tr.repo.full_name, tr.prev_stars)
  }
  for (const group of props.trending.by_category) {
    for (const tr of group.repos) {
      map.set(tr.repo.full_name, tr.prev_stars)
    }
  }
  return map
})

// Live recompute trending from the currently filtered repos.
const liveTrending = computed<TrendingData>(() => {
  return computeTrending(props.repos, prevStarMap.value)
})

const displayRepos = computed<TrendingRepo[]>(() => {
  if (selectedCategory.value) {
    const cat = liveTrending.value.by_category.find((c) => c.category === selectedCategory.value)
    return cat?.repos || []
  }
  return liveTrending.value.overall
})

const categories = computed(() => {
  return liveTrending.value.by_category.map((c) => ({ name: c.category, count: c.repos.length }))
})

function selectCategory(cat: string | null) {
  selectedCategory.value = cat
}

function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta}`
  return `${delta}`
}

function deltaColor(delta: number): string {
  if (delta > 0) return '#22c55e'
  if (delta < 0) return '#ef4444'
  return 'var(--text-tertiary)'
}

function isHot(tr: TrendingRepo): boolean {
  return tr.star_delta >= 10 || tr.star_velocity >= 5
}

function rankIcon(rank: number): string {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return ''
}

function typeIcon(type: string): string {
  if (type === 'original') return '🛠️'
  if (type === 'fork') return '🍴'
  if (type === 'star') return '⭐'
  return ''
}
</script>

<template>
  <div class="trending-board">
    <div class="trending-header">
      <h3 class="board-title">🔥 {{ t('trending.title') }}</h3>
      <span class="board-period">{{ liveTrending.period }}</span>
    </div>

    <!-- No historical data notice -->
    <div v-if="!liveTrending.has_historical" class="notice">
      <span>ℹ️ {{ t('trending.notice') }}</span>
    </div>

    <!-- Category filter pills -->
    <div v-if="categories.length > 1" class="cat-pills">
      <button :class="['pill', { active: !selectedCategory }]" @click="selectCategory(null)">
        {{ t('trending.all', { n: liveTrending.overall.length }) }}
      </button>
      <button
        v-for="cat in categories"
        :key="cat.name"
        :class="['pill', { active: selectedCategory === cat.name }]"
        @click="selectCategory(cat.name)"
      >
        {{ catLabel(cat.name) }} · {{ cat.count }}
      </button>
    </div>

    <!-- Trending list -->
    <div class="trending-list">
      <a
        v-for="(item, idx) in displayRepos"
        :key="item.repo.id"
        :href="item.repo.html_url"
        target="_blank"
        rel="noopener"
        class="trending-item"
        :class="{ hot: isHot(item) }"
      >
        <span class="rank">
          <span v-if="idx < 3" class="rank-medal">{{ rankIcon(idx + 1) }}</span>
          <span v-else class="rank-num">{{ idx + 1 }}</span>
        </span>

        <div class="repo-info">
          <div class="repo-name-row">
            <span class="type-icon">{{ typeIcon(item.repo.type) }}</span>
            <span class="repo-name">{{ item.repo.name }}</span>
            <span v-if="isHot(item)" class="fire-badge">🔥</span>
          </div>
          <span class="repo-desc">{{ item.repo.description || t('repo.noDesc') }}</span>
        </div>

        <div class="metrics">
          <div class="metric delta" :style="{ color: deltaColor(item.star_delta) }">
            <span class="metric-label">Δ</span>
            <span class="metric-value">{{ formatDelta(item.star_delta) }}</span>
          </div>
          <div class="metric">
            <span class="metric-label">{{ t('trending.monthRate') }}</span>
            <span class="metric-value">{{ item.star_velocity }}</span>
          </div>
          <div class="metric">
            <span class="metric-label">⭐</span>
            <span class="metric-value">{{ item.repo.stargazers_count }}</span>
          </div>
          <div class="metric">
            <span
              class="health-dot"
              :style="{ background: healthLabel(item.repo.health_score).color }"
              :title="`${t('repo.healthTitle', { n: item.repo.health_score })}`"
            ></span>
          </div>
        </div>
      </a>
    </div>

    <div v-if="displayRepos.length === 0" class="empty">
      {{ t('trending.noData') }}
    </div>
  </div>
</template>

<style scoped>
.trending-board {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
}

.trending-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.board-title {
  font-size: 20px;
  font-weight: 800;
  margin: 0;
  color: var(--text-primary);
}

.board-period {
  font-size: 12px;
  color: var(--text-tertiary);
  background: var(--badge-bg);
  padding: 2px 10px;
  border-radius: 10px;
}

.notice {
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 8px;
  padding: 10px 14px;
  margin-bottom: 14px;
  font-size: 12px;
  color: var(--text-secondary);
}

.cat-pills {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.pill {
  padding: 4px 12px;
  border-radius: 14px;
  border: 1px solid var(--card-border);
  background: var(--badge-bg);
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.pill:hover {
  border-color: var(--accent);
}

.pill.active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

.trending-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.trending-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 12px;
  border-radius: 10px;
  text-decoration: none;
  transition: background 0.15s;
  border: 1px solid transparent;
}

.trending-item:hover {
  background: var(--badge-bg);
  border-color: var(--card-border);
}

.trending-item.hot {
  background: rgba(239, 68, 68, 0.04);
}

.trending-item.hot:hover {
  background: rgba(239, 68, 68, 0.08);
}

.rank {
  width: 32px;
  text-align: center;
  flex-shrink: 0;
}

.rank-medal {
  font-size: 20px;
}

.rank-num {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-tertiary);
}

.repo-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.repo-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.type-icon {
  font-size: 11px;
}

.repo-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fire-badge {
  font-size: 13px;
}

.repo-desc {
  font-size: 11px;
  color: var(--text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metrics {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-shrink: 0;
}

.metric {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  min-width: 48px;
}

.metric-label {
  font-size: 10px;
  color: var(--text-tertiary);
}

.metric-value {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
}

.metric.delta .metric-value {
  font-size: 14px;
}

.health-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.empty {
  text-align: center;
  padding: 32px;
  color: var(--text-tertiary);
  font-size: 14px;
}

@media (max-width: 768px) {
  .trending-item {
    flex-wrap: wrap;
  }

  .metrics {
    width: 100%;
    justify-content: flex-end;
    gap: 12px;
  }

  .metric {
    min-width: 40px;
  }

  .repo-desc {
    display: none;
  }
}
</style>
