<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

interface NavItem {
  id: string
  label: string
  icon: string
}

const navItems: NavItem[] = [
  { id: 'overview', label: '概览', icon: '📊' },
  { id: 'controls', label: '筛选', icon: '🎛️' },
  { id: 'repos', label: '仓库', icon: '📦' },
  { id: 'stale', label: '沉默仓库', icon: '⚠️' },
  { id: 'tech-profile', label: '技术画像', icon: '🔬' },
  { id: 'annual-report', label: '年度报告', icon: '🎉' },
  { id: 'recommend', label: '智能推荐', icon: '🤖' },
  { id: 'star-timeline', label: 'Star 时间线', icon: '🆕' },
  { id: 'share', label: '分享', icon: '🏷️' },
]

const activeSection = ref('overview')
let observer: IntersectionObserver | null = null

function scrollToSection(id: string) {
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

onMounted(async () => {
  await nextTick()
  // Small delay to ensure all sections are rendered
  setTimeout(() => {
    const options: IntersectionObserverInit = {
      rootMargin: '-20% 0px -60% 0px',
      threshold: 0,
    }

    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          activeSection.value = entry.target.id
        }
      }
    }, options)

    for (const item of navItems) {
      const el = document.getElementById(item.id)
      if (el) observer.observe(el)
    }
  }, 200)
})

onUnmounted(() => {
  observer?.disconnect()
})
</script>

<template>
  <nav class="section-nav">
    <button
      v-for="item in navItems"
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
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 100;
}

.nav-dot {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 6px 8px;
  border: none;
  border-radius: 20px;
  background: transparent;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  max-width: 36px;
  opacity: 0.5;
}

.nav-dot:hover {
  max-width: 160px;
  opacity: 1;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  gap: 6px;
  padding: 6px 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.nav-dot.active {
  opacity: 1;
  max-width: 160px;
  background: var(--card-bg);
  border: 1px solid var(--accent);
  gap: 6px;
  padding: 6px 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.nav-dot.active .nav-icon {
  filter: none;
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

/* Hide on mobile */
@media (max-width: 1024px) {
  .section-nav {
    display: none;
  }
}
</style>
