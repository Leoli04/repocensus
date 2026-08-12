<script setup lang="ts">
import { computed, ref } from 'vue'
import RepoCard from './components/RepoCard.vue'
import TechProfile from './components/TechProfile.vue'
import StarTimeline from './components/StarTimeline.vue'
import CategoryGroups from './components/CategoryGroups.vue'
import TrendingBoard from './components/TrendingBoard.vue'
import ShareCard from './components/ShareCard.vue'
import { useRepos, type SortOption } from './composables/useRepos'
import { useTheme } from './composables/useTheme'
import { useMarkdownExport } from './composables/useExport'
import { PRESET_TEMPLATES } from './engine/templates'

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
  categories,
  crossDimGroups,
  singleDimGroups,
  trending,
  setTemplate,
  setType,
  setCategory,
  setSort,
  setSecondaryTemplate,
} = useRepos()

const { theme, toggle } = useTheme()
const { exportMarkdown } = useMarkdownExport()

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

// Sort options
const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'stars', label: '⭐ Star 数' },
  { value: 'updated', label: '📅 更新时间' },
  { value: 'created', label: '🐣 创建时间' },
  { value: 'name', label: '🔤 名称' },
  { value: 'health', label: '🏥 健康分' },
]

const typeTabs = [
  { id: 'all', label: '全部', icon: '📋' },
  { id: 'original', label: '自建', icon: '🛠️' },
  { id: 'fork', label: 'Fork', icon: '🍴' },
  { id: 'star', label: 'Star', icon: '⭐' },
]

const stats = computed(() => data.value.stats)
const profile = computed(() => data.value.tech_profile)
const newStars = computed(() => data.value.new_stars)
const staleRepos = computed(() => data.value.stale_repos)

const generatedDate = computed(() => {
  return new Date(data.value.generated_at).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
})

// Export handler
function handleExport() {
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
}

// Flat view toggle
const viewMode = ref<'grouped' | 'flat' | 'trending'>('grouped')

// Scroll to share section
function scrollToShare() {
  document.querySelector('.share-section')?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<template>
  <div class="app">
    <!-- Header -->
    <header class="header">
      <div class="header-left">
        <h1 class="logo">RepoCensus</h1>
        <span class="tagline">仓库普查仪表盘</span>
      </div>
      <div class="header-right">
        <a :href="data.html_url" target="_blank" rel="noopener" class="user-link">
          <img :src="data.avatar_url" :alt="data.username" class="avatar" />
          <span>{{ data.username }}</span>
        </a>
        <button class="header-btn theme-toggle" @click="toggle" :title="theme === 'dark' ? '切换亮色' : '切换暗色'">
          {{ theme === 'dark' ? '☀️' : '🌙' }}
        </button>
        <button class="header-btn export-btn" @click="handleExport" title="导出 Markdown 报告">
          📄
        </button>
        <button class="header-btn share-btn" @click="scrollToShare" title="分享卡片 & Badge">
          📊
        </button>
      </div>
    </header>

    <main class="main">
      <!-- Stat Cards -->
      <section class="stat-cards">
        <div class="stat-card">
          <span class="stat-value">{{ stats.total }}</span>
          <span class="stat-label">总仓库</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ stats.original }}</span>
          <span class="stat-label">🛠️ 自建</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ stats.fork }}</span>
          <span class="stat-label">🍴 Fork</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ stats.star }}</span>
          <span class="stat-label">⭐ Star</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ stats.avg_health }}</span>
          <span class="stat-label">平均健康分</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ stats.active_count }}</span>
          <span class="stat-label">🟢 活跃</span>
        </div>
      </section>

      <!-- Controls -->
      <section class="controls">
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
              {{ tpl.name }}
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
            <span>叠加第二维度</span>
          </label>
          <select
            v-if="secondaryTemplateId !== null"
            :value="secondaryTemplateId"
            @change="(e) => setSecondaryTemplate((e.target as HTMLSelectElement).value)"
            class="secondary-select"
          >
            <option v-for="tpl in allTemplates" :key="tpl.id" :value="tpl.id">{{ tpl.name }}</option>
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
              placeholder="搜索仓库名、描述、语言..."
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
            <button :class="['view-btn', { active: viewMode === 'grouped' }]" @click="viewMode = 'grouped'" title="分组视图">🗂️</button>
            <button :class="['view-btn', { active: viewMode === 'flat' }]" @click="viewMode = 'flat'" title="平铺视图">📋</button>
            <button :class="['view-btn', { active: viewMode === 'trending' }]" @click="viewMode = 'trending'" title="Trending 热榜">🔥</button>
          </div>
        </div>
      </section>

      <!-- Main Content -->
      <section class="content" :class="{ 'no-sidebar': viewMode === 'trending' }">
        <!-- Category Sidebar -->
        <aside class="sidebar" v-if="viewMode !== 'trending'">
          <h3 class="sidebar-title">分类</h3>
          <button
            :class="['cat-btn', { active: !selectedCategory }]"
            @click="setCategory(null)"
          >
            <span>全部</span>
            <span class="cat-count">{{ filtered.length }}</span>
          </button>
          <button
            v-for="cat in categories"
            :key="cat.name"
            :class="['cat-btn', { active: selectedCategory === cat.name }]"
            @click="setCategory(cat.name)"
          >
            <span>{{ cat.name }}</span>
            <span class="cat-count">{{ cat.count }}</span>
          </button>
        </aside>

        <!-- Repo Grid -->
        <div class="repo-section">
          <!-- Trending view -->
          <TrendingBoard
            v-if="viewMode === 'trending' && trending"
            :trending="trending"
          />
          <div v-else-if="viewMode === 'trending'" class="empty-state">
            Trending 数据暂不可用，等待下次数据更新
          </div>

          <!-- Normal views -->
          <template v-else>
            <div class="repo-count">
              {{ filtered.length }} 个仓库
              <span v-if="selectedCategory" class="filter-hint">· {{ selectedCategory }}</span>
              <span v-if="secondaryTemplate" class="filter-hint">· {{ activeTemplate.name }} × {{ secondaryTemplate.name }}</span>
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
              没有匹配的仓库
            </div>
          </template>
        </div>
      </section>

      <!-- Stale Repos -->
      <section v-if="staleRepos.length" class="stale-section">
        <h3 class="section-title">⚠️ 沉默仓库建议清理</h3>
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
              <span class="stale-reason">{{ stale.reason }}</span>
            </div>
            <span class="stale-action">查看 →</span>
          </a>
        </div>
      </section>

      <!-- Tech Profile -->
      <TechProfile :profile="profile" />

      <!-- Star Timeline -->
      <StarTimeline :stars="newStars" />

      <!-- Share Card & Badges -->
      <ShareCard :data="data" />
    </main>

    <!-- Footer -->
    <footer class="footer">
      <span>RepoCensus · 数据生成于 {{ generatedDate }}</span>
      <a href="https://github.com/Leoli04/repocensus" target="_blank" rel="noopener" class="footer-link">
        Fork me on GitHub →
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
