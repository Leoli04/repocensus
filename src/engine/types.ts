// ============================================================
// RepoCensus — Core Type Definitions
// ============================================================

/** Repository source type */
export type RepoType = 'original' | 'fork' | 'star'

/** A normalized repository record */
export interface Repo {
  // identity
  id: number
  name: string
  full_name: string
  html_url: string
  owner: string

  // classification inputs
  type: RepoType
  fork: boolean
  parent_full_name: string | null
  description: string | null
  language: string | null
  topics: string[]
  stargazers_count: number
  forks_count: number
  open_issues_count: number

  // timestamps
  created_at: string
  updated_at: string
  pushed_at: string
  starred_at: string | null // only for starred repos

  // flags
  archived: boolean
  has_readme: boolean
  has_license: boolean
  license: string | null

  // computed (filled by engine)
  category: string
  health_score: number
  is_new: boolean // newly starred since last run
  starred_days_ago: number | null
}

/** A category rule within a template */
export interface CategoryRule {
  name: string
  matchers: Matcher[]
  priority: number
}

export interface Matcher {
  field: 'topics' | 'language' | 'name' | 'description'
  operator: 'contains' | 'equals' | 'regex'
  value: string | string[]
  weight: number
}

/** A classification template */
export interface CategoryTemplate {
  id: string
  name: string
  description: string
  type: 'preset' | 'custom'
  categories: CategoryRule[]
}

/** Aggregated dashboard data */
export interface CensusData {
  username: string
  avatar_url: string
  html_url: string
  generated_at: string
  repos: Repo[]
  stats: {
    total: number
    original: number
    fork: number
    star: number
    avg_health: number
    active_count: number
    stale_count: number
    archived_count: number
  }
  tech_profile: TechProfile
  stale_repos: StaleRepo[]
  new_stars: Repo[]
  trending?: TrendingData
  custom_templates?: CategoryTemplate[]
  history?: ChangeSnapshot[]
}

/** A lightweight per-run snapshot used for change tracking */
export interface ChangeSnapshot {
  generated_at: string
  names: string[]
  stars: Record<string, number>
  urls: Record<string, string>
}

export interface ChangeEntry {
  full_name: string
  stars: number
}

export interface StarChange {
  full_name: string
  from: number
  to: number
  delta: number
}

export interface ChangeDiff {
  from: ChangeSnapshot
  to: ChangeSnapshot
  added: ChangeEntry[]
  removed: ChangeEntry[]
  starUp: StarChange[]
  starDown: StarChange[]
  unchangedCount: number
}

export interface TechProfile {
  languages: { name: string; count: number; percentage: number }[]
  domains: { name: string; count: number }[]
  activity: {
    active: number // updated within 6 months
    silent: number // 6 months - 2 years
    archived: number // > 2 years
  }
  total_stars_received: number
  total_stars_given: number
}

export interface StaleRepo {
  repo: Repo
  reason: string
  days_since_update: number
}

/** A repo with trending (star growth) metrics */
export interface TrendingRepo {
  repo: Repo
  star_delta: number // current stars - previous stars
  prev_stars: number // previous run's star count
  star_velocity: number // stars per 30 days since creation
  trending_score: number // weighted combination
}

/** Trending data for the hot board */
export interface TrendingData {
  overall: TrendingRepo[]
  by_category: { category: string; repos: TrendingRepo[] }[]
  period: string // e.g. "7 days"
  has_historical: boolean // false on first run
}
