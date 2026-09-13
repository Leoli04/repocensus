<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from '../i18n'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
const { t } = useI18n()

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
    version: 'v1.12.0',
    date: '2026-09-13',
    type: 'release',
    items: [
      '关注动态移回动态页并置于最上方，默认只展示最近 10 条，「查看更多」跳转全屏页展示全部',
      '变化追踪（Star 上涨/下跌/新增/移除）同样只展示前 10 条并按块提供「查看更多」',
      '新增全屏「查看全部」页（hash 路由 #/all/releases、#/all/changes），带返回按钮与 Esc 关闭',
      '侧边快速定位导航上线：按当前 Tab 动态生成锚点，滚动自动高亮，点击平滑定位，到页顶自动隐藏',
    ],
  },
  {
    version: 'v1.11.0',
    date: '2026-09-13',
    type: 'release',
    items: [
      '关注项目动态卡片化：对齐 GitHub Feed 形态——每条 Release 一张卡片，含仓库头像/描述/Star、Release 标题、What\u2019s Changed 正文（Markdown 轻量渲染，@提及与 #PR 可点）、贡献者头像组、展开/收起',
      '采集脚本新增 release body、contributors、仓库 star/description（正文截断 1200 字，贡献者取前 8）',
      '关注动态从动态页移至概览页最上方，并加「全部 / 仅新动态」筛选',
      'Roadmap 登记 5 项待做：仓库收藏夹/置顶、PNG 分享图增强、Fork 价值分析、暗色图表配色校准、语言熟练度雷达图',
    ],
  },
  {
    version: 'v1.10.0',
    date: '2026-09-12',
    type: 'release',
    items: [
      '语言分布环形图：技术画像语言卡片新增 Donut 图 + 图例，中心显示占比最高语言',
      '仓库详情面板新增 README 速览：一键加载 README（Markdown 轻量渲染，XSS 安全）',
      'PWA 支持：manifest + Service Worker（stale-while-revalidate），可安装到桌面/手机',
      'Release 通知：每日采集发现关注项目新版本时自动创建 GitHub Issue 汇总',
      'scripts/dev-sync.ps1：本地副本一键同步远端 main（保留 node_modules/.git）',
    ],
  },
  {
    version: 'v1.9.0',
    date: '2026-09-12',
    type: 'release',
    items: [
      '多用户对比 (v2.1)：输入任意 GitHub 用户名，并排对比技术画像（仓库数/Star/活跃/语言分布/明星仓库，优胜项高亮）+ 仓库重叠度',
      '对比页为最后一个占位 Tab，至此四个 Tab 全部为实功能',
      '学习路径视角 (v2.8)：自建仓库按成熟度分为 入门练手 → 进阶打磨 → 实战旗舰 三阶展示',
      '对比面板支持 localStorage 写入 repocensus:gh-token 提升 API 限额',
    ],
  },
  {
    version: 'v1.8.1',
    date: '2026-09-12',
    type: 'fix',
    items: [
      '修复：v1.8.0 的四个新组件（热力图/趋势图/关注动态/详情面板）未实际挂载到页面，本次已全部接入对应 Tab',
      '修复：热力图在 UTC+8 时区日期错位一天（toISOString 时区偏移）',
      '修复：首次采集关注项目时全部 Release 误标为「新」，现首次运行作为基线不再标记',
      '改进：每日定时任务（北京 20:00）改为全量刷新 + 重新部署，不再只跑增量',
      '修复：顶栏版本徽章仍显示 v1.7.0 的不一致',
    ],
  },
  {
    version: 'v1.8.0',
    date: '2026-09-12',
    type: 'release',
    items: [
      '关注项目动态 (v2.4)：config/followed.yml 关注清单 + Releases 每日增量采集 + 动态时间线（新动态置顶、历史折叠）',
      '仓库详情侧滑面板 (v2.2)：点击仓库卡片滑出详情（描述/Topics/License/统计/笔记），GitHub 与主页直达',
      '变化趋势图 (v2.3)：基于快照历史的 Star 总数折线 + Star 增长最快仓库 sparkline',
      '贡献热力图：按日统计仓库推送活跃度（GitHub 风格年度格子图）',
      'HTML 报告导出 (v2.7)：单文件离线成品报告（画像+图表+分类明细），非技术人可读',
      'workflow 新增每日 12:00 UTC 增量采集 cron，followed.json 随构建提交',
    ],
  },
  {
    version: 'v1.7.0',
    date: '2026-08-22',
    type: 'release',
    items: [
      'Tab 化多视图布局：单页长滚动改为 5 个顶级 Tab（概览 / 仓库 / 动态 / 画像 / 对比），每页一屏聚焦',
      '概览页：统计卡 + 技术画像 + Star 时间线，一屏看全貌',
      '仓库页：搜索 / 筛选 / 分类网格 / 沉默仓库独立成页（主战场）',
      '动态页：变化追踪 + 关注项目动态占位（v2.4 规划）',
      '画像页：年度报告 + 智能推荐 + 分享卡片聚合展示',
      '对比页：多用户对比占位（v2.1 规划）',
      'Tab 选择持久化到 localStorage，刷新后恢复',
    ],
  },
  {
    version: 'v1.6.0',
    date: '2026-08-15',
    type: 'release',
    items: [
      '中英双语 i18n：全局语言切换（中文 / English），偏好持久化到 localStorage',
      '仓库笔记 / 标签：给任意仓库加自定义备注与标签（localStorage），可搜索、可随导出带走',
      '数据导出升级：在 Markdown 基础上新增 JSON / CSV 导出（含笔记与标签）',
      '探索新领域下钻：点击兴趣 Topic 展开相关仓库卡片',
      '变化追踪：构建时保存历史快照，对比两次采集的新增 / 移除 / Star 涨跌',
    ],
  },
  {
    version: 'v1.5.0',
    date: '2026-08-15',
    type: 'release',
    items: [
      '高优先级功能三连发：搜索+高级过滤、年度仓库报告、智能推荐',
      '高级过滤：按语言/最少 Star/创建年份/Topic 多维度组合筛选',
      '年度仓库报告：类似 Spotify Wrapped 的年度卡（新建数、语言、领域、月度活跃、热门 Topic）',
      '智能推荐：基于技术画像 topic 相似度匹配，推荐最契合的仓库 + 探索新领域',
    ],
  },
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
    tier: '⭐ 中优先级',
    tierClass: 'tier-mid',
    items: [
      { name: '移动端适配', desc: '响应式布局优化，手机浏览可用', icon: '📱' },
      { name: 'Fork 价值分析', desc: '识别哪些 Fork 真正改过代码、哪些可清理', icon: '🍴' },
      { name: '语言熟练度雷达图', desc: '按语言数量/Star/活跃度给熟练度打分，雷达图展示', icon: '📊' },
    ],
  },
  {
    tier: '📋 待规划',
    tierClass: 'tier-low',
    items: [
      { name: '仓库收藏夹/置顶', desc: '标记重要仓库，概览页置顶展示（localStorage）', icon: '📌' },
      { name: 'PNG 分享图增强', desc: '分享卡片支持多主题配色（极简白/深色科技/渐变）', icon: '🎨' },
      { name: '暗色图表配色校准', desc: '热力图/环形图在暗色主题下的对比度微调', icon: '🌙' },
      { name: 'AI 洞察摘要', desc: '可选 LLM：画像总结、整理建议、动态周报（v2.5）', icon: '✨' },
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
              <span>{{ t('ver.title') }}</span>
            </div>
            <button class="close-btn" @click="close">✕</button>
          </div>

          <!-- Tabs -->
          <div class="panel-tabs">
            <button
              :class="['tab', { active: activeTab === 'changelog' }]"
              @click="activeTab = 'changelog'"
            >
              📋 {{ t('ver.changelog') }}
            </button>
            <button
              :class="['tab', { active: activeTab === 'todo' }]"
              @click="activeTab = 'todo'"
            >
              🗺️ {{ t('ver.roadmap') }}
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
                    {{ entry.type === 'release' ? t('ver.badgeRelease') : entry.type === 'fix' ? t('ver.badgeFix') : t('ver.badgeFeature') }}
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
                <h4 class="group-title">
                  {{ group.tierClass === 'tier-mid' ? t('ver.todoMid') : t('ver.todoLow') }}
                </h4>
                <div class="todo-items">
                  <div v-for="item in group.items" :key="item.name" class="todo-item">
                    <span class="todo-icon">{{ item.icon }}</span>
                    <div class="todo-content">
                      <span class="todo-name">{{ item.name }}</span>
                      <span class="todo-desc">{{ item.desc }}</span>
                    </div>
                    <span class="todo-status">{{ t('ver.planned') }}</span>
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
                  {{ t('ver.roadmapLink') }}
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
