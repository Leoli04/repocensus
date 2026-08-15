<script setup lang="ts">
import { computed } from 'vue'
import { useRepos } from '../composables/useRepos'
import { computeRecommendations } from '../engine/recommend'

const { data } = useRepos()

const result = computed(() => computeRecommendations(data.value, 8))
</script>

<template>
  <div class="recommend-board">
    <h3 class="section-title">🤖 智能推荐</h3>

    <!-- Recommendations -->
    <div class="rec-section">
      <h4 class="rec-heading">为你推荐 · 最契合你技术画像的仓库</h4>
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
          <p class="rec-desc">{{ rec.repo.description || '无描述' }}</p>
          <div class="rec-meta">
            <span v-if="rec.repo.language" class="rec-lang">{{ rec.repo.language }}</span>
            <span class="rec-reason">{{ rec.reason }}</span>
          </div>
          <div class="rec-topics">
            <span v-for="t in rec.matchedTopics.slice(0, 4)" :key="t" class="rec-topic">#{{ t }}</span>
          </div>
        </a>
      </div>
    </div>

    <!-- Explore new topics -->
    <div class="rec-section" v-if="result.exploreTopics.length">
      <h4 class="rec-heading">🧭 探索新领域 · 与你兴趣相关但尚未深入</h4>
      <div class="explore-list">
        <div v-for="ex in result.exploreTopics" :key="ex.topic" class="explore-item">
          <span class="explore-topic">#{{ ex.topic }}</span>
          <span class="explore-count">{{ ex.relatedCount }} 个相关仓库</span>
          <div class="explore-bar">
            <div
              class="explore-fill"
              :style="{ width: Math.min((ex.relatedCount / result.exploreTopics[0].relatedCount) * 100, 100) + '%' }"
            />
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

.explore-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 10px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
}

.explore-topic {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  min-width: 120px;
}

.explore-count {
  font-size: 11px;
  color: var(--text-tertiary);
  white-space: nowrap;
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

@media (max-width: 768px) {
  .rec-grid {
    grid-template-columns: 1fr;
  }
  .explore-item {
    flex-wrap: wrap;
  }
  .explore-topic {
    min-width: auto;
  }
}
</style>
