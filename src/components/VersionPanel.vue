<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const activeTab = ref<'changelog' | 'todo'>('changelog')

function close() {
  emit('update:modelValue', false)
}

interface ChangelogEntry {
  version: string
  date: string
  type: 'release' | 'fix' | 'feature'
  items: string[]
}

const changelog: ChangelogEntry[] = [
  {
    version: 'v1.4.1',
    date: '2026-08-13',
    type: 'feature',
    items: ['右侧快速导航：浮动锚点定位各功能区，滚动高亮当前区域'],
  },
  {
    version: 'v1.4.0',
    date: '2026-08-13',
    type: 'feature',
    items: ['版本进度面板（Changelog + Roadmap）', 'Trending 热榜修复：跟随当前模板和类型筛选实时重算'],
  },
  {
    version: 'v1.3.0',
    date: '2026-08-12',
    type: 'release',
    items: ['技术画像分享卡片（PNG/SVG 下载）', 'README Badge（构建时自动生成 6 个 shields.io 风格 SVG）'],
  },
  {
    version: 'v1.2.0',
    date: '2026-08-12',
    type: 'release',
    items: ['Trending 热榜（Star 增速排行 + 月均 velocity）', '分类筛选 pills', '金银铜奖牌排名', '热门标记'],
  },
  {
    version: 'v1.1.0',
    date: '2026-08-12',
    type: 'release',
    items: [
      'YAML 自定义分类模板',
      '交叉维度分组（叠加第二维度）',
      'AI 专项分类模板（10 个子类：Agent/Skill/MCP/Prompt/RAG/LLM/训练/ML/教程/生成式）',
      'Markdown 导出',
      '多维排序（Star/更新时间/创建时间/名称/健康分）',
    ],
  },
  {
    version: 'v1.0.0',
    date: '2026-08-12',
    type: 'release',
    items: [
      '核心 MVP：数据采集 + 分类引擎',
      '5 种预设分类模板（技术领域/编程语言/活跃度/用途/来源）',
      '健康评分系统（0-100 综合分）',
      '沉默仓库检测',
      'Star 时间线',
      '技术画像（语言分布 + 领域覆盖）',
      '暗色/亮色主题切换',
      'GitHub Actions 自动构建部署',
    ],
  },
]

interface TodoGroup {
  tier: string
  tierClass: string
  items: { name: string; desc: string; icon: string }[]
}

const todoGroups: TodoGroup[] = [
  {
    tier: '🔥 高优先级',
    tierClass: 'tier-high',
    items: [
      { name: '年度仓库报告', desc: '类似 Spotify Wrapped — 年度 star 统计、最关注领域、活跃月份排行', icon: '📊' },
      { name: '搜索 + 高级过滤', desc: '按 stars / language / date / topics 多维度组合过滤', icon: '🔍' },
      { name: '智能推荐', desc: '基于技术画像推荐可能感兴趣的仓库（topics 相似度匹配）', icon: '🤖' },
    ],
  },
  {
    tier: '⭐ 中优先级',
    tierClass: 'tier-mid',
    items: [
      { name: '仓库笔记 / 标签', desc: '给仓库加自定义标签和备注（存 localStorage），如"待研究""已用过"', icon: '📝' },
      { name: '变化追踪', desc: '记录仓库变化：被 archive、改名、star 暴涨/暴跌，生成时间线', icon: '📈' },
      { name: '数据导出', desc: '导出 CSV / JSON，方便导入 Notion、飞书等做二次分析', icon: '📤' },
    ],
  },
  {
    tier: '📋 待规划',
    tierClass: 'tier-low',
    items: [
      { name: 'i18n 中英双语', desc: '完整中英文国际化切换', icon: '🌐' },
      { name: '多用户对比', desc: '输入 GitHub 用户名对比技术画像，Star 重叠度计算', icon: '👥' },
      { name: '移动端适配', desc: '响应式布局优化，手机浏览可用', icon: '📱' },
    ],
  },
]
</script>

<template>
  <Teleport to="body">
    <Transition name="panel-fade">
      <div v-if="modelValue" class="version-overlay" @click.self="close">
        <div class="version-panel">
          <!-- Header -->
          <div class="panel-header">
            <div class="panel-title">
              <span class="panel-icon">🏷️</span>
              <span>RepoCensus 版本进度</span>
            </div>
            <button class="close-btn" @click="close">✕</button>
          </div>

          <!-- Tabs -->
          <div class="panel-tabs">
            <button
              :class="['tab', { active: activeTab === 'changelog' }]"
              @click="activeTab = 'changelog'"
            >
              📋 Changelog
            </button>
            <button
              :class="['tab', { active: activeTab === 'todo' }]"
              @click="activeTab = 'todo'"
            >
              🗺️ Roadmap
            </button>
          </div>

          <!-- Content -->
          <div class="panel-body">
            <!-- Changelog Tab -->
            <div v-if="activeTab === 'changelog'" class="changelog-list">
              <div
                v-for="entry in changelog"
                :key="entry.version"
                :class="['changelog-entry', `type-${entry.type}`]"
              >
                <div class="entry-header">
                  <span class="entry-version">{{ entry.version }}</span>
                  <span class="entry-date">{{ entry.date }}</span>
                  <span :class="['entry-badge', `badge-${entry.type}`]">
                    {{ entry.type === 'release' ? '发布' : entry.type === 'fix' ? '修复' : '功能' }}
                  </span>
                </div>
                <ul class="entry-items">
                  <li v-for="item in entry.items" :key="item">{{ item }}</li>
                </ul>
              </div>
            </div>

            <!-- Todo Tab -->
            <div v-else class="todo-list">
              <div
                v-for="group in todoGroups"
                :key="group.tier"
                :class="['todo-group', group.tierClass]"
              >
                <h4 class="group-title">{{ group.tier }}</h4>
                <div class="todo-items">
                  <div v-for="item in group.items" :key="item.name" class="todo-item">
                    <span class="todo-icon">{{ item.icon }}</span>
                    <div class="todo-content">
                      <span class="todo-name">{{ item.name }}</span>
                      <span class="todo-desc">{{ item.desc }}</span>
                    </div>
                    <span class="todo-status">计划中</span>
                  </div>
                </div>
              </div>

              <div class="todo-footer">
                <a
                  href="https://github.com/Leoli04/repocensus"
                  target="_blank"
                  rel="noopener"
                  class="repo-link"
                >
                  在 GitHub 查看完整路线图 →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.version-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 24px;
}

.version-panel {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 16px;
  width: 100%;
  max-width: 560px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--card-border);
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}

.panel-icon {
  font-size: 20px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: var(--text-tertiary);
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.15s;
}

.close-btn:hover {
  background: var(--card-border);
  color: var(--text-primary);
}

.panel-tabs {
  display: flex;
  gap: 4px;
  padding: 0 24px;
  border-bottom: 1px solid var(--card-border);
}

.tab {
  padding: 10px 16px;
  border: none;
  background: none;
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
}

.tab:hover {
  color: var(--text-primary);
}

.tab.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
  font-weight: 600;
}

.panel-body {
  overflow-y: auto;
  padding: 20px 24px;
  flex: 1;
}

/* Changelog */
.changelog-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.changelog-entry {
  padding: 14px 16px;
  border-radius: 10px;
  background: var(--bg-secondary, rgba(128, 128, 128, 0.06));
  border-left: 3px solid var(--accent);
}

.changelog-entry.type-fix {
  border-left-color: #f59e0b;
}

.changelog-entry.type-feature {
  border-left-color: #10b981;
}

.entry-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.entry-version {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}

.entry-date {
  font-size: 12px;
  color: var(--text-tertiary);
}

.entry-badge {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 10px;
  font-weight: 600;
}

.badge-release {
  background: rgba(99, 102, 241, 0.15);
  color: #818cf8;
}

.badge-fix {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
}

.badge-feature {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
}

.entry-items {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.entry-items li {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

/* Todo */
.todo-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.todo-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-title {
  font-size: 14px;
  font-weight: 700;
  margin: 0 0 4px;
}

.tier-high .group-title {
  color: #f59e0b;
}

.tier-mid .group-title {
  color: #818cf8;
}

.tier-low .group-title {
  color: var(--text-tertiary);
}

.todo-items {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.todo-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--bg-secondary, rgba(128, 128, 128, 0.06));
  border: 1px solid var(--card-border);
}

.todo-icon {
  font-size: 18px;
  flex-shrink: 0;
  margin-top: 1px;
}

.todo-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.todo-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.todo-desc {
  font-size: 12px;
  color: var(--text-tertiary);
  line-height: 1.4;
}

.todo-status {
  font-size: 11px;
  color: var(--text-tertiary);
  background: var(--badge-bg);
  padding: 2px 8px;
  border-radius: 10px;
  flex-shrink: 0;
  white-space: nowrap;
}

.todo-footer {
  text-align: center;
  padding-top: 8px;
}

.repo-link {
  font-size: 13px;
  color: var(--accent);
  text-decoration: none;
}

.repo-link:hover {
  text-decoration: underline;
}

/* Transition */
.panel-fade-enter-active,
.panel-fade-leave-active {
  transition: opacity 0.2s ease;
}

.panel-fade-enter-from,
.panel-fade-leave-to {
  opacity: 0;
}
</style>
