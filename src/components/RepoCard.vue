<script setup lang="ts">
import { computed } from 'vue'
import type { Repo } from '../engine/types'
import { healthLabel } from '../engine/health'
import { daysSince } from '../engine/categorizer'

const props = defineProps<{ repo: Repo; showCategory?: boolean }>()

const typeIcon: Record<string, string> = {
  original: '🛠️',
  fork: '🍴',
  star: '⭐',
}

const typeLabel: Record<string, string> = {
  original: '自建',
  fork: 'Fork',
  star: 'Star',
}

function formatStars(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

function formatUpdate(dateStr: string): string {
  const days = daysSince(dateStr)
  if (days <= 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 30) return `${days} 天前`
  if (days < 365) return `${Math.floor(days / 30)} 个月前`
  return `${Math.floor(days / 365)} 年前`
}

const health = computed(() => healthLabel(props.repo.health_score))
const updateColor = computed(() => {
  const days = daysSince(props.repo.updated_at)
  if (days <= 180) return '#22c55e'
  if (days <= 730) return '#f59e0b'
  return '#ef4444'
})
</script>

<template>
  <a :href="repo.html_url" target="_blank" rel="noopener" class="repo-card">
    <!-- Health bar at top -->
    <div class="health-bar" :style="{ background: health.color }" />

    <div class="card-body">
      <div class="card-header">
        <span class="type-icon" :title="typeLabel[repo.type]">{{ typeIcon[repo.type] }}</span>
        <span class="repo-name">{{ repo.name }}</span>
        <span v-if="repo.is_new" class="new-badge">NEW</span>
      </div>

      <p class="repo-desc">{{ repo.description || 'No description' }}</p>

      <div class="card-meta">
        <div class="badges">
          <span v-if="showCategory && repo.category" class="badge cat-badge">{{ repo.category }}</span>
          <span v-if="repo.language" class="badge lang-badge">{{ repo.language }}</span>
          <span class="badge star-badge">⭐ {{ formatStars(repo.stargazers_count) }}</span>
        </div>
        <div class="meta-row">
          <span class="health-score" :style="{ color: health.color }" :title="`健康分: ${repo.health_score}/100`">
            {{ health.label }} {{ repo.health_score }}
          </span>
          <span class="update-time" :style="{ color: updateColor }">
            📅 {{ formatUpdate(repo.updated_at) }}
          </span>
        </div>
        <span v-if="repo.fork && repo.parent_full_name" class="fork-source">
          ← {{ repo.parent_full_name }}
        </span>
      </div>
    </div>
  </a>
</template>

<style scoped>
.repo-card {
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  text-decoration: none;
  color: var(--text-primary);
  transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
  overflow: hidden;
}

.repo-card:hover {
  transform: translateY(-2px);
  border-color: var(--accent);
  box-shadow: 0 4px 20px var(--shadow-color);
}

.health-bar {
  height: 3px;
  width: 100%;
}

.card-body {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.type-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.repo-name {
  font-weight: 600;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.new-badge {
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  background: #22c55e;
  color: #fff;
  flex-shrink: 0;
  margin-left: auto;
}

.repo-desc {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
  margin: 0;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
}

.badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--badge-bg);
  color: var(--text-secondary);
  white-space: nowrap;
}

.cat-badge {
  background: var(--accent-bg);
  color: var(--accent);
  font-weight: 500;
}

.lang-badge {
  background: var(--lang-bg);
  color: var(--lang-text);
}

.meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.health-score {
  font-size: 11px;
  font-weight: 600;
}

.update-time {
  font-size: 11px;
}

.fork-source {
  font-size: 10px;
  color: var(--text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
