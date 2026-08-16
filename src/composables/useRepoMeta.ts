import { ref, watch } from 'vue'

/**
 * Per-repo user metadata: free-form note + custom tags.
 * Persisted to localStorage (keyed by repo id). The same data is
 * exported alongside the dashboard and is searchable in useRepos.
 */

export interface RepoMeta {
  note: string
  tags: string[]
}

const STORAGE_KEY = 'repocensus:repoMeta'
type MetaMap = Record<string, RepoMeta>

function load(): MetaMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as MetaMap) : {}
  } catch {
    return {}
  }
}

// Module-level reactive store shared by all components
const meta = ref<MetaMap>(load())

watch(
  meta,
  (m) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(m))
    } catch {
      /* ignore */
    }
  },
  { deep: true }
)

export function useRepoMeta() {
  function getMeta(id: number): RepoMeta {
    return meta.value[String(id)] ?? { note: '', tags: [] }
  }

  function setNote(id: number, note: string) {
    const key = String(id)
    const cur = meta.value[key] ?? { note: '', tags: [] }
    meta.value = { ...meta.value, [key]: { ...cur, note } }
  }

  function setTags(id: number, tags: string[]) {
    const key = String(id)
    const cur = meta.value[key] ?? { note: '', tags: [] }
    meta.value = { ...meta.value, [key]: { ...cur, tags } }
  }

  function allMeta(): MetaMap {
    return meta.value
  }

  return { meta, getMeta, setNote, setTags, allMeta }
}
