<script setup lang="ts">
import { Search, Settings } from '@lucide/vue'
import { ElButton, ElTag, ElTooltip } from 'element-plus'
import type { SaveState } from '../types/app'

defineProps<{
  saveStatusText: string
  saveState: SaveState
}>()

defineEmits<{
  (event: 'search'): void
  (event: 'settings'): void
}>()
</script>

<template>
  <header data-test="topbar" class="topbar app-chrome app-header">
    <div class="brand app-header__brand">
      <span data-test="brand-mark" class="brand-mark">D</span>
      <span class="brand-copy">
        <span class="brand-name">Donote</span>
        <span class="brand-subtitle">Markdown Notes</span>
      </span>
    </div>

    <div class="toolbar-spacer app-header__spacer" />

    <div data-test="window-actions" class="toolbar-group control-cluster window-actions">
      <ElTag
        v-if="saveStatusText"
        class="save-status status-pill"
        :data-state="saveState"
        :type="saveState === 'error' ? 'danger' : saveState === 'dirty' ? 'warning' : 'info'"
      >
        {{ saveStatusText }}
      </ElTag>

      <ElTooltip content="当前文档搜索" placement="bottom">
        <ElButton class="icon-button" data-test="search-toggle" circle @click="$emit('search')">
          <Search :size="18" />
        </ElButton>
      </ElTooltip>
      <ElTooltip content="设置" placement="bottom">
        <ElButton class="icon-button" data-test="settings-toggle" circle @click="$emit('settings')">
          <Settings :size="18" />
        </ElButton>
      </ElTooltip>
    </div>
  </header>
</template>
