<script setup lang="ts">
import {
  ListTree,
  Moon,
  Save,
  Search,
  Settings,
  Sun,
} from '@lucide/vue'
import { NButton, NTooltip } from 'naive-ui'
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
  return panelActive(panel) ? 'primary' : 'default'
}

function panelActive(panel: UtilityPanel) {
  return props.drawerOpen && props.activePanel === panel
}
</script>

<template>
  <header data-test="command-toolbar" class="command-toolbar">
    <div class="command-toolbar__spacer" aria-hidden="true" />

    <div class="command-actions">
      <NTooltip placement="bottom">
        <template #trigger>
          <NButton
            class="command-button"
            :class="{ 'command-button--active': searchOpen }"
            size="small"
            quaternary
            data-test="utility-search"
            aria-label="搜索"
            title="搜索"
            :type="searchOpen ? 'primary' : 'default'"
            :aria-pressed="searchOpen"
            @click="emit('search')"
          >
            <Search :size="15" />
          </NButton>
        </template>
        搜索
      </NTooltip>

      <NTooltip placement="bottom">
        <template #trigger>
          <NButton
            class="command-button"
            size="small"
            quaternary
            data-test="save-now"
            aria-label="立即保存"
            title="立即保存"
            :loading="saveState === 'saving'"
            :disabled="saveState === 'saving'"
            @click="emit('save')"
          >
            <Save :size="15" />
          </NButton>
        </template>
        立即保存
      </NTooltip>

      <NTooltip placement="bottom">
        <template #trigger>
          <NButton
            class="command-button"
            :class="{ 'command-button--active': panelActive('outline') }"
            size="small"
            quaternary
            data-test="utility-outline"
            aria-label="大纲"
            title="大纲"
            :type="panelType('outline')"
            :aria-pressed="panelActive('outline')"
            @click="emit('select', 'outline')"
          >
            <ListTree :size="15" />
          </NButton>
        </template>
        大纲
      </NTooltip>

      <NTooltip placement="bottom">
        <template #trigger>
          <NButton
            class="command-button"
            :class="{ 'command-button--active': panelActive('settings') }"
            size="small"
            quaternary
            data-test="utility-settings"
            aria-label="设置"
            title="设置"
            :type="panelType('settings')"
            :aria-pressed="panelActive('settings')"
            @click="emit('select', 'settings')"
          >
            <Settings :size="15" />
          </NButton>
        </template>
        设置
      </NTooltip>

      <NTooltip placement="bottom">
        <template #trigger>
          <NButton
            class="command-button"
            size="small"
            quaternary
            data-test="theme-toggle"
            :aria-label="theme === 'dark' ? '切换浅色' : '切换深色'"
            :title="theme === 'dark' ? '切换浅色' : '切换深色'"
            @click="emit('toggle-theme')"
          >
            <Sun v-if="theme === 'dark'" :size="15" />
            <Moon v-else :size="15" />
          </NButton>
        </template>
        {{ theme === 'dark' ? '切换浅色' : '切换深色' }}
      </NTooltip>
    </div>
  </header>
</template>
