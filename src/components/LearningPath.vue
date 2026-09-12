<script setup lang="ts">
import { computed } from 'vue'
import type { Repo } from '../engine/types'
import { useI18n } from '../i18n'

const props = defineProps<{ repos: Repo[] }>()
const { t } = useI18n()

type Tier = 'starter' | 'mid' | 'advanced'

interface TierItem {
  name: string
  url: string
  language: string | null
  stars: number
  desc: string | null
}

function classify(r: Repo): Tier {
  if (r.stargazers_count >= 10 || r.health_score >= 75) return 'advanced'
  if (r.stargazers_count >= 3 || r.health_score >= 50) return 'mid'
  return 'starter'
}

function toItem(r: Repo): TierItem {
  return {
    name: r.name,
    url: r.html_url,
    language: r.language,
    stars: r.stargazers_count,
    desc: r.description,
  }
}

const tiers = computed<{ key: Tier; title: string; hint: string; items: TierItem[] }[]>(() => {
  const originals = props.repos.filter((r) => r.type === 'original')
  const buckets: Record<Tier, TierItem[]> = { starter: [], mid: [], advanced: [] }
  for (const r of originals) buckets[classify(r)].push(toItem(r))
  const sortDesc = (a: TierItem, b: TierItem) => b.stars - a.stars
  buckets.advanced.sort(sortDesc)
  buckets.mid.sort(sortDesc)
  buckets.starter.sort((a, b) => a.name.localeCompare(b.name))
  return [
    { key: 'starter', title: t('learn.starter'), hint: t('learn.starterHint'), items: buckets.starter },
    { key: 'mid', title: t('learn.mid'), hint: t('learn.midHint'), items: buckets.mid },
    { key: 'advanced', title: t('learn.advanced'), hint: t('learn.advancedHint'), items: buckets.advanced },
  ]
})
</script>

<template>
  <section class="learning-path">
    <h3 class="section-title">🎓 {{ t('learn.title') }}</h3>
    <p class="section-subtitle">{{ t('learn.subtitle') }}</p>

    <div class="path-grid">
      <div v-for="tier in tiers" :key="tier.key" class="path-col" :class="`col-${tier.key}`">
        <div class="path-head">
          <span class="path-title">
            <span v-if="tier.key === 'starter'" class="path-arrow">①</span>
            <span v-else-if="tier.key === 'mid'" class="path-arrow">②</span>
            <span v-else class="path-arrow">③</span>
            {{ tier.title }}
          </span>
          <span class="path-count">{{ tier.items.length }}</span>
        </div>
        <p class="path-hint">{{ tier.hint }}</p>

        <div class="path-list">
          <a v-for="item in tier.items" :key="item.name" :href="item.url" target="_blank" rel="noopener" class="path-item">
            <span class="item-name">{{ item.name }}</span>
            <span class="item-meta">{{ item.language || '—' }} · ⭐ {{ item.stars }}</span>
            <span v-if="item.desc" class="item-desc">{{ item.desc }}</span>
          </a>
          <span v-if="!tier.items.length" class="path-empty">{{ t('common.noData') }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.learning-path {
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

.path-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.path-col {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  padding: 16px 18px;
}

.col-starter {
  border-top: 3px solid #22c55e;
}

.col-mid {
  border-top: 3px solid #f59e0b;
}

.col-advanced {
  border-top: 3px solid var(--accent);
}

.path-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.path-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.path-arrow {
  margin-right: 2px;
}

.path-count {
  font-size: 12px;
  font-weight: 800;
  color: var(--accent);
  background: var(--badge-bg);
  border-radius: 10px;
  padding: 1px 10px;
}

.path-hint {
  font-size: 11px;
  color: var(--text-tertiary);
  margin: 6px 0 12px;
}

.path-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.path-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border-radius: 9px;
  background: var(--badge-bg);
  text-decoration: none;
  transition: background 0.15s;
}

.path-item:hover {
  background: var(--accent-bg, rgba(59, 130, 246, 0.12));
}

.item-name {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.path-item:hover .item-name {
  color: var(--accent);
}

.item-meta {
  font-size: 10px;
  color: var(--text-tertiary);
}

.item-desc {
  font-size: 11px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.path-empty {
  font-size: 12px;
  color: var(--text-tertiary);
}
</style>
