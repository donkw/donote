<template>
  <div ref="hostRoot">
    <Milkdown />
  </div>
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
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

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
const hostRoot = ref<HTMLElement | null>(null)
let imageObserver: MutationObserver | null = null

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

onMounted(() => {
  imageObserver = new MutationObserver(() => {
    void resolveWorkspaceImages()
  })
  if (hostRoot.value) {
    imageObserver.observe(hostRoot.value, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src'],
    })
  }
  void resolveWorkspaceImages()
})

onBeforeUnmount(() => {
  imageObserver?.disconnect()
  imageObserver = null
})

async function resolveWorkspaceImages() {
  await nextTick()
  hostRoot.value?.querySelectorAll('img').forEach((image) => {
    const source = image.dataset.markdownSource || image.getAttribute('src') || ''
    void resolveImageElementSource(image, source)
  })
}

async function resolveImageElementSource(image: HTMLImageElement, source: string) {
  if (!props.resolveImageSource || !shouldResolveWorkspaceImageSource(source) || !props.activePath) {
    return
  }
  image.dataset.markdownSource = source
  const activePath = props.activePath
  const cacheKey = `${activePath}\n${source}`
  const cached = resolvedImageSourceCache.get(cacheKey)
  if (cached) {
    if (image.src !== cached) {
      image.src = cached
    }
    return
  }

  try {
    const resolved = await props.resolveImageSource(source, activePath)
    resolvedImageSourceCache.set(cacheKey, resolved)
    if (image.dataset.markdownSource === source && props.activePath === activePath) {
      if (image.src !== resolved) {
        image.src = resolved
      }
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
    void resolveWorkspaceImages()
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
    void resolveWorkspaceImages()
  },
)
</script>
