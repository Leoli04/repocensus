import { ref, computed, watch } from 'vue'
import type { CensusData, Repo, CategoryTemplate } from '../engine/types'
import { PRESET_TEMPLATES } from '../engine/templates'
import { recategorize, categorize } from '../engine/categorizer'

// Static import — Vite bundles this at build time
import rawData from '../data/repos.json'

// ── State ─────────────────────────────────────────────────
const data = ref<CensusData>(rawData as unknown as CensusData)

// Load persisted preferences
function loadPref<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(`repocensus:${key}`)
    return v !== null ? (JSON.parse(v) as T) : fallback
  } catch {
    return fallback
  }
}

function savePref<T>(key: string, value: T): void {
  try {
    localStorage.setItem(`repocensus:${key}`, JSON.stringify(value))
  } catch {
    // ignore
  }
}

// Currently active template
const activeTemplateId = ref<string>(loadPref('template', 'by-domain'))

// Second template for cross-dimension
const secondaryTemplateId = ref<string | null>(loadPref('secondary', null))

// Type filter: 'all' | 'original' | 'fork' | 'star'
const typeFilter = ref<string>(loadPref('typeFilter', 'all'))

// Search query
const searchQuery = ref<string>('')

// Selected category (null = all)
const selectedCategory = ref<string | null>(null)

// Sort option
export type SortOption = 'stars' | 'updated' | 'created' | 'name' | 'health'
const sortOption = ref<SortOption>(loadPref('sort', 'stars'))

// All available templates (preset + custom from data)
const allTemplates = computed<CategoryTemplate[]>(() => {
  const custom = (data.value as any).custom_templates || []
  return [...PRESET_TEMPLATES, ...custom]
})

// ── Persistence watchers ──────────────────────────────────
watch(activeTemplateId, (v) => savePref('template', v))
watch(secondaryTemplateId, (v) => savePref('secondary', v))
watch(typeFilter, (v) => savePref('typeFilter', v))
watch(sortOption, (v) => savePref('sort', v))

// ── Computed ──────────────────────────────────────────────
export function useRepos() {
  const activeTemplate = computed<CategoryTemplate>(
    () => allTemplates.value.find((t) => t.id === activeTemplateId.value) || PRESET_TEMPLATES[0]
  )

  const secondaryTemplate = computed<CategoryTemplate | null>(() => {
    if (!secondaryTemplateId.value) return null
    return allTemplates.value.find((t) => t.id === secondaryTemplateId.value) || null
  })

  // Recategorize repos when template changes
  const categorizedRepos = computed<Repo[]>(() => {
    return recategorize(data.value.repos, activeTemplate.value)
  })

  // Filter by type
  const typeFiltered = computed<Repo[]>(() => {
    if (typeFilter.value === 'all') return categorizedRepos.value
    return categorizedRepos.value.filter((r) => r.type === typeFilter.value)
  })

  // Filter by search
  const searched = computed<Repo[]>(() => {
    if (!searchQuery.value.trim()) return typeFiltered.value
    const q = searchQuery.value.toLowerCase()
    return typeFiltered.value.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q) ||
        (r.language || '').toLowerCase().includes(q) ||
        r.full_name.toLowerCase().includes(q)
    )
  })

  // Filter by category
  const filtered = computed<Repo[]>(() => {
    if (!selectedCategory.value) return searched.value
    return searched.value.filter((r) => r.category === selectedCategory.value)
  })

  // Sorted repos
  const sorted = computed<Repo[]>(() => {
    const arr = [...filtered.value]
    switch (sortOption.value) {
      case 'stars':
        return arr.sort((a, b) => b.stargazers_count - a.stargazers_count)
      case 'updated':
        return arr.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      case 'created':
        return arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      case 'name':
        return arr.sort((a, b) => a.name.localeCompare(b.name))
      case 'health':
        return arr.sort((a, b) => b.health_score - a.health_score)
      default:
        return arr
    }
  })

  // Category counts for sidebar
  const categories = computed(() => {
    const map = new Map<string, number>()
    for (const repo of searched.value) {
      map.set(repo.category, (map.get(repo.category) || 0) + 1)
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  })

  // Cross-dimension grouping: primary category → secondary category → repos
  const crossDimGroups = computed(() => {
    if (!secondaryTemplate.value) return null

    const groups = new Map<string, Map<string, Repo[]>>()

    for (const repo of sorted.value) {
      const primary = repo.category
      const secondary = categorize(repo, secondaryTemplate.value)

      if (!groups.has(primary)) {
        groups.set(primary, new Map())
      }
      const subMap = groups.get(primary)!
      if (!subMap.has(secondary)) {
        subMap.set(secondary, [])
      }
      subMap.get(secondary)!.push(repo)
    }

    // Convert to array and sort
    return Array.from(groups.entries())
      .map(([primaryCat, subMap]) => ({
        name: primaryCat,
        count: Array.from(subMap.values()).reduce((sum, arr) => sum + arr.length, 0),
        subCategories: Array.from(subMap.entries())
          .map(([secCat, repos]) => ({ name: secCat, repos, count: repos.length }))
          .sort((a, b) => b.count - a.count),
      }))
      .sort((a, b) => b.count - a.count)
  })

  // Single-dimension groups (no cross-dim)
  const singleDimGroups = computed(() => {
    const map = new Map<string, Repo[]>()
    for (const repo of sorted.value) {
      if (!map.has(repo.category)) {
        map.set(repo.category, [])
      }
      map.get(repo.category)!.push(repo)
    }
    return Array.from(map.entries())
      .map(([name, repos]) => ({ name, repos, count: repos.length }))
      .sort((a, b) => b.count - a.count)
  })

  // Trending data (pre-computed at build time)
  const trending = computed(() => (data.value as any).trending || null)

  function setTemplate(id: string) {
    activeTemplateId.value = id
    selectedCategory.value = null
  }

  function setType(type: string) {
    typeFilter.value = type
  }

  function setCategory(cat: string | null) {
    selectedCategory.value = cat
  }

  function setSort(opt: SortOption) {
    sortOption.value = opt
  }

  function setSecondaryTemplate(id: string | null) {
    secondaryTemplateId.value = id
  }

  return {
    data,
    allTemplates,
    activeTemplate,
    activeTemplateId,
    secondaryTemplate,
    secondaryTemplateId,
    typeFilter,
    searchQuery,
    selectedCategory,
    sortOption,
    filtered: sorted,
    categories,
    crossDimGroups,
    singleDimGroups,
    trending,
    setTemplate,
    setType,
    setCategory,
    setSort,
    setSecondaryTemplate,
  }
}
