<script setup lang="ts">
import type { TechProfile } from '../engine/types'

const props = defineProps<{ profile: TechProfile }>()

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
  MDX: '#fcb32c',
}

const maxLangCount = computed(() => Math.max(...props.profile.languages.map((l) => l.count), 1))

const activityTotal = computed(() =>
  props.profile.activity.active + props.profile.activity.silent + props.profile.activity.archived
)
</script>

<script lang="ts">
import { computed } from 'vue'
</script>

<template>
  <div class="tech-profile">
    <h3 class="section-title">技术画像</h3>

    <div class="profile-grid">
      <!-- Language Distribution -->
      <div class="profile-card">
        <h4 class="card-title">语言分布</h4>
        <div class="lang-bars">
          <div v-for="lang in profile.languages.slice(0, 8)" :key="lang.name" class="lang-bar">
            <span class="lang-name">{{ lang.name }}</span>
            <div class="bar-track">
              <div
                class="bar-fill"
                :style="{
                  width: (lang.count / maxLangCount) * 100 + '%',
                  background: langColors[lang.name] || '#888',
                }"
              />
            </div>
            <span class="lang-count">{{ lang.count }}</span>
          </div>
        </div>
      </div>

      <!-- Domain Distribution -->
      <div class="profile-card">
        <h4 class="card-title">领域分布</h4>
        <div class="domain-list">
          <div v-for="domain in profile.domains.slice(0, 8)" :key="domain.name" class="domain-item">
            <span class="domain-name">{{ domain.name }}</span>
            <span class="domain-count">{{ domain.count }}</span>
          </div>
        </div>
      </div>

      <!-- Activity & Stars -->
      <div class="profile-card">
        <h4 class="card-title">活跃度 & Star</h4>
        <div class="activity-bar">
          <div
            class="activity-seg active"
            :style="{ width: (activityTotal ? (profile.activity.active / activityTotal) * 100 : 0) + '%' }"
            :title="`活跃: ${profile.activity.active}`"
          />
          <div
            class="activity-seg silent"
            :style="{ width: (activityTotal ? (profile.activity.silent / activityTotal) * 100 : 0) + '%' }"
            :title="`沉默: ${profile.activity.silent}`"
          />
          <div
            class="activity-seg archived"
            :style="{ width: (activityTotal ? (profile.activity.archived / activityTotal) * 100 : 0) + '%' }"
            :title="`归档: ${profile.activity.archived}`"
          />
        </div>
        <div class="activity-legend">
          <span><i class="dot active"></i>活跃 {{ profile.activity.active }}</span>
          <span><i class="dot silent"></i>沉默 {{ profile.activity.silent }}</span>
          <span><i class="dot archived"></i>归档 {{ profile.activity.archived }}</span>
        </div>
        <div class="star-stats">
          <div class="star-stat">
            <span class="star-num">{{ profile.total_stars_received }}</span>
            <span class="star-label">收到 Star</span>
          </div>
          <div class="star-stat">
            <span class="star-num">{{ profile.total_stars_given }}</span>
            <span class="star-label">给出 Star</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tech-profile {
  margin-top: 32px;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 16px;
  color: var(--text-primary);
}

.profile-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.profile-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  padding: 20px;
}

.card-title {
  font-size: 13px;
  font-weight: 600;
  margin: 0 0 14px;
  color: var(--text-secondary);
}

.lang-bars {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.lang-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.lang-name {
  width: 90px;
  font-size: 11px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 0;
}

.bar-track {
  flex: 1;
  height: 16px;
  background: var(--bar-track);
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s ease;
  min-width: 4px;
}

.lang-count {
  width: 24px;
  text-align: right;
  font-size: 11px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.domain-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.domain-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  border-bottom: 1px solid var(--card-border);
}

.domain-name {
  font-size: 12px;
  color: var(--text-primary);
}

.domain-count {
  font-size: 13px;
  font-weight: 700;
  color: var(--accent);
}

.activity-bar {
  display: flex;
  height: 24px;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 10px;
}

.activity-seg {
  height: 100%;
  transition: width 0.4s ease;
}

.activity-seg.active { background: #22c55e; }
.activity-seg.silent { background: #f59e0b; }
.activity-seg.archived { background: #ef4444; }

.activity-legend {
  display: flex;
  gap: 14px;
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 4px;
  vertical-align: middle;
}

.dot.active { background: #22c55e; }
.dot.silent { background: #f59e0b; }
.dot.archived { background: #ef4444; }

.star-stats {
  display: flex;
  gap: 24px;
}

.star-stat {
  display: flex;
  flex-direction: column;
}

.star-num {
  font-size: 22px;
  font-weight: 800;
  color: var(--accent);
}

.star-label {
  font-size: 11px;
  color: var(--text-tertiary);
}
</style>
