<script setup lang="ts">
import {
  ListTree,
  Moon,
  Save,
  Search,
  Settings,
  Sun,
} from '@lucide/vue'
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

function panelType(panel: UtilityPanel) {
  return props.drawerOpen && props.activePanel === panel ? 'primary' : 'default'
}
</script>

<template>
  <header data-test="command-toolbar" class="command-toolbar">
    <div class="command-brand">
      <div data-test="brand-mark" class="brand-mark">D</div>
      <div class="command-brand__copy">
        <div class="command-brand__name">DoNote</div>
      </div>
    </div>

    <div class="command-toolbar__spacer" aria-hidden="true" />

    <div class="command-actions">
      <ElTooltip content="搜索" placement="bottom">
        <ElButton
          data-test="utility-search"
          aria-label="搜索"
          title="搜索"
          :type="searchOpen ? 'primary' : 'default'"
          @click="emit('search')"
        >
          <Search :size="15" />
        </ElButton>
      </ElTooltip>

      <ElTooltip content="立即保存" placement="bottom">
        <ElButton
          data-test="save-now"
          aria-label="立即保存"
          title="立即保存"
          :disabled="saveState === 'saving'"
          @click="emit('save')"
        >
          <Save :size="15" />
        </ElButton>
      </ElTooltip>

      <ElTooltip content="大纲" placement="bottom">
        <ElButton
          data-test="utility-outline"
          aria-label="大纲"
          title="大纲"
          :type="panelType('outline')"
          @click="emit('select', 'outline')"
        >
          <ListTree :size="15" />
        </ElButton>
      </ElTooltip>

      <ElTooltip content="设置" placement="bottom">
        <ElButton
          data-test="utility-settings"
          aria-label="设置"
          title="设置"
          :type="panelType('settings')"
          @click="emit('select', 'settings')"
        >
          <Settings :size="15" />
        </ElButton>
      </ElTooltip>

      <ElTooltip :content="theme === 'dark' ? '切换浅色' : '切换深色'" placement="bottom">
        <ElButton
          data-test="theme-toggle"
          :aria-label="theme === 'dark' ? '切换浅色' : '切换深色'"
          :title="theme === 'dark' ? '切换浅色' : '切换深色'"
          @click="emit('toggle-theme')"
        >
          <Sun v-if="theme === 'dark'" :size="15" />
          <Moon v-else :size="15" />
        </ElButton>
      </ElTooltip>
    </div>
  </header>
</template>
