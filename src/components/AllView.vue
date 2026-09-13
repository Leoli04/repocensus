<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRepos } from '../composables/useRepos'
import { useI18n } from '../i18n'
import FollowedFeed from './FollowedFeed.vue'
import ChangeTracker from './ChangeTracker.vue'

const { data } = useRepos()
const { t, locale } = useI18n()

const emit = defineEmits<{ (e: 'close'): void }>()

// ── Full-page view routing via hash: #/all/releases | #/all/changes ──
const view = ref<'releases' | 'changes' | null>(null)

function parseHash(): 'releases' | 'changes' | null {
  const h = location.hash.replace(/^#\/?/, '')
  if (h === 'all/releases') return 'releases'
  if (h === 'all/changes') return 'changes'
  return null
}

function syncFromHash() {
  view.value = parseHash()
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

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && view.value) close()
}

function close() {
  // Clear the hash → back to the dashboard
  if (location.hash.startsWith('#/all')) {
    history.replaceState(null, '', location.pathname + location.search)
  }
  view.value = null
  emit('close')
  window.scrollTo({ top: 0, behavior: 'auto' })
}

const heading = computed(() =>
  view.value === 'changes' ? t('change.title') : t('follow.title')
)

const generatedDate = computed(() => {
  const loc = locale.value === 'zh' ? 'zh-CN' : 'en-US'
  return new Date(data.value.generated_at).toLocaleString(loc, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
})

/** Total counts shown in the header */
const releasesTotal = computed(() => data.value.repos.length)
</script>

<template>
  <div v-if="view" class="all-page">
    <!-- Top bar -->
    <header class="all-header">
      <button class="back-btn" @click="close">← {{ t('all.back') }}</button>
      <div class="all-title-wrap">
        <h2 class="all-title">{{ heading }}</h2>
        <span class="all-meta">
          {{ t('all.generated', { date: generatedDate }) }}
          <template v-if="view === 'releases'"> · {{ t('all.repoCount', { n: releasesTotal }) }}</template>
        </span>
      </div>
      <span class="all-hint">Esc</span>
    </header>

    <!-- Content -->
    <div class="all-body">
      <FollowedFeed v-if="view === 'releases'" :limit="0" full @view-all="close" />
      <ChangeTracker v-else :history="data.history" :limit="0" full @view-all="close" />
    </div>
  </div>
</template>

<style scoped>
.all-page {
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

.all-header {
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

.all-title-wrap {
  flex: 1;
  min-width: 0;
}

.all-title {
  font-size: 17px;
  font-weight: 800;
  margin: 0;
  color: var(--text-primary);
}

.all-meta {
  font-size: 11px;
  color: var(--text-tertiary);
}

.all-hint {
  font-size: 10px;
  color: var(--text-tertiary);
  border: 1px solid var(--card-border);
  border-radius: 5px;
  padding: 2px 6px;
  flex-shrink: 0;
}

.all-body {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px 24px 64px;
}
</style>
