<script setup lang="ts">
import { Search, X } from '@lucide/vue'
import { NButton, NInput } from 'naive-ui'
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
    <NInput
      :value="query"
      :input-props="{ 'data-test': 'search-input', 'aria-label': '在当前笔记中搜索' }"
      style="width: min(420px, 100%); min-width: 220px"
      placeholder="在当前笔记中搜索"
      clearable
      @update:value="$emit('update:query', String($event))"
    >
      <template #prefix>
        <Search :size="16" />
      </template>
    </NInput>
    <div class="search-actions">
      <span class="search-count" role="status" aria-live="polite">
        {{ result.matches.length ? `${activeIndex + 1}/${result.matches.length}` : '0/0' }}
      </span>
      <NButton
        data-test="search-previous"
        :disabled="result.matches.length === 0"
        @click="$emit('previous')"
      >
        上一个
      </NButton>
      <NButton
        data-test="search-next"
        :disabled="result.matches.length === 0"
        @click="$emit('next')"
      >
        下一个
      </NButton>
    </div>
    <NButton
      class="search-close-button"
      data-test="search-close"
      aria-label="关闭搜索"
      title="关闭搜索"
      circle
      quaternary
      @click="$emit('close')"
    >
      <X :size="16" />
    </NButton>
  </div>
</template>
