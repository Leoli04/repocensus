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
  homepage?: string | null

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

// ── Followed projects (v2.4) ─────────────────────────────

/** A contributor avatar shown on a release card */
export interface ReleaseContributor {
  login: string
  avatar_url: string
  html_url: string
}

/** A single release of a followed repo */
export interface ReleaseUpdate {
  tag_name: string
  name: string | null
  body: string | null // release notes (markdown, capped)
  published_at: string
  html_url: string
  prerelease: boolean
  is_new: boolean // first seen in the latest collection run
  contributors: ReleaseContributor[]
}

/** A followed repo with its collected releases */
export interface FollowedRepo {
  full_name: string
  alias: string | null
  tags: string[]
  html_url: string
  owner_avatar: string | null
  description: string | null
  stars: number
  pushed_at: string | null // last push activity (for repos that don't release)
  releases: ReleaseUpdate[] // newest first, capped
}

/** Aggregated followed.json payload (built by scripts/fetch-followed.ts) */
export interface FollowedData {
  generated_at: string
  repos: FollowedRepo[]
}

// ── Trend charts (v2.3) ──────────────────────────────────

/** One point on the global star history line */
export interface StarPoint {
  date: string
  total: number
}

/** Per-repo star trend across snapshots */
export interface RepoTrend {
  full_name: string
  url: string
  points: number[] // star counts aligned with the history window
  delta: number // last - first
}

// ── GitHub global trending board ─────────────────────────
// Auxiliary utility. NOTE: this is NOT the same thing as TrendingData above.
// TrendingData ranks the *user's own* repos by star delta (in-repo velocity
// board); HotTrendingData tracks *GitHub-wide* hot repos scraped from
// github.com/trending with a Search API fallback. Keep the wording apart.

/** Time window of a global trending board */
export type HotPeriod = 'daily' | 'weekly' | 'monthly'

/** Where a board's data came from */
export type HotSource = 'trending' | 'search'

/** Shared metadata for one repo that appears on the global board */
export interface HotRepoMeta {
  full_name: string
  html_url: string
  owner_avatar: string
  description: string | null
  language: string | null
  stars: number
  forks: number
}

/** One ranked entry on a board (metadata lives in HotTrendingData.repos) */
export interface HotBoardItem {
  full_name: string
  rank: number
  /** stars gained inside the board's period; null when the source can't tell */
  stars_period: number | null
  /** rank in the previous run of the same board; null = newly entered */
  prev_rank: number | null
  /** positive = moved up, negative = moved down; null = new entry */
  rank_delta: number | null
  /** consecutive runs this repo has appeared on this board (1 = first seen) */
  days_on_board: number
}

/** A board entry that disappeared since the previous run */
export interface HotDroppedItem {
  full_name: string
  prev_rank: number
}

/** A single board = one period × one language ('' = all languages) */
export interface HotBoard {
  period: HotPeriod
  language: string
  updated_at: string
  source: HotSource
  items: HotBoardItem[]
  /** entries on this board in the previous run that are gone now */
  dropped: HotDroppedItem[]
}

/** src/data/trending.json payload (built by scripts/fetch-trending.ts) */
export interface HotTrendingData {
  generated_at: string
  boards: HotBoard[]
  /** full_name -> metadata, deduplicated across boards */
  repos: Record<string, HotRepoMeta>
  /** languages that actually have a board, for the filter UI */
  languages: { id: string; label: string }[]
}

/** One stored snapshot of board rankings (names only, kept compact) */
export interface HotSnapshot {
  date: string
  /** boardKey -> ordered full_names (index + 1 = rank) */
  boards: Record<string, string[]>
}
