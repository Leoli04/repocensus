<script setup lang="ts">
import { computed } from 'vue'
import type { ChangeSnapshot } from '../engine/types'
import { computeTrends } from '../engine/trends'
import { useI18n } from '../i18n'

const props = defineProps<{ history?: ChangeSnapshot[] }>()
const { t, locale } = useI18n()

const trends = computed(() => computeTrends(props.history))

function fmtDate(iso: string): string {
  const loc = locale.value === 'zh' ? 'zh-CN' : 'en-US'
  return new Date(iso).toLocaleDateString(loc, { month: '2-digit', day: '2-digit' })
}

// ── Global line chart geometry ─────────────────────────────
const W = 640
const H = 180
const PAD_L = 44
const PAD_R = 12
const PAD_T = 14
const PAD_B = 24

const globalPath = computed(() => {
  const pts = trends.value.global
  if (pts.length < 2) return ''
  const max = Math.max(...pts.map((p) => p.total))
  const min = Math.min(...pts.map((p) => p.total))
  const range = max - min || 1
  const step = (W - PAD_L - PAD_R) / (pts.length - 1)
  return pts
    .map((p, i) => {
      const x = PAD_L + i * step
      const y = PAD_T + (1 - (p.total - min) / range) * (H - PAD_T - PAD_B)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
})

const globalAreaPath = computed(() => {
  const path = globalPath.value
  if (!path) return ''
  const pts = trends.value.global
  const max = Math.max(...pts.map((p) => p.total))
  const min = Math.min(...pts.map((p) => p.total))
  const range = max - min || 1
  const step = (W - PAD_L - PAD_R) / (pts.length - 1)
  const lastX = PAD_L + (pts.length - 1) * step
  const baseY = H - PAD_B
  return `${path} L${lastX.toFixed(1)},${baseY} L${PAD_L},${baseY} Z`
})

const yTicks = computed(() => {
  const pts = trends.value.global
  if (pts.length < 2) return []
  const max = Math.max(...pts.map((p) => p.total))
  const min = Math.min(...pts.map((p) => p.total))
  const range = max - min || 1
  return [0, 0.5, 1].map((f) => {
    const value = Math.round(max - f * range)
    const y = PAD_T + f * (H - PAD_T - PAD_B)
    return { value, y }
  })
})

const xLabels = computed(() => {
  const pts = trends.value.global
  if (pts.length < 2) return []
  const step = (W - PAD_L - PAD_R) / (pts.length - 1)
  // Show first / middle / last labels
  const idx = [0, Math.floor((pts.length - 1) / 2), pts.length - 1].filter(
    (v, i, a) => a.indexOf(v) === i
  )
  return idx.map((i) => ({
    x: PAD_L + i * step,
    label: fmtDate(pts[i].date),
  }))
})

const globalDelta = computed(() => {
  const g = trends.value.global
  if (g.length < 2) return 0
  return g[g.length - 1].total - g[0].total
})

function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

// Per-repo sparkline path
function sparkPath(points: number[], w = 88, h = 26): string {
  if (points.length < 2) return ''
  const max = Math.max(...points)
  const min = Math.min(...points)
  const range = max - min || 1
  const step = w / (points.length - 1)
  return points
    .map((v, i) => {
      const x = i * step
      const y = 2 + (1 - (v - min) / range) * (h - 4)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}
</script>

<template>
  <section class="trend-chart">
    <h3 class="section-title">{{ t('trend.title') }}</h3>
    <p class="section-subtitle">
      {{ t('trend.subtitle', { n: trends.windowCount }) }}
    </p>

    <div v-if="trends.global.length < 2" class="empty-state">
      {{ t('trend.noHistory') }}
    </div>

    <template v-else>
      <!-- Global star history -->
      <div class="chart-card">
        <div class="chart-header">
          <span class="chart-name">{{ t('trend.totalStars') }}</span>
          <span :class="['chart-delta', { up: globalDelta > 0 }]">
            {{ globalDelta > 0 ? '+' : '' }}{{ fmtCompact(globalDelta) }}
          </span>
        </div>
        <svg :viewBox="`0 0 ${W} ${H}`" class="global-svg" role="img">
          <g v-for="tick in yTicks" :key="tick.value">
            <line :x1="PAD_L" :x2="W - PAD_R" :y1="tick.y" :y2="tick.y" class="grid-line" />
            <text :x="PAD_L - 6" :y="tick.y + 3" class="tick-label" text-anchor="end">
              {{ fmtCompact(tick.value) }}
            </text>
          </g>
          <path v-if="globalAreaPath" :d="globalAreaPath" class="area" />
          <path :d="globalPath" class="line" />
          <text
            v-for="lbl in xLabels"
            :key="lbl.x"
            :x="lbl.x"
            :y="H - 6"
            class="tick-label"
            text-anchor="middle"
          >
            {{ lbl.label }}
          </text>
        </svg>
      </div>

      <!-- Top movers sparklines -->
      <div v-if="trends.topRepos.length" class="spark-section">
        <h4 class="spark-title">{{ t('trend.topRepos') }}</h4>
        <div class="spark-grid">
          <a
            v-for="r in trends.topRepos"
            :key="r.full_name"
            :href="r.url"
            target="_blank"
            rel="noopener"
            class="spark-card"
          >
            <div class="spark-info">
              <span class="spark-name">{{ r.full_name }}</span>
              <span class="spark-delta">+{{ fmtCompact(r.delta) }}</span>
            </div>
            <svg :viewBox="`0 0 88 26`" class="spark-svg">
              <path :d="sparkPath(r.points)" class="spark-line" />
            </svg>
          </a>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.trend-chart {
  margin-top: 32px;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 4px;
  color: var(--text-primary);
}

.section-subtitle {
  font-size: 13px;
  color: var(--text-tertiary);
  margin: 0 0 16px;
}

.empty-state {
  text-align: center;
  padding: 32px;
  color: var(--text-tertiary);
  font-size: 14px;
  background: var(--card-bg);
  border: 1px dashed var(--card-border);
  border-radius: 12px;
}

.chart-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  padding: 16px 18px;
  margin-bottom: 20px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.chart-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.chart-delta {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-tertiary);
}

.chart-delta.up {
  color: var(--heat-lv3);
}

.global-svg {
  width: 100%;
  height: auto;
  display: block;
}

.grid-line {
  stroke: var(--card-border);
  stroke-width: 1;
  stroke-dasharray: 3, 4;
}

.tick-label {
  font-size: 10px;
  fill: var(--text-tertiary);
}

.area {
  fill: var(--accent);
  opacity: 0.1;
}

.line {
  fill: none;
  stroke: var(--accent);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.spark-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 10px;
  color: var(--text-primary);
}

.spark-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 10px;
}

.spark-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  border-radius: 10px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  text-decoration: none;
  transition: border-color 0.15s;
}

.spark-card:hover {
  border-color: var(--accent);
}

.spark-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.spark-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.spark-delta {
  font-size: 12px;
  font-weight: 700;
  color: var(--heat-lv3);
  flex-shrink: 0;
}

.spark-svg {
  width: 100%;
  height: 26px;
  display: block;
}

.spark-line {
  fill: none;
  stroke: var(--heat-lv3);
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
