<template>
  <Milkdown />
</template>

<script setup lang="ts">
import { defaultValueCtx, Editor, rootCtx } from '@milkdown/kit/core'
import { clipboard } from '@milkdown/kit/plugin/clipboard'
import { cursor } from '@milkdown/kit/plugin/cursor'
import { history } from '@milkdown/kit/plugin/history'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
import { trailing } from '@milkdown/kit/plugin/trailing'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { gfm } from '@milkdown/kit/preset/gfm'
import { replaceAll } from '@milkdown/kit/utils'
import { Milkdown, useEditor } from '@milkdown/vue'
import { watch } from 'vue'

const props = defineProps<{
  modelValue: string
  activePath: string
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
}>()

let lastMarkdown = props.modelValue

const editor = useEditor((root) =>
  Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root)
      ctx.set(defaultValueCtx, props.modelValue)
      ctx.get(listenerCtx).markdownUpdated((_, markdown) => {
        lastMarkdown = markdown
        emit('update:modelValue', markdown)
      })
    })
    .use(commonmark)
    .use(gfm)
    .use(history)
    .use(clipboard)
    .use(cursor)
    .use(trailing)
    .use(listener),
)

watch(
  () => props.activePath,
  () => {
    lastMarkdown = props.modelValue
    editor.get()?.action(replaceAll(props.modelValue, true))
  },
)

watch(
  () => props.modelValue,
  (value) => {
    if (value === lastMarkdown) {
      return
    }
    lastMarkdown = value
    editor.get()?.action(replaceAll(value, true))
  },
)
</script>
