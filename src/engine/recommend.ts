import type { CensusData, Repo } from './types'

export interface Recommendation {
  repo: Repo
  score: number
  matchedTopics: string[]
  reason: string
}

export interface ExploreTopic {
  topic: string
  relatedCount: number
  currentCount: number
}

export interface RecommendResult {
  recommendations: Recommendation[]
  exploreTopics: ExploreTopic[]
}

// Build a global topic frequency map for the whole collection
function buildTopicFreq(repos: Repo[]): Map<string, number> {
  const freq = new Map<string, number>()
  for (const r of repos) {
    for (const t of r.topics || []) {
      freq.set(t, (freq.get(t) || 0) + 1)
    }
  }
  return freq
}

// Jaccard-like similarity between two topic sets, weighted by global rarity
function topicSimilarity(a: string[], b: string[], globalFreq: Map<string, number>): { score: number; matched: string[] } {
  const setA = new Set(a.map((t) => t.toLowerCase()))
  const setB = new Set(b.map((t) => t.toLowerCase()))
  const matched: string[] = []
  let score = 0

  for (const t of setB) {
    if (setA.has(t)) {
      matched.push(t)
      // Weight by rarity: rarer topics contribute more
      const rarity = 1 / Math.log2((globalFreq.get(t) || 1) + 2)
      score += rarity
    }
  }

  // Normalize by the number of topics in the user profile to avoid bias toward huge profiles
  const denom = Math.sqrt(setA.size) || 1
  return { score: score / denom, matched }
}

export function computeRecommendations(data: CensusData, limit = 8): RecommendResult {
  const repos = data.repos
  const globalFreq = buildTopicFreq(repos)

  // User interest profile = aggregated topic frequencies across ALL repos (weighted by stars)
  const profileTopics = new Map<string, number>()
  for (const r of repos) {
    const weight = 1 + Math.log10((r.stargazers_count || 0) + 1)
    for (const t of r.topics || []) {
      profileTopics.set(t, (profileTopics.get(t) || 0) + weight)
    }
  }
  // Top profile topics (user's core interests)
  const topProfile = Array.from(profileTopics.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40)
    .map(([t]) => t)

  // Recommend repos that best match the user's interest profile
  // We score each repo by similarity of its topics to the user's top profile topics
  const scored: Recommendation[] = repos
    .map((r) => {
      const { score, matched } = topicSimilarity(r.topics || [], topProfile, globalFreq)
      return {
        repo: r,
        score,
        matchedTopics: matched.slice(0, 5),
        reason: '',
      }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)

  // Take top matches as recommendations
  const recommendations = scored.slice(0, limit).map((x) => ({
    ...x,
    reason: x.matchedTopics.length
      ? `匹配你的兴趣：${x.matchedTopics.slice(0, 3).join('、')}`
      : '高度契合你的技术画像',
  }))

  // Explore new topics: topics that appear in the collection but are NOT in user's top profile,
  // and are related to the user's interests (share repos with profile topics)
  const profileSet = new Set(topProfile.map((t) => t.toLowerCase()))
  const exploreMap = new Map<string, { related: number; current: number }>()

  for (const r of repos) {
    const rTopics = (r.topics || []).map((t) => t.toLowerCase())
    const hasProfileTopic = rTopics.some((t) => profileSet.has(t))
    if (!hasProfileTopic) continue
    // This repo also has non-profile topics -> candidate explore topics
    for (const t of rTopics) {
      if (!profileSet.has(t)) {
        const entry = exploreMap.get(t) || { related: 0, current: 0 }
        entry.related += 1
        entry.current = globalFreq.get(t) || 0
        exploreMap.set(t, entry)
      }
    }
  }

  const exploreTopics = Array.from(exploreMap.entries())
    .map(([topic, v]) => ({ topic, relatedCount: v.related, currentCount: v.current }))
    .sort((a, b) => b.relatedCount - a.relatedCount)
    .slice(0, 10)

  return { recommendations, exploreTopics }
}
