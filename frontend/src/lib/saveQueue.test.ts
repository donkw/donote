import { describe, expect, test, vi } from 'vitest'
import { createSaveQueue } from './saveQueue'

describe('createSaveQueue', () => {
  test('marks latest content dirty without saving automatically', async () => {
    vi.useFakeTimers()
    const save = vi.fn().mockResolvedValue(undefined)
    const queue = createSaveQueue(save)

    queue.schedule('note.md', '# First')
    queue.schedule('note.md', '# Latest')

    expect(queue.status.value).toBe('dirty')
    expect(queue.pending.value).toEqual({ path: 'note.md', content: '# Latest' })

    await vi.advanceTimersByTimeAsync(1_600)
    expect(save).not.toHaveBeenCalled()

    await queue.flush()
    expect(save).toHaveBeenCalledWith('note.md', '# Latest')
    expect(queue.status.value).toBe('saved')

    vi.useRealTimers()
  })

  test('flushes immediately and exposes save errors without dropping content', async () => {
    vi.useFakeTimers()
    const save = vi.fn().mockRejectedValue(new Error('disk full'))
    const queue = createSaveQueue(save)

    queue.schedule('note.md', '# Draft')
    await expect(queue.flush()).rejects.toThrow('disk full')

    expect(queue.status.value).toBe('error')
    expect(queue.error.value).toBe('disk full')
    expect(queue.pending.value?.content).toBe('# Draft')

    vi.useRealTimers()
  })
})
