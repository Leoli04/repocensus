<script setup lang="ts">
import { computed } from 'vue'
import type { Repo } from '../engine/types'
import { useI18n } from '../i18n'

const props = defineProps<{ repos: Repo[] }>()
const { t } = useI18n()

const WEEKS = 52

interface DayCell {
  date: string
  count: number
  level: number // 0-4 intensity
  future: boolean
}

// ── Aggregate push activity per day (last 52 weeks) ───────
const grid = computed<{ weeks: DayCell[][]; max: number; monthLabels: { col: number; label: string }[] }>(() => {
  const counts = new Map<string, number>()
  for (const repo of props.repos) {
    if (!repo.pushed_at) continue
    const day = new Date(repo.pushed_at)
    day.setHours(0, 0, 0, 0)
    const key = day.toISOString().slice(0, 10)
    counts.set(key, (counts.get(key) || 0) + 1)
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Align the grid so it ends on today's weekday row
  const end = new Date(today)
  const start = new Date(today)
  start.setDate(start.getDate() - (WEEKS * 7 - 1))
  // Shift start to Sunday
  start.setDate(start.getDate() - start.getDay())

  const weeks: DayCell[][] = []
  const monthLabels: { col: number; label: string }[] = []
  let lastMonth = -1
  let max = 0

  const cursor = new Date(start)
  for (let w = 0; w < WEEKS; w++) {
    const col: DayCell[] = []
    for (let d = 0; d < 7; d++) {
      const iso = cursor.toISOString().slice(0, 10)
      const future = cursor.getTime() > today.getTime()
      const count = counts.get(iso) || 0
      if (count > max) max = count
      col.push({ date: iso, count, level: 0, future })
      cursor.setDate(cursor.getDate() + 1)
    }
    // Month label when the 1st of a new month falls in this column
    const monthOfFirst = new Date(start)
    monthOfFirst.setDate(start.getDate() + w * 7)
    if (monthOfFirst.getMonth() !== lastMonth) {
      lastMonth = monthOfFirst.getMonth()
      monthLabels.push({
        col: w,
        label: `${monthOfFirst.getMonth() + 1}`,
      })
    }
    weeks.push(col)
  }

  // Intensity levels (0-4) by quartile
  for (const week of weeks) {
    for (const cell of week) {
      if (cell.future || cell.count === 0) cell.level = 0
      else if (max === 1) cell.level = 2
      else cell.level = Math.min(4, Math.ceil((cell.count / max) * 4))
    }
  }

  return { weeks, max, monthLabels }
})

const activeDays = computed(
  () => grid.value.weeks.flat().filter((c) => !c.future && c.count > 0).length
)

function cellTitle(cell: DayCell): string {
  if (cell.future) return ''
  return t('heat.cellTitle', { date: cell.date, n: cell.count })
}
</script>

<template>
  <section class="heatmap">
    <div class="heatmap-header">
      <h3 class="section-title">🔥 {{ t('heat.title') }}</h3>
      <span class="heatmap-stat">{{ t('heat.activeDays', { n: activeDays }) }}</span>
    </div>
    <p class="section-subtitle">{{ t('heat.subtitle') }}</p>

    <div class="heatmap-scroll">
      <div class="heatmap-inner">
        <!-- Month labels -->
        <div class="month-row">
          <span
            v-for="m in grid.monthLabels"
            :key="m.col"
            class="month-label"
            :style="{ gridColumn: `${m.col + 1} / span 1` }"
          >
            {{ m.label }}
          </span>
        </div>
        <!-- Day grid -->
        <div class="day-grid">
          <template v-for="(week, wi) in grid.weeks" :key="wi">
            <div class="week-col">
              <span
                v-for="cell in week"
                :key="cell.date"
                :class="['day-cell', `lv-${cell.level}`, { future: cell.future }]"
                :title="cellTitle(cell)"
              />
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div class="legend">
      <span class="legend-text">{{ t('heat.less') }}</span>
      <span class="day-cell lv-0" />
      <span class="day-cell lv-1" />
      <span class="day-cell lv-2" />
      <span class="day-cell lv-3" />
      <span class="day-cell lv-4" />
      <span class="legend-text">{{ t('heat.more') }}</span>
    </div>
  </section>
</template>

<style scoped>
.heatmap {
  margin-top: 8px;
}

.heatmap-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 4px;
  color: var(--text-primary);
}

.heatmap-stat {
  font-size: 12px;
  color: var(--accent);
  font-weight: 600;
}

.section-subtitle {
  font-size: 13px;
  color: var(--text-tertiary);
  margin: 0 0 14px;
}

.heatmap-scroll {
  overflow-x: auto;
  padding-bottom: 6px;
}

.heatmap-inner {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  padding: 14px 16px 12px;
  min-width: 640px;
}

.month-row {
  display: grid;
  grid-template-columns: repeat(52, 1fr);
  gap: 3px;
  margin-bottom: 4px;
  padding-left: 0;
}

.month-label {
  font-size: 9px;
  color: var(--text-tertiary);
  white-space: nowrap;
}

.day-grid {
  display: flex;
  gap: 3px;
}

.week-col {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
}

.day-cell {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 2px;
  min-width: 9px;
  min-height: 9px;
}

/* Intensity levels — accent-based green scale */
.day-cell.lv-0 {
  background: var(--badge-bg);
}
.day-cell.future {
  opacity: 0.25;
}
.day-cell.lv-1 {
  background: rgba(34, 197, 94, 0.18);
}
.day-cell.lv-2 {
  background: rgba(34, 197, 94, 0.35);
}
.day-cell.lv-3 {
  background: rgba(34, 197, 94, 0.6);
}
.day-cell.lv-4 {
  background: #16a34a;
}

.legend {
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: flex-end;
  margin-top: 8px;
}

.legend .day-cell {
  width: 10px;
  height: 10px;
  min-width: 10px;
  min-height: 10px;
}

.legend-text {
  font-size: 10px;
  color: var(--text-tertiary);
  margin: 0 4px;
}
</style>
