<script setup lang="ts">
import { FileText, ListTree, Moon, Search, Settings, Sun } from '@lucide/vue'
import { ElButton, ElTooltip } from 'element-plus'
import type { ThemeMode } from '../lib/theme'
import type { SaveState, UtilityPanel } from '../types/app'

const props = defineProps<{
  activePanel: UtilityPanel
  drawerOpen: boolean
  searchOpen: boolean
  theme: ThemeMode
  saveState: SaveState
}>()

const emit = defineEmits<{
  (event: 'select', panel: UtilityPanel): void
  (event: 'search'): void
  (event: 'save'): void
  (event: 'toggle-theme'): void
}>()

type UtilityTool = {
  key: UtilityPanel | 'search'
  label: string
  icon: typeof ListTree
}

const tools: UtilityTool[] = [
  { key: 'outline', label: '大纲', icon: ListTree },
  { key: 'search', label: '搜索', icon: Search },
  { key: 'settings', label: '设置', icon: Settings },
]

function toolButtonType(tool: UtilityTool) {
  if (tool.key === 'search') {
    return props.searchOpen ? 'primary' : 'default'
  }
  return props.drawerOpen && props.activePanel === tool.key ? 'primary' : 'default'
}

function selectTool(tool: UtilityTool) {
  if (tool.key === 'search') {
    emit('search')
    return
  }
  emit('select', tool.key)
}
</script>

<template>
  <aside class="utility-rail">
    <ElTooltip :content="theme === 'dark' ? '切换浅色' : '切换深色'" placement="left">
      <ElButton
        data-test="theme-toggle"
        :aria-label="theme === 'dark' ? '切换浅色' : '切换深色'"
        :title="theme === 'dark' ? '切换浅色' : '切换深色'"
        circle
        @click="$emit('toggle-theme')"
      >
        <Sun v-if="theme === 'dark'" :size="18" />
        <Moon v-else :size="18" />
      </ElButton>
    </ElTooltip>

    <ElTooltip content="立即保存" placement="left">
      <ElButton
        data-test="save-now"
        aria-label="立即保存"
        title="立即保存"
        circle
        :disabled="saveState === 'saving'"
        :type="saveState === 'dirty' ? 'primary' : 'default'"
        @click="$emit('save')"
      >
        <FileText :size="18" />
      </ElButton>
    </ElTooltip>

    <div class="utility-rail__divider" aria-hidden="true" />

    <ElTooltip v-for="tool in tools" :key="tool.key" :content="tool.label" placement="left">
      <ElButton
        :data-test="`utility-${tool.key}`"
        :aria-label="tool.label"
        :title="tool.label"
        circle
        :type="toolButtonType(tool)"
        @click="selectTool(tool)"
      >
        <component :is="tool.icon" :size="18" />
      </ElButton>
    </ElTooltip>
  </aside>
</template>
