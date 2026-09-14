import { computed } from 'vue'
import type { InboxItem, WorkbenchData } from '../engine/types'
import { useI18n } from '../i18n'

// Static import — Vite bundles this at build time (zero runtime API calls)
import inbox from '../data/workbench.json'

const data = computed<WorkbenchData>(() => inbox as unknown as WorkbenchData)

const enabled = computed<boolean>(() => data.value.enabled === true)
const counts = computed(
  () => data.value.counts || { review: 0, assigned: 0, fork_behind: 0 }
)
const items = computed<InboxItem[]>(() => data.value.items || [])
const updatedAt = computed<string | null>(() => data.value.generated_at || null)

/**
 * True when the inbox hasn't refreshed for 36h+ — the scheduled Action was
 * paused (repo inactive for 60 days) or never enabled after a fork.
 */
const isStale = computed<boolean>(() => {
  const ts = updatedAt.value
  if (!ts) return true
  const t = new Date(ts).getTime()
  if (!Number.isFinite(t)) return true
  return Date.now() - t > 36 * 3600 * 1000
})

function itemsOfKind(kind: InboxItem['kind']): InboxItem[] {
  return items.value.filter((i) => i.kind === kind)
}

export function useWorkbench() {
  const { t } = useI18n()

  /** ISO timestamp → "3 小时前". Falls back to an empty string for bad input. */
  function relative(iso: string): string {
    if (!iso) return ''
    const then = new Date(iso).getTime()
    if (!Number.isFinite(then)) return ''
    const mins = Math.floor((Date.now() - then) / 60000)
    if (mins < 1) return t('ago.justNow')
    if (mins < 60) return t('ago.minutes', { n: mins })
    const hours = Math.floor(mins / 60)
    if (hours < 24) return t('ago.hours', { n: hours })
    const days = Math.floor(hours / 24)
    if (days < 30) return t('ago.days', { n: days })
    const months = Math.floor(days / 30)
    if (months < 12) return t('ago.months', { n: months })
    return t('ago.years', { n: Math.floor(months / 12) })
  }

  return { data, enabled, counts, items, updatedAt, isStale, itemsOfKind, relative }
}
