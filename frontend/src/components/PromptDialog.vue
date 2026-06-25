<script setup lang="ts">
import { NButton, NInput, NModal } from 'naive-ui'
import { nextTick, ref } from 'vue'
import type { PromptOptions } from '../lib/appFeedback'

const open = ref(false)
const value = ref('')
const options = ref<PromptOptions>({
  title: '',
  initialValue: '',
  positiveText: '确定',
  negativeText: '取消',
})
const inputRef = ref<InstanceType<typeof NInput> | null>(null)
let resolver: ((value: string | null) => void) | null = null

async function requestPrompt(nextOptions: PromptOptions): Promise<string | null> {
  resolver?.(null)
  resolver = null
  options.value = nextOptions
  value.value = nextOptions.initialValue
  open.value = true
  const promptResult = new Promise<string | null>((resolve) => {
    resolver = resolve
  })
  await nextTick()
  inputRef.value?.focus()
  return promptResult
}

function resolvePrompt(result: string | null) {
  open.value = false
  resolver?.(result)
  resolver = null
}

function confirmPrompt() {
  resolvePrompt(value.value)
}

function cancelPrompt() {
  resolvePrompt(null)
}

defineExpose({ requestPrompt })
</script>

<template>
  <NModal
    v-model:show="open"
    preset="dialog"
    :title="options.title"
    :show-icon="false"
    class="prompt-dialog"
    @after-leave="resolver && cancelPrompt()"
  >
    <NInput
      ref="inputRef"
      v-model:value="value"
      data-test="prompt-input"
      @keydown.enter.prevent="confirmPrompt"
    />
    <template #action>
      <NButton data-test="prompt-cancel" @click="cancelPrompt">
        {{ options.negativeText }}
      </NButton>
      <NButton type="primary" data-test="prompt-confirm" @click="confirmPrompt">
        {{ options.positiveText }}
      </NButton>
    </template>
  </NModal>
</template>
