import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, onMounted } from 'vue'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { ElMessage, ElMessageBox } from 'element-plus'
import App from './App.vue'
import WorkspaceSidebar from './components/WorkspaceSidebar.vue'
import {
  CreateFolder,
  CreateMarkdown,
  DeletePath,
  ListWorkspace,
  OpenWorkspace,
  ReadMarkdown,
  RenamePath,
  ResolveImageSource,
  SaveAttachment,
  SaveMarkdown,
  SelectAttachmentDirectory,
  SelectWorkspace,
} from '../wailsjs/go/main/App'

let emitInitialMarkdown: ((value: string) => string) | null = null
let emitInitialCleanMarkdown: ((value: string) => string) | null = null
const elementPlusMocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  prompt: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
}))
const runtimeMocks = vi.hoisted(() => {
  const events = new Map<string, (...args: unknown[]) => void>()
  return {
    events,
    EventsOn: vi.fn((eventName: string, callback: (...args: unknown[]) => void) => {
      events.set(eventName, callback)
      return () => events.delete(eventName)
    }),
  }
})

vi.mock('../wailsjs/go/main/App', () => ({
  SelectWorkspace: vi.fn(),
  OpenWorkspace: vi.fn(),
  ListWorkspace: vi.fn(),
  ReadMarkdown: vi.fn(),
  SaveMarkdown: vi.fn().mockResolvedValue({ path: 'intro.md', savedAt: 'now' }),
  CreateMarkdown: vi.fn(),
  CreateFolder: vi.fn(),
  RenamePath: vi.fn(),
  DeletePath: vi.fn(),
  ResolveImageSource: vi.fn(),
  SaveAttachment: vi.fn(),
  SelectAttachmentDirectory: vi.fn(),
}))

vi.mock('../wailsjs/runtime/runtime', () => ({
  EventsOn: runtimeMocks.EventsOn,
}))

vi.mock('element-plus', async () => {
  const actual = await vi.importActual<typeof import('element-plus')>('element-plus')
  return {
    ...actual,
    ElMessageBox: {
      ...actual.ElMessageBox,
      confirm: elementPlusMocks.confirm,
      prompt: elementPlusMocks.prompt,
    },
    ElMessage: {
      ...actual.ElMessage,
      error: elementPlusMocks.error,
      success: elementPlusMocks.success,
    },
  }
})

vi.mock('./components/MilkdownEditor.vue', () => ({
  default: defineComponent({
    name: 'MilkdownEditor',
    props: {
      modelValue: { type: String, required: true },
      activePath: { type: String, default: '' },
      resolveImageSource: { type: Function, default: undefined },
      searchQuery: { type: String, default: '' },
      activeSearchIndex: { type: Number, default: -1 },
    },
    emits: ['update:modelValue', 'paste-files', 'insert-markdown', 'sync-clean-content'],
    setup(props, { emit }) {
      onMounted(() => {
        if (emitInitialCleanMarkdown) {
          window.setTimeout(() => {
            if (emitInitialCleanMarkdown) {
              emit('sync-clean-content', emitInitialCleanMarkdown(props.modelValue as string))
            }
          }, 0)
        }
        if (emitInitialMarkdown) {
          window.setTimeout(() => {
            if (emitInitialMarkdown) {
              emit('update:modelValue', emitInitialMarkdown(props.modelValue as string))
            }
          }, 0)
        }
      })
      function handlePaste(event: ClipboardEvent) {
        emit('paste-files', Array.from(event.clipboardData?.files ?? []))
      }

      return { handlePaste }
    },
    template: `
      <div>
        <div data-test="format-toolbar" class="format-toolbar format-toolbar--vertical editor-format-toolbar">
          <button data-test="format-heading" @click="$emit('insert-markdown', '# 标题')">标题</button>
        </div>
        <textarea class="mock-editor" :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" @paste="handlePaste" />
      </div>
    `,
  }),
}))

function emitMenuEvent(eventName: 'menu:open-workspace' | 'menu:create-note') {
  const handler = runtimeMocks.events.get(eventName)
  expect(handler).toBeDefined()
  handler?.()
}

function dispatchPointerEvent(
  target: EventTarget,
  type: string,
  options: { clientX: number; button?: number },
) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'clientX', { value: options.clientX })
  Object.defineProperty(event, 'button', { value: options.button ?? 0 })
  target.dispatchEvent(event)
}

function dispatchPasteFiles(target: EventTarget, files: File[]) {
  const event = new Event('paste', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'clipboardData', {
    value: {
      files,
      items: files.map((file) => ({
        kind: 'file',
        type: file.type,
        getAsFile: () => file,
      })),
    },
  })
  target.dispatchEvent(event)
}

async function waitForAssertion(assertion: () => void) {
  let lastError: unknown
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      assertion()
      return
    } catch (error) {
      lastError = error
      await new Promise((resolve) => window.setTimeout(resolve, 10))
      await flushPromises()
    }
  }
  throw lastError
}

describe('App shell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    emitInitialMarkdown = null
    emitInitialCleanMarkdown = null
    runtimeMocks.events.clear()
    window.localStorage.clear()
    elementPlusMocks.confirm.mockResolvedValue('confirm')
    elementPlusMocks.prompt.mockResolvedValue({ value: '未命名.md' })
    vi.mocked(SelectWorkspace).mockReset()
    vi.mocked(SelectWorkspace).mockResolvedValue({
      rootPath: '',
      name: '',
      tree: [],
    } as any)
  })

  test('starts with a Chinese empty workspace state', () => {
    const wrapper = mount(App)

    expect(wrapper.find('[data-test="topbar"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('选择一个笔记文件夹开始写作')
  })

  test('prompts for a workspace on first startup', async () => {
    vi.mocked(SelectWorkspace).mockResolvedValue({
      rootPath: 'D:/notes',
      name: 'notes',
      tree: [
        {
          name: 'intro.md',
          path: 'intro.md',
          type: 'file',
        } as any,
      ],
    } as any)

    const wrapper = mount(App)
    await flushPromises()

    expect(SelectWorkspace).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('notes')
    expect(wrapper.text()).toContain('intro.md')
    expect(window.localStorage.getItem('donote.lastWorkspaceRoot')).toBe('D:/notes')
  })

  test('renders the dark command workspace shell without the permanent utility rail', () => {
    const wrapper = mount(App)

    expect(wrapper.find('[data-test="topbar"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="command-toolbar"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="brand-mark"]').exists()).toBe(true)
    expect(wrapper.find('.utility-rail').exists()).toBe(false)
    expect(wrapper.find('[data-test="format-toolbar"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="theme-toggle"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="save-now"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="utility-outline"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="utility-search"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="search-input"]').exists()).toBe(false)
  })

  test('restores the last opened workspace on startup', async () => {
    window.localStorage.setItem('donote.lastWorkspaceRoot', 'D:/notes')
    vi.mocked(OpenWorkspace).mockResolvedValue({
      rootPath: 'D:/notes',
      name: 'notes',
      tree: [
        {
          name: 'intro.md',
          path: 'intro.md',
          type: 'file',
        } as any,
      ],
    } as any)

    const wrapper = mount(App)
    await flushPromises()

    expect(OpenWorkspace).toHaveBeenCalledWith('D:/notes')
    expect(SelectWorkspace).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('notes')
    expect(wrapper.text()).toContain('intro.md')
  })

  test('restores the last opened markdown documents after restoring the workspace', async () => {
    window.localStorage.setItem('donote.lastWorkspaceRoot', 'D:/notes')
    window.localStorage.setItem(
      'donote.openDocuments',
      '{"rootPath":"D:/notes","paths":["intro.md","next.md"],"activePath":"next.md"}',
    )
    vi.mocked(OpenWorkspace).mockResolvedValue({
      rootPath: 'D:/notes',
      name: 'notes',
      tree: [
        {
          name: 'intro.md',
          path: 'intro.md',
          type: 'file',
        } as any,
        {
          name: 'next.md',
          path: 'next.md',
          type: 'file',
        } as any,
      ],
    } as any)
    vi.mocked(ReadMarkdown).mockImplementation(async (path) => ({
      path,
      name: path,
      content: path === 'intro.md' ? '# Intro' : '# Next',
    }))

    const wrapper = mount(App)
    await flushPromises()

    expect(ReadMarkdown).toHaveBeenCalledWith('intro.md')
    expect(ReadMarkdown).toHaveBeenCalledWith('next.md')
    expect(wrapper.find('[data-test="tab-intro.md"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="tab-next.md"]').exists()).toBe(true)
    expect((wrapper.get('.mock-editor').element as HTMLTextAreaElement).value).toBe('# Next')
  })

  test('opens a workspace and loads a markdown document from the file tree', async () => {
    vi.mocked(SelectWorkspace).mockResolvedValue({
      rootPath: 'D:/notes',
      name: 'notes',
      tree: [
        {
          name: 'intro.md',
          path: 'intro.md',
          type: 'file',
        } as any,
      ],
    } as any)
    vi.mocked(ReadMarkdown).mockResolvedValue({
      path: 'intro.md',
      name: 'intro.md',
      content: '# Intro',
    })

    const wrapper = mount(App)
    emitMenuEvent('menu:open-workspace')
    await flushPromises()

    expect(wrapper.text()).toContain('notes')
    expect(wrapper.text()).toContain('intro.md')
    expect(window.localStorage.getItem('donote.lastWorkspaceRoot')).toBe('D:/notes')

    await wrapper.get('[data-test="file-intro.md"]').trigger('click')
    await flushPromises()
    expect(ReadMarkdown).toHaveBeenCalledWith('intro.md')
    expect((wrapper.get('.mock-editor').element as HTMLTextAreaElement).value).toBe('# Intro')

    expect(wrapper.get('[data-test="format-toolbar"]').classes()).toContain(
      'format-toolbar--vertical',
    )
    await wrapper.get('[data-test="format-heading"]').trigger('click')
    await flushPromises()
    expect((wrapper.get('.mock-editor').element as HTMLTextAreaElement).value).toBe(
      '# Intro\n\n# 标题',
    )
  })

  test('opens multiple markdown files as tabs and preserves each tab draft', async () => {
    vi.mocked(SelectWorkspace).mockResolvedValue({
      rootPath: 'D:/notes',
      name: 'notes',
      tree: [
        {
          name: 'intro.md',
          path: 'intro.md',
          type: 'file',
        } as any,
        {
          name: 'next.md',
          path: 'next.md',
          type: 'file',
        } as any,
      ],
    } as any)
    vi.mocked(ReadMarkdown).mockImplementation(async (path) => ({
      path,
      name: path,
      content: path === 'intro.md' ? '# Intro' : '# Next',
    }))

    const wrapper = mount(App)
    emitMenuEvent('menu:open-workspace')
    await flushPromises()
    await wrapper.get('[data-test="file-intro.md"]').trigger('click')
    await flushPromises()

    await wrapper.get('.mock-editor').setValue('# Intro draft')
    await flushPromises()
    await wrapper.get('[data-test="file-next.md"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="tab-intro.md"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="tab-next.md"]').exists()).toBe(true)
    expect((wrapper.get('.mock-editor').element as HTMLTextAreaElement).value).toBe('# Next')

    await wrapper.get('[data-test="tab-intro.md"]').trigger('click')
    await flushPromises()

    expect((wrapper.get('.mock-editor').element as HTMLTextAreaElement).value).toBe(
      '# Intro draft',
    )
    expect(wrapper.find('[data-test="tab-intro.md"] .dirty-mark').exists()).toBe(true)
    expect(SaveMarkdown).not.toHaveBeenCalled()
  })

  test('closes a clean tab without confirmation and activates a neighboring tab', async () => {
    vi.mocked(SelectWorkspace).mockResolvedValue({
      rootPath: 'D:/notes',
      name: 'notes',
      tree: [
        {
          name: 'intro.md',
          path: 'intro.md',
          type: 'file',
        } as any,
        {
          name: 'next.md',
          path: 'next.md',
          type: 'file',
        } as any,
      ],
    } as any)
    vi.mocked(ReadMarkdown).mockImplementation(async (path) => ({
      path,
      name: path,
      content: path === 'intro.md' ? '# Intro' : '# Next',
    }))

    const wrapper = mount(App)
    emitMenuEvent('menu:open-workspace')
    await flushPromises()
    await wrapper.get('[data-test="file-intro.md"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-test="file-next.md"]').trigger('click')
    await flushPromises()

    await wrapper.get('[data-test="tab-close-next.md"]').trigger('click')
    await flushPromises()

    expect(ElMessageBox.confirm).not.toHaveBeenCalled()
    expect(wrapper.find('[data-test="tab-next.md"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="tab-intro.md"]').exists()).toBe(true)
    expect((wrapper.get('.mock-editor').element as HTMLTextAreaElement).value).toBe('# Intro')
  })

  test('closes a freshly opened tab without prompting after editor newline normalization', async () => {
    emitInitialMarkdown = (value) => `${value}\n`
    vi.mocked(SelectWorkspace).mockResolvedValue({
      rootPath: 'D:/notes',
      name: 'notes',
      tree: [
        {
          name: 'intro.md',
          path: 'intro.md',
          type: 'file',
        } as any,
      ],
    } as any)
    vi.mocked(ReadMarkdown).mockResolvedValue({
      path: 'intro.md',
      name: 'intro.md',
      content: '# Intro',
    })

    const wrapper = mount(App)
    emitMenuEvent('menu:open-workspace')
    await flushPromises()
    await wrapper.get('[data-test="file-intro.md"]').trigger('click')
    await flushPromises()
    await new Promise((resolve) => window.setTimeout(resolve, 0))
    await flushPromises()

    await wrapper.get('[data-test="tab-close-intro.md"]').trigger('click')
    await flushPromises()

    expect(ElMessageBox.confirm).not.toHaveBeenCalled()
    expect(wrapper.find('[data-test="tab-intro.md"]').exists()).toBe(false)
  })

  test('uses Element Plus confirmation before closing a dirty tab', async () => {
    elementPlusMocks.confirm.mockRejectedValueOnce(new Error('cancelled'))
    vi.mocked(SelectWorkspace).mockResolvedValue({
      rootPath: 'D:/notes',
      name: 'notes',
      tree: [
        {
          name: 'intro.md',
          path: 'intro.md',
          type: 'file',
        } as any,
        {
          name: 'next.md',
          path: 'next.md',
          type: 'file',
        } as any,
      ],
    } as any)
    vi.mocked(ReadMarkdown).mockImplementation(async (path) => ({
      path,
      name: path,
      content: path === 'intro.md' ? '# Intro' : '# Next',
    }))

    const wrapper = mount(App)
    emitMenuEvent('menu:open-workspace')
    await flushPromises()
    await wrapper.get('[data-test="file-intro.md"]').trigger('click')
    await flushPromises()
    await wrapper.get('.mock-editor').setValue('# Draft')
    await flushPromises()
    await wrapper.get('[data-test="file-next.md"]').trigger('click')
    await flushPromises()

    await wrapper.get('[data-test="tab-close-intro.md"]').trigger('click')
    await flushPromises()

    expect(ElMessageBox.confirm).toHaveBeenCalledWith(
      '「intro.md」有未保存更改，关闭后将丢失。',
      '关闭未保存笔记',
      expect.objectContaining({
        confirmButtonText: '关闭',
        cancelButtonText: '取消',
      }),
    )
    expect(wrapper.find('[data-test="tab-intro.md"]').exists()).toBe(true)

    elementPlusMocks.confirm.mockResolvedValueOnce('confirm')
    await wrapper.get('[data-test="tab-close-intro.md"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="tab-intro.md"]').exists()).toBe(false)
    expect(SaveMarkdown).not.toHaveBeenCalled()
    expect((wrapper.get('.mock-editor').element as HTMLTextAreaElement).value).toBe('# Next')
  })

  test('does not auto-save edits and saves only from Ctrl+S', async () => {
    vi.useFakeTimers()
    vi.mocked(SelectWorkspace).mockResolvedValue({
      rootPath: 'D:/notes',
      name: 'notes',
      tree: [
        {
          name: 'intro.md',
          path: 'intro.md',
          type: 'file',
        } as any,
      ],
    } as any)
    vi.mocked(ReadMarkdown).mockResolvedValue({
      path: 'intro.md',
      name: 'intro.md',
      content: '# Intro',
    })

    const wrapper = mount(App)
    emitMenuEvent('menu:open-workspace')
    await flushPromises()
    await wrapper.get('[data-test="file-intro.md"]').trigger('click')
    await flushPromises()

    await wrapper.get('.mock-editor').setValue('# Changed')
    await flushPromises()

    expect(wrapper.find('[data-test="tab-intro.md"] .dirty-mark').exists()).toBe(true)
    await vi.advanceTimersByTimeAsync(1_600)
    expect(SaveMarkdown).not.toHaveBeenCalled()

    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        bubbles: true,
      }),
    )
    await flushPromises()

    expect(SaveMarkdown).toHaveBeenCalledWith('intro.md', '# Changed')
    expect(wrapper.find('[data-test="tab-intro.md"] .dirty-mark').exists()).toBe(false)
    vi.useRealTimers()
  })

  test('clears dirty state when undo returns Milkdown-normalized original markdown', async () => {
    vi.mocked(SelectWorkspace).mockResolvedValue({
      rootPath: 'D:/notes',
      name: 'notes',
      tree: [
        {
          name: 'intro.md',
          path: 'intro.md',
          type: 'file',
        } as any,
      ],
    } as any)
    vi.mocked(ReadMarkdown).mockResolvedValue({
      path: 'intro.md',
      name: 'intro.md',
      content: '# Intro\r\n\r\n* item',
    })

    const wrapper = mount(App)
    emitMenuEvent('menu:open-workspace')
    await flushPromises()
    await wrapper.get('[data-test="file-intro.md"]').trigger('click')
    await flushPromises()

    await wrapper.get('.mock-editor').setValue('# Changed')
    await flushPromises()
    expect(wrapper.find('[data-test="tab-intro.md"] .dirty-mark').exists()).toBe(true)

    await wrapper.get('.mock-editor').setValue('# Intro\n\n- item')
    await flushPromises()

    expect(wrapper.find('[data-test="tab-intro.md"] .dirty-mark').exists()).toBe(false)
  })

  test('uses editor clean markdown normalization as the saved baseline', async () => {
    emitInitialCleanMarkdown = () => '# Intro normalized'
    vi.mocked(SelectWorkspace).mockResolvedValue({
      rootPath: 'D:/notes',
      name: 'notes',
      tree: [
        {
          name: 'intro.md',
          path: 'intro.md',
          type: 'file',
        } as any,
      ],
    } as any)
    vi.mocked(ReadMarkdown).mockResolvedValue({
      path: 'intro.md',
      name: 'intro.md',
      content: '# Intro raw',
    })

    const wrapper = mount(App)
    emitMenuEvent('menu:open-workspace')
    await flushPromises()
    await wrapper.get('[data-test="file-intro.md"]').trigger('click')
    await flushPromises()
    await new Promise((resolve) => window.setTimeout(resolve, 0))
    await flushPromises()

    expect((wrapper.get('.mock-editor').element as HTMLTextAreaElement).value).toBe(
      '# Intro normalized',
    )
    expect(wrapper.find('[data-test="tab-intro.md"] .dirty-mark').exists()).toBe(false)

    await wrapper.get('.mock-editor').setValue('# Changed')
    await flushPromises()
    expect(wrapper.find('[data-test="tab-intro.md"] .dirty-mark').exists()).toBe(true)
    expect(wrapper.find('.command-status').exists()).toBe(false)

    wrapper.getComponent({ name: 'MilkdownEditor' }).vm.$emit('sync-clean-content', '# Changed')
    await flushPromises()
    expect(wrapper.find('[data-test="tab-intro.md"] .dirty-mark').exists()).toBe(true)
    expect(wrapper.find('.command-status').exists()).toBe(false)

    await wrapper.get('.mock-editor').setValue('# Intro normalized')
    await flushPromises()

    expect(wrapper.find('[data-test="tab-intro.md"] .dirty-mark').exists()).toBe(false)
    expect(wrapper.find('.command-status').exists()).toBe(false)
  })

  test('does not implicitly save dirty content when opening another tab', async () => {
    vi.mocked(SelectWorkspace).mockResolvedValue({
      rootPath: 'D:/notes',
      name: 'notes',
      tree: [
        {
          name: 'intro.md',
          path: 'intro.md',
          type: 'file',
        } as any,
        {
          name: 'next.md',
          path: 'next.md',
          type: 'file',
        } as any,
      ],
    } as any)
    vi.mocked(ReadMarkdown).mockImplementation(async (path) => ({
      path,
      name: path,
      content: path === 'intro.md' ? '# Intro' : '# Next',
    }))

    const wrapper = mount(App)
    emitMenuEvent('menu:open-workspace')
    await flushPromises()
    await wrapper.get('[data-test="file-intro.md"]').trigger('click')
    await flushPromises()

    await wrapper.get('.mock-editor').setValue('# Unsaved')
    await flushPromises()
    await wrapper.get('[data-test="file-next.md"]').trigger('click')
    await flushPromises()

    expect(ElMessageBox.confirm).not.toHaveBeenCalled()
    expect(SaveMarkdown).not.toHaveBeenCalled()
    expect((wrapper.get('.mock-editor').element as HTMLTextAreaElement).value).toBe('# Next')

    await wrapper.get('[data-test="tab-intro.md"]').trigger('click')
    await flushPromises()

    expect((wrapper.get('.mock-editor').element as HTMLTextAreaElement).value).toBe('# Unsaved')
  })

  test('persists collapsed folder state and restores it when reopening a workspace', async () => {
    vi.mocked(SelectWorkspace).mockResolvedValue({
      rootPath: 'D:/notes',
      name: 'notes',
      tree: [
        {
          name: 'projects',
          path: 'projects',
          type: 'folder',
          children: [
            {
              name: 'archive',
              path: 'projects/archive',
              type: 'folder',
              children: [
                {
                  name: 'plan.md',
                  path: 'projects/archive/plan.md',
                  type: 'file',
                },
              ],
            },
          ],
        } as any,
      ],
    } as any)

    const wrapper = mount(App)
    emitMenuEvent('menu:open-workspace')
    await flushPromises()

    expect(wrapper.find('[data-test="folder-projects"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="file-projects/archive/plan.md"]').exists()).toBe(false)
    expect(wrapper.getComponent(WorkspaceSidebar).props('expandedFolderPaths')).toEqual([])

    await wrapper.get('[data-test="folder-projects"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="folder-projects/archive"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="file-projects/archive/plan.md"]').exists()).toBe(false)
    expect(wrapper.getComponent(WorkspaceSidebar).props('expandedFolderPaths')).toEqual(['projects'])
    expect(window.localStorage.getItem('donote.treeExpansion')).toBe(
      '{"D:/notes":["projects/archive"]}',
    )

    wrapper.unmount()
    const reopened = mount(App)
    emitMenuEvent('menu:open-workspace')
    await flushPromises()

    expect(reopened.find('[data-test="file-projects/archive/plan.md"]').exists()).toBe(false)
    expect(reopened.getComponent(WorkspaceSidebar).props('expandedFolderPaths')).toEqual([
      'projects',
    ])

    await reopened.get('[data-test="folder-projects/archive"]').trigger('click')
    await flushPromises()

    expect(reopened.find('[data-test="file-projects/archive/plan.md"]').exists()).toBe(true)
    expect(reopened.getComponent(WorkspaceSidebar).props('expandedFolderPaths')).toEqual([
      'projects',
      'projects/archive',
    ])
    expect(window.localStorage.getItem('donote.treeExpansion')).toBe('{"D:/notes":[]}')
  })

  test('creates a note in the current workspace without reopening the folder picker', async () => {
    elementPlusMocks.prompt.mockResolvedValueOnce({ value: 'new.md' })
    vi.mocked(SelectWorkspace).mockResolvedValue({
      rootPath: 'D:/notes',
      name: 'notes',
      tree: [],
    } as any)
    vi.mocked(CreateMarkdown).mockResolvedValue({
      name: 'new.md',
      path: 'new.md',
      type: 'file',
    } as any)
    vi.mocked(ListWorkspace).mockResolvedValue([
      {
        name: 'new.md',
        path: 'new.md',
        type: 'file',
      } as any,
    ])
    vi.mocked(ReadMarkdown).mockResolvedValue({
      path: 'new.md',
      name: 'new.md',
      content: '# New',
    })

    const wrapper = mount(App)
    emitMenuEvent('menu:open-workspace')
    await flushPromises()
    vi.mocked(SelectWorkspace).mockClear()

    emitMenuEvent('menu:create-note')
    await flushPromises()

    expect(ElMessageBox.prompt).toHaveBeenCalledWith(
      '请输入笔记名称',
      '新建笔记',
      expect.objectContaining({
        inputValue: '未命名.md',
        confirmButtonText: '创建',
        cancelButtonText: '取消',
      }),
    )
    expect(CreateMarkdown).toHaveBeenCalledWith('', 'new.md')
    expect(ListWorkspace).toHaveBeenCalled()
    expect(SelectWorkspace).not.toHaveBeenCalled()
    expect(ReadMarkdown).toHaveBeenCalledWith('new.md')
  })

  test('creates a markdown file from a folder context menu and opens it', async () => {
    elementPlusMocks.prompt.mockResolvedValueOnce({ value: 'plan.md' })
    vi.mocked(SelectWorkspace).mockResolvedValue({
      rootPath: 'D:/notes',
      name: 'notes',
      tree: [
        {
          name: 'projects',
          path: 'projects',
          type: 'folder',
          children: [],
        } as any,
      ],
    } as any)
    vi.mocked(CreateMarkdown).mockResolvedValue({
      name: 'plan.md',
      path: 'projects/plan.md',
      type: 'file',
    } as any)
    vi.mocked(ListWorkspace).mockResolvedValue([
      {
        name: 'projects',
        path: 'projects',
        type: 'folder',
        children: [
          {
            name: 'plan.md',
            path: 'projects/plan.md',
            type: 'file',
          },
        ],
      } as any,
    ])
    vi.mocked(ReadMarkdown).mockResolvedValue({
      path: 'projects/plan.md',
      name: 'plan.md',
      content: '# Plan',
    })

    const wrapper = mount(App)
    emitMenuEvent('menu:open-workspace')
    await flushPromises()

    await wrapper.get('[data-test="folder-projects"]').trigger('contextmenu', {
      clientX: 28,
      clientY: 64,
    })
    await wrapper.get('[data-test="context-create-markdown"]').trigger('click')
    await flushPromises()

    expect(ElMessageBox.prompt).toHaveBeenCalledWith(
      '请输入笔记名称',
      '新建笔记',
      expect.objectContaining({
        inputValue: '未命名.md',
        confirmButtonText: '创建',
        cancelButtonText: '取消',
      }),
    )
    expect(CreateMarkdown).toHaveBeenCalledWith('projects', 'plan.md')
    expect(ListWorkspace).toHaveBeenCalled()
    expect(ReadMarkdown).toHaveBeenCalledWith('projects/plan.md')
    expect(wrapper.find('[data-test="tab-projects/plan.md"]').exists()).toBe(true)
  })

  test('creates a child folder from a folder context menu', async () => {
    elementPlusMocks.prompt.mockResolvedValueOnce({ value: 'archive' })
    vi.mocked(SelectWorkspace).mockResolvedValue({
      rootPath: 'D:/notes',
      name: 'notes',
      tree: [
        {
          name: 'projects',
          path: 'projects',
          type: 'folder',
          children: [],
        } as any,
      ],
    } as any)
    vi.mocked(CreateFolder).mockResolvedValue({
      name: 'archive',
      path: 'projects/archive',
      type: 'folder',
    } as any)
    vi.mocked(ListWorkspace).mockResolvedValue([
      {
        name: 'projects',
        path: 'projects',
        type: 'folder',
        children: [
          {
            name: 'archive',
            path: 'projects/archive',
            type: 'folder',
            children: [],
          },
        ],
      } as any,
    ])

    const wrapper = mount(App)
    emitMenuEvent('menu:open-workspace')
    await flushPromises()

    await wrapper.get('[data-test="folder-projects"]').trigger('contextmenu', {
      clientX: 28,
      clientY: 64,
    })
    await wrapper.get('[data-test="context-create-folder"]').trigger('click')
    await flushPromises()

    expect(ElMessageBox.prompt).toHaveBeenCalledWith(
      '请输入文件夹名称',
      '新建子目录',
      expect.objectContaining({
        inputValue: '新建文件夹',
        confirmButtonText: '创建',
        cancelButtonText: '取消',
      }),
    )
    expect(CreateFolder).toHaveBeenCalledWith('projects', 'archive')
    expect(ListWorkspace).toHaveBeenCalled()
    expect(wrapper.text()).toContain('archive')
  })

  test('renames a tree file from the context menu and keeps the open tab path current', async () => {
    elementPlusMocks.prompt.mockResolvedValueOnce({ value: 'renamed.md' })
    vi.mocked(SelectWorkspace).mockResolvedValue({
      rootPath: 'D:/notes',
      name: 'notes',
      tree: [
        {
          name: 'intro.md',
          path: 'intro.md',
          type: 'file',
        } as any,
      ],
    } as any)
    vi.mocked(ReadMarkdown).mockResolvedValue({
      path: 'intro.md',
      name: 'intro.md',
      content: '# Intro',
    })
    vi.mocked(RenamePath).mockResolvedValue({
      name: 'renamed.md',
      path: 'renamed.md',
      type: 'file',
    } as any)
    vi.mocked(ListWorkspace).mockResolvedValue([
      {
        name: 'renamed.md',
        path: 'renamed.md',
        type: 'file',
      } as any,
    ])

    const wrapper = mount(App)
    emitMenuEvent('menu:open-workspace')
    await flushPromises()
    await wrapper.get('[data-test="file-intro.md"]').trigger('click')
    await flushPromises()

    await wrapper.get('[data-test="file-intro.md"]').trigger('contextmenu', {
      clientX: 28,
      clientY: 64,
    })
    await wrapper.get('[data-test="context-rename"]').trigger('click')
    await flushPromises()

    expect(ElMessageBox.prompt).toHaveBeenCalledWith(
      '请输入新的名称',
      '重命名',
      expect.objectContaining({
        inputValue: 'intro.md',
        confirmButtonText: '重命名',
        cancelButtonText: '取消',
      }),
    )
    expect(RenamePath).toHaveBeenCalledWith('intro.md', 'renamed.md')
    expect(ListWorkspace).toHaveBeenCalled()
    expect(wrapper.find('[data-test="tab-renamed.md"]').exists()).toBe(true)
    expect(window.localStorage.getItem('donote.openDocuments')).toContain('renamed.md')
  })

  test('renames a tree folder from the context menu', async () => {
    elementPlusMocks.prompt.mockResolvedValueOnce({ value: 'archive' })
    vi.mocked(SelectWorkspace).mockResolvedValue({
      rootPath: 'D:/notes',
      name: 'notes',
      tree: [
        {
          name: 'projects',
          path: 'projects',
          type: 'folder',
          children: [],
        } as any,
      ],
    } as any)
    vi.mocked(RenamePath).mockResolvedValue({
      name: 'archive',
      path: 'archive',
      type: 'folder',
    } as any)
    vi.mocked(ListWorkspace).mockResolvedValue([
      {
        name: 'archive',
        path: 'archive',
        type: 'folder',
        children: [],
      } as any,
    ])

    const wrapper = mount(App)
    emitMenuEvent('menu:open-workspace')
    await flushPromises()

    await wrapper.get('[data-test="folder-projects"]').trigger('contextmenu', {
      clientX: 28,
      clientY: 64,
    })
    await wrapper.get('[data-test="context-rename"]').trigger('click')
    await flushPromises()

    expect(RenamePath).toHaveBeenCalledWith('projects', 'archive')
    expect(ListWorkspace).toHaveBeenCalled()
    expect(wrapper.text()).toContain('archive')
  })

  test('deletes a tree file from the context menu and closes its open tab', async () => {
    vi.mocked(SelectWorkspace).mockResolvedValue({
      rootPath: 'D:/notes',
      name: 'notes',
      tree: [
        {
          name: 'intro.md',
          path: 'intro.md',
          type: 'file',
        } as any,
      ],
    } as any)
    vi.mocked(ReadMarkdown).mockResolvedValue({
      path: 'intro.md',
      name: 'intro.md',
      content: '# Intro',
    })
    vi.mocked(DeletePath).mockResolvedValue(undefined)
    vi.mocked(ListWorkspace).mockResolvedValue([])

    const wrapper = mount(App)
    emitMenuEvent('menu:open-workspace')
    await flushPromises()
    await wrapper.get('[data-test="file-intro.md"]').trigger('click')
    await flushPromises()

    await wrapper.get('[data-test="file-intro.md"]').trigger('contextmenu', {
      clientX: 28,
      clientY: 64,
    })
    await wrapper.get('[data-test="context-delete"]').trigger('click')
    await flushPromises()

    expect(ElMessageBox.confirm).toHaveBeenCalledWith(
      '删除「intro.md」？此操作无法撤销。',
      '删除项目',
      expect.objectContaining({
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
      }),
    )
    expect(DeletePath).toHaveBeenCalledWith('intro.md')
    expect(ListWorkspace).toHaveBeenCalled()
    expect(wrapper.find('[data-test="tab-intro.md"]').exists()).toBe(false)
    expect(window.localStorage.getItem('donote.openDocuments')).toBeNull()
  })

  test('does not create a note when the Element Plus prompt is cancelled or empty', async () => {
    elementPlusMocks.prompt.mockRejectedValueOnce(new Error('cancelled'))
    vi.mocked(SelectWorkspace).mockResolvedValue({
      rootPath: 'D:/notes',
      name: 'notes',
      tree: [],
    } as any)

    const wrapper = mount(App)
    emitMenuEvent('menu:open-workspace')
    await flushPromises()

    emitMenuEvent('menu:create-note')
    await flushPromises()

    expect(CreateMarkdown).not.toHaveBeenCalled()

    elementPlusMocks.prompt.mockResolvedValueOnce({ value: '' })
    emitMenuEvent('menu:create-note')
    await flushPromises()

    expect(CreateMarkdown).not.toHaveBeenCalled()
  })

  test('does not create a note when the Element Plus prompt is whitespace only', async () => {
    elementPlusMocks.prompt.mockResolvedValueOnce({ value: '   ' })
    vi.mocked(SelectWorkspace).mockResolvedValue({
      rootPath: 'D:/notes',
      name: 'notes',
      tree: [],
    } as any)

    const wrapper = mount(App)
    emitMenuEvent('menu:open-workspace')
    await flushPromises()

    emitMenuEvent('menu:create-note')
    await flushPromises()

    expect(CreateMarkdown).not.toHaveBeenCalled()
  })

  test('stores API errors and shows Element Plus error feedback', async () => {
    vi.mocked(SelectWorkspace).mockResolvedValue({
      rootPath: 'D:/notes',
      name: 'notes',
      tree: [
        {
          name: 'intro.md',
          path: 'intro.md',
          type: 'file',
        } as any,
      ],
    } as any)
    vi.mocked(ReadMarkdown).mockRejectedValue(new Error('无法读取笔记'))

    const wrapper = mount(App)
    emitMenuEvent('menu:open-workspace')
    await flushPromises()

    await wrapper.get('[data-test="file-intro.md"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('无法读取笔记')
    expect(ElMessage.error).toHaveBeenCalledWith('无法读取笔记')
  })

  test('prompts the user to configure attachment directories before pasted files are saved', async () => {
    vi.mocked(SelectWorkspace).mockResolvedValue({
      rootPath: 'D:/notes',
      name: 'notes',
      tree: [
        {
          name: 'intro.md',
          path: 'intro.md',
          type: 'file',
        } as any,
      ],
    } as any)
    vi.mocked(ReadMarkdown).mockResolvedValue({
      path: 'intro.md',
      name: 'intro.md',
      content: '# Intro',
    })

    const wrapper = mount(App)
    emitMenuEvent('menu:open-workspace')
    await flushPromises()
    await wrapper.get('[data-test="file-intro.md"]').trigger('click')
    await flushPromises()

    dispatchPasteFiles(wrapper.get('.mock-editor').element, [
      new File(['image'], 'photo.png', { type: 'image/png' }),
    ])
    await flushPromises()

    expect(ElMessageBox.confirm).toHaveBeenCalledWith(
      '粘贴图片或文件前，请先在设置中配置图片存储目录。',
      '未配置附件目录',
      expect.objectContaining({
        confirmButtonText: '去设置',
        cancelButtonText: '取消',
        type: 'warning',
      }),
    )
    expect(SaveAttachment).not.toHaveBeenCalled()
    expect(wrapper.find('[data-test="attachment-image-dir"]').exists()).toBe(true)
  })

  test('saves pasted images and files to configured directories and inserts markdown links', async () => {
    window.localStorage.setItem(
      'donote.attachmentDirectories',
      '{"images":"assets/images","files":"assets/files"}',
    )
    vi.mocked(SelectWorkspace).mockResolvedValue({
      rootPath: 'D:/notes',
      name: 'notes',
      tree: [
        {
          name: 'intro.md',
          path: 'intro.md',
          type: 'file',
        } as any,
      ],
    } as any)
    vi.mocked(ReadMarkdown).mockResolvedValue({
      path: 'intro.md',
      name: 'intro.md',
      content: '# Intro',
    })
    vi.mocked(SaveAttachment).mockImplementation(async (directory, name) => ({
      name,
      path: `${directory}/${name}`,
    }) as any)
    vi.mocked(ListWorkspace).mockResolvedValue([
      {
        name: 'intro.md',
        path: 'intro.md',
        type: 'file',
      } as any,
    ])

    const wrapper = mount(App)
    emitMenuEvent('menu:open-workspace')
    await flushPromises()
    await wrapper.get('[data-test="file-intro.md"]').trigger('click')
    await flushPromises()

    dispatchPasteFiles(wrapper.get('.mock-editor').element, [
      new File(['image'], 'photo.png', { type: 'image/png' }),
      new File(['document'], 'spec.pdf', { type: 'application/pdf' }),
      new File([], 'empty.txt', { type: 'text/plain' }),
    ])
    await flushPromises()
    await new Promise((resolve) => window.setTimeout(resolve, 0))
    await flushPromises()

    await waitForAssertion(() => expect(SaveAttachment).toHaveBeenCalledTimes(3))
    expect(SaveAttachment).toHaveBeenCalledWith(
      'assets/images',
      'photo.png',
      'image/png',
      expect.any(String),
    )
    expect(SaveAttachment).toHaveBeenCalledWith(
      'assets/files',
      'spec.pdf',
      'application/pdf',
      expect.any(String),
    )
    expect(SaveAttachment).toHaveBeenCalledWith(
      'assets/files',
      'empty.txt',
      'text/plain',
      expect.any(String),
    )
    expect((wrapper.get('.mock-editor').element as HTMLTextAreaElement).value).toBe(
      '# Intro\n\n![photo.png](assets/images/photo.png)\n[spec.pdf](assets/files/spec.pdf)\n[empty.txt](assets/files/empty.txt)',
    )
    expect(ListWorkspace).toHaveBeenCalled()
  })

  test('passes workspace image resolver to the editor', async () => {
    vi.mocked(SelectWorkspace).mockResolvedValue({
      rootPath: 'D:/notes',
      name: 'notes',
      tree: [
        {
          name: 'intro.md',
          path: 'intro.md',
          type: 'file',
        } as any,
      ],
    } as any)
    vi.mocked(ReadMarkdown).mockResolvedValue({
      path: 'intro.md',
      name: 'intro.md',
      content: '![photo](assets/images/photo.png)',
    })
    vi.mocked(ResolveImageSource).mockResolvedValue('data:image/png;base64,aW1hZ2U=')

    const wrapper = mount(App)
    emitMenuEvent('menu:open-workspace')
    await flushPromises()
    await wrapper.get('[data-test="file-intro.md"]').trigger('click')
    await flushPromises()

    const editor = wrapper.getComponent({ name: 'MilkdownEditor' })
    const resolver = editor.props('resolveImageSource') as (
      source: string,
      activePath: string,
    ) => Promise<string>

    await expect(resolver('assets/images/photo.png', 'intro.md')).resolves.toBe(
      'data:image/png;base64,aW1hZ2U=',
    )
    expect(ResolveImageSource).toHaveBeenCalledWith('intro.md', 'assets/images/photo.png')
  })

  test('applies settings immediately from the settings dialog', async () => {
    const wrapper = mount(App)

    const initialStyle = wrapper.get('[data-test="workspace-layout"]').attributes('style')
    expect(initialStyle).toContain('--sidebar-width: 286px')
    expect(initialStyle).toContain('--sidebar-font-size: 13px')
    expect(initialStyle).toContain('--tabs-font-size: 13px')
    expect(initialStyle).toContain('--editor-font-size: 17px')
    expect(initialStyle).toContain('--outline-font-size: 13px')
    expect(initialStyle).toContain('--editor-content-width: 900px')

    await wrapper.get('[data-test="utility-settings"]').trigger('click')

    expect(wrapper.find('[data-test="settings-page"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="search-input"]').exists()).toBe(false)
    expect(wrapper.find('.utility-drawer [data-test="search-input"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="settings-save"]').exists()).toBe(false)
    expect(wrapper.find('.settings-actions').exists()).toBe(false)
    expect(wrapper.text()).toContain('布局字体大小')
    await wrapper.get('[data-test="font-size-sidebar"] input').setValue(10)
    await wrapper.get('[data-test="font-size-tabs"] input').setValue(10)
    await wrapper.get('[data-test="font-size-editor"] input').setValue(10)
    await wrapper.get('[data-test="font-size-outline"] input').setValue(10)
    await wrapper.get('[data-test="editor-width"] input').setValue(1100)
    await wrapper.get('[data-test="attachment-image-dir"]').setValue('assets/images')
    await wrapper.get('[data-test="attachment-file-dir"]').setValue('assets/files')

    const layoutStyle = wrapper.get('[data-test="workspace-layout"]').attributes('style')
    expect(layoutStyle).toContain('--sidebar-font-size: 10px')
    expect(layoutStyle).toContain('--tabs-font-size: 10px')
    expect(layoutStyle).toContain('--editor-font-size: 10px')
    expect(layoutStyle).toContain('--outline-font-size: 10px')
    expect(layoutStyle).toContain('--editor-content-width: 1100px')
    expect(window.localStorage.getItem('donote.layoutFontSizes')).toBe(
      '{"sidebar":10,"tabs":10,"editor":10,"outline":10}',
    )
    expect(window.localStorage.getItem('donote.editorWidth')).toBe('1100')
    expect(window.localStorage.getItem('donote.attachmentDirectories')).toBe(
      '{"images":"assets/images","files":"assets/files"}',
    )
    expect(wrapper.find('[data-test="font-size-sidebar"]').exists()).toBe(true)
  })

  test('shows and switches the current workspace from settings', async () => {
    window.localStorage.setItem('donote.lastWorkspaceRoot', 'D:/notes')
    vi.mocked(OpenWorkspace).mockResolvedValue({
      rootPath: 'D:/notes',
      name: 'notes',
      tree: [],
    } as any)
    vi.mocked(SelectWorkspace).mockResolvedValueOnce({
      rootPath: 'E:/writing',
      name: 'writing',
      tree: [
        {
          name: 'draft.md',
          path: 'draft.md',
          type: 'file',
        } as any,
      ],
    } as any)

    const wrapper = mount(App)
    await flushPromises()
    await wrapper.get('[data-test="utility-settings"]').trigger('click')
    await flushPromises()

    expect(
      (wrapper.get('[data-test="settings-workspace-root"]').element as HTMLInputElement).value,
    ).toBe('D:/notes')

    await wrapper.get('[data-test="select-workspace-root"]').trigger('click')
    await flushPromises()

    expect(SelectWorkspace).toHaveBeenCalledTimes(1)
    expect(
      (wrapper.get('[data-test="settings-workspace-root"]').element as HTMLInputElement).value,
    ).toBe('E:/writing')
    expect(wrapper.text()).toContain('writing')
    expect(wrapper.text()).toContain('draft.md')
    expect(window.localStorage.getItem('donote.lastWorkspaceRoot')).toBe('E:/writing')
  })

  test('fills the workspace path from settings when no workspace is open', async () => {
    vi.mocked(SelectWorkspace)
      .mockResolvedValueOnce({
        rootPath: '',
        name: '',
        tree: [],
      } as any)
      .mockResolvedValueOnce({
        rootPath: 'E:/writing',
        name: 'writing',
        tree: [],
      } as any)

    const wrapper = mount(App)
    await flushPromises()
    await wrapper.get('[data-test="utility-settings"]').trigger('click')
    await flushPromises()

    expect(
      (wrapper.get('[data-test="settings-workspace-root"]').element as HTMLInputElement).value,
    ).toBe('')

    await wrapper.get('[data-test="select-workspace-root"]').trigger('click')
    await flushPromises()

    expect(
      (wrapper.get('[data-test="settings-workspace-root"]').element as HTMLInputElement).value,
    ).toBe('E:/writing')
    expect(wrapper.text()).toContain('writing')
  })

  test('confirms before switching workspace from settings when documents are dirty', async () => {
    window.localStorage.setItem('donote.lastWorkspaceRoot', 'D:/notes')
    vi.mocked(OpenWorkspace).mockResolvedValue({
      rootPath: 'D:/notes',
      name: 'notes',
      tree: [
        {
          name: 'intro.md',
          path: 'intro.md',
          type: 'file',
        } as any,
      ],
    } as any)
    vi.mocked(ReadMarkdown).mockResolvedValue({
      path: 'intro.md',
      name: 'intro.md',
      content: '# Intro',
    })
    vi.mocked(SelectWorkspace).mockResolvedValueOnce({
      rootPath: 'E:/writing',
      name: 'writing',
      tree: [],
    } as any)

    const wrapper = mount(App)
    await flushPromises()
    await wrapper.get('[data-test="file-intro.md"]').trigger('click')
    await flushPromises()
    await wrapper.get('.mock-editor').setValue('# Draft')
    await flushPromises()
    await wrapper.get('[data-test="utility-settings"]').trigger('click')
    await flushPromises()

    elementPlusMocks.confirm.mockRejectedValueOnce(new Error('cancelled'))
    await wrapper.get('[data-test="select-workspace-root"]').trigger('click')
    await flushPromises()

    expect(ElMessageBox.confirm).toHaveBeenCalledWith(
      '当前工作区有未保存更改，切换后将丢失。',
      '切换工作目录',
      expect.objectContaining({
        confirmButtonText: '切换',
        cancelButtonText: '取消',
        type: 'warning',
      }),
    )
    expect(SelectWorkspace).not.toHaveBeenCalled()
    expect((wrapper.get('.mock-editor').element as HTMLTextAreaElement).value).toBe('# Draft')

    elementPlusMocks.confirm.mockResolvedValueOnce('confirm')
    await wrapper.get('[data-test="select-workspace-root"]').trigger('click')
    await flushPromises()

    expect(SelectWorkspace).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('writing')
    expect(window.localStorage.getItem('donote.lastWorkspaceRoot')).toBe('E:/writing')
  })

  test('selects attachment directories through the native directory dialog', async () => {
    vi.mocked(SelectWorkspace).mockResolvedValue({
      rootPath: 'D:/notes',
      name: 'notes',
      tree: [],
    } as any)
    vi.mocked(SelectAttachmentDirectory)
      .mockResolvedValueOnce('assets/images')
      .mockResolvedValueOnce('assets/files')

    const wrapper = mount(App)
    emitMenuEvent('menu:open-workspace')
    await flushPromises()

    await wrapper.get('[data-test="utility-settings"]').trigger('click')
    await flushPromises()

    await wrapper.get('[data-test="select-attachment-image-dir"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-test="select-attachment-file-dir"]').trigger('click')
    await flushPromises()

    expect(SelectAttachmentDirectory).toHaveBeenNthCalledWith(1, 'images')
    expect(SelectAttachmentDirectory).toHaveBeenNthCalledWith(2, 'files')
    expect((wrapper.get('[data-test="attachment-image-dir"]').element as HTMLInputElement).value).toBe(
      'assets/images',
    )
    expect((wrapper.get('[data-test="attachment-file-dir"]').element as HTMLInputElement).value).toBe(
      'assets/files',
    )

    expect(window.localStorage.getItem('donote.attachmentDirectories')).toBe(
      '{"images":"assets/images","files":"assets/files"}',
    )
  })

  test('resizes the sidebar by dragging the divider and stores the width', async () => {
    const wrapper = mount(App)
    const layout = wrapper.get('[data-test="workspace-layout"]')
    const resizer = wrapper.get('[data-test="sidebar-resizer"]')

    expect(layout.attributes('style')).toContain('--sidebar-width: 286px')

    dispatchPointerEvent(resizer.element, 'pointerdown', { clientX: 286, button: 0 })
    dispatchPointerEvent(window, 'pointermove', { clientX: 356 })
    await wrapper.vm.$nextTick()

    expect(layout.attributes('style')).toContain('--sidebar-width: 356px')
    expect(window.localStorage.getItem('donote.sidebarWidth')).toBeNull()

    dispatchPointerEvent(window, 'pointerup', { clientX: 356 })
    await wrapper.vm.$nextTick()

    expect(window.localStorage.getItem('donote.sidebarWidth')).toBe('356')
  })

  test('uses the saved sidebar width on startup', () => {
    window.localStorage.setItem('donote.sidebarWidth', '372')

    const wrapper = mount(App)

    expect(wrapper.get('[data-test="workspace-layout"]').attributes('style')).toContain(
      '--sidebar-width: 372px',
    )
  })

  test('focuses the editor search bar from Ctrl+F', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const wrapper = mount(App, { attachTo: host })

    expect(wrapper.find('[data-test="search-input"]').exists()).toBe(false)

    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'f',
        ctrlKey: true,
        bubbles: true,
      }),
    )
    await flushPromises()

    const searchInput = wrapper.get('[data-test="search-input"]')
    expect(searchInput.element).toBe(document.activeElement)

    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
      }),
    )
    await flushPromises()

    expect(wrapper.find('[data-test="search-input"]').exists()).toBe(false)
    wrapper.unmount()
    host.remove()
  })

  test('searches the active document from the editor search bar', async () => {
    vi.mocked(SelectWorkspace).mockResolvedValue({
      rootPath: 'D:/notes',
      name: 'notes',
      tree: [
        {
          name: 'intro.md',
          path: 'intro.md',
          type: 'file',
        } as any,
      ],
    } as any)
    vi.mocked(ReadMarkdown).mockResolvedValue({
      path: 'intro.md',
      name: 'intro.md',
      content: '# Intro\n\nIntro body\n\n## Intro again',
    })

    const wrapper = mount(App)
    emitMenuEvent('menu:open-workspace')
    await flushPromises()
    await wrapper.get('[data-test="file-intro.md"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="search-input"]').exists()).toBe(false)
    await wrapper.get('[data-test="utility-search"]').trigger('click')
    await flushPromises()

    await wrapper.get('[data-test="search-input"]').setValue('Intro')
    await flushPromises()

    expect(wrapper.text()).toContain('1/3')
    expect(wrapper.getComponent({ name: 'MilkdownEditor' }).props('searchQuery')).toBe('Intro')
    expect(wrapper.getComponent({ name: 'MilkdownEditor' }).props('activeSearchIndex')).toBe(0)

    await wrapper.get('[data-test="search-next"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('2/3')
    expect(wrapper.getComponent({ name: 'MilkdownEditor' }).props('activeSearchIndex')).toBe(1)

    await wrapper.get('[data-test="search-previous"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('1/3')

    await wrapper.get('[data-test="search-close"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="search-input"]').exists()).toBe(false)
    expect(wrapper.getComponent({ name: 'MilkdownEditor' }).props('searchQuery')).toBe('')
    expect(wrapper.getComponent({ name: 'MilkdownEditor' }).props('activeSearchIndex')).toBe(-1)

    await wrapper.get('[data-test="utility-search"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="search-input"]').exists()).toBe(true)
    expect(wrapper.getComponent({ name: 'MilkdownEditor' }).props('searchQuery')).toBe('')

    await wrapper.get('[data-test="search-input"]').setValue('Intro')
    await flushPromises()
    await wrapper.get('[data-test="utility-search"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="search-input"]').exists()).toBe(false)
    expect(wrapper.getComponent({ name: 'MilkdownEditor' }).props('searchQuery')).toBe('')
  })
})
