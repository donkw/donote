<script setup lang="ts">
import { ListTree, Search, Settings } from '@lucide/vue'
import { ElButton, ElTooltip } from 'element-plus'
import type { UtilityPanel } from '../types/app'

defineProps<{
  activePanel: UtilityPanel
  drawerOpen: boolean
}>()

defineEmits<{
  (event: 'select', panel: UtilityPanel): void
}>()

const tools: Array<{ key: UtilityPanel; label: string; icon: typeof ListTree }> = [
  { key: 'outline', label: '大纲', icon: ListTree },
  { key: 'search', label: '搜索', icon: Search },
  { key: 'settings', label: '设置', icon: Settings },
]
</script>

<template>
  <aside class="utility-rail">
    <ElTooltip v-for="tool in tools" :key="tool.key" :content="tool.label" placement="left">
      <ElButton
        :data-test="`utility-${tool.key}`"
        circle
        :type="drawerOpen && activePanel === tool.key ? 'primary' : 'default'"
        @click="$emit('select', tool.key)"
      >
        <component :is="tool.icon" :size="18" />
      </ElButton>
    </ElTooltip>
  </aside>
</template>
