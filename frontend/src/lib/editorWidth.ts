export const editorWidthStorageKey = 'donote.editorWidth'

export const defaultEditorWidth = 900

export const editorWidthControl = {
  label: '编辑器宽度',
  min: 720,
  max: 1280,
  step: 20,
}

export function getInitialEditorWidth(storage: Storage | undefined = window.localStorage): number {
  const stored = storage?.getItem(editorWidthStorageKey)
  if (!stored) {
    return defaultEditorWidth
  }

  return normalizeEditorWidth(Number(stored))
}

export function saveEditorWidth(
  value: unknown,
  storage: Storage | undefined = window.localStorage,
): number {
  const normalized = normalizeEditorWidth(value)
  storage?.setItem(editorWidthStorageKey, String(normalized))
  return normalized
}

export function normalizeEditorWidth(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return defaultEditorWidth
  }

  return clamp(Math.round(value), editorWidthControl.min, editorWidthControl.max)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
