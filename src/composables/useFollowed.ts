import { computed } from 'vue'
import type { FollowedData } from '../engine/types'

// Static import — Vite bundles this at build time
import followedData from '../data/followed.json'

const data = computed<FollowedData>(() => followedData as unknown as FollowedData)

/** Total number of releases marked as new */
const newCount = computed<number>(() =>
  data.value.repos.reduce(
    (sum, r) => sum + r.releases.filter((rel) => rel.is_new).length,
    0
  )
)

export function useFollowed() {
  return { data, newCount }
}
