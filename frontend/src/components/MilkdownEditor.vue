<template>
  <MilkdownProvider>
    <div class="milkdown-shell">
      <div class="milkdown-editor">
        <MilkdownHost :active-path="activePath" :model-value="modelValue" @update:model-value="emitUpdate" />
      </div>
    </div>
  </MilkdownProvider>
</template>

<script setup lang="ts">
import { MilkdownProvider } from '@milkdown/vue'
import MilkdownHost from './MilkdownHost.vue'

defineProps<{
  modelValue: string
  activePath: string
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
}>()

function emitUpdate(value: string) {
  emit('update:modelValue', value)
}
</script>
