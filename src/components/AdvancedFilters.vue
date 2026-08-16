<script setup lang="ts">
import { computed } from 'vue'
import { useRepos } from '../composables/useRepos'
import { useI18n } from '../i18n'

const {
  data,
  languageFilter,
  minStarsFilter,
  yearFilter,
  topicFilter,
  setLanguageFilter,
  setMinStarsFilter,
  setYearFilter,
  setTopicFilter,
  resetAdvancedFilters,
} = useRepos()
const { t } = useI18n()

const showFilters = computed(() => {
  return languageFilter.value !== null || minStarsFilter.value > 0 || yearFilter.value !== null || topicFilter.value
})

// Available languages (sorted by frequency)
const languages = computed(() => {
  const map = new Map<string, number>()
  for (const r of data.value.repos) {
    if (r.language) map.set(r.language, (map.get(r.language) || 0) + 1)
  }
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
})

// Available years (created years)
const years = computed(() => {
  const set = new Set<number>()
  for (const r of data.value.repos) {
    set.add(new Date(r.created_at).getFullYear())
  }
  return Array.from(set).sort((a, b) => b - a)
})

const activeCount = computed(() => {
  let n = 0
  if (languageFilter.value) n++
  if (minStarsFilter.value > 0) n++
  if (yearFilter.value !== null) n++
  if (topicFilter.value) n++
  return n
})

const starOptions = [0, 10, 50, 100, 500, 1000]
</script>

<template>
  <div class="advanced-filters">
    <div class="filter-grid">
      <!-- Language -->
      <div class="filter-field">
        <label class="filter-label">{{ t('filter.language') }}</label>
        <select
          :value="languageFilter || ''"
          @change="setLanguageFilter(($event.target as HTMLSelectElement).value || null)"
          class="filter-select"
        >
          <option value="">{{ t('filter.allLanguage') }}</option>
          <option v-for="lang in languages" :key="lang.name" :value="lang.name">
            {{ lang.name }} ({{ lang.count }})
          </option>
        </select>
      </div>

      <!-- Min stars -->
      <div class="filter-field">
        <label class="filter-label">{{ t('filter.minStars') }}</label>
        <select
          :value="minStarsFilter"
          @change="setMinStarsFilter(Number(($event.target as HTMLSelectElement).value))"
          class="filter-select"
        >
          <option v-for="opt in starOptions" :key="opt" :value="opt">
            {{ opt === 0 ? t('filter.noLimit') : `${opt}+` }}
          </option>
        </select>
      </div>

      <!-- Year -->
      <div class="filter-field">
        <label class="filter-label">{{ t('filter.year') }}</label>
        <select
          :value="yearFilter ?? ''"
          @change="setYearFilter(($event.target as HTMLSelectElement).value ? Number(($event.target as HTMLSelectElement).value) : null)"
          class="filter-select"
        >
          <option value="">{{ t('filter.allYear') }}</option>
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>

      <!-- Topic -->
      <div class="filter-field">
        <label class="filter-label">{{ t('filter.topic') }}</label>
        <input
          :value="topicFilter || ''"
          @input="setTopicFilter(($event.target as HTMLInputElement).value.trim() || null)"
          type="text"
          :placeholder="t('filter.topicPlaceholder')"
          class="filter-input"
        />
      </div>

      <!-- Reset -->
      <button v-if="activeCount > 0" class="reset-btn" @click="resetAdvancedFilters">
        {{ t('filter.reset', { n: activeCount }) }}
      </button>
    </div>
    <span v-if="showFilters" class="filter-hint">{{ t('filter.active') }}</span>
  </div>
</template>

<style scoped>
.advanced-filters {
  margin-top: 10px;
}

.filter-grid {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: flex-end;
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-label {
  font-size: 11px;
  color: var(--text-tertiary);
  font-weight: 600;
}

.filter-select,
.filter-input {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  color: var(--text-primary);
  font-size: 13px;
  cursor: pointer;
  outline: none;
  min-width: 130px;
}

.filter-input {
  cursor: text;
}

.filter-select:focus,
.filter-input:focus {
  border-color: var(--accent);
}

.reset-btn {
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  color: var(--accent);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
  height: 32px;
}

.reset-btn:hover {
  border-color: var(--accent);
  background: var(--accent-bg);
}

.filter-hint {
  font-size: 11px;
  color: var(--accent);
  margin-left: 4px;
}
</style>
