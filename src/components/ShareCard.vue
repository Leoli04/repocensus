<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CensusData } from '../engine/types'
import { useI18n } from '../i18n'

const props = defineProps<{
  data: CensusData
}>()
const { t } = useI18n()

// ── Language colors ──────────────────────────────────────
const langColors: Record<string, string> = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  Go: '#00ADD8',
  Rust: '#dea584',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  Vue: '#41b883',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Shell: '#89e051',
  Dockerfile: '#384d54',
  Jupyter: '#DA5B0B',
  Lua: '#000080',
  Kotlin: '#A97BFF',
  Swift: '#F05138',
  Ruby: '#701516',
  PHP: '#4F5D95',
  SCSS: '#c6538c',
}

function langColor(name: string): string {
  return langColors[name] || '#8b949e'
}

// ── Card data ────────────────────────────────────────────
const topLangs = computed(() => props.data.tech_profile.languages.slice(0, 5))
const topDomains = computed(() => props.data.tech_profile.domains.slice(0, 5))
const initial = computed(() => props.data.username.charAt(0).toUpperCase())

const generatedDate = computed(() => {
  return new Date(props.data.generated_at).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
})

// ── SVG card generation ──────────────────────────────────
const cardSVG = computed(() => {
  const langs = topLangs.value
  const domains = topDomains.value
  const s = props.data.stats
  const p = props.data.tech_profile

  // Language bars
  let langBars = ''
  let yOffset = 175
  const barWidth = 280
  for (const lang of langs) {
    const w = Math.round((lang.percentage / 100) * barWidth)
    const color = langColor(lang.name)
    langBars += `
      <rect x="20" y="${yOffset}" width="${barWidth}" height="8" rx="4" fill="#21262d"/>
      <rect x="20" y="${yOffset}" width="${w}" height="8" rx="4" fill="${color}"/>
      <text x="310" y="${yOffset + 7}" fill="#7d8590" font-size="10" font-family="Verdana,sans-serif">${lang.name} ${lang.percentage}%</text>`
    yOffset += 16
  }

  // Domain tags
  const domainText = domains.map((d) => d.name).join(' · ')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320" viewBox="0 0 480 320" font-family="system-ui,-apple-system,sans-serif">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0d1117"/>
      <stop offset="1" stop-color="#161b22"/>
    </linearGradient>
  </defs>
  <rect width="480" height="320" rx="16" fill="url(#bg)"/>

  <!-- Header -->
  <circle cx="40" cy="38" r="18" fill="#58a6ff"/>
  <text x="40" y="44" text-anchor="middle" fill="#fff" font-size="18" font-weight="bold">${initial.value}</text>
  <text x="68" y="34" fill="#e6edf3" font-size="18" font-weight="700">${props.data.username}</text>
  <text x="68" y="50" fill="#7d8590" font-size="11">${s.total} ${t('share.svgTotal')} · ${p.total_stars_received} ${t('share.svgStars')}</text>
  <text x="460" y="34" text-anchor="end" fill="#58a6ff" font-size="14" font-weight="700">RepoCensus</text>
  <text x="460" y="48" text-anchor="end" fill="#484f58" font-size="9">${t('share.svgCensus')}</text>

  <!-- Stat boxes -->
  <rect x="20" y="68" width="100" height="50" rx="8" fill="#21262d"/>
  <text x="70" y="88" text-anchor="middle" fill="#58a6ff" font-size="20" font-weight="800">${s.total}</text>
  <text x="70" y="106" text-anchor="middle" fill="#7d8590" font-size="10">${t('share.svgTotal')}</text>

  <rect x="132" y="68" width="100" height="50" rx="8" fill="#21262d"/>
  <text x="182" y="88" text-anchor="middle" fill="#f78166" font-size="20" font-weight="800">${p.total_stars_received}</text>
  <text x="182" y="106" text-anchor="middle" fill="#7d8590" font-size="10">⭐ ${t('share.svgStars')}</text>

  <rect x="244" y="68" width="100" height="50" rx="8" fill="#21262d"/>
  <text x="294" y="88" text-anchor="middle" fill="#3fb950" font-size="20" font-weight="800">${s.avg_health}</text>
  <text x="294" y="106" text-anchor="middle" fill="#7d8590" font-size="10">${t('share.svgHealth')}</text>

  <rect x="356" y="68" width="104" height="50" rx="8" fill="#21262d"/>
  <text x="408" y="88" text-anchor="middle" fill="#d2a8ff" font-size="20" font-weight="800">${s.active_count}</text>
  <text x="408" y="106" text-anchor="middle" fill="#7d8590" font-size="10">🟢 ${t('share.svgActive')}</text>

  <!-- Languages -->
  <text x="20" y="160" fill="#e6edf3" font-size="12" font-weight="600">Languages</text>
  ${langBars}

  <!-- Domains -->
  <text x="20" y="${yOffset + 10}" fill="#e6edf3" font-size="12" font-weight="600">Top Domains</text>
  <text x="20" y="${yOffset + 26}" fill="#7d8590" font-size="11">${domainText}</text>

  <!-- Footer -->
  <line x1="20" y1="300" x2="460" y2="300" stroke="#21262d" stroke-width="1"/>
  <text x="20" y="314" fill="#484f58" font-size="9">${t('share.svgGenerated')} ${generatedDate.value}</text>
  <text x="460" y="314" text-anchor="end" fill="#484f58" font-size="9">github.com/${props.data.username}</text>
</svg>`
})

// ── Download functions ───────────────────────────────────
function downloadSVG() {
  const blob = new Blob([cardSVG.value], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `repocensus-${props.data.username}.svg`
  a.click()
  URL.revokeObjectURL(url)
}

async function downloadPNG() {
  const blob = new Blob([cardSVG.value], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('SVG load failed'))
    img.src = url
  })
  const scale = 2
  const canvas = document.createElement('canvas')
  canvas.width = 480 * scale
  canvas.height = 320 * scale
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  URL.revokeObjectURL(url)
  canvas.toBlob((pngBlob) => {
    if (!pngBlob) return
    const pngUrl = URL.createObjectURL(pngBlob)
    const a = document.createElement('a')
    a.href = pngUrl
    a.download = `repocensus-${props.data.username}.png`
    a.click()
    URL.revokeObjectURL(pngUrl)
  }, 'image/png')
}

// ── Badge URLs ───────────────────────────────────────────
const baseUrl = computed(() => {
  if (typeof window === 'undefined') return ''
  const url = new URL(window.location.href)
  return `${url.protocol}//${url.host}${url.pathname.replace(/\/$/, '')}`
})

const badgeList = computed(() => [
  { name: 'repos', url: `${baseUrl.value}/badges/repos.svg` },
  { name: 'stars', url: `${baseUrl.value}/badges/stars.svg` },
  { name: 'health', url: `${baseUrl.value}/badges/health.svg` },
  { name: 'active', url: `${baseUrl.value}/badges/active.svg` },
  { name: 'languages', url: `${baseUrl.value}/badges/languages.svg` },
])

const markdownAll = computed(() => {
  return badgeList.value.map((b) => `![${b.name}](${b.url})`).join(' ')
})

const markdownLink = computed(() => {
  return `[![RepoCensus](${baseUrl.value}/badges/repocensus.svg)](${baseUrl.value}/)`
})

const copied = ref<string | null>(null)
async function copyToClipboard(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = label
    setTimeout(() => (copied.value = null), 2000)
  } catch {
    // fallback
  }
}
</script>

<template>
  <div class="share-section">
    <!-- Share Card -->
    <div class="card-area">
      <h3 class="section-title">{{ t('share.cardTitle') }}</h3>
      <div class="card-preview" v-html="cardSVG"></div>
      <div class="card-actions">
        <button class="action-btn primary" @click="downloadPNG">
          📥 {{ t('share.downloadPNG') }}
        </button>
        <button class="action-btn" @click="downloadSVG">
          📥 {{ t('share.downloadSVG') }}
        </button>
      </div>
    </div>

    <!-- Badge Section -->
    <div class="badge-area">
      <h3 class="section-title">{{ t('share.badgeTitle') }}</h3>
      <p class="badge-desc">{{ t('share.badgeDesc') }}</p>

      <!-- Badge preview -->
      <div class="badge-preview">
        <img v-for="b in badgeList" :key="b.name" :src="b.url" :alt="b.name" class="badge-img" />
      </div>

      <!-- Markdown code -->
      <div class="code-block">
        <div class="code-header">
          <span class="code-label">{{ t('share.mdAll') }}</span>
          <button class="copy-btn" @click="copyToClipboard(markdownAll, 'all')">
            {{ copied === 'all' ? t('common.copied') : t('common.copy') }}
          </button>
        </div>
        <pre class="code-content">{{ markdownAll }}</pre>
      </div>

      <div class="code-block">
        <div class="code-header">
          <span class="code-label">{{ t('share.mdLink') }}</span>
          <button class="copy-btn" @click="copyToClipboard(markdownLink, 'link')">
            {{ copied === 'link' ? t('common.copied') : t('common.copy') }}
          </button>
        </div>
        <pre class="code-content">{{ markdownLink }}</pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.share-section {
  display: flex;
  flex-direction: column;
  gap: 32px;
  margin-top: 32px;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 16px;
  color: var(--text-primary);
}

.card-preview {
  display: flex;
  justify-content: center;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 12px;
}

.card-preview :deep(svg) {
  width: 480px;
  max-width: 100%;
  height: auto;
  border-radius: 16px;
}

.card-actions {
  display: flex;
  gap: 10px;
}

.action-btn {
  padding: 8px 18px;
  border-radius: 8px;
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.action-btn:hover {
  border-color: var(--accent);
}

.action-btn.primary {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

.badge-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0 0 12px;
}

.badge-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 16px;
}

.badge-img {
  height: 20px;
}

.code-block {
  margin-bottom: 10px;
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 14px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-bottom: none;
  border-radius: 8px 8px 0 0;
}

.code-label {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 600;
}

.copy-btn {
  padding: 3px 10px;
  border-radius: 6px;
  border: 1px solid var(--card-border);
  background: var(--badge-bg);
  color: var(--text-secondary);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
}

.copy-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.code-content {
  margin: 0;
  padding: 12px 14px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 0 0 8px 8px;
  font-size: 12px;
  color: var(--text-primary);
  font-family: 'Cascadia Code', 'Fira Code', monospace;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

@media (max-width: 768px) {
  .card-preview :deep(svg) {
    width: 100%;
  }
}
</style>
