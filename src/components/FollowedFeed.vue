<script setup lang="ts">
import { computed, ref } from 'vue'
import { useFollowed } from '../composables/useFollowed'
import { useI18n } from '../i18n'
import { daysSince } from '../engine/categorizer'

const { t, locale } = useI18n()
const { data, newCount } = useFollowed()

// Collapsed repos (default: repos without new releases are collapsed)
const collapsed = ref<Set<string>>(new Set())

function toggleCollapse(fullName: string) {
  const next = new Set(collapsed.value)
  if (next.has(fullName)) next.delete(fullName)
  else next.add(fullName)
  collapsed.value = next
}

const sortedRepos = computed(() => {
  const repos = [...data.value.repos]
  // Repos with new releases first, then by latest release date
  return repos.sort((a, b) => {
    const aNew = a.releases.some((r) => r.is_new) ? 1 : 0
    const bNew = b.releases.some((r) => r.is_new) ? 1 : 0
    if (aNew !== bNew) return bNew - aNew
    const aDate = a.releases[0]?.published_at || a.pushed_at || ''
    const bDate = b.releases[0]?.published_at || b.pushed_at || ''
    return bDate.localeCompare(aDate)
  })
})

function fmtDate(iso: string): string {
  const loc = locale.value === 'zh' ? 'zh-CN' : 'en-US'
  return new Date(iso).toLocaleDateString(loc, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function fmtAgo(iso: string): string {
  const days = daysSince(iso)
  if (days <= 0) return t('star.today')
  if (days === 1) return t('star.yesterday')
  if (days < 30) return t('star.daysAgo', { n: days })
  if (days < 365) return t('star.monthsAgo', { n: Math.floor(days / 30) })
  return t('star.yearsAgo', { n: Math.floor(days / 365) })
}
</script>

<template>
  <section class="followed-feed">
    <div class="feed-header">
      <h3 class="section-title">📡 {{ t('follow.title') }}</h3>
      <span v-if="newCount > 0" class="new-count">{{ t('follow.newCount', { n: newCount }) }}</span>
    </div>
    <p class="section-subtitle">{{ t('follow.subtitle', { date: fmtDate(data.generated_at) }) }}</p>

    <div v-if="!data.repos.length" class="empty-state">
      {{ t('follow.noConfig') }}
    </div>

    <div v-else class="repo-list">
      <div
        v-for="repo in sortedRepos"
        :key="repo.full_name"
        :class="['repo-block', { 'has-new': repo.releases.some((r) => r.is_new) }]"
      >
        <div class="repo-head" @click="toggleCollapse(repo.full_name)">
          <span class="repo-caret">{{ collapsed.has(repo.full_name) ? '▸' : '▾' }}</span>
          <a :href="repo.html_url" target="_blank" rel="noopener" class="repo-name" @click.stop>
            {{ repo.alias || repo.full_name }}
            <span v-if="repo.alias" class="repo-fullname">{{ repo.full_name }}</span>
          </a>
          <span v-if="repo.releases.some((r) => r.is_new)" class="new-badge">{{ t('follow.new') }}</span>
          <span class="repo-meta">
            {{ repo.releases.length ? t('follow.releaseCount', { n: repo.releases.length }) : t('follow.noRelease') }}
            <template v-if="repo.pushed_at"> · {{ t('follow.lastPush', { ago: fmtAgo(repo.pushed_at) }) }}</template>
          </span>
        </div>

        <ul v-if="!collapsed.has(repo.full_name) && repo.releases.length" class="release-list">
          <li v-for="rel in repo.releases" :key="rel.tag_name" :class="['release-item', { 'is-new': rel.is_new }]">
            <a :href="rel.html_url" target="_blank" rel="noopener" class="release-link">
              <span class="release-tag">{{ rel.tag_name }}</span>
              <span v-if="rel.is_new" class="release-new">{{ t('follow.new') }}</span>
              <span v-if="rel.prerelease" class="release-pre">pre</span>
              <span class="release-name">{{ rel.name || rel.tag_name }}</span>
              <span class="release-date">{{ fmtAgo(rel.published_at) }}</span>
            </a>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.followed-feed {
  margin-top: 32px;
}

.feed-header {
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

.new-count {
  font-size: 12px;
  font-weight: 700;
  color: #22c55e;
  background: rgba(34, 197, 94, 0.12);
  padding: 2px 10px;
  border-radius: 10px;
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

.repo-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.repo-block {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  overflow: hidden;
}

.repo-block.has-new {
  border-color: rgba(34, 197, 94, 0.45);
}

.repo-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  cursor: pointer;
  user-select: none;
}

.repo-caret {
  font-size: 11px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.repo-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.repo-name:hover {
  color: var(--accent);
}

.repo-fullname {
  font-size: 11px;
  font-weight: 400;
  color: var(--text-tertiary);
  margin-left: 6px;
}

.new-badge {
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  background: #22c55e;
  padding: 1px 7px;
  border-radius: 8px;
  flex-shrink: 0;
}

.repo-meta {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-left: auto;
  white-space: nowrap;
  flex-shrink: 0;
}

.release-list {
  list-style: none;
  margin: 0;
  padding: 0 16px 12px 32px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.release-item {
  border-radius: 8px;
}

.release-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  border-radius: 8px;
  background: var(--bg-secondary, rgba(128, 128, 128, 0.06));
  text-decoration: none;
  transition: background 0.15s;
}

.release-link:hover {
  background: var(--accent-bg);
}

.release-item.is-new .release-link {
  border-left: 2px solid #22c55e;
}

.release-tag {
  font-size: 11px;
  font-weight: 700;
  color: var(--accent);
  font-family: ui-monospace, monospace;
  flex-shrink: 0;
}

.release-new {
  font-size: 9px;
  font-weight: 700;
  color: #fff;
  background: #22c55e;
  padding: 1px 6px;
  border-radius: 6px;
  flex-shrink: 0;
}

.release-pre {
  font-size: 9px;
  font-weight: 600;
  color: #f59e0b;
  border: 1px solid #f59e0b;
  padding: 0 5px;
  border-radius: 6px;
  flex-shrink: 0;
}

.release-name {
  font-size: 12px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.release-date {
  font-size: 11px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}
</style>
