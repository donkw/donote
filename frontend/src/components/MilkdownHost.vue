<template>
  <div ref="hostRoot" class="milkdown-host-root" @pointerdown.capture="handleHostPointerDown">
    <Milkdown />
    <button
      ref="resizeHandle"
      class="image-resize-handle"
      data-test="image-resize-handle"
      type="button"
      aria-label="调整图片大小"
      hidden
      @pointerdown.stop.prevent="startImageResize"
    />
  </div>
</template>

<script setup lang="ts">
import { defaultValueCtx, Editor, editorViewCtx, prosePluginsCtx, rootCtx } from '@milkdown/kit/core'
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
import {
  createSearchHighlightPlugin,
  searchHighlightPluginKey,
  type SearchHighlightState,
} from '../lib/searchHighlight'

type ResolveImageSource = (source: string, activePath: string) => Promise<string>

const props = withDefaults(
  defineProps<{
    modelValue: string
    activePath: string
    resolveImageSource?: ResolveImageSource
    searchQuery?: string
    activeSearchIndex?: number
  }>(),
  {
    searchQuery: '',
    activeSearchIndex: -1,
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
}>()

let lastMarkdown = props.modelValue
const resolvedImageSourceCache = new Map<string, string>()
const hostRoot = ref<HTMLElement | null>(null)
const resizeHandle = ref<HTMLButtonElement | null>(null)
let imageObserver: MutationObserver | null = null
let activeImage: HTMLImageElement | null = null
let resizeState: {
  pointerId: number
  startX: number
  startWidth: number
  source: string
  occurrenceIndex: number
  width: number
  maxWidth: number
} | null = null

const editor = useEditor((root) =>
  Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root)
      ctx.set(defaultValueCtx, props.modelValue)
      ctx.update(prosePluginsCtx, (plugins) => [
        ...plugins,
        createSearchHighlightPlugin(currentSearchHighlightState()),
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
  updateSearchHighlights()
  window.addEventListener('resize', positionImageResizeHandle)
  window.addEventListener('scroll', positionImageResizeHandle, true)
})

onBeforeUnmount(() => {
  imageObserver?.disconnect()
  imageObserver = null
  removeImageResizeListeners()
  window.removeEventListener('resize', positionImageResizeHandle)
  window.removeEventListener('scroll', positionImageResizeHandle, true)
})

async function resolveWorkspaceImages() {
  await nextTick()
  hostRoot.value?.querySelectorAll('img').forEach((image) => {
    prepareImageElement(image)
    const source = image.dataset.markdownSource || image.getAttribute('src') || ''
    void resolveImageElementSource(image, source)
  })
  positionImageResizeHandle()
}

function prepareImageElement(image: HTMLImageElement) {
  image.classList.add('donote-resizable-image')
  const markdownTitle = image.dataset.markdownTitle ?? image.getAttribute('title') ?? ''
  image.dataset.markdownTitle = markdownTitle

  const width = imageWidthFromTitle(markdownTitle)
  if (width) {
    applyImageWidth(image, width)
  }

  const visibleTitle = cleanImageTitle(markdownTitle)
  if (visibleTitle) {
    image.setAttribute('title', visibleTitle)
  } else {
    image.removeAttribute('title')
  }
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

function currentSearchHighlightState(): SearchHighlightState {
  return {
    query: props.searchQuery,
    activeIndex: props.activeSearchIndex,
  }
}

function updateSearchHighlights() {
  const instance = editor.get()
  if (!instance) {
    return
  }

  instance.action((ctx) => {
    try {
      const view = ctx.get(editorViewCtx)
      if (!searchHighlightPluginKey.get(view.state)) {
        return
      }

      const nextState = currentSearchHighlightState()
      const currentState = searchHighlightPluginKey.getState(view.state)
      if (
        currentState?.query === nextState.query &&
        currentState.activeIndex === nextState.activeIndex
      ) {
        return
      }

      view.dispatch(view.state.tr.setMeta(searchHighlightPluginKey, nextState))
    } catch {
      // The editor view is not available during early setup.
    }
  })
}

function handleHostPointerDown(event: PointerEvent) {
  if (event.target === resizeHandle.value) {
    return
  }
  if (event.button === 0 && event.target instanceof HTMLImageElement) {
    selectImageForResize(event.target)
    return
  }
  hideImageResizeHandle()
}

function selectImageForResize(image: HTMLImageElement) {
  if (activeImage !== image) {
    activeImage?.classList.remove('donote-image-active')
  }
  activeImage = image
  activeImage.classList.add('donote-image-active')
  positionImageResizeHandle()
}

function hideImageResizeHandle() {
  activeImage?.classList.remove('donote-image-active')
  activeImage = null
  if (resizeHandle.value) {
    resizeHandle.value.hidden = true
  }
}

function positionImageResizeHandle() {
  const root = hostRoot.value
  const handle = resizeHandle.value
  if (!root || !handle || !activeImage || !root.contains(activeImage)) {
    if (handle) {
      handle.hidden = true
    }
    return
  }

  const rootRect = root.getBoundingClientRect()
  const imageRect = activeImage.getBoundingClientRect()
  handle.hidden = false
  handle.style.left = `${imageRect.right - rootRect.left + root.scrollLeft - 7}px`
  handle.style.top = `${imageRect.bottom - rootRect.top + root.scrollTop - 7}px`
}

function startImageResize(event: PointerEvent) {
  if (!activeImage || event.button !== 0) {
    return
  }
  const source = activeImage.dataset.markdownSource || activeImage.getAttribute('src') || ''
  if (!source) {
    return
  }

  const imageRect = activeImage.getBoundingClientRect()
  resizeState = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startWidth: imageRect.width || activeImage.width || 240,
    source,
    occurrenceIndex: imageOccurrenceIndex(activeImage, source),
    width: imageRect.width || activeImage.width || 240,
    maxWidth: maxImageWidth(activeImage),
  }
  window.addEventListener('pointermove', resizeImage)
  window.addEventListener('pointerup', finishImageResize)
  window.addEventListener('pointercancel', cancelImageResize)
}

function resizeImage(event: PointerEvent) {
  if (!resizeState || !activeImage || event.pointerId !== resizeState.pointerId) {
    return
  }

  const width = normalizeImageWidth(
    resizeState.startWidth + event.clientX - resizeState.startX,
    resizeState.maxWidth,
  )
  resizeState.width = width
  applyImageWidth(activeImage, width)
  positionImageResizeHandle()
}

function finishImageResize(event: PointerEvent) {
  if (!resizeState || event.pointerId !== resizeState.pointerId) {
    return
  }
  if (activeImage) {
    const width = Math.round(resizeState.width)
    activeImage.dataset.markdownTitle = setImageTitleWidth(
      activeImage.dataset.markdownTitle ?? '',
      width,
    )
    const updatedMarkdown = updateMarkdownImageWidth(
      props.modelValue,
      resizeState.source,
      resizeState.occurrenceIndex,
      width,
    )
    if (updatedMarkdown !== props.modelValue) {
      emit('update:modelValue', updatedMarkdown)
    }
  }
  resizeState = null
  removeImageResizeListeners()
}

function cancelImageResize(event: PointerEvent) {
  if (!resizeState || event.pointerId !== resizeState.pointerId) {
    return
  }
  resizeState = null
  removeImageResizeListeners()
  void resolveWorkspaceImages()
}

function removeImageResizeListeners() {
  window.removeEventListener('pointermove', resizeImage)
  window.removeEventListener('pointerup', finishImageResize)
  window.removeEventListener('pointercancel', cancelImageResize)
}

function applyImageWidth(image: HTMLImageElement, width: number) {
  image.style.width = `${Math.round(width)}px`
  image.style.height = 'auto'
}

function maxImageWidth(image: HTMLImageElement) {
  const editorRoot = image.closest('.ProseMirror') as HTMLElement | null
  const parent = image.parentElement
  return Math.max(120, editorRoot?.clientWidth || parent?.clientWidth || 1400)
}

function normalizeImageWidth(width: number, maxWidth = 1400) {
  return Math.min(Math.max(Math.round(width), 80), maxWidth)
}

function imageOccurrenceIndex(image: HTMLImageElement, source: string) {
  let index = 0
  const images = Array.from(hostRoot.value?.querySelectorAll('img') ?? [])
  for (const item of images) {
    const itemSource = item.dataset.markdownSource || item.getAttribute('src') || ''
    if (!imageSourceMatches(itemSource, source)) {
      continue
    }
    if (item === image) {
      return index
    }
    index += 1
  }
  return 0
}

function updateMarkdownImageWidth(
  markdown: string,
  source: string,
  occurrenceIndex: number,
  width: number,
) {
  let currentIndex = 0
  return markdown.replace(
    /!\[([^\]]*)\]\((\S+?)(?:\s+("([^"]*)"|'([^']*)'|\(([^)]*)\)))?\)/g,
    (match, label, target, _titleToken, doubleTitle, singleTitle, parenTitle) => {
      if (!imageSourceMatches(target, source)) {
        return match
      }
      if (currentIndex !== occurrenceIndex) {
        currentIndex += 1
        return match
      }
      currentIndex += 1
      const title = doubleTitle ?? singleTitle ?? parenTitle ?? ''
      const updatedTitle = escapeMarkdownTitle(setImageTitleWidth(title, width))
      return `![${label}](${target} "${updatedTitle}")`
    },
  )
}

function imageSourceMatches(value: string, source: string) {
  return normalizeComparableImageSource(value) === normalizeComparableImageSource(source)
}

function normalizeComparableImageSource(value: string) {
  const trimmed = value.trim()
  try {
    return decodeURI(trimmed)
  } catch {
    return trimmed
  }
}

function imageWidthFromTitle(title: string) {
  const match = title.match(/(?:^|\s)donote-width=(\d{2,5})(?=\s|$)/)
  return match ? normalizeImageWidth(Number(match[1])) : 0
}

function setImageTitleWidth(title: string, width: number) {
  const cleanedTitle = cleanImageTitle(title)
  return `${cleanedTitle} donote-width=${Math.round(width)}`.trim()
}

function cleanImageTitle(title: string) {
  return title
    .replace(/(?:^|\s)donote-width=\d{2,5}(?=\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeMarkdownTitle(value: string) {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')
}

watch(
  () => props.activePath,
  () => {
    lastMarkdown = props.modelValue
    editor.get()?.action(replaceAll(props.modelValue, true))
    updateSearchHighlights()
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
    updateSearchHighlights()
    void resolveWorkspaceImages()
  },
)

watch(
  () => [props.searchQuery, props.activeSearchIndex] as const,
  () => {
    updateSearchHighlights()
  },
)
</script>
