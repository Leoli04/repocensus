<script setup lang="ts">
import { computed } from 'vue'
import { useRepos } from '../composables/useRepos'
import { computeAnnualReport, type AnnualReport as AnnualReportData } from '../engine/annualReport'
import { useI18n } from '../i18n'

const { data } = useRepos()
const { t, locale } = useI18n()

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

const monthLabels = computed(() =>
  locale.value === 'zh'
    ? ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
)

function monthLabel(m: number): string {
  return monthLabels.value[m - 1]
}
</script>

<template>
  <div class="annual-report">
    <h3 class="section-title">🎉 {{ t('annual.title', { year: report.year }) }}</h3>

    <!-- Hero stats -->
    <div class="hero-grid">
      <div class="hero-card primary">
        <span class="hero-value">{{ report.originalThisYear + report.forkThisYear }}</span>
        <span class="hero-label">{{ t('annual.newRepos') }}</span>
        <span class="hero-sub">{{ t('annual.newSub', { o: report.originalThisYear, f: report.forkThisYear }) }}</span>
      </div>
      <div class="hero-card">
        <span class="hero-value">{{ report.totalStarsReceived.toLocaleString() }}</span>
        <span class="hero-label">{{ t('annual.totalStars') }}</span>
        <span class="hero-sub">{{ t('annual.starsSub', { n: report.starsThisYear.toLocaleString() }) }}</span>
      </div>
      <div class="hero-card">
        <span class="hero-value">{{ report.healthAvg }}</span>
        <span class="hero-label">{{ t('annual.avgHealth') }}</span>
        <span class="hero-sub">{{ t('annual.avgHealthSub') }}</span>
      </div>
      <div class="hero-card star">
        <span class="hero-value">{{ report.starTotal }}</span>
        <span class="hero-label">⭐ {{ t('annual.starred') }}</span>
        <span class="hero-sub">{{ t('annual.starredSub', { n: report.starThisYear }) }}</span>
      </div>
    </div>

    <!-- Composition: three categories -->
    <div class="report-card full">
      <h4 class="card-title">📊 {{ t('annual.composition') }}</h4>
      <div class="composition">
        <div class="comp-row">
          <span class="comp-icon">🏠</span>
          <span class="comp-name">{{ t('annual.ownRepos') }}</span>
          <span class="comp-total">{{ report.originalTotal }}</span>
          <span class="comp-sub">{{ t('annual.createdThisYear', { n: report.originalThisYear }) }}</span>
        </div>
        <div class="comp-row">
          <span class="comp-icon">🍴</span>
          <span class="comp-name">{{ t('annual.forkRepos') }}</span>
          <span class="comp-total">{{ report.forkTotal }}</span>
          <span class="comp-sub">{{ t('annual.forkedThisYear', { n: report.forkThisYear }) }}</span>
        </div>
        <div class="comp-row star">
          <span class="comp-icon">⭐</span>
          <span class="comp-name">{{ t('annual.starRepos') }}</span>
          <span class="comp-total">{{ report.starTotal }}</span>
          <span class="comp-sub">{{ t('annual.starredSub', { n: report.starThisYear }) }} {{ t('annual.starNote') }}</span>
        </div>
      </div>
    </div>

    <!-- Languages & Domains (own repos) -->
    <div class="report-grid">
      <div class="report-card">
        <h4 class="card-title">🔧 {{ t('annual.topLanguages') }}</h4>
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
          <div v-if="!report.topLanguages.length" class="empty-hint">{{ t('annual.noLang') }}</div>
        </div>
      </div>

      <div class="report-card">
        <h4 class="card-title">📂 {{ t('annual.topDomains') }}</h4>
        <div class="domain-chips">
          <span v-for="dom in report.topDomains" :key="dom.name" class="domain-chip">
            {{ dom.name }} <b>{{ dom.count }}</b>
          </span>
          <span v-if="!report.topDomains.length" class="empty-hint">{{ t('annual.noDomain') }}</span>
        </div>
      </div>
    </div>

    <!-- Interests: starred repos -->
    <div class="report-card full">
      <h4 class="card-title">⭐ {{ t('annual.interests', { n: report.starTotal }) }}</h4>
      <p class="interest-note">{{ t('annual.interestNote') }}</p>
      <div class="report-grid inner">
        <div class="report-card inner-card">
          <h5 class="inner-title">{{ t('annual.starredLang') }}</h5>
          <div class="domain-chips">
            <span v-for="lang in report.starredLangTop" :key="lang.name" class="domain-chip alt">
              {{ lang.name }} <b>{{ lang.count }}</b>
            </span>
            <span v-if="!report.starredLangTop.length" class="empty-hint">{{ t('common.none') }}</span>
          </div>
        </div>
        <div class="report-card inner-card">
          <h5 class="inner-title">{{ t('annual.starredTopic') }}</h5>
          <div class="topic-cloud">
            <span
              v-for="tt in report.starredTopicTop"
              :key="tt.name"
              class="topic-tag"
              :style="{ fontSize: 11 + Math.min(tt.count, 40) / 3 + 'px' }"
            >
              #{{ tt.name }} <b>{{ tt.count }}</b>
            </span>
            <span v-if="!report.starredTopicTop.length" class="empty-hint">{{ t('common.none') }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Monthly activity heatmap (own repos) -->
    <div class="report-card full">
      <h4 class="card-title">📅 {{ t('annual.monthly', { year: report.year }) }}</h4>
      <div class="month-bars">
        <div v-for="m in report.monthlyActivity" :key="m.month" class="month-col">
          <div class="month-track">
            <div
              class="month-fill"
              :style="{ height: ((m.created + m.pushed) / maxMonthly) * 100 + '%' }"
              :title="t('annual.monthTip', { m: monthLabel(m.month), c: m.created, p: m.pushed })"
            />
          </div>
          <span class="month-label">{{ monthLabel(m.month) }}</span>
        </div>
      </div>
    </div>

    <!-- Top topics (own repos) -->
    <div class="report-card full">
      <h4 class="card-title">🔥 {{ t('annual.topTopics') }}</h4>
      <div class="topic-cloud">
        <span
          v-for="tt in report.topTopics"
          :key="tt.name"
          class="topic-tag"
          :style="{ fontSize: 11 + Math.min(tt.count, 40) / 3 + 'px' }"
        >
          #{{ tt.name }} <b>{{ tt.count }}</b>
        </span>
        <span v-if="!report.topTopics.length" class="empty-hint">{{ t('annual.noTopic') }}</span>
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
