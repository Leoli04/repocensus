<script setup lang="ts">
import { computed } from 'vue'
import { useRepos } from '../composables/useRepos'
import { computeAnnualReport, type AnnualReport as AnnualReportData } from '../engine/annualReport'

const { data } = useRepos()

const report = computed<AnnualReportData>(() => computeAnnualReport(data.value))

const currentYear = new Date().getFullYear()

const langColors: Record<string, string> = {
  Python: '#3572A5',
  TypeScript: '#3178c6',
  'Jupyter Notebook': '#DA5B0B',
  Java: '#b07219',
  JavaScript: '#f1e05a',
  Go: '#00ADD8',
  Vue: '#41b883',
  Rust: '#dea584',
  HTML: '#e34c26',
  CSS: '#563d7c',
}

const maxMonthly = computed(() =>
  Math.max(...report.value.monthlyActivity.map((m) => m.created + m.pushed), 1)
)

const monthLabels = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

function monthLabel(m: number): string {
  return monthLabels[m - 1]
}
</script>

<template>
  <div class="annual-report">
    <h3 class="section-title">🎉 {{ report.year }} 年度仓库报告</h3>

    <!-- Hero stats -->
    <div class="hero-grid">
      <div class="hero-card primary">
        <span class="hero-value">{{ report.originalThisYear + report.forkThisYear }}</span>
        <span class="hero-label">今年新增仓库</span>
        <span class="hero-sub">自建 {{ report.originalThisYear }} · Fork {{ report.forkThisYear }}</span>
      </div>
      <div class="hero-card">
        <span class="hero-value">{{ report.totalStarsReceived.toLocaleString() }}</span>
        <span class="hero-label">累计收到 Star</span>
        <span class="hero-sub">自建+Fork 仓库今年新增 {{ report.starsThisYear.toLocaleString() }}</span>
      </div>
      <div class="hero-card">
        <span class="hero-value">{{ report.healthAvg }}</span>
        <span class="hero-label">平均健康分</span>
        <span class="hero-sub">仅自建 + Fork 仓库</span>
      </div>
      <div class="hero-card star">
        <span class="hero-value">{{ report.starTotal }}</span>
        <span class="hero-label">⭐ 标星仓库</span>
        <span class="hero-sub">今年标星 {{ report.starThisYear }}</span>
      </div>
    </div>

    <!-- Composition: three categories -->
    <div class="report-card full">
      <h4 class="card-title">📊 仓库构成（三类）</h4>
      <div class="composition">
        <div class="comp-row">
          <span class="comp-icon">🏠</span>
          <span class="comp-name">自建仓库</span>
          <span class="comp-total">{{ report.originalTotal }}</span>
          <span class="comp-sub">今年新建 {{ report.originalThisYear }}</span>
        </div>
        <div class="comp-row">
          <span class="comp-icon">🍴</span>
          <span class="comp-name">Fork 仓库</span>
          <span class="comp-total">{{ report.forkTotal }}</span>
          <span class="comp-sub">今年 Fork {{ report.forkThisYear }}</span>
        </div>
        <div class="comp-row star">
          <span class="comp-icon">⭐</span>
          <span class="comp-name">标星仓库</span>
          <span class="comp-total">{{ report.starTotal }}</span>
          <span class="comp-sub">今年标星 {{ report.starThisYear }}（你的兴趣，非产出）</span>
        </div>
      </div>
    </div>

    <!-- Languages & Domains (own repos) -->
    <div class="report-grid">
      <div class="report-card">
        <h4 class="card-title">🔧 最常用语言（自建 + Fork）</h4>
        <div class="lang-list">
          <div v-for="lang in report.topLanguages" :key="lang.name" class="lang-row">
            <span class="lang-name">{{ lang.name }}</span>
            <div class="lang-track">
              <div
                class="lang-fill"
                :style="{
                  width: (lang.count / report.topLanguages[0].count) * 100 + '%',
                  background: langColors[lang.name] || 'var(--accent)',
                }"
              />
            </div>
            <span class="lang-count">{{ lang.count }}</span>
          </div>
          <div v-if="!report.topLanguages.length" class="empty-hint">暂无自有仓库语言数据</div>
        </div>
      </div>

      <div class="report-card">
        <h4 class="card-title">📂 主要领域（自建 + Fork）</h4>
        <div class="domain-chips">
          <span v-for="dom in report.topDomains" :key="dom.name" class="domain-chip">
            {{ dom.name }} <b>{{ dom.count }}</b>
          </span>
          <span v-if="!report.topDomains.length" class="empty-hint">暂无自有仓库领域数据</span>
        </div>
      </div>
    </div>

    <!-- Interests: starred repos -->
    <div class="report-card full">
      <h4 class="card-title">⭐ 你的兴趣（来自 {{ report.starTotal }} 个标星仓库）</h4>
      <p class="interest-note">标星仓库代表你关注的方向，不是你创建的仓库。</p>
      <div class="report-grid inner">
        <div class="report-card inner-card">
          <h5 class="inner-title">标星仓库常用语言</h5>
          <div class="domain-chips">
            <span v-for="lang in report.starredLangTop" :key="lang.name" class="domain-chip alt">
              {{ lang.name }} <b>{{ lang.count }}</b>
            </span>
            <span v-if="!report.starredLangTop.length" class="empty-hint">无</span>
          </div>
        </div>
        <div class="report-card inner-card">
          <h5 class="inner-title">标星关注热点 Topic</h5>
          <div class="topic-cloud">
            <span
              v-for="t in report.starredTopicTop"
              :key="t.name"
              class="topic-tag"
              :style="{ fontSize: 11 + Math.min(t.count, 40) / 3 + 'px' }"
            >
              #{{ t.name }} <b>{{ t.count }}</b>
            </span>
            <span v-if="!report.starredTopicTop.length" class="empty-hint">无</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Monthly activity heatmap (own repos) -->
    <div class="report-card full">
      <h4 class="card-title">📅 {{ report.year }} 月度活跃度（自建 + Fork）</h4>
      <div class="month-bars">
        <div v-for="m in report.monthlyActivity" :key="m.month" class="month-col">
          <div class="month-track">
            <div
              class="month-fill"
              :style="{ height: ((m.created + m.pushed) / maxMonthly) * 100 + '%' }"
              :title="`${monthLabel(m.month)}: 创建 ${m.created} / 推送 ${m.pushed}`"
            />
          </div>
          <span class="month-label">{{ monthLabel(m.month) }}</span>
        </div>
      </div>
    </div>

    <!-- Top topics (own repos) -->
    <div class="report-card full">
      <h4 class="card-title">🔥 自建 / Fork 热门 Topic</h4>
      <div class="topic-cloud">
        <span
          v-for="t in report.topTopics"
          :key="t.name"
          class="topic-tag"
          :style="{ fontSize: 11 + Math.min(t.count, 40) / 3 + 'px' }"
        >
          #{{ t.name }} <b>{{ t.count }}</b>
        </span>
        <span v-if="!report.topTopics.length" class="empty-hint">暂无自有仓库 Topic 数据</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.annual-report {
  margin-top: 32px;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 16px;
  color: var(--text-primary);
}

/* Hero */
.hero-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.hero-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 14px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.hero-card.primary {
  background: linear-gradient(135deg, var(--accent), #8b5cf6);
  border-color: transparent;
}

.hero-card.primary .hero-value,
.hero-card.primary .hero-label,
.hero-card.primary .hero-sub {
  color: #fff;
}

.hero-card.star {
  background: linear-gradient(135deg, #f59e0b, #ef4444);
  border-color: transparent;
}
.hero-card.star .hero-value,
.hero-card.star .hero-label,
.hero-card.star .hero-sub {
  color: #fff;
}

.hero-value {
  font-size: 32px;
  font-weight: 800;
  color: var(--accent);
  line-height: 1.1;
}

.hero-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.hero-sub {
  font-size: 11px;
  color: var(--text-tertiary);
}

/* Report grid */
.report-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}
.report-grid.inner {
  margin-bottom: 0;
  gap: 12px;
}

.report-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 14px;
  padding: 18px 20px;
}
.report-card.inner-card {
  padding: 14px 16px;
}

.report-card.full {
  grid-column: 1 / -1;
}

.card-title {
  font-size: 13px;
  font-weight: 700;
  margin: 0 0 14px;
  color: var(--text-secondary);
}

.inner-title {
  font-size: 12px;
  font-weight: 700;
  margin: 0 0 10px;
  color: var(--text-secondary);
}

/* Composition */
.composition {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.comp-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--bar-track);
}
.comp-row.star {
  background: linear-gradient(90deg, rgba(245, 158, 11, 0.12), transparent);
}
.comp-icon {
  font-size: 18px;
}
.comp-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  width: 90px;
}
.comp-total {
  margin-left: auto;
  font-size: 22px;
  font-weight: 800;
  color: var(--accent);
}
.comp-row.star .comp-total {
  color: #f59e0b;
}
.comp-sub {
  font-size: 11px;
  color: var(--text-tertiary);
  width: 200px;
  text-align: right;
}

/* Languages */
.lang-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.lang-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.lang-name {
  width: 110px;
  font-size: 12px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 0;
}
.lang-track {
  flex: 1;
  height: 10px;
  background: var(--bar-track);
  border-radius: 5px;
  overflow: hidden;
}
.lang-fill {
  height: 100%;
  border-radius: 5px;
  transition: width 0.4s ease;
  min-width: 3px;
}
.lang-count {
  width: 28px;
  text-align: right;
  font-size: 11px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

/* Domains */
.domain-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.domain-chip {
  padding: 6px 12px;
  border-radius: 20px;
  background: var(--accent-bg);
  color: var(--accent);
  font-size: 12px;
  font-weight: 600;
  border: 1px solid var(--card-border);
}
.domain-chip.alt {
  background: rgba(245, 158, 11, 0.12);
  color: #f59e0b;
}
.domain-chip b {
  opacity: 0.8;
}

/* Interests */
.interest-note {
  font-size: 12px;
  color: var(--text-tertiary);
  margin: 0 0 14px;
}

/* Monthly bars */
.month-bars {
  display: flex;
  gap: 6px;
  align-items: flex-end;
  height: 120px;
}
.month-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  height: 100%;
}
.month-track {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  background: var(--bar-track);
  border-radius: 4px;
  overflow: hidden;
}
.month-fill {
  width: 100%;
  background: linear-gradient(180deg, var(--accent), #8b5cf6);
  border-radius: 4px 4px 0 0;
  min-height: 2px;
  transition: height 0.4s ease;
}
.month-label {
  font-size: 10px;
  color: var(--text-tertiary);
}

/* Topics */
.topic-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.topic-tag {
  padding: 4px 10px;
  border-radius: 16px;
  background: var(--badge-bg);
  color: var(--text-secondary);
  font-weight: 500;
  line-height: 1.4;
}
.topic-tag b {
  color: var(--accent);
}

.empty-hint {
  font-size: 12px;
  color: var(--text-tertiary);
}

@media (max-width: 768px) {
  .hero-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .report-grid {
    grid-template-columns: 1fr;
  }
  .comp-sub {
    width: auto;
  }
}
</style>
