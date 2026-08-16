<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRepos } from '../composables/useRepos'
import { computeRecommendations } from '../engine/recommend'
import { useI18n } from '../i18n'
import RepoCard from './RepoCard.vue'

const { data } = useRepos()
const { t, locale } = useI18n()

const result = computed(() => computeRecommendations(data.value, 8))
const expanded = ref<string | null>(null)

function toggleTopic(topic: string) {
  expanded.value = expanded.value === topic ? null : topic
}

const sep = computed(() => (locale.value === 'zh' ? '、' : ', '))
</script>

<template>
  <div class="recommend-board">
    <h3 class="section-title">{{ t('recommend.title') }}</h3>

    <!-- Recommendations -->
    <div class="rec-section">
      <h4 class="rec-heading">{{ t('recommend.forYou') }}</h4>
      <div class="rec-grid">
        <a
          v-for="rec in result.recommendations"
          :key="rec.repo.id"
          :href="rec.repo.html_url"
          target="_blank"
          rel="noopener"
          class="rec-card"
        >
          <div class="rec-top">
            <span class="rec-name">{{ rec.repo.name }}</span>
            <span class="rec-stars">⭐ {{ rec.repo.stargazers_count || 0 }}</span>
          </div>
          <p class="rec-desc">{{ rec.repo.description || t('repo.noDesc') }}</p>
          <div class="rec-meta">
            <span v-if="rec.repo.language" class="rec-lang">{{ rec.repo.language }}</span>
            <span class="rec-reason" v-if="rec.matchedTopics.length">{{ t('recommend.reason') }}{{ rec.matchedTopics.slice(0, 3).join(sep) }}</span>
            <span class="rec-reason" v-else>{{ t('recommend.matchProfile') }}</span>
          </div>
          <div class="rec-topics">
            <span v-for="tt in rec.matchedTopics.slice(0, 4)" :key="tt" class="rec-topic">#{{ tt }}</span>
          </div>
        </a>
      </div>
    </div>

    <!-- Explore new topics (drill-down) -->
    <div class="rec-section" v-if="result.exploreTopics.length">
      <h4 class="rec-heading">{{ t('recommend.explore') }}</h4>
      <div class="explore-list">
        <div v-for="ex in result.exploreTopics" :key="ex.topic" class="explore-item-wrap">
          <button class="explore-item" @click="toggleTopic(ex.topic)" :title="ex.topic">
            <span class="explore-topic">#{{ ex.topic }}</span>
            <span class="explore-count">{{ ex.relatedCount }} {{ t('recommend.relatedRepos') }}</span>
            <span class="explore-chevron">{{ expanded === ex.topic ? '▼' : '▶' }}</span>
            <div class="explore-bar">
              <div
                class="explore-fill"
                :style="{ width: Math.min((ex.relatedCount / result.exploreTopics[0].relatedCount) * 100, 100) + '%' }"
              />
            </div>
          </button>
          <div v-if="expanded === ex.topic" class="explore-repos">
            <RepoCard v-for="r in ex.repos" :key="r.id" :repo="r" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.recommend-board {
  margin-top: 32px;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 16px;
  color: var(--text-primary);
}

.rec-heading {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin: 0 0 12px;
}

.rec-section {
  margin-bottom: 20px;
}

.rec-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

.rec-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  padding: 14px 16px;
  text-decoration: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: border-color 0.15s, transform 0.15s;
}

.rec-card:hover {
  border-color: var(--accent);
  transform: translateY(-2px);
}

.rec-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.rec-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rec-stars {
  font-size: 12px;
  color: var(--text-tertiary);
  flex-shrink: 0;
  margin-left: 8px;
}

.rec-desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.rec-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.rec-lang {
  font-size: 11px;
  color: var(--text-tertiary);
  background: var(--badge-bg);
  padding: 1px 8px;
  border-radius: 10px;
}

.rec-reason {
  font-size: 11px;
  color: var(--accent);
}

.rec-topics {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.rec-topic {
  font-size: 10px;
  color: var(--text-tertiary);
  background: var(--accent-bg);
  padding: 1px 6px;
  border-radius: 8px;
}

/* Explore */
.explore-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.explore-item-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.explore-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 10px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  cursor: pointer;
  width: 100%;
  text-align: left;
  transition: border-color 0.15s;
}

.explore-item:hover {
  border-color: var(--accent);
}

.explore-topic {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  min-width: 120px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.explore-count {
  font-size: 11px;
  color: var(--text-tertiary);
  white-space: nowrap;
  flex-shrink: 0;
}

.explore-chevron {
  font-size: 9px;
  color: var(--accent);
  flex-shrink: 0;
}

.explore-bar {
  flex: 1;
  height: 8px;
  background: var(--bar-track);
  border-radius: 4px;
  overflow: hidden;
}

.explore-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), #8b5cf6);
  border-radius: 4px;
  transition: width 0.4s ease;
}

.explore-repos {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
  padding-left: 8px;
  border-left: 2px solid var(--card-border);
}

@media (max-width: 768px) {
  .rec-grid,
  .explore-repos {
    grid-template-columns: 1fr;
  }
  .explore-topic {
    min-width: auto;
  }
}
</style>
