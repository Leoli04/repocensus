<script setup lang="ts">
import type { Repo, CategoryTemplate } from '../engine/types'
import RepoCard from './RepoCard.vue'
import { catLabel } from '../i18n'

export interface CategoryGroup {
  name: string
  repos?: Repo[]
  count: number
  subCategories?: {
    name: string
    repos: Repo[]
    count: number
  }[]
}

const props = defineProps<{
  groups: CategoryGroup[]
  collapsedSet: Set<string>
  toggleCollapse: (name: string) => void
}>()
</script>

<template>
  <div class="category-groups">
    <div v-for="group in groups" :key="group.name" class="cat-group">
      <!-- Primary category header -->
      <button
        class="group-header"
        @click="toggleCollapse(group.name)"
      >
        <span class="toggle-icon">{{ collapsedSet.has(group.name) ? '▶' : '▼' }}</span>
        <span class="group-name">{{ catLabel(group.name) }}</span>
        <span class="group-count">{{ group.count }}</span>
      </button>

      <!-- Repos (no cross-dim) -->
      <div v-if="!collapsedSet.has(group.name) && !group.subCategories" class="group-repos">
        <div class="repo-grid">
          <RepoCard v-for="repo in group.repos" :key="repo.id" :repo="repo" show-category />
        </div>
      </div>

      <!-- Sub-categories (cross-dim) -->
      <div v-if="!collapsedSet.has(group.name) && group.subCategories" class="sub-groups">
        <div v-for="sub in group.subCategories" :key="sub.name" class="sub-group">
          <button
            class="sub-header"
            @click="toggleCollapse(`${group.name}/${sub.name}`)"
          >
            <span class="toggle-icon">{{ collapsedSet.has(`${group.name}/${sub.name}`) ? '▶' : '▼' }}</span>
            <span class="sub-name">{{ catLabel(sub.name) }}</span>
            <span class="sub-count">{{ sub.count }}</span>
          </button>
          <div v-if="!collapsedSet.has(`${group.name}/${sub.name}`)" class="group-repos">
            <div class="repo-grid">
              <RepoCard v-for="repo in sub.repos" :key="repo.id" :repo="repo" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.category-groups {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cat-group {
  border-radius: 12px;
  overflow: hidden;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 14px;
  border: none;
  border-radius: 8px;
  background: var(--card-bg);
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.group-header:hover {
  background: var(--accent-bg);
}

.toggle-icon {
  font-size: 10px;
  color: var(--text-tertiary);
  width: 14px;
  text-align: center;
  flex-shrink: 0;
}

.group-name {
  flex: 1;
  text-align: left;
}

.group-count {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 10px;
  background: var(--accent-bg);
  color: var(--accent);
}

.group-repos {
  margin-top: 8px;
}

.repo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

/* Sub-groups */
.sub-groups {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 8px;
  padding-left: 20px;
}

.sub-header {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}

.sub-header:hover {
  background: var(--card-bg);
}

.sub-name {
  flex: 1;
  text-align: left;
}

.sub-count {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 10px;
  background: var(--badge-bg);
  color: var(--text-tertiary);
}

@media (max-width: 768px) {
  .repo-grid {
    grid-template-columns: 1fr;
  }
}
</style>
