<script setup lang="ts">
import { ElDrawer } from 'element-plus'
import type { LayoutFontSizeArea, LayoutFontSizes } from '../lib/layoutFontSizes'
import type { OutlineItem } from '../lib/outline'
import type { SearchResult } from '../lib/search'
import type { UtilityPanel } from '../types/app'
import OutlinePanel from './OutlinePanel.vue'
import SearchPanel from './SearchPanel.vue'
import SettingsPanel from './SettingsPanel.vue'

const props = defineProps<{
  modelValue: boolean
  activePanel: UtilityPanel
  outline: OutlineItem[]
  outlineFontSize: number
  searchQuery: string
  searchResult: SearchResult
  activeSearchIndex: number
  draftLayoutFontSizes: LayoutFontSizes
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'update:searchQuery', value: string): void
  (event: 'previous-match'): void
  (event: 'next-match'): void
  (event: 'update-font-size', area: LayoutFontSizeArea, value: number): void
  (event: 'cancel-settings'): void
  (event: 'save-settings'): void
}>()

const titles: Record<UtilityPanel, string> = {
  outline: '大纲',
  search: '搜索',
  settings: '设置',
}

function emitFontSize(area: LayoutFontSizeArea, value: number) {
  emit('update-font-size', area, value)
}
</script>

<template>
  <ElDrawer
    v-if="modelValue"
    class="utility-drawer"
    :model-value="modelValue"
    :title="titles[activePanel]"
    destroy-on-close
    direction="rtl"
    size="320px"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <OutlinePanel
      v-if="activePanel === 'outline'"
      :items="props.outline"
      :font-size="props.outlineFontSize"
    />
    <SearchPanel
      v-else-if="activePanel === 'search'"
      :query="searchQuery"
      :result="searchResult"
      :active-index="activeSearchIndex"
      @update:query="$emit('update:searchQuery', $event)"
      @previous="$emit('previous-match')"
      @next="$emit('next-match')"
    />
    <SettingsPanel
      v-else
      :model-value="draftLayoutFontSizes"
      @update-font-size="emitFontSize"
      @cancel="$emit('cancel-settings')"
      @save="$emit('save-settings')"
    />
  </ElDrawer>
</template>
