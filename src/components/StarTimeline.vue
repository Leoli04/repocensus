<script setup lang="ts">
import type { Repo } from '../engine/types'

const props = defineProps<{ stars: Repo[] }>()

const groups = computed(() => {
  const week: Repo[] = []
  const month: Repo[] = []
  const older: Repo[] = []

  for (const star of props.stars) {
    const days = star.starred_days_ago ?? 999
    if (days <= 7) week.push(star)
    else if (days <= 30) month.push(star)
    else older.push(star)
  }

  return { week, month, older }
})

function formatDays(days: number | null): string {
  if (days === null) return ''
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days} 天前`
  if (days < 30) return `${Math.floor(days / 7)} 周前`
  return `${Math.floor(days / 30)} 个月前`
}
</script>

<script lang="ts">
import { computed } from 'vue'
</script>

<template>
  <div class="star-timeline" v-if="stars.length">
    <h3 class="section-title">🆕 Star 时间线</h3>

    <div v-if="groups.week.length" class="time-group">
      <h4 class="group-title">本周</h4>
      <div class="star-items">
        <a v-for="star in groups.week" :key="star.id" :href="star.html_url" target="_blank" rel="noopener" class="star-item">
          <span class="star-name">{{ star.full_name }}</span>
          <span class="star-meta">{{ formatDays(star.starred_days_ago) }}</span>
        </a>
      </div>
    </div>

    <div v-if="groups.month.length" class="time-group">
      <h4 class="group-title">本月</h4>
      <div class="star-items">
        <a v-for="star in groups.month" :key="star.id" :href="star.html_url" target="_blank" rel="noopener" class="star-item">
          <span class="star-name">{{ star.full_name }}</span>
          <span class="star-meta">{{ formatDays(star.starred_days_ago) }}</span>
        </a>
      </div>
    </div>

    <div v-if="groups.older.length" class="time-group">
      <details>
        <summary class="group-title">更早 ({{ groups.older.length }})</summary>
        <div class="star-items">
          <a v-for="star in groups.older" :key="star.id" :href="star.html_url" target="_blank" rel="noopener" class="star-item">
            <span class="star-name">{{ star.full_name }}</span>
            <span class="star-meta">{{ formatDays(star.starred_days_ago) }}</span>
          </a>
        </div>
      </details>
    </div>
  </div>
</template>

<style scoped>
.star-timeline {
  margin-top: 32px;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 16px;
  color: var(--text-primary);
}

.time-group {
  margin-bottom: 16px;
}

.group-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin: 0 0 8px;
  cursor: pointer;
}

.star-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.star-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  text-decoration: none;
  transition: border-color 0.15s;
}

.star-item:hover {
  border-color: var(--accent);
}

.star-name {
  font-size: 12px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.star-meta {
  font-size: 11px;
  color: var(--text-tertiary);
  flex-shrink: 0;
  margin-left: 12px;
}
</style>
