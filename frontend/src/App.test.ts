import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, onMounted } from 'vue'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { ElMessage, ElMessageBox } from 'element-plus'
import App from './App.vue'
import EditorSurface from './components/EditorSurface.vue'
import WorkspaceSidebar from './components/WorkspaceSidebar.vue'
import {
  CreateMarkdown,
  DeletePath,
  ListWorkspace,
  OpenWorkspace,
  ReadMarkdown,
  RenamePath,
  SaveMarkdown,
  SelectWorkspace,
} from '../wailsjs/go/main/App'

let emitInitialMarkdown: ((value: string) => string) | null = null
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
  RenamePath: vi.fn(),
  DeletePath: vi.fn(),
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
    },
    emits: ['update:modelValue'],
    setup(props, { emit }) {
      onMounted(() => {
        if (emitInitialMarkdown) {
          window.setTimeout(() => {
            if (emitInitialMarkdown) {
              emit('update:modelValue', emitInitialMarkdown(props.modelValue as string))
            }
          }, 0)
        }
      })
    },
    template:
      '<textarea class="mock-editor" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  }),
}))

function emitMenuEvent(eventName: 'menu:open-workspace' | 'menu:create-note') {
  const handler = runtimeMocks.events.get(eventName)
  expect(handler).toBeDefined()
  handler?.()
}

describe('App shell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    emitInitialMarkdown = null
    runtimeMocks.events.clear()
    window.localStorage.clear()
    elementPlusMocks.confirm.mockResolvedValue('confirm')
    elementPlusMocks.prompt.mockResolvedValue({ value: '未命名.md' })
  })

  test('starts with a Chinese empty workspace state', () => {
    const wrapper = mount(App)

    expect(wrapper.text()).toContain('Donote')
    expect(wrapper.text()).toContain('选择一个笔记文件夹开始写作')
  })

  test('renders modern Element Plus app chrome', () => {
    const wrapper = mount(App)

    expect(wrapper.get('[data-test="topbar"]').classes()).toContain('app-header')
    expect(wrapper.find('[data-test="format-toolbar"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="brand-mark"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="utility-outline"]').exists()).toBe(true)
  })

  test('registers native menu actions and cleans them up on unmount', () => {
    const wrapper = mount(App)

    expect(runtimeMocks.EventsOn).toHaveBeenCalledWith(
      'menu:open-workspace',
      expect.any(Function),
    )
    expect(runtimeMocks.EventsOn).toHaveBeenCalledWith('menu:create-note', expect.any(Function))
    expect(runtimeMocks.events.has('menu:open-workspace')).toBe(true)
    expect(runtimeMocks.events.has('menu:create-note')).toBe(true)

    wrapper.unmount()

    expect(runtimeMocks.events.has('menu:open-workspace')).toBe(false)
    expect(runtimeMocks.events.has('menu:create-note')).toBe(false)
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
    expect(wrapper.text()).toContain('notes')
    expect(wrapper.text()).toContain('intro.md')
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
    expect(wrapper.text()).toContain('有未保存更改')
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

    expect(wrapper.text()).toContain('有未保存更改')
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
    expect(wrapper.text()).toContain('已保存')
    vi.useRealTimers()
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

    expect(wrapper.find('[data-test="file-projects/archive/plan.md"]').exists()).toBe(true)
    expect(wrapper.getComponent(WorkspaceSidebar).props('expandedFolderPaths')).toEqual([
      'projects',
      'projects/archive',
    ])

    await wrapper.get('[data-test="folder-projects"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-test="file-projects/archive/plan.md"]').isVisible()).toBe(false)
    expect(wrapper.getComponent(WorkspaceSidebar).props('expandedFolderPaths')).toEqual([])
    expect(window.localStorage.getItem('donote.treeExpansion')).toBe(
      '{"D:/notes":["projects"]}',
    )

    wrapper.unmount()
    const reopened = mount(App)
    emitMenuEvent('menu:open-workspace')
    await flushPromises()

    expect(reopened.find('[data-test="file-projects/archive/plan.md"]').exists()).toBe(false)
    expect(reopened.getComponent(WorkspaceSidebar).props('expandedFolderPaths')).toEqual([])

    await reopened.get('[data-test="folder-projects"]').trigger('click')
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

  test('renames the active document from an Element Plus prompt', async () => {
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

    wrapper.getComponent(EditorSurface).vm.$emit('rename')
    await flushPromises()

    expect(ElMessageBox.prompt).toHaveBeenCalledWith(
      '请输入新的笔记名称',
      '重命名笔记',
      expect.objectContaining({
        inputValue: 'intro.md',
        confirmButtonText: '重命名',
        cancelButtonText: '取消',
      }),
    )
    expect(RenamePath).toHaveBeenCalledWith('intro.md', 'renamed.md')
    expect(ListWorkspace).toHaveBeenCalled()
    expect(wrapper.find('[data-test="tab-renamed.md"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('renamed.md')
  })

  test('does not rename the active document when the Element Plus prompt is whitespace only', async () => {
    elementPlusMocks.prompt.mockResolvedValueOnce({ value: '   ' })
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

    wrapper.getComponent(EditorSurface).vm.$emit('rename')
    await flushPromises()

    expect(RenamePath).not.toHaveBeenCalled()
  })

  test('uses Element Plus confirmation before deleting the active document', async () => {
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
    await wrapper.get('[data-test="file-next.md"]').trigger('click')
    await flushPromises()

    wrapper.getComponent(EditorSurface).vm.$emit('delete')
    await flushPromises()

    expect(ElMessageBox.confirm).toHaveBeenCalledWith(
      '删除「next.md」？此操作无法撤销。',
      '删除笔记',
      expect.objectContaining({
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      }),
    )
    expect(DeletePath).not.toHaveBeenCalled()
    expect(wrapper.find('[data-test="tab-next.md"]').exists()).toBe(true)

    elementPlusMocks.confirm.mockResolvedValueOnce('confirm')
    wrapper.getComponent(EditorSurface).vm.$emit('delete')
    await flushPromises()

    expect(DeletePath).toHaveBeenCalledWith('next.md')
    expect(ListWorkspace).toHaveBeenCalled()
    expect(wrapper.find('[data-test="tab-next.md"]').exists()).toBe(false)
    expect((wrapper.get('.mock-editor').element as HTMLTextAreaElement).value).toBe('# Intro')
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

  test('applies layout font sizes only after saving the settings dialog', async () => {
    const wrapper = mount(App)

    const initialStyle = wrapper.get('[data-test="workspace-layout"]').attributes('style')
    expect(initialStyle).toContain('--sidebar-font-size: 13px')
    expect(initialStyle).toContain('--editor-font-size: 17px')
    expect(initialStyle).toContain('--outline-font-size: 13px')

    await wrapper.get('[data-test="utility-settings"]').trigger('click')

    expect(wrapper.find('[data-test="settings-page"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="search-input"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('布局字体大小')
    await wrapper.get('[data-test="font-size-sidebar"] input').setValue(12)
    await wrapper.get('[data-test="font-size-editor"] input').setValue(19)
    await wrapper.get('[data-test="font-size-outline"] input').setValue(14)

    const stagedStyle = wrapper.get('[data-test="workspace-layout"]').attributes('style')
    expect(stagedStyle).toContain('--sidebar-font-size: 13px')
    expect(stagedStyle).toContain('--editor-font-size: 17px')
    expect(stagedStyle).toContain('--outline-font-size: 13px')
    expect(window.localStorage.getItem('donote.layoutFontSizes')).toBeNull()

    await wrapper.get('[data-test="settings-save"]').trigger('click')

    const layoutStyle = wrapper.get('[data-test="workspace-layout"]').attributes('style')
    expect(layoutStyle).toContain('--sidebar-font-size: 12px')
    expect(layoutStyle).toContain('--editor-font-size: 19px')
    expect(layoutStyle).toContain('--outline-font-size: 14px')
    expect(window.localStorage.getItem('donote.layoutFontSizes')).toBe(
      '{"sidebar":12,"editor":19,"outline":14}',
    )
    expect(wrapper.find('[data-test="font-size-sidebar"]').exists()).toBe(false)
  })

  test('opens search in the utility drawer from Ctrl+F', async () => {
    const wrapper = mount(App)

    expect(wrapper.find('[data-test="search-input"]').exists()).toBe(false)

    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'f',
        ctrlKey: true,
        bubbles: true,
      }),
    )
    await flushPromises()

    wrapper.get('[data-test="search-input"]')
  })

  test('searches the active document from the utility rail drawer', async () => {
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

    await wrapper.get('[data-test="utility-search"]').trigger('click')
    await flushPromises()

    await wrapper.get('[data-test="search-input"]').setValue('Intro')
    await flushPromises()

    expect(wrapper.text()).toContain('1/3')

    await wrapper.get('[data-test="search-next"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('2/3')

    await wrapper.get('[data-test="search-previous"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('1/3')
  })
})
