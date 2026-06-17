import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, onMounted } from 'vue'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import App from './App.vue'
import {
  CreateMarkdown,
  ListWorkspace,
  OpenWorkspace,
  ReadMarkdown,
  SaveMarkdown,
  SelectWorkspace,
} from '../wailsjs/go/main/App'

let emitInitialMarkdown: ((value: string) => string) | null = null

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

describe('App shell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    emitInitialMarkdown = null
    window.localStorage.clear()
  })

  test('starts with a Chinese empty workspace state', () => {
    const wrapper = mount(App)

    expect(wrapper.text()).toContain('Donote')
    expect(wrapper.text()).toContain('打开文件夹')
    expect(wrapper.text()).toContain('选择一个笔记文件夹开始写作')
  })

  test('renders modern grouped controls for the app chrome', () => {
    const wrapper = mount(App)

    expect(wrapper.get('[data-test="topbar"]').classes()).toContain('app-chrome')
    expect(wrapper.get('[data-test="format-toolbar"]').classes()).toContain('control-cluster')
    expect(wrapper.get('[data-test="window-actions"]').classes()).toContain('control-cluster')
    expect(wrapper.find('[data-test="brand-mark"]').exists()).toBe(true)
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
    await wrapper.get('[data-test="open-workspace"]').trigger('click')
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
    await wrapper.get('[data-test="open-workspace"]').trigger('click')
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
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
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
    await wrapper.get('[data-test="open-workspace"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-test="file-intro.md"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-test="file-next.md"]').trigger('click')
    await flushPromises()

    await wrapper.get('[data-test="tab-close-next.md"]').trigger('click')
    await flushPromises()

    expect(confirm).not.toHaveBeenCalled()
    expect(wrapper.find('[data-test="tab-next.md"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="tab-intro.md"]').exists()).toBe(true)
    expect((wrapper.get('.mock-editor').element as HTMLTextAreaElement).value).toBe('# Intro')
  })

  test('closes a freshly opened tab without prompting after editor newline normalization', async () => {
    emitInitialMarkdown = (value) => `${value}\n`
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
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
    await wrapper.get('[data-test="open-workspace"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-test="file-intro.md"]').trigger('click')
    await flushPromises()
    await new Promise((resolve) => window.setTimeout(resolve, 0))
    await flushPromises()

    await wrapper.get('[data-test="tab-close-intro.md"]').trigger('click')
    await flushPromises()

    expect(confirm).not.toHaveBeenCalled()
    expect(wrapper.find('[data-test="tab-intro.md"]').exists()).toBe(false)
  })

  test('confirms before closing a dirty tab', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
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
    await wrapper.get('[data-test="open-workspace"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-test="file-intro.md"]').trigger('click')
    await flushPromises()
    await wrapper.get('.mock-editor').setValue('# Draft')
    await flushPromises()
    await wrapper.get('[data-test="file-next.md"]').trigger('click')
    await flushPromises()

    await wrapper.get('[data-test="tab-close-intro.md"]').trigger('click')
    await flushPromises()

    expect(confirm).toHaveBeenCalledWith('「intro.md」有未保存更改，关闭后将丢失。确认关闭？')
    expect(wrapper.find('[data-test="tab-intro.md"]').exists()).toBe(true)

    confirm.mockReturnValue(true)
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
    await wrapper.get('[data-test="open-workspace"]').trigger('click')
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
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
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
    await wrapper.get('[data-test="open-workspace"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-test="file-intro.md"]').trigger('click')
    await flushPromises()

    await wrapper.get('.mock-editor').setValue('# Unsaved')
    await flushPromises()
    await wrapper.get('[data-test="file-next.md"]').trigger('click')
    await flushPromises()

    expect(confirm).not.toHaveBeenCalled()
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
              name: 'plan.md',
              path: 'projects/plan.md',
              type: 'file',
            },
          ],
        } as any,
      ],
    } as any)

    const wrapper = mount(App)
    await wrapper.get('[data-test="open-workspace"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="file-projects/plan.md"]').exists()).toBe(true)

    await wrapper.get('[data-test="folder-projects"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-test="file-projects/plan.md"]').isVisible()).toBe(false)
    expect(window.localStorage.getItem('donote.treeExpansion')).toBe(
      '{"D:/notes":["projects"]}',
    )

    wrapper.unmount()
    const reopened = mount(App)
    await reopened.get('[data-test="open-workspace"]').trigger('click')
    await flushPromises()

    expect(reopened.find('[data-test="file-projects/plan.md"]').exists()).toBe(false)

    await reopened.get('[data-test="folder-projects"]').trigger('click')
    await flushPromises()

    expect(reopened.find('[data-test="file-projects/plan.md"]').exists()).toBe(true)
    expect(window.localStorage.getItem('donote.treeExpansion')).toBe('{"D:/notes":[]}')
  })

  test('creates a note in the current workspace without reopening the folder picker', async () => {
    vi.spyOn(window, 'prompt').mockReturnValue('new.md')
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
    await wrapper.get('[data-test="open-workspace"]').trigger('click')
    await flushPromises()
    vi.mocked(SelectWorkspace).mockClear()

    await wrapper.get('[data-test="new-note"]').trigger('click')
    await flushPromises()

    expect(CreateMarkdown).toHaveBeenCalledWith('', 'new.md')
    expect(ListWorkspace).toHaveBeenCalled()
    expect(SelectWorkspace).not.toHaveBeenCalled()
    expect(ReadMarkdown).toHaveBeenCalledWith('new.md')
  })

  test('applies layout font sizes only after saving the settings dialog', async () => {
    const wrapper = mount(App)

    const initialStyle = wrapper.get('[data-test="workspace-layout"]').attributes('style')
    expect(initialStyle).toContain('--sidebar-font-size: 13px')
    expect(initialStyle).toContain('--editor-font-size: 17px')
    expect(initialStyle).toContain('--outline-font-size: 13px')

    await wrapper.get('[data-test="settings-toggle"]').trigger('click')

    expect(wrapper.find('.floating-search').exists()).toBe(false)
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

    expect(wrapper.find('.floating-search').exists()).toBe(false)
    wrapper.get('[data-test="search-input"]')
  })
})
