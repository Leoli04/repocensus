<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from '../i18n'
import { useWorkbench } from '../composables/useWorkbench'
import { useBookmarks } from '../composables/useBookmarks'
import { useRepos } from '../composables/useRepos'
import type { StaleRepo } from '../engine/types'

const { t } = useI18n()
const { enabled, counts, items, updatedAt, relative } = useWorkbench()
const {
  groups,
  bookmarksByGroup,
  isExample,
  healthMap,
  deadLinks,
  unreachableCount,
  checking,
  checkHealth,
  addBookmark,
  removeBookmark,
  resetToExample,
  exportJSON,
  importJSON,
} = useBookmarks()
const { data } = useRepos()

/** How many silent repos to surface in the to-do list before collapsing */
const MAX_STALE_ROWS = 3

const stampText = computed(() => {
  const ts = updatedAt.value
  const ago = ts ? relative(ts) : ''
  return ago ? t('wb.updated', { time: ago }) : t('wb.never')
})

const metrics = computed(() => [
  { key: 'review', label: t('wb.mReview'), value: counts.value.review, tone: 'info' },
  { key: 'assigned', label: t('wb.mAssigned'), value: counts.value.assigned, tone: 'warn' },
  { key: 'fork', label: t('wb.mFork'), value: counts.value.fork_behind, tone: 'ok' },
  { key: 'dead', label: t('wb.mDead'), value: unreachableCount.value, tone: 'bad' },
])

interface TodoRow {
  key: string
  tone: string
  primary: string
  sub: string
  url: string
}

const staleRepos = computed<StaleRepo[]>(
  () => (data.value.stale_repos || []) as StaleRepo[]
)

/**
 * The to-do list merges two sources: the collected GitHub inbox, and the
 * silent self-built repos we already compute for the census. Nothing here
 * repeats the "here is my repo list" job of the other tabs — every row is
 * something to act on.
 */
const todoRows = computed<TodoRow[]>(() => {
  const rows: TodoRow[] = []

  for (const it of items.value) {
    const num = it.number != null ? ` #${it.number}` : ''
    if (it.kind === 'review') {
      rows.push({
        key: `review-${it.repo}-${it.number}`,
        tone: 'info',
        primary: `${it.repo} · ${t('wb.awaitReview')}${num}`,
        sub: relative(it.updated_at),
        url: it.html_url,
      })
    } else if (it.kind === 'assigned') {
      rows.push({
        key: `assigned-${it.repo}-${it.number}`,
        tone: 'warn',
        primary: `${it.repo} · ${t('wb.awaitHandle')}${num}`,
        sub: relative(it.updated_at),
        url: it.html_url,
      })
    } else {
      rows.push({
        key: `fork-${it.repo}`,
        tone: 'ok',
        primary: it.repo,
        sub: t('wb.behindUpstream', { n: it.behind || 0 }),
        url: it.html_url,
      })
    }
  }

  for (const s of staleRepos.value.slice(0, MAX_STALE_ROWS)) {
    const years = Math.max(1, Math.floor(s.days_since_update / 365))
    rows.push({
      key: `stale-${s.repo.full_name}`,
      tone: 'mute',
      primary: s.repo.name,
      sub: t('wb.staleRow', { years, stars: s.repo.stargazers_count }),
      url: s.repo.html_url,
    })
  }

  return rows
})

const hiddenStale = computed(() => Math.max(0, staleRepos.value.length - MAX_STALE_ROWS))

// ── Quick-launch editing ──────────────────────────────────
const showAdd = ref(false)
const addName = ref('')
const addUrl = ref('')
const addGroup = ref('')
const addFailed = ref(false)
const importMsg = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

function submitAdd() {
  const ok = addBookmark({
    name: addName.value,
    url: addUrl.value,
    group: addGroup.value || groups.value[0] || t('wb.ungrouped'),
  })
  if (!ok) {
    addFailed.value = true
    return
  }
  addFailed.value = false
  showAdd.value = false
  addName.value = ''
  addUrl.value = ''
  addGroup.value = ''
}

function triggerImport() {
  fileInput.value?.click()
}

async function onFilePicked(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const text = await file.text()
  const n = importJSON(text)
  importMsg.value = n > 0 ? t('wb.imported', { n }) : t('wb.importFailed')
  input.value = ''
}

function onReset() {
  resetToExample()
  importMsg.value = t('wb.resetDone')
}

onMounted(() => {
  // Cached for 24h, so this is at most one round of probes per day.
  checkHealth()
})
</script>

<template>
  <div class="wb">
    <header class="wb-head">
      <div>
        <h2 class="wb-title">{{ t('wb.title') }}</h2>
        <p class="wb-sub">{{ t('wb.subtitle') }}</p>
      </div>
      <span class="wb-stamp">{{ stampText }}</span>
    </header>

    <section class="wb-metrics">
      <div v-for="m in metrics" :key="m.key" class="wb-metric">
        <span class="wb-metric-label">{{ m.label }}</span>
        <span class="wb-metric-value" :class="`tone-${m.tone}`">{{ m.value }}</span>
      </div>
    </section>

    <section class="wb-grid">
      <!-- My to-dos -->
      <div class="wb-panel">
        <div class="wb-panel-head">
          <span class="wb-panel-title">{{ t('wb.inbox') }}</span>
          <span class="wb-panel-src">{{ t('wb.inboxSrc') }}</span>
        </div>

        <p v-if="!enabled" class="wb-note">{{ t('wb.disabled') }}</p>
        <p v-else-if="!todoRows.length" class="wb-empty">{{ t('wb.empty') }}</p>
        <template v-else>
          <a
            v-for="row in todoRows"
            :key="row.key"
            class="wb-row"
            :href="row.url"
            target="_blank"
            rel="noopener"
          >
            <span class="wb-row-bar" :class="`tone-${row.tone}`"></span>
            <span class="wb-row-body">
              <span class="wb-row-primary">{{ row.primary }}</span>
              <span class="wb-row-sub">{{ row.sub }}</span>
            </span>
          </a>
          <p v-if="hiddenStale > 0" class="wb-more">{{ t('wb.staleMore', { n: hiddenStale }) }}</p>
        </template>
      </div>

      <!-- Quick launch -->
      <div class="wb-panel">
        <div class="wb-panel-head">
          <span class="wb-panel-title">{{ t('wb.launch') }}</span>
          <span class="wb-panel-src">{{ t('wb.launchSrc') }}</span>
        </div>

        <div class="wb-tools">
          <button class="wb-tool" @click="triggerImport">{{ t('wb.import') }}</button>
          <button class="wb-tool" @click="exportJSON">{{ t('wb.export') }}</button>
          <button class="wb-tool" :disabled="checking" @click="checkHealth(true)">
            {{ checking ? t('wb.checking') : t('wb.check') }}
          </button>
          <button class="wb-tool" @click="onReset">{{ t('wb.reset') }}</button>
          <input
            ref="fileInput"
            class="wb-file"
            type="file"
            accept="application/json,.json"
            @change="onFilePicked"
          />
        </div>

        <p v-if="importMsg" class="wb-note">{{ importMsg }}</p>

        <div v-for="g in bookmarksByGroup" :key="g.group" class="wb-group">
          <p class="wb-group-title">{{ g.group }}</p>
          <div class="wb-tiles">
            <div
              v-for="b in g.items"
              :key="b.id"
              class="wb-tile"
              :class="{ dead: healthMap[b.url] === 'dead' }"
            >
              <a
                class="wb-tile-hit"
                :href="b.url"
                target="_blank"
                rel="noopener"
                :title="b.url"
              >
                <span class="wb-tile-badge">{{ b.badge }}</span>
                <span class="wb-tile-name">{{ b.name }}</span>
                <span v-if="healthMap[b.url] === 'dead'" class="wb-tile-dead">
                  {{ t('wb.unreachable') }}
                </span>
                <span v-else class="wb-tile-meta">{{ b.description || b.group }}</span>
              </a>
              <button
                class="wb-tile-del"
                :title="t('wb.remove')"
                :aria-label="`${t('wb.remove')} ${b.name}`"
                @click="removeBookmark(b.id)"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        <p v-if="!bookmarksByGroup.length" class="wb-empty">{{ t('wb.emptyBookmarks') }}</p>

        <button v-if="!showAdd" class="wb-add" @click="showAdd = true">
          ＋ {{ t('wb.add') }}
        </button>
        <form v-else class="wb-add-form" @submit.prevent="submitAdd">
          <input v-model="addName" class="wb-input" :placeholder="t('wb.fName')" />
          <input v-model="addUrl" class="wb-input" type="url" :placeholder="t('wb.fUrl')" />
          <input v-model="addGroup" class="wb-input" :placeholder="t('wb.fGroup')" />
          <div class="wb-add-actions">
            <button type="submit" class="wb-tool primary">{{ t('wb.save') }}</button>
            <button type="button" class="wb-tool" @click="showAdd = false">{{ t('wb.cancel') }}</button>
          </div>
          <p v-if="addFailed" class="wb-note bad">{{ t('wb.addFailed') }}</p>
        </form>

        <p v-if="isExample" class="wb-hint">{{ t('wb.exampleHint') }}</p>
      </div>
    </section>

    <div v-if="deadLinks.length" class="wb-alert">
      <span class="wb-alert-dot"></span>
      <span>{{ t('wb.deadHint', { n: deadLinks.length }) }}</span>
      <span class="wb-alert-list">{{ deadLinks.map((d) => d.name).join(' · ') }}</span>
    </div>
  </div>
</template>

<style scoped>
.wb {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Header */
.wb-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
}

.wb-title {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 4px;
  color: var(--text-primary);
}

.wb-sub {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
}

.wb-stamp {
  font-size: 12px;
  color: var(--text-tertiary);
  white-space: nowrap;
}

/* Metric cards */
.wb-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.wb-metric {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.wb-metric-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.wb-metric-value {
  font-size: 26px;
  font-weight: 700;
  line-height: 1.1;
}

.tone-info {
  color: var(--accent);
}
.tone-warn {
  color: #f59e0b;
}
.tone-ok {
  color: #10b981;
}
.tone-bad {
  color: #ef4444;
}
.tone-mute {
  color: var(--text-tertiary);
}

/* Two-column body */
.wb-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
}

.wb-panel {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  padding: 16px 18px;
  min-width: 0;
}

.wb-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.wb-panel-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.wb-panel-src {
  font-size: 11px;
  color: var(--text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* To-do rows */
.wb-row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 8px 10px;
  border-radius: 8px;
  text-decoration: none;
  transition: background 0.15s;
}

.wb-row:hover {
  background: var(--accent-bg);
}

.wb-row-bar {
  width: 4px;
  border-radius: 2px;
  flex-shrink: 0;
  align-self: stretch;
  min-height: 32px;
  background: currentColor;
}

.wb-row-body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.wb-row-primary {
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wb-row-sub {
  font-size: 11px;
  color: var(--text-tertiary);
}

.wb-more {
  font-size: 12px;
  color: var(--text-tertiary);
  margin: 8px 0 0;
  padding-left: 10px;
}

/* Quick launch */
.wb-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.wb-tool {
  padding: 5px 10px;
  border-radius: 7px;
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.wb-tool:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}

.wb-tool:disabled {
  opacity: 0.5;
  cursor: default;
}

.wb-tool.primary {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.wb-file {
  display: none;
}

.wb-group {
  margin-bottom: 12px;
}

.wb-group-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.4px;
  margin: 0 0 6px;
}

.wb-tiles {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.wb-tile {
  position: relative;
  border-radius: 10px;
  background: var(--bg-secondary);
  border: 1px solid transparent;
  transition: border-color 0.15s;
  min-width: 0;
}

.wb-tile:hover {
  border-color: var(--accent);
}

.wb-tile.dead {
  opacity: 0.6;
}

/* The link fills the tile; the delete button is a sibling of it rather than a
   child, so the markup stays valid and the × can never trigger navigation. */
.wb-tile-hit {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px;
  border-radius: 10px;
  text-decoration: none;
  min-width: 0;
}

.wb-tile-badge {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: var(--accent-bg);
  color: var(--accent);
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 5px;
}

.wb-tile.dead .wb-tile-badge {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.wb-tile-name {
  font-size: 12px;
  color: var(--text-primary);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wb-tile-meta {
  font-size: 11px;
  color: var(--text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wb-tile-dead {
  font-size: 11px;
  color: #ef4444;
}

.wb-tile-del {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 18px;
  height: 18px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  font-size: 14px;
  line-height: 1;
  border-radius: 5px;
  cursor: pointer;
  /* Always visible (not hover-only): hover does not exist on touch devices,
     and a control nobody can see is a control nobody can use. */
  opacity: 0.35;
  transition: opacity 0.15s, color 0.15s, background 0.15s;
}

.wb-tile:hover .wb-tile-del,
.wb-tile-del:focus-visible {
  opacity: 1;
}

.wb-tile-del:hover {
  color: #ef4444;
  background: var(--badge-bg);
}

/* Add form */
.wb-add {
  width: 100%;
  padding: 9px;
  border-radius: 9px;
  border: 1px dashed var(--card-border);
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.wb-add:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.wb-add-form {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.wb-input {
  width: 100%;
  padding: 7px 10px;
  border-radius: 7px;
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  color: var(--text-primary);
  font-size: 12px;
  outline: none;
  box-sizing: border-box;
}

.wb-input:focus {
  border-color: var(--accent);
}

.wb-add-actions {
  display: flex;
  gap: 6px;
}

/* Notes / alerts */
.wb-note {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0 0 10px;
}

.wb-note.bad {
  color: #ef4444;
}

.wb-empty {
  font-size: 13px;
  color: var(--text-tertiary);
  margin: 0;
  padding: 12px 0;
}

.wb-hint {
  font-size: 11px;
  color: var(--text-tertiary);
  line-height: 1.5;
  margin: 10px 0 0;
}

.wb-alert {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(239, 68, 68, 0.1);
  font-size: 12px;
  color: #ef4444;
  flex-wrap: wrap;
}

.wb-alert-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ef4444;
  flex-shrink: 0;
}

.wb-alert-list {
  color: var(--text-tertiary);
}

/* Responsive */
@media (max-width: 768px) {
  .wb-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .wb-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .wb-tiles {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
