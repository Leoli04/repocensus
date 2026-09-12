<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import type { Repo } from '../engine/types'
import { useI18n } from '../i18n'
import { useRepoMeta } from '../composables/useRepoMeta'
import { daysSince } from '../engine/categorizer'
import { healthLabel } from '../engine/health'

const props = defineProps<{ repo: Repo | null }>()
const emit = defineEmits<{ close: [] }>()

const { t, catLabel, locale } = useI18n()
const { getMeta } = useRepoMeta()

const meta = computed(() => (props.repo ? getMeta(props.repo.id) : { note: '', tags: [] }))

const typeIcon: Record<string, string> = { original: '🛠️', fork: '🍴', star: '⭐' }

function typeText(type: string): string {
  if (type === 'original') return t('repo.typeOriginal')
  if (type === 'fork') return t('repo.typeFork')
  return t('repo.typeStar')
}

function fmtDate(iso: string): string {
  const loc = locale.value === 'zh' ? 'zh-CN' : 'en-US'
  return new Date(iso).toLocaleDateString(loc, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function fmtAgo(iso: string): string {
  const days = daysSince(iso)
  if (days <= 0) return t('star.today')
  if (days === 1) return t('star.yesterday')
  if (days < 30) return t('star.daysAgo', { n: days })
  if (days < 365) return t('star.monthsAgo', { n: Math.floor(days / 30) })
  return t('star.yearsAgo', { n: Math.floor(days / 365) })
}

function formatStars(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

const health = computed(() => {
  if (!props.repo) return { color: '#6e7681' }
  const hl = healthLabel(props.repo.health_score)
  const labelKey =
    props.repo.health_score >= 70
      ? 'repo.healthHealthy'
      : props.repo.health_score >= 40
        ? 'repo.healthFair'
        : 'repo.healthRisk'
  return { ...hl, label: t(labelKey) }
})

// Close on ESC
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

// Lock body scroll while open
watch(
  () => props.repo,
  (v) => {
    document.body.style.overflow = v ? 'hidden' : ''
  },
  { immediate: true }
)
</script>

<template>
  <Teleport to="body">
    <Transition name="panel">
      <div v-if="repo" class="detail-overlay" @click.self="emit('close')">
        <aside class="detail-panel">
          <!-- Header -->
          <div class="panel-head">
            <span class="panel-type" :title="typeText(repo.type)">{{ typeIcon[repo.type] }}</span>
            <div class="panel-title-wrap">
              <h3 class="panel-title">{{ repo.name }}</h3>
              <span class="panel-fullname">{{ repo.full_name }}</span>
            </div>
            <button class="panel-close" @click="emit('close')">✕</button>
          </div>

          <div class="panel-body">
            <!-- Description -->
            <p class="panel-desc">{{ repo.description || t('repo.noDesc') }}</p>

            <!-- Action buttons -->
            <div class="panel-actions">
              <a :href="repo.html_url" target="_blank" rel="noopener" class="action-btn primary">
                ⓘ GitHub
              </a>
              <a
                v-if="repo.homepage"
                :href="repo.homepage"
                target="_blank"
                rel="noopener"
                class="action-btn"
              >
                🌐 {{ t('detail.homepage') }}
              </a>
            </div>

            <!-- Stats grid -->
            <div class="stat-grid">
              <div class="stat-cell">
                <span class="stat-num">⭐ {{ formatStars(repo.stargazers_count) }}</span>
                <span class="stat-key">Stars</span>
              </div>
              <div class="stat-cell">
                <span class="stat-num">🍴 {{ formatStars(repo.forks_count) }}</span>
                <span class="stat-key">Forks</span>
              </div>
              <div class="stat-cell">
                <span class="stat-num">❗ {{ repo.open_issues_count }}</span>
                <span class="stat-key">{{ t('detail.issues') }}</span>
              </div>
              <div class="stat-cell">
                <span class="stat-num" :style="{ color: health.color }">{{ repo.health_score }}</span>
                <span class="stat-key">{{ t('common.health') }}</span>
              </div>
            </div>

            <!-- Info rows -->
            <div class="info-list">
              <div v-if="repo.category" class="info-row">
                <span class="info-key">{{ t('detail.category') }}</span>
                <span class="info-val accent">{{ catLabel(repo.category) }}</span>
              </div>
              <div v-if="repo.language" class="info-row">
                <span class="info-key">{{ t('common.language') }}</span>
                <span class="info-val">{{ repo.language }}</span>
              </div>
              <div v-if="repo.license" class="info-row">
                <span class="info-key">{{ t('detail.license') }}</span>
                <span class="info-val">{{ repo.license }}</span>
              </div>
              <div class="info-row">
                <span class="info-key">{{ t('detail.created') }}</span>
                <span class="info-val">{{ fmtDate(repo.created_at) }}</span>
              </div>
              <div class="info-row">
                <span class="info-key">{{ t('detail.updated') }}</span>
                <span class="info-val">{{ fmtDate(repo.updated_at) }} · {{ fmtAgo(repo.updated_at) }}</span>
              </div>
              <div v-if="repo.pushed_at" class="info-row">
                <span class="info-key">{{ t('detail.pushed') }}</span>
                <span class="info-val">{{ fmtAgo(repo.pushed_at) }}</span>
              </div>
              <div v-if="repo.parent_full_name" class="info-row">
                <span class="info-key">{{ t('detail.forkFrom') }}</span>
                <span class="info-val">{{ repo.parent_full_name }}</span>
              </div>
            </div>

            <!-- Topics -->
            <div v-if="repo.topics && repo.topics.length" class="topics-block">
              <span class="info-key">{{ t('detail.topics') }}</span>
              <div class="topic-chips">
                <span v-for="tp in repo.topics" :key="tp" class="topic-chip">{{ tp }}</span>
              </div>
            </div>

            <!-- User note & tags -->
            <div v-if="meta.note || meta.tags.length" class="meta-block">
              <div v-if="meta.note" class="note-block">
                <span class="info-key">📝 {{ t('repo.note') }}</span>
                <p class="note-text">{{ meta.note }}</p>
              </div>
              <div v-if="meta.tags.length" class="topic-chips">
                <span v-for="tag in meta.tags" :key="tag" class="topic-chip user">#{{ tag }}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.detail-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(2px);
  z-index: 900;
}

.detail-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(420px, 92vw);
  background: var(--bg);
  border-left: 1px solid var(--card-border);
  box-shadow: -12px 0 40px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Slide transition */
.panel-enter-active,
.panel-leave-active {
  transition: opacity 0.2s ease;
}
.panel-enter-active .detail-panel,
.panel-leave-active .detail-panel {
  transition: transform 0.25s ease;
}
.panel-enter-from,
.panel-leave-to {
  opacity: 0;
}
.panel-enter-from .detail-panel,
.panel-leave-to .detail-panel {
  transform: translateX(100%);
}

.panel-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--card-border);
}

.panel-type {
  font-size: 18px;
  flex-shrink: 0;
}

.panel-title-wrap {
  flex: 1;
  min-width: 0;
}

.panel-title {
  font-size: 16px;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.panel-fullname {
  font-size: 11px;
  color: var(--text-tertiary);
}

.panel-close {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 14px;
  flex-shrink: 0;
}

.panel-close:hover {
  border-color: var(--accent);
  color: var(--text-primary);
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 18px 20px 28px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}

.panel-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 9px;
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  transition: border-color 0.15s;
}

.action-btn:hover {
  border-color: var(--accent);
}

.action-btn.primary {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.stat-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 8px;
  border-radius: 10px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  text-align: center;
}

.stat-num {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-key {
  font-size: 10px;
  color: var(--text-tertiary);
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
  border: 1px solid var(--card-border);
  border-radius: 10px;
  overflow: hidden;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 9px 14px;
  background: var(--card-bg);
}

.info-key {
  font-size: 12px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.info-val {
  font-size: 12px;
  color: var(--text-primary);
  text-align: right;
}

.info-val.accent {
  color: var(--accent);
  font-weight: 600;
}

.topics-block,
.meta-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.topic-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.topic-chip {
  font-size: 11px;
  padding: 2px 9px;
  border-radius: 10px;
  background: var(--badge-bg);
  color: var(--text-secondary);
}

.topic-chip.user {
  background: var(--accent-bg);
  color: var(--accent);
}

.note-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.note-text {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  white-space: pre-wrap;
}
</style>
