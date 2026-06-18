<script setup lang="ts">
import { Search, X } from '@lucide/vue'
import { ElButton, ElInput } from 'element-plus'
import { ref } from 'vue'
import type { SearchResult } from '../lib/search'

const searchPanel = ref<HTMLElement | null>(null)

defineProps<{
  query: string
  result: SearchResult
  activeIndex: number
}>()

defineEmits<{
  (event: 'update:query', value: string): void
  (event: 'previous'): void
  (event: 'next'): void
  (event: 'close'): void
}>()

function focus() {
  searchPanel.value?.querySelector('input')?.focus()
}

defineExpose({ focus })
</script>

<template>
  <div ref="searchPanel" class="search-panel">
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
      <ElButton
        data-test="search-close"
        aria-label="关闭搜索"
        title="关闭搜索"
        circle
        @click="$emit('close')"
      >
        <X :size="16" />
      </ElButton>
    </div>
  </div>
</template>
