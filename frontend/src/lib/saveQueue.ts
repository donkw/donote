import { ref, type Ref } from 'vue'

export type SaveStatus = 'saved' | 'dirty' | 'saving' | 'error'

export interface PendingSave {
  path: string
  content: string
}

export interface SaveQueue {
  status: Ref<SaveStatus>
  error: Ref<string>
  pending: Ref<PendingSave | null>
  schedule(path: string, content: string): void
  flush(): Promise<void>
  cancel(): void
}

export function createSaveQueue(
  save: (path: string, content: string) => Promise<unknown>,
): SaveQueue {
  const status = ref<SaveStatus>('saved')
  const error = ref('')
  const pending = ref<PendingSave | null>(null)

  async function persist(snapshot: PendingSave): Promise<void> {
    status.value = 'saving'
    error.value = ''
    try {
      await save(snapshot.path, snapshot.content)
      if (
        pending.value?.path === snapshot.path &&
        pending.value?.content === snapshot.content
      ) {
        pending.value = null
      }
      status.value = pending.value ? 'dirty' : 'saved'
    } catch (err) {
      pending.value = snapshot
      error.value = err instanceof Error ? err.message : String(err)
      status.value = 'error'
      throw err
    }
  }

  async function flush(): Promise<void> {
    if (!pending.value) {
      return
    }
    await persist({ ...pending.value })
  }

  function schedule(path: string, content: string): void {
    pending.value = { path, content }
    status.value = 'dirty'
    error.value = ''
  }

  function cancel(): void {
    pending.value = null
    error.value = ''
    status.value = 'saved'
  }

  return { status, error, pending, schedule, flush, cancel }
}
