<script setup lang="ts">
import { computed } from 'vue'
import type { ChangeSnapshot } from '../engine/types'
import { computeChange } from '../engine/changeTracker'
import { useI18n } from '../i18n'
import { useRepos } from '../composables/useRepos'

const props = defineProps<{ history?: ChangeSnapshot[] }>()
const { t, locale } = useI18n()
const { data } = useRepos()

const diff = computed(() => computeChange(props.history))

// Lookup the live html_url (fall back to the snapshot's captured url)
const urlMap = computed(() => {
  const m: Record<string, string> = {}
  for (const r of data.value.repos) m[r.full_name] = r.html_url
  return m
})
function repoUrl(n: string): string {
  return urlMap.value[n] || diff.value?.to.urls[n] || '#'
}

function fmtDate(iso: string): string {
  const loc = locale.value === 'zh' ? 'zh-CN' : 'en-US'
  return new Date(iso).toLocaleString(loc, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Compared-snapshot label (object-literal interpolation breaks the Vue parser, so precompute it)
const changeFromLabel = computed(() => {
  const d = diff.value
  if (!d) return ''
  return t('change.from', { a: fmtDate(d.from.generated_at), b: fmtDate(d.to.generated_at) })
})

const hasChanges = computed(() => {
  const d = diff.value
  if (!d) return false
  return d.added.length > 0 || d.removed.length > 0 || d.starUp.length > 0 || d.starDown.length > 0
})
</script>

<template>
  <section class="change-tracker">
    <h3 class="section-title">{{ t('change.title') }}</h3>
    <p class="section-subtitle">{{ t('change.subtitle') }}</p>

    <div v-if="!diff" class="empty-state">
      {{ t('change.noHistory') }}
    </div>

    <template v-else>
      <p class="change-meta">{{ changeFromLabel }}</p>

      <!-- Metric chips -->
      <div class="change-metrics">
        <div class="metric added">
          <span class="metric-value">+{{ diff.added.length }}</span>
          <span class="metric-label">{{ t('change.added') }}</span>
        </div>
        <div class="metric removed">
          <span class="metric-value">-{{ diff.removed.length }}</span>
          <span class="metric-label">{{ t('change.removed') }}</span>
        </div>
        <div class="metric up">
          <span class="metric-value">▲ {{ diff.starUp.length }}</span>
          <span class="metric-label">{{ t('change.starUp') }}</span>
        </div>
        <div class="metric down">
          <span class="metric-value">▼ {{ diff.starDown.length }}</span>
          <span class="metric-label">{{ t('change.starDown') }}</span>
        </div>
      </div>

      <div v-if="!hasChanges" class="empty-state">{{ t('change.none') }}</div>

      <template v-else>
        <!-- Added -->
        <div v-if="diff.added.length" class="change-block">
          <h4 class="block-title added">＋ {{ t('change.added') }}</h4>
          <ul class="change-list">
            <li v-for="r in diff.added" :key="r.full_name">
              <a :href="repoUrl(r.full_name)" target="_blank" rel="noopener">{{ r.full_name }}</a>
              <span class="stars">⭐ {{ r.stars }}</span>
            </li>
          </ul>
        </div>

        <!-- Removed -->
        <div v-if="diff.removed.length" class="change-block">
          <h4 class="block-title removed">－ {{ t('change.removed') }}</h4>
          <ul class="change-list">
            <li v-for="r in diff.removed" :key="r.full_name">
              <span class="removed-name">{{ r.full_name }}</span>
              <span class="stars">⭐ {{ r.stars }}</span>
            </li>
          </ul>
        </div>

        <!-- Star gains -->
        <div v-if="diff.starUp.length" class="change-block">
          <h4 class="block-title up">▲ {{ t('change.starUp') }}</h4>
          <ul class="change-list">
            <li v-for="r in diff.starUp" :key="r.full_name">
              <a :href="repoUrl(r.full_name)" target="_blank" rel="noopener">{{ r.full_name }}</a>
              <span class="delta up">+{{ r.delta }} <span class="muted">({{ r.from }} → {{ r.to }})</span></span>
            </li>
          </ul>
        </div>

        <!-- Star losses -->
        <div v-if="diff.starDown.length" class="change-block">
          <h4 class="block-title down">▼ {{ t('change.starDown') }}</h4>
          <ul class="change-list">
            <li v-for="r in diff.starDown" :key="r.full_name">
              <a :href="repoUrl(r.full_name)" target="_blank" rel="noopener">{{ r.full_name }}</a>
              <span class="delta down">{{ r.delta }} <span class="muted">({{ r.from }} → {{ r.to }})</span></span>
            </li>
          </ul>
        </div>
      </template>
    </template>
  </section>
</template>

<style scoped>
.change-tracker {
  margin-top: 32px;
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

.change-meta {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0 0 16px;
}

.change-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
  margin-bottom: 20px;
}

.metric {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.metric-value {
  font-size: 22px;
  font-weight: 800;
}

.metric-label {
  font-size: 11px;
  color: var(--text-secondary);
}

.metric.added .metric-value {
  color: #22c55e;
}
.metric.removed .metric-value {
  color: #ef4444;
}
.metric.up .metric-value {
  color: #f59e0b;
}
.metric.down .metric-value {
  color: #3b82f6;
}

.change-block {
  margin-bottom: 18px;
}

.block-title {
  font-size: 14px;
  font-weight: 700;
  margin: 0 0 8px;
}
.block-title.added {
  color: #22c55e;
}
.block-title.removed {
  color: #ef4444;
}
.block-title.up {
  color: #f59e0b;
}
.block-title.down {
  color: #3b82f6;
}

.change-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.change-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 14px;
  border-radius: 8px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  font-size: 13px;
}

.change-list a {
  color: var(--text-primary);
  text-decoration: none;
  font-weight: 600;
}
.change-list a:hover {
  color: var(--accent);
  text-decoration: underline;
}

.removed-name {
  color: var(--text-secondary);
  font-weight: 600;
}

.stars {
  color: var(--text-tertiary);
  font-size: 12px;
  white-space: nowrap;
}

.delta {
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}
.delta.up {
  color: #f59e0b;
}
.delta.down {
  color: #3b82f6;
}
.delta .muted {
  color: var(--text-tertiary);
  font-weight: 400;
}

.empty-state {
  text-align: center;
  padding: 32px;
  color: var(--text-tertiary);
  font-size: 14px;
  background: var(--card-bg);
  border: 1px dashed var(--card-border);
  border-radius: 12px;
}

@media (max-width: 768px) {
  .change-metrics {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
