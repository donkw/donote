export type LayoutFontSizeArea = 'sidebar' | 'editor' | 'outline'

export interface LayoutFontSizes {
  sidebar: number
  editor: number
  outline: number
}

export const layoutFontSizeStorageKey = 'donote.layoutFontSizes'

export const defaultLayoutFontSizes: LayoutFontSizes = {
  sidebar: 13,
  editor: 17,
  outline: 13,
}

export const layoutFontSizeControls: Array<{
  key: LayoutFontSizeArea
  label: string
  min: number
  max: number
}> = [
  { key: 'sidebar', label: '左侧目录栏', min: 12, max: 18 },
  { key: 'editor', label: '中间编辑区', min: 14, max: 22 },
  { key: 'outline', label: '右侧大纲栏', min: 12, max: 18 },
]

const limits: Record<LayoutFontSizeArea, { min: number; max: number }> = {
  sidebar: { min: 12, max: 18 },
  editor: { min: 14, max: 22 },
  outline: { min: 12, max: 18 },
}

export function getInitialLayoutFontSizes(
  storage: Storage | undefined = window.localStorage,
): LayoutFontSizes {
  const stored = storage?.getItem(layoutFontSizeStorageKey)
  if (!stored) {
    return { ...defaultLayoutFontSizes }
  }

  try {
    return normalizeLayoutFontSizes(JSON.parse(stored))
  } catch {
    return { ...defaultLayoutFontSizes }
  }
}

export function saveLayoutFontSizes(
  value: unknown,
  storage: Storage | undefined = window.localStorage,
): LayoutFontSizes {
  const normalized = normalizeLayoutFontSizes(value)
  storage?.setItem(layoutFontSizeStorageKey, JSON.stringify(normalized))
  return normalized
}

export function normalizeLayoutFontSizes(value: unknown): LayoutFontSizes {
  if (!isRecord(value)) {
    return { ...defaultLayoutFontSizes }
  }

  const next = {} as LayoutFontSizes
  for (const control of layoutFontSizeControls) {
    const raw = value[control.key]
    if (typeof raw !== 'number' || !Number.isFinite(raw)) {
      return { ...defaultLayoutFontSizes }
    }

    next[control.key] = clamp(Math.round(raw), limits[control.key].min, limits[control.key].max)
  }
  return next
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
