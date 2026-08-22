<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '../i18n'

interface TabItem {
  id: string
  icon: string
  labelKey: string
}

const props = defineProps<{ active: string }>()
const emit = defineEmits<{ (e: 'update:active', id: string): void }>()

const { t } = useI18n()

const tabs = computed<TabItem[]>(() => [
  { id: 'overview', icon: '📊', labelKey: 'tab.overview' },
  { id: 'repos', icon: '📦', labelKey: 'tab.repos' },
  { id: 'activity', icon: '📈', labelKey: 'tab.activity' },
  { id: 'profile', icon: '🔬', labelKey: 'tab.profile' },
  { id: 'compare', icon: '⚖️', labelKey: 'tab.compare' },
])

function select(id: string) {
  emit('update:active', id)
}
</script>

<template>
  <nav class="tab-bar" role="tablist" :aria-label="t('app.tagline')">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      role="tab"
      :aria-selected="props.active === tab.id"
      :class="['tab-btn', { active: props.active === tab.id }]"
      @click="select(tab.id)"
    >
      <span class="tab-icon">{{ tab.icon }}</span>
      <span class="tab-label">{{ t(tab.labelKey) }}</span>
    </button>
  </nav>
</template>

<style scoped>
.tab-bar {
  display: flex;
  gap: 4px;
  padding: 8px 0 0;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--card-border);
  overflow-x: auto;
  scrollbar-width: none;
  position: sticky;
  top: 0;
  background: var(--bg);
  z-index: 90;
}

.tab-bar::-webkit-scrollbar {
  display: none;
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border: none;
  border-radius: 10px 10px 0 0;
  background: transparent;
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  white-space: nowrap;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
}

.tab-btn:hover {
  color: var(--text-primary);
  background: var(--card-bg);
}

.tab-btn.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
  background: var(--accent-bg);
  font-weight: 600;
}

.tab-icon {
  font-size: 14px;
  flex-shrink: 0;
}
</style>
