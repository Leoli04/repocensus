<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Repo } from '../engine/types'
import { healthLabel } from '../engine/health'
import { daysSince } from '../engine/categorizer'
import { useI18n } from '../i18n'
import { useRepoMeta } from '../composables/useRepoMeta'

const props = defineProps<{ repo: Repo; showCategory?: boolean }>()
const { t, catLabel } = useI18n()
const { getMeta, setNote, setTags } = useRepoMeta()

const typeIcon: Record<string, string> = {
  original: '🛠️',
  fork: '🍴',
  star: '⭐',
}

function typeText(type: string): string {
  if (type === 'original') return t('repo.typeOriginal')
  if (type === 'fork') return t('repo.typeFork')
  return t('repo.typeStar')
}

function formatStars(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

function formatUpdate(dateStr: string): string {
  const days = daysSince(dateStr)
  if (days <= 0) return t('star.today')
  if (days === 1) return t('star.yesterday')
  if (days < 30) return t('star.daysAgo', { n: days })
  if (days < 365) return t('star.monthsAgo', { n: Math.floor(days / 30) })
  return t('star.yearsAgo', { n: Math.floor(days / 365) })
}

const health = computed(() => {
  const hl = healthLabel(props.repo.health_score)
  const labelKey =
    props.repo.health_score >= 70
      ? 'repo.healthHealthy'
      : props.repo.health_score >= 40
        ? 'repo.healthFair'
        : 'repo.healthRisk'
  return { ...hl, label: t(labelKey) }
})
const updateColor = computed(() => {
  const days = daysSince(props.repo.updated_at)
  if (days <= 180) return '#22c55e'
  if (days <= 730) return '#f59e0b'
  return '#ef4444'
})

// ── Note / tag editor ─────────────────────────────────────
const editing = ref(false)
const noteText = ref('')
const tagInput = ref('')

const meta = computed(() => getMeta(props.repo.id))

function openEditor() {
  noteText.value = getMeta(props.repo.id).note
  editing.value = true
}
function saveNote() {
  setNote(props.repo.id, noteText.value)
}
function addTag() {
  const v = tagInput.value.trim()
  if (!v) return
  const cur = getMeta(props.repo.id).tags
  if (!cur.includes(v)) setTags(props.repo.id, [...cur, v])
  tagInput.value = ''
}
function removeTag(tag: string) {
  const cur = getMeta(props.repo.id).tags
  setTags(props.repo.id, cur.filter((x) => x !== tag))
}
</script>

<template>
  <div class="repo-card" :class="{ editing }">
    <!-- Health bar at top -->
    <div class="health-bar" :style="{ background: health.color }" />

    <a class="card-main" :href="repo.html_url" target="_blank" rel="noopener">
      <div class="card-header">
        <span class="type-icon" :title="typeText(repo.type)">{{ typeIcon[repo.type] }}</span>
        <span class="repo-name">{{ repo.name }}</span>
        <span v-if="repo.is_new" class="new-badge">{{ t('repo.new') }}</span>
      </div>

      <p class="repo-desc">{{ repo.description || t('repo.noDesc') }}</p>

      <div class="card-meta">
        <div class="badges">
          <span v-if="showCategory && repo.category" class="badge cat-badge">{{ catLabel(repo.category) }}</span>
          <span v-if="repo.language" class="badge lang-badge">{{ repo.language }}</span>
          <span class="badge star-badge">⭐ {{ formatStars(repo.stargazers_count) }}</span>
        </div>
        <div class="meta-row">
          <span class="health-score" :style="{ color: health.color }" :title="t('repo.healthTitle', { n: repo.health_score })">
            {{ health.label }} {{ repo.health_score }}
          </span>
          <span class="update-time" :style="{ color: updateColor }">
            📅 {{ formatUpdate(repo.updated_at) }}
          </span>
        </div>
        <span v-if="repo.fork && repo.parent_full_name" class="fork-source">
          {{ t('repo.fromFork', { name: repo.parent_full_name }) }}
        </span>
      </div>
    </a>

    <!-- Custom tags (always visible if any) -->
    <div class="meta-tags" v-if="meta.tags.length && !editing">
      <span v-for="tag in meta.tags" :key="tag" class="meta-tag">#{{ tag }}</span>
    </div>

    <!-- Note button -->
    <button class="note-btn" :title="t('repo.noteAdd')" @click.stop="openEditor">
      📝
    </button>

    <!-- Editor panel -->
    <div v-if="editing" class="editor" @click.stop>
      <textarea
        v-model="noteText"
        class="note-input"
        :placeholder="t('repo.notePlaceholder')"
        @blur="saveNote"
      />
      <div class="tag-edit">
        <span v-for="tag in meta.tags" :key="tag" class="tag-chip">
          #{{ tag }}
          <button class="tag-x" @click="removeTag(tag)" title="remove">×</button>
        </span>
      </div>
      <input
        v-model="tagInput"
        class="tag-input"
        :placeholder="t('repo.tagPlaceholder')"
        @keydown.enter.prevent="addTag"
      />
      <div class="editor-actions">
        <button class="editor-done" @click="editing = false">{{ t('recommend.collapse') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.repo-card {
  position: relative;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
  overflow: hidden;
}

.repo-card:hover {
  transform: translateY(-2px);
  border-color: var(--accent);
  box-shadow: 0 4px 20px var(--shadow-color);
}

.health-bar {
  height: 3px;
  width: 100%;
}

.card-main {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px;
  text-decoration: none;
  color: var(--text-primary);
  flex: 1;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.type-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.repo-name {
  font-weight: 600;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.new-badge {
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  background: #22c55e;
  color: #fff;
  flex-shrink: 0;
  margin-left: auto;
}

.repo-desc {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
  margin: 0;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
}

.badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--badge-bg);
  color: var(--text-secondary);
  white-space: nowrap;
}

.cat-badge {
  background: var(--accent-bg);
  color: var(--accent);
  font-weight: 500;
}

.lang-badge {
  background: var(--lang-bg);
  color: var(--lang-text);
}

.meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.health-score {
  font-size: 11px;
  font-weight: 600;
}

.update-time {
  font-size: 11px;
}

.fork-source {
  font-size: 10px;
  color: var(--text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Custom tags */
.meta-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 0 16px 10px;
}

.meta-tag {
  font-size: 10px;
  color: var(--accent);
  background: var(--accent-bg);
  padding: 1px 7px;
  border-radius: 8px;
}

/* Note button */
.note-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  cursor: pointer;
  font-size: 13px;
  opacity: 0;
  transition: opacity 0.15s, border-color 0.15s;
  z-index: 2;
}

.repo-card:hover .note-btn,
.repo-card.editing .note-btn {
  opacity: 1;
}

.note-btn:hover {
  border-color: var(--accent);
}

/* Editor */
.editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 16px 14px;
  border-top: 1px solid var(--card-border);
  padding-top: 12px;
}

.note-input {
  width: 100%;
  min-height: 56px;
  resize: vertical;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  color: var(--text-primary);
  font-size: 12px;
  font-family: inherit;
  outline: none;
  box-sizing: border-box;
}

.note-input:focus {
  border-color: var(--accent);
}

.tag-edit {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tag-chip {
  font-size: 10px;
  color: var(--accent);
  background: var(--accent-bg);
  padding: 2px 6px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.tag-x {
  border: none;
  background: none;
  color: var(--accent);
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  padding: 0;
}

.tag-input {
  width: 100%;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  color: var(--text-primary);
  font-size: 12px;
  outline: none;
  box-sizing: border-box;
}

.tag-input:focus {
  border-color: var(--accent);
}

.editor-actions {
  display: flex;
  justify-content: flex-end;
}

.editor-done {
  padding: 4px 14px;
  border-radius: 8px;
  border: 1px solid var(--accent);
  background: var(--accent);
  color: #fff;
  font-size: 12px;
  cursor: pointer;
}
</style>
