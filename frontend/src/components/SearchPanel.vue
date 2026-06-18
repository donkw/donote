<script setup lang="ts">
import { Search } from '@lucide/vue'
import { ElButton, ElInput } from 'element-plus'
import type { SearchResult } from '../lib/search'

defineProps<{
  query: string
  result: SearchResult
  activeIndex: number
}>()

defineEmits<{
  (event: 'update:query', value: string): void
  (event: 'previous'): void
  (event: 'next'): void
}>()
</script>

<template>
  <div class="utility-panel search-panel">
    <h2>搜索</h2>
    <ElInput
      :model-value="query"
      data-test="search-input"
      placeholder="在当前笔记中搜索"
      clearable
      @update:model-value="$emit('update:query', String($event))"
    >
      <template #prefix>
        <Search :size="16" />
      </template>
    </ElInput>
    <div class="search-actions">
      <span class="search-count">
        {{ result.matches.length ? `${activeIndex + 1}/${result.matches.length}` : '0/0' }}
      </span>
      <ElButton data-test="search-previous" @click="$emit('previous')">上一个</ElButton>
      <ElButton data-test="search-next" @click="$emit('next')">下一个</ElButton>
    </div>
  </div>
</template>
