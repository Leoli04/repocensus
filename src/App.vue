<script setup lang="ts">
import { computed, ref } from 'vue'
import RepoCard from './components/RepoCard.vue'
import TechProfile from './components/TechProfile.vue'
import StarTimeline from './components/StarTimeline.vue'
import CategoryGroups from './components/CategoryGroups.vue'
import TrendingBoard from './components/TrendingBoard.vue'
import ShareCard from './components/ShareCard.vue'
import VersionPanel from './components/VersionPanel.vue'
import SectionNav from './components/SectionNav.vue'
import AdvancedFilters from './components/AdvancedFilters.vue'
import AnnualReport from './components/AnnualReport.vue'
import RecommendBoard from './components/RecommendBoard.vue'
import { useRepos, type SortOption } from './composables/useRepos'
import { useTheme } from './composables/useTheme'
import { useExport } from './composables/useExport'
import { useI18n } from './i18n'
import { PRESET_TEMPLATES } from './engine/templates'
import ChangeTracker from './components/ChangeTracker.vue'

const {
  data,
  allTemplates,
  activeTemplate,
  activeTemplateId,
  secondaryTemplate,
  secondaryTemplateId,
  typeFilter,
  searchQuery,
  selectedCategory,
  sortOption,
  filtered,
  searched,
  categories,
  crossDimGroups,
  singleDimGroups,
  trending,
  setTemplate,
  setType,
  setCategory,
  setSort,
  setSecondaryTemplate,
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

const { theme, toggle } = useTheme()
const { exportMarkdown, exportJSON, exportCSV } = useExport()
const { t, locale, toggleLocale, catLabel, tplLabel } = useI18n()

// Collapsed groups state
const collapsedSet = ref<Set<string>>(new Set())
function toggleCollapse(name: string) {
  const next = new Set(collapsedSet.value)
  if (next.has(name)) {
    next.delete(name)
  } else {
    next.add(name)
  }
  collapsedSet.value = next
}

// Grouped view (use cross-dim or single-dim groups)
const displayGroups = computed(() => {
  return crossDimGroups.value || singleDimGroups.value
})

// Sort options (i18n)
const sortOptions = computed<{ value: SortOption; label: string }[]>(() => [
  { value: 'stars', label: t('ctrl.sortStars') },
  { value: 'updated', label: t('ctrl.sortUpdated') },
  { value: 'created', label: t('ctrl.sortCreated') },
  { value: 'name', label: t('ctrl.sortName') },
  { value: 'health', label: t('ctrl.sortHealth') },
])

const typeTabs = computed(() => [
  { id: 'all', label: t('ctrl.typeAll'), icon: '📋' },
  { id: 'original', label: t('ctrl.typeOriginal'), icon: '🛠️' },
  { id: 'fork', label: t('ctrl.typeFork'), icon: '🍴' },
  { id: 'star', label: t('ctrl.typeStar'), icon: '⭐' },
])

const stats = computed(() => data.value.stats)
const profile = computed(() => data.value.tech_profile)
const newStars = computed(() => data.value.new_stars)
const staleRepos = computed(() => data.value.stale_repos)

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

// Language switch button label (target language)
const langSwitchLabel = computed(() => (locale.value === 'zh' ? 'EN' : '中文'))

// Export menu
const showExportMenu = ref(false)
function doExport(kind: 'md' | 'json' | 'csv') {
  showExportMenu.value = false
  if (kind === 'md') {
    exportMarkdown(
      displayGroups.value as any,
      {
        username: data.value.username,
        generatedAt: data.value.generated_at,
        total: stats.value.total,
        original: stats.value.original,
        fork: stats.value.fork,
        star: stats.value.star,
      },
      activeTemplate.value.name,
      secondaryTemplate.value?.name
    )
  } else if (kind === 'json') {
    exportJSON()
  } else {
    exportCSV()
  }
}

// Flat view toggle
const viewMode = ref<'grouped' | 'flat' | 'trending'>('grouped')

// Scroll to share section
function scrollToShare() {
  document.querySelector('.share-section')?.scrollIntoView({ behavior: 'smooth' })
}

// Version panel
const showVersionPanel = ref(false)
const APP_VERSION = 'v1.6.0'
</script>

<template>
  <div class="app">
    <!-- Header -->
    <header class="header">
      <div class="header-left">
        <h1 class="logo">RepoCensus</h1>
        <span class="tagline">{{ t('app.tagline') }}</span>
      </div>
      <div class="header-right">
        <a :href="data.html_url" target="_blank" rel="noopener" class="user-link">
          <img :src="data.avatar_url" :alt="data.username" class="avatar" />
          <span>{{ data.username }}</span>
        </a>
        <button class="header-btn lang-toggle" @click="toggleLocale" :title="t('app.langTo')">
          {{ langSwitchLabel }}
        </button>
        <button class="header-btn theme-toggle" @click="toggle" :title="theme === 'dark' ? t('app.themeToLight') : t('app.themeToDark')">
          {{ theme === 'dark' ? '☀️' : '🌙' }}
        </button>
        <div class="export-wrap">
          <button class="header-btn export-btn" @click="showExportMenu = !showExportMenu" :title="t('app.btnExport')">📄</button>
          <div v-if="showExportMenu" class="export-menu">
            <button @click="doExport('md')">📝 Markdown</button>
            <button @click="doExport('json')">🧾 JSON</button>
            <button @click="doExport('csv')">📊 CSV</button>
          </div>
        </div>
        <div v-if="showExportMenu" class="export-backdrop" @click="showExportMenu = false"></div>
        <button class="header-btn share-btn" @click="scrollToShare" :title="t('app.btnShare')">
          📊
        </button>
        <button class="header-btn version-badge" @click="showVersionPanel = true" :title="t('app.btnVersion')">
          {{ APP_VERSION }}
        </button>
      </div>
    </header>

    <main class="main">
      <!-- Stat Cards -->
      <section id="overview" class="stat-cards">
        <div class="stat-card">
          <span class="stat-value">{{ stats.total }}</span>
          <span class="stat-label">{{ t('common.total') }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ stats.original }}</span>
          <span class="stat-label">🛠️ {{ t('common.own') }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ stats.fork }}</span>
          <span class="stat-label">🍴 {{ t('common.fork') }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ stats.star }}</span>
          <span class="stat-label">⭐ {{ t('common.star') }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ stats.avg_health }}</span>
          <span class="stat-label">{{ t('app.avgHealth') }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ stats.active_count }}</span>
          <span class="stat-label">🟢 {{ t('common.active') }}</span>
        </div>
      </section>

      <!-- Controls -->
      <section id="controls" class="controls">
        <!-- Template switcher row -->
        <div class="control-row">
          <div class="template-switcher">
            <button
              v-for="tpl in allTemplates"
              :key="tpl.id"
              :class="['tpl-btn', { active: activeTemplateId === tpl.id }]"
              @click="setTemplate(tpl.id)"
              :title="tpl.description"
            >
              {{ tplLabel(tpl.name) }}
            </button>
          </div>
        </div>

        <!-- Cross-dimension toggle -->
        <div class="control-row cross-dim-row">
          <label class="cross-dim-toggle">
            <input
              type="checkbox"
              :checked="secondaryTemplateId !== null"
              @change="(e) => setSecondaryTemplate((e.target as HTMLInputElement).checked ? 'by-language' : null)"
            />
            <span>{{ t('ctrl.crossDim') }}</span>
          </label>
          <select
            v-if="secondaryTemplateId !== null"
            :value="secondaryTemplateId"
            @change="(e) => setSecondaryTemplate((e.target as HTMLSelectElement).value)"
            class="secondary-select"
          >
            <option v-for="tpl in allTemplates" :key="tpl.id" :value="tpl.id">{{ tplLabel(tpl.name) }}</option>
          </select>
        </div>

        <!-- Type tabs + search + sort -->
        <div class="control-row">
          <div class="type-tabs">
            <button
              v-for="tab in typeTabs"
              :key="tab.id"
              :class="['tab-btn', { active: typeFilter === tab.id }]"
              @click="setType(tab.id)"
            >
              {{ tab.icon }} {{ tab.label }}
            </button>
          </div>

          <div class="search-box">
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="t('ctrl.searchPlaceholder')"
              class="search-input"
            />
          </div>

          <select
            :value="sortOption"
            @change="(e) => setSort((e.target as HTMLSelectElement).value as SortOption)"
            class="sort-select"
          >
            <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>

          <div class="view-toggle">
            <button :class="['view-btn', { active: viewMode === 'grouped' }]" @click="viewMode = 'grouped'" :title="t('ctrl.viewGrouped')">🗂️</button>
            <button :class="['view-btn', { active: viewMode === 'flat' }]" @click="viewMode = 'flat'" :title="t('ctrl.viewFlat')">📋</button>
            <button :class="['view-btn', { active: viewMode === 'trending' }]" @click="viewMode = 'trending'" :title="t('ctrl.viewTrending')">🔥</button>
          </div>
        </div>

        <!-- Advanced filters -->
        <AdvancedFilters />
      </section>

      <!-- Main Content -->
      <section id="repos" class="content" :class="{ 'no-sidebar': viewMode === 'trending' }">
        <!-- Category Sidebar -->
        <aside class="sidebar" v-if="viewMode !== 'trending'">
          <h3 class="sidebar-title">{{ t('ctrl.sidebarTitle') }}</h3>
          <button
            :class="['cat-btn', { active: !selectedCategory }]"
            @click="setCategory(null)"
          >
            <span>{{ t('common.all') }}</span>
            <span class="cat-count">{{ filtered.length }}</span>
          </button>
          <button
            v-for="cat in categories"
            :key="cat.name"
            :class="['cat-btn', { active: selectedCategory === cat.name }]"
            @click="setCategory(cat.name)"
          >
            <span>{{ catLabel(cat.name) }}</span>
            <span class="cat-count">{{ cat.count }}</span>
          </button>
        </aside>

        <!-- Repo Grid -->
        <div class="repo-section">
          <!-- Trending view -->
          <TrendingBoard
            v-if="viewMode === 'trending' && trending"
            :trending="trending"
            :repos="searched"
            :template="activeTemplate"
          />
          <div v-else-if="viewMode === 'trending'" class="empty-state">
            {{ t('app.emptyTrending') }}
          </div>

          <!-- Normal views -->
          <template v-else>
            <div class="repo-count">
              {{ t('app.repoCount', { n: filtered.length }) }}
              <span v-if="selectedCategory" class="filter-hint">{{ t('app.filterHintCat', { cat: selectedCategory }) }}</span>
              <span v-if="secondaryTemplate" class="filter-hint">{{ t('app.filterCross', { a: tplLabel(activeTemplate.name), b: tplLabel(secondaryTemplate.name) }) }}</span>
            </div>

            <!-- Grouped view -->
            <CategoryGroups
              v-if="viewMode === 'grouped' && filtered.length > 0"
              :groups="displayGroups"
              :collapsed-set="collapsedSet"
              :toggle-collapse="toggleCollapse"
            />

            <!-- Flat view -->
            <div v-else-if="viewMode === 'flat' && filtered.length > 0" class="repo-grid">
              <RepoCard v-for="repo in filtered" :key="repo.id" :repo="repo" show-category />
            </div>

            <div v-else class="empty-state">
              {{ t('app.emptyNoMatch') }}
            </div>
          </template>
        </div>
      </section>

      <!-- Stale Repos -->
      <section v-if="staleRepos.length" id="stale" class="stale-section">
        <h3 class="section-title">⚠️ {{ t('app.staleTitle') }}</h3>
        <div class="stale-list">
          <a
            v-for="stale in staleRepos"
            :key="stale.repo.id"
            :href="stale.repo.html_url"
            target="_blank"
            rel="noopener"
            class="stale-item"
          >
            <div class="stale-info">
              <span class="stale-name">{{ stale.repo.name }}</span>
              <span class="stale-reason">{{ t('stale.reason', { years: Math.floor(stale.days_since_update / 365), stars: stale.repo.stargazers_count }) }}</span>
            </div>
            <span class="stale-action">{{ t('common.view') }}</span>
          </a>
        </div>
      </section>

      <!-- Tech Profile -->
      <div id="tech-profile">
        <TechProfile :profile="profile" />
      </div>

      <!-- Annual Report -->
      <div id="annual-report">
        <AnnualReport />
      </div>

      <!-- Smart Recommendations -->
      <div id="recommend">
        <RecommendBoard />
      </div>

      <!-- Star Timeline -->
      <div id="star-timeline">
        <StarTimeline :stars="newStars" />
      </div>

      <!-- Change Tracking -->
      <div id="changes">
        <ChangeTracker :history="data.history" />
      </div>

      <!-- Share Card & Badges -->
      <div id="share">
        <ShareCard :data="data" />
      </div>
    </main>

    <!-- Version Panel -->
    <VersionPanel v-model="showVersionPanel" />

    <!-- Section Quick Nav -->
    <SectionNav />

    <!-- Footer -->
    <footer class="footer">
      <span>RepoCensus · {{ t('app.footer1', { date: generatedDate }) }}</span>
      <a href="https://github.com/Leoli04/repocensus" target="_blank" rel="noopener" class="footer-link">
        {{ t('app.footer2') }}
      </a>
    </footer>
  </div>
</template>

<style scoped>
.app {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 24px 48px;
}

/* Header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 0;
  border-bottom: 1px solid var(--card-border);
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.logo {
  font-size: 24px;
  font-weight: 800;
  margin: 0;
  background: linear-gradient(135deg, var(--accent), #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.tagline {
  font-size: 13px;
  color: var(--text-tertiary);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-link {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid var(--card-border);
}

.header-btn {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  width: 36px;
  height: 36px;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.15s;
}

.header-btn:hover {
  border-color: var(--accent);
}

.lang-toggle {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
  width: auto;
  padding: 0 12px;
  letter-spacing: 0.5px;
}

.lang-toggle:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.export-wrap {
  position: relative;
}

.export-menu {
  position: absolute;
  top: 44px;
  right: 0;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 10px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 130px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  z-index: 200;
}

.export-menu button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--text-primary);
  font-size: 13px;
  cursor: pointer;
  text-align: left;
  white-space: nowrap;
}

.export-menu button:hover {
  background: var(--accent-bg);
  color: var(--accent);
}

.export-backdrop {
  position: fixed;
  inset: 0;
  z-index: 150;
}

.version-badge {
  font-size: 12px;
  font-weight: 700;
  color: var(--accent);
  padding: 0 12px;
  letter-spacing: 0.5px;
}

/* Stat Cards */
.stat-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

.stat-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-value {
  font-size: 28px;
  font-weight: 800;
  color: var(--accent);
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}

/* Controls */
.controls {
  margin-bottom: 20px;
}

.control-row {
  display: flex;
  gap: 12px;
  margin-bottom: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.cross-dim-row {
  gap: 10px;
}

.cross-dim-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
}

.cross-dim-toggle input {
  cursor: pointer;
}

.secondary-select,
.sort-select {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  color: var(--text-primary);
  font-size: 13px;
  cursor: pointer;
  outline: none;
}

.secondary-select:focus,
.sort-select:focus {
  border-color: var(--accent);
}

.template-switcher {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tpl-btn {
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.tpl-btn:hover {
  border-color: var(--accent);
  color: var(--text-primary);
}

.tpl-btn.active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

.type-tabs {
  display: flex;
  gap: 4px;
}

.tab-btn {
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.tab-btn:hover {
  border-color: var(--accent);
}

.tab-btn.active {
  background: var(--accent-bg);
  color: var(--accent);
  border-color: var(--accent);
}

.search-box {
  flex: 1;
  min-width: 180px;
}

.search-input {
  width: 100%;
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}

.search-input:focus {
  border-color: var(--accent);
}

.search-input::placeholder {
  color: var(--text-tertiary);
}

.view-toggle {
  display: flex;
  gap: 2px;
}

.view-btn {
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}

.view-btn.active {
  background: var(--accent-bg);
  color: var(--accent);
  border-color: var(--accent);
}

/* Content */
.content {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 24px;
  margin-bottom: 32px;
}

.content.no-sidebar {
  grid-template-columns: 1fr;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 2px;
  position: sticky;
  top: 16px;
  align-self: start;
}

.sidebar-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-tertiary);
  text-transform: uppercase;
  margin: 0 0 8px;
  padding: 0 12px;
}

.cat-btn {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
  text-align: left;
}

.cat-btn:hover {
  background: var(--card-bg);
}

.cat-btn.active {
  background: var(--accent-bg);
  color: var(--accent);
  font-weight: 600;
}

.cat-count {
  font-size: 11px;
  background: var(--badge-bg);
  padding: 1px 7px;
  border-radius: 10px;
  color: var(--text-tertiary);
}

.cat-btn.active .cat-count {
  background: var(--accent);
  color: #fff;
}

/* Repo Grid */
.repo-section {
  min-width: 0;
}

.repo-count {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.filter-hint {
  color: var(--accent);
  margin-left: 4px;
}

.repo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.empty-state {
  text-align: center;
  padding: 48px;
  color: var(--text-tertiary);
  font-size: 14px;
}

/* Stale Repos */
.stale-section {
  margin-top: 32px;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 16px;
  color: var(--text-primary);
}

.stale-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stale-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-radius: 10px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  text-decoration: none;
  transition: border-color 0.15s;
}

.stale-item:hover {
  border-color: #f59e0b;
}

.stale-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stale-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.stale-reason {
  font-size: 11px;
  color: var(--text-tertiary);
}

.stale-action {
  font-size: 12px;
  color: var(--accent);
}

/* Footer */
.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 0;
  margin-top: 32px;
  border-top: 1px solid var(--card-border);
  font-size: 12px;
  color: var(--text-tertiary);
}

.footer-link {
  color: var(--accent);
  text-decoration: none;
}

.footer-link:hover {
  text-decoration: underline;
}

/* Responsive */
@media (max-width: 768px) {
  .app {
    padding: 0 16px 32px;
  }

  .content {
    grid-template-columns: 1fr;
  }

  .sidebar {
    position: static;
    flex-direction: row;
    overflow-x: auto;
    padding-bottom: 8px;
  }

  .sidebar-title {
    display: none;
  }

  .cat-btn {
    white-space: nowrap;
  }

  .stat-cards {
    grid-template-columns: repeat(3, 1fr);
  }

  .stat-value {
    font-size: 22px;
  }

  .repo-grid {
    grid-template-columns: 1fr;
  }

  .control-row {
    gap: 8px;
  }
}
</style>
