<script setup lang="ts">
import { darkTheme, NConfigProvider, NDialogProvider, NMessageProvider } from 'naive-ui'
import { computed } from 'vue'
import { createNaiveThemeOverrides } from '../lib/naiveTheme'
import type { ThemeMode } from '../lib/theme'

const props = defineProps<{
  theme: ThemeMode
}>()

const naiveTheme = computed(() => (props.theme === 'dark' ? darkTheme : null))
const themeOverrides = computed(() => createNaiveThemeOverrides(props.theme))
</script>

<template>
  <NConfigProvider :theme="naiveTheme" :theme-overrides="themeOverrides">
    <NDialogProvider>
      <NMessageProvider>
        <slot />
      </NMessageProvider>
    </NDialogProvider>
  </NConfigProvider>
</template>
