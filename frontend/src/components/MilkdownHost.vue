<template>
  <Milkdown />
</template>

<script setup lang="ts">
import { defaultValueCtx, Editor, nodeViewCtx, rootCtx } from '@milkdown/kit/core'
import { clipboard } from '@milkdown/kit/plugin/clipboard'
import { cursor } from '@milkdown/kit/plugin/cursor'
import { history } from '@milkdown/kit/plugin/history'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
import { trailing } from '@milkdown/kit/plugin/trailing'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { gfm } from '@milkdown/kit/preset/gfm'
import { replaceAll } from '@milkdown/kit/utils'
import type { Node as ProseMirrorNode } from '@milkdown/prose/model'
import type { NodeView as ProseMirrorNodeView, NodeViewConstructor } from '@milkdown/prose/view'
import { Milkdown, useEditor } from '@milkdown/vue'
import { watch } from 'vue'

type ResolveImageSource = (source: string, activePath: string) => Promise<string>

const props = defineProps<{
  modelValue: string
  activePath: string
  resolveImageSource?: ResolveImageSource
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
}>()

let lastMarkdown = props.modelValue
const resolvedImageSourceCache = new Map<string, string>()

const editor = useEditor((root) =>
  Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root)
      ctx.set(defaultValueCtx, props.modelValue)
      ctx.update(nodeViewCtx, (views) => [
        ...views,
        ['image', createImageNodeView] as [string, NodeViewConstructor],
      ])
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

function createImageNodeView(node: ProseMirrorNode): ProseMirrorNodeView {
  const image = document.createElement('img')
  let currentNode = node

  const render = () => {
    const source = String(currentNode.attrs.src ?? '')
    image.dataset.markdownSource = source
    image.src = source
    image.alt = String(currentNode.attrs.alt ?? '')
    const title = currentNode.attrs.title ? String(currentNode.attrs.title) : ''
    if (title) {
      image.title = title
    } else {
      image.removeAttribute('title')
    }
    void resolveImageElementSource(image, source)
  }

  render()

  return {
    dom: image,
    update(nextNode) {
      if (nextNode.type.name !== currentNode.type.name) {
        return false
      }
      currentNode = nextNode
      render()
      return true
    },
    ignoreMutation: () => true,
  }
}

async function resolveImageElementSource(image: HTMLImageElement, source: string) {
  if (!props.resolveImageSource || !shouldResolveWorkspaceImageSource(source) || !props.activePath) {
    return
  }
  const activePath = props.activePath
  const cacheKey = `${activePath}\n${source}`
  const cached = resolvedImageSourceCache.get(cacheKey)
  if (cached) {
    image.src = cached
    return
  }

  try {
    const resolved = await props.resolveImageSource(source, activePath)
    resolvedImageSourceCache.set(cacheKey, resolved)
    if (image.dataset.markdownSource === source && props.activePath === activePath) {
      image.src = resolved
    }
  } catch {
    // Keep the markdown src when the local preview cannot be resolved.
  }
}

function shouldResolveWorkspaceImageSource(source: string) {
  const trimmed = source.trim().toLowerCase()
  return (
    trimmed !== '' &&
    !trimmed.startsWith('#') &&
    !trimmed.startsWith('//') &&
    !trimmed.startsWith('data:') &&
    !trimmed.startsWith('blob:') &&
    !trimmed.startsWith('file:') &&
    !trimmed.startsWith('http://') &&
    !trimmed.startsWith('https://')
  )
}

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
