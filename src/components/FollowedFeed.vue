<script setup lang="ts">
import { computed, ref } from 'vue'
import { useFollowed } from '../composables/useFollowed'
import { useI18n } from '../i18n'
import { daysSince } from '../engine/categorizer'

const props = withDefaults(
  defineProps<{
    /** Max entries to show. 0 / undefined = no limit (full page) */
    limit?: number
    /** Full-page variant (no filter pills, no "view more") */
    full?: boolean
  }>(),
  { limit: 10, full: false }
)
const emit = defineEmits<{ (e: 'viewAll'): void }>()

const { t, locale } = useI18n()
const { data, newCount } = useFollowed()

// ── Feed entries: one card per release (GitHub-feed style) ─
interface Entry {
  repo: string
  repoUrl: string
  alias: string | null
  avatar: string | null
  description: string | null
  stars: number
  tags: string[]
  tag_name: string
  title: string
  body: string | null
  published_at: string
  html_url: string
  prerelease: boolean
  is_new: boolean
  contributors: { login: string; avatar_url: string; html_url: string }[]
}

const allEntries = computed<Entry[]>(() => {
  const out: Entry[] = []
  for (const repo of data.value.repos) {
    for (const rel of repo.releases) {
      out.push({
        repo: repo.full_name,
        repoUrl: repo.html_url,
        alias: repo.alias,
        avatar: repo.owner_avatar,
        description: repo.description,
        stars: repo.stars,
        tags: repo.tags,
        tag_name: rel.tag_name,
        title: rel.name || rel.tag_name,
        body: rel.body,
        published_at: rel.published_at,
        html_url: rel.html_url,
        prerelease: rel.prerelease,
        is_new: rel.is_new,
        contributors: rel.contributors || [],
      })
    }
  }
  return out.sort(
    (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  )
})

// Filter: all / only new
const showOnlyNew = ref(false)
const filtered = computed(() =>
  showOnlyNew.value ? allEntries.value.filter((e) => e.is_new) : allEntries.value
)

// Cap the list on the tab view; the full page passes limit = 0
const entries = computed(() =>
  props.limit && props.limit > 0 ? filtered.value.slice(0, props.limit) : filtered.value
)
const hasMore = computed(() => props.limit > 0 && filtered.value.length > props.limit)

// Expanded release notes
const expanded = ref<Set<string>>(new Set())
function toggleBody(key: string) {
  const next = new Set(expanded.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expanded.value = next
}

function entryKey(e: Entry): string {
  return `${e.repo}@${e.tag_name}`
}

// ── Markdown-lite renderer (escape first, then transform) ──
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderBody(md: string, repoFullName: string): string {
  const escaped = escapeHtml(md)
  const out: string[] = []
  let inCode = false
  for (const line of escaped.split('\n')) {
    if (line.trim().startsWith('```')) {
      out.push(inCode ? '</code></pre>' : '<pre><code>')
      inCode = !inCode
      continue
    }
    if (inCode) {
      out.push(line)
      continue
    }
    // Strip markdown badges/images — noisy in a compact feed
    if (/^\s*!\[/.test(line) || /<img/.test(line)) continue
    let l = line
    // Headings must be handled BEFORE inline transforms, otherwise "## 1.2"
    // and "#123" collide with the issue-reference replacement below.
    const heading = l.match(/^(#{1,6})\s+(.*)$/)
    if (heading) {
      out.push(`<div class="md-heading">${heading[2]}</div>`)
      continue
    }
    l = l.replace(/`([^`]+)`/g, '<code>$1</code>')
    l = l.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    l = l.replace(
      /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>'
    )
    // "by @user in #123" style mentions
    l = l.replace(
      /@([A-Za-z0-9-]+)/g,
      '<a href="https://github.com/$1" target="_blank" rel="noopener">@$1</a>'
    )
    // #123 → the repo's PR/issue page (GitHub resolves either)
    l = l.replace(
      /#(\d+)/g,
      `<a href="https://github.com/${repoFullName}/pull/$1" target="_blank" rel="noopener" class="issue-ref">#$1</a>`
    )
    const bullet = l.match(/^\s*[-*]\s+(.*)$/)
    if (bullet) {
      out.push(`<div class="md-li">• ${bullet[1]}</div>`)
      continue
    }
    out.push(l.trim() === '' ? '<div class="md-gap"></div>' : `<div>${l}</div>`)
  }
  if (inCode) out.push('</code></pre>')
  return out.join('\n')
}

function bodyPreview(e: Entry): string {
  if (!e.body) return ''
  return e.body.length > 420 ? e.body.slice(0, 420) + '…' : e.body
}

function fmtAgo(iso: string): string {
  const days = daysSince(iso)
  if (days <= 0) return t('star.today')
  if (days === 1) return t('star.yesterday')
  if (days < 30) return t('star.daysAgo', { n: days })
  if (days < 365) return t('star.monthsAgo', { n: Math.floor(days / 30) })
  return t('star.yearsAgo', { n: Math.floor(days / 365) })
}

function fmtStars(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

function fmtDate(iso: string): string {
  const loc = locale.value === 'zh' ? 'zh-CN' : 'en-US'
  return new Date(iso).toLocaleDateString(loc, { year: 'numeric', month: '2-digit', day: '2-digit' })
}
</script>

<template>
  <section class="followed-feed">
    <div class="feed-header">
      <h3 class="section-title">📡 {{ t('follow.title') }}</h3>
      <div class="feed-header-right">
        <button
          :class="['feed-filter', { active: !showOnlyNew }]"
          @click="showOnlyNew = false"
        >
          {{ t('follow.filterAll') }} · {{ allEntries.length }}
        </button>
        <button
          :class="['feed-filter', { active: showOnlyNew }]"
          @click="showOnlyNew = true"
        >
          {{ t('follow.filterNew') }} · {{ newCount }}
        </button>
      </div>
    </div>
    <p class="section-subtitle">{{ t('follow.subtitle', { date: fmtDate(data.generated_at) }) }}</p>

    <div v-if="!data.repos.length" class="empty-state">
      {{ t('follow.noConfig') }}
    </div>
    <div v-else-if="!entries.length" class="empty-state">
      {{ t('follow.noEntries') }}
    </div>

    <div v-else class="feed-list">
      <article
        v-for="e in entries"
        :key="entryKey(e)"
        :class="['feed-card', { 'is-new': e.is_new }]"
      >
        <!-- Head: avatar + repo + action + time -->
        <header class="feed-head">
          <img v-if="e.avatar" :src="e.avatar" :alt="e.repo" class="feed-avatar" />
          <div v-else class="feed-avatar placeholder">📦</div>
          <div class="feed-head-text">
            <div class="feed-title-line">
              <a :href="e.repoUrl" target="_blank" rel="noopener" class="feed-repo">{{ e.repo }}</a>
              <span class="feed-action">{{ t('follow.released') }}</span>
              <span v-if="e.is_new" class="new-badge">{{ t('follow.new') }}</span>
              <span v-if="e.prerelease" class="pre-badge">pre</span>
            </div>
            <div class="feed-sub-line">
              <span class="feed-ago">{{ fmtAgo(e.published_at) }}</span>
              <span v-if="e.stars" class="feed-stars">⭐ {{ fmtStars(e.stars) }}</span>
              <span v-for="tag in e.tags" :key="tag" class="feed-tag">{{ tag }}</span>
            </div>
          </div>
        </header>

        <!-- Repo description -->
        <p v-if="e.description" class="feed-desc">{{ e.description }}</p>

        <!-- Release title -->
        <a :href="e.html_url" target="_blank" rel="noopener" class="release-title">
          {{ e.title }}
        </a>

        <!-- Release notes -->
        <div v-if="e.body" class="release-body-wrap">
          <div
            v-if="expanded.has(entryKey(e))"
            class="release-body"
            v-html="renderBody(e.body, e.repo)"
          />
          <div
            v-else
            class="release-body"
            v-html="renderBody(bodyPreview(e), e.repo)"
          />
          <button
            v-if="e.body.length > 420"
            class="read-more"
            @click="toggleBody(entryKey(e))"
          >
            {{ expanded.has(entryKey(e)) ? t('follow.readLess') : t('follow.readMore') }}
          </button>
        </div>
        <p v-else class="release-no-body">{{ t('follow.noNotes') }}</p>

        <!-- Contributors -->
        <div v-if="e.contributors.length" class="contributors">
          <span class="contrib-label">{{ t('follow.contributors') }}</span>
          <div class="contrib-avatars">
            <a
              v-for="c in e.contributors"
              :key="c.login"
              :href="c.html_url"
              target="_blank"
              rel="noopener"
              :title="c.login"
              class="contrib-avatar-link"
            >
              <img :src="c.avatar_url" :alt="c.login" class="contrib-avatar" />
            </a>
          </div>
          <a :href="e.repoUrl + '/graphs/contributors'" target="_blank" rel="noopener" class="contrib-more">
            {{ t('follow.viewContrib') }} →
          </a>
        </div>

        <!-- Footer: tag + link -->
        <footer class="feed-foot">
          <span class="release-tag">{{ e.tag_name }}</span>
          <a :href="e.html_url" target="_blank" rel="noopener" class="release-link">
            {{ t('follow.viewRelease') }} →
          </a>
        </footer>
      </article>
    </div>

    <!-- View more → full page -->
    <button v-if="hasMore" class="view-all-btn" @click="emit('viewAll')">
      {{ t('follow.viewAll', { n: filtered.length }) }} →
    </button>
    <p v-else-if="props.full === false && filtered.length > 0" class="feed-end">
      {{ t('follow.endOfList') }}
    </p>
  </section>
</template>

<style scoped>
.followed-feed {
  margin-top: 8px;
}

.feed-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 4px;
  color: var(--text-primary);
}

.feed-header-right {
  display: flex;
  gap: 6px;
}

.feed-filter {
  padding: 4px 12px;
  border-radius: 14px;
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.feed-filter.active {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-bg, rgba(59, 130, 246, 0.12));
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

.feed-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ── Feed card ── */
.feed-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  padding: 16px 18px;
}

.feed-card.is-new {
  border-color: rgba(34, 197, 94, 0.45);
  box-shadow: 0 0 0 1px rgba(34, 197, 94, 0.12);
}

.feed-head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.feed-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--card-border);
  flex-shrink: 0;
  object-fit: cover;
}

.feed-avatar.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--badge-bg);
  font-size: 16px;
}

.feed-head-text {
  flex: 1;
  min-width: 0;
}

.feed-title-line {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.feed-repo {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  text-decoration: none;
}

.feed-repo:hover {
  color: var(--accent);
}

.feed-action {
  font-size: 13px;
  color: var(--text-tertiary);
}

.new-badge {
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  background: #22c55e;
  padding: 1px 7px;
  border-radius: 8px;
}

.pre-badge {
  font-size: 10px;
  font-weight: 700;
  color: #f59e0b;
  border: 1px solid #f59e0b;
  padding: 0 6px;
  border-radius: 8px;
}

.feed-sub-line {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 3px;
  flex-wrap: wrap;
}

.feed-ago,
.feed-stars {
  font-size: 11px;
  color: var(--text-tertiary);
}

.feed-tag {
  font-size: 10px;
  padding: 1px 8px;
  border-radius: 8px;
  background: var(--badge-bg);
  color: var(--text-secondary);
}

.feed-desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 10px 0 0;
  line-height: 1.5;
}

.release-title {
  display: block;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  text-decoration: none;
  margin: 12px 0 8px;
  line-height: 1.35;
}

.release-title:hover {
  color: var(--accent);
}

/* ── Release notes ── */
.release-body-wrap {
  border: 1px solid var(--card-border);
  border-radius: 10px;
  padding: 12px 14px;
  background: var(--bg-secondary, rgba(128, 128, 128, 0.04));
}

.release-body {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.65;
  overflow-wrap: anywhere;
}

.release-body :deep(.md-heading) {
  font-weight: 700;
  font-size: 12px;
  color: var(--text-primary);
  margin: 8px 0 4px;
}

.release-body :deep(.md-li) {
  padding-left: 6px;
  margin: 2px 0;
}

.release-body :deep(.md-gap) {
  height: 5px;
}

.release-body :deep(code) {
  background: var(--badge-bg);
  border-radius: 4px;
  padding: 1px 5px;
  font-size: 11px;
}

.release-body :deep(pre) {
  background: var(--badge-bg);
  border-radius: 8px;
  padding: 9px;
  overflow-x: auto;
  font-size: 11px;
  margin: 6px 0;
}

.release-body :deep(pre code) {
  background: none;
  padding: 0;
}

.release-body :deep(a) {
  color: var(--accent);
}

.read-more {
  margin-top: 8px;
  border: none;
  background: none;
  color: var(--accent);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}

.release-no-body {
  font-size: 12px;
  color: var(--text-tertiary);
  margin: 6px 0 0;
}

/* ── Contributors ── */
.contributors {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.contrib-label {
  font-size: 11px;
  color: var(--text-tertiary);
}

.contrib-avatars {
  display: flex;
  align-items: center;
}

.contrib-avatar-link {
  margin-left: -6px;
}

.contrib-avatar-link:first-child {
  margin-left: 0;
}

.contrib-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid var(--card-bg);
  object-fit: cover;
  transition: transform 0.15s;
}

.contrib-avatar:hover {
  transform: translateY(-2px);
}

.contrib-more {
  font-size: 11px;
  color: var(--accent);
  text-decoration: none;
  margin-left: 4px;
}

.feed-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--card-border);
}

.release-tag {
  font-size: 11px;
  font-weight: 700;
  color: var(--accent);
  font-family: ui-monospace, monospace;
}

.release-link {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
  text-decoration: none;
}

/* ── View all ── */
.view-all-btn {
  display: block;
  width: 100%;
  margin-top: 14px;
  padding: 12px;
  border-radius: 10px;
  border: 1px dashed var(--card-border);
  background: var(--card-bg);
  color: var(--accent);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}

.view-all-btn:hover {
  border-color: var(--accent);
  background: var(--accent-bg, rgba(59, 130, 246, 0.1));
}

.feed-end {
  text-align: center;
  font-size: 12px;
  color: var(--text-tertiary);
  margin: 14px 0 0;
}
</style>
