<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useI18n } from '../i18n'

const props = defineProps<{ active: string }>()

const { t } = useI18n()

interface NavItem {
  id: string
  label: string
  icon: string
}

/** Anchor targets per tab — ids must exist in the DOM */
const tabAnchors = computed<Record<string, NavItem[]>>(() => ({
  overview: [
    { id: 'followed-feed', label: t('follow.title'), icon: '📡' },
    { id: 'overview', label: t('nav.overview'), icon: '📊' },
    { id: 'tech-profile', label: t('nav.tech'), icon: '🔬' },
    { id: 'star-timeline', label: t('nav.star'), icon: '🆕' },
    { id: 'heatmap', label: t('heat.title'), icon: '🔥' },
  ],
  repos: [
    { id: 'controls', label: t('nav.controls'), icon: '🎛️' },
    { id: 'repos', label: t('nav.repos'), icon: '📦' },
    { id: 'stale', label: t('nav.stale'), icon: '⚠️' },
  ],
  activity: [
    { id: 'followed-feed', label: t('follow.title'), icon: '📡' },
    { id: 'changes', label: t('nav.changes'), icon: '📈' },
    { id: 'trend', label: t('trend.title'), icon: '📉' },
  ],
  profile: [
    { id: 'annual-report', label: t('nav.annual'), icon: '🎉' },
    { id: 'recommend', label: t('nav.recommend'), icon: '🤖' },
    { id: 'learning-path', label: t('learn.title'), icon: '🎓' },
    { id: 'share', label: t('nav.share'), icon: '🏷️' },
  ],
  compare: [{ id: 'compare-panel', label: t('cmp.title'), icon: '⚖️' }],
}))

const items = computed<NavItem[]>(() => tabAnchors.value[props.active] || [])

/** Only show anchors that actually exist in the DOM */
const visible = ref<NavItem[]>([])
const activeSection = ref('')
let observer: IntersectionObserver | null = null

function refresh() {
  observer?.disconnect()
  observer = null
  visible.value = items.value.filter((it) => !!document.getElementById(it.id))
  if (!visible.value.length) return

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) activeSection.value = entry.target.id
      }
    },
    { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
  )
  for (const item of visible.value) {
    const el = document.getElementById(item.id)
    if (el) observer.observe(el)
  }
  activeSection.value = visible.value[0].id
}

function scrollToSection(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY - 90
  window.scrollTo({ top, behavior: 'smooth' })
  activeSection.value = id
}

function onScrollTop() {
  // Hide nav when at the very top (header visible)
  show.value = window.scrollY > 180
}

const show = ref(false)

// Re-scan anchors whenever the tab changes (DOM swaps)
watch(
  () => props.active,
  async () => {
    await nextTick()
    setTimeout(refresh, 150)
  }
)

onMounted(async () => {
  await nextTick()
  setTimeout(refresh, 250)
  window.addEventListener('scroll', onScrollTop, { passive: true })
  window.addEventListener('resize', refresh)
})

onUnmounted(() => {
  observer?.disconnect()
  window.removeEventListener('scroll', onScrollTop)
  window.removeEventListener('resize', refresh)
})
</script>

<template>
  <nav v-if="visible.length > 1" :class="['section-nav', { visible: show }]">
    <button
      v-for="item in visible"
      :key="item.id"
      :class="['nav-dot', { active: activeSection === item.id }]"
      @click="scrollToSection(item.id)"
      :title="item.label"
    >
      <span class="nav-icon">{{ item.icon }}</span>
      <span class="nav-label">{{ item.label }}</span>
    </button>
  </nav>
</template>

<style scoped>
.section-nav {
  position: fixed;
  right: 18px;
  top: 50%;
  transform: translateY(-50%) translateX(12px);
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 100;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s, transform 0.25s;
}

.section-nav.visible {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(-50%) translateX(0);
}

.nav-dot {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 6px 8px;
  border: 1px solid transparent;
  border-radius: 20px;
  background: transparent;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  max-width: 36px;
  opacity: 0.55;
  align-self: flex-end;
}

.nav-dot:hover,
.nav-dot.active {
  max-width: 180px;
  opacity: 1;
  background: var(--card-bg);
  border-color: var(--card-border);
  gap: 8px;
  padding: 6px 12px;
  box-shadow: 0 2px 14px rgba(0, 0, 0, 0.12);
}

.nav-dot.active {
  border-color: var(--accent);
}

.nav-icon {
  font-size: 14px;
  flex-shrink: 0;
  line-height: 1;
  white-space: nowrap;
}

.nav-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.2s 0.05s;
}

.nav-dot:hover .nav-label,
.nav-dot.active .nav-label {
  opacity: 1;
}

.nav-dot.active .nav-label {
  color: var(--accent);
}

/* Hide on narrow screens — the tab bar already covers navigation */
@media (max-width: 1100px) {
  .section-nav {
    display: none;
  }
}
</style>
